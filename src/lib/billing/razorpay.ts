import crypto from "crypto";

type RazorpayConfig =
  | { ok: true; keyId: string; keySecret: string }
  | { ok: false; reason: string };

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt: string | null;
  status: string;
};

export type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  captured: boolean;
};

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";
const KEY_ID_PATTERN = /^rzp_(test|live)_[A-Za-z0-9]+$/;
const MOCK_SECRET_PATTERN = /mock|placeholder|secret_key/i;

export function getRazorpayConfig(): RazorpayConfig {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    return { ok: false, reason: "Razorpay key id or key secret is missing" };
  }

  if (!KEY_ID_PATTERN.test(keyId)) {
    return { ok: false, reason: "Razorpay key id is not valid" };
  }

  if (MOCK_SECRET_PATTERN.test(keySecret)) {
    return { ok: false, reason: "Razorpay key secret is still a mock value" };
  }

  return { ok: true, keyId, keySecret };
}

export function createRazorpayReceipt(paymentId: string) {
  return `rcpt_${paymentId.replace(/-/g, "").slice(0, 30)}`;
}

export function verifyRazorpayCheckoutSignature({
  orderId,
  paymentId,
  signature,
  keySecret,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}) {
  const generatedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const generated = Buffer.from(generatedSignature, "hex");
  const supplied = Buffer.from(signature, "hex");
  return generated.length === supplied.length && crypto.timingSafeEqual(generated, supplied);
}

export async function createRazorpayOrder(params: {
  keyId: string;
  keySecret: string;
  amountMinor: number;
  currency: string;
  receipt: string;
  notes: Record<string, string | number | boolean>;
}) {
  const order = await razorpayFetch<RazorpayOrder>({
    keyId: params.keyId,
    keySecret: params.keySecret,
    path: "/orders",
    init: {
      method: "POST",
      body: JSON.stringify({
        amount: params.amountMinor,
        currency: params.currency,
        receipt: params.receipt,
        partial_payment: false,
        notes: params.notes,
      }),
    },
  });

  if (!order.id?.startsWith("order_")) {
    throw new Error("Razorpay did not return a valid order id");
  }

  return order;
}

export async function fetchRazorpayPayment(params: {
  keyId: string;
  keySecret: string;
  paymentId: string;
}) {
  return razorpayFetch<RazorpayPayment>({
    keyId: params.keyId,
    keySecret: params.keySecret,
    path: `/payments/${encodeURIComponent(params.paymentId)}`,
  });
}

async function razorpayFetch<T>({
  keyId,
  keySecret,
  path,
  init,
}: {
  keyId: string;
  keySecret: string;
  path: string;
  init?: RequestInit;
}) {
  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch(`${RAZORPAY_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader}`,
      ...(init?.headers || {}),
    },
  });

  const text = await response.text();
  const data = parseRazorpayJson(text);

  if (!response.ok) {
    const error = data as { error?: { code?: string; description?: string; field?: string } };
    const description = error.error?.description || `Razorpay API request failed with ${response.status}`;
    throw new Error(description);
  }

  return data as T;
}

function parseRazorpayJson(text: string) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error("Razorpay returned an unreadable response");
  }
}
