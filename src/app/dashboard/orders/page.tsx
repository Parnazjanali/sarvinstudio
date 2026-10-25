"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  ArrowUpDown,
  FileText,
  Eye,
  CheckCheck,
  Receipt,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Coins,
  Send,
} from "lucide-react";
import pb from "@/lib/pocketbase";
import { recordAuditLogClient } from "@/lib/audit-client";
import {
  syncOrderToInvoiceAndSettlement,
  confirmOrderDepositAndSettle,
  type InvoiceRecord,
  type SettlementRecord,
} from "@/lib/order-invoice-sync";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* =========================================================
   Types
========================================================= */

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
  items?: any;
  created?: string;
  updated?: string;
  expand?: {
    user?: UserRecord;
    address?: AddressRecord;
  };
}

/* =========================================================
   Helpers
========================================================= */

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

function formatDate(dateString?: string): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;

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
    "—"
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

const statusLabelsMap: Record<OrderStatus, string> = {
  pending: "در انتظار بررسی",
  paid: "پرداخت شده",
  processing: "در حال ساخت و آماده‌سازی",
  delivered: "تحویل داده شد",
  cancelled: "لغو شده",
};

const paymentStatusLabelsMap: Record<PaymentStatus, string> = {
  unpaid: "در انتظار پرداخت",
  paid: "تسویه کامل",
  failed: "ناموفق",
  refunded: "مرجوع شده",
};

/* =========================================================
   Main Component
========================================================= */

