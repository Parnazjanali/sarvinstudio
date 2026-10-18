"use client";

import React, { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";

import { pb } from "@/lib/pocketbase";

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
    | "settings";

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
  const [categoryFilter, setCategoryFilter] =
    useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = pb.authStore.token;

      if (!token) {
        throw new Error(
          "توکن احراز هویت پیدا نشد. لطفاً دوباره وارد شوید.",
        );
      }

      const params = new URLSearchParams();

      params.set("page", "1");
      params.set("perPage", "100");

      if (categoryFilter !== "all") {
        params.set("category", categoryFilter);
      }

      if (searchTerm.trim()) {
        params.set("search", searchTerm.trim());
      }

      const response = await fetch(
        `/api/admin/logs?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "پاسخ نامعتبر از سرور دریافت شد.",
        );
      }

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "دریافت لاگ‌ها انجام نشد.",
        );
      }

      setLogs(
        Array.isArray(data.items)
          ? data.items
          : [],
      );
    } catch (error) {
      console.error(
        "Load admin logs error:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "خطا در دریافت لاگ‌ها",
      );

      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadLogs]);

  const getCategoryBadge = (
    category: AuditLog["category"],
  ) => {
    switch (category) {
      case "price":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#1C3324]/15 bg-white px-3 py-1 text-xs font-bold text-[#1C3324] shadow-xs">
            <Coins className="h-3.5 w-3.5 text-[#8B263E]" />
            نرخ طلا
          </span>
        );

      case "order":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 shadow-xs">
            <ShoppingCart className="h-3.5 w-3.5" />
            سفارشات
          </span>
        );

      case "stock":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 shadow-xs">
            <Box className="h-3.5 w-3.5" />
            انبار
          </span>
        );

      case "auth":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 shadow-xs">
            <User className="h-3.5 w-3.5" />
            احراز هویت
          </span>
        );

      case "settings":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#1C3324]/15 bg-[#FAF9F6] px-3 py-1 text-xs font-bold text-[#3A5A46] shadow-xs">
            <Shield className="h-3.5 w-3.5 text-[#8B263E]" />
            تنظیمات
          </span>
        );

      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#1C3324]/15 bg-[#FAF9F6] px-3 py-1 text-xs font-bold text-[#3A5A46] shadow-xs">
            نامشخص
          </span>
        );
    }
  };

  const getLevelBadge = (
    level: AuditLog["level"],
  ) => {
    switch (level) {
      case "info":
        return (
          <span
            className="inline-flex items-center justify-center rounded-full text-emerald-600"
            title="عادی"
          >
            <CheckCircle2 className="h-4 w-4" />
          </span>
        );

      case "warning":
        return (
          <span
            className="inline-flex items-center justify-center rounded-full text-amber-600"
            title="هشدار"
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
        );

      case "error":
        return (
          <span
            className="inline-flex items-center justify-center rounded-full text-rose-600"
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
    <div className="min-h-screen space-y-6 bg-[#FAF9F6] px-4 py-6 font-sans text-[#1C3324] sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1C3324] text-white shadow-xs">
              <ScrollText className="h-5 w-5" />
            </div>

            <h1 className="text-xl font-black text-[#1C3324]">
              لاگ رویدادها و فعالیت‌های سیستم
            </h1>
          </div>

          <p className="mt-2 text-xs font-medium text-[#3A5A46]">
            رهگیری فعالیت‌ها، تغییرات قیمت، سفارش‌ها، کاربران و تنظیمات سیستم سروین استودیو
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#1C3324]/15 bg-white px-5 py-3 text-xs font-black text-[#1C3324] shadow-xs transition hover:border-[#8B263E] hover:bg-[#8B263E]/5 hover:text-[#8B263E] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? "animate-spin text-[#8B263E]" : ""
            }`}
          />
          بروزرسانی لاگ‌ها
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 shadow-xs">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-100">
            <AlertCircle className="h-4 w-4" />
          </div>

          <div className="leading-6">
            <div className="mb-0.5 font-black">
              خطا در دریافت لاگ‌ها
            </div>
            <div className="font-medium">
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3A5A46]" />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              placeholder="جستجو در لاگ‌ها، اپراتور، کد یا شرح رویداد..."
              className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] py-3.5 pl-4 pr-11 text-xs font-bold text-[#1C3324] outline-none transition placeholder:text-[#3A5A46]/60 focus:border-[#1C3324] focus:bg-white"
            />
          </div>

          {/* Category */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 shrink-0 text-[#3A5A46]" />

            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value)
              }
              className="rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-4 py-3.5 text-xs font-black text-[#1C3324] outline-none transition focus:border-[#1C3324] cursor-pointer"
            >
              <option value="all">
                همه دسته‌ها
              </option>
              <option value="price">
                نرخ طلا
              </option>
              <option value="order">
                سفارشات
              </option>
              <option value="stock">
                انبار و موجودی
              </option>
              <option value="auth">
                احراز هویت
              </option>
              <option value="settings">
                تنظیمات
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-[2rem] border border-[#1C3324]/15 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-right text-xs">
            {/* Table Header */}
            <thead className="border-b border-[#1C3324]/10 bg-[#FAF9F6] font-black text-[#1C3324]">
              <tr>
                <th className="px-5 py-4 text-center">
                  وضعیت
                </th>
                <th className="px-5 py-4">
                  کد لاگ
                </th>
                <th className="px-5 py-4">
                  دسته‌بندی
                </th>
                <th className="px-5 py-4">
                  شرح رویداد
                </th>
                <th className="px-5 py-4">
                  عامل / اپراتور
                </th>
                <th className="px-5 py-4">
                  آدرس IP
                </th>
                <th className="px-5 py-4">
                  زمان ثبت
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[#1C3324]/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-20 text-center text-xs text-[#3A5A46]"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E]">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                      </div>
                      <span className="font-bold">
                        در حال دریافت لاگ‌ها...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-20 text-center text-xs text-[#3A5A46]"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6]">
                        <ScrollText className="h-7 w-7 text-[#8B263E]" />
                      </div>
                      <span className="font-black text-[#1C3324]">
                        هیچ لاگی برای نمایش وجود ندارد.
                      </span>

                      {searchTerm ||
                      categoryFilter !== "all" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm("");
                            setCategoryFilter(
                              "all",
                            );
                          }}
                          className="text-xs font-bold text-[#8B263E] underline underline-offset-4 cursor-pointer"
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
                    className="group transition-colors hover:bg-[#FAF9F6]"
                  >
                    {/* Level */}
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center">
                        {getLevelBadge(
                          log.level,
                        )}
                      </div>
                    </td>

                    {/* Code */}
                    <td className="px-5 py-4">
                      <span className="rounded-xl border border-[#1C3324]/10 bg-[#FAF9F6] px-2.5 py-1 font-mono text-[11px] font-bold text-[#1C3324]">
                        {log.logCode}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4">
                      {getCategoryBadge(
                        log.category,
                      )}
                    </td>

                    {/* Description */}
                    <td className="px-5 py-4">
                      <div className="max-w-[420px]">
                        <span className="block font-black text-[#1C3324]">
                          {log.title}
                        </span>

                        {log.description && (
                          <span className="mt-1 block text-[11px] font-medium leading-5 text-[#3A5A46]">
                            {log.description}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Operator */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1C3324] text-white">
                          <User className="h-3.5 w-3.5" />
                        </div>

                        <span className="font-bold text-[#1C3324]">
                          {log.operator || "-"}
                        </span>
                      </div>
                    </td>

                    {/* IP */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-medium text-[#3A5A46]">
                        {log.ipAddress || "-"}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-bold text-[#3A5A46]">
                        {formatDate(
                          log.created ||
                            log.timestamp,
                        )}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      {!loading && logs.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-3xl border border-[#1C3324]/15 bg-white px-6 py-4 shadow-xs">
          <span className="text-xs font-black text-[#1C3324]">
            وضعیت رویداد:
          </span>

          <div className="flex items-center gap-1.5 text-xs font-bold text-[#3A5A46]">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            عادی
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-[#3A5A46]">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            هشدار
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-[#3A5A46]">
            <XCircle className="h-4 w-4 text-rose-600" />
            خطا
          </div>

          <span className="mr-auto text-xs font-bold text-[#3A5A46]">
            {logs.length.toLocaleString("fa-IR")} رویداد ثبت‌شده
          </span>
        </div>
      )}
    </div>
  );
}