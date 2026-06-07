"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { FEATURES, EXPO_OUT } from "@/lib/constants";

const MOTION_EASE: [number, number, number, number] = [...EXPO_OUT];

/* ── Custom SVG icons ─────────────────────────────────────── */
function InferenceIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* Circuit board traces */}
      <rect x="8" y="8" width="32" height="32" rx="1" stroke="var(--gold-primary)" strokeWidth="0.8" />
      <line x1="14" y1="8" x2="14" y2="16" stroke="var(--gold-primary)" strokeWidth="0.6" />
      <line x1="24" y1="8" x2="24" y2="12" stroke="var(--gold-primary)" strokeWidth="0.6" />
      <line x1="34" y1="8" x2="34" y2="16" stroke="var(--gold-primary)" strokeWidth="0.6" />
      <line x1="14" y1="40" x2="14" y2="32" stroke="var(--gold-primary)" strokeWidth="0.6" />
      <line x1="24" y1="40" x2="24" y2="36" stroke="var(--gold-primary)" strokeWidth="0.6" />
      <line x1="34" y1="40" x2="34" y2="32" stroke="var(--gold-primary)" strokeWidth="0.6" />
      <rect x="18" y="18" width="12" height="12" rx="1" stroke="var(--gold-primary)" strokeWidth="0.8" />
      <line x1="8" y1="20" x2="18" y2="20" stroke="var(--gold-primary)" strokeWidth="0.6" />
      <line x1="8" y1="28" x2="18" y2="28" stroke="var(--gold-primary)" strokeWidth="0.6" />
      <line x1="30" y1="20" x2="40" y2="20" stroke="var(--gold-primary)" strokeWidth="0.6" />
      <line x1="30" y1="28" x2="40" y2="28" stroke="var(--gold-primary)" strokeWidth="0.6" />
    </svg>
  );
}

function RetrievalIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* Two overlapping hexagons */}
      <path
        d="M18 8L28 13V23L18 28L8 23V13L18 8Z"
        stroke="var(--gold-primary)"
        strokeWidth="0.8"
        fill="none"
      />
      <path
        d="M30 20L40 25V35L30 40L20 35V25L30 20Z"
        stroke="var(--gold-primary)"
        strokeWidth="0.8"
        fill="none"
      />
      {/* Overlap connector */}
      <line x1="22" y1="22" x2="26" y2="26" stroke="var(--gold-primary)" strokeWidth="0.6" strokeDasharray="2 2" />
    </svg>
  );
}

function VerificationIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* Shield outline */}
      <path
        d="M24 4L40 12V24C40 34 33 42 24 44C15 42 8 34 8 24V12L24 4Z"
        stroke="var(--gold-primary)"
        strokeWidth="0.8"
        fill="none"
      />
      {/* Checkmark cutout */}
      <polyline
        points="16,24 22,30 32,18"
        stroke="var(--gold-primary)"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ICONS = [<InferenceIcon key="inf" />, <RetrievalIcon key="ret" />, <VerificationIcon key="ver" />];

/* ── Feature Card ─────────────────────────────────────────── */
function FeatureCard({
  feature,
  icon,
  index,
}: {
  feature: (typeof FEATURES)[number];
  icon: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 0.7,
        delay: index * 0.1,
        ease: MOTION_EASE,
      }}
      className="relative overflow-hidden group flex flex-col transition-all duration-300"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid rgba(201,168,76,0.07)",
        borderRadius: 2,
        padding: "48px 40px",
        height: 400,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(201,168,76,0.25)";
        e.currentTarget.style.background = "#0F0F0F";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(201,168,76,0.07)";
        e.currentTarget.style.background = "var(--bg-surface)";
      }}
    >
      {/* Gold halo on hover */}
      <div
        className="absolute top-0 left-0 w-[200px] h-[200px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: "radial-gradient(circle, var(--gold-glow) 0%, transparent 70%)",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Icon */}
      <div className="relative z-10 mb-6 transition-transform duration-300 group-hover:scale-105 group-hover:opacity-80">
        {icon}
      </div>

      {/* Tag */}
      <span
        className="text-[9px] font-semibold tracking-[0.15em] uppercase"
        style={{ color: "var(--gold-dim)" }}
      >
        {feature.number} · {feature.tag}
      </span>

      {/* Title */}
      <h3
        className="text-[24px] font-bold mt-5 tracking-[-0.01em]"
        style={{ color: "var(--text-primary)" }}
      >
        {feature.title}
      </h3>

      {/* Description */}
      <p
        className="text-[13px] font-light leading-[1.8] mt-3 flex-1"
        style={{ color: "var(--text-secondary)" }}
      >
        {feature.description}
      </p>

      {/* Explore link */}
      <span
        className="text-[11px] font-semibold tracking-[0.06em] transition-all duration-300 group-hover:tracking-[0.16em]"
        style={{ color: "var(--text-tertiary)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold-primary)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
      >
        Explore →
      </span>
    </motion.div>
  );
}

/* ── Feature Cards Section ────────────────────────────────── */
export default function FeatureCards() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section
      ref={ref}
      className="relative z-10 py-[100px] md:py-[140px]"
      style={{ background: "var(--bg-void)" }}
      id="architecture"
    >
      <div className="mx-auto max-w-[1280px] px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: MOTION_EASE }}
          className="text-center mb-20"
        >
          <span
            className="text-[10px] font-semibold tracking-[0.2em] uppercase"
            style={{ color: "var(--gold-primary)" }}
          >
            PRECISION ARCHITECTURE
          </span>
          <h2
            className="text-[36px] md:text-[52px] font-extrabold tracking-[-0.03em] mt-3"
            style={{ color: "var(--text-primary)" }}
          >
            Every layer engineered.
          </h2>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <FeatureCard
              key={feature.number}
              feature={feature}
              icon={ICONS[i]}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