export default function DashboardOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [orderInvoices, setOrderInvoices] = useState<Record<string, InvoiceRecord>>({});

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [invoiceFilter, setInvoiceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Settlement Dialog State
  const [settleTargetOrder, setSettleTargetOrder] = useState<OrderRecord | null>(null);
  const [settlementMethod, setSettlementMethod] = useState("card_to_card");
  const [trackingCode, setTrackingCode] = useState("");
  const [settlementNotes, setSettlementNotes] = useState("");
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);

  /* =======================================================
     Load Orders & Existing Invoices
  ======================================================= */

  const fetchOrdersAndInvoices = useCallback(async (refresh = false) => {
    setError("");
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [orderRecords, invoiceRecords] = await Promise.all([
        pb.collection("orders").getFullList<OrderRecord>({
          sort: "-created",
          expand: "user,address",
          requestKey: null,
        }),
        pb.collection("invoices").getFullList<InvoiceRecord>({
          sort: "-created",
          requestKey: null,
        }),
      ]);

      setOrders(orderRecords);

      // نقشه شناسه سفارش به فاکتور صادرشده
      const invMap: Record<string, InvoiceRecord> = {};
      invoiceRecords.forEach((inv) => {
        if (inv.order) {
          invMap[inv.order] = inv;
        }
      });
      setOrderInvoices(invMap);
    } catch (err) {
      console.error("PocketBase fetch orders error:", err);
      setError("خطا در دریافت سفارش‌ها یا فاکتورها از دیتابیس.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrdersAndInvoices();
  }, [fetchOrdersAndInvoices]);

  /* =======================================================
     Status Update Trigger with Automatic Invoice Sync
  ======================================================= */

  const updateOrderStatus = async (
    orderId: string,
    newStatus: OrderStatus
  ) => {
    setUpdatingId(orderId);
    setError("");
    setSuccessMessage("");

    try {
      const order = orders.find((o) => o.id === orderId);

      // اگر وضعیت به تایید سفارش (processing) یا پرداخت موفق (paid) تغییر کرد:
      // تریگر صدور خودکار فاکتور و پیوند آن اجرا می‌شود
      const updatedRecord = await pb
        .collection("orders")
        .update<OrderRecord>(orderId, { status: newStatus });

      setOrders((current) =>
        current.map((o) => (o.id === orderId ? { ...o, ...updatedRecord } : o))
      );

      // اجرای تریگر ساخت خودکار فاکتور
      if (newStatus === "processing" || newStatus === "paid") {
        try {
          const syncResult = await syncOrderToInvoiceAndSettlement(orderId, {
            forceStatus: newStatus,
          });

          if (syncResult?.invoice) {
            setOrderInvoices((prev) => ({
              ...prev,
              [orderId]: syncResult.invoice,
            }));

            setSuccessMessage(
              `وضعیت سفارش به «${statusLabelsMap[newStatus]}» تغییر کرد و فاکتور شماره #${syncResult.invoice.invoiceNumber} خودکار صادر شد.`
            );
          }
        } catch (syncErr) {
          console.error("Auto invoice sync failed:", syncErr);
        }
      } else {
        setSuccessMessage(`وضعیت سفارش به «${statusLabelsMap[newStatus]}» تغییر یافت.`);
      }

      void recordAuditLogClient({
        category: "order",
        title: `تغییر وضعیت سفارش ${order?.orderNumber || orderId}`,
        description: `وضعیت سفارش به «${statusLabelsMap[newStatus]}» تغییر یافت. خریدار: ${order?.shippingFullName || "کاربر"}`,
        level: newStatus === "cancelled" ? "warning" : "info",
        targetId: orderId,
        targetType: "order",
        metadata: {
          orderNumber: order?.orderNumber,
          oldStatus: order?.status,
          newStatus,
          totalAmount: order?.totalAmount,
        },
      });
    } catch (err) {
      console.error("PocketBase update order status error:", err);
      setError("خطا در تغییر وضعیت سفارش.");
    } finally {
      setUpdatingId(null);
    }
  };

  /* =======================================================
     Manual / Instant Settlement Trigger (کارت‌به‌کارت / اقساطی)
  ======================================================= */

  const handleOpenSettlementModal = (order: OrderRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setSettleTargetOrder(order);
    setTrackingCode(`CARD-${Math.floor(100000 + Math.random() * 900000)}`);
    setSettlementMethod("card_to_card");
    setSettlementNotes("");
  };

  const handleConfirmSettlement = async () => {
    if (!settleTargetOrder) return;

    setIsSubmittingSettlement(true);
    setError("");

    try {
      const orderId = settleTargetOrder.id;
      const res = await confirmOrderDepositAndSettle(orderId, {
        paymentMethod: settlementMethod,
        trackingCode: trackingCode.trim() || undefined,
        amount: Number(settleTargetOrder.totalAmount) || 0,
        notes: settlementNotes.trim() || undefined,
      });

      // بروزرسانی استیت سفارش و فاکتور
      setOrders((current) =>
        current.map((o) =>
          o.id === orderId
            ? { ...o, paymentStatus: "paid", status: "processing" }
            : o
        )
      );

      if (res.invoice) {
        setOrderInvoices((prev) => ({
          ...prev,
          [orderId]: res.invoice,
        }));
      }

      setSuccessMessage(
        `تسویه سفارش #${settleTargetOrder.orderNumber || settleTargetOrder.id.slice(0, 7)} با موفقیت ثبت شد و فاکتور #${res.invoice?.invoiceNumber || ""} به روز گردید.`
      );
      setSettleTargetOrder(null);
    } catch (err) {
      console.error("Settlement confirmation error:", err);
      setError("خطا در ثبت تسویه مالی سفارش.");
    } finally {
      setIsSubmittingSettlement(false);
    }
  };

  /* =======================================================
     Direct 1-Click Invoice Generation Trigger
  ======================================================= */

  const handleManualTriggerInvoice = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUpdatingId(orderId);
    setError("");

    try {
      const res = await syncOrderToInvoiceAndSettlement(orderId);
      if (res.invoice) {
        setOrderInvoices((prev) => ({
          ...prev,
          [orderId]: res.invoice,
        }));
        setSuccessMessage(`فاکتور رسمی شماره #${res.invoice.invoiceNumber} با موفقیت صادر گردید.`);
      }
    } catch (err) {
      console.error("Trigger invoice error:", err);
      setError("خطا در صدور خودکار فاکتور سفارش.");
    } finally {
      setUpdatingId(null);
    }
  };

  /* =======================================================
     Calculations & Filtering
  ======================================================= */

  const stats = useMemo(() => {
    const pendingCount = orders.filter((o) => o.status === "pending").length;
    const paidCount = orders.filter((o) => o.paymentStatus === "paid").length;
    const processingCount = orders.filter((o) => o.status === "processing").length;
    const deliveredCount = orders.filter((o) => o.status === "delivered").length;
    const cancelledCount = orders.filter((o) => o.status === "cancelled").length;
    const unpaidCount = orders.filter((o) => o.paymentStatus === "unpaid").length;

    const totalRevenue = orders
      .filter((o) => o.paymentStatus === "paid" && o.status !== "cancelled")
      .reduce((sum, o) => sum + numberValue(o.totalAmount), 0);

    const invoicesIssuedCount = Object.keys(orderInvoices).length;

    return {
      totalCount: orders.length,
      pendingCount,
      paidCount,
      processingCount,
      deliveredCount,
      cancelledCount,
      unpaidCount,
      totalRevenue,
      invoicesIssuedCount,
    };
  }, [orders, orderInvoices]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("fa");

    let result = orders.filter((order) => {
      const customerName = getCustomerName(order).toLocaleLowerCase("fa");
      const phone = getCustomerPhone(order).toLocaleLowerCase("fa");
      const orderNum = (order.orderNumber || order.id || "").toLocaleLowerCase("fa");
      const addressText = getOrderAddress(order).toLocaleLowerCase("fa");
      const linkedInvoice = orderInvoices[order.id];
      const invoiceNum = (linkedInvoice?.invoiceNumber || "").toLocaleLowerCase("fa");

      const matchesSearch =
        !query ||
        customerName.includes(query) ||
        phone.includes(query) ||
        orderNum.includes(query) ||
        invoiceNum.includes(query) ||
        addressText.includes(query);

      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      const matchesPayment =
        paymentFilter === "all" || order.paymentStatus === paymentFilter;

      const matchesInvoice =
        invoiceFilter === "all" ||
        (invoiceFilter === "has_invoice" && Boolean(linkedInvoice)) ||
        (invoiceFilter === "no_invoice" && !Boolean(linkedInvoice));

      return matchesSearch && matchesStatus && matchesPayment && matchesInvoice;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "amount_desc")
        return numberValue(b.totalAmount) - numberValue(a.totalAmount);
      if (sortBy === "amount_asc")
        return numberValue(a.totalAmount) - numberValue(b.totalAmount);
      return 0; // default newest
    });

    return result;
  }, [orders, searchTerm, statusFilter, paymentFilter, invoiceFilter, sortBy, orderInvoices]);

  const getOrderStatusBadge = (status?: OrderStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning" className="font-bold">در انتظار بررسی</Badge>;
      case "paid":
        return <Badge variant="success" className="font-bold">پرداخت شده</Badge>;
      case "processing":
        return <Badge variant="secondary" className="font-bold">در حال ساخت و آماده‌سازی</Badge>;
      case "delivered":
        return <Badge variant="gold" className="font-bold">تحویل داده شد</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="font-bold">لغو شده</Badge>;
      default:
        return <Badge variant="outline">نامشخص</Badge>;
    }
  };

  const getPaymentStatusBadge = (status?: PaymentStatus) => {
    switch (status) {
      case "paid":
        return <Badge variant="success" className="font-bold">تسویه کامل</Badge>;
      case "unpaid":
        return <Badge variant="warning" className="font-bold">در انتظار پرداخت</Badge>;
      case "failed":
        return <Badge variant="destructive" className="font-bold">ناموفق</Badge>;
      case "refunded":
        return <Badge variant="secondary" className="font-bold">مسترد شده</Badge>;
      default:
        return <Badge variant="outline">—</Badge>;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 font-sans" dir="rtl">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 rounded-3xl border border-[#1C3324]/12 bg-white/80 p-5 shadow-xs backdrop-blur-md transition-colors lg:flex-row lg:items-center lg:p-6 dark:border-white/10 dark:bg-[#15221B]/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-black text-[#8B263E] dark:text-[#D8B65C]">
              اتوماسیون رویدادمحور سفارش، فاکتور و تسویه
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-black text-[#1C3324] sm:text-3xl dark:text-zinc-100">
            مدیریت سفارش‌  
          </h1>
          <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
            صدور هوشمند فاکتور با تغییر وضعیت به پرداخت موفق یا تایید سفارش و ثبت سند تسویه بلادرنگ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="default"
            onClick={() => void fetchOrdersAndInvoices(true)}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin text-[#8B263E] dark:text-[#D8B65C]")}
            />
            <span>{isRefreshing ? "در حال دریافت..." : "بروزرسانی لیست"}</span>
          </Button>

          <Button asChild variant="default" size="default" className="gap-2">
            <Link href="/dashboard/invoices">
              <Receipt className="h-4 w-4" />
              <span>مدیریت کل فاکتورها</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Enhanced Stat Cards (DashboardStatCard) */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          title="سفارش‌های نیازمند اقدام"
          value={stats.pendingCount.toLocaleString("fa-IR")}
          unit="سفارش"
          accent="crimson"
          icon={Clock3}
          description="در انتظار تایید اولیه یا صدور فاکتور"
          secondaryInfo={{
            label: "کل سفارش‌ها",
            value: `${stats.totalCount} مورد`,
          }}
          isLoading={isLoading}
        />

        <DashboardStatCard
          title="در حال ساخت کارگاهی"
          value={stats.processingCount.toLocaleString("fa-IR")}
          unit="قطعه طلا"
          accent="blue"
          icon={RefreshCw}
          description="سفارشات تاییدشده در کارگاه ساخت"
          secondaryInfo={{
            label: "فاکتورهای صادرشده",
            value: `${stats.invoicesIssuedCount} فاکتور`,
          }}
          isLoading={isLoading}
        />

        <DashboardStatCard
          title="سفارشات تکمیل و تحویل‌شده"
          value={stats.deliveredCount.toLocaleString("fa-IR")}
          unit="تحویل خریدار"
          accent="gold"
          icon={PackageCheck}
          trend={`${Math.round((stats.deliveredCount / Math.max(stats.totalCount, 1)) * 100)}٪`}
          trendType="positive"
          description="تحویل قطعی زیورآلات به مشتری"
          isLoading={isLoading}
        />

        <DashboardStatCard
          title="مجموع وصولی تسویه‌شده"
          value={formatMoney(stats.totalRevenue)}
          unit="تومان"
          accent="emerald"
          icon={CircleDollarSign}
          trend={`${stats.paidCount} تسویه قطعی`}
          trendType="positive"
          description="پرداخت آنلاین و کارت‌به‌کارت تاییدشده"
          isLoading={isLoading}
        />
      </section>

      {/* Success alert */}
      {successMessage && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={17} className="text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button type="button" onClick={() => setSuccessMessage("")} className="text-emerald-600">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle size={17} className="text-rose-600" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError("")} className="text-rose-500">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Filters Card */}
      <Card className="border-[#1C3324]/12 bg-white/80 p-4 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3A5A46] dark:text-zinc-400" />
            <Input
              type="text"
              placeholder="جست‌وجوی شماره سفارش، شماره فاکتور، نام مشتری، تلفن، آدرس..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9 text-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3A5A46] hover:text-[#1C3324] dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-[#1C3324]/12 bg-[#FAF9F6] px-3 py-1.5 text-xs font-bold dark:border-white/10 dark:bg-zinc-900/60">
              <Filter className="h-3.5 w-3.5 text-[#3A5A46] dark:text-zinc-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#1C3324] outline-none cursor-pointer dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
              >
                <option value="all">همه وضعیت‌های سفارش</option>
                <option value="pending">در انتظار بررسی</option>
                <option value="processing">در حال ساخت و آماده‌سازی</option>
                <option value="paid">پرداخت شده</option>
                <option value="delivered">تحویل داده شده</option>
                <option value="cancelled">لغو شده</option>
              </select>
            </div>

            {/* Payment Filter */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-[#1C3324]/12 bg-[#FAF9F6] px-3 py-1.5 text-xs font-bold dark:border-white/10 dark:bg-zinc-900/60">
              <CreditCard className="h-3.5 w-3.5 text-[#3A5A46] dark:text-zinc-400" />
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#1C3324] outline-none cursor-pointer dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
              >
                <option value="all">همه پرداخت‌ها</option>
                <option value="paid">تسویه کامل (پرداخت موفق)</option>
                <option value="unpaid">در انتظار تسویه (کارت‌به‌کارت/اقساطی)</option>
                <option value="failed">پرداخت ناموفق</option>
                <option value="refunded">مسترد شده</option>
              </select>
            </div>

            {/* Invoice Filter */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-[#1C3324]/12 bg-[#FAF9F6] px-3 py-1.5 text-xs font-bold dark:border-white/10 dark:bg-zinc-900/60">
              <Receipt className="h-3.5 w-3.5 text-[#3A5A46] dark:text-zinc-400" />
              <select
                value={invoiceFilter}
                onChange={(e) => setInvoiceFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#1C3324] outline-none cursor-pointer dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
              >
                <option value="all">همه وضعیت‌های فاکتور</option>
                <option value="has_invoice">دارای فاکتور صادرشده</option>
                <option value="no_invoice">بدون فاکتور (نیازمند صدور)</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-[#1C3324]/12 bg-[#FAF9F6] px-3 py-1.5 text-xs font-bold dark:border-white/10 dark:bg-zinc-900/60">
              <ArrowUpDown className="h-3.5 w-3.5 text-[#3A5A46] dark:text-zinc-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#1C3324] outline-none cursor-pointer dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
              >
                <option value="newest">جدیدترین سفارش‌ها</option>
                <option value="amount_desc">بیشترین مبلغ سفارش</option>
                <option value="amount_asc">کمترین مبلغ سفارش</option>
              </select>
            </div>

            {/* Reset Filters */}
            {(searchTerm || statusFilter !== "all" || paymentFilter !== "all" || invoiceFilter !== "all" || sortBy !== "newest") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setPaymentFilter("all");
                  setInvoiceFilter("all");
                  setSortBy("newest");
                }}
                className="text-xs"
              >
                پاک کردن فیلترها
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card className="border-[#1C3324]/12 bg-white/80 p-6 dark:border-white/10 dark:bg-[#15221B]/80">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-extrabold text-[#1C3324] dark:text-zinc-100">
              لیست سفارش‌ها و پیوند فاکتور
            </CardTitle>
            <CardDescription className="text-xs text-[#3A5A46] dark:text-zinc-400">
              نمایش {filteredOrders.length.toLocaleString("fa-IR")} سفارش از مجموع{" "}
              {orders.length.toLocaleString("fa-IR")} سفارش ثبت‌شده در سامانه
            </CardDescription>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">شماره سفارش</TableHead>
                <TableHead>مشخصات مشتری</TableHead>
                <TableHead>مبلغ کل سفارش</TableHead>
                <TableHead>وضعیت پرداخت</TableHead>
                <TableHead>وضعیت سفارش</TableHead>
                <TableHead>فاکتور متصل</TableHead>
                <TableHead>تاریخ ثبت</TableHead>
                <TableHead className="text-left">عملیات رویدادی</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="h-6 w-6 animate-spin text-[#8B263E] dark:text-[#D8B65C]" />
                      <span className="text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                        در حال بارگذاری اطلاعات سفارشات و فاکتورها...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FAF9F6] border border-[#1C3324]/10 dark:bg-zinc-800 dark:border-white/10">
                        <ShoppingBag className="h-6 w-6 text-[#3A5A46] dark:text-zinc-400" />
                      </div>
                      <p className="mt-3 text-sm font-black text-[#1C3324] dark:text-zinc-100">
                        سفارشی با این مشخصات یافت نشد
                      </p>
                      <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
                        فیلترهای انتخابی را تغییر داده یا عبارت جستجو را پاک کنید.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const customerName = getCustomerName(order);
                  const customerPhone = getCustomerPhone(order);
                  const totalAmount = numberValue(order.totalAmount);
                  const isUpdating = updatingId === order.id;
                  const linkedInvoice = orderInvoices[order.id];

                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer transition hover:bg-[#FAF9F6] dark:hover:bg-white/5"
                      onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                    >
                      {/* Order Number */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10 dark:bg-zinc-800 dark:border-white/10 dark:text-[#D8B65C]">
                            <ShoppingBag size={15} />
                          </div>
                          <div>
                            <p className="font-mono text-xs font-black text-[#1C3324] dark:text-zinc-100">
                              {order.orderNumber || `#${order.id.slice(0, 7)}`}
                            </p>
                            <span className="text-[10px] text-[#3A5A46] dark:text-zinc-400">
                              شناسه سفارش
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Customer */}
                      <TableCell>
                        <div>
                          <p className="text-xs font-bold text-[#1C3324] dark:text-zinc-100">
                            {customerName}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-[#3A5A46] dark:text-zinc-400">
                            {customerPhone}
                          </p>
                        </div>
                      </TableCell>

                      {/* Amount */}
                      <TableCell>
                        <div className="font-mono font-black text-xs text-[#1C3324] dark:text-zinc-100">
                          {totalAmount.toLocaleString("fa-IR")}{" "}
                          <span className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
                            تومان
                          </span>
                        </div>
                      </TableCell>

                      {/* Payment Status */}
                      <TableCell>
                        <div className="space-y-1">
                          {getPaymentStatusBadge(order.paymentStatus)}
                          {order.paymentStatus === "unpaid" && order.status !== "cancelled" && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={(e) => handleOpenSettlementModal(order, e)}
                              className="block text-[10px] font-black text-emerald-700 hover:underline dark:text-emerald-400"
                            >
                              + تایید واریز و تسویه
                            </button>
                          )}
                        </div>
                      </TableCell>

                      {/* Order Status */}
                      <TableCell>{getOrderStatusBadge(order.status)}</TableCell>

                      {/* Linked Invoice */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {linkedInvoice ? (
                          <div className="flex flex-col gap-1">
                            <Link
                              href={`/dashboard/invoices/${linkedInvoice.id}`}
                              className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#8B263E] hover:underline dark:text-[#D8B65C]"
                              title="مشاهده فاکتور"
                            >
                              <Receipt size={13} />
                              <span>{linkedInvoice.invoiceNumber}</span>
                            </Link>
                            <span className="text-[10px] text-[#3A5A46] dark:text-zinc-400">
                              {linkedInvoice.paymentStatus === "paid" ? "تسویه شده" : "در انتظار پرداخت"}
                            </span>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isUpdating}
                            onClick={(e) => void handleManualTriggerInvoice(order.id, e)}
                            className="h-7 text-[10px] gap-1 px-2 border-dashed"
                          >
                            <Sparkles size={11} />
                            <span>صدور خودکار فاکتور</span>
                          </Button>
                        )}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="font-mono text-[10px] text-[#3A5A46] dark:text-zinc-400 whitespace-nowrap">
                        {formatDate(order.created)}
                      </TableCell>

                      {/* Actions Workflow */}
                      <TableCell className="text-left" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {order.status === "pending" && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                disabled={isUpdating}
                                onClick={() => void updateOrderStatus(order.id, "processing")}
                                className="h-7 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700"
                                title="تایید سفارش و صدور خودکار فاکتور"
                              >
                                <Check size={12} className="ml-1" />
                                تایید و صدور فاکتور
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={isUpdating}
                                onClick={() => void updateOrderStatus(order.id, "cancelled")}
                                className="h-7 px-2 text-[10px]"
                                title="لغو سفارش"
                              >
                                <X size={12} />
                              </Button>
                            </>
                          )}

                          {order.status === "paid" && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={isUpdating}
                              onClick={() => void updateOrderStatus(order.id, "processing")}
                              className="h-7 px-2 text-[10px]"
                            >
                              <RefreshCw size={12} className="ml-1" />
                              ارسال به کارگاه
                            </Button>
                          )}

                          {order.status === "processing" && (
                            <Button
                              variant="gold"
                              size="sm"
                              disabled={isUpdating}
                              onClick={() => void updateOrderStatus(order.id, "delivered")}
                              className="h-7 px-2 text-[10px]"
                            >
                              <PackageCheck size={12} className="ml-1" />
                              تحویل شد
                            </Button>
                          )}

                          <Button
                            asChild
                            variant="ghost"
                            size="icon-sm"
                            title="مشاهده پرونده کامل سفارش"
                          >
                            <Link href={`/dashboard/orders/${order.id}`}>
                              <Eye size={14} />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 1-Click Settlement Modal (کارت‌به‌کارت / اقساطی / امانی) */}
      <Dialog open={Boolean(settleTargetOrder)} onOpenChange={() => setSettleTargetOrder(null)}>
        <DialogContent className="max-w-md dark:border-white/10 dark:bg-[#15221B]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                <Receipt size={22} />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                  تأیید واریز و ثبت خودکار تسویه مالی
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
                  سفارش #{settleTargetOrder?.orderNumber || settleTargetOrder?.id.slice(0, 7)} به مبلغ{" "}
                  {settleTargetOrder ? formatMoney(settleTargetOrder.totalAmount) : 0} تومان
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="mb-1.5 block font-bold text-[#3A5A46] dark:text-zinc-300">
                روش پرداخت و تسویه
              </label>
              <select
                value={settlementMethod}
                onChange={(e) => setSettlementMethod(e.target.value)}
                className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] p-3 text-xs font-bold text-[#1C3324] outline-none dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-100"
              >
                <option value="card_to_card">کارت به کارت (واریز بانکی)</option>
                <option value="installment">اقساطی / اسنپ‌پی / تارا</option>
                <option value="cash">نقدی / تحویل حضوری در گالری</option>
                <option value="online">درگاه بانکی مستقیم</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block font-bold text-[#3A5A46] dark:text-zinc-300">
                کد رهگیری / شماره ارجاع فیش واریز
              </label>
              <Input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="شماره پیگیری فیش یا ارجاع بانکی"
                className="font-mono text-xs font-bold"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-bold text-[#3A5A46] dark:text-zinc-300">
                یادداشت تسویه (اختیاری)
              </label>
              <Input
                type="text"
                value={settlementNotes}
                onChange={(e) => setSettlementNotes(e.target.value)}
                placeholder="مثال: فیش واریزی در واتساپ تایید شد"
                className="text-xs"
              />
            </div>

            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 text-[11px] leading-5">
              با تایید این بخش، وضعیت سفارش به «پرداخت شده»، فاکتور به «تسویه کامل» و سند مالی در کالکشن settlements ثبت می‌گردد.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSettleTargetOrder(null)}
              disabled={isSubmittingSettlement}
            >
              انصراف
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmSettlement}
              disabled={isSubmittingSettlement}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmittingSettlement ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>در حال ثبت تسویه...</span>
                </>
              ) : (
                <>
                  <CheckCheck size={14} />
                  <span>تأیید واریز و ثبت تسویه</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}