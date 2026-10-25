"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bell,
  BellRing,
  Calculator,
  CheckCircle2,
  Clock3,
  Coins,
  Database,
  ExternalLink,
  Gem,
  History,
  Layers,
  Loader2,
  RefreshCw,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Volume2,
  VolumeX,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  LayoutGrid,
  List,
} from "lucide-react";

import pb from "@/lib/pocketbase";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* =========================================================
   Types
========================================================= */

interface GoldRate {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change_value: number;
  change_percent: number;
  unit: string;
  sign?: string;
  source?: string;
  market_date?: string;
  market_time?: string;
  time_unix?: number;
  created?: string;
  updated?: string;
}

interface SyncResponse {
  success?: boolean;
  source?: string;
  count?: number;
  fetchedAt?: string;
  error?: string;
}

interface PriceChangeAlert {
  symbol: string;
  name: string;
  oldPrice: number;
  newPrice: number;
  difference: number;
  unit: string;
  time: string;
}

/* =========================================================
   Constants
========================================================= */

const GOLD_SYMBOLS = [
  "IR_GOLD_18K",
  "IR_GOLD_24K",
  "IR_GOLD_MELTED",
  "XAUUSD",
  "IR_COIN_EMAMI",
  "IR_COIN_BAHAR",
  "IR_COIN_HALF",
  "IR_COIN_QUARTER",
  "IR_COIN_1G",
];

const AUTO_UPDATE_INTERVAL = 60;

/* =========================================================
   Helpers
========================================================= */

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(Math.round(value));
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("fa-IR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
}

function getPersianUnit(unit: string) {
  if (unit === "دلار") return "دلار";
  return "تومان";
}

function getCardIcon(symbol: string) {
  if (
    symbol === "IR_GOLD_18K" ||
    symbol === "IR_GOLD_24K" ||
    symbol === "IR_GOLD_MELTED"
  ) {
    return Gem;
  }
  return Coins;
}

function getSymbolLabel(symbol: string) {
  switch (symbol) {
    case "IR_GOLD_18K":
      return "طلای ۱۸ عیار";
    case "IR_GOLD_24K":
      return "طلای ۲۴ عیار (خالص)";
    case "IR_GOLD_MELTED":
      return "طلای آب‌شده نقدی";
    case "XAUUSD":
      return "انس طلای جهانی";
    case "IR_COIN_EMAMI":
      return "سکه تمام بهار (امامی)";
    case "IR_COIN_BAHAR":
      return "سکه بهار آزادی (طرح قدیم)";
    case "IR_COIN_HALF":
      return "نیم سکه بهار آزادی";
    case "IR_COIN_QUARTER":
      return "ربع سکه بهار آزادی";
    case "IR_COIN_1G":
      return "سکه یک گرمی بانک مرکزی";
    default:
      return symbol;
  }
}

/* =========================================================
   Component
========================================================= */

