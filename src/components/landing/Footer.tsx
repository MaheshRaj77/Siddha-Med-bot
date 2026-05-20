"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer
      className="relative z-10 border-t"
      style={{
        background: "var(--bg-void)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="mx-auto max-w-[1280px] px-6 pt-20 pb-12">
        {/* Top row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <svg
              width="40"
              height="40"
              viewBox="0 0 36 36"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M18 2L32 10V26L18 34L4 26V10L18 2Z"
                stroke="var(--gold-primary)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M18 8V28M18 14L13 10M18 14L23 10M18 20L13 24M18 20L23 24"
                stroke="var(--gold-primary)"
                strokeWidth="0.6"
                strokeLinecap="round"
                opacity="0.7"
              />
            </svg>
            <span
              className="text-[12px] font-semibold tracking-[0.25em] uppercase"
              style={{ color: "var(--gold-primary)" }}
            >
              MEDBOT
            </span>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-6">
            {["Documentation", "Architecture", "Contact"].map((item) => (
              <a
                key={item}
                href="#"
                className="text-[12px] font-light transition-colors duration-200"
                style={{ color: "var(--text-tertiary)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--gold-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-tertiary)")
                }
              >
                {item}
              </a>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div
          className="my-10 h-[1px]"
          style={{ background: "var(--border-subtle)" }}
        />

        {/* Bottom row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p
            className="text-[10px] font-normal tracking-[0.04em]"
            style={{ color: "var(--text-tertiary)" }}
          >
            © 2026 Siddha Medical RAG Engine. All rights reserved.
          </p>
          <p
            className="text-[10px] font-normal tracking-[0.04em] italic"
            style={{ color: "var(--text-tertiary)" }}
          >
            Precision-engineered for the clinic.
          </p>
        </div>
      </div>
    </footer>
  );
}
