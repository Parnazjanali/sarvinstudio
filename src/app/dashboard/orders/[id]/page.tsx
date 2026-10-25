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
  FileText,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCheck,
  Copy,
  Printer,
  Boxes,
  Scale,
} from "lucide-react";
import pb from "@/lib/pocketbase";
import { recordAuditLogClient } from "@/lib/audit-client";
import {
  syncOrderToInvoiceAndSettlement,
  confirmOrderDepositAndSettle,
  getInvoiceForOrder,
  getSettlementForInvoice,
  type InvoiceRecord,
  type SettlementRecord,
} from "@/lib/order-invoice-sync";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
  items?: any;
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
    if (Number.isNaN(date.getTime())) return dateString;

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

const statusLabelsMap: Record<OrderStatus, string> = {
  pending: "در انتظار بررسی",
  paid: "پرداخت شده",
  processing: "در حال ساخت و آماده‌سازی",
  delivered: "تحویل داده شد",
  cancelled: "لغو شده",
};

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const orderId =
    typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [settlement, setSettlement] = useState<SettlementRecord | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Settlement Dialog
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settlementMethod, setSettlementMethod] = useState("card_to_card");
  const [trackingCode, setTrackingCode] = useState("");
  const [settlementNotes, setSettlementNotes] = useState("");
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);

  /* =======================================================
     Load Order, Linked Invoice & Settlement Record
  ======================================================= */

  const fetchOrderData = useCallback(async () => {
    if (!orderId) return;

    setIsLoading(true);
    setError("");

    try {
      const orderRecord = await pb.collection("orders").getOne<OrderRecord>(orderId, {
        expand: "user,address",
        requestKey: null,
      });

      setOrder(orderRecord);

      // بررسی فاکتور متصل
      const linkedInvoice = await getInvoiceForOrder(orderId);
      setInvoice(linkedInvoice);

      if (linkedInvoice) {
        const linkedSettlement = await getSettlementForInvoice(linkedInvoice.id);
        setSettlement(linkedSettlement);
      }
    } catch (err) {
      console.error("PocketBase fetch order error:", err);
      setError("سفارش پیدا نشد یا دسترسی به آن امکان‌پذیر نیست.");
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void fetchOrderData();
  }, [fetchOrderData]);

  /* =======================================================
     Update Order Status with Auto-Invoice Sync
  ======================================================= */

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    if (!order) return;

    setIsUpdating(true);
    setError("");
    setSuccessMessage("");

    try {
      const updated = await pb.collection("orders").update<OrderRecord>(order.id, {
        status: newStatus,
      });

      setOrder((current) => (current ? { ...current, ...updated } : updated));

      // اگر به تایید سفارش (processing) یا پرداخت شده (paid) تغییر کرد، تریگر فاکتور اجرا می‌شود
      if (newStatus === "processing" || newStatus === "paid") {
        try {
          const syncResult = await syncOrderToInvoiceAndSettlement(order.id, {
            forceStatus: newStatus,
          });

          if (syncResult.invoice) {
            setInvoice(syncResult.invoice);
            if (syncResult.settlement) setSettlement(syncResult.settlement);
            setSuccessMessage(
              `وضعیت سفارش به «${statusLabelsMap[newStatus]}» تغییر یافت و فاکتور #${syncResult.invoice.invoiceNumber} ثبت گردید.`
            );
          }
        } catch (syncErr) {
          console.error("Auto invoice sync error:", syncErr);
        }
      } else {
        setSuccessMessage(`وضعیت سفارش به «${statusLabelsMap[newStatus]}» تغییر یافت.`);
      }

      void recordAuditLogClient({
        category: "order",
        title: `تغییر وضعیت سفارش #${order.orderNumber || order.id.slice(0, 7)}`,
        description: `وضعیت سفارش به «${statusLabelsMap[newStatus]}» بروزرسانی شد.`,
        level: newStatus === "cancelled" ? "warning" : "info",
        targetId: order.id,
        targetType: "order",
      });
    } catch (err) {
      console.error("Error updating order status:", err);
      setError("خطا در تغییر وضعیت سفارش.");
    } finally {
      setIsUpdating(false);
    }
  };

  /* =======================================================
     Manual Trigger Invoice
  ======================================================= */

  const handleTriggerInvoice = async () => {
    if (!order) return;

    setIsUpdating(true);
    setError("");

    try {
      const res = await syncOrderToInvoiceAndSettlement(order.id);
      if (res.invoice) {
        setInvoice(res.invoice);
        if (res.settlement) setSettlement(res.settlement);
        setSuccessMessage(`فاکتور رسمی شماره #${res.invoice.invoiceNumber} با موفقیت صادر گردید.`);
      }
    } catch (err) {
      console.error("Trigger invoice error:", err);
      setError("خطا در صدور خودکار فاکتور.");
    } finally {
      setIsUpdating(false);
    }
  };

  /* =======================================================
     Confirm Deposit & Settlement
  ======================================================= */

  const handleConfirmSettlement = async () => {
    if (!order) return;

    setIsSubmittingSettlement(true);
    setError("");

    try {
      const res = await confirmOrderDepositAndSettle(order.id, {
        paymentMethod: settlementMethod,
        trackingCode: trackingCode.trim() || undefined,
        amount: Number(order.totalAmount) || 0,
        notes: settlementNotes.trim() || undefined,
      });

      setOrder((prev) => (prev ? { ...prev, paymentStatus: "paid", status: "processing" } : prev));
      if (res.invoice) setInvoice(res.invoice);
      if (res.settlement) setSettlement(res.settlement);

      setSuccessMessage("واریز تایید شد، سند تسویه ایجاد گردید و فاکتور به حالت تسویه‌شده تغییر یافت.");
      setIsSettleModalOpen(false);
    } catch (err) {
      console.error("Settlement error:", err);
      setError("خطا در تایید تسویه حساب.");
    } finally {
      setIsSubmittingSettlement(false);
    }
  };

  if (isLoading) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#FAF9F6] dark:bg-[#101813]">
        <div className="flex flex-col items-center gap-3 text-[#3A5A46] dark:text-zinc-400">
          <RefreshCw className="h-8 w-8 animate-spin text-[#8B263E] dark:text-[#D8B65C]" />
          <span className="text-xs font-bold">در حال دریافت پرونده سفارش و فاکتور...</span>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#FAF9F6] p-6 text-[#1C3324] dark:bg-[#101813] dark:text-zinc-100">
        <div className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xs dark:border-rose-900/40 dark:bg-[#15221B]">
          <XCircle className="mx-auto h-12 w-12 text-rose-600" />
          <h2 className="mt-4 text-base font-black">سفارش یافت نشد</h2>
          <p className="mt-2 text-xs text-[#3A5A46] dark:text-zinc-400">
            {error || "اطلاعات سفارش در پایگاه داده موجود نیست."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="default" onClick={() => router.push("/dashboard/orders")}>
              بازگشت به لیست سفارش‌ها
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const customerName = order.shippingFullName || order.expand?.user?.name || "خریدار مهمان";
  const customerPhone = order.shippingPhone || order.expand?.user?.phone || "-";
  const address = order.expand?.address;
  const fullAddress = address?.fullAddress || address?.street || "";
  const province = address?.province || order.shippingProvince || "";
  const city = address?.city || "";
  const postalCode = address?.postalCode || order.shippingPostalCode || "";
  const shippingCost = numberValue(order.shippingCost);
  const totalAmount = numberValue(order.totalAmount);

  // Parse items
  const orderItemsList = Array.isArray(order.items) && order.items.length > 0 ? order.items : [];

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#FAF9F6] p-4 font-sans text-[#1C3324] sm:p-6 lg:p-8 dark:bg-[#101813] dark:text-zinc-100"
    >
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Top Header */}
        <div className="flex flex-col justify-between gap-5 rounded-3xl border border-[#1C3324]/12 bg-white/80 p-5 shadow-xs backdrop-blur-md transition-colors lg:flex-row lg:items-center lg:p-6 dark:border-white/10 dark:bg-[#15221B]/80">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs font-bold text-[#3A5A46] hover:text-[#8B263E] dark:text-zinc-400 dark:hover:text-[#D8B65C]"
              >
                <Link href="/dashboard/orders">
                  <ArrowRight className="h-4 w-4" />
                  بازگشت به لیست سفارش‌ها
                </Link>
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1C3324] text-white shadow-xs dark:bg-[#D8B65C] dark:text-[#101813]">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-black tracking-tight text-[#1C3324] sm:text-3xl dark:text-zinc-100">
                    پرونده سفارش #{order.orderNumber || order.id.slice(0, 8)}
                  </h1>
                  <Badge
                    variant={
                      order.status === "paid"
                        ? "success"
                        : order.status === "processing"
                        ? "secondary"
                        : order.status === "delivered"
                        ? "gold"
                        : order.status === "cancelled"
                        ? "destructive"
                        : "warning"
                    }
                    className="font-bold text-xs"
                  >
                    {statusLabelsMap[order.status || "pending"]}
                  </Badge>
                  <Badge
                    variant={order.paymentStatus === "paid" ? "success" : "outline"}
                    className="font-bold text-xs"
                  >
                    {order.paymentStatus === "paid" ? "تسویه کامل" : "در انتظار تسویه"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
                  ثبت شده در {formatDate(order.created)} · خریدار: {customerName}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {invoice ? (
              <Button asChild variant="default" size="default" className="gap-2">
                <Link href={`/dashboard/invoices/${invoice.id}`}>
                  <Receipt className="h-4 w-4" />
                  <span>مشاهده فاکتور صادرشده (#{invoice.invoiceNumber})</span>
                </Link>
              </Button>
            ) : (
              <Button
                variant="default"
                size="default"
                onClick={handleTriggerInvoice}
                disabled={isUpdating}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Sparkles className="h-4 w-4" />
                <span>صدور خودکار فاکتور این سفارش</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="default"
              onClick={() => window.print()}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              <span>چاپ سفارش</span>
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={17} className="text-emerald-600 dark:text-emerald-400" />
              <span>{successMessage}</span>
            </div>
            <button type="button" onClick={() => setSuccessMessage("")}>
              <X size={15} />
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            <div className="flex items-center gap-2">
              <AlertCircle size={17} className="text-rose-600" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError("")}>
              <X size={15} />
            </button>
          </div>
        )}

        {/* Main Layout Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

          {/* Left/Main Column: Order Info, Items & Customer (8 Cols) */}
          <div className="space-y-6 lg:col-span-8">

            {/* Linked Invoice & Settlement Trigger Card */}
            <Card className="border-[#1C3324]/12 bg-gradient-to-br from-white via-white to-amber-50/30 p-6 backdrop-blur-md dark:border-white/10 dark:from-[#15221B] dark:via-[#15221B] dark:to-emerald-950/30 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1C3324]/10 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-[#8B263E] dark:text-[#D8B65C]" />
                  <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                    وضعیت فاکتور و تسویه خودکار
                  </h2>
                </div>
                {invoice && (
                  <Badge variant="gold" className="font-bold">
                    فاکتور #{invoice.invoiceNumber}
                  </Badge>
                )}
              </div>

              {invoice ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4 dark:border-white/10 dark:bg-zinc-900/40">
                      <span className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
                        شماره فاکتور رسمی
                      </span>
                      <div className="mt-1 font-mono text-sm font-black text-[#8B263E] dark:text-[#D8B65C]">
                        {invoice.invoiceNumber}
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        تاریخ: {formatDate(invoice.created)}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4 dark:border-white/10 dark:bg-zinc-900/40">
                      <span className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
                        وضعیت تسویه مالی فاکتور
                      </span>
                      <div className="mt-1 font-bold text-xs">
                        {invoice.paymentStatus === "paid" ? (
                          <span className="text-emerald-700 dark:text-emerald-400">تسویه کامل شده</span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400">در انتظار پرداخت / واریز</span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        مبلغ: {formatMoney(invoice.totalAmount || totalAmount)} تومان
                      </span>
                    </div>

                    <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4 dark:border-white/10 dark:bg-zinc-900/40">
                      <span className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
                        سند تسویه در settlements
                      </span>
                      <div className="mt-1 font-mono text-xs font-black text-[#1C3324] dark:text-zinc-200">
                        {settlement ? (
                          <span className="text-emerald-700 dark:text-emerald-400">
                            {settlement.trackingCode || "ثبت شده"}
                          </span>
                        ) : (
                          <span className="text-zinc-400">فاقد سند تسویه</span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        روش: {settlement?.paymentMethod === "online" ? "درگاه آنلاین" : settlement?.paymentMethod === "card_to_card" ? "کارت‌به‌کارت" : settlement?.paymentMethod || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <Button asChild variant="default" size="sm" className="gap-2">
                      <Link href={`/dashboard/invoices/${invoice.id}`}>
                        <ExternalLink size={14} />
                        <span>مشاهده و چاپ برگه فاکتور طلا</span>
                      </Link>
                    </Button>

                    {invoice.paymentStatus !== "paid" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTrackingCode(`CARD-${Math.floor(100000 + Math.random() * 900000)}`);
                          setIsSettleModalOpen(true);
                        }}
                        className="gap-2 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                      >
                        <CheckCheck size={14} />
                        <span>تایید واریز و ثبت تسویه فاکتور</span>
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#1C3324]/20 p-6 text-center dark:border-white/20 space-y-3">
                  <Receipt className="mx-auto h-8 w-8 text-[#8B263E] dark:text-[#D8B65C]" />
                  <p className="text-xs font-bold text-[#1C3324] dark:text-zinc-200">
                    برای این سفارش هنوز فاکتوری صادر نشده است.
                  </p>
                  <p className="text-xs text-[#3A5A46] dark:text-zinc-400">
                    با کلیک روی دکمه زیر، فاکتور با کپی اقلام و مشخصات خریدار خودکار صادر می‌گردد.
                  </p>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleTriggerInvoice}
                    disabled={isUpdating}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Sparkles size={14} />
                    <span>صدور خودکار فاکتور سفارش</span>
                  </Button>
                </div>
              )}
            </Card>

            {/* Order Items Breakdown */}
            <Card className="border-[#1C3324]/12 bg-white/80 p-6 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1C3324]/10 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-[#8B263E] dark:text-[#D8B65C]" />
                  <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                    اقلام سفارش
                  </h2>
                </div>
                <Badge variant="secondary" className="font-bold">
                  {orderItemsList.length > 0 ? `${orderItemsList.length} ردیف کالا` : "۱ بسته"}
                </Badge>
              </div>

              {orderItemsList.length > 0 ? (
                <div className="space-y-3">
                  {orderItemsList.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4 dark:border-white/10 dark:bg-zinc-900/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-black/10 font-bold text-xs dark:bg-zinc-800 dark:border-white/10">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="text-xs font-black text-[#1C3324] dark:text-zinc-100">
                            {item.title || item.name || "زیورآلات طلا"}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-400">
                            {item.weight && <span>وزن: {Number(item.weight).toFixed(3)} گرم</span>}
                            {item.karat && <span>عیار: {item.karat}k</span>}
                            {item.quantity && <span>تعداد: {item.quantity} عدد</span>}
                          </div>
                        </div>
                      </div>

                      <div className="font-mono text-xs font-black text-[#8B263E] dark:text-[#D8B65C]">
                        {formatMoney(item.price || item.totalPrice || 0)} تومان
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-2xl bg-[#FAF9F6] p-4 dark:bg-zinc-900/40">
                  <div className="text-xs font-bold text-[#1C3324] dark:text-zinc-200">
                    سفارش اینترنتی طلا و جواهر (سبد خرید #{order.orderNumber || order.id.slice(0, 7)})
                  </div>
                  <div className="font-mono text-xs font-black text-[#8B263E] dark:text-[#D8B65C]">
                    {formatMoney(totalAmount)} تومان
                  </div>
                </div>
              )}

              {/* Financial Totals */}
              <div className="pt-4 border-t border-[#1C3324]/10 dark:border-white/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#3A5A46] dark:text-zinc-400">مبلغ محصولات:</span>
                  <span className="font-mono font-bold">{formatMoney(totalAmount - shippingCost)} تومان</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#3A5A46] dark:text-zinc-400">هزینه ارسال و بیمه:</span>
                  <span className="font-mono font-bold">{formatMoney(shippingCost)} تومان</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-black/5 dark:border-white/5 text-sm font-black text-[#8B263E] dark:text-[#D8B65C]">
                  <span>مبلغ کل قابل پرداخت:</span>
                  <span className="font-mono">{formatMoney(totalAmount)} تومان</span>
                </div>
              </div>
            </Card>

            {/* Customer & Shipping Details */}
            <Card className="border-[#1C3324]/12 bg-white/80 p-6 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1C3324]/10 dark:border-white/10">
                <Truck className="h-5 w-5 text-[#8B263E] dark:text-[#D8B65C]" />
                <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                  مشخصات تحویل‌گیرنده و آدرس ارسال
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#3A5A46] dark:text-zinc-400">نام گیرنده:</span>
                  <p className="mt-1 font-bold text-[#1C3324] dark:text-zinc-100">{customerName}</p>
                </div>
                <div>
                  <span className="text-[#3A5A46] dark:text-zinc-400">شماره تماس همراه:</span>
                  <p className="mt-1 font-mono font-bold text-[#1C3324] dark:text-zinc-100">{customerPhone}</p>
                </div>
                <div>
                  <span className="text-[#3A5A46] dark:text-zinc-400">روش ارسال انتخابی:</span>
                  <p className="mt-1 font-bold text-[#1C3324] dark:text-zinc-100">{order.shippingMethod || "پیک ویژه امن / پست پیشتاز"}</p>
                </div>
                <div>
                  <span className="text-[#3A5A46] dark:text-zinc-400">کد پستی:</span>
                  <p className="mt-1 font-mono font-bold text-[#1C3324] dark:text-zinc-100">{postalCode || "ثبت نشده"}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[#3A5A46] dark:text-zinc-400">آدرس پستی کامل:</span>
                  <p className="mt-1 leading-6 font-medium text-[#1C3324] dark:text-zinc-200">
                    {province && `${province} - `}
                    {city && `${city} - `}
                    {fullAddress || "آدرس کامل توسط کاربر ثبت نشده است."}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Workflow Steps & Action Buttons (4 Cols) */}
          <div className="space-y-6 lg:col-span-4">

            {/* Workflow Progression Stepper */}
            <Card className="border-[#1C3324]/12 bg-white/80 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80 space-y-4">
              <h3 className="text-xs font-black text-[#1C3324] dark:text-zinc-100">
                مراحل پردازش و چرخه سفارش
              </h3>

              <div className="space-y-3">
                {/* Step 1: Placed */}
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1C3324] dark:text-zinc-100">ثبت سفارش توسط خریدار</p>
                    <span className="text-[10px] text-zinc-400">{formatDate(order.created)}</span>
                  </div>
                </div>

                {/* Step 2: Invoice Issued */}
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    invoice ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800"
                  )}>
                    {invoice ? "✓" : "۲"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1C3324] dark:text-zinc-100">صدور فاکتور رسمی</p>
                    <span className="text-[10px] text-zinc-400">
                      {invoice ? `فاکتور #${invoice.invoiceNumber}` : "در انتظار صدور یا تایید"}
                    </span>
                  </div>
                </div>

                {/* Step 3: Payment & Settlement */}
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    order.paymentStatus === "paid" ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800"
                  )}>
                    {order.paymentStatus === "paid" ? "✓" : "۳"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1C3324] dark:text-zinc-100">تسویه مالی و ثبت سند</p>
                    <span className="text-[10px] text-zinc-400">
                      {order.paymentStatus === "paid" ? "تسویه قطعی انجام شد" : "در انتظار پرداخت / تایید رسید"}
                    </span>
                  </div>
                </div>

                {/* Step 4: Workshop Processing */}
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    order.status === "processing" || order.status === "delivered" ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800"
                  )}>
                    {order.status === "delivered" ? "✓" : "۴"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1C3324] dark:text-zinc-100">آماده‌سازی در کارگاه طلا</p>
                    <span className="text-[10px] text-zinc-400">کنترل کیفیت و بسته‌بندی</span>
                  </div>
                </div>

                {/* Step 5: Delivered */}
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    order.status === "delivered" ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800"
                  )}>
                    {order.status === "delivered" ? "✓" : "۵"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1C3324] dark:text-zinc-100">تحویل نهایی به مشتری</p>
                    <span className="text-[10px] text-zinc-400">تکمیل چرخه سفارش</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Actions Card */}
            <Card className="border-[#1C3324]/12 bg-white/80 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80 space-y-3">
              <h3 className="text-xs font-black text-[#1C3324] dark:text-zinc-100">
                اقدامات مدیریتی سفارش
              </h3>

              {order.status === "pending" && (
                <>
                  <Button
                    variant="default"
                    size="default"
                    disabled={isUpdating}
                    onClick={() => void updateOrderStatus("processing")}
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Check size={16} />
                    <span>تأیید سفارش و صدور خودکار فاکتور</span>
                  </Button>

                  <Button
                    variant="destructive"
                    size="default"
                    disabled={isUpdating}
                    onClick={() => void updateOrderStatus("cancelled")}
                    className="w-full gap-2"
                  >
                    <X size={16} />
                    <span>لغو سفارش</span>
                  </Button>
                </>
              )}

              {order.paymentStatus === "unpaid" && order.status !== "cancelled" && (
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => {
                    setTrackingCode(`CARD-${Math.floor(100000 + Math.random() * 900000)}`);
                    setIsSettleModalOpen(true);
                  }}
                  className="w-full gap-2 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                >
                  <CheckCheck size={16} />
                  <span>تأیید واریز (کارت‌به‌کارت / اقساطی)</span>
                </Button>
              )}

              {order.status === "paid" && (
                <Button
                  variant="default"
                  size="default"
                  disabled={isUpdating}
                  onClick={() => void updateOrderStatus("processing")}
                  className="w-full gap-2"
                >
                  <RefreshCw size={16} />
                  <span>ارسال سفارش به صف کارگاه</span>
                </Button>
              )}

              {order.status === "processing" && (
                <Button
                  variant="default"
                  size="default"
                  disabled={isUpdating}
                  onClick={() => void updateOrderStatus("delivered")}
                  className="w-full gap-2 bg-teal-600 hover:bg-teal-700"
                >
                  <PackageCheck size={16} />
                  <span>ثبت نهایی تحویل به مشتری</span>
                </Button>
              )}
            </Card>

            {/* Technical IDs Card */}
            <Card className="border-[#1C3324]/12 bg-white/80 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                <span className="text-[#3A5A46] dark:text-zinc-400">شناسه سفارش:</span>
                <span className="font-mono text-[11px] font-bold">{order.id}</span>
              </div>
              {order.user && (
                <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                  <span className="text-[#3A5A46] dark:text-zinc-400">شناسه کاربر:</span>
                  <span className="font-mono text-[11px] font-bold">{order.user}</span>
                </div>
              )}
              {invoice && (
                <div className="flex justify-between py-1">
                  <span className="text-[#3A5A46] dark:text-zinc-400">شناسه فاکتور:</span>
                  <span className="font-mono text-[11px] font-bold">{invoice.id}</span>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* 1-Click Settlement Modal */}
      <Dialog open={isSettleModalOpen} onOpenChange={setIsSettleModalOpen}>
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
                  سفارش #{order.orderNumber || order.id.slice(0, 7)} به مبلغ {formatMoney(totalAmount)} تومان
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="mb-1.5 block font-bold text-[#3A5A46] dark:text-zinc-300">
                روش تسویه و پرداخت
              </label>
              <select
                value={settlementMethod}
                onChange={(e) => setSettlementMethod(e.target.value)}
                className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] p-3 text-xs font-bold text-[#1C3324] outline-none dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-100"
              >
                <option value="card_to_card">کارت به کارت (واریز مستقیم)</option>
                <option value="installment">فروش اقساطی / اعتباری (اسنپ‌پی/تارا)</option>
                <option value="cash">نقدی / تحویل حضوری در گالری</option>
                <option value="online">درگاه بانکی</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block font-bold text-[#3A5A46] dark:text-zinc-300">
                کد رهگیری / شماره ارجاع فیش بانکی
              </label>
              <Input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="شماره پیگیری فیش بانکی"
                className="font-mono text-xs font-bold"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-bold text-[#3A5A46] dark:text-zinc-300">
                یادداشت تسویه
              </label>
              <Input
                type="text"
                value={settlementNotes}
                onChange={(e) => setSettlementNotes(e.target.value)}
                placeholder="توضیحات واریز یا نام بانک..."
                className="text-xs"
              />
            </div>

            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 text-[11px] leading-5">
              با تایید این فرم، فاکتور سفارش به «پرداخت شده» تغییر وضعیت داده و رکورد تسویه در کالکشن settlements ثبت می‌گردد.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsSettleModalOpen(false)}
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
                  <span>تأیید و ثبت تسویه</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}