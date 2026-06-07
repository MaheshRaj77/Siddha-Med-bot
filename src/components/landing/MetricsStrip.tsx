import { FileText, Search, Users, CheckCircle2 } from "lucide-react";

export default function MetricsStrip() {
  const metrics = [
    { icon: <FileText className="w-5 h-5 text-purple-600" />, value: "10K+", label: "Curated Documents" },
    { icon: <Search className="w-5 h-5 text-pink-600" />, value: "25K+", label: "Medical Queries" },
    { icon: <Users className="w-5 h-5 text-amber-600" />, value: "500+", label: "Trusted Users" },
    { icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, value: "98%", label: "Source-backed Answers" },
  ];

  return (
    <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 mb-24">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-200/50 border border-white p-6 md:p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-100">
          {metrics.map((m, i) => (
            <div key={i} className={`flex items-center gap-4 ${i === 0 ? "" : "pl-8"}`}>
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 shadow-sm border border-gray-100">
                {m.icon}
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{m.value}</div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">{m.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
