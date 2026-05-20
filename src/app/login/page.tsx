"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/chat";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      // Redirect based on role
      if (data.user.role === "SUPER_ADMIN") {
        router.push("/super-admin");
      } else if (data.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push(redirect);
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg-void)" }}
    >
      {/* Ambient halo */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "var(--gold-glow)",
          filter: "blur(180px)",
          opacity: 0.3,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[420px]"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <svg width="44" height="44" viewBox="0 0 36 36" fill="none">
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
          </Link>
          <h1
            className="text-[28px] font-extrabold tracking-[-0.02em] mt-4"
            style={{ color: "var(--text-primary)" }}
          >
            Welcome back
          </h1>
          <p
            className="text-[13px] font-light mt-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            Sign in to your MedBot research workspace
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 text-[12px] font-medium"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#f87171",
                borderRadius: 4,
              }}
            >
              {error}
            </motion.div>
          )}

          {/* Email */}
          <div>
            <label
              className="block text-[10px] font-semibold tracking-[0.12em] uppercase mb-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@clinic.org"
              className="w-full px-4 py-3 text-[14px] font-light outline-none transition-all duration-200"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                borderRadius: 2,
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--gold-primary)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--border-subtle)")
              }
            />
          </div>

          {/* Password */}
          <div>
            <label
              className="block text-[10px] font-semibold tracking-[0.12em] uppercase mb-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-12 text-[14px] font-light outline-none transition-all duration-200"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  borderRadius: 2,
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "var(--gold-primary)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "var(--border-subtle)")
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-tertiary)" }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 text-[13px] font-bold tracking-[0.08em] uppercase transition-all duration-200 disabled:opacity-60"
            style={{
              background: "var(--gold-primary)",
              color: "#020202",
              borderRadius: 0,
            }}
            onMouseEnter={(e) => {
              if (!loading)
                e.currentTarget.style.background = "var(--gold-bright)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--gold-primary)";
            }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                Sign In <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p
          className="text-center text-[12px] mt-8"
          style={{ color: "var(--text-tertiary)" }}
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold transition-colors duration-200"
            style={{ color: "var(--gold-primary)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--gold-bright)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--gold-primary)")
            }
          >
            Create one →
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-void)", color: "var(--text-tertiary)" }}>
        <Loader2 className="animate-spin" size={24} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
