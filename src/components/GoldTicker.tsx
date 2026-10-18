// src/components/GoldTicker.tsx
"use client";

import React, { useEffect, useState } from "react";
import PocketBase from "pocketbase";

const PB_URL = "http://127.0.0.1:8090";

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
    const pb = new PocketBase(PB_URL);

    async function fetchRates() {
      try {
        // خواندن تمام نرخ‌های طلا و سکه
        const records = await pb.collection("gold_rates").getFullList<GoldRate>({
          sort: "price", // مرتب‌سازی بر اساس قیمت
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
    // هر زمان دیتابیس آپدیت شود، هدر بدون رفرش آپدیت می‌شود!
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

  // تابع فرمت‌دهی اعداد به ریال/تومان فارسی
  const formatPrice = (num: number) => {
    return new Intl.NumberFormat("fa-IR").format(Math.round(num));
  };

  if (loading) {
    return (
      <div className="w-full bg-neutral-900 text-neutral-400 text-xs py-2 text-center">
        در حال دریافت آخرین نرخ‌های بازار طلا...
      </div>
    );
  }

  if (error || rates.length === 0) {
    return null; // در صورت خطا هدر مخفی می‌شود تا ظاهر سایت خراب نشود
  }

  return (
    <div className="w-full bg-gradient-to-r from-amber-950 via-neutral-950 to-amber-950 text-white text-xs border-b border-amber-500/20 overflow-hidden direction-rtl">
      {/* بخش متحرک قیمت‌ها */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-amber-400 font-bold">نرخ لحظه‌ای طلا و سکه (پرضا گلد):</span>
        </div>

        <div className="flex items-center gap-8 text-neutral-300">
          {rates.map((rate) => {
            // محاسبه قیمت فروش با ۲ درصد سود بیشتر
            const sellingPrice = rate.price * 1.02;
            const isPositive = rate.change_percent >= 0;

            return (
              <div
                key={rate.id}
                className="flex items-center gap-2 border-r border-neutral-800 pr-8 first:border-0 first:pr-0 whitespace-nowrap"
              >
                <span className="font-semibold text-neutral-100">{rate.name}:</span>
                
                {/* قیمت خام بازار */}
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[10px] text-neutral-400">بازار</span>
                  <span className="font-mono text-neutral-300">
                    {formatPrice(rate.price)} {rate.unit}
                  </span>
                </div>

                {/* قیمت فروش با ۲ درصد سود */}
                <div className="flex flex-col items-start leading-none bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  <span className="text-[9px] text-amber-400 font-bold">فروش (+۲٪)</span>
                  <span className="font-mono text-amber-300 font-semibold">
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
