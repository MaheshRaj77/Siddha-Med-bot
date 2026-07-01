import { NextResponse } from "next/server";
import prisma from "@/lib/server/db";
import { DEFAULT_PRICING_PLANS, mergePricingPlans } from "@/lib/billing/pricing";
import { internalServerError } from "@/lib/server/security";

export async function GET() {
  try {
    const plans = await prisma.pricingPlan.findMany({
      orderBy: { displayOrder: "asc" },
    }).catch((error: unknown) => {
      console.warn("PricingPlan table is unavailable; using default pricing plans.", error);
      return [];
    });

    return NextResponse.json({
      plans: (plans.length > 0 ? mergePricingPlans(plans) : DEFAULT_PRICING_PLANS)
        .filter((plan) => plan.isPublished)
        .map(toPublicPlan),
    });
  } catch (error: unknown) {
    return internalServerError("pricing.list", error, "Unable to load pricing plans");
  }
}

function toPublicPlan(plan: ReturnType<typeof mergePricingPlans>[number]) {
  return {
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    currency: plan.currency,
    monthlyPriceMinor: plan.monthlyPriceMinor,
    yearlyPriceMinor: plan.yearlyPriceMinor,
    monthlyTokenLimit: plan.monthlyTokenLimit,
    dailyQueryLimit: plan.dailyQueryLimit,
    monthlyQueryLimit: plan.monthlyQueryLimit,
    features: plan.features,
    checkoutUrl: plan.checkoutUrl,
    isFree: plan.isFree,
    isPopular: plan.isPopular,
    isPublished: plan.isPublished,
    displayOrder: plan.displayOrder,
  };
}
