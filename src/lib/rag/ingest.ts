import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import type { Document } from "@langchain/core/documents";
import { Document as LangChainDocument } from "@langchain/core/documents";
import readXlsxFile from "read-excel-file/browser";
import { prisma } from "@/lib/db";
import { bumpRetrievalCacheVersion } from "./cache";
import { deleteVectorChunksForFile, getVectorStore } from "./store";
import { sanitizeMetadata, sha256, splitDocumentsByTokens } from "./text";

const VECTOR_SYNC_TIMEOUT_MS = 120_000;

async function syncVectorChunks(chunks: ReturnType<typeof splitDocumentsByTokens>) {
  const syncPromise = (async () => {
    const vectorStore = await getVectorStore();
    const batchSize = 100;
    for (let i = 0; i < chunks.length; i += batchSize) {
      await vectorStore.addDocuments(chunks.slice(i, i + batchSize));
    }
  })();

  const timeoutPromise = new Promise<"timeout">((resolve) => {
    setTimeout(() => resolve("timeout"), VECTOR_SYNC_TIMEOUT_MS);
  });

  const result = await Promise.race([syncPromise.then(() => "synced" as const), timeoutPromise]);
  if (result === "timeout") {
    syncPromise.catch((error) => console.warn("Vector sync finished with an error after timeout:", error));
    console.warn(`Vector sync exceeded ${VECTOR_SYNC_TIMEOUT_MS}ms; continuing with Postgres-backed retrieval.`);
  }
}

function stringifySpreadsheetCell(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || "").trim();
}

async function loadSpreadsheetDocuments(fileBuffer: Buffer, fileName: string) {
  const arrayBuffer = new ArrayBuffer(fileBuffer.byteLength);
  new Uint8Array(arrayBuffer).set(fileBuffer);
  const workbook = await readXlsxFile(arrayBuffer);
  const documents: Array<Document<Record<string, unknown>>> = [];

  for (const worksheet of workbook) {
    const rows = worksheet.data.filter((row) => row.some((value) => value !== null && String(value).trim() !== ""));
    const [headerRow, ...dataRows] = rows;
    const headers = (headerRow || []).map((value, index) => {
      const label = stringifySpreadsheetCell(value);
      return label || `Column ${index + 1}`;
    });

    dataRows.forEach((row, rowIndex) => {
      const fields = row
        .map((value, columnIndex) => {
          const normalizedValue = stringifySpreadsheetCell(value);
          if (!normalizedValue) return null;
          return `${headers[columnIndex] || `Column ${columnIndex + 1}`}: ${normalizedValue}`;
        })
        .filter((field): field is string => Boolean(field));

      if (fields.length === 0) return;

      documents.push(new LangChainDocument({
        pageContent: fields.join(" "),
        metadata: {
          source_file: fileName,
          sheet_name: worksheet.sheet,
          row_number: rowIndex + 2,
        },
      }));
    });
  }

  return documents;
}

export async function loadSourceDocuments(fileBuffer: Buffer, fileName: string, fileType: string) {
  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: "application/pdf" });
    const loader = new PDFLoader(blob, { parsedItemSeparator: " " });
    return loader.load() as Promise<Array<Document<Record<string, unknown>>>>;
  }

  if (fileType === "text/csv" || fileName.endsWith(".csv")) {
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: "text/csv" });
    const loader = new CSVLoader(blob);
    return loader.load() as Promise<Array<Document<Record<string, unknown>>>>;
  }

  if (
    fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    || fileName.endsWith(".xlsx")
  ) {
    return await loadSpreadsheetDocuments(fileBuffer, fileName);
  }

  throw new Error("Unsupported file type");
}

export async function ingestDocument(fileBuffer: Buffer, fileName: string, fileType: string) {
  const documentHash = sha256(fileBuffer);
  const sourceDocs = await loadSourceDocuments(fileBuffer, fileName, fileType);
  const chunks = splitDocumentsByTokens(sourceDocs, {
    fileName,
    fileType,
    documentHash,
    version: 1,
  });

  if (chunks.length === 0) {
    throw new Error("No readable text was found in the uploaded document");
  }

  await deleteVectorChunksForFile(fileName);

  await prisma.$transaction([
    prisma.documentChunk.deleteMany({ where: { fileName } }),
    prisma.documentMetadata.deleteMany({ where: { fileName } }),
    prisma.documentMetadata.create({
      data: {
        fileName,
        type: fileType,
        chunks: chunks.length,
        documentHash,
        version: 1,
      },
    }),
    prisma.documentChunk.createMany({
      data: chunks.map((chunk) => ({
        fileName,
        chunkIndex: Number(chunk.metadata.chunk_index || 0),
        content: chunk.pageContent,
        metadata: sanitizeMetadata(chunk.metadata),
        documentHash,
        chunkHash: String(chunk.metadata.chunk_hash),
        tokenCount: Number(chunk.metadata.token_count || 0),
        pageNumber: typeof chunk.metadata.page_number === "number" ? chunk.metadata.page_number : null,
        sectionTitle: typeof chunk.metadata.section_title === "string" ? chunk.metadata.section_title : null,
        version: 1,
      })),
    }),
  ]);

  await syncVectorChunks(chunks);

  await bumpRetrievalCacheVersion();
  return chunks.length;
}
