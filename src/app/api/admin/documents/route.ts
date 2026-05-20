import { NextRequest, NextResponse } from "next/server";
import { getChromaClient } from "@/lib/langchain";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import prisma from "@/lib/db";

// Helper to verify user is ADMIN or SUPER_ADMIN
async function verifyAdminOrSuperAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (!authUser) return null;
  
  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
  });
  
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return null;
  return user;
}

// GET — list all documents in the ChromaDB collection with metadata
export async function GET() {
  try {
    const adminUser = await verifyAdminOrSuperAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const client = getChromaClient();
    const collection = await client.getOrCreateCollection({
      name: "medical_rag",
      embeddingFunction: null as any, // skip default embedding — we only need metadata
    });

    // Fetch in pages to stay within ChromaDB free-tier quota (max 100 per request)
    let allIds: string[] = [];
    let allMetadatas: (Record<string, any> | null)[] = [];
    let allDocuments: (string | null)[] = [];
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
      const meta = allMetadatas[i] as Record<string, any> | null;
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

    const documents = Array.from(fileMap.entries()).map(([name, data]) => ({
      name,
      chunkCount: data.chunkCount,
      ids: data.ids,
      sampleText: data.sampleText,
    }));

    const totalChunks = allIds.length;

    return NextResponse.json({ documents, totalChunks });
  } catch (error: any) {
    console.error("Admin Documents Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — delete specific document chunks by source file name
export async function DELETE(req: NextRequest) {
  try {
    const adminUser = await verifyAdminOrSuperAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Document IDs required" }, { status: 400 });
    }

    const client = getChromaClient();
    const collection = await client.getOrCreateCollection({
      name: "medical_rag",
      embeddingFunction: null as any,
    });

    // Delete in batches of 50 (safe for free tier)
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      await collection.delete({ ids: batch });
    }

    return NextResponse.json({
      message: `Successfully deleted ${ids.length} chunks`,
      deletedCount: ids.length,
    });
  } catch (error: any) {
    console.error("Admin Delete Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
