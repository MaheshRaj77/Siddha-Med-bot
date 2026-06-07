import prisma from "@/lib/server/db";

export function getCreditPeriodStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export async function getMonthlyCreditAdjustment(userId: string, date = new Date()) {
  const periodStart = getCreditPeriodStart(date);
  const result = await prisma.creditAdjustment.aggregate({
    where: { userId, periodStart },
    _sum: { amount: true },
  }).catch((error: unknown) => {
    console.warn("CreditAdjustment table is unavailable; continuing without manual credits.", error);
    return { _sum: { amount: 0 } };
  });

  return result._sum.amount || 0;
}
