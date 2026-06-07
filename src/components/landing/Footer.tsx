import Link from "next/link";
import { Building2, Globe, Lock, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import LandingLogo from "./LandingLogo";

const groups = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How It Works", href: "/#how-it-works" },
      { label: "Use Cases", href: "/#use-cases" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Security", href: "/security" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/documentation" },
      { label: "Help Center", href: "/help-center" },
      { label: "Blog", href: "/blog" },
      { label: "API", href: "/api" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Mission", href: "/mission" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Compliance", href: "/compliance" },
      { label: "Disclaimer", href: "/disclaimer" },
    ],
  },
];

export default function Footer() {
  return (
    <footer id="about" className="bg-[#071A35] px-5 pb-6 pt-14 text-white sm:px-8 lg:px-12 lg:pt-16">
      <div className="mx-auto max-w-[1344px]">
        <div className="grid gap-10 border-b border-white/10 pb-12 md:grid-cols-2 lg:grid-cols-[1.65fr_repeat(4,1fr)]">
          <div className="max-w-[320px]">
            <LandingLogo footer />
            <p className="mt-5 text-xs leading-6 text-slate-300">
              Empowering Siddha practitioners, students and researchers with
              AI-powered medical knowledge.
            </p>
            <div className="mt-5 flex gap-2.5">
              {[
                { icon: Globe, label: "Documentation", href: "/documentation" },
                { icon: Mail, label: "Contact", href: "/contact" },
                { icon: MessageCircle, label: "Help Center", href: "/help-center" },
              ].map(({ icon: Icon, label, href }) => (
                <Link
                  href={href}
                  key={label}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-emerald-300"
                >
                  <Icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>

          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-extrabold text-white">{group.title}</h3>
              <ul className="mt-4 space-y-3">
                {group.links.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-xs text-slate-300 transition hover:text-emerald-300">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-5 pt-6 text-center md:flex-row md:text-left">
          <p className="text-xs text-slate-400">© 2026 Siddha MedBot. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {[
              { icon: ShieldCheck, label: "DPDP Compliant" },
              { icon: Lock, label: "Data Encrypted" },
              { icon: Building2, label: "Enterprise Ready" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-emerald-100">
                <Icon className="h-3.5 w-3.5 text-emerald-300" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
