import type { ComponentType } from "react";

type DashboardStatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: ComponentType<{
    size?: number;
    strokeWidth?: number;
  }>;
  trend?: string;
  trendType?: "positive" | "negative" | "neutral";
};

export default function DashboardStatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendType = "neutral",
}: DashboardStatCardProps) {
  const trendColor =
    trendType === "positive"
      ? "text-emerald-600"
      : trendType === "negative"
      ? "text-rose-600"
      : "text-[#3A5A46]";

  return (
    <article className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-sm font-sans">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#3A5A46]">{title}</p>

          <p className="mt-3 text-2xl font-black text-[#1C3324]">
            {value}
          </p>

          <p className="mt-2 text-xs text-[#3A5A46]">{description}</p>

          {trend && <p className={`mt-3 text-xs font-bold ${trendColor}`}>{trend}</p>}
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[#8B263E] border border-[#1C3324]/10 bg-white shadow-xs">
          <Icon size={22} />
        </div>
      </div>
    </article>
  );
}