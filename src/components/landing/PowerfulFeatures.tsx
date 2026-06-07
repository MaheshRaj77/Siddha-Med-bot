"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Check,
  ClipboardCheck,
  MessageSquare,
  Search,
  SearchCheck,
} from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

function ChatPreview() {
  return (
    <div className="relative mt-6 h-28 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 p-3">
      <div className="ml-auto h-5 w-24 rounded-lg rounded-tr-sm bg-[#1F6FFF]/15" />
      <div className="mt-2 w-4/5 rounded-xl bg-white p-2 shadow-sm">
        <div className="h-1.5 w-3/4 rounded-full bg-emerald-200" />
        <div className="mt-1.5 h-1.5 w-5/6 rounded-full bg-slate-100" />
        <div className="mt-1.5 h-1.5 w-2/3 rounded-full bg-slate-100" />
      </div>
      <span className="absolute bottom-2 right-2 rounded-full bg-[#0B8B73] px-2 py-1 text-[9px] font-bold text-white">
        15 sources
      </span>
    </div>
  );
}

function KnowledgePreview() {
  return (
    <div className="relative mt-6 flex h-28 items-end justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 pb-3">
      <div className="absolute bottom-5 left-7 h-16 w-12 -rotate-12 rounded-lg border border-white bg-white p-2 shadow-md">
        <span className="text-[9px] font-black text-[#0B8B73]">SRC</span>
      </div>
      <div className="absolute bottom-4 right-7 h-[70px] w-12 rotate-12 rounded-lg border border-white bg-white p-2 shadow-md">
        <span className="text-[9px] font-black text-[#1F6FFF]">KB</span>
      </div>
      <span className="relative flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-[#1F6FFF] text-white shadow-lg">
        <SearchCheck className="h-5 w-5" />
      </span>
    </div>
  );
}

function ChecklistPreview() {
  return (
    <div className="mt-6 grid h-28 grid-cols-[1fr_52px] gap-2 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 p-3">
      <div className="space-y-2">
        {[72, 88, 62, 78].map((width) => (
          <div key={width} className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[#0B8B73] shadow-sm">
              <Check className="h-2.5 w-2.5" />
            </span>
            <span className="h-2 rounded-full bg-white shadow-sm" style={{ width: `${width}%` }} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center rounded-xl border border-orange-100 bg-white/70">
        <ClipboardCheck className="h-7 w-7 text-orange-500" />
      </div>
    </div>
  );
}

function SearchPreview() {
  return (
    <div className="mt-6 h-28 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 p-3">
      <div className="flex items-center gap-1.5 rounded-full bg-white px-2 py-1.5 text-[8px] text-slate-400 shadow-sm">
        <Search className="h-3 w-3 text-[#1F6FFF]" /> Search Siddha knowledge...
      </div>
      <div className="mt-2 space-y-1.5">
        {["Siddha Maruthuvam", "Gunapadam", "Materia Medica"].map((item, index) => (
          <div key={item} className="flex items-center gap-2 rounded-lg bg-white/80 px-2 py-1 text-[8px] font-bold text-slate-600 shadow-sm">
            <span className={`h-2 w-2 rounded-full ${index === 0 ? "bg-[#1F6FFF]" : index === 1 ? "bg-[#0B8B73]" : "bg-violet-500"}`} />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsPreview() {
  return (
    <div className="mt-6 h-28 rounded-2xl bg-gradient-to-br from-pink-50 to-violet-50 p-3">
      <div className="flex items-end justify-between">
        <span>
          <span className="block text-[8px] font-bold text-slate-400">Total Queries</span>
          <span className="block text-base font-black text-slate-900">2,458</span>
        </span>
        <span className="text-[9px] font-bold text-[#0B8B73]">+32%</span>
      </div>
      <svg viewBox="0 0 180 42" className="mt-2 h-10 w-full" fill="none" aria-hidden="true">
        <path d="M0 32 19 27 38 36 57 14 76 24 95 9 114 23 133 17 152 5 180 10" stroke="#1F6FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M0 32 19 27 38 36 57 14 76 24 95 9 114 23 133 17 152 5 180 10V42H0Z" fill="url(#chart-fill)" opacity=".24" />
        <defs>
          <linearGradient id="chart-fill" x1="90" y1="0" x2="90" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1F6FFF" />
            <stop offset="1" stopColor="#1F6FFF" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

const features = [
  { icon: MessageSquare, title: "Smart RAG Chat", desc: "Get accurate, citation-backed answers from curated Siddha knowledge.", tone: "text-[#0B8B73] bg-emerald-50", preview: <ChatPreview /> },
  { icon: SearchCheck, title: "Curated Knowledge Search", desc: "Ask from the existing Siddha resources indexed inside the product, with source-grounded retrieval.", tone: "text-violet-600 bg-violet-50", preview: <KnowledgePreview /> },
  { icon: ClipboardCheck, title: "Diagnostic Checklists", desc: "Structured follow-up questions and clinical guidance for better decisions.", tone: "text-orange-600 bg-orange-50", preview: <ChecklistPreview /> },
  { icon: Search, title: "Advanced Search", desc: "Semantic search across thousands of Siddha texts, journals, and theses.", tone: "text-[#1F6FFF] bg-blue-50", preview: <SearchPreview /> },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Track credit usage, top questions, knowledge gaps, and user engagement.", tone: "text-pink-600 bg-pink-50", preview: <AnalyticsPreview /> },
];

export default function PowerfulFeatures() {
  return (
    <section id="features" className="relative bg-white py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.65, ease }}
          className="mb-10 text-center"
        >
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#0B8B73]">Built for clinical discovery</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-5xl">
            Powerful Features
          </h2>
          <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-gradient-to-r from-[#12C48B] via-[#1F6FFF] to-violet-500" />
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {features.map(({ icon: Icon, title, desc, tone, preview }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55, delay: index * 0.08, ease }}
              whileHover={{ y: -8 }}
              className="group overflow-hidden rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.07)] transition-shadow hover:shadow-[0_20px_44px_rgba(15,23,42,0.12)] sm:p-5"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-[18px] font-extrabold tracking-[-0.03em] text-slate-950">{title}</h3>
              <p className="mt-2 text-[13px] leading-5 text-slate-600">{desc}</p>
              {preview}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