export default function GoldRatePage() {
  const [rates, setRates] = useState<GoldRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  /* Auto update controls */
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [secondsUntilUpdate, setSecondsUntilUpdate] = useState(AUTO_UPDATE_INTERVAL);

  /* Audio & Browser alarms */
  const [priceAlert, setPriceAlert] = useState<PriceChangeAlert | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");

  /* Calculator state */
  const [calcWeight, setCalcWeight] = useState<number>(3.5);
  const [calcWage, setCalcWage] = useState<number>(18);
  const [calcProfit, setCalcProfit] = useState<number>(7);
  const [calcTax, setCalcTax] = useState<number>(9);

  const previousPricesRef = useRef<Record<string, number>>({});
  const initializedPricesRef = useRef(false);
  const syncingRef = useRef(false);

  /* Check browser notification support */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }
    setNotificationPermission(Notification.permission);
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch (err) {
      console.error("Notification permission error:", err);
    }
  };

  /* Play alarm tone */
  const playPriceChangeSound = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.12);

      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.35);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.35);

      setTimeout(() => {
        audioContext.close().catch(() => {});
      }, 500);
    } catch (err) {
      console.error("Price alert sound error:", err);
    }
  }, [soundEnabled]);

  /* Detect price changes */
  const detectPriceChanges = useCallback(
    (newRates: GoldRate[]) => {
      const previousPrices = previousPricesRef.current;

      if (!initializedPricesRef.current) {
        const initialPrices: Record<string, number> = {};
        for (const rate of newRates) {
          initialPrices[rate.symbol] = Number(rate.price);
        }
        previousPricesRef.current = initialPrices;
        initializedPricesRef.current = true;
        return;
      }

      let detectedChange: PriceChangeAlert | null = null;

      for (const rate of newRates) {
        const oldPrice = previousPrices[rate.symbol];
        const newPrice = Number(rate.price);

        if (
          typeof oldPrice === "number" &&
          Number.isFinite(oldPrice) &&
          Number.isFinite(newPrice) &&
          oldPrice !== newPrice
        ) {
          detectedChange = {
            symbol: rate.symbol,
            name: rate.name || getSymbolLabel(rate.symbol),
            oldPrice,
            newPrice,
            difference: newPrice - oldPrice,
            unit: rate.unit,
            time: new Date().toISOString(),
          };
          break;
        }
      }

      const latestPrices: Record<string, number> = {};
      for (const rate of newRates) {
        latestPrices[rate.symbol] = Number(rate.price);
      }
      previousPricesRef.current = latestPrices;

      if (!detectedChange) return;

      setPriceAlert(detectedChange);
      playPriceChangeSound();

      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const direction = detectedChange.difference > 0 ? "افزایش" : "کاهش";
        new Notification(`نوسان نرخ ${detectedChange.name}`, {
          body: `${direction}: ${formatNumber(
            Math.abs(detectedChange.difference)
          )} ${getPersianUnit(detectedChange.unit)}\nقیمت جدید: ${formatNumber(
            detectedChange.newPrice
          )}`,
          tag: `gold-price-${detectedChange.symbol}`,
        });
      }
    },
    [playPriceChangeSound]
  );

  /* Load rates from PocketBase */
  const loadRates = useCallback(async () => {
    try {
      setError("");
      const records = await pb.collection("gold_rates").getFullList<GoldRate>({
        sort: "-updated",
        requestKey: null,
      });

      const filtered = records.filter((record) =>
        GOLD_SYMBOLS.includes(record.symbol)
      );

      filtered.sort(
        (a, b) =>
          GOLD_SYMBOLS.indexOf(a.symbol) - GOLD_SYMBOLS.indexOf(b.symbol)
      );

      detectPriceChanges(filtered);
      setRates(filtered);
    } catch (err) {
      console.error("Gold rates load error:", err);
      setError("دریافت نرخ‌ها از پایگاه داده با خطا مواجه شد.");
    } finally {
      setLoading(false);
    }
  }, [detectPriceChanges]);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  /* Sync from BRS */
  const syncGold = useCallback(
    async (automatic = false) => {
      if (syncingRef.current) return;

      try {
        syncingRef.current = true;
        setSyncing(true);
        setError("");

        if (!automatic) setSyncMessage("");

        const response = await fetch("/api/sync-gold", {
          method: "GET",
          cache: "no-store",
        });

        let data: SyncResponse = {};
        try {
          data = (await response.json()) as SyncResponse;
        } catch {
          throw new Error(`پاسخ سرور نامعتبر است (کد ${response.status})`);
        }

        if (!response.ok || !data.success) {
          throw new Error(data.error || "بروزرسانی نرخ‌ها ناموفق بود.");
        }

        const syncTime = data.fetchedAt || new Date().toISOString();
        setLastSync(syncTime);

        if (!automatic) {
          setSyncMessage(
            `${data.count || 0} شاخص طلا و مسکوکات با موفقیت همگام‌سازی شد.`
          );
        }

        await loadRates();
        setSecondsUntilUpdate(AUTO_UPDATE_INTERVAL);
      } catch (err) {
        console.error("Gold sync error:", err);
        setError(
          err instanceof Error ? err.message : "بروزرسانی نرخ‌ها انجام نشد."
        );
      } finally {
        syncingRef.current = false;
        setSyncing(false);
      }
    },
    [loadRates]
  );

  /* Periodic sync */
  useEffect(() => {
    if (!autoUpdate) return;

    const countdownInterval = window.setInterval(() => {
      setSecondsUntilUpdate((current) => (current <= 1 ? AUTO_UPDATE_INTERVAL : current - 1));
    }, 1000);

    const syncInterval = window.setInterval(() => {
      syncGold(true);
    }, AUTO_UPDATE_INTERVAL * 1000);

    return () => {
      window.clearInterval(countdownInterval);
      window.clearInterval(syncInterval);
    };
  }, [autoUpdate, syncGold]);

  const rateMap = useMemo(() => {
    const map = new Map<string, GoldRate>();
    for (const rate of rates) {
      map.set(rate.symbol, rate);
    }
    return map;
  }, [rates]);

  const gold18k = rateMap.get("IR_GOLD_18K");
  const gold24k = rateMap.get("IR_GOLD_24K");
  const goldMelted = rateMap.get("IR_GOLD_MELTED");
  const goldOunce = rateMap.get("XAUUSD");

  /* Calculator formula */
  const calculatedGold = useMemo(() => {
    const base18k = gold18k?.price || 0;
    const rawGoldValue = base18k * calcWeight;
    const wageValue = (rawGoldValue * calcWage) / 100;
    const profitValue = ((rawGoldValue + wageValue) * calcProfit) / 100;
    const taxValue = ((wageValue + profitValue) * calcTax) / 100;
    const finalTotal = rawGoldValue + wageValue + profitValue + taxValue;

    return {
      rawGoldValue,
      wageValue,
      profitValue,
      taxValue,
      finalTotal,
    };
  }, [gold18k, calcWeight, calcWage, calcProfit, calcTax]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1C3324]/5 dark:bg-white/5">
            <Loader2 size={24} className="animate-spin text-[#8B263E] dark:text-[#D8B65C]" />
          </div>
          <span className="text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
            در حال بارگذاری مظنه بازار طلا و مسکوکات...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 font-sans" dir="rtl">
      {/* Price Alert Floating Pill */}
      {priceAlert && (
        <div className="fixed left-4 right-4 top-4 z-50 mx-auto max-w-lg animate-in slide-in-from-top-4 duration-300">
          <Card className="border-[#8B263E]/40 bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:border-[#D8B65C]/40 dark:bg-[#15221B]/95">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8B263E]/10 text-[#8B263E] dark:bg-[#8B263E]/20 dark:text-rose-300">
                <BellRing size={20} className="animate-pulse" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-[#1C3324] dark:text-zinc-100">
                    نوسان قیمت در بازار طلا
                  </h4>
                  <button
                    type="button"
                    onClick={() => setPriceAlert(null)}
                    className="rounded-lg p-1 text-[#3A5A46] hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
                  >
                    <X size={15} />
                  </button>
                </div>

                <p className="mt-0.5 text-xs font-bold text-[#3A5A46] dark:text-zinc-300">
                  {priceAlert.name}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-xl bg-[#FAF9F6] px-2.5 py-1 text-[11px] font-mono text-zinc-500 border border-[#1C3324]/10 dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-400">
                    قبل: {formatNumber(priceAlert.oldPrice)}
                  </span>
                  <span>←</span>
                  <span className="rounded-xl bg-[#1C3324] px-2.5 py-1 text-[11px] font-mono font-bold text-white dark:bg-[#D8B65C] dark:text-black">
                    جدید: {formatNumber(priceAlert.newPrice)}
                  </span>

                  <Badge
                    variant={priceAlert.difference > 0 ? "success" : "destructive"}
                    className="font-mono text-[11px] font-bold"
                  >
                    {priceAlert.difference > 0 ? "+" : ""}
                    {formatNumber(priceAlert.difference)}{" "}
                    {getPersianUnit(priceAlert.unit)}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Hero Header */}
      <div className="flex flex-col justify-between gap-5 rounded-3xl border border-[#1C3324]/12 bg-white/80 p-5 shadow-xs backdrop-blur-md transition-colors lg:flex-row lg:items-center lg:p-6 dark:border-white/10 dark:bg-[#15221B]/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-black text-[#8B263E] dark:text-[#D8B65C]">
              مرکز استعلام و مانیتورینگ مظنه زنده بازار
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-black text-[#1C3324] sm:text-3xl dark:text-zinc-100">
            مظنه لحظه‌ای طلا و مسکوکات
          </h1>
          <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
            دریافت زنده قیمت‌های تابلوی طلا، آب‌شده، سکه و انس جهانی با سیستم اعلان صوتی و هشدار نوسان
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="default"
            size="default"
            onClick={() => syncGold(false)}
            disabled={syncing}
            className="gap-2 shadow-xs"
          >
            {syncing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            <span>{syncing ? "در حال دریافت نرخ..." : "بروزرسانی مستقیم نرخ‌ها"}</span>
          </Button>

          {/* Sound Alarm Toggle */}
          <Button
            variant="outline"
            size="default"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="gap-2"
            title={soundEnabled ? "غیرفعال‌سازی هشدار صوتی" : "فعال‌سازی هشدار صوتی"}
          >
            {soundEnabled ? (
              <Volume2 size={16} className="text-[#8B263E] dark:text-[#D8B65C]" />
            ) : (
              <VolumeX size={16} className="text-zinc-400" />
            )}
            <span className="hidden sm:inline">
              {soundEnabled ? "هشدار صوتی فعال" : "هشدار صوتی خاموش"}
            </span>
          </Button>

          {/* Browser Notification Toggle */}
          {notificationPermission !== "unsupported" && (
            <Button
              variant={notificationPermission === "granted" ? "secondary" : "outline"}
              size="default"
              onClick={requestNotificationPermission}
              disabled={notificationPermission === "granted"}
              className="gap-2"
            >
              <Bell size={16} />
              <span className="hidden sm:inline">
                {notificationPermission === "granted"
                  ? "اعلان مرورگر فعال"
                  : "فعال‌سازی اعلان"}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Auto-update ticker & Countdown strip */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#1C3324]/10 bg-white/70 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-xl",
              autoUpdate
                ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
            )}
          >
            <RefreshCw
              size={15}
              className={cn(autoUpdate && "animate-[spin_4s_linear_infinite]")}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#1C3324] dark:text-zinc-100">
                پایش خودکار بازار
              </span>
              <Badge
                variant={autoUpdate ? "success" : "secondary"}
                className="text-[10px] py-0"
              >
                {autoUpdate ? "فعال" : "غیرفعال"}
              </Badge>
            </div>
            <p className="text-[11px] text-[#3A5A46] dark:text-zinc-400">
              سیستم هر ۶۰ ثانیه نوسانات را رصد کرده و در صورت تغییر قیمت اعلان ارسال می‌کند.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          {autoUpdate && (
            <div className="flex items-center gap-2 rounded-xl bg-[#FAF9F6] px-3 py-1.5 text-xs font-bold text-[#3A5A46] border border-[#1C3324]/10 dark:bg-zinc-800/80 dark:border-white/10 dark:text-zinc-300">
              <Clock3 size={14} className="text-[#8B263E] dark:text-[#D8B65C]" />
              <span>استعلام بعدی:</span>
              <span className="font-mono font-black text-[#1C3324] dark:text-white">
                {secondsUntilUpdate} ثانیه
              </span>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoUpdate((prev) => !prev)}
            className="text-xs font-bold"
          >
            {autoUpdate ? "توقف پایش خودکار" : "فعال‌سازی پایش خودکار"}
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div className="flex-1">
            <div className="font-black">خطا در دریافت مظنه طلا</div>
            <div className="mt-0.5 font-medium">{error}</div>
          </div>
          <button type="button" onClick={() => setError("")} className="text-rose-500">
            <X size={15} />
          </button>
        </div>
      )}

      {syncMessage && !error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={17} className="text-emerald-600" />
            <span>{syncMessage}</span>
          </div>
          <button type="button" onClick={() => setSyncMessage("")} className="text-emerald-600">
            <X size={15} />
          </button>
        </div>
      )}

      {/* 4 Key Stat Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          title="طلای ۱۸ عیار (۷۵۰)"
          value={gold18k ? formatNumber(gold18k.price) : "—"}
          unit="تومان / گرم"
          accent="gold"
          icon={Gem}
          trend={
            gold18k
              ? `${gold18k.change_percent >= 0 ? "+" : ""}${formatPercent(
                  gold18k.change_percent
                )}٪`
              : undefined
          }
          trendType={
            gold18k && gold18k.change_percent > 0
              ? "positive"
              : gold18k && gold18k.change_percent < 0
              ? "negative"
              : "neutral"
          }
          secondaryInfo={{
            label: "نوسان ریالی",
            value: gold18k
              ? `${gold18k.change_value >= 0 ? "+" : ""}${formatNumber(
                  gold18k.change_value
                )} ت`
              : "—",
            highlight: Boolean(gold18k && gold18k.change_value !== 0),
          }}
        />

        <DashboardStatCard
          title="طلای آب‌شده نقدی"
          value={goldMelted ? formatNumber(goldMelted.price) : "—"}
          unit="تومان (مظنه)"
          accent="crimson"
          icon={Coins}
          trend={
            goldMelted
              ? `${goldMelted.change_percent >= 0 ? "+" : ""}${formatPercent(
                  goldMelted.change_percent
                )}٪`
              : undefined
          }
          trendType={
            goldMelted && goldMelted.change_percent > 0
              ? "positive"
              : goldMelted && goldMelted.change_percent < 0
              ? "negative"
              : "neutral"
          }
          secondaryInfo={{
            label: "ساعت بازار",
            value: goldMelted?.market_time || "—",
          }}
        />

        <DashboardStatCard
          title="طلای ۲۴ عیار خالص"
          value={gold24k ? formatNumber(gold24k.price) : "—"}
          unit="تومان / گرم"
          accent="emerald"
          icon={Gem}
          trend={
            gold24k
              ? `${gold24k.change_percent >= 0 ? "+" : ""}${formatPercent(
                  gold24k.change_percent
                )}٪`
              : undefined
          }
          trendType={
            gold24k && gold24k.change_percent > 0
              ? "positive"
              : gold24k && gold24k.change_percent < 0
              ? "negative"
              : "neutral"
          }
          secondaryInfo={{
            label: "شمش استاندارد",
            value: "عیار ۹۹۵+",
          }}
        />

        <DashboardStatCard
          title="انس جهانی طلا (XAU/USD)"
          value={goldOunce ? formatNumber(goldOunce.price) : "—"}
          unit="دلار آمریکا"
          accent="blue"
          icon={Scale}
          trend={
            goldOunce
              ? `${goldOunce.change_percent >= 0 ? "+" : ""}${formatPercent(
                  goldOunce.change_percent
                )}٪`
              : undefined
          }
          trendType={
            goldOunce && goldOunce.change_percent > 0
              ? "positive"
              : goldOunce && goldOunce.change_percent < 0
              ? "negative"
              : "neutral"
          }
          secondaryInfo={{
            label: "تاریخ بازار جهانی",
            value: goldOunce?.market_date || "—",
          }}
        />
      </section>

      {/* Live Gold Calculator (ماشین‌حساب زنده طلا و جواهر) */}
      <Card className="border-[#B4901E]/30 bg-gradient-to-br from-white via-[#FAF9F6] to-[#F7F4EA] p-6 shadow-xs dark:border-[#D8B65C]/30 dark:from-[#15221B] dark:via-[#131E17] dark:to-[#17251D]">
        <div className="flex flex-col gap-2 border-b border-[#1C3324]/10 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#B4901E] text-white shadow-xs dark:bg-[#D8B65C] dark:text-[#101813]">
              <Calculator size={20} />
            </div>
            <div>
              <CardTitle className="text-base font-black">
                ماشین‌حساب هوشمند قیمت طلا بر اساس مظنه لحظه‌ای
              </CardTitle>
              <CardDescription className="text-xs">
                محاسبه خودکار ارزش طلای خام، اجرت، سود فروشنده و مالیات با نرخ روز ۱۸ عیار (
                {gold18k ? formatNumber(gold18k.price) : "۰"} تومان)
              </CardDescription>
            </div>
          </div>

          <Badge variant="gold" className="text-xs py-1 px-3">
            فرمول استاندارد اتحادیه
          </Badge>
        </div>

        {/* Inputs */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-300">
              وزن طلا (گرم):
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={calcWeight}
              onChange={(e) => setCalcWeight(Number(e.target.value) || 0)}
              className="font-mono font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-300">
              اجرت ساخت (%):
            </label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={calcWage}
              onChange={(e) => setCalcWage(Number(e.target.value) || 0)}
              className="font-mono font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-300">
              سود گالری (%):
            </label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={calcProfit}
              onChange={(e) => setCalcProfit(Number(e.target.value) || 0)}
              className="font-mono font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-300">
              مالیات ارزش افزوده (%):
            </label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={calcTax}
              onChange={(e) => setCalcTax(Number(e.target.value) || 0)}
              className="font-mono font-bold"
            />
          </div>
        </div>

        {/* Result Breakdown Card */}
        <div className="mt-5 rounded-2xl border border-[#1C3324]/10 bg-white/90 p-4 dark:border-white/10 dark:bg-zinc-900/90">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs border-b border-[#1C3324]/10 pb-3 dark:border-white/10">
            <div>
              <span className="text-[#3A5A46] dark:text-zinc-400">طلای خام:</span>
              <p className="mt-0.5 font-mono font-black text-[#1C3324] dark:text-zinc-100">
                {formatNumber(calculatedGold.rawGoldValue)} ت
              </p>
            </div>
            <div>
              <span className="text-[#3A5A46] dark:text-zinc-400">مبلغ اجرت ({calcWage}٪):</span>
              <p className="mt-0.5 font-mono font-black text-[#1C3324] dark:text-zinc-100">
                {formatNumber(calculatedGold.wageValue)} ت
              </p>
            </div>
            <div>
              <span className="text-[#3A5A46] dark:text-zinc-400">مبلغ سود ({calcProfit}٪):</span>
              <p className="mt-0.5 font-mono font-black text-[#1C3324] dark:text-zinc-100">
                {formatNumber(calculatedGold.profitValue)} ت
              </p>
            </div>
            <div>
              <span className="text-[#3A5A46] dark:text-zinc-400">مالیات اجرت و سود:</span>
              <p className="mt-0.5 font-mono font-black text-[#1C3324] dark:text-zinc-100">
                {formatNumber(calculatedGold.taxValue)} ت
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#3A5A46] dark:text-zinc-300">
                قیمت نهایی قطعه ساخته شده:
              </span>
              <span className="text-xl font-black text-[#8B263E] sm:text-2xl dark:text-[#D8B65C]">
                {formatNumber(calculatedGold.finalTotal)}
              </span>
              <span className="text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                تومان
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCalcWeight(1);
                setCalcWage(0);
                setCalcProfit(0);
                setCalcTax(0);
              }}
              className="text-xs"
            >
              محاسبه فقط طلای خام
            </Button>
          </div>
        </div>
      </Card>

      {/* Market Rates Section (Cards or Table) */}
      <div className="space-y-4">
        {/* Section Header with View Switcher */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-black text-[#1C3324] dark:text-zinc-100">
              نرخ‌های زنده بازار طلا و مسکوکات
            </h2>
            <p className="text-xs text-[#3A5A46] dark:text-zinc-400">
              واکشی شده از سرور مرکزی BRS • آخرین زمان:{" "}
              {lastSync
                ? new Date(lastSync).toLocaleTimeString("fa-IR")
                : rates[0]?.market_time || "—"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-2xl border border-[#1C3324]/12 bg-white/80 p-1 shadow-2xs backdrop-blur-sm dark:border-white/10 dark:bg-[#15221B]">
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className="gap-1.5 text-xs py-1 px-3"
              >
                <LayoutGrid size={14} />
                <span>نمای کارتی</span>
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="gap-1.5 text-xs py-1 px-3"
              >
                <List size={14} />
                <span>نمای جدولی</span>
              </Button>
            </div>
          </div>
        </div>

        {/* View Mode: Cards */}
        {viewMode === "cards" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rates.map((rate) => {
              const isUp = rate.change_percent > 0;
              const isDown = rate.change_percent < 0;
              const CardIcon = getCardIcon(rate.symbol);

              return (
                <div
                  key={rate.id}
                  className="group relative overflow-hidden rounded-3xl border border-[#1C3324]/12 bg-white/95 p-5 shadow-xs backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-[#15221B]/95"
                >
                  {/* Decorative top gradient bar */}
                  <div
                    className={cn(
                      "absolute inset-x-0 top-0 h-1 bg-gradient-to-l opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                      isUp
                        ? "from-emerald-500/40 via-emerald-500/10 to-transparent"
                        : isDown
                        ? "from-[#8B263E]/40 via-[#8B263E]/10 to-transparent"
                        : "from-[#D8B65C]/40 via-[#D8B65C]/10 to-transparent"
                    )}
                  />

                  {/* Header: Icon, Name, Symbol, and Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-2xs transition-transform duration-300 group-hover:scale-105",
                          rate.symbol.includes("COIN")
                            ? "border-[#8B263E]/10 bg-[#8B263E]/10 text-[#8B263E] dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300"
                            : "border-[#1C3324]/10 bg-emerald-500/10 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
                        )}
                      >
                        <CardIcon size={20} />
                      </div>

                      <div>
                        <h3 className="text-sm font-black text-[#1C3324] dark:text-zinc-100">
                          {rate.name || getSymbolLabel(rate.symbol)}
                        </h3>
                        <span className="font-mono text-[11px] font-bold text-[#3A5A46] dark:text-zinc-400">
                          {rate.symbol}
                        </span>
                      </div>
                    </div>

                    <Badge
                      variant={isUp ? "success" : isDown ? "destructive" : "secondary"}
                      className="font-mono text-[11px] font-bold gap-0.5"
                    >
                      {isUp ? (
                        <ArrowUpRight size={12} />
                      ) : isDown ? (
                        <ArrowDownRight size={12} />
                      ) : null}
                      <span>
                        {isUp ? "+" : ""}
                        {formatPercent(rate.change_percent)}٪
                      </span>
                    </Badge>
                  </div>

                  {/* Main Price */}
                  <div className="mt-4">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-2xl font-black tracking-tight text-[#1C3324] dark:text-zinc-100 font-mono">
                        {formatNumber(rate.price)}
                      </span>
                      <span className="text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                        {getPersianUnit(rate.unit)}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 text-xs">
                      <span className="text-[11px] text-[#3A5A46] dark:text-zinc-400">
                        نوسان ریالی:
                      </span>
                      <span
                        className={cn(
                          "font-mono font-bold text-[11px]",
                          isUp
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isDown
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-zinc-500 dark:text-zinc-400"
                        )}
                      >
                        {rate.change_value > 0 ? "+" : ""}
                        {formatNumber(rate.change_value)}{" "}
                        {getPersianUnit(rate.unit)}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: Market Time & Date */}
                  <div className="mt-4 flex items-center justify-between border-t border-[#1C3324]/8 pt-3 text-[11px] font-medium text-[#3A5A46] dark:border-white/8 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Clock3 size={13} className="text-[#8B263E] dark:text-[#D8B65C]" />
                      <span>{rate.market_time || "—"}</span>
                    </div>

                    <span className="font-mono">{rate.market_date || "—"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* View Mode: Table */
          <Card className="border-[#1C3324]/12 bg-white/80 p-6 dark:border-white/10 dark:bg-[#15221B]/80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام شاخص</TableHead>
                  <TableHead>نماد سیستمی</TableHead>
                  <TableHead>قیمت معامله</TableHead>
                  <TableHead>واحد</TableHead>
                  <TableHead>نوسان درصدی</TableHead>
                  <TableHead>تغییر قیمت</TableHead>
                  <TableHead>ساعت بازار</TableHead>
                  <TableHead className="text-left">تاریخ</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rates.map((rate) => {
                  const isUp = rate.change_percent > 0;
                  const isDown = rate.change_percent < 0;

                  return (
                    <TableRow key={rate.id}>
                      <TableCell className="font-black text-[#1C3324] dark:text-zinc-100">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF9F6] border border-[#1C3324]/10 dark:bg-zinc-800 dark:border-white/10">
                            {rate.symbol.includes("COIN") ? (
                              <Coins size={14} className="text-[#8B263E] dark:text-[#D8B65C]" />
                            ) : (
                              <Gem size={14} className="text-[#1C3324] dark:text-[#D8B65C]" />
                            )}
                          </div>
                          <span>{rate.name || getSymbolLabel(rate.symbol)}</span>
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-xs text-[#3A5A46] dark:text-zinc-400">
                        {rate.symbol}
                      </TableCell>

                      <TableCell className="font-mono text-sm font-black text-[#1C3324] dark:text-zinc-100">
                        {formatNumber(rate.price)}
                      </TableCell>

                      <TableCell className="text-xs text-[#3A5A46] dark:text-zinc-400">
                        {getPersianUnit(rate.unit)}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={isUp ? "success" : isDown ? "destructive" : "secondary"}
                          className="font-mono text-[10px] gap-0.5"
                        >
                          {isUp ? (
                            <ArrowUpRight size={12} />
                          ) : isDown ? (
                            <ArrowDownRight size={12} />
                          ) : null}
                          <span>{formatPercent(rate.change_percent)}٪</span>
                        </Badge>
                      </TableCell>

                      <TableCell
                        className={cn(
                          "font-mono text-xs font-bold",
                          isUp
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isDown
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-zinc-500"
                        )}
                      >
                        {rate.change_value > 0 ? "+" : ""}
                        {formatNumber(rate.change_value)} {getPersianUnit(rate.unit)}
                      </TableCell>

                      <TableCell className="font-mono text-xs text-[#3A5A46] dark:text-zinc-400">
                        {rate.market_time || "—"}
                      </TableCell>

                      <TableCell className="font-mono text-xs text-left text-[#3A5A46] dark:text-zinc-400">
                        {rate.market_date || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}