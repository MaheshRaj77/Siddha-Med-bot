"use client";

import { useEffect } from "react";

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[chat-error]", error);
  }, [error]);

  return (
    <main className="product-theme light flex min-h-dvh items-center justify-center bg-[var(--app-bg)] px-6 text-[var(--app-text)]">
      <section className="w-full max-w-md rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-6 shadow-xl">
        <p className="text-sm font-semibold text-[#0B8B73]">Chat unavailable</p>
        <h1 className="mt-3 text-2xl font-bold">The conversation view failed to load</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
          Retry the chat view. Existing sessions and logs are kept on the server.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md bg-[#0B8B73] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#087760]"
        >
          Retry chat
        </button>
      </section>
    </main>
  );
}
