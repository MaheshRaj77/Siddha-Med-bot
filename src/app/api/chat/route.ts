import { NextRequest } from "next/server";
import { agentExecutor, costOptimizedLlm } from "@/lib/rag/agent";
import prisma from "@/lib/server/db";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { authorize, enforceSameOrigin, internalServerError, logServerError, parseJson, uuidSchema } from "@/lib/server/security";
import { resolveUserPlan } from "@/lib/billing/pricing-server";
import { estimateAnswerCostMinor } from "@/lib/ai-cost";
import { getMonthlyCreditAdjustment } from "@/lib/billing/credits";

const chatSchema = z.object({
  query: z.string().trim().min(1).max(2000),
  originalQuery: z.string().trim().min(1).max(2000).optional(),
  sessionId: uuidSchema.optional(),
  clarificationAnswered: z.boolean().optional().default(false),
}).strict();

type RetrievedSource = {
  pageContent: string;
  metadata: {
    source_file?: string;
    loc?: { pageNumber?: number | string };
    page?: number | string;
  };
};

type AgentStateAccumulator = {
  rerankedDocs?: RetrievedSource[];
  generation?: string;
  symptomsToAsk?: string[];
  needsDoctor?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const auth = await authorize();
    if (auth.response) return auth.response;
    const dbUser = auth.user;

    const rateLimitError = await enforceRateLimit("chat", dbUser.id);
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJson(req, chatSchema, 96 * 1024);
    if (parsed.response) return parsed.response;
    const { query, originalQuery, sessionId, clarificationAnswered } = parsed.data;
    const determinedSessionId = sessionId || crypto.randomUUID();
    const existingSession = sessionId
      ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
      : null;

    if (existingSession && (existingSession.userId !== dbUser.id || existingSession.isDeleted)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized or session not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const plan = await resolveUserPlan(dbUser.planSlug);
    const tokenAdjustment = await getMonthlyCreditAdjustment(dbUser.id);
    const monthlyTokenLimit = dbUser.role === "SUPER_ADMIN" ? 999_999_999 : Math.max(0, plan.monthlyTokenLimit + tokenAdjustment);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyTokenUsage = await prisma.chatCostMetric.aggregate({
      where: { userId: dbUser.id, createdAt: { gte: monthStart } },
      _sum: { totalTokens: true },
    });
    const monthlyTokensUsed = monthlyTokenUsage._sum.totalTokens || 0;

    if (monthlyTokensUsed >= monthlyTokenLimit) {
      return new Response(
        JSON.stringify({
          error: "Monthly token limit reached. Upgrade your subscription or wait for your tokens to reset.",
          upgradeUrl: "/#pricing",
          tokens: {
            monthlyTokenLimit,
            monthlyTokensUsed,
            monthlyTokensRemaining: 0,
            monthlyTokenAdjustment: dbUser.role === "SUPER_ADMIN" ? 0 : tokenAdjustment,
          },
          quota: { monthlyTokenLimit },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const sanitizedQuery = query.replace(/[<>]/g, '');
    const sanitizedOriginalQuery = originalQuery?.replace(/[<>]/g, '');
    const startTime = Date.now();
    const chatLogId = crypto.randomUUID();

    if (!existingSession) {
      const fallbackTitle = sanitizedQuery.length > 32 ? `${sanitizedQuery.slice(0, 32)}...` : sanitizedQuery;
      await prisma.chatSession.create({
        data: { id: determinedSessionId, userId: dbUser.id, title: fallbackTitle }
      });

      costOptimizedLlm.invoke(`Summarize this medical question into a short 2-4 word title. Respond ONLY with the title. Question: "${sanitizedQuery}"`).then(res => {
        const sessionTitle = res.content.toString().replace(/["']/g, '').trim().slice(0, 80);
        return prisma.chatSession.update({
          where: { id: determinedSessionId },
          data: { title: sessionTitle || fallbackTitle }
        });
      }).catch((error: unknown) => logServerError("chat.session_title", error));
    }

    const priorLogs = existingSession
      ? await prisma.chatLog.findMany({
          where: { sessionId: determinedSessionId, userId: dbUser.id },
          orderBy: { timestamp: "desc" },
          take: 10,
          select: { query: true, answer: true },
        })
      : [];
    const historyStr = priorLogs.reverse()
      .map((log) => `User: ${log.query}\nMedBot: ${log.answer}`)
      .join("\n");
    const priorOriginalQuery = priorLogs.at(-1)?.query?.replace(/[<>]/g, '');
    const effectiveOriginalQuery = sanitizedOriginalQuery || (clarificationAnswered ? priorOriginalQuery : undefined);
    const agentInput = clarificationAnswered && effectiveOriginalQuery
      ? `Original user question:\n${effectiveOriginalQuery}\n\nStructured follow-up answers:\n${sanitizedQuery}\n\nAnswer the original question using the follow-up answers.`
      : sanitizedQuery;

    await prisma.chatLog.create({
      data: {
        id: chatLogId,
        query,
        answer: "",
        durationMs: 0,
        retrievedDocs: [],
        triageData: {
          symptoms_to_ask: [],
          needs_doctor: false,
        },
        sessionId: determinedSessionId,
        userId: dbUser.id,
      }
    });

    // SSE encoder helper
    const encoder = new TextEncoder();

    // Create ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          // Initialize streaming of events
          const eventStream = await agentExecutor.streamEvents(
            {
              input: agentInput,
              history: historyStr,
              chatLogId,
              clarificationAnswered,
            },
            { version: "v2" }
          );

          let isGenerating = false;
          let generatedText = "";
          const stateAccumulator: AgentStateAccumulator = {};

          for await (const event of eventStream) {
            const eventType = event.event;
            const name = event.name;

            // Track active graph nodes
            if (eventType === "on_chain_start" && ["medicalSafety", "clarification", "retrieval", "reranking", "generator", "verification"].includes(name)) {
              sendEvent("node_start", { node: name });
              if (name === "generator") {
                isGenerating = true;
              }
            }

            if (eventType === "on_chain_end" && ["medicalSafety", "clarification", "retrieval", "reranking", "generator", "verification"].includes(name)) {
              sendEvent("node_end", { node: name });
              if (name === "generator") {
                isGenerating = false;
              }
              // Accumulate all state keys as they execute
              Object.assign(stateAccumulator, event.data.output);
            }

            // Stream token updates during generator phase
            if (eventType === "on_chat_model_stream" && isGenerating) {
              const chunk = event.data.chunk;
              if (chunk?.content) {
                generatedText += chunk.content;
                sendEvent("token", { token: chunk.content });
              }
            }
          }

          const durationMs = Date.now() - startTime;

          // Re-fetch diagnostic telemetry from Postgres to stream back
          let diagnosticsObj = null;
          try {
            diagnosticsObj = await prisma.retrievalDiagnostic.findFirst({
              where: { chatLogId },
              orderBy: { timestamp: "desc" }
            });
          } catch (error: unknown) {
            logServerError("chat.load_diagnostics", error);
          }

          if (diagnosticsObj && dbUser.role === "SUPER_ADMIN") {
            sendEvent("diagnostics", diagnosticsObj);
          }

          // Format sources
          const sources = (stateAccumulator.rerankedDocs || []).map((doc) => ({
            file: doc.metadata.source_file || "Unknown Source",
            page: doc.metadata.loc?.pageNumber || doc.metadata.page || 1,
            text: doc.pageContent,
          }));

          // Final response answer payload
          const finalAnswer = stateAccumulator.generation || generatedText;

          // Save final chat interaction log linked to user
          await prisma.chatLog.update({
            where: { id: chatLogId },
            data: {
              answer: finalAnswer,
              durationMs,
              retrievedDocs: sources,
              triageData: {
                symptoms_to_ask: stateAccumulator.symptomsToAsk || [],
                needs_doctor: stateAccumulator.needsDoctor || false,
              },
            }
          });

          const contextForCost = (stateAccumulator.rerankedDocs || [])
            .map((doc) => `${doc.metadata.source_file || "Unknown Source"}\n${doc.pageContent}`)
            .join("\n\n");
          const cost = estimateAnswerCostMinor({
            promptText: `${historyStr}\n\n${agentInput}\n\n${contextForCost}`,
            completionText: finalAnswer,
          });
          await prisma.chatCostMetric.upsert({
            where: { chatLogId },
            update: {
              userId: dbUser.id,
              planSlug: dbUser.planSlug,
              model: "meta/llama-3.3-70b-instruct",
              ...cost,
              sourceCount: sources.length,
            },
            create: {
              chatLogId,
              userId: dbUser.id,
              planSlug: dbUser.planSlug,
              model: "meta/llama-3.3-70b-instruct",
              ...cost,
              sourceCount: sources.length,
            },
          }).catch((error: unknown) => logServerError("chat.cost_metric", error));

          // Stream final completion event
          sendEvent("done", {
            chatLogId,
            answer: finalAnswer,
            sources,
            symptoms_to_ask: stateAccumulator.symptomsToAsk || [],
            needs_doctor: stateAccumulator.needsDoctor || false,
          });

          controller.close();
        } catch (error: unknown) {
          logServerError("chat.stream", error);
          await prisma.chatLog.update({
            where: { id: chatLogId },
            data: {
              answer: "An internal error occurred during chat generation.",
              durationMs: Date.now() - startTime,
              retrievedDocs: [],
              triageData: {
                symptoms_to_ask: [],
                needs_doctor: false,
              },
            },
          }).catch((updateError: unknown) => logServerError("chat.log_failure", updateError));
          sendEvent("error", { message: "An internal error occurred during chat generation." });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: unknown) {
    return internalServerError("chat.init", error);
  }
}
