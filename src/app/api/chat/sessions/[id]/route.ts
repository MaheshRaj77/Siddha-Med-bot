import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/server/db";
import { authorize, internalServerError, logServerError, uuidSchema } from "@/lib/server/security";

type SourceRef = { file: string; page: number | string; text: string };
type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: SourceRef[];
  symptoms_to_ask?: string[];
  needs_doctor?: boolean;
  diagnostics?: unknown;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    if (!uuidSchema.safeParse(sessionId).success) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    }

    const auth = await authorize();
    if (auth.response) return auth.response;
    const dbUser = auth.user;

    // Verify session existence, ownership, and soft-delete status
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== dbUser.id || session.isDeleted) {
      return NextResponse.json({ error: "Unauthorized or session not found" }, { status: 404 });
    }

    const isSuperAdmin = dbUser.role === "SUPER_ADMIN";

    // Fetch all logs in this session in chronological order
    const logs = await prisma.chatLog.findMany({
      where: { sessionId },
      orderBy: { timestamp: "asc" },
      include: isSuperAdmin ? { diagnostics: true } : undefined,
    });

    // Format logs into chat UI message array
    const messages: ChatHistoryMessage[] = [];

    logs.forEach((log) => {
      // User query message
      messages.push({
        role: "user",
        content: log.query,
      });

      let parsedSources: SourceRef[] = [];
      if (log.retrievedDocs) {
        if (typeof log.retrievedDocs === "string") {
          try {
            const parsed = JSON.parse(log.retrievedDocs);
            parsedSources = Array.isArray(parsed) ? parsed.filter(isSourceRef) : [];
          } catch (error: unknown) {
            logServerError("chat.sessions.detail.parse_sources", error);
          }
        } else if (Array.isArray(log.retrievedDocs)) {
          parsedSources = log.retrievedDocs.filter(isSourceRef);
        }
      }

      // Parse triageData safely
      let symptomsToAsk: string[] = [];
      let needsDoctor = false;
      if (log.triageData) {
        let parsedTriage: Record<string, unknown> = {};
        if (typeof log.triageData === "string") {
          try {
            const parsed = JSON.parse(log.triageData);
            parsedTriage = parsed && typeof parsed === "object" && !Array.isArray(parsed)
              ? parsed as Record<string, unknown>
              : {};
          } catch (error: unknown) {
            logServerError("chat.sessions.detail.parse_triage", error);
          }
        } else {
          parsedTriage = log.triageData && typeof log.triageData === "object" && !Array.isArray(log.triageData)
            ? log.triageData as Record<string, unknown>
            : {};
        }
        symptomsToAsk = Array.isArray(parsedTriage.symptoms_to_ask)
          ? parsedTriage.symptoms_to_ask.filter((symptom): symptom is string => typeof symptom === "string")
          : [];
        needsDoctor = parsedTriage.needs_doctor === true;
      }

      // MedBot response message
      const diagnostics = "diagnostics" in log && Array.isArray(log.diagnostics) && log.diagnostics.length > 0
        ? log.diagnostics[0]
        : null;

      messages.push({
        role: "assistant",
        content: log.answer,
        sources: parsedSources,
        symptoms_to_ask: symptomsToAsk,
        needs_doctor: needsDoctor,
        diagnostics: isSuperAdmin ? diagnostics : null,
      });
    });

    return NextResponse.json({
      success: true,
      messages,
      sessionId,
    });
  } catch (error: unknown) {
    return internalServerError("chat.sessions.detail", error);
  }
}

function isSourceRef(value: unknown): value is SourceRef {
  if (!value || typeof value !== "object") return false;
  const source = value as Record<string, unknown>;
  return typeof source.file === "string"
    && (typeof source.page === "string" || typeof source.page === "number")
    && typeof source.text === "string";
}
