import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import prisma from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User profile not found" }, { status: 401 });
    }

    // Verify session existence, ownership, and soft-delete status
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== dbUser.id || session.isDeleted) {
      return NextResponse.json({ error: "Unauthorized or session not found" }, { status: 404 });
    }

    // Fetch all logs in this session in chronological order
    const logs = await prisma.chatLog.findMany({
      where: { sessionId },
      orderBy: { timestamp: "asc" },
    });

    // Format logs into chat UI message array
    const messages: any[] = [];

    logs.forEach((log) => {
      // User query message
      messages.push({
        role: "user",
        content: log.query,
      });

      // Parse retrievedDocs safely
      let parsedSources: any[] = [];
      if (log.retrievedDocs) {
        if (typeof log.retrievedDocs === "string") {
          try {
            parsedSources = JSON.parse(log.retrievedDocs);
          } catch (e) {
            console.error("Error parsing retrievedDocs string:", e);
          }
        } else if (Array.isArray(log.retrievedDocs)) {
          parsedSources = log.retrievedDocs;
        }
      }

      // Parse triageData safely
      let symptomsToAsk: string[] = [];
      let needsDoctor = false;
      if (log.triageData) {
        let parsedTriage: any = {};
        if (typeof log.triageData === "string") {
          try {
            parsedTriage = JSON.parse(log.triageData);
          } catch (e) {
            console.error("Error parsing triageData string:", e);
          }
        } else {
          parsedTriage = log.triageData;
        }
        symptomsToAsk = parsedTriage.symptoms_to_ask || [];
        needsDoctor = parsedTriage.needs_doctor || false;
      }

      // MedBot response message
      messages.push({
        role: "assistant",
        content: log.answer,
        sources: parsedSources,
        symptoms_to_ask: symptomsToAsk,
        needs_doctor: needsDoctor,
      });
    });

    return NextResponse.json({
      success: true,
      messages,
      sessionId,
    });
  } catch (error: any) {
    console.error("Failed to load session details:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
