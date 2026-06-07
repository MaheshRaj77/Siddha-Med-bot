"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Leaf, Sparkles } from "lucide-react";

export default function CTASection() {
  return (
    <section className="bg-[#F7FAFC] px-5 pb-12 sm:px-8 sm:pb-16 lg:px-12 lg:pb-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto flex max-w-[1344px] flex-col items-center justify-between gap-8 overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#0A6E5B,#083E52)] px-7 py-10 shadow-[0_26px_60px_rgba(8,62,82,0.22)] sm:px-10 lg:flex-row lg:px-14 lg:py-12"
      >
        <div className="absolute -right-12 -top-16 h-60 w-60 rounded-full border border-white/10" />
        <div className="absolute -right-4 bottom-0 opacity-20">
          <Leaf className="h-44 w-44 rotate-[-24deg] text-emerald-200" />
        </div>
        <div className="absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 rounded-full bg-[#12C48B]/20 blur-3xl" />

        <div className="relative z-10 text-center lg:text-left">
          <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-emerald-200">
            <Sparkles className="h-4 w-4" />
            Begin your research journey
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-white sm:text-5xl">
            Start Your Journey with
            <br />
            Siddha MedBot
          </h2>
          <p className="mt-3 text-sm font-medium text-emerald-50/80">Try it free. No credit card required.</p>
        </div>

        <Link
          href="/signup"
          className="relative z-10 inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#12C48B] to-[#04A970] px-8 py-4 text-sm font-extrabold text-white shadow-[0_0_36px_rgba(18,196,139,0.38)] transition hover:-translate-y-1 hover:shadow-[0_0_52px_rgba(18,196,139,0.54)] sm:w-auto sm:min-w-[230px]"
        >
          Get Started Free <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </section>
  );
}
