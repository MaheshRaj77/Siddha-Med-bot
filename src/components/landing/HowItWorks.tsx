"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Cpu, Filter, MessageSquare, Quote, Search } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const steps = [
  { icon: MessageSquare, title: "You Ask", desc: "Type a question or upload a document", tone: "text-teal-600 bg-teal-50 border-teal-200", dot: "bg-teal-500" },
  { icon: Search, title: "Retrieve", desc: "AI searches curated Siddha knowledge", tone: "text-violet-600 bg-violet-50 border-violet-200", dot: "bg-violet-500" },
  { icon: Filter, title: "Rerank", desc: "Cohere selects the most relevant passages", tone: "text-orange-600 bg-orange-50 border-orange-200", dot: "bg-orange-500" },
  { icon: Cpu, title: "Generate", desc: "Llama synthesizes an accurate response", tone: "text-blue-600 bg-blue-50 border-blue-200", dot: "bg-blue-500" },
  { icon: Quote, title: "Cite", desc: "Every answer is backed by verified sources", tone: "text-pink-600 bg-pink-50 border-pink-200", dot: "bg-pink-500" },
  { icon: CheckCircle2, title: "Deliver", desc: "A clear, structured, trustworthy answer", tone: "text-emerald-600 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-[#F5FAFF] py-12 sm:py-16 lg:py-20">
      <div className="absolute left-0 top-0 h-72 w-72 -translate-x-1/3 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-64 w-64 translate-x-1/3 rounded-full bg-emerald-100/50 blur-3xl" />
      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease }}
          className="text-center"
        >
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#1F6FFF]">Transparent by design</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-5xl">
            How Siddha MedBot Works
          </h2>
          <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-gradient-to-r from-[#12C48B] to-[#1F6FFF]" />
        </motion.div>

        <div className="relative mt-12 lg:mt-16">
          <div className="absolute left-[7%] right-[7%] top-[53px] hidden h-[2px] bg-gradient-to-r from-[#12C48B] via-[#1F6FFF] to-[#0B8B73] lg:block" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:gap-2">
            {steps.map(({ icon: Icon, title, desc, tone, dot }, index) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.52, delay: index * 0.08, ease }}
                className="relative flex items-center gap-4 rounded-[20px] border border-white bg-white/75 p-4 shadow-[0_12px_26px_rgba(31,111,255,0.07)] backdrop-blur lg:block lg:border-transparent lg:bg-transparent lg:p-0 lg:text-center lg:shadow-none"
              >
                <span className={`absolute -top-3 left-10 z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-white shadow-md lg:left-1/2 lg:-translate-x-1/2 ${dot}`}>
                  {index + 1}
                </span>
                <span className={`flex h-[82px] w-[82px] shrink-0 items-center justify-center rounded-full border-8 border-white shadow-[0_16px_28px_rgba(15,23,42,0.12)] lg:mx-auto lg:h-[104px] lg:w-[104px] ${tone}`}>
                  <Icon className="h-8 w-8 lg:h-10 lg:w-10" />
                </span>
                <span className="block lg:mt-5">
                  <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
                  <p className="mt-1 text-[11px] leading-4 text-slate-600 lg:mx-auto lg:max-w-[150px]">{desc}</p>
                </span>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
