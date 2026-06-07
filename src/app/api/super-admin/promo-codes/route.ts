import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/server/db";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { auditSecurityEvent, authorize, enforceSameOrigin, internalServerError, parseJson, uuidSchema } from "@/lib/server/security";

const promoCodeSchema = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()),
  description: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? "Promotional discount" : value,
    z.string().trim().min(2).max(160)
  ),
  discountPercent: z.number().int().min(1).max(100),
  applicablePlanSlugs: z.array(z.string().trim().min(2).max(40)).max(20),
  maxUses: z.number().int().min(1).max(1_000_000).nullable(),
  expiresAt: z.string().datetime().nullable(),
  isActive: z.boolean(),
}).strict();

export async function GET() {
  try {
    const authorization = await authorize(["SUPER_ADMIN"]);
    if (authorization.response) return authorization.response;
    const rateLimitError = await enforceRateLimit("privileged", authorization.user.id);
    if (rateLimitError) return rateLimitError;

    const promoCodes = await prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ promoCodes });
  } catch (error: unknown) {
    return internalServerError("super_admin.promo_codes.list", error);
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

    const parsed = await parseJson(req, promoCodeSchema);
    if (parsed.response) return parsed.response;
    const promoCode = await prisma.promoCode.upsert({
      where: { code: parsed.data.code },
      update: { ...parsed.data, expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null },
      create: { ...parsed.data, expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null },
    });
    auditSecurityEvent("super_admin.promo_code.update", authorization.user.id, { code: promoCode.code });
    return NextResponse.json({ success: true, promoCode });
  } catch (error: unknown) {
    return internalServerError("super_admin.promo_codes.update", error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;
    const authorization = await authorize(["SUPER_ADMIN"]);
    if (authorization.response) return authorization.response;
    const rateLimitError = await enforceRateLimit("privileged", authorization.user.id);
    if (rateLimitError) return rateLimitError;
    const parsed = await parseJson(req, z.object({ id: uuidSchema }).strict());
    if (parsed.response) return parsed.response;
    await prisma.promoCode.delete({ where: { id: parsed.data.id } });
    auditSecurityEvent("super_admin.promo_code.delete", authorization.user.id, { promoCodeId: parsed.data.id });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return internalServerError("super_admin.promo_codes.delete", error);
  }
}
