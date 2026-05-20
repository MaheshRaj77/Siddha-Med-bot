"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { NAV_LINKS, EXPO_OUT } from "@/lib/constants";

function LogoSigil({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Hexagon */}
      <path
        d="M18 2L32 10V26L18 34L4 26V10L18 2Z"
        stroke="var(--gold-primary)"
        strokeWidth="1"
        fill="none"
      />
      {/* Inner leaf vein */}
      <path
        d="M18 8V28M18 14L13 10M18 14L23 10M18 20L13 24M18 20L23 24M18 17L14 17M18 17L22 17"
        stroke="var(--gold-primary)"
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50 h-[72px] flex items-center border-b backdrop-blur-2xl"
      style={{
        background: "rgba(2,2,2,0.85)",
        borderColor: "var(--border-subtle)",
      }}
      aria-label="Main navigation"
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-3 group" aria-label="MedBot home">
          <LogoSigil />
          <div className="flex flex-col">
            <span
              className="text-[10px] font-semibold tracking-[0.3em] uppercase"
              style={{ color: "var(--gold-primary)" }}
            >
              MEDBOT
            </span>
          </div>
        </Link>

        {/* Center: Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[12px] font-normal transition-colors duration-200 hover:underline hover:underline-offset-[6px] hover:decoration-1"
              style={{
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--gold-primary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-secondary)")
              }
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          {/* Status pill */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold tracking-[0.06em]"
            style={{
              background: "rgba(201,168,76,0.06)",
              border: "1px solid var(--gold-dim)",
              borderRadius: "999px",
              color: "var(--gold-primary)",
            }}
          >
            <span
              className="w-[6px] h-[6px] rounded-full animate-pulse-dot"
              style={{ background: "var(--gold-primary)" }}
            />
            LLAMA 3.3 · LIVE
          </div>

          {/* CTA */}
          <Link
            href="/chat"
            className="hidden sm:inline-flex items-center text-[12px] font-semibold tracking-[0.12em] uppercase transition-all duration-250"
            style={{
              border: "1px solid var(--gold-primary)",
              background: "transparent",
              color: "var(--gold-primary)",
              padding: "10px 24px",
              borderRadius: "0px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--gold-primary)";
              e.currentTarget.style.color = "#020202";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--gold-primary)";
            }}
            aria-label="Enter Research Suite"
          >
            Enter Research Suite
          </Link>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            style={{ color: "var(--gold-primary)" }}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: EXPO_OUT as any }}
            className="absolute top-[72px] left-0 w-full border-b md:hidden"
            style={{
              background: "rgba(2,2,2,0.95)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-[13px] font-normal py-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/chat"
                onClick={() => setMobileOpen(false)}
                className="mt-2 text-center text-[12px] font-semibold tracking-[0.12em] uppercase py-3"
                style={{
                  border: "1px solid var(--gold-primary)",
                  color: "var(--gold-primary)",
                }}
              >
                Enter Research Suite
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
