"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, Mail, UserRound } from "lucide-react";
import AuthShell from "@/components/product/AuthShell";
import { useProductTheme } from "@/components/product/ProductTheme";

export default function SignupPage() {
  const router = useRouter();
  const { theme, setTheme } = useProductTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError("Use at least 12 characters with uppercase, lowercase, a number, and a symbol");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Signup failed");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 2000);
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
      eyebrow="Create your workspace"
      title={success ? "Account created" : "Start exploring with MedBot"}
      description={success ? "Your workspace is ready. We are redirecting you to sign in." : "Create your research workspace and begin exploring curated Siddha knowledge with visible sources."}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-extrabold text-[#0B8B73] transition hover:text-[#12C48B]">Sign in</Link>
        </>
      }
    >
      {success ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-6 text-center">
          <CheckCircle2 className="mx-auto h-11 w-11 text-[#0B8B73]" />
          <p className="mt-4 text-sm font-bold text-[var(--app-text)]">Welcome to Siddha MedBot.</p>
          <p className="mt-1 text-xs text-[var(--app-muted)]">Taking you to the sign-in page...</p>
        </motion.div>
      ) : (
        <form onSubmit={handleSignup} className="space-y-4">
          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2.5 text-xs font-semibold text-red-500">
                {error}
              </motion.p>
            )}
          </AnimatePresence>
          <AuthInput icon={UserRound} label="Full name" value={name} onChange={setName} placeholder="Dr. Rajan Kumar" />
          <AuthInput icon={Mail} label="Email address" value={email} onChange={setEmail} placeholder="doctor@clinic.org" type="email" required />
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--app-muted)]">Password</span>
            <span className="relative block">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-faint)]" />
              <input className="product-input pr-12" type={showPassword ? "text" : "password"} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="12+ characters with mixed types" />
              <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--app-muted)]" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
          <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-2.5 text-[11px] leading-5 text-[var(--app-muted)]">
            Your account starts as a researcher workspace. An administrator can enable practitioner access when needed.
          </p>
          <button type="submit" disabled={loading} className="product-primary-button">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

function AuthInput({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--app-muted)]">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-faint)]" />
        <input className="product-input" type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      </span>
    </label>
  );
}
