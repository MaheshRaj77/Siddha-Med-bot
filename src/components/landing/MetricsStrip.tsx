"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { METRICS, EXPO_OUT } from "@/lib/constants";

/* ── Animated Counter ─────────────────────────────────────── */
function AnimatedCounter({
  target,
  inView,
}: {
  target: number;
  inView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1500;
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setCount(current);
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }, [inView, target]);

  return <>{count}</>;
}

/* ── Metrics Strip ────────────────────────────────────────── */
export default function MetricsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <section
      ref={ref}
      className="relative z-10 border-t border-b"
      style={{
        background: "#0A0A0A",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
          {METRICS.map((m, i) => (
            <div
              key={m.label}
              className="relative flex flex-col items-center md:items-start text-center md:text-left px-6 py-8 md:py-0 transition-colors duration-300 group"
              style={{
                borderRight:
                  i < METRICS.length - 1
                    ? "1px solid var(--border-subtle)"
                    : "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--gold-glow)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {/* Value */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.7,
                  delay: i * 0.1,
                  ease: EXPO_OUT as any,
                }}
              >
                <span
                  className="text-[40px] md:text-[56px] font-black leading-none transition-colors duration-300 group-hover:text-[var(--gold-bright)]"
                  style={{ color: "var(--gold-primary)" }}
                >
                  {m.numericTarget !== null ? (
                    <>
                      {m.value.includes("<") && "< "}
                      <AnimatedCounter
                        target={m.numericTarget}
                        inView={inView}
                      />
                      {m.suffix}
                    </>
                  ) : (
                    <>
                      {m.value}
                      {m.suffix}
                    </>
                  )}
                </span>
              </motion.div>

              {/* Label */}
              <div
                className="text-[10px] font-semibold tracking-[0.15em] uppercase mt-2"
                style={{ color: "var(--text-tertiary)" }}
              >
                {m.label}
              </div>

              {/* Description */}
              <div
                className="text-[13px] font-light mt-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                {m.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
