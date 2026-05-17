import { useState, useEffect } from "react";

export default function RaceProgress({ weekStart, weekEnd }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const start = new Date(weekStart).getTime();
  const end = new Date(weekEnd).getTime();
  const total = end - start;
  const elapsed = now - start;
  const pct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  const msLeft = Math.max(0, end - now);
  const daysLeft = Math.ceil(msLeft / 86_400_000);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl px-6 pt-4 pb-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">
          Race progress
        </span>
        <span className="text-xs font-bold text-[#1A1A2E]">
          {daysLeft === 0
            ? "Ends today"
            : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
        </span>
      </div>
      <div className="relative h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#A78BFA] rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 text-right">
        <span className="text-xs text-[#9CA3AF] font-bold">{pct}%</span>
      </div>
    </div>
  );
}
