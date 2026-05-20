import { NextRequest } from "next/server";
import { agentExecutor } from "@/lib/agent";
import prisma from "@/lib/db";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Rate Limit logic using Upstash HTTP Redis (ideal for Serverless)
let ratelimit: Ratelimit | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    
    // Apply rate limit if Upstash is configured
    if (ratelimit) {
      const { success } = await ratelimit.limit(`rate_limit:${ip}`);
      if (!success) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // ── AUTH & PLAN RATE-LIMITING ──
    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return new Response(
        JSON.stringify({ error: "Authentication required to access MedBot." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
    });

    if (!dbUser) {
      return new Response(
        JSON.stringify({ error: "User profile not found. Please log in again." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!dbUser.isActive) {
      return new Response(
        JSON.stringify({ error: "Your account is deactivated. Contact your Super Admin." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch quota
    const quota = await prisma.queryQuota.findUnique({
      where: { role: dbUser.role },
    });

    const dailyLimit = quota?.dailyQueryLimit ?? (dbUser.role === "SUPER_ADMIN" ? 999999 : dbUser.role === "ADMIN" ? 100 : 10);
    const monthlyLimit = quota?.monthlyQueryLimit ?? (dbUser.role === "SUPER_ADMIN" ? 999999 : dbUser.role === "ADMIN" ? 3000 : 300);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's usage
    const todayUsage = await prisma.queryUsage.findUnique({
      where: {
        userId_date: {
          userId: dbUser.id,
          date: today,
        },
      },
    });

    if (todayUsage && todayUsage.count >= dailyLimit) {
      return new Response(
        JSON.stringify({ error: `Daily limit of ${dailyLimit} queries reached. Upgrade your plan or contact your administrator.` }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get monthly usage
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyUsageAggregate = await prisma.queryUsage.aggregate({
      where: {
        userId: dbUser.id,
        date: { gte: monthStart },
      },
      _sum: { count: true },
    });

    const monthlyCount = monthlyUsageAggregate._sum.count || 0;
    if (monthlyCount >= monthlyLimit) {
      return new Response(
        JSON.stringify({ error: `Monthly limit of ${monthlyLimit} queries reached. Contact your administrator.` }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    let { query, history = [], sessionId } = await req.json();
    
    // 1. Basic Validation
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: "Valid query string is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Sanitization & Length Guardrails
    query = query.trim();
    if (query.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Query exceeds maximum length of 2000 characters." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const sanitizedQuery = query.replace(/[<>]/g, '');
    const startTime = Date.now();
    const chatLogId = crypto.randomUUID();
    
    // Format history
    const historyStr = history.map((h: any) => `${h.role === 'user' ? 'User' : 'MedBot'}: ${h.content}`).join("\n");

    // SSE encoder helper
    const encoder = new TextEncoder();

    // Create ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          // Initialize streaming of events
          const eventStream = await agentExecutor.streamEvents(
            {
              input: sanitizedQuery,
              history: historyStr,
              chatLogId,
            },
            { version: "v2" }
          );

          let isGenerating = false;
          let generatedText = "";
          const stateAccumulator: any = {};

          for await (const event of eventStream) {
            const eventType = event.event;
            const name = event.name;

            // Track active graph nodes
            if (eventType === "on_chain_start" && ["medicalSafety", "retrieval", "reranking", "generator", "verification"].includes(name)) {
              sendEvent("node_start", { node: name });
              if (name === "generator") {
                isGenerating = true;
              }
            }

            if (eventType === "on_chain_end" && ["medicalSafety", "retrieval", "reranking", "generator", "verification"].includes(name)) {
              sendEvent("node_end", { node: name, output: event.data.output });
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
          } catch (e) {
            console.error("Error loading diagnostics for chat log:", e);
          }

          if (diagnosticsObj) {
            sendEvent("diagnostics", diagnosticsObj);
          }

          // Format sources
          const sources = (stateAccumulator.rerankedDocs || []).map((doc: any) => ({
            file: doc.metadata.source_file || "Unknown Source",
            page: doc.metadata.loc?.pageNumber || doc.metadata.page || 1,
            text: doc.pageContent,
          }));

          // Final response answer payload
          const finalAnswer = stateAccumulator.generation || generatedText;

          // Ensure valid ChatSession is registered in DB
          const determinedSessionId = sessionId || (history.length > 0 ? history[0].content.slice(0, 20) : crypto.randomUUID());
          try {
            await prisma.chatSession.upsert({
              where: { id: determinedSessionId },
              update: {},
              create: { 
                id: determinedSessionId,
                userId: dbUser.id,
              }
            });
          } catch (sessionErr) {
            console.error("Failed to upsert ChatSession:", sessionErr);
          }

          // Increment daily query count for this user
          try {
            await prisma.queryUsage.upsert({
              where: {
                userId_date: {
                  userId: dbUser.id,
                  date: today,
                },
              },
              update: {
                count: { increment: 1 },
              },
              create: {
                userId: dbUser.id,
                date: today,
                count: 1,
              },
            });
          } catch (usageErr) {
            console.error("Failed to increment QueryUsage:", usageErr);
          }

          // Save final chat interaction log linked to user
          await prisma.chatLog.create({
            data: {
              id: chatLogId,
              query,
              answer: finalAnswer,
              durationMs,
              retrievedDocs: JSON.stringify(sources),
              triageData: JSON.stringify({
                symptoms_to_ask: stateAccumulator.symptomsToAsk || [],
                needs_doctor: stateAccumulator.needsDoctor || false,
              }),
              sessionId: determinedSessionId,
              userId: dbUser.id,
            }
          });

          // Stream final completion event
          sendEvent("done", {
            chatLogId,
            answer: finalAnswer,
            sources,
            symptoms_to_ask: stateAccumulator.symptomsToAsk || [],
            needs_doctor: stateAccumulator.needsDoctor || false,
          });

          controller.close();
        } catch (err: any) {
          console.error("SSE stream execution error:", err);
          sendEvent("error", { message: err.message || "Failed to process stream" });
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

  } catch (error: any) {
    console.error("SSE Initialization Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to initialize stream" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
