"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import {
  DEFAULT_PRICING_PLANS,
  formatPrice,
  type PublicPricingPlan,
} from "@/lib/billing/pricing";

export default function PricingSection() {
  const [plans, setPlans] = useState<PublicPricingPlan[]>(DEFAULT_PRICING_PLANS);
  const [yearly, setYearly] = useState(false);

  useEffect(() => {
    void fetch("/api/pricing")
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data.plans) && data.plans.length > 0) setPlans(data.plans);
      })
      .catch(() => undefined);
  }, []);

  return (
    <section id="pricing" className="bg-[#F7FAFC] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-[1344px]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#0B8B73]">Simple Pricing</p>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.055em] text-slate-900 sm:text-5xl">
            Choose the research workspace that fits your practice
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Start free, then expand your Siddha research capacity when you need more room.
          </p>
          <div className="mt-7 inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <BillingButton active={!yearly} onClick={() => setYearly(false)}>Monthly</BillingButton>
            <BillingButton active={yearly} onClick={() => setYearly(true)}>Yearly</BillingButton>
          </div>
        </div>

        <div className="mt-11 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {plans.map((plan, index) => {
            const price = yearly ? plan.yearlyPriceMinor : plan.monthlyPriceMinor;
            return (
              <motion.article
                key={plan.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className={`relative flex flex-col rounded-[28px] border bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.07)] ${
                  plan.isPopular ? "border-emerald-300 ring-4 ring-emerald-100/80" : "border-slate-200"
                }`}
              >
                {plan.isPopular && (
                  <span className="absolute right-5 top-5 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#0B8B73]">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-black text-slate-900">{plan.name}</h3>
                <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">{plan.description}</p>
                <div className="mt-6 flex items-end gap-2">
                  <span className="text-4xl font-black tracking-[-0.06em] text-slate-900">{formatPrice(price, plan.currency)}</span>
                  {!plan.isFree && <span className="pb-1 text-xs font-bold text-slate-500">/{yearly ? "year" : "month"}</span>}
                </div>
                <div className="mt-6 grid gap-2 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-700">
                  <span>{plan.monthlyTokenLimit.toLocaleString("en-IN")} monthly tokens</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 text-sm leading-6 text-slate-600">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-[#0B8B73]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.isFree ? "/signup" : `/checkout/${plan.slug}?billing=${yearly ? "yearly" : "monthly"}`}
                  className={`mt-7 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-extrabold transition hover:-translate-y-0.5 ${
                    plan.isPopular
                      ? "bg-gradient-to-r from-[#12C48B] to-[#0B8B73] text-white shadow-[0_12px_26px_rgba(11,139,115,0.24)]"
                      : "border border-slate-200 bg-white text-slate-800 hover:border-emerald-300"
                  }`}
                >
                  {plan.isFree ? "Start Free" : "Choose Plan"} <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.article>
            );
          })}
        </div>

        <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-[#0B8B73]" />
          Access covers the existing curated knowledge base only. Medical use remains subject to practitioner review.
        </p>
      </div>
    </section>
  );
}

function BillingButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-5 py-2 text-xs font-black transition ${active ? "bg-[#0B8B73] text-white" : "text-slate-600"}`}
    >
      {children}
    </button>
  );
}
