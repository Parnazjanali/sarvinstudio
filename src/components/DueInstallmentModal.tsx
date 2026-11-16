"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing,
  CreditCard,
  X,
  Sparkles,
  Calendar,
  Send,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import {
  resolveOrderInstallmentWeights,
  isInstallmentDue,
  formatGoldWeight,
} from "@/lib/installment-utils";

function formatPrice(num: number | string | undefined) {
  const n = Number(num);
  if (!Number.isFinite(n) || n <= 0) return "۰ تومان";
  return `${new Intl.NumberFormat("fa-IR").format(n)} تومان`;
}

type DueOrderData = {
  orderId: string;
  orderNumber: string;
  productTitle: string;
  shareWeight: number;
  totalWeight: number;
  nextInstallmentNum: number;
  dueDateShamsi: string;
  daysRemaining: number;
  isOverdue: boolean;
  phone: string;
  calculatedAmount: number;
};

export default function DueInstallmentModal() {
  const router = useRouter();
  const [dueOrder, setDueOrder] = useState<DueOrderData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function checkDueInstallments() {
      if (!pb.authStore.isValid || !pb.authStore.model?.id) return;

      try {
        const userId = pb.authStore.model.id;
        // ۱. دریافت سفارش‌های کاربر
        const records = await pb.collection("orders").getList(1, 20, {
          filter: `user = "${userId}" && paymentStatus != "cancelled"`,
          sort: "-created",
          requestKey: null,
        });

        if (isCancelled || !records.items || records.items.length === 0) return;

        // ۲. دریافت مظنه لحظه‌ای طلا جهت محاسبه دقیق قیمت روز
        let liveGoldRate = 26500000;
        try {
          const goldRes = await fetch("/api/sync-gold");
          const goldData = await goldRes.json();
          if (goldData?.success && goldData?.results) {
            const gold18k = goldData.results.find((r: any) => r.symbol === "IR_GOLD_18K");
            if (gold18k && Number(gold18k.price) > 0) {
              liveGoldRate = Number(gold18k.price);
            }
          }
        } catch {
          // استفاده از نرخ پیش‌فرض در صورت خطا
        }

        // ۳. بررسی سفارش‌های دارای قسط سررسید شده
        for (const order of records.items) {
          const items = Array.isArray(order.items)
            ? order.items
            : typeof order.items === "string"
              ? JSON.parse(order.items || "[]")
              : [];

          const installmentItem = items.find((it: any) => it.isInstallment);
          if (!installmentItem) continue;

          const { totalWeight, shareWeight, currentInstallmentNum } = resolveOrderInstallmentWeights(installmentItem);
          if (currentInstallmentNum >= 3) continue; // اقساط تکمیل شده

          const dueInfo = isInstallmentDue(order.created, currentInstallmentNum);

          if (dueInfo.isDue) {
            const dismissKey = `parnazar_due_dismissed_${order.id}_${dueInfo.nextInstallmentNumber}`;
            const isDismissed = sessionStorage.getItem(dismissKey);

            if (!isDismissed) {
              const amount = Math.round(shareWeight * liveGoldRate);

              setDueOrder({
                orderId: order.id,
                orderNumber: order.orderNumber || order.id,
                productTitle: installmentItem.productTitle || "سفارش طلای ۱۸ عیار",
                shareWeight,
                totalWeight,
                nextInstallmentNum: dueInfo.nextInstallmentNumber,
                dueDateShamsi: dueInfo.dueDateShamsi,
                daysRemaining: dueInfo.daysRemaining,
                isOverdue: dueInfo.isOverdue,
                phone: order.shippingPhone || "",
                calculatedAmount: amount,
              });

              setIsOpen(true);
              break;
            }
          }
        }
      } catch (err) {
        console.error("Check due installment error:", err);
      }
    }

    // تاخیر کوچک بعد از بارگذاری صفحه برای تجربه کاربری روان
    const timer = setTimeout(checkDueInstallments, 1200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (!isOpen || !dueOrder) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(
      `parnazar_due_dismissed_${dueOrder.orderId}_${dueOrder.nextInstallmentNum}`,
      "true"
    );
    setIsOpen(false);
  };

  const handlePayNow = async () => {
    try {
      setIsPaying(true);
      const res = await fetch("/api/payment/pay-installment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: dueOrder.orderId,
          installmentNumber: dueOrder.nextInstallmentNum,
          amount: dueOrder.calculatedAmount,
          phone: dueOrder.phone,
        }),
      });

      const data = await res.json();
      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error(data.message || "خطا در اتصال به درگاه بانکی.");
      }
    } catch (e: any) {
      toast.error(e.message || "خطایی رخ داد.");
      setIsPaying(false);
    }
  };

  const handleSendSms = async () => {
    try {
      setIsSendingSms(true);
      const res = await fetch("/api/sms/send-installment-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: dueOrder.orderId,
          installmentNumber: dueOrder.nextInstallmentNum,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("پیامک یادآوری موعد قسط به شماره شما ارسال شد.");
      } else {
        throw new Error(data.message || "ارسال پیامک با خطا مواجه شد.");
      }
    } catch (e: any) {
      toast.error(e.message || "خطا در ارسال پیامک.");
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleGoToInstallments = () => {
    handleDismiss();
    router.push(`/account/orders/${dueOrder.orderId}/installments`);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs font-sans"
      onClick={handleDismiss}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-[#3B0B14]/15 space-y-5 text-[#3B0B14] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* دکمه بستن */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-[#3B0B14] hover:bg-black/10 transition cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* سربرگ هویت پرنا زر و هشدار */}
        <div className="flex items-start gap-3.5 pr-1">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B142D] to-[#580F1F] text-white shadow-md">
            <BellRing size={22} className="animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DFB76C] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#DFB76C]"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#DFB76C]/25 text-[#9E782F] border border-[#DFB76C]/40">
                طرح اقساط طلایی پرنا زر
              </span>
              <span className="text-[10px] font-bold text-[#8B142D] bg-[#8B142D]/10 px-2 py-0.5 rounded-full">
                سر هر برج
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-[#3B0B14] mt-1 font-heading leading-tight">
              زمان پرداخت قسط {dueOrder.nextInstallmentNum} فرا رسیده است
            </h3>
          </div>
        </div>

        {/* کارت مشخصات قسط و فاکتور روز */}
        <div className="rounded-2xl bg-[#FDF8F9] p-4 border border-[#3B0B14]/10 space-y-2.5 text-xs">
          <div className="flex justify-between items-center border-b border-[#3B0B14]/10 pb-2">
            <span className="text-[#6E3A44] font-medium">سفارش مربوطه:</span>
            <span className="font-bold text-[#3B0B14]">#{dueOrder.orderNumber}</span>
          </div>

          <div className="flex justify-between items-center border-b border-[#3B0B14]/10 pb-2">
            <span className="text-[#6E3A44] font-medium">نام محصول:</span>
            <span className="font-bold text-[#3B0B14] line-clamp-1 max-w-[240px]">
              {dueOrder.productTitle}
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-[#3B0B14]/10 pb-2">
            <span className="text-[#6E3A44] font-medium">وزن سهمی این قسط:</span>
            <strong className="font-mono font-black text-[#3B0B14]">
              {dueOrder.shareWeight.toFixed(2)} گرم طلای ۱۸ عیار
            </strong>
          </div>

          <div className="flex justify-between items-center border-b border-[#3B0B14]/10 pb-2">
            <span className="text-[#6E3A44] font-medium">موعد سررسید ماهانه:</span>
            <span className="font-bold text-[#8B142D] flex items-center gap-1">
              <Calendar size={13} />
              {dueOrder.dueDateShamsi}
              {dueOrder.isOverdue && " (گذشته)"}
            </span>
          </div>

          <div className="flex justify-between items-center pt-1 text-sm">
            <span className="font-black text-[#3B0B14]">مبلغ قسط به نرخ زنده روز طلا:</span>
            <strong className="font-mono font-black text-base text-[#8B142D]">
              {formatPrice(dueOrder.calculatedAmount)}
            </strong>
          </div>
        </div>

        <p className="text-[11px] text-[#6E3A44] leading-relaxed">
          🔒 مطابق با مقررات زرگری پرنا زر، اقساط سر هر برج با نرخ همان روز طلا در بازار تسویه می‌شوند و پس از پرداخت قسط سوم، فاکتور رسمی قطعی برای شما صادر می‌گردد.
        </p>

        {/* دکمه‌های عملیاتی */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handlePayNow}
            disabled={isPaying}
            className="w-full h-12 rounded-2xl bg-[#8B142D] hover:bg-[#721f32] text-white text-xs font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isPaying ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>در حال انتقال به درگاه بانکی...</span>
              </>
            ) : (
              <>
                <CreditCard size={16} />
                <span>پرداخت آنلاین قسط {dueOrder.nextInstallmentNum} با قیمت روز طلا</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleGoToInstallments}
              className="h-10 rounded-xl bg-white border border-[#3B0B14]/15 hover:bg-[#3B0B14]/5 text-[#3B0B14] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>جدول کامل ۳ قسط</span>
            </button>

            <button
              type="button"
              onClick={handleSendSms}
              disabled={isSendingSms}
              className="h-10 rounded-xl bg-[#DFB76C]/15 border border-[#DFB76C]/35 hover:bg-[#DFB76C]/25 text-[#9E782F] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSendingSms ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              <span>ارسال پیامک یادآوری</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-1.5 text-center text-[11px] text-[#6E3A44] hover:text-[#3B0B14] transition cursor-pointer"
          >
            یادآوری در ورود بعدی (بستن پنجره)
          </button>
        </div>
      </div>
    </div>
  );
}
