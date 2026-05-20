"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { EXPO_OUT } from "@/lib/constants";

/* ── Botanical Leaf SVG ───────────────────────────────────── */
function LeafMotif() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      className="animate-spin-slow mx-auto mb-8"
      aria-hidden="true"
    >
      <path
        d="M32 4C32 4 48 16 48 32C48 48 32 60 32 60C32 60 16 48 16 32C16 16 32 4 32 4Z"
        stroke="var(--gold-dim)"
        strokeWidth="0.8"
        fill="none"
      />
      {/* Center vein */}
      <line x1="32" y1="10" x2="32" y2="54" stroke="var(--gold-dim)" strokeWidth="0.5" />
      {/* Side veins */}
      <line x1="32" y1="20" x2="24" y2="16" stroke="var(--gold-dim)" strokeWidth="0.4" />
      <line x1="32" y1="20" x2="40" y2="16" stroke="var(--gold-dim)" strokeWidth="0.4" />
      <line x1="32" y1="30" x2="22" y2="28" stroke="var(--gold-dim)" strokeWidth="0.4" />
      <line x1="32" y1="30" x2="42" y2="28" stroke="var(--gold-dim)" strokeWidth="0.4" />
      <line x1="32" y1="40" x2="24" y2="42" stroke="var(--gold-dim)" strokeWidth="0.4" />
      <line x1="32" y1="40" x2="40" y2="42" stroke="var(--gold-dim)" strokeWidth="0.4" />
    </svg>
  );
}

export default function CTASection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section
      ref={ref}
      className="relative z-10 py-[100px] md:py-[140px] overflow-hidden"
      style={{ background: "var(--bg-void)" }}
    >
      {/* Massive ambient halo */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: "var(--gold-glow)",
          filter: "blur(200px)",
          opacity: 0.4,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: EXPO_OUT as any }}
        className="relative z-10 mx-auto max-w-[720px] px-6 text-center"
      >
        <LeafMotif />

        {/* Eyebrow */}
        <span
          className="text-[9px] font-semibold tracking-[0.25em] uppercase block mb-6"
          style={{ color: "var(--gold-primary)" }}
        >
          BEGIN YOUR RESEARCH SESSION
        </span>

        {/* Heading */}
        <h2 className="mb-8">
          <span
            className="block text-[36px] md:text-[48px] font-black tracking-[-0.04em] leading-[1.05]"
            style={{ color: "var(--text-primary)" }}
          >
            The synthesis of ancient
          </span>
          <span
            className="block text-[36px] md:text-[48px] font-black tracking-[-0.04em] leading-[1.05]"
            style={{
              WebkitTextStroke: "1px rgba(201,168,76,0.6)",
              color: "transparent",
            }}
          >
            medicine starts here.
          </span>
        </h2>

        {/* Body */}
        <p
          className="text-[14px] font-light leading-[1.8] max-w-[520px] mx-auto"
          style={{ color: "var(--text-secondary)" }}
        >
          MedBot ingests your documents, reranks your retrieval, and delivers
          verified clinical synthesis — all in under 120ms.
        </p>

        {/* CTA Button */}
        <motion.div className="mt-12" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
          <Link
            href="/chat"
            className="inline-flex items-center gap-3 text-[14px] font-bold tracking-[0.1em] uppercase transition-all duration-250"
            style={{
              background: "var(--gold-primary)",
              color: "#020202",
              padding: "20px 56px",
              borderRadius: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--gold-bright)";
              e.currentTarget.style.boxShadow =
                "0 0 60px rgba(201,168,76,0.4), 0 0 120px rgba(201,168,76,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--gold-primary)";
              e.currentTarget.style.boxShadow = "none";
            }}
            aria-label="Enter Dashboard Workspace"
          >
            Enter Dashboard Workspace
            <ArrowRight size={16} />
          </Link>
        </motion.div>

        {/* Below button text */}
        <p
          className="mt-6 text-[10px] font-normal tracking-[0.06em]"
          style={{ color: "var(--text-tertiary)" }}
        >
          No setup required · Instant document ingestion · BSMS clinical compliant
        </p>
      </motion.div>
    </section>
  );
}
