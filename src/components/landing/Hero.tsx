"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { TERMINAL_LINES, EXPO_OUT } from "@/lib/constants";

/* ── Typewriter Terminal ──────────────────────────────────── */
function TypewriterTerminal() {
  const [displayedLines, setDisplayedLines] = useState<
    { text: string; color: string }[]
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lineIdx = 0;
    let charIdx = 0;
    let currentLineText = "";
    let isMounted = true;

    function typeNext() {
      if (!isMounted) return;
      if (lineIdx >= TERMINAL_LINES.length) return;

      const line = TERMINAL_LINES[lineIdx];
      if (charIdx < line.text.length) {
        currentLineText += line.text[charIdx];
        charIdx++;

        setDisplayedLines((prev) => {
          const next = [...prev];
          if (next.length <= lineIdx) {
            next.push({ text: currentLineText, color: line.color });
          } else {
            next[lineIdx] = { text: currentLineText, color: line.color };
          }
          return next;
        });

        setTimeout(typeNext, 25);
      } else {
        // Line complete
        lineIdx++;
        charIdx = 0;
        currentLineText = "";
        setTimeout(typeNext, 350);
      }
    }

    const timer = setTimeout(typeNext, 600);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedLines]);

  const colorMap: Record<string, string> = {
    dim: "var(--text-tertiary)",
    gold: "var(--gold-primary)",
    bright: "var(--text-primary)",
  };

  return (
    <div
      ref={scrollRef}
      className="p-5 font-[family-name:var(--font-jetbrains)] text-[12px] leading-[1.8] overflow-y-auto"
      style={{ height: "calc(100% - 32px)" }}
    >
      {displayedLines.map((line, i) => (
        <div
          key={i}
          style={{
            color: colorMap[line.color] || "var(--text-tertiary)",
            fontWeight: line.color === "bright" ? 600 : 400,
            fontSize: i === TERMINAL_LINES.length - 1 && line.color === "gold" ? "10px" : undefined,
          }}
        >
          {line.text}
          {i === displayedLines.length - 1 && (
            <span
              className="inline-block w-[7px] h-[14px] ml-1 align-middle animate-pulse-dot"
              style={{ background: "var(--gold-primary)" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Stagger config ──────────────────────────────────────── */
const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EXPO_OUT as any },
  },
};

/* ── Hero Component ──────────────────────────────────────── */
export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: "var(--bg-void)" }}
      id="intelligence"
    >
      {/* Ambient halos */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "10%",
          left: "-5%",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: "var(--gold-glow)",
          filter: "blur(200px)",
          opacity: 0.6,
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "-10%",
          right: "-5%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "rgba(201,168,76,0.06)",
          filter: "blur(180px)",
        }}
      />

      {/* Dot grid */}
      <div className="absolute inset-0 dot-grid pointer-events-none" />

      {/* Content */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto w-full max-w-[1280px] px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-6 items-center py-24 lg:py-0"
      >
        {/* ── Left Column ─────────────────────────────────── */}
        <div className="max-w-[640px]">
          {/* Eyebrow */}
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-10">
            <span
              className="block h-[1px] animate-eyebrow-rule"
              style={{ background: "var(--gold-dim)", width: 40 }}
            />
            <span
              className="text-[10px] font-semibold tracking-[0.2em] uppercase"
              style={{ color: "var(--gold-primary)" }}
            >
              SIDDHA · BOTANICAL · RAG ENGINE
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={fadeUp} className="mb-0">
            <span
              className="block font-black tracking-[-0.04em] leading-[0.95]"
              style={{
                fontSize: "clamp(52px, 7vw, 88px)",
                color: "var(--text-primary)",
              }}
            >
              Ancient Wisdom.
            </span>
            <span
              className="block font-black tracking-[-0.04em] leading-[0.95] mt-1"
              style={{
                fontSize: "clamp(52px, 7vw, 88px)",
                WebkitTextStroke: "1px rgba(201,168,76,0.6)",
                color: "transparent",
              }}
            >
              Silicon Precision.
            </span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            variants={fadeUp}
            className="mt-8 max-w-[480px] text-[18px] md:text-[22px] font-light leading-[1.7]"
            style={{ color: "var(--text-secondary)" }}
          >
            MedBot synthesizes Siddha pharmacopoeia at machine speed —
            hybrid retrieval, zero hallucination, built for the clinic.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="mt-12 flex flex-wrap gap-4">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 text-[13px] font-bold tracking-[0.08em] uppercase transition-all duration-250"
              style={{
                background: "var(--gold-primary)",
                color: "#020202",
                padding: "16px 36px",
                borderRadius: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--gold-bright)";
                e.currentTarget.style.boxShadow =
                  "0 0 40px rgba(201,168,76,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--gold-primary)";
                e.currentTarget.style.boxShadow = "none";
              }}
              aria-label="Begin Clinical Search"
            >
              Begin Clinical Search
              <ArrowRight size={15} />
            </Link>
            <a
              href="#architecture"
              className="inline-flex items-center text-[13px] font-bold tracking-[0.08em] uppercase transition-all duration-250"
              style={{
                border: "1px solid var(--border-active)",
                color: "var(--text-secondary)",
                padding: "16px 36px",
                borderRadius: 0,
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--gold-primary)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-active)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              View Architecture
            </a>
          </motion.div>

          {/* Trust micro-copy */}
          <motion.div
            variants={fadeUp}
            className="mt-6 flex flex-wrap gap-6 text-[10px] font-normal tracking-[0.1em]"
            style={{ color: "var(--text-tertiary)" }}
          >
            <span>✦ BSMS Compliant</span>
            <span>✦ 0.00% Hallucination Rate</span>
            <span>✦ 118ms Retrieval</span>
          </motion.div>
        </div>

        {/* ── Right Column: Terminal Card ─────────────────── */}
        <motion.div variants={fadeUp} className="relative flex justify-center lg:justify-end">
          <div className="relative w-full max-w-[560px]">
            {/* Terminal card */}
            <div
              className="relative overflow-hidden"
              style={{
                background: "#0A0A0A",
                border: "1px solid rgba(201,168,76,0.15)",
                borderRadius: 4,
                boxShadow:
                  "0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,168,76,0.05)",
                height: 380,
              }}
            >
              {/* Header bar */}
              <div
                className="flex items-center justify-between px-4"
                style={{
                  height: 32,
                  background: "#0F0F0F",
                  borderBottom: "1px solid rgba(201,168,76,0.08)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-[6px] h-[6px] rounded-full" style={{ background: "#2A2A2A" }} />
                  <span className="w-[6px] h-[6px] rounded-full" style={{ background: "#2A2A2A" }} />
                  <span className="w-[6px] h-[6px] rounded-full" style={{ background: "var(--gold-dim)" }} />
                </div>
                <span
                  className="text-[9px] font-semibold tracking-[0.2em] uppercase"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  MEDBOT · RAG TERMINAL
                </span>
              </div>

              {/* Terminal body */}
              <TypewriterTerminal />
            </div>

            {/* Floating stat chips */}
            <div
              className="absolute animate-float-a hidden sm:block"
              style={{
                bottom: -20,
                left: -20,
                background: "var(--bg-surface)",
                border: "1px solid var(--gold-dim)",
                borderRadius: 2,
                padding: "16px 20px",
                zIndex: 20,
              }}
            >
              <div
                className="text-[24px] font-black"
                style={{ color: "var(--gold-primary)" }}
              >
                0.9845
              </div>
              <div
                className="text-[9px] font-semibold tracking-[0.12em] uppercase mt-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                Cohere Score
              </div>
            </div>

            <div
              className="absolute animate-float-b hidden sm:block"
              style={{
                top: -20,
                right: -20,
                background: "var(--bg-surface)",
                border: "1px solid var(--gold-dim)",
                borderRadius: 2,
                padding: "16px 20px",
                zIndex: 20,
              }}
            >
              <div
                className="text-[24px] font-black"
                style={{ color: "var(--gold-primary)" }}
              >
                118ms
              </div>
              <div
                className="text-[9px] font-semibold tracking-[0.12em] uppercase mt-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                Retrieval Time
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
