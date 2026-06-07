"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { LogoMark } from "@/components/landing/LandingLogo";

export type ProductTheme = "light" | "dark";

export function useProductTheme() {
  const [theme, setTheme] = useState<ProductTheme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("siddha-medbot-theme");
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const timer = window.setTimeout(() => {
      setTheme(stored === "dark" || stored === "light" ? stored : preferred);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const updateTheme = (nextTheme: ProductTheme) => {
    window.localStorage.setItem("siddha-medbot-theme", nextTheme);
    setTheme(nextTheme);
  };

  return { theme, setTheme: updateTheme };
}

export function ProductBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Siddha MedBot home">
      <LogoMark className={compact ? "h-9 w-9" : "h-11 w-11"} />
      <span className="leading-none">
        <span className={`${compact ? "text-lg" : "text-xl"} block font-extrabold tracking-[-0.045em] text-[var(--app-text)]`}>
          Siddha <span className="text-[#0B8B73]">MedBot</span>
        </span>
        <span className="mt-1 block text-[9px] font-semibold tracking-[0.01em] text-[var(--app-muted)]">
          Ancient Wisdom. AI Precision.
        </span>
      </span>
    </Link>
  );
}

export function ThemeToggle({
  theme,
  onChange,
}: {
  theme: ProductTheme;
  onChange: (theme: ProductTheme) => void;
}) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => onChange(isDark ? "light" : "dark")}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-glass)] text-[var(--app-muted)] shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-emerald-400/40 hover:text-[#0B8B73]"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
