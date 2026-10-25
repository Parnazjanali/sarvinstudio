"use client";

import React, { useEffect, useState } from 'react';
import { pb } from "@/lib/pocketbase"; // استفاده از نمونه استاندارد پروژه
import { TrendingUp, TrendingDown } from 'lucide-react';

interface GoldRate {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change_percent: number;
  unit: string;
  updated: string;
}

export default function LiveGoldPrice() {
  const [rates, setRates] = useState<GoldRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ۱. دریافت دیتای اولیه
    const fetchInitialData = async () => {
      try {
        const records = await pb.collection('gold_rates').getFullList<GoldRate>({
          sort: '-price',
          requestKey: null,
        });
        setRates(records);
      } catch (err) {
        console.error("خطا در بارگذاری قیمت‌ها:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // ۲. گوش دادن به تغییرات لحظه‌ای (Realtime)
    pb.collection('gold_rates').subscribe('*', (e) => {
      if (e.action === 'update') {
        setRates(prev => prev.map(item => item.id === e.record.id ? (e.record as unknown as GoldRate) : item));
      } else if (e.action === 'create') {
        setRates(prev => [...prev, (e.record as unknown as GoldRate)]);
      }
    });

    return () => {
      pb.collection('gold_rates').unsubscribe('*');
    };
  }, []);

  if (loading) return <div className="text-[#3A5A46] text-xs font-bold animate-pulse">در حال دریافت نرخ لحظه‌ای طلا...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full font-sans" dir="rtl">
      {rates.map((rate) => (
        <div key={rate.id} className="bg-white border border-[#1C3324]/15 p-5 rounded-3xl flex flex-col gap-2.5 shadow-xs transition-all hover:border-[#8B263E]/40">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#3A5A46]">{rate.name}</span>
            <div className={`flex items-center gap-1 text-xs font-black ${rate.change_percent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {rate.change_percent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {Math.abs(rate.change_percent)}%
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-[#1C3324] tracking-wider font-mono">
              {rate.price.toLocaleString('fa-IR')}
            </span>
            <span className="text-[11px] font-bold text-[#3A5A46]">{rate.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}