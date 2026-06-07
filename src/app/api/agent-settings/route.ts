import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/server/db";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import {
  auditSecurityEvent,
  authorize,
  enforceSameOrigin,
  internalServerError,
  parseJson,
} from "@/lib/server/security";

const SETTINGS_ID = "default";

const DEFAULT_AGENT_SETTINGS = {
  agentName: "Siddha MedBot",
  agentSubtitle: "Medical Research Assistant",
  profileImageUrl: "/bot-profile.png",
  welcomeMessage:
    "Hey there! I'm **Siddha MedBot**, your Medical Research Assistant.\n\nI can help you explore and understand the curated resources in the Knowledge Base. You can ask me anything about Siddha medicine, treatments, and clinical studies covered by those sources.\n\n*Tip: Neenga Tanglish-la kooda kelvi kekalam! I understand and speak Tanglish fluently.*\n\nWhat would you like to explore today?",
  inputPlaceholder: "Ask anything about Siddha medicine",
  disclaimer:
    "AI can make mistakes. Please verify important medical information with a qualified practitioner.",
  followUpQuestionsEnabled: true,
} as const;

type AgentSettingsResponse = {
  agentName: string;
  agentSubtitle: string;
  profileImageUrl: "/bot-profile.png";
  welcomeMessage: string;
  inputPlaceholder: string;
  disclaimer: string;
  followUpQuestionsEnabled: boolean;
};

function toAgentSettingsResponse(settings: Partial<Omit<AgentSettingsResponse, "profileImageUrl">> | null | undefined): AgentSettingsResponse {
  return {
    agentName: settings?.agentName || DEFAULT_AGENT_SETTINGS.agentName,
    agentSubtitle: settings?.agentSubtitle || DEFAULT_AGENT_SETTINGS.agentSubtitle,
    profileImageUrl: DEFAULT_AGENT_SETTINGS.profileImageUrl,
    welcomeMessage: settings?.welcomeMessage || DEFAULT_AGENT_SETTINGS.welcomeMessage,
    inputPlaceholder: settings?.inputPlaceholder || DEFAULT_AGENT_SETTINGS.inputPlaceholder,
    disclaimer: settings?.disclaimer || DEFAULT_AGENT_SETTINGS.disclaimer,
    followUpQuestionsEnabled: settings?.followUpQuestionsEnabled ?? DEFAULT_AGENT_SETTINGS.followUpQuestionsEnabled,
  };
}

const updateAgentSettingsSchema = z.object({
  agentName: z.string().trim().min(2).max(80),
  agentSubtitle: z.string().trim().min(2).max(120),
  profileImageUrl: z.literal("/bot-profile.png"),
  welcomeMessage: z.string().trim().min(20).max(2_000),
  inputPlaceholder: z.string().trim().min(2).max(160),
  disclaimer: z.string().trim().min(10).max(500),
  followUpQuestionsEnabled: z.boolean(),
});

export async function GET() {
  try {
    const settings = await prisma.agentSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: {
        id: SETTINGS_ID,
        ...DEFAULT_AGENT_SETTINGS,
      },
    });

    return NextResponse.json({
      settings: toAgentSettingsResponse(settings),
    });
  } catch (error: unknown) {
    return internalServerError("agent_settings.get", error, "Unable to load agent settings");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const authorization = await authorize(["SUPER_ADMIN"]);
    if (authorization.response) return authorization.response;

    const rateLimitError = await enforceRateLimit("privileged", authorization.user.id);
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJson(req, updateAgentSettingsSchema);
    if (parsed.response) return parsed.response;

    const settings = await prisma.agentSettings.upsert({
      where: { id: SETTINGS_ID },
      update: parsed.data,
      create: {
        id: SETTINGS_ID,
        ...parsed.data,
      },
    });

    auditSecurityEvent("super_admin.agent_settings.update", authorization.user.id);

    return NextResponse.json({ success: true, settings: toAgentSettingsResponse(settings) });
  } catch (error: unknown) {
    return internalServerError("agent_settings.update", error);
  }
}
