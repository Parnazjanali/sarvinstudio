"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  ScrollText,
  Shield,
  Coins,
  ShoppingCart,
  Box,
  User,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Receipt,
  Radio,
  Clock,
  Sparkles,
} from "lucide-react";

import { pb } from "@/lib/pocketbase";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";

interface AuditLog {
  id: string;
  collectionId?: string;
  collectionName?: string;
  created?: string;
  updated?: string;

  logCode: string;

  category:
    | "price"
    | "order"
    | "stock"
    | "auth"
    | "settings"
    | "invoice";

  title: string;
  description: string;
  operator: string;
  operatorId?: string;
  ipAddress: string;

  timestamp?: string;

  level: "info" | "warning" | "error";

  targetId?: string;
  targetType?: string;

  metadata?: Record<string, unknown>;
}

const formatDate = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
};

export default function DashboardLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLiveActive, setIsLiveActive] = useState(true);

  const stats = useMemo(() => {
    const total = logs.length;
    const price = logs.filter((l) => l.category === "price").length;
    const orderAndInvoice = logs.filter(
      (l) => l.category === "order" || l.category === "invoice"
    ).length;
    const stock = logs.filter((l) => l.category === "stock").length;
    const errorsAndWarnings = logs.filter(
      (l) => l.level === "error" || l.level === "warning"
    ).length;

    return { total, price, orderAndInvoice, stock, errorsAndWarnings };
  }, [logs]);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let loadedItems: AuditLog[] = [];

      // روش ۱: استفاده مستقیم از PocketBase SDK (پشتیبانی کامل از توکن کاربر و سوپریوزر)
      if (pb.authStore.isValid) {
        try {
          const filterParts: string[] = [];

          if (categoryFilter !== "all") {
            filterParts.push(`category = "${categoryFilter}"`);
          }

          if (searchTerm.trim()) {
            const safe = searchTerm.trim().replace(/"/g, '\\"');
            filterParts.push(
              `(title ~ "${safe}" || description ~ "${safe}" || operator ~ "${safe}" || logCode ~ "${safe}")`
            );
          }

          const res = await pb.collection("audit_logs").getList(1, 100, {
            sort: "-created",
            filter: filterParts.length > 0 ? filterParts.join(" && ") : undefined,
            requestKey: null,
          });

          loadedItems = res.items as unknown as AuditLog[];
        } catch (pbErr) {
          console.warn("Direct PB fetch failed, falling back to API route:", pbErr);
        }
      }

      // روش ۲: اگر با متد مستقیم دریافت نشد، از API Route درخواست کن
      if (loadedItems.length === 0 && pb.authStore.token) {
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("perPage", "100");

        if (categoryFilter !== "all") {
          params.set("category", categoryFilter);
        }

        if (searchTerm.trim()) {
          params.set("search", searchTerm.trim());
        }

        const response = await fetch(`/api/admin/logs?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${pb.authStore.token}`,
          },
          cache: "no-store",
        });

        if (response.ok) {
          const data = await response.json();
          loadedItems = data.items || [];
        }
      }

      setLogs(loadedItems);
    } catch (err: unknown) {
      console.error("Error loading logs:", err);
      setError(
        err instanceof Error
          ? err.message
          : "خطای ناشناخته در بارگذاری خودکار لاگ‌ها"
      );
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchTerm]);

  // بارگذاری اولیه و هنگام تغییر فیلترها
  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs();
    }, 200);

    return () => clearTimeout(timer);
  }, [loadLogs]);

  // اشتراک لحظه‌ای (Real-time Live WebSocket) برای دریافت خودکار لاگ‌ها
  useEffect(() => {
    let isSubscribed = true;
    let unsubscribeFn: (() => void) | null = null;

    const setupRealtime = async () => {
      try {
        const unsub = await pb.collection("audit_logs").subscribe("*", (e) => {
          if (!isSubscribed) return;

          if (e.action === "create") {
            const newRecord = e.record as unknown as AuditLog;
            setLogs((prev) => {
              if (prev.some((item) => item.id === newRecord.id)) return prev;
              return [newRecord, ...prev];
            });
          } else if (e.action === "delete") {
            setLogs((prev) => prev.filter((item) => item.id !== e.record.id));
          } else if (e.action === "update") {
            const updated = e.record as unknown as AuditLog;
            setLogs((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item))
            );
          }
        });

        unsubscribeFn = unsub;
        setIsLiveActive(true);
      } catch (err) {
        console.warn("Real-time audit log subscription error:", err);
        setIsLiveActive(false);
      }
    };

    void setupRealtime();

    // همگام‌سازی دوره‌ای در پس‌زمینه هر ۲۵ ثانیه
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadLogs();
      }
    }, 25000);

    return () => {
      isSubscribed = false;
      if (unsubscribeFn) unsubscribeFn();
      clearInterval(interval);
    };
  }, [loadLogs]);

  const getCategoryBadge = (category: AuditLog["category"]) => {
    switch (category) {
      case "price":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 shadow-xs dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-[#D8B65C]">
            <Coins className="h-3.5 w-3.5" />
            نرخ طلا
          </span>
        );

      case "invoice":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 shadow-xs dark:border-indigo-800/40 dark:bg-indigo-950/40 dark:text-indigo-300">
            <Receipt className="h-3.5 w-3.5" />
            فاکتور طلا
          </span>
        );

      case "order":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 shadow-xs dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
            <ShoppingCart className="h-3.5 w-3.5" />
            سفارشات
          </span>
        );

      case "stock":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 shadow-xs dark:border-rose-800/40 dark:bg-rose-950/40 dark:text-rose-300">
            <Box className="h-3.5 w-3.5" />
            انبار و ویترین
          </span>
        );

      case "auth":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 shadow-xs dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-300">
            <User className="h-3.5 w-3.5" />
            احراز هویت
          </span>
        );

      case "settings":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#1C3324]/15 bg-[#FAF9F6] px-3 py-1 text-xs font-bold text-[#3A5A46] shadow-xs dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300">
            <Shield className="h-3.5 w-3.5 text-[#8B263E] dark:text-[#D8B65C]" />
            تنظیمات
          </span>
        );

      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#1C3324]/15 bg-[#FAF9F6] px-3 py-1 text-xs font-bold text-[#3A5A46] shadow-xs dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300">
            عمومی
          </span>
        );
    }
  };

  const getLevelBadge = (level: AuditLog["level"]) => {
    switch (level) {
      case "info":
        return (
          <span
            className="inline-flex items-center justify-center rounded-full text-emerald-600 dark:text-emerald-400"
            title="عادی"
          >
            <CheckCircle2 className="h-4 w-4" />
          </span>
        );

      case "warning":
        return (
          <span
            className="inline-flex items-center justify-center rounded-full text-amber-600 dark:text-amber-400"
            title="هشدار"
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
        );

      case "error":
        return (
          <span
            className="inline-flex items-center justify-center rounded-full text-rose-600 dark:text-rose-400"
            title="خطا"
          >
            <XCircle className="h-4 w-4" />
          </span>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-[#1C3324]/12 bg-white/80 p-5 shadow-xs backdrop-blur-md transition-colors sm:flex-row sm:items-center lg:p-6 dark:border-white/10 dark:bg-[#15221B]/80">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1C3324] text-white shadow-xs dark:bg-emerald-950/60 dark:text-[#D8B65C] dark:border dark:border-[#D8B65C]/30">
              <ScrollText className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-[#1C3324] dark:text-zinc-100">
                  لاگ رویدادها و فعالیت‌های خودکار سیستم
                </h1>
                {isLiveActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <Radio className="h-3 w-3 animate-pulse text-emerald-600 dark:text-emerald-400" />
                    زنده
                  </span>
                )}
              </div>
            </div>
          </div>

          <p className="mt-2 text-xs font-medium text-[#3A5A46] dark:text-zinc-400">
            کلیه تغییرات قیمت طلا، ثبت فاکتورها، وضعیت سفارش‌ها، تغییرات ویترین و لاگین‌ها به صورت خودکار ثبت و رصد می‌شوند.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#1C3324]/15 bg-white px-5 py-3 text-xs font-black text-[#1C3324] shadow-xs transition hover:border-[#8B263E] hover:bg-[#8B263E]/5 hover:text-[#8B263E] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer dark:border-white/10 dark:bg-[#101813] dark:text-zinc-200 dark:hover:border-[#D8B65C] dark:hover:text-[#D8B65C]"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? "animate-spin text-[#8B263E] dark:text-[#D8B65C]" : ""
            }`}
          />
          بروزرسانی لاگ‌ها
        </button>
      </div>

      {/* 4 Stat Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          title="کل رویدادهای خودکار"
          value={stats.total.toLocaleString("fa-IR")}
          unit="لاگ"
          accent="emerald"
          icon={ScrollText}
          description="ثبت سیستمی کلیه تغییرات و وقایع"
          isLoading={loading}
        />
        <DashboardStatCard
          title="رویدادهای نرخ طلا"
          value={stats.price.toLocaleString("fa-IR")}
          unit="تغییر نرخ"
          accent="gold"
          icon={Coins}
          description="همگام‌سازی خودکار و نوسانات بازار"
          isLoading={loading}
        />
        <DashboardStatCard
          title="فاکتورها و سفارشات"
          value={stats.orderAndInvoice.toLocaleString("fa-IR")}
          unit="تراکنش"
          accent="blue"
          icon={ShoppingCart}
          description="صدور فاکتور و تغییرات وضعیت سفارش"
          isLoading={loading}
        />
        <DashboardStatCard
          title="هشدارها و خطاهای سیستم"
          value={stats.errorsAndWarnings.toLocaleString("fa-IR")}
          unit="مورد"
          accent="crimson"
          icon={AlertTriangle}
          description="موارد نیازمند بررسی توسط مدیریت"
          secondaryInfo={{
            label: "وضعیت سیستم",
            value: stats.errorsAndWarnings > 0 ? "نیازمند بررسی" : "کاملاً پایدار",
            highlight: stats.errorsAndWarnings > 0,
          }}
          isLoading={loading}
        />
      </section>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 shadow-xs dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/50">
            <AlertCircle className="h-4 w-4" />
          </div>

          <div className="leading-6">
            <div className="mb-0.5 font-black">خطا در دریافت لاگ‌ها</div>
            <div className="font-medium">{error}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-3xl border border-[#1C3324]/12 bg-white/80 p-4 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3A5A46] dark:text-zinc-400" />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو در شرح رویداد، اپراتور، کد لاگ یا شناسه..."
              className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] py-3 pl-4 pr-11 text-xs font-bold text-[#1C3324] outline-none transition placeholder:text-[#3A5A46]/60 focus:border-[#1C3324] focus:bg-white dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[#D8B65C]"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 shrink-0 text-[#3A5A46] dark:text-zinc-400" />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-4 py-3 text-xs font-black text-[#1C3324] outline-none transition focus:border-[#1C3324] cursor-pointer dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100 dark:focus:border-[#D8B65C]"
            >
              <option value="all" className="dark:bg-[#101813]">
                همه دسته‌ها
              </option>
              <option value="price" className="dark:bg-[#101813]">
                نرخ طلا و ارز
              </option>
              <option value="invoice" className="dark:bg-[#101813]">
                فاکتورهای رسمی
              </option>
              <option value="order" className="dark:bg-[#101813]">
                سفارشات مشتریان
              </option>
              <option value="stock" className="dark:bg-[#101813]">
                انبار و ویترین محصولات
              </option>
              <option value="auth" className="dark:bg-[#101813]">
                احراز هویت و ورود
              </option>
              <option value="settings" className="dark:bg-[#101813]">
                تنظیمات فروشگاه
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-[2rem] border border-[#1C3324]/12 bg-white/80 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-right text-xs">
            {/* Table Header */}
            <thead className="border-b border-[#1C3324]/10 bg-[#FAF9F6]/80 font-black text-[#1C3324] dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-200">
              <tr>
                <th className="px-5 py-4 text-center">وضعیت</th>
                <th className="px-5 py-4">کد لاگ</th>
                <th className="px-5 py-4">دسته‌بندی</th>
                <th className="px-5 py-4">شرح رویداد</th>
                <th className="px-5 py-4">عامل / اپراتور</th>
                <th className="px-5 py-4">مبدا / IP</th>
                <th className="px-5 py-4">زمان ثبت</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[#1C3324]/5 dark:divide-white/5">
              {loading && logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-20 text-center text-xs text-[#3A5A46] dark:text-zinc-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E] dark:bg-rose-950/30 dark:text-rose-300">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                      </div>
                      <span className="font-bold">در حال دریافت لاگ‌های سیستمی...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-20 text-center text-xs text-[#3A5A46] dark:text-zinc-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] dark:border-white/10 dark:bg-zinc-900">
                        <ScrollText className="h-7 w-7 text-[#8B263E] dark:text-[#D8B65C]" />
                      </div>
                      <span className="font-black text-[#1C3324] dark:text-zinc-100">
                        هیچ رویدادی در این دسته‌بندی یافت نشد.
                      </span>

                      {searchTerm || categoryFilter !== "all" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm("");
                            setCategoryFilter("all");
                          }}
                          className="text-xs font-bold text-[#8B263E] underline underline-offset-4 cursor-pointer dark:text-[#D8B65C]"
                        >
                          پاک کردن فیلترها
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="group transition-colors hover:bg-[#FAF9F6] dark:hover:bg-white/[0.03]"
                  >
                    {/* Level */}
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center">
                        {getLevelBadge(log.level)}
                      </div>
                    </td>

                    {/* Code */}
                    <td className="px-5 py-4">
                      <span className="rounded-xl border border-[#1C3324]/10 bg-[#FAF9F6] px-2.5 py-1 font-mono text-[11px] font-bold text-[#1C3324] dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                        {log.logCode}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4">
                      {getCategoryBadge(log.category)}
                    </td>

                    {/* Description */}
                    <td className="px-5 py-4">
                      <div className="max-w-[420px]">
                        <span className="block font-black text-[#1C3324] dark:text-zinc-100">
                          {log.title}
                        </span>

                        {log.description && (
                          <span className="mt-1 block text-[11px] font-medium leading-5 text-[#3A5A46] dark:text-zinc-400">
                            {log.description}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Operator */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1C3324] text-white dark:bg-emerald-900 dark:text-[#D8B65C]">
                          <User className="h-3.5 w-3.5" />
                        </div>

                        <span className="font-bold text-[#1C3324] dark:text-zinc-200">
                          {log.operator || "سیستم خودکار"}
                        </span>
                      </div>
                    </td>

                    {/* IP */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-medium text-[#3A5A46] dark:text-zinc-400">
                        {log.ipAddress || "-"}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                        {formatDate(log.created || log.timestamp)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend & Summary */}
      {!loading && logs.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-3xl border border-[#1C3324]/12 bg-white/80 px-6 py-4 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80">
          <span className="text-xs font-black text-[#1C3324] dark:text-zinc-200">
            راهنمای وضعیت رویداد:
          </span>

          <div className="flex items-center gap-1.5 text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            عادی / موفق
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            هشدار / نیازمند توجه
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
            <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            خطای سیستمی
          </div>

          <span className="mr-auto text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
            {logs.length.toLocaleString("fa-IR")} رویداد خودکار ثبت‌شده
          </span>
        </div>
      )}
    </div>
  );
}