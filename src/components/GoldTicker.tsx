// src/components/GoldTicker.tsx
"use client";

import React, { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";

interface GoldRate {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change_percent: number;
  unit: string;
  updated: string;
}

export default function GoldTicker() {
  const [rates, setRates] = useState<GoldRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchRates() {
      try {
        const records = await pb.collection("gold_rates").getFullList<GoldRate>({
          sort: "price",
          requestKey: null,
        });
        setRates(records);
        setLoading(false);
      } catch (err) {
        console.error("خطا در دریافت قیمت‌های طلا:", err);
        setError(true);
        setLoading(false);
      }
    }

    fetchRates();

    // همگام‌سازی لحظه‌ای (Realtime) با PocketBase
    pb.collection("gold_rates").subscribe("*", (e) => {
      if (e.action === "update") {
        setRates((prev) =>
          prev.map((item) => (item.id === e.record.id ? (e.record as any) : item))
        );
      } else if (e.action === "create") {
        setRates((prev) => [...prev, e.record as any]);
      }
    });

    return () => {
      pb.collection("gold_rates").unsubscribe("*");
    };
  }, []);

  // تابع فرمت‌دهی اعداد به تومان فارسی
  const formatPrice = (num: number) => {
    return new Intl.NumberFormat("fa-IR").format(Math.round(num));
  };

  if (loading) {
    return (
      <div className="w-full bg-[#1C3324] text-[#D8B65C] text-xs py-2 text-center font-bold">
        در حال دریافت آخرین نرخ‌های بازار طلا...
      </div>
    );
  }

  if (error || rates.length === 0) {
    return null; // در صورت خطا هدر مخفی می‌شود تا ظاهر سایت خراب نشود
  }

  return (
    <div className="w-full bg-[#1C3324] text-white text-xs border-b border-[#8B263E]/30 overflow-hidden direction-rtl font-sans">
      {/* بخش متحرک قیمت‌ها */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[#D8B65C] font-black">نرخ لحظه‌ای طلا و سکه (پرنا زر):</span>
        </div>

        <div className="flex items-center gap-8 text-neutral-200">
          {rates.map((rate) => {
            const sellingPrice = rate.price * 1.02;
            const isPositive = rate.change_percent >= 0;

            return (
              <div
                key={rate.id}
                className="flex items-center gap-2 border-r border-[#FAF9F6]/10 pr-8 first:border-0 first:pr-0 whitespace-nowrap"
              >
                <span className="font-bold text-white">{rate.name}:</span>
                
                {/* قیمت خام بازار */}
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[10px] text-neutral-400">بازار</span>
                  <span className="font-mono text-neutral-300">
                    {formatPrice(rate.price)} {rate.unit}
                  </span>
                </div>

                {/* قیمت فروش با ۲ درصد سود */}
                <div className="flex flex-col items-start leading-none bg-[#8B263E]/20 px-1.5 py-0.5 rounded border border-[#8B263E]/30">
                  <span className="text-[9px] text-[#D8B65C] font-bold">فروش (+۲٪)</span>
                  <span className="font-mono text-amber-200 font-semibold">
                    {formatPrice(sellingPrice)} {rate.unit}
                  </span>
                </div>

                {/* درصد تغییر قیمت */}
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.25 rounded ${
                    isPositive
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-rose-400 bg-rose-500/10"
                  }`}
                >
                  {isPositive ? "▲" : "▼"} {Math.abs(rate.change_percent)}٪
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}