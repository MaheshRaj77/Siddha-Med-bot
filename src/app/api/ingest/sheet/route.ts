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
      return NextResponse.json({ error: "Authentication required to sync spreadsheets." }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
    });

    if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Only Doctors (Admin) and Super Admins can sync datasets." }, { status: 403 });
    }

    if (!dbUser.isActive) {
      return NextResponse.json({ error: "Your account is deactivated." }, { status: 403 });
    }

    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "Google Sheets URL is required" }, { status: 400 });
    }

    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      return NextResponse.json({ error: "Invalid Google Sheets URL" }, { status: 400 });
    }
    
    const sheetId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    const response = await fetch(exportUrl);
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to download Google Sheet as CSV. Make sure it's public." }, { status: 400 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const fileBufferArray = Array.from(new Uint8Array(arrayBuffer));
    const fileName = `GoogleSheet_${sheetId}.csv`;
    const fileType = "text/csv";
    
    const jobRecord = await prisma.ingestionJob.create({
      data: {
        fileName: fileName,
        fileType: fileType,
      }
    });

    await ingestionQueue.add('ingest-document', {
      fileBuffer: fileBufferArray,
      fileName,
      fileType,
      jobId: jobRecord.id
    });

    return NextResponse.json({
      success: true,
      jobId: jobRecord.id,
      message: `Google Sheet queued for processing.`,
    });
  } catch (error: any) {
    console.error("Ingest Sheet Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process Google Sheet" },
      { status: 500 }
    );
  }
}
