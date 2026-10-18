"use client";

import { useState } from "react";
import { X, Sparkles, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatProductPrice } from "@/lib/product-detail";

type InstallmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  installmentNumber: number;
  shareWeight: number;
  currentGoldPrice: number;
  calculatedAmount: number;
  userPhone?: string;
};

export default function InstallmentPaymentModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  installmentNumber,
  shareWeight,
  currentGoldPrice,
  calculatedAmount,
  userPhone,
}: InstallmentModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handlePayInstallment = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/payment/pay-installment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          installmentNumber,
          amount: calculatedAmount,
          phone: userPhone,
        }),
      });

      const data = await res.json();

      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error(data.message || "خطا در اتصال به درگاه پرداخت");
      }
    } catch (err: any) {
      toast.error(err.message || "مشکلی در پردازش پیش آمد.");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 text-[#1C3324]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* هدر مدال */}
        <div className="flex items-center justify-between border-b border-[#1C3324]/10 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-[#8B263E]" />
            <h3 className="text-base font-black">
              تسویه قسط {installmentNumber} از ۳ (سفارش #{orderNumber})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* فاکتور شفاف نرخ روز طلا */}
        <div className="space-y-3 text-xs leading-6 bg-[#FAF9F6] p-4 rounded-2xl border border-[#1C3324]/10">
          <div className="flex justify-between border-b border-[#1C3324]/5 pb-2">
            <span className="text-[#3A5A46]">وزن سهمی این قسط:</span>
            <strong className="font-bold">{shareWeight.toFixed(3)} گرم</strong>
          </div>
          <div className="flex justify-between border-b border-[#1C3324]/5 pb-2">
            <span className="text-[#3A5A46]">مظنه روز طلای ۱۸ عیار:</span>
            <strong className="font-bold">{formatProductPrice(currentGoldPrice)}</strong>
          </div>
          <div className="flex justify-between pt-1">
            <span className="font-bold text-[#1C3324]">مبلغ نهایی قابل پرداخت:</span>
            <strong className="text-sm font-black text-[#8B263E]">
              {formatProductPrice(calculatedAmount)}
            </strong>
          </div>
        </div>

        <p className="text-[11px] text-[#3A5A46] leading-5">
          🔒 مبلغ اقساط بر پایه وزن قطعی طلا و نرخ زنده بازار محاسبه می‌شود. پس از واریز، فاکتور به‌صورت خودکار به‌روزرسانی خواهد شد.
        </p>

        {/* دکمه انتقال به درگاه */}
        <button
          onClick={handlePayInstallment}
          disabled={loading}
          className="w-full h-12 rounded-2xl bg-[#1C3324] text-white text-xs font-black shadow-md hover:bg-[#8B263E] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              در حال انتقال به درگاه بانکی...
            </>
          ) : (
            <>
              <ShieldCheck size={17} />
              تأیید و پرداخت اینترنتی
            </>
          )}
        </button>
      </div>
    </div>
  );
}