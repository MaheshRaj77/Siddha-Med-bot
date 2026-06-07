import { NextRequest, NextResponse } from "next/server";
import { getChromaClient } from "@/lib/langchain";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import prisma from "@/lib/server/db";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { auditSecurityEvent, enforceSameOrigin, internalServerError, parseJson } from "@/lib/server/security";
import { bumpRetrievalCacheVersion } from "@/lib/rag/cache";

const deleteDocumentsSchema = z.object({
  ids: z.array(z.string().trim().min(1).max(512)).max(10000).optional(),
  name: z.string().trim().min(1).max(512).optional(),
}).strict().refine((value) => Boolean(value.name || (value.ids && value.ids.length > 0)), {
  message: "Document name or chunk ids are required",
});

const updateDocumentSchema = z.object({
  name: z.string().trim().min(1).max(512),
  isActive: z.boolean(),
}).strict();

type ChromaMetadata = Record<string, unknown>;
type DocumentSummary = {
  name: string;
  chunkCount: number;
  ids: string[];
  sampleText: string;
  source: "chroma" | "postgres";
  type: string | null;
  sourceUrl: string | null;
  documentHash: string | null;
  version: number;
  isActive: boolean;
  ingested: string | null;
  updatedAt: string | null;
};

// Helper to verify user is ADMIN or SUPER_ADMIN
async function verifyAdminOrSuperAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (!authUser) return null;
  
  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
  });
  
  if (!user || !user.isActive || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return null;
  return user;
}

