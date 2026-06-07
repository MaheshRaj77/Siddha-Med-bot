import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/server/db";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { enforceSameOrigin, getClientIp, internalServerError, parseJson } from "@/lib/server/security";
import { findPricingPlan } from "@/lib/billing/pricing";

const promoSchema = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()),
  planSlug: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/),
}).strict();

export async function POST(req: NextRequest) {
  try {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const rateLimitError = await enforceRateLimit("chat", getClientIp(req));
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJson(req, promoSchema, 4 * 1024);
    if (parsed.response) return parsed.response;

    const [promoCode, storedPlans] = await Promise.all([
      prisma.promoCode.findUnique({ where: { code: parsed.data.code } }),
      prisma.pricingPlan.findMany(),
    ]);
    const plan = findPricingPlan(storedPlans, parsed.data.planSlug);
    const applicablePlanSlugs = Array.isArray(promoCode?.applicablePlanSlugs)
      ? promoCode.applicablePlanSlugs.filter((slug): slug is string => typeof slug === "string")
      : [];
    const expired = promoCode?.expiresAt && promoCode.expiresAt.getTime() < Date.now();
    const exhausted = promoCode?.maxUses !== null
      && promoCode?.maxUses !== undefined
      && promoCode.usedCount >= promoCode.maxUses;

    if (
      !promoCode
      || !promoCode.isActive
      || expired
      || exhausted
      || (applicablePlanSlugs.length > 0 && !applicablePlanSlugs.includes(plan.slug))
    ) {
      return NextResponse.json({ error: "Promo code is invalid or unavailable for this plan" }, { status: 400 });
    }

    return NextResponse.json({
      promo: {
        code: promoCode.code,
        description: promoCode.description,
        discountPercent: promoCode.discountPercent,
      },
    });
  } catch (error: unknown) {
    return internalServerError("pricing.promo_code", error, "Unable to validate promo code");
  }
}
