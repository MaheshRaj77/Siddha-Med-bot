import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/server/db";
import { authorize, enforceSameOrigin, internalServerError, parseJson, uuidSchema } from "@/lib/server/security";
import { fetchRazorpayPayment, getRazorpayConfig, verifyRazorpayCheckoutSignature } from "@/lib/billing/razorpay";

type JsonObject = Record<string, unknown>;

const verifySchema = z.object({
  razorpayPaymentId: z.string().trim().min(5),
  razorpayOrderId: z.string().trim().min(5),
  razorpaySignature: z.string().trim().min(5),
  paymentId: uuidSchema,
  subscriptionId: uuidSchema,
}).strict();

export async function POST(req: NextRequest) {
  try {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const authorization = await authorize();
    if (authorization.response) return authorization.response;

    const parsed = await parseJson(req, verifySchema, 2 * 1024);
    if (parsed.response) return parsed.response;

    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, paymentId, subscriptionId } = parsed.data;

    const razorpayConfig = getRazorpayConfig();
    if (!razorpayConfig.ok) {
      return NextResponse.json({ error: `Razorpay provider is not configured: ${razorpayConfig.reason}` }, { status: 503 });
    }

    if (!verifyRazorpayCheckoutSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
      keySecret: razorpayConfig.keySecret,
    })) {
      return NextResponse.json({ error: "Invalid payment signature verification failed" }, { status: 400 });
    }

    const payment = await prisma.paymentTransaction.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.userId !== authorization.user.id) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    const paymentMetadata = (payment.metadata as JsonObject | null) || {};
    if (paymentMetadata.razorpayOrderId && paymentMetadata.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json({ error: "Payment order does not match the checkout record" }, { status: 400 });
    }

    if (payment.subscriptionId !== subscriptionId) {
      return NextResponse.json({ error: "Payment does not match the subscription record" }, { status: 400 });
    }

    if (payment.status === "PAID") {
      return NextResponse.json({ success: true, message: "Payment already processed" });
    }

    const subscription = await prisma.billingSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription || subscription.userId !== authorization.user.id) {
      return NextResponse.json({ error: "Subscription record not found" }, { status: 404 });
    }

    if (subscription.planSlug !== payment.planSlug || subscription.amountMinor !== payment.amountMinor) {
      return NextResponse.json({ error: "Subscription amount does not match the payment record" }, { status: 400 });
    }

    const providerPayment = await fetchRazorpayPayment({
      keyId: razorpayConfig.keyId,
      keySecret: razorpayConfig.keySecret,
      paymentId: razorpayPaymentId,
    });

    if (
      providerPayment.order_id !== razorpayOrderId
      || providerPayment.amount !== payment.amountMinor
      || providerPayment.currency !== payment.currency
    ) {
      return NextResponse.json({ error: "Razorpay payment details do not match this order" }, { status: 400 });
    }

    if (providerPayment.status !== "captured" || !providerPayment.captured) {
      return NextResponse.json({ error: "Payment is not captured yet. Please retry after the payment is captured." }, { status: 409 });
    }

    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    if (subscription.interval === "YEARLY") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    await prisma.$transaction([
      prisma.paymentTransaction.update({
        where: { id: paymentId },
        data: {
          status: "PAID",
          paidAt: periodStart,
          metadata: {
            ...paymentMetadata,
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature,
            razorpayStatus: providerPayment.status,
            razorpayCaptured: providerPayment.captured,
          },
        },
      }),
      prisma.billingSubscription.update({
        where: { id: subscriptionId },
        data: {
          status: "ACTIVE",
          startsAt: periodStart,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          metadata: {
            ...((subscription.metadata as JsonObject | null) || {}),
            razorpayPaymentId,
          },
        },
      }),
      ...(payment.promoCodeId
        ? [
            prisma.promoCode.update({
              where: { id: payment.promoCodeId },
              data: { usedCount: { increment: 1 } },
            }),
          ]
        : []),
      prisma.user.update({
        where: { id: authorization.user.id },
        data: {
          planSlug: payment.planSlug,
        },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Payment successfully verified and subscription activated" });
  } catch (error: unknown) {
    return internalServerError("billing.razorpay.verify", error, "Payment verification failed");
  }
}
