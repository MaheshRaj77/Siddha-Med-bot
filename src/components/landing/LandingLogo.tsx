import Link from "next/link";

export function LogoMark({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 56 56"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 33h36c-1.2 8.2-7.3 13-18 13S11.2 41.2 10 33Z"
        fill="#8B4513"
      />
      <path
        d="M13 33h30"
        stroke="#6B3210"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M27.5 30.5C17 29.6 11.3 24 10.5 14.1c9.1.6 15.5 5.5 17 16.4Z"
        fill="#22C55E"
      />
      <path
        d="M28.2 30.3c1.3-10.5 7.3-16.3 17.6-17.1-.9 9.6-6.8 15.3-17.6 17.1Z"
        fill="#16A34A"
      />
      <path
        d="M27.8 23.5C23.4 16 25.3 8.8 33.6 3c4 7.6 2.1 14.4-5.8 20.5Z"
        fill="#10B981"
      />
      <path
        d="M16 17.5c4.9 3.4 8.4 7.7 11.4 13M40.4 16.5c-5.6 3.6-9.5 8.3-12.4 14.2M32.3 6.9c-.4 6.7-1.9 11.5-4.5 16.5"
        stroke="#047857"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M18.6 47.2h18.8"
        stroke="#0B8B73"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function LandingLogo({
  footer = false,
}: {
  footer?: boolean;
}) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Siddha MedBot home">
      <LogoMark className={footer ? "h-10 w-10" : "h-11 w-11"} />
      <span className="leading-none">
        <span className={`block text-[20px] font-extrabold tracking-[-0.04em] ${footer ? "text-white" : "text-slate-950"}`}>
          Siddha <span className="text-[#0B8B73]">MedBot</span>
        </span>
        <span className={`mt-1 block text-[10px] font-medium tracking-[-0.01em] ${footer ? "text-slate-400" : "text-slate-600"}`}>
          Ancient Wisdom. AI Precision.
        </span>
      </span>
    </Link>
  );
}
