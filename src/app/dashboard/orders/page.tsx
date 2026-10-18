
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock3,
  XCircle,
  RefreshCw,
  ShoppingBag,
  Check,
  X,
  AlertCircle,
  User,
  Phone,
  MapPin,
  PackageCheck,
  CreditCard,
  RotateCcw,
  ChevronLeft,
  ArrowUpLeft,
  WalletCards,
  Truck,
  CircleDollarSign,
} from "lucide-react";
import { ClientResponseError } from "pocketbase";
import pb from "@/lib/pocketbase";

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "delivered"
  | "cancelled";

export type PaymentStatus =
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
          String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
        )
      : value;

  const number = Number(normalizedValue);

  return Number.isFinite(number) ? number : 0;
}

function formatDate(dateString?: string): string {
  if (!dateString) {
    return "-";
  }

  try {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateString;
  }
}

function formatMoney(value: unknown): string {
  return numberValue(value).toLocaleString("fa-IR");
}

function getCustomerName(order: OrderRecord): string {
  return (
    order.shippingFullName ||
    order.expand?.user?.name ||
    "خریدار مهمان"
  );
}

function getCustomerPhone(order: OrderRecord): string {
  return (
    order.shippingPhone ||
    order.expand?.user?.phone ||
    "-"
  );
}

function getOrderAddress(order: OrderRecord): string {
  return (
    order.expand?.address?.fullAddress ||
    order.expand?.address?.street ||
    order.shippingProvince ||
    "آدرس ثبت نشده"
  );
}

/* -------------------------------------------------------------------------- */
/* Status helpers                                                             */
/* -------------------------------------------------------------------------- */

function OrderStatusBadge({
  status,
}: {
  status?: OrderStatus;
}) {
  const config = {
    pending: {
      label: "در انتظار بررسی",
      icon: Clock3,
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300",
    },
    paid: {
      label: "پرداخت شده",
      icon: CheckCircle2,
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    },
    processing: {
      label: "در حال آماده‌سازی",
      icon: RefreshCw,
      className:
        "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300",
    },
    delivered: {
      label: "تحویل شده",
      icon: PackageCheck,
      className:
        "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-300",
    },
    cancelled: {
      label: "لغو شده",
      icon: XCircle,
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300",
    },
  }[status || "pending"];

  if (!status || !config) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
        نامشخص
      </span>
    );
  }

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${config.className}`}
    >
      <Icon
        className={`h-3.5 w-3.5 ${
          status === "processing" ? "animate-pulse" : ""
        }`}
      />

      {config.label}
    </span>
  );
}

function PaymentBadge({
  status,
}: {
  status?: PaymentStatus;
}) {
  const config = {
    paid: {
      label: "پرداخت موفق",
      icon: CheckCircle2,
      className:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
    },
    unpaid: {
      label: "پرداخت نشده",
      icon: Clock3,
      className:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
    },
    failed: {
      label: "پرداخت ناموفق",
      icon: XCircle,
      className:
        "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300",
    },
    refunded: {
      label: "مسترد شده",
      icon: RotateCcw,
      className:
        "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300",
    },
  }[status || "unpaid"];

  if (!status || !config) {
    return (
      <span className="text-[10px] text-slate-400">
        -
      </span>
    );
  }

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Statistics card                                                            */
/* -------------------------------------------------------------------------- */

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "slate",
  onClick,
  active = false,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone?: "slate" | "amber" | "emerald" | "indigo" | "teal" | "rose";
  onClick?: () => void;
  active?: boolean;
}) {
  const tones = {
    slate: {
      icon: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300",
      active:
        "border-slate-300 ring-2 ring-slate-200 dark:border-zinc-600 dark:ring-zinc-800",
    },
    amber: {
      icon: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
      active:
        "border-amber-300 ring-2 ring-amber-100 dark:border-amber-700 dark:ring-amber-950",
    },
    emerald: {
      icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
      active:
        "border-emerald-300 ring-2 ring-emerald-100 dark:border-emerald-700 dark:ring-emerald-950",
    },
    indigo: {
      icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
      active:
        "border-indigo-300 ring-2 ring-indigo-100 dark:border-indigo-700 dark:ring-indigo-950",
    },
    teal: {
      icon: "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
      active:
        "border-teal-300 ring-2 ring-teal-100 dark:border-teal-700 dark:ring-teal-950",
    },
    rose: {
      icon: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
      active:
        "border-rose-300 ring-2 ring-rose-100 dark:border-rose-700 dark:ring-rose-950",
    },
  };

  const toneConfig = tones[tone];

  const content = (
    <>
      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneConfig.icon}`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>

        {active && (
          <span className="h-2 w-2 rounded-full bg-current opacity-70" />
        )}
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-500">
          {label}
        </p>

        <p className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white">
          {value}
        </p>
      </div>
    </>
  );

