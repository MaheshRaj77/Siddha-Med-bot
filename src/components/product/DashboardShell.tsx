"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, LogOut, RefreshCw } from "lucide-react";
import { ProductBrand, ThemeToggle, useProductTheme } from "@/components/product/ProductTheme";

export interface DashboardNavItem<T extends string> {
  id: T;
  label: string;
  description: string;
  icon: ReactNode;
  count?: number;
}

export function DashboardShell<T extends string>({
  role,
  title,
  description,
  eyebrow,
  email,
  navItems,
  activeTab,
  onTabChange,
  onRefresh,
  refreshing = false,
  onLogout,
  accent = "teal",
  enableThemeToggle = false,
  children,
}: {
  role: string;
  title: string;
  description: string;
  eyebrow: string;
  email?: string;
  navItems: DashboardNavItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  onRefresh: () => void;
  refreshing?: boolean;
  onLogout?: () => void;
  accent?: "teal" | "gold";
  enableThemeToggle?: boolean;
  children: ReactNode;
}) {
  const { theme, setTheme } = useProductTheme();
  const activeItem = navItems.find((item) => item.id === activeTab) ?? navItems[0];
  const isGold = accent === "gold";
  const activeClasses = isGold
    ? "dashboard-nav-active-gold"
    : "dashboard-nav-active-teal";
  const iconClasses = isGold
    ? "dashboard-icon-gold"
    : "dashboard-icon-teal";

  return (
    <div className="dashboard-theme product-theme min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]" data-theme={enableThemeToggle ? theme : "dark"}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="landing-grid absolute inset-0 opacity-30" />
        <div className={`absolute -left-40 -top-48 h-[32rem] w-[32rem] rounded-full blur-3xl ${isGold ? "bg-amber-500/10" : "bg-emerald-500/10"}`} />
        <div className="absolute -bottom-64 right-0 h-[30rem] w-[30rem] rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="relative min-h-screen lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="hidden min-h-screen flex-col border-r border-[var(--app-border)] bg-[var(--app-sidebar)] px-4 py-5 backdrop-blur-2xl lg:flex">
          <ProductBrand compact />

          <div className="mt-8 rounded-2xl border border-[var(--app-border)] bg-[var(--app-glass)] p-4">
            <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${isGold ? "text-amber-300" : "text-emerald-300"}`}>
              {eyebrow}
            </p>
            <p className="mt-2 text-sm font-bold text-[var(--app-text)]">{role}</p>
            {email && <p className="mt-1 truncate text-[11px] text-[var(--app-muted)]">{email}</p>}
          </div>

          <nav className="mt-6 flex-1 space-y-1.5" aria-label={`${role} navigation`}>
            {navItems.map((item) => {
              const isActive = item.id === activeTab;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    isActive
                      ? activeClasses
                      : "border-transparent text-[var(--app-muted)] hover:border-[var(--app-border)] hover:bg-[var(--app-glass)] hover:text-[var(--app-text)]"
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold">{item.label}</span>
                    <span className="mt-0.5 block truncate text-[10px] opacity-65">{item.description}</span>
                  </span>
                  {typeof item.count === "number" && item.count > 0 && (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold">{item.count}</span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="space-y-2 border-t border-[var(--app-border)] pt-4">
            <Link
              href="/chat"
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-[var(--app-muted)] transition hover:bg-[var(--app-glass)] hover:text-[var(--app-text)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Chat
            </Link>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="dashboard-logout flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            )}
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 border-b border-[var(--app-border)] bg-[var(--app-sidebar)]/90 backdrop-blur-2xl">
            <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2 lg:hidden">
                  <ProductBrand compact />
                </div>
                <p className={`hidden text-[10px] font-bold uppercase tracking-[0.18em] lg:block ${isGold ? "text-amber-300" : "text-emerald-300"}`}>
                  {eyebrow} / {activeItem.label}
                </p>
                <h1 className="mt-1 truncate text-lg font-black tracking-tight text-[var(--app-text)] sm:text-xl">{title}</h1>
                <p className="mt-1 hidden max-w-3xl text-xs text-[var(--app-muted)] sm:block">{description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/chat"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-glass)] px-3 text-xs font-bold text-[var(--app-muted)] transition hover:text-[var(--app-text)] lg:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Chat
                </Link>
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={refreshing}
                  className={`inline-flex h-10 items-center gap-2 rounded-xl border bg-[var(--app-glass)] px-3 text-xs font-bold transition disabled:opacity-50 ${isGold ? "dashboard-accent-button-gold" : "dashboard-accent-button-teal"}`}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                {enableThemeToggle && <ThemeToggle theme={theme} onChange={setTheme} />}
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="dashboard-logout inline-flex h-10 w-10 items-center justify-center rounded-xl border transition lg:hidden"
                    aria-label="Log out"
                    title="Log out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="custom-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    item.id === activeTab
                      ? activeClasses
                      : "border-[var(--app-border)] bg-[var(--app-glass)] text-[var(--app-muted)]"
                  }`}
                >
                  {item.icon}
                  {item.label}
                  {typeof item.count === "number" && item.count > 0 && (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{item.count}</span>
                  )}
                </button>
              ))}
            </div>
          </header>

          <main className="dashboard-content mx-auto w-full max-w-[1500px] space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className={`flex items-center gap-3 rounded-2xl border bg-[var(--app-glass)] px-4 py-3 ${isGold ? "border-amber-400/15" : "border-emerald-400/15"}`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconClasses}`}>
                {activeItem.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--app-text)]">{activeItem.label}</p>
                <p className="text-xs text-[var(--app-muted)]">{activeItem.description}</p>
              </div>
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
