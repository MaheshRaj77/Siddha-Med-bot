"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, ExternalLink, Loader2, LockKeyhole, ShieldCheck, Tag } from "lucide-react";
import { formatPrice } from "@/lib/billing/pricing";

type AppliedPromo = {
  code: string;
  description: string;
  discountPercent: number;
};

type CheckoutResponse = {
  checkout?: {
    subscriptionId: string;
    paymentId: string;
    status: string;
    checkoutUrl: string | null;
    amountMinor: number;
    originalAmountMinor?: number;
    discountPercent?: number;
    currency: string;
    razorpayOrderId: string | null;
    razorpayKeyId: string | null;
  };
  error?: string;
};

type RazorpayHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayHandlerResponse) => Promise<void>;
  prefill: { name: string; email: string };
  theme: { color: string };
  modal: { ondismiss: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentHandoff({
  slug,
  billing,
  currency,
  priceMinor,
  isFree,
  checkoutUrl,
}: {
  slug: string;
  billing: "monthly" | "yearly";
  currency: string;
  priceMinor: number;
  isFree: boolean;
  checkoutUrl: string | null;
}) {
  const [promoCode, setPromoCode] = useState("");
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutCreated, setCheckoutCreated] = useState(false);
  const discountedPrice = promo
    ? Math.max(0, Math.round(priceMinor * (100 - promo.discountPercent) / 100))
    : priceMinor;

  const applyPromoCode = async () => {
    setLoading(true);
    setPromoError("");
    try {
      const res = await fetch("/api/pricing/promo-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode, planSlug: slug }),
      });
      const data = await res.json() as { promo?: AppliedPromo; error?: string };
      if (!res.ok) throw new Error(data.error || "Promo code could not be applied");
      if (!data.promo) throw new Error("Promo code could not be applied");
      setPromo(data.promo);
    } catch (error) {
      setPromo(null);
      setPromoError(error instanceof Error ? error.message : "Promo code could not be applied");
    } finally {
      setLoading(false);
    }
  };

  const startCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError("");
    setCheckoutCreated(false);
    try {
      const typedPromoCode = promoCode.trim().toUpperCase();
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planSlug: slug,
          billing,
          promoCode: promo?.code || typedPromoCode || undefined,
        }),
      });
      const data = await res.json() as CheckoutResponse;
      if (!res.ok) throw new Error(data.error || "Unable to start checkout");

      setCheckoutCreated(true);
      const checkout = data.checkout;
      if (!checkout) {
        throw new Error("Checkout response is missing.");
      }

      if (checkout.checkoutUrl) {
        window.location.href = checkout.checkoutUrl;
        return;
      }

      if (checkout.amountMinor === 0 || checkout.status === "ACTIVE") {
        window.location.href = "/chat?payment=success";
        return;
      }

      if (checkout.razorpayOrderId) {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          throw new Error("Failed to load Razorpay SDK. Please check your internet connection.");
        }

        if (!checkout.razorpayKeyId) {
          throw new Error("Razorpay key id is missing on server.");
        }
        const options = {
          key: checkout.razorpayKeyId,
          amount: checkout.amountMinor,
          currency: checkout.currency || "INR",
          name: "Siddha MedBot",
          description: `Subscription to ${slug} (${billing})`,
          order_id: checkout.razorpayOrderId,
          handler: async function (response: RazorpayHandlerResponse) {
            setCheckoutLoading(true);
            try {
              const verifyRes = await fetch("/api/billing/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpaySignature: response.razorpay_signature,
                  paymentId: checkout.paymentId,
                  subscriptionId: checkout.subscriptionId,
                }),
              });
              const verifyData = await verifyRes.json() as { error?: string };
              if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed");

              window.location.href = "/chat?payment=success";
            } catch (error) {
              setCheckoutError(error instanceof Error ? error.message : "Payment verification failed");
              setCheckoutLoading(false);
            }
          },
          prefill: {
            name: "",
            email: "",
          },
          theme: {
            color: "#0B8B73",
          },
          modal: {
            ondismiss: function () {
              setCheckoutLoading(false);
            }
          }
        };

        if (!window.Razorpay) {
          throw new Error("Razorpay SDK did not initialize.");
        }
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        if (!isFree && !checkoutUrl) {
          throw new Error("Razorpay configuration is missing on server.");
        }
      }
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Unable to start checkout");
      setCheckoutLoading(false);
    }
  };

  return (
    <section className="p-8 sm:p-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#0B8B73]">
        <CreditCard className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">Secure payment handoff</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Payment details are entered only on the configured provider page. Siddha MedBot does not collect or store card, bank, or UPI credentials.
      </p>

      {!isFree && (
        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
          <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Promo code</label>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={promoCode} onChange={(event) => setPromoCode(event.target.value.toUpperCase())} className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm font-bold outline-none focus:border-emerald-400" placeholder="Enter promo code" />
            </div>
            <button type="button" disabled={loading || promoCode.length < 2} onClick={applyPromoCode} className="rounded-xl bg-slate-900 px-4 text-xs font-black text-white disabled:opacity-40">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
            </button>
          </div>
          {promo && <p className="mt-2 flex items-center gap-1 text-xs font-bold text-[#0B8B73]"><CheckCircle2 className="h-4 w-4" /> {promo.code}: {promo.discountPercent}% off applied</p>}
          {promoError && <p className="mt-2 text-xs font-bold text-red-500">{promoError}</p>}
        </div>
      )}

      {!isFree && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-4">
          <span className="text-xs font-bold text-slate-500">Total due on provider page</span>
          <span className="text-xl font-black text-slate-900">
            {promo && <span className="mr-2 text-sm text-slate-400 line-through">{formatPrice(priceMinor, currency)}</span>}
            {formatPrice(discountedPrice, currency)}
          </span>
        </div>
      )}

      <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-bold text-slate-600">
        <p className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-[#0B8B73]" /> Subscription request recorded before payment</p>
        <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#0B8B73]" /> No payment credentials stored here</p>
      </div>

      {isFree ? (
        <Link href="/signup" className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0B8B73] px-5 py-4 text-sm font-black text-white">
          Create Free Account <ArrowRight className="h-4 w-4" />
        </Link>
      ) : (
        <button type="button" onClick={startCheckout} disabled={checkoutLoading} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0B8B73] px-5 py-4 text-sm font-black text-white disabled:opacity-60">
          {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : checkoutUrl ? <ExternalLink className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
          {checkoutLoading ? "Starting Checkout" : checkoutUrl ? "Continue to Secure Payment" : "Pay securely with Razorpay"}
        </button>
      )}
      {checkoutCreated && !checkoutUrl && !checkoutError && (
        <p className="mt-3 text-xs font-bold text-[#0B8B73]">Checkout request recorded.</p>
      )}
      {checkoutError && (
        <p className="mt-3 text-xs font-bold text-red-500">{checkoutError}</p>
      )}
    </section>
  );
}
