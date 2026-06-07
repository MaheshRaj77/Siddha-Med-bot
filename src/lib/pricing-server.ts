import "server-only";
import prisma from "@/lib/db";
import { findPricingPlan } from "@/lib/pricing";

export async function resolveUserPlan(planSlug: string) {
  const storedPlans = await prisma.pricingPlan.findMany().catch((error: unknown) => {
    console.warn("PricingPlan table is unavailable; using default pricing plans.", error);
    return [];
  });
  return findPricingPlan(storedPlans, planSlug);
}
