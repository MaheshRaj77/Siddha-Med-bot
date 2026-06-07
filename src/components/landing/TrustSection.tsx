"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  Building2,
  Check,
  GraduationCap,
  Microscope,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import siddhaHerbs from "../../../public/siddha_herbs.png";

const ease = [0.16, 1, 0.3, 1] as const;

const benefits = [
  { icon: UserCircle, title: "Siddha Practitioners", desc: "Save hours of research time", tone: "text-emerald-600 bg-emerald-50" },
  { icon: GraduationCap, title: "Medical Students", desc: "Learn faster with trusted sources", tone: "text-violet-600 bg-violet-50" },
  { icon: Microscope, title: "Researchers", desc: "Explore literature & ancient texts", tone: "text-[#1F6FFF] bg-blue-50" },
  { icon: Building2, title: "Institutions", desc: "Enable knowledge at scale", tone: "text-orange-600 bg-orange-50" },
];

const trustPoints = [
  { title: "Curated Siddha Corpus", desc: "Books, journals, theses & clinical documents" },
  { title: "Citation for Every Answer", desc: "Always shows the source" },
  { title: "Privacy & Data Security", desc: "Your data is encrypted & never shared" },
  { title: "Built with Medical Safety in Mind", desc: "AI assistant, not a replacement" },
];

export default function TrustSection() {
  return (
    <section id="use-cases" className="relative overflow-hidden bg-white py-12 sm:py-16 lg:py-20">
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#EFF8FF] to-transparent" />
      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="grid items-center gap-7 lg:grid-cols-[260px_1fr_300px]">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.65, ease }}
          >
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#0B8B73]">Designed around people</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">Who Benefits?</h2>
            <div className="mt-6 space-y-3">
              {benefits.map(({ icon: Icon, title, desc, tone }) => (
                <div key={title} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/90 p-3 shadow-[0_9px_22px_rgba(15,23,42,0.06)]">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-xs font-extrabold text-slate-900">{title}</span>
                    <span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{desc}</span>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, ease }}
            className="relative"
          >
            <div className="absolute inset-8 rounded-full bg-[#12C48B]/20 blur-3xl" />
            <div className="relative aspect-[1.6/1] min-h-[300px] overflow-hidden rounded-[32px] border border-white bg-white shadow-[0_28px_70px_rgba(15,78,130,0.17)]">
              <Image
                src={siddhaHerbs}
                alt="Traditional Siddha medicine mortar, herbs, flowers, and manuscript"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-slate-950/20 to-transparent" />
            </div>
            <div className="pointer-events-none absolute -bottom-6 left-1/2 hidden w-[92%] -translate-x-1/2 grid-cols-4 gap-2 sm:grid">
              {[
                ["10K+", "Curated Documents"],
                ["25K+", "Medical Queries"],
                ["500+", "Trusted Users"],
                ["98%", "Source-backed Answers"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-white bg-white/90 px-3 py-3 text-center shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur">
                  <span className="block text-xl font-black tracking-[-0.04em] text-slate-950">{value}</span>
                  <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.65, ease }}
            className="lg:pl-2"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#0B8B73]">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-slate-950">
              Why Trust Siddha MedBot?
            </h2>
            <div className="mt-6 space-y-5">
              {trustPoints.map(({ title, desc }) => (
                <div key={title} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0B8B73] text-white shadow-[0_6px_12px_rgba(11,139,115,0.2)]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>
                    <span className="block text-xs font-extrabold text-slate-900">{title}</span>
                    <span className="mt-1 block text-[10px] leading-4 text-slate-500">{desc}</span>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:hidden">
          {[
            ["10K+", "Curated Documents"],
            ["25K+", "Medical Queries"],
            ["500+", "Trusted Users"],
            ["98%", "Source-backed Answers"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-slate-100 bg-white px-3 py-4 text-center shadow-sm">
              <span className="block text-2xl font-black tracking-[-0.04em] text-slate-950">{value}</span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
