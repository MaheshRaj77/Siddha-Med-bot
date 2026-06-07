import { NextResponse } from "next/server";
import prisma from "@/lib/server/db";
import { authorize, internalServerError } from "@/lib/server/security";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export async function GET() {
  try {
    const authorization = await authorize(["SUPER_ADMIN"]);
    if (authorization.response) return authorization.response;

    const rateLimitError = await enforceRateLimit("privileged", authorization.user.id);
    if (rateLimitError) return rateLimitError;

    const logs = await prisma.securityAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        actor: { select: { email: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ logs });
  } catch (error: unknown) {
    return internalServerError("super_admin.audit_logs", error);
  }
}
