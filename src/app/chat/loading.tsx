export default function ChatLoading() {
  return (
    <main className="product-theme light min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-[var(--app-border)] bg-[var(--app-sidebar)] p-4 lg:block">
          <div className="h-10 w-40 animate-pulse rounded-md bg-[var(--app-soft)]" />
          <div className="mt-8 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-md bg-[var(--app-soft)]" />
            ))}
          </div>
        </aside>
        <section className="flex min-h-dvh flex-col">
          <header className="border-b border-[var(--app-border)] p-4">
            <div className="h-9 w-48 animate-pulse rounded-md bg-[var(--app-soft)]" />
          </header>
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-end gap-4 p-6">
            <div className="h-24 w-3/4 animate-pulse rounded-lg bg-[var(--app-soft)]" />
            <div className="ml-auto h-16 w-2/3 animate-pulse rounded-lg bg-[var(--app-soft)]" />
            <div className="h-14 animate-pulse rounded-lg bg-[var(--app-soft)]" />
          </div>
        </section>
      </div>
    </main>
  );
}
