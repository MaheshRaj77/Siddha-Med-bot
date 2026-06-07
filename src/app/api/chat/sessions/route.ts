import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/server/db";
import { authorize, enforceSameOrigin, internalServerError, uuidSchema } from "@/lib/server/security";

// GET /api/chat/sessions — list all chat sessions of the logged-in user
export async function GET() {
  try {
    const auth = await authorize();
    if (auth.response) return auth.response;
    const dbUser = auth.user;

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
      let title = s.title;
      // Fallback for old sessions without a title
      if (!title) {
        const firstLog = s.logs[0];
        const rawTitle = firstLog?.query || "New Conversation";
        title = rawTitle.length > 32 ? `${rawTitle.slice(0, 32)}...` : rawTitle;
      }
      
      return {
        id: s.id,
        title,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });

    return NextResponse.json({ success: true, sessions: formattedSessions });
  } catch (error: unknown) {
    return internalServerError("chat.sessions.list", error);
  }
}

// DELETE /api/chat/sessions — delete a session and all its associated logs
export async function DELETE(req: NextRequest) {
  try {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const auth = await authorize();
    if (auth.response) return auth.response;
    const dbUser = auth.user;

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("id");

    if (!sessionId || !uuidSchema.safeParse(sessionId).success) {
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
  } catch (error: unknown) {
    return internalServerError("chat.sessions.delete", error);
  }
}
