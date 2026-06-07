import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import LandingLogo from "@/components/landing/LandingLogo";
import PaymentHandoff from "@/components/checkout/PaymentHandoff";
import prisma from "@/lib/server/db";
import { DEFAULT_PRICING_PLANS, formatPrice, normalizePricingPlan } from "@/lib/billing/pricing";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ billing?: string }>;
}) {
  const { slug } = await params;
  const { billing } = await searchParams;
  const storedPlan = await prisma.pricingPlan.findUnique({ where: { slug } });
  const fallbackPlan = DEFAULT_PRICING_PLANS.find((plan) => plan.slug === slug);
  const plan = storedPlan ? normalizePricingPlan(storedPlan) : fallbackPlan;

  if (!plan || !plan.isPublished) notFound();

  const yearly = billing === "yearly";
  const price = yearly ? plan.yearlyPriceMinor : plan.monthlyPriceMinor;
  const safeCheckoutUrl = plan.checkoutUrl?.startsWith("https://") ? plan.checkoutUrl : null;

  return (
    <main className="min-h-screen bg-[#F7FAFC] px-5 py-7 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <LandingLogo />
          <Link href="/#pricing" className="inline-flex items-center gap-2 text-xs font-black text-[#0B8B73]">
            <ArrowLeft className="h-4 w-4" /> Back to pricing
          </Link>
        </div>

        <div className="mt-12 grid overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.1)] lg:grid-cols-[1.05fr_0.95fr]">
          <section className="bg-gradient-to-br from-[#083E52] to-[#0A6E5B] p-8 text-white sm:p-10">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">Order Summary</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.06em]">{plan.name}</h1>
            <p className="mt-3 text-sm leading-7 text-emerald-50/80">{plan.description}</p>
            <div className="mt-8 flex items-end gap-2">
              <span className="text-5xl font-black tracking-[-0.07em]">{formatPrice(price, plan.currency)}</span>
              {!plan.isFree && <span className="pb-1 text-sm font-bold text-emerald-100">/{yearly ? "year" : "month"}</span>}
            </div>
            <ul className="mt-8 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2.5 text-sm text-emerald-50">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  {feature}
                </li>
              ))}
            </ul>
          </section>

          <PaymentHandoff slug={plan.slug} billing={yearly ? "yearly" : "monthly"} currency={plan.currency} priceMinor={price} isFree={plan.isFree} checkoutUrl={safeCheckoutUrl} />
        </div>
      </div>
    </main>
  );
}
