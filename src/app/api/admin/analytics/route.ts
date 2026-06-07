import { NextResponse } from "next/server";
import { getAnalytics } from "@/lib/observability/analytics";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { auditSecurityEvent, authorize, internalServerError } from "@/lib/server/security";

export async function GET() {
  try {
    const authorization = await authorize(["ADMIN", "SUPER_ADMIN"]);
    if (authorization.response) return authorization.response;

    const rateLimitError = await enforceRateLimit("privileged", authorization.user.id);
    if (rateLimitError) return rateLimitError;

    const analytics = await getAnalytics(authorization.user.role);
    auditSecurityEvent("admin.analytics.read", authorization.user.id, {
      windowDays: analytics.windowDays,
      totalQueries: analytics.summary.totalQueries,
    });
    return NextResponse.json(analytics);
  } catch (error: unknown) {
    return internalServerError("admin.analytics", error);
  }
}
