"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Lock } from "lucide-react";
import {
  CITATION_CARDS,
  TELEMETRY_LOGS,
  PIPELINE_NODES,
  EXPO_OUT,
} from "@/lib/constants";

const MOTION_EASE: [number, number, number, number] = [...EXPO_OUT];

/* ── Tab definitions ──────────────────────────────────────── */
const TABS = [
  { id: "clinical", label: "01 · CLINICAL REPORT" },
  { id: "telemetry", label: "02 · SYSTEM TELEMETRY" },
  { id: "pipeline", label: "03 · PIPELINE TOPOLOGY" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ── Score bar ────────────────────────────────────────────── */
function ScoreBar({ score }: { score: number }) {
  return (
    <div className="w-full h-[3px] mt-2" style={{ background: "var(--bg-void)" }}>
      <div
        className="h-full transition-all duration-700"
        style={{
          width: `${score}%`,
          background: "var(--gold-primary)",
        }}
      />
    </div>
  );
}

/* ── Circular progress ring ───────────────────────────────── */
function CircleProgress({ value }: { value: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="mx-auto">
      <circle cx="24" cy="24" r={r} fill="none" stroke="var(--bg-void)" strokeWidth="2" />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke="var(--gold-primary)"
        strokeWidth="2"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
        className="transition-all duration-1000"
      />
      <text
        x="24"
        y="26"
        textAnchor="middle"
        fill="var(--gold-primary)"
        fontSize="10"
        fontWeight="700"
      >
        {value}%
      </text>
    </svg>
  );
}

/* ── Live log terminal ────────────────────────────────────── */
function LiveLogTerminal() {
  const [logs, setLogs] = useState<string[]>([...TELEMETRY_LOGS]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      setLogs((prev) => {
        const next = [...prev, TELEMETRY_LOGS[idx % TELEMETRY_LOGS.length]];
        idx++;
        return next.slice(-20);
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      ref={scrollRef}
      className="font-[family-name:var(--font-jetbrains)] text-[11px] leading-[1.9] overflow-y-auto p-4"
      style={{
        background: "#030303",
        height: 140,
        borderRadius: 2,
        border: "1px solid var(--border-subtle)",
      }}
    >
      {logs.map((line, i) => (
        <div
          key={i}
          style={{
            color: line.includes("success") || line.includes("SAFE") || line.includes("score")
              ? "var(--gold-primary)"
              : "var(--text-tertiary)",
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

/* ── Sparkline SVG ────────────────────────────────────────── */
function Sparkline() {
  return (
    <svg width="80" height="24" viewBox="0 0 80 24" fill="none" className="mt-2 mx-auto">
      <polyline
        points="0,18 10,16 20,14 30,12 40,10 50,8 60,6 70,5 80,4"
        stroke="var(--gold-primary)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── Horizontal Score Bar ─────────────────────────────────── */
function HorizontalBar({ value }: { value: number }) {
  return (
    <div className="w-full h-[4px] mt-2 rounded-sm" style={{ background: "var(--bg-void)" }}>
      <div
        className="h-full rounded-sm transition-all duration-700"
        style={{ width: `${value}%`, background: "var(--gold-primary)" }}
      />
    </div>
  );
}

/* ── Tab 1: Clinical Report ───────────────────────────────── */
function ClinicalReport() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[55%_45%] gap-6 p-6">
      {/* Left */}
      <div className="space-y-5">
        {/* Query */}
        <div
          className="text-[14px] font-light p-5"
          style={{
            background: "var(--bg-surface)",
            borderLeft: "3px solid var(--gold-primary)",
            color: "var(--text-primary)",
          }}
        >
          What are the therapeutic benefits of Tulsi for lung ailments?
        </div>

        {/* Disclaimer */}
        <div
          className="text-[10px] font-normal p-3 flex items-start gap-2"
          style={{
            background: "rgba(201,168,76,0.04)",
            borderLeft: "2px solid var(--gold-dim)",
            color: "var(--gold-dim)",
          }}
        >
          For registered BSMS practitioners only.
        </div>

        {/* Clinical Impression */}
        <div
          className="p-5"
          style={{ borderLeft: "2px solid var(--gold-primary)" }}
        >
          <h4
            className="text-[11px] font-semibold tracking-[0.12em] uppercase mb-2"
            style={{ color: "var(--gold-primary)" }}
          >
            Clinical Impression
          </h4>
          <p
            className="text-[13px] font-light leading-[1.8]"
            style={{ color: "var(--text-secondary)" }}
          >
            Tulsi (Ocimum tenuiflorum) exhibits robust bronchial
            vasodilation and anti-inflammatory properties, making it
            highly effective for respiratory illnesses including bronchitis,
            congestion, and asthma.
          </p>
        </div>

        {/* Botanical Prescription */}
        <div
          className="p-5"
          style={{ borderLeft: "2px solid var(--gold-dim)" }}
        >
          <h4
            className="text-[11px] font-semibold tracking-[0.12em] uppercase mb-2"
            style={{ color: "var(--gold-primary)" }}
          >
            Botanical Prescription
          </h4>
          <p
            className="text-[13px] font-light leading-[1.8]"
            style={{ color: "var(--text-secondary)" }}
          >
            Tulsi leaves formulated into a decoction (Kudineer) with
            ginger and pepper, taken twice daily, clears Kapham (bronchial
            phlegm) and stimulates native pulmonary immunity.
          </p>
        </div>
      </div>

      {/* Right: Citation panel */}
      <div className="space-y-4">
        <h4
          className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-3"
          style={{ color: "var(--text-tertiary)" }}
        >
          SOURCE CITATIONS
        </h4>
        {CITATION_CARDS.map((cite) => (
          <div
            key={cite.rank}
            className="p-4 transition-all duration-300"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 2,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--gold-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div
                  className="text-[12px] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {cite.name}
                </div>
                <div
                  className="text-[10px] mt-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {cite.ref}
                </div>
              </div>
              <span
                className="text-[9px] font-bold tracking-[0.1em] px-2 py-1"
                style={{
                  background: "var(--gold-glow)",
                  color: "var(--gold-primary)",
                  border: "1px solid var(--gold-dim)",
                  borderRadius: 2,
                }}
              >
                RANK #{cite.rank}
              </span>
            </div>
            <ScoreBar score={cite.score} />
            <div
              className="text-[9px] mt-1.5 text-right"
              style={{ color: "var(--text-tertiary)" }}
            >
              {cite.score}% relevance
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tab 2: Telemetry ─────────────────────────────────────── */
function Telemetry() {
  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Retrieval Latency */}
        <div
          className="p-5 transition-all duration-300"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 2,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--gold-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
        >
          <span className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: "var(--text-tertiary)" }}>
            Retrieval Latency
          </span>
          <div className="mt-2">
            <span className="text-[28px] font-black" style={{ color: "var(--gold-primary)" }}>118</span>
            <span className="text-[13px] font-light ml-1" style={{ color: "var(--text-tertiary)" }}>ms</span>
          </div>
          <Sparkline />
        </div>

        {/* Cohere Score */}
        <div
          className="p-5 transition-all duration-300"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 2,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--gold-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
        >
          <span className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: "var(--text-tertiary)" }}>
            Cohere Score
          </span>
          <div className="text-[28px] font-black mt-2" style={{ color: "var(--gold-primary)" }}>0.9845</div>
          <HorizontalBar value={98} />
        </div>

        {/* Hallucination Rate */}
        <div
          className="p-5 transition-all duration-300"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 2,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--gold-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
        >
          <span className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: "var(--text-tertiary)" }}>
            Hallucination Rate
          </span>
          <div className="text-[28px] font-black mt-2" style={{ color: "var(--gold-primary)" }}>0.00%</div>
        </div>

        {/* RRF Overlap */}
        <div
          className="p-5 transition-all duration-300"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 2,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--gold-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
        >
          <span className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: "var(--text-tertiary)" }}>
            RRF Overlap
          </span>
          <div className="mt-2">
            <CircleProgress value={100} />
          </div>
        </div>

        {/* Queue Workers */}
        <div
          className="p-5 transition-all duration-300"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 2,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--gold-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
        >
          <span className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: "var(--text-tertiary)" }}>
            Queue Workers
          </span>
          <div className="text-[20px] font-black mt-2" style={{ color: "var(--text-primary)" }}>4 ACTIVE</div>
          <div className="flex gap-2 mt-2">
            {[0, 1, 2, 3].map((j) => (
              <span key={j} className="w-[6px] h-[6px] rounded-full animate-pulse-dot" style={{ background: "#4ade80", animationDelay: `${j * 0.3}s` }} />
            ))}
          </div>
        </div>

        {/* Concurrency */}
        <div
          className="p-5 transition-all duration-300"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 2,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--gold-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
        >
          <span className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: "var(--text-tertiary)" }}>
            Concurrency
          </span>
          <div className="flex items-center gap-2 mt-3">
            <Lock size={16} style={{ color: "var(--gold-primary)" }} />
            <span className="text-[20px] font-black" style={{ color: "var(--text-primary)" }}>SAFE</span>
          </div>
        </div>
      </div>

      {/* Live log */}
      <LiveLogTerminal />
    </div>
  );
}

/* ── Tab 3: Pipeline ──────────────────────────────────────── */
function PipelineTopology() {
  return (
    <div className="p-6 md:p-10 overflow-x-auto">
      {/* Horizontal flow */}
      <div className="flex items-center justify-center gap-0 min-w-[700px]">
        {PIPELINE_NODES.map((node, i) => (
          <div key={node.id} className="flex items-center">
            {/* Node */}
            <div
              className="flex flex-col items-center px-4 py-3 min-w-[120px] text-center transition-all duration-300"
              style={{
                background: node.active ? "var(--gold-glow)" : "var(--bg-surface)",
                border: `1px solid ${node.active ? "var(--gold-primary)" : "var(--gold-dim)"}`,
                borderRadius: 2,
              }}
            >
              <span
                className="text-[11px] font-semibold tracking-[0.1em]"
                style={{
                  color: node.active ? "var(--gold-primary)" : "var(--text-secondary)",
                }}
              >
                {node.label}
              </span>
              <span
                className="text-[9px] mt-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                {node.desc}
              </span>
            </div>

            {/* Connector */}
            {i < PIPELINE_NODES.length - 1 && (
              <svg width="48" height="2" className="mx-1 shrink-0">
                <line
                  x1="0"
                  y1="1"
                  x2="48"
                  y2="1"
                  stroke="var(--gold-dim)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="animate-dash-flow"
                />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Interactive Mockup ──────────────────────────────── */
export default function InteractiveMockup() {
  const [activeTab, setActiveTab] = useState<TabId>("clinical");
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section
      ref={ref}
      className="relative z-10 py-[100px] md:py-[140px]"
      style={{ background: "var(--bg-void)" }}
      id="diagnostics"
    >
      <div className="mx-auto max-w-[1280px] px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: MOTION_EASE }}
          className="text-center mb-16"
        >
          <span
            className="text-[10px] font-semibold tracking-[0.2em] uppercase"
            style={{ color: "var(--gold-primary)" }}
          >
            LIVE SYSTEM PREVIEW
          </span>
          <h2
            className="text-[36px] md:text-[52px] font-extrabold tracking-[-0.03em] mt-3"
            style={{ color: "var(--text-primary)" }}
          >
            The Engine, Exposed.
          </h2>
          <p
            className="text-[16px] font-light mt-3 max-w-lg mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            Inspect every layer of the retrieval pipeline in real time.
          </p>
        </motion.div>

        {/* Panel */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.15, ease: MOTION_EASE }}
          className="overflow-hidden"
          style={{
            background: "#080808",
            border: "1px solid var(--border-subtle)",
            borderRadius: 4,
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          {/* Tab row */}
          <div className="flex border-b" style={{ borderColor: "var(--border-subtle)" }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 py-4 text-[12px] md:text-[13px] font-normal tracking-[0.04em] transition-all duration-200 border-b-2"
                style={{
                  color:
                    activeTab === tab.id
                      ? "var(--gold-primary)"
                      : "var(--text-tertiary)",
                  borderBottomColor:
                    activeTab === tab.id
                      ? "var(--gold-primary)"
                      : "transparent",
                  background:
                    activeTab === tab.id
                      ? "rgba(201,168,76,0.04)"
                      : "transparent",
                }}
                aria-label={tab.label}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: MOTION_EASE }}
            >
              {activeTab === "clinical" && <ClinicalReport />}
              {activeTab === "telemetry" && <Telemetry />}
              {activeTab === "pipeline" && <PipelineTopology />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
