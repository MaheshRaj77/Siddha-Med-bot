"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--bg-void)] px-6 text-white">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#D7B56D]">Siddha MedBot</p>
        <h1 className="mt-3 text-2xl font-bold">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-300">
          The page hit an unexpected error. You can retry the current view or return home.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-[#D7B56D] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#f1d28c]"
          >
            Retry
          </button>
          <Link
            href="/"
            className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
