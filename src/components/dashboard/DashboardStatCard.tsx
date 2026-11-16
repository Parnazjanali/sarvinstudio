"use client";

import React, { type ComponentType } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatAccentColor = "emerald" | "crimson" | "gold" | "blue" | "default";

export interface DashboardStatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  icon: ComponentType<{
    size?: number;
    className?: string;
    strokeWidth?: number;
  }>;
  trend?: string;
  trendType?: "positive" | "negative" | "neutral";
  secondaryInfo?: {
    label: string;
    value: string | number;
    highlight?: boolean;
  };
  href?: string;
  actionText?: string;
  accent?: StatAccentColor;
  isLoading?: boolean;
  className?: string;
}

const accentMap: Record<
  StatAccentColor,
  {
    iconBg: string;
    iconText: string;
    glow: string;
    badgeVariant: "success" | "destructive" | "gold" | "crimson" | "secondary";
    topBorder: string;
  }
> = {
  emerald: {
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    iconText: "text-emerald-700 dark:text-emerald-400",
    glow: "group-hover:border-emerald-500/30",
    badgeVariant: "success",
    topBorder: "from-emerald-500/40 via-emerald-500/10 to-transparent",
  },
  crimson: {
    iconBg: "bg-[#8B142D]/10 dark:bg-[#8B142D]/25",
    iconText: "text-[#8B142D] dark:text-rose-300",
    glow: "group-hover:border-[#8B142D]/40",
    badgeVariant: "crimson",
    topBorder: "from-[#8B142D]/40 via-[#8B142D]/10 to-transparent",
  },
  gold: {
    iconBg: "bg-[#C5A059]/10 dark:bg-[#DFB76C]/20",
    iconText: "text-[#C5A059] dark:text-[#DFB76C]",
    glow: "group-hover:border-[#C5A059]/40",
    badgeVariant: "gold",
    topBorder: "from-[#DFB76C]/40 via-[#DFB76C]/10 to-transparent",
  },
  blue: {
    iconBg: "bg-sky-500/10 dark:bg-sky-500/20",
    iconText: "text-sky-700 dark:text-sky-400",
    glow: "group-hover:border-sky-500/30",
    badgeVariant: "secondary",
    topBorder: "from-sky-500/40 via-sky-500/10 to-transparent",
  },
  default: {
    iconBg: "bg-[#3B0B14]/10 dark:bg-white/10",
    iconText: "text-[#3B0B14] dark:text-zinc-200",
    glow: "group-hover:border-[#3B0B14]/30",
    badgeVariant: "secondary",
    topBorder: "from-[#3B0B14]/30 via-transparent to-transparent",
  },
};

export default function DashboardStatCard({
  title,
  value,
  unit,
  description,
  icon: Icon,
  trend,
  trendType = "neutral",
  secondaryInfo,
  href,
  actionText,
  accent = "default",
  isLoading = false,
  className,
}: DashboardStatCardProps) {
  const styles = accentMap[accent] || accentMap.default;

  const content = (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-[#3B0B14]/12 bg-white/95 p-5 shadow-xs backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-[#1C080E]/95",
        styles.glow,
        href && "cursor-pointer",
        className
      )}
    >
      {/* Decorative top gradient bar */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1 bg-gradient-to-l opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          styles.topBorder
        )}
      />

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-11 w-11 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="h-8 w-36 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-3 w-48 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        </div>
      ) : (
        <CardContent className="p-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400">
                {title}
              </span>

              {/* Main Value */}
              <div className="mt-2.5 flex items-baseline gap-1.5 flex-wrap">
                <span className="text-2xl font-black tracking-tight text-[#3B0B14] sm:text-3xl dark:text-zinc-100">
                  {value}
                </span>
                {unit && (
                  <span className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400">
                    {unit}
                  </span>
                )}
              </div>
            </div>

            {/* Icon */}
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-black/5 shadow-xs transition-transform duration-300 group-hover:scale-110 dark:border-white/10",
                styles.iconBg,
                styles.iconText
              )}
            >
              <Icon size={22} strokeWidth={2.2} />
            </div>
          </div>

          {/* Description / Trend pill */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {trend && (
              <Badge
                variant={
                  trendType === "positive"
                    ? "success"
                    : trendType === "negative"
                    ? "destructive"
                    : "secondary"
                }
                className="gap-1 px-2 py-0.5 text-[10px] font-black"
              >
                {trendType === "positive" ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : trendType === "negative" ? (
                  <ArrowDownRight className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                <span>{trend}</span>
              </Badge>
            )}

            {description && (
              <span className="text-[11px] text-[#6E3A44] dark:text-zinc-400">
                {description}
              </span>
            )}
          </div>

          {/* Secondary Footer Info */}
          {(secondaryInfo || (href && actionText)) && (
            <div className="mt-4 flex items-center justify-between border-t border-[#3B0B14]/8 pt-3 text-xs dark:border-white/8">
              {secondaryInfo && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#6E3A44] dark:text-zinc-400">
                  <span>{secondaryInfo.label}:</span>
                  <span
                    className={cn(
                      "font-bold font-mono",
                      secondaryInfo.highlight
                        ? "text-[#8B142D] dark:text-rose-400"
                        : "text-[#3B0B14] dark:text-zinc-200"
                    )}
                  >
                    {secondaryInfo.value}
                  </span>
                </div>
              )}

              {href && (
                <div className="mr-auto flex items-center gap-1 text-[11px] font-bold text-[#8B142D] transition-transform group-hover:-translate-x-1 dark:text-[#DFB76C]">
                  <span>{actionText || "مشاهده جزئیات"}</span>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}