import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/server/db";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { mergePricingPlans, normalizePricingPlan } from "@/lib/billing/pricing";
import {
  auditSecurityEvent,
  authorize,
  enforceSameOrigin,
  internalServerError,
  parseJson,
} from "@/lib/server/security";

const httpsUrl = z.union([
  z.literal(""),
  z.string().url().refine((value) => value.startsWith("https://"), "Use an HTTPS checkout URL"),
]);

const pricingPlanSchema = z.object({
  slug: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(240),
  currency: z.enum(["INR", "USD"]),
  monthlyPriceMinor: z.number().int().min(0).max(100_000_000),
  yearlyPriceMinor: z.number().int().min(0).max(1_000_000_000),
  dailyQueryLimit: z.number().int().min(0).max(1_000_000),
  monthlyQueryLimit: z.number().int().min(0).max(10_000_000),
  maxFileUploads: z.number().int().min(0).max(100_000),
  features: z.array(z.string().trim().min(2).max(160)).min(1).max(12),
  checkoutUrl: httpsUrl.nullable(),
  isFree: z.boolean(),
  isPopular: z.boolean(),
  isPublished: z.boolean(),
  displayOrder: z.number().int().min(0).max(100),
}).strict();

export async function GET() {
  try {
    const authorization = await authorize(["SUPER_ADMIN"]);
    if (authorization.response) return authorization.response;

    const rateLimitError = await enforceRateLimit("privileged", authorization.user.id);
    if (rateLimitError) return rateLimitError;

    const plans = await prisma.pricingPlan.findMany({
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json({
      plans: mergePricingPlans(plans),
    });
  } catch (error: unknown) {
    return internalServerError("super_admin.pricing.list", error);
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

    const parsed = await parseJson(req, pricingPlanSchema);
    if (parsed.response) return parsed.response;

    const plan = await prisma.pricingPlan.upsert({
      where: { slug: parsed.data.slug },
      update: {
        ...parsed.data,
        checkoutUrl: parsed.data.checkoutUrl || null,
      },
      create: {
        ...parsed.data,
        checkoutUrl: parsed.data.checkoutUrl || null,
      },
    });

    auditSecurityEvent("super_admin.pricing_plan.update", authorization.user.id, {
      slug: plan.slug,
    });

    return NextResponse.json({ success: true, plan: normalizePricingPlan(plan) });
  } catch (error: unknown) {
    return internalServerError("super_admin.pricing.update", error);
  }
}
