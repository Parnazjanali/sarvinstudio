"use client";

import React, { useEffect, useState } from 'react';
import PocketBase from 'pocketbase';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

const pb = new PocketBase("http://127.0.0.1:8090");

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
        });
        setRates(records);
      } catch (err) {
        console.error("خطا در بارگذاری قیمت‌ها:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

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

  if (loading) return <div className="text-neutral-500 text-sm animate-pulse">در حال دریافت نرخ لحظه‌ای...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {rates.map((rate) => (
        <div key={rate.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex flex-col gap-2 hover:border-amber-500/30 transition-all shadow-lg">
          <div className="flex justify-between items-center">
            <span className="text-xs text-neutral-500">{rate.name}</span>
            <div className={`flex items-center gap-1 text-xs ${rate.change_percent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {rate.change_percent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(rate.change_percent)}%
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white tracking-wider">
              {rate.price.toLocaleString('fa-IR')}
            </span>
            <span className="text-[10px] text-neutral-500">{rate.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
