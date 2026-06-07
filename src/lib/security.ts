import { NextRequest, NextResponse } from "next/server";
import { z, type ZodType } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import prisma from "@/lib/db";
import type { Role, User } from "@prisma/client";
import { ensureAppUser } from "@/lib/auth/user-sync";
import { getConfiguredOrigins, getHeaderDerivedOrigin, normalizeOrigin } from "@/lib/request-origin";

type AuthorizationResult =
  | { user: User; response?: never }
  | { user?: never; response: NextResponse };

type ParsedBody<T> =
  | { data: T; response?: never }
  | { data?: never; response: NextResponse };

const DEFAULT_JSON_LIMIT = 32 * 1024;

export function jsonError(message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json(
    {
      error: message,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

export function logServerError(scope: string, error: unknown) {
  console.error(`[server-error] ${scope}`, normalizeError(error));
}

export function internalServerError(scope: string, error: unknown, message = "An internal error occurred.") {
  logServerError(scope, error);
  return jsonError(message, 500);
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    };
  }

  return { message: String(error) };
}

function error(message: string, status: number) {
  return jsonError(message, status);
}

export async function authorize(
  allowedRoles?: readonly Role[]
): Promise<AuthorizationResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { response: error("Authentication required", 401) };
  }

  const user = await ensureAppUser(authUser);

  if (!user || !user.isActive) {
    return { response: error("Account is inactive or unavailable", 403) };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { response: error("Unauthorized", 403) };
  }

  return { user };
}

export function enforceSameOrigin(req: NextRequest): NextResponse | null {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return error("Cross-origin request rejected", 403);
  }

  const suppliedOrigin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const allowedOrigins = getConfiguredOrigins();
  const requestOrigin = getHeaderDerivedOrigin(req.headers, req.nextUrl.origin);
  const expectedOrigins = allowedOrigins.length > 0
    ? allowedOrigins
    : requestOrigin
      ? [requestOrigin]
      : [];

  let candidateOrigin: string | null = suppliedOrigin;
  if (!candidateOrigin && referer) {
    try {
      candidateOrigin = new URL(referer).origin;
    } catch {
      return error("Invalid request origin", 403);
    }
  }

  if (!candidateOrigin) {
    return error("Request origin required", 403);
  }

  try {
    const normalizedCandidate = normalizeOrigin(candidateOrigin);
    if (!normalizedCandidate || !expectedOrigins.includes(normalizedCandidate)) {
      return error("Cross-origin request rejected", 403);
    }
  } catch {
    return error("Invalid request origin", 403);
  }

  return null;
}

export async function parseJson<T>(
  req: NextRequest,
  schema: ZodType<T>,
  maxBytes = DEFAULT_JSON_LIMIT
): Promise<ParsedBody<T>> {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return { response: error("Content-Type must be application/json", 415) };
  }

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (!Number.isFinite(contentLength) || contentLength > maxBytes) {
    return { response: error("Request body is too large", 413) };
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return { response: error("Unable to read request body", 400) };
  }

  if (Buffer.byteLength(rawBody, "utf8") > maxBytes) {
    return { response: error("Request body is too large", 413) };
  }

  try {
    const parsed = schema.safeParse(JSON.parse(rawBody));
    if (!parsed.success) {
      return { response: error("Invalid request body", 400) };
    }
    return { data: parsed.data };
  } catch {
    return { response: error("Invalid JSON body", 400) };
  }
}

export function getClientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-vercel-forwarded-for")
    || req.headers.get("x-real-ip")
    || req.headers.get("x-forwarded-for");

  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export function auditSecurityEvent(
  action: string,
  actorId: string | null,
  details: Record<string, string | number | boolean | null> = {}
) {
  const timestamp = new Date();
  console.info("[security-audit]", {
    action,
    actorId,
    ...details,
    timestamp: timestamp.toISOString(),
  });

  void prisma.securityAuditLog.create({
    data: {
      action,
      actorId,
      details,
      createdAt: timestamp,
    },
  }).catch((error: unknown) => {
    console.error("[security-audit:persist-failed]", normalizeError(error));
  });
}

export const uuidSchema = z.string().uuid();
