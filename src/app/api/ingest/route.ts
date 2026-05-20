import { NextRequest, NextResponse } from "next/server";
import { ingestionQueue } from "@/lib/queue";
import { prisma } from "@/lib/db";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    // ── AUTHENTICATION & ROLE PROTECTION ──
    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Authentication required to ingest documents." }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
    });

    if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Only Doctors (Admin) and Super Admins can upload datasets." }, { status: 403 });
    }

    if (!dbUser.isActive) {
      return NextResponse.json({ error: "Your account is deactivated." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    // Convert to Array to be JSON serializable for BullMQ
    const fileBufferArray = Array.from(new Uint8Array(arrayBuffer));
    
    // Create job in DB
    const jobRecord = await prisma.ingestionJob.create({
      data: {
        fileName: file.name,
        fileType: file.type,
      }
    });

    // Enqueue job
    await ingestionQueue.add('ingest-document', {
      fileBuffer: fileBufferArray,
      fileName: file.name,
      fileType: file.type,
      jobId: jobRecord.id
    });

    return NextResponse.json({
      success: true,
      jobId: jobRecord.id,
      message: `File ${file.name} queued for processing.`,
    });
  } catch (error: any) {
    console.error("Ingest Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process document" },
      { status: 500 }
    );
  }
}
