import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import Footer from "@/components/landing/Footer";
import LandingLogo from "@/components/landing/LandingLogo";
import type { SitePage } from "@/lib/site-pages";

export default function InfoPage({ page }: { page: SitePage }) {
  return (
    <main className="min-h-screen bg-[#F7FAFC] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/85 px-5 py-4 backdrop-blur-xl sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1344px] items-center justify-between gap-4">
          <Link href="/" aria-label="Siddha MedBot home">
            <LandingLogo />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-[#0B8B73] sm:px-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#12C48B] to-[#0B8B73] px-4 py-2.5 text-xs font-bold text-white shadow-[0_10px_24px_rgba(11,139,115,0.22)] transition hover:-translate-y-0.5"
            >
              Try MedBot
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_16%,rgba(18,196,139,0.13),transparent_25%),radial-gradient(circle_at_10%_64%,rgba(31,111,255,0.09),transparent_24%)]" />
        <div className="landing-grid absolute inset-0 -z-10 opacity-35" />
        <div className="mx-auto max-w-[1100px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0B8B73] shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {page.eyebrow}
          </span>
          <h1 className="mt-6 max-w-[860px] text-[44px] font-black leading-[0.98] tracking-[-0.06em] text-slate-950 sm:text-[64px] lg:text-[74px]">
            {page.title}
          </h1>
          <p className="mt-6 max-w-[700px] text-base font-medium leading-7 text-slate-600 sm:text-lg">
            {page.summary}
          </p>

          <div className="mt-10 flex flex-wrap gap-2.5">
            {page.highlights.map((highlight) => (
              <span
                key={highlight}
                className="inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-[0_8px_22px_rgba(15,23,42,0.06)] backdrop-blur"
              >
                <CheckCircle2 className="h-4 w-4 text-[#0B8B73]" />
                {highlight}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 sm:pb-20 lg:px-12 lg:pb-24">
        <div className="mx-auto max-w-[1100px]">
          <p className="max-w-[850px] text-lg leading-8 text-slate-600 sm:text-xl">{page.intro}</p>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {page.sections.map((section, index) => (
              <article
                key={section.title}
                className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.06)]"
              >
                <span className="text-xs font-black tracking-[0.18em] text-[#0B8B73]">0{index + 1}</span>
                <h2 className="mt-4 text-xl font-extrabold tracking-[-0.035em] text-slate-950">{section.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{section.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-[24px] bg-gradient-to-br from-[#0A6E5B] to-[#083E52] p-6 text-white shadow-[0_22px_46px_rgba(8,62,82,0.2)] sm:flex-row sm:items-center sm:p-8">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.04em]">Explore Siddha knowledge with clarity.</h2>
              <p className="mt-1.5 text-sm text-emerald-50">Start with a question and keep the sources close.</p>
            </div>
            <Link
              href="/chat"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-[#0A6E5B] transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              Try MedBot Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
