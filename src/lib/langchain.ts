import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { ChromaClient } from "chromadb";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { prisma } from "./db";

export const getEmbeddings = () => {
  return new OpenAIEmbeddings({
    apiKey: process.env.NVIDIA_API_KEY,
    model: "nvidia/nv-embed-v1",
    configuration: {
      baseURL: "https://integrate.api.nvidia.com/v1",
    },
  });
};

export const getChromaClient = () => {
  return new ChromaClient({
    host: "api.trychroma.com",
    port: 443,
    ssl: true,
    tenant: process.env.CHROMA_TENANT,
    database: process.env.CHROMA_DATABASE,
    headers: {
      "x-chroma-token": process.env.CHROMA_API_KEY!,
    },
  });
};

export const getVectorStore = async () => {
  const client = getChromaClient();
  return new Chroma(getEmbeddings(), {
    collectionName: "medical_rag",
    url: `https://api.trychroma.com:443`,
    index: client as any,
  });
};

// Advanced Chunking
export const ingestDocument = async (fileBuffer: Buffer, fileName: string, fileType: string) => {
  let docs: any[] = [];
  
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'application/pdf' });
    const loader = new PDFLoader(blob, { parsedItemSeparator: " " });
    docs = await loader.load();
  } else if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'text/csv' });
    const loader = new CSVLoader(blob);
    docs = await loader.load();
  } else {
    throw new Error("Unsupported file type");
  }

  // Advanced Markdown-aware & semantic-like text splitting
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1200,
    chunkOverlap: 300,
    separators: ["\n\n", "\n", " ", ""],
  });
  
  const chunks = await splitter.splitDocuments(docs);
  
  chunks.forEach((chunk, index) => {
    // Preserve section hierarchy and sanitize metadata
    const cleanMeta: Record<string, string | number | boolean> = { 
      source_file: fileName,
      chunk_index: index,
      type: fileType
    };
    for (const [key, value] of Object.entries(chunk.metadata)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        cleanMeta[key] = value;
      }
    }
    chunk.metadata = cleanMeta;
  });

  // Save to PostgreSQL DocumentChunk table for lexical FTS
  await prisma.documentChunk.createMany({
    data: chunks.map((chunk, index) => ({
      fileName: fileName,
      chunkIndex: index,
      content: chunk.pageContent,
      metadata: chunk.metadata as any
    }))
  });

  const vectorStore = await getVectorStore();
  // Batch add to avoid overwhelming API
  const batchSize = 100;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    await vectorStore.addDocuments(batch);
  }
  
  return chunks.length;
};
