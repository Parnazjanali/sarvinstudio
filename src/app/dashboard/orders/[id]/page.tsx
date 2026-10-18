"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  User,
  X,
  XCircle,
  Truck,
  Receipt,
} from "lucide-react";
import { ClientResponseError } from "pocketbase";
import pb from "@/lib/pocketbase";

type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "delivered"
  | "cancelled";

type PaymentStatus =
  | "unpaid"
  | "paid"
  | "failed"
  | "refunded";

interface UserRecord {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
}

interface AddressRecord {
  id: string;
  province?: string;
  city?: string;
  street?: string;
  fullAddress?: string;
  postalCode?: string;
  [key: string]: unknown;
}

interface OrderRecord {
  id: string;
  orderNumber?: string;

  user?: string;

  status?: OrderStatus;
  paymentStatus?: PaymentStatus;

  totalAmount?: number | string;

  shippingFullName?: string;
  shippingProvince?: string;
  shippingPhone?: string;
  shippingPostalCode?: string;
  shippingMethod?: string;
  shippingCost?: number | string;

  address?: string;

  created?: string;
  updated?: string;

  expand?: {
    user?: UserRecord;
    address?: AddressRecord;
  };
}

function numberValue(value: unknown): number {
  const normalizedValue =
    typeof value === "string"
      ? value.replace(/[۰-۹]/g, (digit) =>
          String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
        )
      : value;

  const number = Number(normalizedValue);

  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value: unknown): string {
  return numberValue(value).toLocaleString("fa-IR");
}

function formatDate(dateString?: string): string {
  if (!dateString) return "-";

  try {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateString;
  }
}

function renderStatusBadge(status?: OrderStatus) {
  switch (status) {
    case "pending":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
          <Clock className="h-3.5 w-3.5" />
          در انتظار بررسی
        </span>
      );

    case "paid":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          پرداخت شده
        </span>
      );

    case "processing":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300">
          <RefreshCw className="h-3.5 w-3.5" />
          در حال آماده‌سازی
        </span>
      );

    case "delivered":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 dark:border-teal-900/50 dark:bg-teal-950/40 dark:text-teal-300">
          <PackageCheck className="h-3.5 w-3.5" />
          تحویل شده
        </span>
      );

    case "cancelled":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <XCircle className="h-3.5 w-3.5" />
          لغو شده
        </span>
      );

    default:
      return (
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
          نامشخص
        </span>
      );
  }
}

