import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import prisma from "@/lib/db";

// GET /api/chat/sessions — list all chat sessions of the logged-in user
export async function GET(req: NextRequest) {
  try {
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

    // Fetch sessions belonging to this user that are not soft-deleted
    const sessions = await prisma.chatSession.findMany({
      where: { userId: dbUser.id, isDeleted: false },
      orderBy: { updatedAt: "desc" },
      include: {
        logs: {
          orderBy: { timestamp: "asc" },
          take: 1, // Only get the first log to use its query as the session title
          select: {
            query: true,
          },
        },
      },
    });

    // Format sessions to include a calculated title
    const formattedSessions = sessions.map((s) => {
      const firstLog = s.logs[0];
      const rawTitle = firstLog?.query || "New Conversation";
      // Truncate title cleanly
      const title = rawTitle.length > 32 ? `${rawTitle.slice(0, 32)}...` : rawTitle;
      
      return {
        id: s.id,
        title,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });

    return NextResponse.json({ success: true, sessions: formattedSessions });
  } catch (error: any) {
    console.error("Failed to list sessions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/chat/sessions — delete a session and all its associated logs
export async function DELETE(req: NextRequest) {
  try {
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

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("id");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    // Verify ownership of session before deletion
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized or session not found" }, { status: 403 });
    }

    // Perform a soft-delete instead of hard-deleting the session, logs, and diagnostics.
    // This preserves all consultation records in the database for AI / Model training purposes.
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { isDeleted: true },
    });

    return NextResponse.json({ success: true, message: "Session successfully deleted from view" });
  } catch (error: any) {
    console.error("Failed to delete session:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