// GET — list all documents in the ChromaDB collection with metadata
export async function GET() {
  try {
    const adminUser = await verifyAdminOrSuperAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rateLimitError = await enforceRateLimit("privileged", adminUser.id);
    if (rateLimitError) return rateLimitError;

    const documentMap = new Map<string, DocumentSummary>();

    try {
      const client = getChromaClient();
      const collection = await client.getOrCreateCollection({
        name: "medical_rag",
        embeddingFunction: null as never, // skip default embedding — we only need metadata
      });

      // Fetch in pages to stay within ChromaDB free-tier quota (max 100 per request)
      const allIds: string[] = [];
      const allMetadatas: (ChromaMetadata | null)[] = [];
      const allDocuments: (string | null)[] = [];
      let offset = 0;
      const pageSize = 100;

      while (true) {
        const results = await collection.get({
          limit: pageSize,
          offset,
          include: ["metadatas", "documents"],
        });

        if (!results.ids || results.ids.length === 0) break;

        allIds.push(...results.ids);
        allMetadatas.push(...(results.metadatas || []));
        allDocuments.push(...(results.documents || []));

        if (results.ids.length < pageSize) break; // last page
        offset += pageSize;
      }

      // Group by source_file
      const fileMap = new Map<string, { ids: string[]; chunkCount: number; sampleText: string }>();

      for (let i = 0; i < allIds.length; i++) {
        const id = allIds[i];
        const meta = allMetadatas[i];
        const doc = allDocuments[i] || "";
        const sourceFile = (meta?.source_file as string) || "Unknown";

        if (!fileMap.has(sourceFile)) {
          fileMap.set(sourceFile, { ids: [], chunkCount: 0, sampleText: "" });
        }
        const entry = fileMap.get(sourceFile)!;
        entry.ids.push(id);
        entry.chunkCount++;
        if (!entry.sampleText && doc) {
          entry.sampleText = doc.slice(0, 200);
        }
      }

      for (const [name, data] of fileMap.entries()) {
        documentMap.set(name, {
          name,
          chunkCount: data.chunkCount,
          ids: data.ids,
          sampleText: data.sampleText,
          source: "chroma",
          type: null,
          sourceUrl: null,
          documentHash: null,
          version: 1,
          isActive: true,
          ingested: null,
          updatedAt: null,
        });
      }
    } catch {
      // Postgres remains the durable fallback below.
    }

    const metadataRows = await prisma.documentMetadata.findMany({
      orderBy: { ingested: "desc" },
    });
    const chunks = await prisma.documentChunk.findMany({
      orderBy: [{ fileName: "asc" }, { chunkIndex: "asc" }],
      select: { id: true, fileName: true, content: true },
    });
    const chunksByFile = new Map<string, { ids: string[]; sampleText: string }>();

    for (const chunk of chunks) {
      if (!chunksByFile.has(chunk.fileName)) {
        chunksByFile.set(chunk.fileName, { ids: [], sampleText: chunk.content.slice(0, 200) });
      }
      chunksByFile.get(chunk.fileName)!.ids.push(chunk.id);
    }

    for (const row of metadataRows) {
      const chunkInfo = chunksByFile.get(row.fileName) || { ids: [], sampleText: "" };
      const existing = documentMap.get(row.fileName);
      if (existing) {
        documentMap.set(row.fileName, {
          ...existing,
          chunkCount: Math.max(existing.chunkCount, row.chunks),
          ids: existing.ids.length > 0 ? existing.ids : chunkInfo.ids,
          sampleText: existing.sampleText || chunkInfo.sampleText,
          type: row.type,
          sourceUrl: row.sourceUrl,
          documentHash: row.documentHash,
          version: row.version,
          isActive: row.isActive,
          ingested: row.ingested.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        });
      } else {
        documentMap.set(row.fileName, {
          name: row.fileName,
          chunkCount: row.chunks,
          ids: chunkInfo.ids,
          sampleText: chunkInfo.sampleText,
          source: "postgres",
          type: row.type,
          sourceUrl: row.sourceUrl,
          documentHash: row.documentHash,
          version: row.version,
          isActive: row.isActive,
          ingested: row.ingested.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        });
      }
    }

    const documents = Array.from(documentMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    const totalChunks = documents.reduce((sum, document) => sum + document.chunkCount, 0);
    auditSecurityEvent("admin.documents.read", adminUser.id, { count: totalChunks });
    const jobs = await prisma.ingestionJob.findMany({
      where: {
        OR: [
          { status: { in: ["PENDING", "PROCESSING"] } },
          {
            status: "FAILED",
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        fileName: true,
        fileType: true,
        status: true,
        chunksCount: true,
        error: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ documents, totalChunks, jobs });
  } catch (error: unknown) {
    return internalServerError("admin.documents.list", error);
  }
}

// PATCH — activate/deactivate a curated knowledge source without deleting it
export async function PATCH(req: NextRequest) {
  try {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const adminUser = await verifyAdminOrSuperAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rateLimitError = await enforceRateLimit("privileged", adminUser.id);
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJson(req, updateDocumentSchema, 8 * 1024);
    if (parsed.response) return parsed.response;

    const document = await prisma.documentMetadata.update({
      where: { fileName: parsed.data.name },
      data: {
        isActive: parsed.data.isActive,
        deactivatedAt: parsed.data.isActive ? null : new Date(),
      },
    });

    await bumpRetrievalCacheVersion();
    auditSecurityEvent("admin.documents.activation.update", adminUser.id, {
      fileName: document.fileName,
      isActive: document.isActive,
    });

    return NextResponse.json({
      document: {
        name: document.fileName,
        isActive: document.isActive,
        updatedAt: document.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    return internalServerError("admin.documents.update", error);
  }
}

// DELETE — delete specific document chunks by source file name
export async function DELETE(req: NextRequest) {
  try {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const adminUser = await verifyAdminOrSuperAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rateLimitError = await enforceRateLimit("privileged", adminUser.id);
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJson(req, deleteDocumentsSchema, 1024 * 1024);
    if (parsed.response) return parsed.response;
    const ids = parsed.data.ids || [];

    let sourceFiles = parsed.data.name ? [parsed.data.name] : [];
    let collection: Awaited<ReturnType<ReturnType<typeof getChromaClient>["getOrCreateCollection"]>> | null = null;

    try {
      const client = getChromaClient();
      collection = await client.getOrCreateCollection({
        name: "medical_rag",
        embeddingFunction: null as never,
      });

      if (ids.length > 0) {
        const selected = await collection.get({
          ids,
          include: ["metadatas"],
        });
        const chromaSourceFiles = Array.from(new Set(
          (selected.metadatas || [])
            .map((metadata) => metadata?.source_file)
            .filter((sourceFile): sourceFile is string => typeof sourceFile === "string")
        ));
        sourceFiles = Array.from(new Set([...sourceFiles, ...chromaSourceFiles]));
      }
    } catch (error) {
      console.warn("Unable to inspect Chroma documents before delete; continuing with Postgres delete:", error);
    }

    if (sourceFiles.length === 0) {
      const chunks = await prisma.documentChunk.findMany({
        where: { id: { in: ids } },
        select: { fileName: true },
      });
      sourceFiles = Array.from(new Set(chunks.map((chunk) => chunk.fileName)));
    }

    if (sourceFiles.length === 0) {
      return NextResponse.json({ error: "No matching document found to delete" }, { status: 404 });
    }

    for (const sourceFile of sourceFiles) {
      try {
        if (collection) {
          await collection.delete({ where: { source_file: sourceFile } });
        }
      } catch (error) {
        console.warn(`Unable to delete vector chunks for ${sourceFile}; continuing with Postgres delete:`, error);
      }
    }
    await prisma.$transaction([
      prisma.documentChunk.deleteMany({ where: { fileName: { in: sourceFiles } } }),
      prisma.documentMetadata.deleteMany({ where: { fileName: { in: sourceFiles } } }),
    ]);
    await bumpRetrievalCacheVersion();
    auditSecurityEvent("admin.documents.delete", adminUser.id, { count: sourceFiles.length });

    return NextResponse.json({
      message: `Successfully deleted ${sourceFiles.length} documents`,
      deletedCount: sourceFiles.length,
    });
  } catch (error: unknown) {
    return internalServerError("admin.documents.delete", error);
  }
}