function renderPaymentBadge(status?: PaymentStatus) {
  switch (status) {
    case "paid":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          پرداخت موفق
        </span>
      );

    case "unpaid":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <Clock className="h-3.5 w-3.5" />
          پرداخت نشده
        </span>
      );

    case "failed":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          <XCircle className="h-3.5 w-3.5" />
          پرداخت ناموفق
        </span>
      );

    case "refunded":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
          <RotateCcw className="h-3.5 w-3.5" />
          مسترد شده
        </span>
      );

    default:
      return (
        <span className="text-xs text-slate-400">
          -
        </span>
      );
  }
}

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const orderId =
    typeof params.id === "string"
      ? params.id
      : "";

  const [order, setOrder] =
    useState<OrderRecord | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isUpdating, setIsUpdating] =
    useState(false);

  const [error, setError] =
    useState("");

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;

    setIsLoading(true);
    setError("");

    try {
      const record =
        await pb
          .collection("orders")
          .getOne<OrderRecord>(orderId, {
            expand: "user,address",
            requestKey: null,
          });

      setOrder(record);
    } catch (err) {
      console.error(
        "PocketBase fetch order error:",
        err
      );

      if (err instanceof ClientResponseError) {
        console.error(
          "PocketBase response:",
          err.response
        );
      }

      setError(
        "سفارش پیدا نشد یا امکان دریافت آن وجود ندارد."
      );
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void fetchOrder();
  }, [fetchOrder]);

  const updateOrderStatus = async (
    newStatus: OrderStatus
  ) => {
    if (!order) return;

    setIsUpdating(true);
    setError("");

    try {
      const updated =
        await pb
          .collection("orders")
          .update<OrderRecord>(
            order.id,
            {
              status: newStatus,
            }
          );

      setOrder((current) =>
        current
          ? {
              ...current,
              ...updated,
            }
          : updated
      );
    } catch (err) {
      console.error(
        "PocketBase update order error:",
        err
      );

      if (err instanceof ClientResponseError) {
        console.error(
          "Response:",
          err.response
        );

        setError(
          err.response?.message ||
            "خطا در تغییر وضعیت سفارش."
        );
      } else {
        setError(
          "خطا در تغییر وضعیت سفارش."
        );
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const updatePaymentStatus = async (
    newPaymentStatus: PaymentStatus
  ) => {
    if (!order) return;

    setIsUpdating(true);
    setError("");

    try {
      const updated =
        await pb
          .collection("orders")
          .update<OrderRecord>(
            order.id,
            {
              paymentStatus:
                newPaymentStatus,
            }
          );

      setOrder((current) =>
        current
          ? {
              ...current,
              ...updated,
            }
          : updated
      );
    } catch (err) {
      console.error(
        "PocketBase update payment error:",
        err
      );

      if (err instanceof ClientResponseError) {
        setError(
          err.response?.message ||
            "خطا در تغییر وضعیت پرداخت."
        );
      } else {
        setError(
          "خطا در تغییر وضعیت پرداخت."
        );
      }
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950"
      >
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="h-7 w-7 animate-spin text-amber-500" />
          <span className="text-sm font-bold">
            در حال دریافت سفارش...
          </span>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-slate-50 p-6 dark:bg-zinc-950"
      >
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-bold">
                {error || "سفارش پیدا نشد."}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/dashboard/orders")
              }
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white dark:bg-white dark:text-zinc-900"
            >
              <ArrowRight className="h-4 w-4" />
              بازگشت به سفارش‌ها
            </button>
          </div>
        </div>
      </div>
    );
  }

  const customerName =
    order.shippingFullName ||
    order.expand?.user?.name ||
    "خریدار مهمان";

  const customerPhone =
    order.shippingPhone ||
    order.expand?.user?.phone ||
    "-";

  const address =
    order.expand?.address;

  const fullAddress =
    address?.fullAddress ||
    address?.street ||
    "";

  const province =
    address?.province ||
    order.shippingProvince ||
    "";

  const city =
    address?.city ||
    "";

  const postalCode =
    address?.postalCode ||
    order.shippingPostalCode ||
    "";

  const shippingCost =
    numberValue(order.shippingCost);

  const totalAmount =
    numberValue(order.totalAmount);

  return (
    <div
      dir="rtl"
      className="min-h-screen space-y-6 bg-slate-50/60 p-4 font-sans text-slate-800 dark:bg-zinc-950 dark:text-zinc-100 sm:p-6 lg:p-8"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/orders")
            }
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-amber-300 hover:text-amber-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
            title="بازگشت"
          >
            <ArrowRight className="h-5 w-5" />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                سفارش #{order.orderNumber || order.id}
              </h1>

              {renderStatusBadge(order.status)}
            </div>

            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-zinc-400">
              ثبت شده در {formatDate(order.created)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/invoices?order=${order.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-amber-500/10"
          >
            <Receipt className="h-4 w-4" />
            مشاهده فاکتور
          </Link>

          <button
            type="button"
            onClick={() => void fetchOrder()}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <RefreshCw className="h-4 w-4" />
            بروزرسانی
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main grid */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Right / Main */}
        <div className="space-y-6 xl:col-span-2">
          {/* Order summary */}
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-amber-600" />

                <h2 className="text-sm font-black">
                  اطلاعات سفارش
                </h2>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-zinc-800/60">
                <p className="text-[10px] font-bold text-slate-400">
                  شماره سفارش
                </p>

                <p className="mt-2 font-mono text-sm font-black">
                  {order.orderNumber || order.id}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-zinc-800/60">
                <p className="text-[10px] font-bold text-slate-400">
                  تاریخ ثبت
                </p>

                <p className="mt-2 text-xs font-bold">
                  {formatDate(order.created)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-zinc-800/60">
                <p className="text-[10px] font-bold text-slate-400">
                  آخرین بروزرسانی
                </p>

                <p className="mt-2 text-xs font-bold">
                  {formatDate(order.updated)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-zinc-800/60">
                <p className="mb-2 text-[10px] font-bold text-slate-400">
                  وضعیت سفارش
                </p>

                {renderStatusBadge(order.status)}
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-zinc-800/60">
                <p className="mb-2 text-[10px] font-bold text-slate-400">
                  وضعیت پرداخت
                </p>

                {renderPaymentBadge(
                  order.paymentStatus
                )}
              </div>

              <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/20">
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  مبلغ کل سفارش
                </p>

                <p className="mt-2 text-lg font-black text-amber-700 dark:text-amber-400">
                  {formatMoney(totalAmount)}
                  <span className="mr-1 text-[9px] font-medium">
                    تومان
                  </span>
                </p>
              </div>
            </div>
          </section>

          {/* Customer */}
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-amber-600" />

                <h2 className="text-sm font-black">
                  اطلاعات خریدار
                </h2>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold text-slate-400">
                  نام و نام خانوادگی
                </p>

                <div className="mt-2 flex items-center gap-2 text-sm font-black">
                  <User className="h-4 w-4 text-slate-400" />
                  {customerName}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400">
                  شماره تماس
                </p>

                <div className="mt-2 flex items-center gap-2 font-mono text-sm font-black">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {customerPhone}
                </div>
              </div>

              {order.expand?.user?.email && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400">
                    ایمیل
                  </p>

                  <p className="mt-2 text-xs font-bold">
                    {order.expand.user.email}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Shipping */}
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-amber-600" />

                <h2 className="text-sm font-black">
                  اطلاعات ارسال
                </h2>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold text-slate-400">
                    روش ارسال
                  </p>

                  <div className="mt-2 flex items-center gap-2 text-xs font-bold">
                    <Truck className="h-4 w-4 text-slate-400" />

                    {order.shippingMethod || "ثبت نشده"}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400">
                    استان
                  </p>

                  <p className="mt-2 text-xs font-bold">
                    {province || "ثبت نشده"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400">
                  آدرس کامل
                </p>

                <div className="mt-2 flex items-start gap-2 rounded-2xl bg-slate-50 p-4 text-xs font-medium leading-6 dark:bg-zinc-800/60">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-amber-600" />

                  <span>
                    {city && `${city}، `}
                    {fullAddress ||
                      "آدرس کامل ثبت نشده"}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold text-slate-400">
                    کد پستی
                  </p>

                  <p className="mt-2 font-mono text-xs font-black">
                    {postalCode || "ثبت نشده"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400">
                    هزینه ارسال
                  </p>

                  <p className="mt-2 text-xs font-black">
                    {formatMoney(shippingCost)}
                    <span className="mr-1 text-[9px] font-medium text-slate-400">
                      تومان
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Financial summary */}
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-600" />

                <h2 className="text-sm font-black">
                  خلاصه مالی سفارش
                </h2>
              </div>
            </div>

            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">
                  مبلغ سفارش
                </span>

                <span className="font-black">
                  {formatMoney(totalAmount)} تومان
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">
                  هزینه ارسال
                </span>

                <span className="font-black">
                  {formatMoney(shippingCost)} تومان
                </span>
              </div>

              <div className="border-t border-slate-100 pt-4 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">
                    مبلغ کل
                  </span>

                  <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                    {formatMoney(totalAmount)}
                    <span className="mr-1 text-[10px]">
                      تومان
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Left sidebar */}
        <div className="space-y-6">
          {/* Status management */}
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-zinc-800">
              <h2 className="text-sm font-black">
                مدیریت سفارش
              </h2>

              <p className="mt-1 text-[10px] text-slate-400">
                تغییر وضعیت سفارش
              </p>
            </div>

            <div className="space-y-2 p-5">
              {order.status === "pending" && (
                <>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() =>
                      void updateOrderStatus(
                        "processing"
                      )
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}

                    تأیید و آماده‌سازی سفارش
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() =>
                      void updateOrderStatus(
                        "cancelled"
                      )
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
                  >
                    <X className="h-4 w-4" />
                    لغو سفارش
                  </button>
                </>
              )}

              {order.status === "paid" && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() =>
                    void updateOrderStatus(
                      "processing"
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  شروع آماده‌سازی
                </button>
              )}

              {order.status === "processing" && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() =>
                    void updateOrderStatus(
                      "delivered"
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-teal-700 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <PackageCheck className="h-4 w-4" />
                  )}

                  ثبت تحویل سفارش
                </button>
              )}

              {order.status === "delivered" && (
                <div className="rounded-2xl bg-teal-50 p-4 text-center dark:bg-teal-950/20">
                  <PackageCheck className="mx-auto h-7 w-7 text-teal-600 dark:text-teal-400" />

                  <p className="mt-2 text-xs font-black text-teal-700 dark:text-teal-400">
                    سفارش تکمیل شده است
                  </p>
                </div>
              )}

              {order.status === "cancelled" && (
                <div className="rounded-2xl bg-rose-50 p-4 text-center dark:bg-rose-950/20">
                  <XCircle className="mx-auto h-7 w-7 text-rose-500" />

                  <p className="mt-2 text-xs font-black text-rose-700 dark:text-rose-400">
                    این سفارش لغو شده است
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Payment management */}
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-600" />

                <h2 className="text-sm font-black">
                  وضعیت پرداخت
                </h2>
              </div>
            </div>

            <div className="p-5">
              <div className="mb-4">
                {renderPaymentBadge(
                  order.paymentStatus
                )}
              </div>

              {order.paymentStatus === "unpaid" &&
                order.status !== "cancelled" && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() =>
                      void updatePaymentStatus(
                        "paid"
                      )
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}

                    تأیید پرداخت
                  </button>
                )}

              {order.paymentStatus === "paid" && (
                <div className="rounded-xl bg-emerald-50 p-3 text-center text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                  پرداخت این سفارش با موفقیت ثبت شده است.
                </div>
              )}
            </div>
          </section>

          {/* Invoice */}
          <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
            <Receipt className="h-6 w-6 text-amber-600 dark:text-amber-400" />

            <h2 className="mt-3 text-sm font-black text-slate-900 dark:text-white">
              فاکتور سفارش
            </h2>

            <p className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-zinc-400">
              جزئیات مالی، پرداخت و تسویه فاکتور در بخش فاکتورها مدیریت می‌شود.
            </p>

            <Link
              href={`/dashboard/invoices?order=${order.id}`}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-amber-700"
            >
              <Receipt className="h-4 w-4" />
              مشاهده فاکتور
            </Link>
          </section>

          {/* Internal IDs */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-[10px] font-bold text-slate-400">
              شناسه سفارش
            </p>

            <p className="mt-2 break-all font-mono text-[10px] font-bold text-slate-600 dark:text-zinc-400">
              {order.id}
            </p>

            {order.user && (
              <>
                <p className="mt-4 text-[10px] font-bold text-slate-400">
                  شناسه کاربر
                </p>

                <p className="mt-2 break-all font-mono text-[10px] font-bold text-slate-600 dark:text-zinc-400">
                  {order.user}
                </p>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}