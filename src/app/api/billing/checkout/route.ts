import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/server/db";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import {
  auditSecurityEvent,
  authorize,
  enforceSameOrigin,
  internalServerError,
  parseJson,
} from "@/lib/server/security";
import {
  findPricingPlan,
} from "@/lib/billing/pricing";
import { createRazorpayOrder, createRazorpayReceipt, getRazorpayConfig } from "@/lib/billing/razorpay";

type JsonObject = Record<string, unknown>;

const checkoutSchema = z.object({
  planSlug: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/),
  billing: z.enum(["monthly", "yearly"]).default("monthly"),
  promoCode: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/).optional(),
}).strict();

export async function POST(req: NextRequest) {
  try {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const authorization = await authorize();
    if (authorization.response) return authorization.response;

    const rateLimitError = await enforceRateLimit("privileged", authorization.user.id);
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJson(req, checkoutSchema, 4 * 1024);
    if (parsed.response) return parsed.response;

    const billingInterval = parsed.data.billing === "yearly" ? "YEARLY" : "MONTHLY";
    const promoCodeText = parsed.data.promoCode?.toUpperCase();
    const [storedPlans, promoCode] = await Promise.all([
      prisma.pricingPlan.findMany(),
      promoCodeText ? prisma.promoCode.findUnique({ where: { code: promoCodeText } }) : null,
    ]);

    const plan = findPricingPlan(storedPlans, parsed.data.planSlug);
    if (!plan.isPublished) {
      return NextResponse.json({ error: "This plan is not available" }, { status: 404 });
    }

    const applicablePlanSlugs = Array.isArray(promoCode?.applicablePlanSlugs)
      ? promoCode.applicablePlanSlugs.filter((slug): slug is string => typeof slug === "string")
      : [];
    const promoExpired = promoCode?.expiresAt && promoCode.expiresAt.getTime() < Date.now();
    const promoExhausted = promoCode?.maxUses !== null
      && promoCode?.maxUses !== undefined
      && promoCode.usedCount >= promoCode.maxUses;
    const validPromo = promoCode
      && promoCode.isActive
      && !promoExpired
      && !promoExhausted
      && (applicablePlanSlugs.length === 0 || applicablePlanSlugs.includes(plan.slug));

    if (promoCodeText && !validPromo) {
      return NextResponse.json({ error: "Promo code is invalid or unavailable for this plan" }, { status: 400 });
    }

    const originalAmountMinor = billingInterval === "YEARLY" ? plan.yearlyPriceMinor : plan.monthlyPriceMinor;
    const discountPercent = validPromo ? promoCode.discountPercent : 0;
    const amountMinor = Math.max(0, Math.round(originalAmountMinor * (100 - discountPercent) / 100));
    const providerCheckoutUrl = plan.checkoutUrl?.startsWith("https://")
      ? buildProviderUrl(plan.checkoutUrl, {
          planSlug: plan.slug,
          billing: parsed.data.billing,
          promoCode: validPromo ? promoCode.code : undefined,
          amountMinor,
          monthlyCredits: plan.monthlyQueryLimit,
          dailyCredits: plan.dailyQueryLimit,
        })
      : null;
    const useRazorpay = amountMinor > 0 && !providerCheckoutUrl;
    const razorpayConfig = useRazorpay ? getRazorpayConfig() : null;
    if (razorpayConfig && !razorpayConfig.ok) {
      return NextResponse.json({ error: `Razorpay provider is not configured: ${razorpayConfig.reason}` }, { status: 503 });
    }
    const paymentProvider = providerCheckoutUrl ? "external" : useRazorpay ? "razorpay" : "manual";

    const result = await prisma.$transaction(async (tx) => {
      const pricingPlanData = {
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        currency: plan.currency,
        monthlyPriceMinor: plan.monthlyPriceMinor,
        yearlyPriceMinor: plan.yearlyPriceMinor,
        dailyQueryLimit: plan.dailyQueryLimit,
        monthlyQueryLimit: plan.monthlyQueryLimit,
        maxFileUploads: plan.maxFileUploads,
        features: plan.features,
        checkoutUrl: plan.checkoutUrl,
        isFree: plan.isFree,
        isPopular: plan.isPopular,
        isPublished: plan.isPublished,
        displayOrder: plan.displayOrder,
      };

      await tx.pricingPlan.upsert({
        where: { slug: plan.slug },
        update: pricingPlanData,
        create: pricingPlanData,
      });

      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      if (billingInterval === "YEARLY") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const subscription = await tx.billingSubscription.create({
        data: {
          userId: authorization.user.id,
          planSlug: plan.slug,
          status: plan.isFree || amountMinor === 0 ? "ACTIVE" : "PENDING",
          interval: billingInterval,
          currency: plan.currency,
          amountMinor,
          discountPercent,
          promoCodeId: validPromo ? promoCode.id : null,
          provider: paymentProvider,
          providerCheckoutUrl,
          startsAt: plan.isFree || amountMinor === 0 ? periodStart : null,
          currentPeriodStart: plan.isFree || amountMinor === 0 ? periodStart : null,
          currentPeriodEnd: plan.isFree || amountMinor === 0 ? periodEnd : null,
          metadata: {
            closedKnowledgeBase: true,
            creditBased: true,
            dailyCredits: plan.dailyQueryLimit,
            monthlyCredits: plan.monthlyQueryLimit,
            creditCostPerChat: 1,
            originalAmountMinor,
          },
        },
      });

      const payment = await tx.paymentTransaction.create({
        data: {
          userId: authorization.user.id,
          subscriptionId: subscription.id,
          planSlug: plan.slug,
          promoCodeId: validPromo ? promoCode.id : null,
          status: plan.isFree || amountMinor === 0 ? "PAID" : "PENDING",
          interval: billingInterval,
          currency: plan.currency,
          amountMinor,
          originalAmountMinor,
          discountPercent,
          provider: paymentProvider,
          checkoutUrl: providerCheckoutUrl,
          paidAt: plan.isFree || amountMinor === 0 ? periodStart : null,
          metadata: {
            checkoutCreatedFrom: "web",
          },
        },
      });

      if (plan.isFree || amountMinor === 0) {
        if (validPromo) {
          await tx.promoCode.update({
            where: { id: promoCode.id },
            data: { usedCount: { increment: 1 } },
          });
        }

        await tx.user.update({
          where: { id: authorization.user.id },
          data: { planSlug: plan.slug },
        });
      }

      return { subscription, payment };
    });

    let razorpayOrderId: string | null = null;
    let razorpayKeyId: string | null = null;

    if (useRazorpay && razorpayConfig?.ok) {
      try {
        const orderData = await createRazorpayOrder({
          keyId: razorpayConfig.keyId,
          keySecret: razorpayConfig.keySecret,
          amountMinor,
          currency: plan.currency || "INR",
          receipt: createRazorpayReceipt(result.payment.id),
          notes: {
            userId: authorization.user.id,
            planSlug: plan.slug,
            billingInterval,
            subscriptionId: result.subscription.id,
            paymentId: result.payment.id,
          },
        });
        razorpayOrderId = orderData.id;
        razorpayKeyId = razorpayConfig.keyId;

        await prisma.paymentTransaction.update({
          where: { id: result.payment.id },
          data: {
            metadata: {
              ...((result.payment.metadata as JsonObject | null) || {}),
              razorpayOrderId,
              razorpayReceipt: orderData.receipt,
            },
          },
        });
      } catch (error) {
        console.error("Razorpay order creation failed:", error);
        await prisma.$transaction([
          prisma.paymentTransaction.update({
            where: { id: result.payment.id },
            data: {
              status: "FAILED",
              metadata: {
                ...((result.payment.metadata as JsonObject | null) || {}),
                razorpayOrderError: error instanceof Error ? error.message : "Unable to create Razorpay order",
              },
            },
          }),
          prisma.billingSubscription.update({
            where: { id: result.subscription.id },
            data: { status: "CANCELED" },
          }),
        ]);
        return NextResponse.json({ error: "Unable to create Razorpay order. Check Razorpay keys and retry." }, { status: 502 });
      }
    }

    auditSecurityEvent("billing.checkout.create", authorization.user.id, {
      planSlug: plan.slug,
      billing: parsed.data.billing,
      paymentId: result.payment.id,
      subscriptionId: result.subscription.id,
      razorpayOrderId,
    });

    return NextResponse.json({
      checkout: {
        subscriptionId: result.subscription.id,
        paymentId: result.payment.id,
        status: result.subscription.status,
        checkoutUrl: providerCheckoutUrl,
        amountMinor,
        originalAmountMinor,
        discountPercent,
        currency: plan.currency,
        razorpayOrderId,
        razorpayKeyId,
        promo: validPromo ? {
          code: promoCode.code,
          discountPercent: promoCode.discountPercent,
        } : null,
        credits: {
          daily: plan.dailyQueryLimit,
          monthly: plan.monthlyQueryLimit,
          costPerChat: 1,
        },
      },
    });
  } catch (error: unknown) {
    return internalServerError("billing.checkout", error, "Unable to start checkout");
  }
}

function buildProviderUrl(
  checkoutUrl: string,
  params: { planSlug: string; billing: string; promoCode?: string; amountMinor: number; monthlyCredits: number; dailyCredits: number }
) {
  const url = new URL(checkoutUrl);
  url.searchParams.set("plan", params.planSlug);
  url.searchParams.set("billing", params.billing);
  url.searchParams.set("amount", String(params.amountMinor));
  url.searchParams.set("monthly_credits", String(params.monthlyCredits));
  url.searchParams.set("daily_credits", String(params.dailyCredits));
  if (params.promoCode) url.searchParams.set("promo_code", params.promoCode);
  return url.toString();
}
