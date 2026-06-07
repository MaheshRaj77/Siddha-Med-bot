"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpenCheck, CheckCircle2, FileSearch, ShieldCheck, Sparkles } from "lucide-react";
import { ProductBrand, ThemeToggle, type ProductTheme } from "./ProductTheme";

const benefits = [
  { icon: FileSearch, label: "Source-grounded answers" },
  { icon: BookOpenCheck, label: "Curated Siddha knowledge" },
  { icon: ShieldCheck, label: "Privacy-first workspace" },
];

export default function AuthShell({
  theme,
  onThemeChange,
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  theme: ProductTheme;
  onThemeChange: (theme: ProductTheme) => void;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main data-theme={theme} className="product-theme relative min-h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/10" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-[30rem] w-[30rem] rounded-full bg-blue-300/20 blur-3xl" />

      <header className="relative z-10 px-5 py-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1344px] items-center justify-between">
          <ProductBrand />
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden rounded-xl px-3 py-2 text-xs font-bold text-[var(--app-muted)] transition hover:bg-[var(--app-glass)] hover:text-[#0B8B73] sm:block"
            >
              Back to home
            </Link>
            <ThemeToggle theme={theme} onChange={onThemeChange} />
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-82px)] max-w-[1344px] items-center gap-10 px-5 pb-10 pt-4 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:pb-16">
        <section className="hidden max-w-xl lg:block">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0B8B73]">
            <Sparkles className="h-3.5 w-3.5" />
            Clinical knowledge workspace
          </span>
          <h2 className="mt-6 text-[62px] font-black leading-[0.98] tracking-[-0.07em] text-[var(--app-text)]">
            Trusted Siddha
            <br />
            research, <span className="text-[#0B8B73]">ready when you are.</span>
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-[var(--app-muted)]">
            Move from question to evidence with an assistant designed around curated knowledge, visible citations, and a medical safety mindset.
          </p>
          <div className="mt-8 grid max-w-lg gap-3">
            {benefits.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-glass)] px-4 py-3 text-sm font-bold text-[var(--app-text)] shadow-sm backdrop-blur-xl"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/12 text-[#0B8B73]">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
                <CheckCircle2 className="ml-auto h-4 w-4 text-[#12C48B]" />
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[500px] rounded-[28px] border border-[var(--app-border)] bg-[var(--app-panel)] p-5 shadow-[0_28px_80px_rgba(7,26,53,0.14)] backdrop-blur-2xl sm:p-8">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0B8B73]">{eyebrow}</span>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--app-text)] sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">{description}</p>
          <div className="mt-7">{children}</div>
          <div className="mt-7 border-t border-[var(--app-border)] pt-5 text-center text-xs text-[var(--app-muted)]">
            {footer}
          </div>
        </section>
      </div>
    </main>
  );
}
