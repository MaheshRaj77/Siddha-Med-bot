"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import LandingLogo from "./LandingLogo";

const links = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Use Cases", href: "#use-cases" },
  { label: "Pricing", href: "#pricing" },
  { label: "About Us", href: "#about" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 16);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <nav
      className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center px-4 sm:px-6 md:px-8 transition-all duration-300"
      aria-label="Main navigation"
    >
      <div
        className={`w-full max-w-6xl rounded-full border transition-all duration-300 flex items-center justify-between px-6 sm:px-8 shadow-md ${
          scrolled
            ? "h-16 border-slate-200/80 bg-white/90 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl"
            : "h-[72px] border-slate-200/40 bg-white/75 backdrop-blur-lg"
        }`}
      >
        <LandingLogo />

        <div className="hidden items-center gap-9 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] font-semibold text-slate-700 transition-colors hover:text-[#0B8B73]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/login"
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-emerald-200 hover:text-[#0B8B73]"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-gradient-to-r from-[#12C48B] to-[#0B8B73] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(11,139,115,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(11,139,115,0.34)]"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-sm sm:hidden"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-6xl mt-2 rounded-[24px] border border-slate-200/80 bg-white/95 px-6 pb-6 pt-3 shadow-xl backdrop-blur-xl sm:hidden"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block border-b border-slate-100 py-3.5 text-sm font-semibold text-slate-700 hover:text-[#0B8B73] transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-gradient-to-r from-[#12C48B] to-[#0B8B73] px-4 py-3 text-center text-sm font-bold text-white shadow-sm"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
