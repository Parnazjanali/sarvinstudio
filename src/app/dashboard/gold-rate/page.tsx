"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  BellRing,
  CheckCircle2,
  Clock3,
  Coins,
  Database,
  ExternalLink,
  Gem,
  History,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import pb from "@/lib/pocketbase";

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

interface SyncResult {
  action: "created" | "updated" | "skipped";
  symbol: string;
  id?: string;
  price?: number;
  change?: number;
  error?: string;
}

interface SyncResponse {
  success?: boolean;
  source?: string;
  count?: number;
  results?: SyncResult[];
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
  if (unit === "دلار") {
    return "دلار";
  }

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
      return "طلای ۲۴ عیار";

    case "IR_GOLD_MELTED":
      return "طلای آب‌شده";

    case "XAUUSD":
      return "انس طلا";

    case "IR_COIN_EMAMI":
      return "سکه امامی";

    case "IR_COIN_BAHAR":
      return "سکه بهار آزادی";

    case "IR_COIN_HALF":
      return "نیم سکه";

    case "IR_COIN_QUARTER":
      return "ربع سکه";

    case "IR_COIN_1G":
      return "سکه یک گرمی";

    default:
      return symbol;
  }
}

/* =========================================================
   Main Page
========================================================= */

export default function GoldRatePage() {
  const [rates, setRates] = useState<GoldRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");

  const [lastSync, setLastSync] = useState<string | null>(null);

  /* =======================================================
     Auto update
  ======================================================= */

  const [autoUpdate, setAutoUpdate] = useState(true);

  const [secondsUntilUpdate, setSecondsUntilUpdate] =
    useState(AUTO_UPDATE_INTERVAL);

  /* =======================================================
     Alarm
  ======================================================= */

  const [priceAlert, setPriceAlert] =
    useState<PriceChangeAlert | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(true);

  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | "unsupported">(
      "unsupported"
    );

  const previousPricesRef = useRef<
    Record<string, number>
  >({});

  const initializedPricesRef = useRef(false);
  const syncingRef = useRef(false);

  /* =======================================================
     Notification permission
  ======================================================= */

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    setNotificationPermission(
      Notification.permission
    );
  }, []);

  const requestNotificationPermission = async () => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      return;
    }

    try {
      const permission =
        await Notification.requestPermission();

      setNotificationPermission(permission);
    } catch (err) {
      console.error(
        "Notification permission error:",
        err
      );
    }
  };

  /* =======================================================
     Alarm sound
  ======================================================= */

  const playPriceChangeSound = useCallback(() => {
    if (!soundEnabled) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    try {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) {
        return;
      }

      const audioContext =
        new AudioContextClass();

      const oscillator =
        audioContext.createOscillator();

      const gain =
        audioContext.createGain();

      oscillator.type = "sine";

      oscillator.frequency.setValueAtTime(
        880,
        audioContext.currentTime
      );

      oscillator.frequency.setValueAtTime(
        660,
        audioContext.currentTime + 0.12
      );

      gain.gain.setValueAtTime(
        0.0001,
        audioContext.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.18,
        audioContext.currentTime + 0.02
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.35
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();

      oscillator.stop(
        audioContext.currentTime + 0.35
      );

      setTimeout(() => {
        audioContext.close().catch(() => {});
      }, 500);
    } catch (err) {
      console.error(
        "Price alert sound error:",
        err
      );
    }
  }, [soundEnabled]);

  /* =======================================================
     Detect price changes
  ======================================================= */

  const detectPriceChanges = useCallback(
    (newRates: GoldRate[]) => {
      const previousPrices =
        previousPricesRef.current;

      if (!initializedPricesRef.current) {
        const initialPrices: Record<
          string,
          number
        > = {};

        for (const rate of newRates) {
          initialPrices[rate.symbol] =
            Number(rate.price);
        }

        previousPricesRef.current =
          initialPrices;

        initializedPricesRef.current = true;

        return;
      }

      let detectedChange:
        | PriceChangeAlert
        | null = null;

      for (const rate of newRates) {
        const oldPrice =
          previousPrices[rate.symbol];

        const newPrice =
          Number(rate.price);

        if (
          typeof oldPrice === "number" &&
          Number.isFinite(oldPrice) &&
          Number.isFinite(newPrice) &&
          oldPrice !== newPrice
        ) {
          detectedChange = {
            symbol: rate.symbol,
            name:
              rate.name ||
              getSymbolLabel(rate.symbol),
            oldPrice,
            newPrice,
            difference:
              newPrice - oldPrice,
            unit: rate.unit,
            time: new Date().toISOString(),
          };

          break;
        }
      }

      const latestPrices: Record<
        string,
        number
      > = {};

      for (const rate of newRates) {
        latestPrices[rate.symbol] =
          Number(rate.price);
      }

      previousPricesRef.current =
        latestPrices;

      if (!detectedChange) {
        return;
      }

      setPriceAlert(detectedChange);

      playPriceChangeSound();

      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const direction =
          detectedChange.difference > 0
            ? "افزایش"
            : "کاهش";

        new Notification(
          `تغییر قیمت ${detectedChange.name}`,
          {
            body: `${direction} قیمت: ${formatNumber(
              detectedChange.difference
            )} ${getPersianUnit(
              detectedChange.unit
            )}\nقیمت جدید: ${formatNumber(
              detectedChange.newPrice
            )}`,
            tag: `gold-price-${detectedChange.symbol}`,
          }
        );
      }
    },
    [playPriceChangeSound]
  );

  /* =======================================================
     Load rates from PocketBase
  ======================================================= */

  const loadRates = useCallback(
    async (
      detectChanges = false
    ) => {
      try {
        setError("");

        const records =
          await pb
            .collection("gold_rates")
            .getFullList<GoldRate>({
              sort: "-updated",
              requestKey: null,
            });

        const filtered = records.filter(
          (record) =>
            GOLD_SYMBOLS.includes(
              record.symbol
            )
        );

        filtered.sort(
          (a, b) =>
            GOLD_SYMBOLS.indexOf(
              a.symbol
            ) -
            GOLD_SYMBOLS.indexOf(
              b.symbol
            )
        );

        if (detectChanges) {
          detectPriceChanges(filtered);
        } else {
          detectPriceChanges(filtered);
        }

        setRates(filtered);
      } catch (err) {
        console.error(
          "Gold rates load error:",
          err
        );

        setError(
          "دریافت نرخ‌ها از پاکت‌بیس انجام نشد."
        );
      } finally {
        setLoading(false);
      }
    },
    [detectPriceChanges]
  );

  useEffect(() => {
    loadRates(false);
  }, [loadRates]);

  /* =======================================================
     Sync from BRS
  ======================================================= */

  const syncGold = useCallback(
    async (
      automatic = false
    ) => {
      if (syncingRef.current) {
        return;
      }

      try {
        syncingRef.current = true;

        setSyncing(true);
        setError("");

        if (!automatic) {
          setSyncMessage("");
        }

        const response = await fetch(
          "/api/sync-gold",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        let data: SyncResponse = {};

        try {
          data =
            (await response.json()) as SyncResponse;
        } catch {
          throw new Error(
            `پاسخ سرور قابل خواندن نیست. وضعیت: ${response.status}`
          );
        }

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              `بروزرسانی نرخ‌ها ناموفق بود. وضعیت: ${response.status}`
          );
        }

        const syncTime =
          data.fetchedAt ||
          new Date().toISOString();

        setLastSync(syncTime);

        if (!automatic) {
          setSyncMessage(
            `${data.count || 0} نرخ با موفقیت بروزرسانی شد.`
          );
        }

        await loadRates(true);

        setSecondsUntilUpdate(
          AUTO_UPDATE_INTERVAL
        );
      } catch (err) {
        console.error(
          "Gold sync error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "بروزرسانی نرخ‌ها انجام نشد."
        );
      } finally {
        syncingRef.current = false;
        setSyncing(false);
      }
    },
    [loadRates]
  );

  useEffect(() => {
    if (!autoUpdate) {
      return;
    }

    const countdownInterval =
      window.setInterval(() => {
        setSecondsUntilUpdate((current) => {
          if (current <= 1) {
            return AUTO_UPDATE_INTERVAL;
          }

          return current - 1;
        });
      }, 1000);

    const syncInterval =
      window.setInterval(() => {
        syncGold(true);
      }, AUTO_UPDATE_INTERVAL * 1000);

    return () => {
      window.clearInterval(
        countdownInterval
      );

      window.clearInterval(
        syncInterval
      );
    };
  }, [autoUpdate, syncGold]);

  const closePriceAlert = () => {
    setPriceAlert(null);
  };

  const rateMap = useMemo(() => {
    const map = new Map<string, GoldRate>();

    for (const rate of rates) {
      map.set(rate.symbol, rate);
    }

    return map;
  }, [rates]);

  const mainRates = useMemo(() => {
    return GOLD_SYMBOLS
      .map((symbol) =>
        rateMap.get(symbol)
      )
      .filter(
        (rate): rate is GoldRate =>
          Boolean(rate)
      );
  }, [rateMap]);

  const latestRate = mainRates[0];

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#FAF9F6] p-6 font-sans text-[#1C3324]"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1C3324]/5 border border-[#1C3324]/10">
                <Loader2
                  size={28}
                  className="animate-spin text-[#8B263E]"
                />
              </div>

              <p className="text-xs font-bold text-[#3A5A46]">
                در حال دریافت آخرین نرخ‌ها...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#FAF9F6] font-sans text-[#1C3324]"
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-7">
        
        {/* Price change alarm */}
        {priceAlert && (
          <div className="fixed left-4 right-4 top-4 z-50 mx-auto max-w-xl animate-in slide-in-from-top-4 duration-300">
            <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E]">
                  <BellRing
                    size={22}
                    className="animate-pulse"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-[#1C3324]">
                      قیمت تغییر کرد
                    </h3>

                    <button
                      type="button"
                      onClick={
                        closePriceAlert
                      }
                      className="rounded-xl p-1.5 text-[#3A5A46] transition hover:bg-[#1C3324]/5 cursor-pointer"
                    >
                      <X size={17} />
                    </button>
                  </div>

                  <p className="mt-1 text-xs font-bold text-[#3A5A46]">
                    {priceAlert.name}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-xl bg-[#FAF9F6] px-3 py-1 font-bold text-[#3A5A46] border border-[#1C3324]/10">
                      قبلی:
                      {" "}
                      {formatNumber(
                        priceAlert.oldPrice
                      )}
                    </span>

                    <span className="text-[#3A5A46]/60">
                      ←
                    </span>

                    <span className="rounded-xl bg-[#1C3324] px-3 py-1 font-black text-white">
                      جدید:
                      {" "}
                      {formatNumber(
                        priceAlert.newPrice
                      )}
                    </span>

                    <span
                      className={`rounded-xl px-3 py-1 font-black ${
                        priceAlert.difference >
                        0
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {priceAlert.difference >
                      0
                        ? "+"
                        : ""}
                      {formatNumber(
                        priceAlert.difference
                      )}{" "}
                      {getPersianUnit(
                        priceAlert.unit
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1C3324] text-white shadow-xs">
                <Gem size={20} />
              </div>

              <span className="text-xs font-bold text-[#8B263E]">
                مدیریت سروین استودیو
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-[#1C3324]">
              نرخ لحظه‌ای طلا و سکه
            </h1>

            <p className="mt-1 text-xs text-[#3A5A46]">
              دریافت مستقیم قیمت‌ها از بازار و ذخیره در پاکت‌بیس
            </p>
          </div>

          <button
            type="button"
            onClick={() => syncGold(false)}
            disabled={syncing}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#1C3324] px-6 text-xs font-black text-white shadow-sm transition hover:bg-[#8B263E] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {syncing ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <RefreshCw size={18} />
            )}

            {syncing
              ? "در حال بروزرسانی..."
              : "بروزرسانی نرخ‌ها"}
          </button>
        </div>

        {/* Auto update control */}
        <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 shadow-xs">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  autoUpdate
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-neutral-100 text-neutral-500"
                }`}
              >
                <RefreshCw
                  size={19}
                  className={
                    autoUpdate
                      ? "animate-[spin_4s_linear_infinite]"
                      : ""
                  }
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-black text-[#1C3324]">
                    بروزرسانی خودکار قیمت
                  </h2>

                  <span
                    className={`rounded-full px-3 py-0.5 text-[10px] font-black ${
                      autoUpdate
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {autoUpdate
                      ? "فعال"
                      : "غیرفعال"}
                  </span>
                </div>

                <p className="mt-1 text-xs leading-6 text-[#3A5A46]">
                  سیستم هر ۱ دقیقه قیمت‌های BRS را بررسی می‌کند و در صورت تغییر قیمت به شما هشدار می‌دهد.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {autoUpdate && (
                <div className="flex items-center gap-2 rounded-2xl bg-[#FAF9F6] px-3.5 py-2 text-xs font-bold text-[#3A5A46] border border-[#1C3324]/10">
                  <Clock3
                    size={15}
                    className="text-[#8B263E]"
                  />

                  <span>
                    آپدیت بعدی:
                  </span>

                  <strong className="min-w-[32px] text-center font-mono text-[#1C3324]">
                    {secondsUntilUpdate}
                  </strong>

                  <span>
                    ثانیه
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  setAutoUpdate(
                    (current) => !current
                  )
                }
                className={`relative h-7 w-12 rounded-full transition cursor-pointer ${
                  autoUpdate
                    ? "bg-[#1C3324]"
                    : "bg-neutral-300"
                }`}
                aria-label={
                  autoUpdate
                    ? "غیرفعال کردن بروزرسانی خودکار"
                    : "فعال کردن بروزرسانی خودکار"
                }
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                    autoUpdate
                      ? "right-1"
                      : "right-6"
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (
                    notificationPermission !==
                      "granted" &&
                    notificationPermission !==
                      "unsupported"
                  ) {
                    requestNotificationPermission();
                  }

                  setSoundEnabled(
                    (current) => !current
                  );
                }}
                className={`inline-flex h-10 items-center gap-2 rounded-2xl border px-4 text-xs font-bold transition cursor-pointer ${
                  soundEnabled
                    ? "border-[#1C3324]/15 bg-[#FAF9F6] text-[#1C3324] hover:bg-[#1C3324]/5"
                    : "border-neutral-200 bg-neutral-50 text-neutral-400"
                }`}
              >
                {soundEnabled ? (
                  <Volume2 size={15} />
                ) : (
                  <VolumeX size={15} />
                )}

                هشدار صوتی
              </button>

              {notificationPermission !==
                "unsupported" && (
                <button
                  type="button"
                  onClick={
                    requestNotificationPermission
                  }
                  disabled={
                    notificationPermission ===
                    "granted"
                  }
                  className={`inline-flex h-10 items-center gap-2 rounded-2xl border px-4 text-xs font-bold transition cursor-pointer ${
                    notificationPermission ===
                    "granted"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-[#1C3324]/15 bg-[#FAF9F6] text-[#1C3324] hover:bg-[#1C3324]/5"
                  }`}
                >
                  <Bell size={15} />

                  {notificationPermission ===
                  "granted"
                    ? "اعلان مرورگر فعال"
                    : "فعال‌سازی اعلان"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-black">
                خطا در دریافت نرخ‌ها
              </p>

              <p className="mt-1 font-medium">
                {error}
              </p>
            </div>
          </div>
        )}

        {syncMessage && !error && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-700">
            <CheckCircle2 size={20} />

            <span>
              {syncMessage}
            </span>
          </div>
        )}

        {/* Top stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-[#3A5A46]">
                نرخ‌های فعال
              </span>

              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E]">
                <Database size={18} />
              </div>
            </div>

            <div className="text-2xl font-black text-[#1C3324]">
              {formatNumber(
                mainRates.length
              )}
            </div>

            <p className="mt-1 text-xs text-[#3A5A46]">
              نرخ دریافت‌شده از BRS
            </p>
          </div>

          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-[#3A5A46]">
                طلای ۱۸ عیار
              </span>

              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E]">
                <Gem size={18} />
              </div>
            </div>

            <div className="text-2xl font-black text-[#1C3324]">
              {rateMap.has(
                "IR_GOLD_18K"
              )
                ? formatNumber(
                    rateMap.get(
                      "IR_GOLD_18K"
                    )!.price
                  )
                : "—"}
            </div>

            <p className="mt-1 text-xs text-[#3A5A46]">
              تومان / گرم
            </p>
          </div>

          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-[#3A5A46]">
                انس طلا
              </span>

              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E]">
                <Coins size={18} />
              </div>
            </div>

            <div className="text-2xl font-black text-[#1C3324]">
              {rateMap.has("XAUUSD")
                ? formatNumber(
                    rateMap.get(
                      "XAUUSD"
                    )!.price
                  )
                : "—"}
            </div>

            <p className="mt-1 text-xs text-[#3A5A46]">
              دلار
            </p>
          </div>

          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-[#3A5A46]">
                آخرین بروزرسانی
              </span>

              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E]">
                <Clock3 size={18} />
              </div>
            </div>

            <div className="text-lg font-black text-[#1C3324]">
              {latestRate?.market_time ||
                "—"}
            </div>

            <p className="mt-1 text-xs text-[#3A5A46]">
              {latestRate?.market_date ||
                "هنوز بروزرسانی نشده"}
            </p>
          </div>
        </div>

        {/* Rates Grid */}
        <div className="rounded-3xl border border-[#1C3324]/15 bg-white shadow-xs">
          <div className="flex flex-col gap-3 border-b border-[#1C3324]/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black text-[#1C3324]">
                نرخ‌های بازار
              </h2>

              <p className="mt-0.5 text-xs text-[#3A5A46]">
                اطلاعات دریافتی مستقیم از BRS API
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-[#3A5A46]">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />

              {autoUpdate
                ? "آپدیت خودکار فعال • هر ۱ دقیقه"
                : "آپدیت خودکار غیرفعال"}
            </div>
          </div>

          {mainRates.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E]">
                <Database size={24} />
              </div>

              <h3 className="text-sm font-black text-[#1C3324]">
                هنوز نرخی ثبت نشده
              </h3>

              <p className="mt-1 max-w-md text-xs text-[#3A5A46]">
                برای دریافت آخرین قیمت‌های بازار، روی دکمه بروزرسانی نرخ‌ها کلیک کنید.
              </p>

              <button
                type="button"
                onClick={() =>
                  syncGold(false)
                }
                disabled={syncing}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#1C3324] px-6 py-3 text-xs font-black text-white hover:bg-[#8B263E] disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw size={16} />
                دریافت نرخ‌ها
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
              {mainRates.map((rate) => {
                const Icon =
                  getCardIcon(
                    rate.symbol
                  );

                const isPositive =
                  rate.change_percent > 0;

                const isNegative =
                  rate.change_percent < 0;

                return (
                  <div
                    key={rate.id}
                    className="group rounded-3xl border border-[#1C3324]/15 bg-[#FAF9F6] p-5 transition hover:border-[#8B263E] hover:bg-white hover:shadow-xs"
                  >
                    {/* Card header */}
                    <div className="mb-5 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1C3324] text-white shadow-xs">
                          <Icon size={21} />
                        </div>

                        <div>
                          <h3 className="text-sm font-black text-[#1C3324]">
                            {rate.name}
                          </h3>

                          <p className="mt-0.5 font-mono text-[10px] text-[#3A5A46]">
                            {rate.symbol}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-extrabold ${
                          isPositive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isNegative
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp size={13} />
                        ) : isNegative ? (
                          <TrendingDown size={13} />
                        ) : null}

                        {isPositive
                          ? "+"
                          : isNegative
                          ? "-"
                          : ""}

                        {formatPercent(
                          rate.change_percent
                        )}
                        ٪
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black tracking-tight text-[#1C3324]">
                          {formatNumber(
                            rate.price
                          )}
                        </span>

                        <span className="text-xs font-bold text-[#3A5A46]">
                          {getPersianUnit(
                            rate.unit
                          )}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-xs text-[#3A5A46]">
                        <span>
                          تغییر:
                        </span>

                        <span
                          className={
                            isPositive
                              ? "font-black text-emerald-700"
                              : isNegative
                              ? "font-black text-rose-700"
                              : "font-semibold text-neutral-500"
                          }
                        >
                          {rate.change_value >
                          0
                            ? "+"
                            : ""}
                          {formatNumber(
                            rate.change_value
                          )}{" "}
                          {getPersianUnit(
                            rate.unit
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-[#1C3324]/10 pt-3 text-[11px] font-medium text-[#3A5A46]">
                      <div className="flex items-center gap-1.5">
                        <Clock3 size={13} />

                        <span>
                          {rate.market_time ||
                            "—"}
                        </span>
                      </div>

                      <span>
                        {rate.market_date ||
                          "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer information */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs">
            <div className="mb-4 flex items-center gap-2">
              <History
                size={18}
                className="text-[#8B263E]"
              />

              <h3 className="text-sm font-black text-[#1C3324]">
                وضعیت منبع
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#3A5A46] font-bold">
                  منبع نرخ
                </span>

                <span className="font-black text-[#1C3324]">
                  BRS API
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#3A5A46] font-bold">
                  وضعیت
                </span>

                <span className="flex items-center gap-1.5 font-black text-emerald-700">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
                  متصل
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#3A5A46] font-bold">
                  آخرین درخواست
                </span>

                <span className="font-bold text-[#1C3324]">
                  {lastSync
                    ? new Date(
                        lastSync
                      ).toLocaleTimeString(
                        "fa-IR"
                      )
                    : "هنوز در این صفحه انجام نشده"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#3A5A46] font-bold">
                  بروزرسانی خودکار
                </span>

                <span
                  className={`font-black ${
                    autoUpdate
                      ? "text-emerald-700"
                      : "text-neutral-400"
                  }`}
                >
                  {autoUpdate
                    ? "هر ۱ دقیقه"
                    : "خاموش"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs">
            <div className="mb-4 flex items-center gap-2">
              <BellRing
                size={18}
                className="text-[#8B263E]"
              />

              <h3 className="text-sm font-black text-[#1C3324]">
                سیستم هشدار قیمت
              </h3>
            </div>

            <p className="text-xs leading-7 text-[#3A5A46]">
              هر یک دقیقه قیمت‌های بازار از BRS بررسی می‌شوند. اگر قیمت یکی از نرخ‌ها نسبت به آخرین بررسی تغییر کرده باشد، هشدار تغییر قیمت نمایش داده می‌شود.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 size={13} />
                هشدار داخل صفحه
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B263E]/10 border border-[#8B263E]/20 px-3 py-1.5 text-xs font-bold text-[#8B263E]">
                {soundEnabled ? (
                  <Volume2 size={13} />
                ) : (
                  <VolumeX size={13} />
                )}
                صدای هشدار
              </span>

              {notificationPermission ===
                "granted" && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-700">
                  <Bell size={13} />
                  اعلان مرورگر
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col gap-2 text-center text-xs font-bold text-[#3A5A46] sm:flex-row sm:items-center sm:justify-between pt-2">
          <span>
            سروین استودیو • مدیریت نرخ بازار طلا
          </span>

          <span className="inline-flex items-center justify-center gap-1">
            <ExternalLink size={12} />
            اطلاعات بازار از BRS API
          </span>
        </div>
      </div>
    </main>
  );
}