"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Plus, X } from "lucide-react";
import { FAQS, EXPO_OUT } from "@/lib/constants";

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section
      ref={ref}
      className="relative z-10 py-[100px] md:py-[140px]"
      style={{ background: "var(--bg-void)" }}
      id="research"
    >
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="grid grid-cols-1 md:grid-cols-[38%_62%] gap-16">
          {/* ── Left: Sticky Label Block ──────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: EXPO_OUT as any }}
            className="md:sticky md:top-[120px] md:self-start"
          >
            <span
              className="text-[9px] font-semibold tracking-[0.2em] uppercase block"
              style={{ color: "var(--gold-dim)" }}
            >
              FREQUENTLY
            </span>
            <h2
              className="text-[48px] font-extrabold tracking-[-0.02em] mt-2"
              style={{ color: "var(--text-primary)" }}
            >
              Asked
            </h2>

            {/* Decorative rule */}
            <div
              className="w-[1px] h-[80px] my-6"
              style={{ background: "var(--gold-dim)" }}
            />

            <p
              className="text-[13px] font-light leading-[1.8] max-w-[280px]"
              style={{ color: "var(--text-secondary)" }}
            >
              4 core questions about the engine&apos;s architecture.
            </p>
          </motion.div>

          {/* ── Right: Accordion ──────────────────────────── */}
          <div>
            {FAQS.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.5,
                  delay: 0.1 + i * 0.08,
                  ease: EXPO_OUT as any,
                }}
                className="border-b"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <button
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  className="w-full flex items-center gap-4 py-7 text-left group"
                  aria-expanded={openIdx === i}
                  aria-controls={`faq-answer-${i}`}
                >
                  {/* Number */}
                  <span
                    className="text-[11px] font-normal shrink-0 w-6"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  {/* Question */}
                  <span
                    className="flex-1 text-[16px] font-normal"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {faq.q}
                  </span>

                  {/* Toggle icon */}
                  <span
                    className="shrink-0 transition-transform duration-300"
                    style={{
                      color: "var(--gold-primary)",
                      transform: openIdx === i ? "rotate(45deg)" : "rotate(0)",
                    }}
                  >
                    <Plus size={18} />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {openIdx === i && (
                    <motion.div
                      id={`faq-answer-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EXPO_OUT as any }}
                      className="overflow-hidden"
                    >
                      <div
                        className="pb-7 pl-10 pr-4 text-[14px] font-light leading-[1.9]"
                        style={{
                          color: "var(--text-secondary)",
                          borderLeft: "2px solid var(--gold-dim)",
                          marginLeft: 6,
                          paddingLeft: 20,
                        }}
                      >
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
