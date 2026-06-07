"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Check,
  FileCheck2,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import heroChatgpt from "../../../public/hero-chatgpt.png";

const ease = [0.16, 1, 0.3, 1] as const;

const pills = [
  { icon: FileCheck2, label: "Accurate Citations", tone: "text-blue-600 bg-blue-50" },
  { icon: Sparkles, label: "Evidence Based", tone: "text-violet-600 bg-violet-50" },
  { icon: ShieldCheck, label: "Secure & Private", tone: "text-teal-600 bg-cyan-50" },
];

function ChatWidget({ className }: { className?: string }) {
  return (
    <motion.div
      animate={{ y: [0, -7, 0] }}
      transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
      className={`relative overflow-hidden rounded-[24px] border border-white/65 bg-white/[0.16] p-3.5 shadow-[0_22px_65px_rgba(10,74,130,0.2),inset_0_1px_0_rgba(255,255,255,0.88),inset_0_-1px_0_rgba(255,255,255,0.22)] backdrop-blur-[16px] backdrop-saturate-[1.35] sm:p-4 ${className || ""}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.52)_0%,rgba(255,255,255,0.08)_48%,rgba(103,232,249,0.08)_100%)]" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-white/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-12 h-36 w-44 rounded-full bg-cyan-100/18 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

      <div className="relative flex items-center justify-between border-b border-white/45 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/[0.24] text-[#0B8B73] shadow-sm backdrop-blur">
            <Bot className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-[12px] font-extrabold text-slate-900">Siddha MedBot</span>
            <span className="flex items-center gap-1 text-[9px] font-bold text-[#0B8B73]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#12C48B]" />
              Online
            </span>
          </span>
        </div>
        <Sparkles className="h-4 w-4 text-[#1F6FFF]" />
      </div>

      <div className="relative space-y-2.5 py-2.5">
        <div className="flex justify-end gap-2">
          <div className="max-w-[84%] rounded-xl rounded-tr-sm border border-white/45 bg-white/[0.18] px-2.5 py-2 text-[9px] font-semibold leading-3.5 text-slate-800 shadow-sm backdrop-blur-md sm:text-[10px]">
            What are the Siddha treatments for Vatha Pitha imbalance with joint pain?
          </div>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/50 bg-white/[0.22] shadow-sm backdrop-blur">
            <User className="h-3 w-3 text-orange-600" />
          </span>
        </div>

        <div className="rounded-xl border border-white/60 bg-white/[0.22] p-2.5 shadow-[0_8px_24px_rgba(15,78,130,0.08),inset_0_1px_0_rgba(255,255,255,0.62)] backdrop-blur-lg">
          <p className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-900">
            <ShieldCheck className="h-3.5 w-3.5 text-[#0B8B73]" />
            Based on 15 trusted sources
          </p>
          <p className="mt-1.5 text-[9px] font-semibold text-slate-600">
            Recommended Siddha treatments include:
          </p>
          <ul className="mt-1.5 space-y-1 text-[9px] font-semibold text-slate-700">
            {["Kaba Suranam", "Thirikadugu Chooranam", "Muppu preparations", "External therapies: Pizhichil, Thailam"].map((item) => (
              <li key={item} className="flex items-center gap-1">
                <Check className="h-3 w-3 shrink-0 text-[#0B8B73]" />
                {item}
              </li>
            ))}
          </ul>
          <button className="mt-2 rounded-md border border-white/50 bg-white/[0.18] px-2 py-1 text-[9px] font-bold text-slate-700 shadow-sm backdrop-blur">
            View Sources (15) ›
          </button>
        </div>
      </div>

      <div className="relative flex items-center gap-2 rounded-full border border-white/60 bg-white/[0.16] px-3 py-2 text-[9px] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.66)] backdrop-blur-lg">
        <span className="flex-1">Ask any Siddha medical question...</span>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0B8B73] text-white">
          <Send className="h-3 w-3" />
        </span>
      </div>
    </motion.div>
  );
}

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#EDF6FF]">
      <Image
        src={heroChatgpt}
        alt=""
        fill
        priority
        sizes="100vw"
        className="hidden object-cover object-center lg:block"
      />
      <div className="absolute inset-y-0 left-0 hidden w-[57%] bg-gradient-to-r from-white/96 via-white/82 to-transparent lg:block" />
      <div className="absolute inset-y-0 left-0 hidden w-[42%] bg-[radial-gradient(circle_at_20%_45%,rgba(255,255,255,0.94),transparent_72%)] lg:block" />

      <div className="relative mx-auto max-w-[1440px] px-5 pt-28 pb-10 sm:px-8 sm:pt-32 sm:pb-12 lg:min-h-[650px] lg:px-12 lg:pt-36 lg:pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease }}
          className="relative z-10 max-w-[470px] lg:pt-7"
        >
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/85 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#0B8B73] shadow-sm backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#12C48B] shadow-[0_0_0_4px_rgba(18,196,139,0.15)]" />
            Curated Siddha Intelligence
          </span>

          <h1 className="text-[50px] font-black leading-[0.98] tracking-[-0.065em] text-slate-950 sm:text-[62px] lg:text-[66px]">
            Trusted Siddha
            <br />
            Knowledge.
            <br />
            <span className="bg-gradient-to-r from-[#0B8B73] to-[#12C48B] bg-clip-text text-transparent">
              In Seconds.
            </span>
          </h1>

          <p className="mt-5 max-w-[410px] text-[15px] leading-6 text-slate-700 sm:text-[16px]">
            AI-powered medical assistant that delivers accurate, source-grounded
            answers from curated Siddha knowledge.
          </p>

          <div className="mt-5 flex max-w-[430px] flex-wrap gap-2">
            {pills.map(({ icon: Icon, label, tone }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 + index * 0.07, duration: 0.45 }}
                className="flex items-center gap-2 rounded-xl border border-white bg-white/85 px-3 py-2 text-[10px] font-bold text-slate-800 shadow-[0_8px_22px_rgba(15,23,42,0.08)] backdrop-blur"
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${tone}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {label}
              </motion.div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#12C48B] to-[#0B8B73] px-6 py-3.5 text-[13px] font-bold text-white shadow-[0_13px_26px_rgba(11,139,115,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_17px_32px_rgba(11,139,115,0.34)]"
            >
              Try MedBot Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#demo"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3.5 text-[13px] font-bold text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:border-emerald-200"
            >
              Book a Demo
            </Link>
          </div>

          <p className="mt-5 text-[11px] font-semibold text-slate-600">
            Built for <span className="text-slate-950">Siddha Practitioners</span>
            <span className="mx-1.5 text-[#0B8B73]">•</span>
            <span className="text-slate-950">Students</span>
            <span className="mx-1.5 text-[#0B8B73]">•</span>
            <span className="text-slate-950">Researchers</span>
          </p>
        </motion.div>

        <div className="absolute right-[3.5%] top-1/2 z-10 hidden w-[365px] -translate-y-1/2 lg:block xl:right-[5%]">
          <ChatWidget />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.16, ease }}
          className="relative mt-8 h-[495px] overflow-hidden rounded-[26px] border border-white/70 shadow-[0_24px_60px_rgba(15,78,130,0.2)] lg:hidden"
        >
          <Image
            src={heroChatgpt}
            alt="Siddha doctor using an AI tablet beside a holographic anatomy display and traditional herbs"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 0vw"
            className="object-cover object-[57%_center]"
          />
          <ChatWidget className="absolute inset-x-3 bottom-3" />
        </motion.div>
      </div>
    </section>
  );
}