const className = `rounded-2xl border bg-white p-4 shadow-sm transition-all dark:bg-zinc-900 ${
  active
    ? toneConfig.active
    : "border-slate-200 dark:border-zinc-800"
} ${
  onClick
    ? "cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:hover:border-zinc-700"
    : ""
}`;

if (onClick) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-right ${className}`}
    >
      {content}
    </button>
  );
}

  return <div className={className}>{content}</div>;
}

/* -------------------------------------------------------------------------- */
/* Loading skeleton                                                           */
/* -------------------------------------------------------------------------- */

function OrdersSkeleton() {
  return (
    <div className="space-y-3 p-4 sm:p-5">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/40"
        >
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-slate-200 dark:bg-zinc-700" />

            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 rounded bg-slate-200 dark:bg-zinc-700" />
              <div className="h-2.5 w-20 rounded bg-slate-200 dark:bg-zinc-700" />
            </div>

            <div className="hidden h-6 w-24 rounded-full bg-slate-200 dark:bg-zinc-700 sm:block" />

            <div className="h-4 w-20 rounded bg-slate-200 dark:bg-zinc-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function DashboardOrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<string>("all");
  const [paymentFilter, setPaymentFilter] =
    useState<string>("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const fetchOrders = useCallback(
    async (refresh = false) => {
      setError("");

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const records =
          await pb.collection("orders").getFullList<OrderRecord>({
            sort: "-created",
            expand: "user,address",
            requestKey: null,
          });

        setOrders(records);
      } catch (err) {
        console.error(
          "PocketBase fetch orders error:",
          err,
        );

        if (err instanceof ClientResponseError) {
          console.error(
            "PocketBase response:",
            err.response,
          );
        }

        setError(
          "خطا در دریافت سفارش‌ها از دیتابیس. قوانین دسترسی کالکشن orders را بررسی کنید.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  /* ---------------------------------------------------------------------- */
  /* Update status                                                           */
  /* ---------------------------------------------------------------------- */

  const updateOrderStatus = async (
    orderId: string,
    newStatus: OrderStatus,
  ) => {
    setUpdatingId(orderId);
    setError("");

    try {
      const updatedRecord =
        await pb
          .collection("orders")
          .update<OrderRecord>(orderId, {
            status: newStatus,
          });

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                ...updatedRecord,
              }
            : order,
        ),
      );
    } catch (err) {
      console.error(
        "PocketBase update order status error:",
        err,
      );

      if (err instanceof ClientResponseError) {
        setError(
          err.response?.message ||
            "خطا در تغییر وضعیت سفارش.",
        );
      } else {
        setError("خطا در تغییر وضعیت سفارش.");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const updatePaymentStatus = async (
    orderId: string,
    newPaymentStatus: PaymentStatus,
  ) => {
    setUpdatingId(orderId);
    setError("");

    try {
      const updatedRecord =
        await pb
          .collection("orders")
          .update<OrderRecord>(orderId, {
            paymentStatus: newPaymentStatus,
          });

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                ...updatedRecord,
              }
            : order,
        ),
      );
    } catch (err) {
      console.error(
        "PocketBase update payment status error:",
        err,
      );

      if (err instanceof ClientResponseError) {
        setError(
          err.response?.message ||
            "خطا در تغییر وضعیت پرداخت.",
        );
      } else {
        setError("خطا در تغییر وضعیت پرداخت.");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Statistics                                                              */
  /* ---------------------------------------------------------------------- */

  const stats = useMemo(() => {
    const pendingCount = orders.filter(
      (order) => order.status === "pending",
    ).length;

    const paidCount = orders.filter(
      (order) => order.paymentStatus === "paid",
    ).length;

    const processingCount = orders.filter(
      (order) => order.status === "processing",
    ).length;

    const deliveredCount = orders.filter(
      (order) => order.status === "delivered",
    ).length;

    const cancelledCount = orders.filter(
      (order) => order.status === "cancelled",
    ).length;

    const unpaidCount = orders.filter(
      (order) => order.paymentStatus === "unpaid",
    ).length;

    const totalRevenue = orders
      .filter(
        (order) =>
          order.paymentStatus === "paid" &&
          order.status !== "cancelled",
      )
      .reduce(
        (sum, order) =>
          sum + numberValue(order.totalAmount),
        0,
      );

    return {
      totalCount: orders.length,
      pendingCount,
      paidCount,
      processingCount,
      deliveredCount,
      cancelledCount,
      unpaidCount,
      totalRevenue,
    };
  }, [orders]);

  /* ---------------------------------------------------------------------- */
  /* Filtering                                                               */
  /* ---------------------------------------------------------------------- */

  const filteredOrders = useMemo(() => {
    const query =
      searchTerm.trim().toLocaleLowerCase("fa");

    return orders.filter((order) => {
      const customerName = getCustomerName(order)
        .toLocaleLowerCase("fa");

      const phone = getCustomerPhone(order)
        .toLocaleLowerCase("fa");

      const orderNum = (
        order.orderNumber ||
        order.id ||
        ""
      ).toLocaleLowerCase("fa");

      const addressText = getOrderAddress(order)
        .toLocaleLowerCase("fa");

      const matchesSearch =
        !query ||
        customerName.includes(query) ||
        phone.includes(query) ||
        orderNum.includes(query) ||
        addressText.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        order.status === statusFilter;

      const matchesPayment =
        paymentFilter === "all" ||
        order.paymentStatus === paymentFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPayment
      );
    });
  }, [
    orders,
    searchTerm,
    statusFilter,
    paymentFilter,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Quick status filter                                                     */
  /* ---------------------------------------------------------------------- */

  const setQuickStatus = (status: string) => {
    if (statusFilter === status) {
      setStatusFilter("all");
      return;
    }

    setStatusFilter(status);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50/70 px-4 py-5 font-sans text-slate-800 transition-colors dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}

        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-300/40 dark:bg-white dark:text-slate-900 dark:shadow-none">
                <ShoppingBag className="h-5 w-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    سفارش‌ها
                  </h1>

                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {orders.length.toLocaleString("fa-IR")}
                  </span>
                </div>

                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-zinc-500">
                  مدیریت سفارش‌ها، پرداخت‌ها و ارسال
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void fetchOrders(true)}
            disabled={isRefreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isRefreshing
                  ? "animate-spin text-amber-500"
                  : "text-slate-400"
              }`}
            />

            بروزرسانی
          </button>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* Alert                                                            */}
        {/* ---------------------------------------------------------------- */}

        {error && (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

              <span className="leading-5">
                {error}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="بستن"
              className="rounded-lg p-1 transition hover:bg-rose-100 dark:hover:bg-rose-900/30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Stats                                                             */}
        {/* ---------------------------------------------------------------- */}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="کل سفارش‌ها"
            value={stats.totalCount.toLocaleString("fa-IR")}
            icon={ShoppingBag}
            tone="slate"
            onClick={() => {
              setStatusFilter("all");
              setPaymentFilter("all");
            }}
            active={
              statusFilter === "all" &&
              paymentFilter === "all"
            }
          />

          <StatCard
            label="نیازمند بررسی"
            value={stats.pendingCount.toLocaleString("fa-IR")}
            icon={Clock3}
            tone="amber"
            onClick={() => setQuickStatus("pending")}
            active={statusFilter === "pending"}
          />

          <StatCard
            label="پرداخت موفق"
            value={stats.paidCount.toLocaleString("fa-IR")}
            icon={WalletCards}
            tone="emerald"
          />

          <StatCard
            label="در حال آماده‌سازی"
            value={stats.processingCount.toLocaleString("fa-IR")}
            icon={RefreshCw}
            tone="indigo"
            onClick={() => setQuickStatus("processing")}
            active={statusFilter === "processing"}
          />

          <StatCard
            label="تحویل شده"
            value={stats.deliveredCount.toLocaleString("fa-IR")}
            icon={Truck}
            tone="teal"
            onClick={() => setQuickStatus("delivered")}
            active={statusFilter === "delivered"}
          />

          <StatCard
            label="فروش دریافت‌شده"
            value={`${formatMoney(
              stats.totalRevenue,
            )} تومان`}
            icon={CircleDollarSign}
            tone="emerald"
          />
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Search / filters                                                  */}
        {/* ---------------------------------------------------------------- */}

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="جستجوی شماره سفارش، نام خریدار، تلفن یا آدرس..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-4 pr-10 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-amber-500 dark:focus:bg-zinc-800"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-zinc-700 dark:hover:text-white"
                  aria-label="پاک کردن جستجو"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 dark:border-zinc-800 dark:bg-zinc-800/60">
                <Filter className="h-4 w-4 text-slate-400" />

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="min-w-[150px] cursor-pointer bg-transparent text-xs font-bold outline-none dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
                >
                  <option value="all">
                    همه وضعیت‌ها
                  </option>

                  <option value="pending">
                    در انتظار بررسی
                  </option>

                  <option value="paid">
                    پرداخت شده
                  </option>

                  <option value="processing">
                    در حال آماده‌سازی
                  </option>

                  <option value="delivered">
                    تحویل شده
                  </option>

                  <option value="cancelled">
                    لغو شده
                  </option>
                </select>
              </div>

              <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 dark:border-zinc-800 dark:bg-zinc-800/60">
                <CreditCard className="h-4 w-4 text-slate-400" />

                <select
                  value={paymentFilter}
                  onChange={(event) =>
                    setPaymentFilter(event.target.value)
                  }
                  className="min-w-[145px] cursor-pointer bg-transparent text-xs font-bold outline-none dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
                >
                  <option value="all">
                    همه پرداخت‌ها
                  </option>

                  <option value="unpaid">
                    پرداخت نشده
                  </option>

                  <option value="paid">
                    پرداخت موفق
                  </option>

                  <option value="failed">
                    پرداخت ناموفق
                  </option>

                  <option value="refunded">
                    مسترد شده
                  </option>
                </select>
              </div>
            </div>
          </div>

          {(searchTerm ||
            statusFilter !== "all" ||
            paymentFilter !== "all") && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-zinc-800">
              <span className="text-[10px] font-bold text-slate-400">
                فیلتر فعال:
              </span>

              {statusFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                >
                  وضعیت سفارش
                  <X className="h-3 w-3" />
                </button>
              )}

              {paymentFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setPaymentFilter("all")}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"
                >
                  وضعیت پرداخت
                  <X className="h-3 w-3" />
                </button>
              )}

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  جستجو
                  <X className="h-3 w-3" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setPaymentFilter("all");
                }}
                className="mr-auto text-[10px] font-bold text-slate-400 transition hover:text-slate-700 dark:hover:text-white"
              >
                پاک کردن همه
              </button>
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Results header                                                    */}
        {/* ---------------------------------------------------------------- */}

        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">
              لیست سفارش‌ها
            </h2>

            <p className="mt-0.5 text-[10px] font-medium text-slate-400">
              {filteredOrders.length.toLocaleString("fa-IR")} سفارش نمایش داده می‌شود
            </p>
          </div>

          {stats.unpaidCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setPaymentFilter("unpaid");
                setStatusFilter("all");
              }}
              className="hidden items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold text-amber-700 transition hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300 sm:flex"
            >
              <CreditCard className="h-3.5 w-3.5" />
              {stats.unpaidCount.toLocaleString("fa-IR")} پرداخت در انتظار
            </button>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Desktop table                                                     */}
        {/* ---------------------------------------------------------------- */}

        <section className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-right text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 dark:border-zinc-800 dark:bg-zinc-800/50">
                <tr className="text-[10px] font-black text-slate-400 dark:text-zinc-500">
                  <th className="px-5 py-4">
                    سفارش
                  </th>

                  <th className="px-5 py-4">
                    خریدار
                  </th>

                  <th className="px-5 py-4">
                    ارسال
                  </th>

                  <th className="px-5 py-4">
                    مبلغ سفارش
                  </th>

                  <th className="px-5 py-4">
                    پرداخت
                  </th>

                  <th className="px-5 py-4">
                    وضعیت
                  </th>

                  <th className="px-5 py-4">
                    تاریخ
                  </th>

                  <th className="px-5 py-4 text-center">
                    عملیات
                  </th>

                  <th className="w-8" />
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={9}>
                      <OrdersSkeleton />
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <EmptyOrders />
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const customerName =
                      getCustomerName(order);

                    const customerPhone =
                      getCustomerPhone(order);

                    const totalAmount =
                      numberValue(order.totalAmount);

                    const isUpdating =
                      updatingId === order.id;

                    const isPending =
                      order.status === "pending";

                    return (
                      <tr
                        key={order.id}
                        className={`group transition ${
                          isPending
                            ? "bg-amber-50/[0.28] hover:bg-amber-50/60 dark:bg-amber-950/[0.05] dark:hover:bg-amber-950/10"
                            : "hover:bg-slate-50/80 dark:hover:bg-zinc-800/40"
                        }`}
                      >
                        {/* Order */}
                        <td className="px-5 py-4">
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className="group/order flex items-center gap-3"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover/order:bg-amber-100 group-hover/order:text-amber-700 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover/order:bg-amber-500/10 dark:group-hover/order:text-amber-400">
                              <ShoppingBag className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <span className="block font-mono text-[11px] font-black text-slate-900 transition group-hover/order:text-amber-600 dark:text-white dark:group-hover/order:text-amber-400">
                                {order.orderNumber ||
                                  order.id}
                              </span>

                              <span className="mt-1 block text-[9px] font-medium text-slate-400">
                                مشاهده جزئیات
                              </span>
                            </div>

                            <ChevronLeft className="mr-auto h-4 w-4 text-slate-300 transition group-hover/order:-translate-x-1 group-hover/order:text-amber-500 dark:text-zinc-600" />
                          </Link>
                        </td>

                        {/* Customer */}
                        <td className="px-5 py-4">
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className="block"
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                                <User className="h-3.5 w-3.5" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-black text-slate-800 dark:text-zinc-100">
                                  {customerName}
                                </p>

                                <p className="mt-0.5 flex items-center gap-1 font-mono text-[9px] text-slate-400">
                                  <Phone className="h-2.5 w-2.5" />
                                  {customerPhone}
                                </p>
                              </div>
                            </div>
                          </Link>
                        </td>

                        {/* Shipping */}
                        <td className="px-5 py-4">
                          <div className="max-w-[210px]">
                            {order.shippingMethod && (
                              <span className="mb-1.5 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                                <Truck className="h-3 w-3" />
                                {order.shippingMethod}
                              </span>
                            )}

                            <div className="flex items-start gap-1.5 text-[9px] font-medium leading-5 text-slate-400 dark:text-zinc-500">
                              <MapPin className="mt-1 h-3 w-3 shrink-0" />

                              <span className="line-clamp-2">
                                {getOrderAddress(order)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4">
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className="block"
                          >
                            <div className="font-mono text-sm font-black text-slate-950 dark:text-white">
                              {totalAmount.toLocaleString(
                                "fa-IR",
                              )}
                            </div>

                            <span className="text-[9px] font-medium text-slate-400">
                              تومان
                            </span>
                          </Link>
                        </td>

                        {/* Payment */}
                        <td className="px-5 py-4">
                          <PaymentBadge
                            status={
                              order.paymentStatus
                            }
                          />

                          {order.paymentStatus ===
                            "unpaid" &&
                            order.status !==
                              "cancelled" && (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() =>
                                  void updatePaymentStatus(
                                    order.id,
                                    "paid",
                                  )
                                }
                                className="mt-2 flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                              >
                                {isUpdating ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}

                                تأیید پرداخت
                              </button>
                            )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <OrderStatusBadge
                            status={order.status}
                          />
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4">
                          <span className="whitespace-nowrap text-[9px] font-medium text-slate-400 dark:text-zinc-500">
                            {formatDate(order.created)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td
                          className="px-5 py-4"
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            {order.status ===
                              "pending" && (
                              <>
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() =>
                                    void updateOrderStatus(
                                      order.id,
                                      "processing",
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[9px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  {isUpdating ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}

                                  تأیید
                                </button>

                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() =>
                                    void updateOrderStatus(
                                      order.id,
                                      "cancelled",
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[9px] font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
                                >
                                  <X className="h-3 w-3" />
                                  لغو
                                </button>
                              </>
                            )}

                            {order.status ===
                              "paid" && (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() =>
                                  void updateOrderStatus(
                                    order.id,
                                    "processing",
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[9px] font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                              >
                                {isUpdating ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3" />
                                )}

                                پردازش
                              </button>
                            )}

                            {order.status ===
                              "processing" && (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() =>
                                  void updateOrderStatus(
                                    order.id,
                                    "delivered",
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1.5 text-[9px] font-bold text-white transition hover:bg-teal-700 disabled:opacity-50"
                              >
                                {isUpdating ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <PackageCheck className="h-3 w-3" />
                                )}

                                تحویل شد
                              </button>
                            )}

                            {order.status ===
                              "delivered" && (
                              <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400">
                                تکمیل شده
                              </span>
                            )}

                            {order.status ===
                              "cancelled" && (
                              <span className="text-[9px] font-bold text-rose-500">
                                لغو شده
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Details */}
                        <td className="px-2 py-4">
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            aria-label="مشاهده جزئیات سفارش"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-amber-50 hover:text-amber-600 dark:text-zinc-600 dark:hover:bg-amber-500/10 dark:hover:text-amber-400"
                          >
                            <ArrowUpLeft className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && (
            <OrdersFooter
              filteredCount={filteredOrders.length}
              totalCount={orders.length}
              unpaidCount={stats.unpaidCount}
              cancelledCount={stats.cancelledCount}
            />
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Mobile cards                                                      */}
        {/* ---------------------------------------------------------------- */}

        <section className="space-y-3 lg:hidden">
          {isLoading ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <OrdersSkeleton />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <EmptyOrders />
            </div>
          ) : (
            <>
              {filteredOrders.map((order) => {
                const customerName =
                  getCustomerName(order);

                const customerPhone =
                  getCustomerPhone(order);

                const totalAmount =
                  numberValue(order.totalAmount);

                const isUpdating =
                  updatingId === order.id;

                return (
                  <article
                    key={order.id}
                    className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition dark:bg-zinc-900 ${
                      order.status === "pending"
                        ? "border-amber-200 dark:border-amber-900/50"
                        : "border-slate-200 dark:border-zinc-800"
                    }`}
                  >
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="block p-4 active:bg-slate-50 dark:active:bg-zinc-800"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            order.status ===
                            "pending"
                              ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                              : "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          <ShoppingBag className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-mono text-xs font-black text-slate-900 dark:text-white">
                                {order.orderNumber ||
                                  order.id}
                              </p>

                              <p className="mt-1 text-[9px] font-medium text-slate-400">
                                {formatDate(
                                  order.created,
                                )}
                              </p>
                            </div>

                            <ChevronLeft className="h-4 w-4 shrink-0 text-slate-300 dark:text-zinc-600" />
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <OrderStatusBadge
                              status={order.status}
                            />

                            <PaymentBadge
                              status={
                                order.paymentStatus
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-zinc-800">
                        <div>
                          <p className="mb-1 text-[9px] font-bold text-slate-400">
                            خریدار
                          </p>

                          <div className="flex min-w-0 items-center gap-1.5">
                            <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />

                            <span className="truncate text-[10px] font-bold text-slate-700 dark:text-zinc-200">
                              {customerName}
                            </span>
                          </div>
                        </div>

                        <div className="text-left">
                          <p className="mb-1 text-[9px] font-bold text-slate-400">
                            مبلغ
                          </p>

                          <p className="font-mono text-sm font-black text-slate-950 dark:text-white">
                            {totalAmount.toLocaleString(
                              "fa-IR",
                            )}

                            <span className="mr-1 font-sans text-[8px] font-normal text-slate-400">
                              تومان
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-zinc-800/60">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />

                        <span className="line-clamp-2 text-[9px] font-medium leading-4 text-slate-500 dark:text-zinc-400">
                          {getOrderAddress(order)}
                        </span>
                      </div>
                    </Link>

                    {/* Mobile actions */}
                    <div className="border-t border-slate-100 bg-slate-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-800/30">
                      <div className="flex items-center gap-2">
                        {order.status ===
                          "pending" && (
                          <>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() =>
                                void updateOrderStatus(
                                  order.id,
                                  "processing",
                                )
                              }
                              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-[10px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {isUpdating ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}

                              تأیید سفارش
                            </button>

                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() =>
                                void updateOrderStatus(
                                  order.id,
                                  "cancelled",
                                )
                              }
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-[10px] font-bold text-rose-700 dark:border-rose-900/50 dark:bg-zinc-900 dark:text-rose-300"
                            >
                              <X className="h-3.5 w-3.5" />
                              لغو
                            </button>
                          </>
                        )}

                        {order.status ===
                          "paid" && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              void updateOrderStatus(
                                order.id,
                                "processing",
                              )
                            }
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-[10px] font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {isUpdating ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}

                            شروع آماده‌سازی
                          </button>
                        )}

                        {order.status ===
                          "processing" && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              void updateOrderStatus(
                                order.id,
                                "delivered",
                              )
                            }
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2.5 text-[10px] font-bold text-white transition hover:bg-teal-700 disabled:opacity-50"
                          >
                            {isUpdating ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <PackageCheck className="h-3.5 w-3.5" />
                            )}

                            ثبت تحویل
                          </button>
                        )}

                        {order.status ===
                          "delivered" && (
                          <div className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-50 py-2.5 text-[10px] font-bold text-teal-700 dark:bg-teal-950/20 dark:text-teal-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            سفارش تکمیل شده
                          </div>
                        )}

                        {order.status ===
                          "cancelled" && (
                          <div className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-50 py-2.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/20 dark:text-rose-300">
                            <XCircle className="h-3.5 w-3.5" />
                            سفارش لغو شده
                          </div>
                        )}
                      </div>

                      {order.paymentStatus ===
                        "unpaid" &&
                        order.status !==
                          "cancelled" && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              void updatePaymentStatus(
                                order.id,
                                "paid",
                              )
                            }
                            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-[9px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"
                          >
                            {isUpdating ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <CreditCard className="h-3 w-3" />
                            )}

                            تأیید دریافت پرداخت
                          </button>
                        )}

                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[9px] font-bold text-slate-500 transition hover:bg-white hover:text-amber-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-amber-400"
                      >
                        مشاهده جزئیات سفارش
                        <ChevronLeft className="h-3 w-3" />
                      </Link>
                    </div>
                  </article>
                );
              })}

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <OrdersFooter
                  filteredCount={filteredOrders.length}
                  totalCount={orders.length}
                  unpaidCount={stats.unpaidCount}
                  cancelledCount={stats.cancelledCount}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty state                                                                */
/* -------------------------------------------------------------------------- */

function EmptyOrders() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500">
        <ShoppingBag className="h-7 w-7" />
      </div>

      <h3 className="mt-4 text-sm font-black text-slate-800 dark:text-zinc-200">
        سفارشی پیدا نشد
      </h3>

      <p className="mt-1 max-w-xs text-[10px] font-medium leading-5 text-slate-400 dark:text-zinc-500">
        با تغییر عبارت جستجو یا فیلترها دوباره امتحان کنید.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                     */
/* -------------------------------------------------------------------------- */

function OrdersFooter({
  filteredCount,
  totalCount,
  unpaidCount,
  cancelledCount,
}: {
  filteredCount: number;
  totalCount: number;
  unpaidCount: number;
  cancelledCount: number;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 text-[10px] font-bold text-slate-400 dark:border-zinc-800 dark:bg-zinc-800/30 dark:text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
      <span>
        نمایش{" "}
        <strong className="text-slate-700 dark:text-zinc-300">
          {filteredCount.toLocaleString("fa-IR")}
        </strong>{" "}
        سفارش از{" "}
        <strong className="text-slate-700 dark:text-zinc-300">
          {totalCount.toLocaleString("fa-IR")}
        </strong>
      </span>

      <div className="flex items-center gap-4">
        <span>
          پرداخت نشده:{" "}
          <strong className="text-amber-600 dark:text-amber-400">
            {unpaidCount.toLocaleString("fa-IR")}
          </strong>
        </span>

        <span>
          لغو شده:{" "}
          <strong className="text-rose-500">
            {cancelledCount.toLocaleString("fa-IR")}
          </strong>
        </span>
      </div>
    </div>
  );
}