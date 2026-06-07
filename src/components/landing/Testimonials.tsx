"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const testimonials = [
  {
    quote: "Siddha MedBot has reduced my research time by 70%. The citations and accuracy are excellent.",
    author: "Dr. K. Priyadarshini",
    role: "Siddha Practitioner",
    initials: "KP",
    tone: "from-rose-100 to-orange-100 text-rose-700",
  },
  {
    quote: "As a student, this is like having an advanced Siddha library available 24/7.",
    author: "Arunachalam",
    role: "Final Year Student",
    initials: "A",
    tone: "from-blue-100 to-cyan-100 text-blue-700",
  },
  {
    quote: "A game-changer for Siddha research. Fast, accurate, and trustworthy.",
    author: "Dr. S. Venkatesan",
    role: "Research Scholar",
    initials: "SV",
    tone: "from-amber-100 to-yellow-100 text-amber-700",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-[#F7FAFC] py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease }}
          className="mb-8"
        >
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#0B8B73]">Community voices</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
            Loved by Siddha Community
          </h2>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map(({ quote, author, role, initials, tone }, index) => (
            <motion.article
              key={author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: index * 0.1, ease }}
              whileHover={{ y: -6 }}
              className="relative overflow-hidden rounded-[24px] border border-white bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"
            >
              <Quote className="absolute right-5 top-5 h-9 w-9 text-[#12C48B]/20" />
              <p className="relative z-10 pr-8 text-[13px] font-medium leading-6 text-slate-700">
                “{quote}”
              </p>
              <div className="mt-5 flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-xs font-black ${tone}`}>
                  {initials}
                </span>
                <span>
                  <span className="block text-xs font-extrabold text-slate-950">{author}</span>
                  <span className="mt-1 block text-[10px] text-slate-500">{role}</span>
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
