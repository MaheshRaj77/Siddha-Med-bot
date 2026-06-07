import crypto from "crypto";
import { Document } from "@langchain/core/documents";
import type { RagDocument, RagMetadata } from "./types";

const TOKEN_PATTERN = /[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu;
const DEFAULT_MAX_TOKENS = 512;
const DEFAULT_OVERLAP_TOKENS = 80;

export function sha256(value: Buffer | string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function estimateTokens(text: string) {
  return tokenize(text).length;
}

export function tokenize(text: string) {
  return text.match(TOKEN_PATTERN) || [];
}

export function normalizeWhitespace(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function extractSectionTitle(text: string) {
  const firstUsefulLine = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length >= 4 && line.length <= 120);

  if (!firstUsefulLine) return undefined;
  if (/^[A-Z][\w\s:(),/-]{3,120}$/.test(firstUsefulLine)) return firstUsefulLine;
  if (/^\d+(\.\d+)*\s+/.test(firstUsefulLine)) return firstUsefulLine;
  return undefined;
}

export function getPageNumber(metadata: Record<string, unknown>) {
  const loc = metadata.loc;
  if (loc && typeof loc === "object" && "pageNumber" in loc) {
    const pageNumber = (loc as { pageNumber?: unknown }).pageNumber;
    if (typeof pageNumber === "number") return pageNumber;
  }
  const page = metadata.page;
  return typeof page === "number" ? page : undefined;
}

export function splitDocumentsByTokens(
  docs: Array<Document<Record<string, unknown>>>,
  options: {
    fileName: string;
    fileType: string;
    documentHash: string;
    version?: number;
    maxTokens?: number;
    overlapTokens?: number;
  }
): RagDocument[] {
  const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS;
  const overlapTokens = options.overlapTokens || DEFAULT_OVERLAP_TOKENS;
  const chunks: RagDocument[] = [];

  for (const sourceDoc of docs) {
    const text = normalizeWhitespace(sourceDoc.pageContent);
    if (!text) continue;

    const tokens = tokenize(text);
    if (tokens.length === 0) continue;

    const pageNumber = getPageNumber(sourceDoc.metadata || {});
    const sectionTitle = extractSectionTitle(text);
    let start = 0;

    while (start < tokens.length) {
      const end = Math.min(tokens.length, start + maxTokens);
      const chunkText = tokens.slice(start, end).join(" ").replace(/\s+([.,;:!?%)\]])/g, "$1").replace(/([([₹$])\s+/g, "$1");
      const chunkHash = sha256(`${options.documentHash}:${chunks.length}:${chunkText}`);
      const sourceMetadata = sanitizeMetadata(sourceDoc.metadata || {});
      const metadata: RagMetadata & Record<string, string | number | boolean | undefined> = {
        ...sourceMetadata,
        source_file: options.fileName,
        document_hash: options.documentHash,
        chunk_hash: chunkHash,
        chunk_index: chunks.length,
        token_count: end - start,
        type: options.fileType,
        version: options.version || 1,
        ...(pageNumber ? { page_number: pageNumber } : {}),
        ...(sectionTitle ? { section_title: sectionTitle } : {}),
      };

      chunks.push(new Document({ pageContent: chunkText, metadata }));

      if (end >= tokens.length) break;
      start = Math.max(end - overlapTokens, start + 1);
    }
  }

  return chunks;
}

export function sanitizeMetadata(metadata: Record<string, unknown>) {
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      clean[key] = value;
    }
  }
  return clean;
}
