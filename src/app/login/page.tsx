"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import AuthShell from "@/components/product/AuthShell";
import { useProductTheme } from "@/components/product/ProductTheme";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useProductTheme();
  const redirect = searchParams.get("redirect") || "/chat";
  const safeRedirect = redirect === "/chat" || redirect.startsWith("/chat/") ? redirect : "/chat";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push(data.user.role === "SUPER_ADMIN" ? "/super-admin" : data.user.role === "ADMIN" ? "/admin" : safeRedirect);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      theme={theme}
      onThemeChange={setTheme}
      eyebrow="Welcome back"
      title="Sign in to your workspace"
      description="Continue your Siddha research with source-grounded answers and your saved conversations close at hand."
      footer={
        <>
          New to Siddha MedBot?{" "}
          <Link href="/signup" className="font-extrabold text-[#0B8B73] transition hover:text-[#12C48B]">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2.5 text-xs font-semibold text-red-500"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--app-muted)]">Email address</span>
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-faint)]" />
            <input className="product-input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="doctor@clinic.org" />
          </span>
        </label>
        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--app-muted)]">Password</span>
          <span className="relative block">
            <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-faint)]" />
            <input className="product-input pr-12" type={showPassword ? "text" : "password"} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
            <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--app-muted)]" aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>
        <button type="submit" disabled={loading} className="product-primary-button">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#F7FAFC] text-[#0B8B73]"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
