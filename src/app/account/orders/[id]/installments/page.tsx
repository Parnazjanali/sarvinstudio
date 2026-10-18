"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Lock,
  Package,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";

type OrderItem = {
  id?: string;
  productTitle: string;
  weight?: number;
  goldPricePerGram?: number;
  totalPrice?: number;
  isInstallment?: boolean;
  installmentNumber?: number;
  installmentTotalCount?: number;
};

type Order = {
  id: string;
  orderNumber: string;
  totalAmount: number;
  paymentStatus: string;
  shippingPhone: string;
  items?: OrderItem[] | Record<string, any> | string;
  created: string;
};

function formatPrice(value: number | string | undefined) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "۰ تومان";
  return `${new Intl.NumberFormat("fa-IR").format(number)} تومان`;
}

function formatDate(date: string) {
  if (!date) return "-";
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return date;

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsedDate);
}

function normalizeOrderItems(rawItems: any): OrderItem[] {
  if (!rawItems) return [];
  if (Array.isArray(rawItems)) return rawItems;
  if (typeof rawItems === "string") {
    try {
      const parsed = JSON.parse(rawItems);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }
  if (typeof rawItems === "object") return [rawItems];
  return [];
}

export default function OrderInstallmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [payingNumber, setPayingNumber] = useState<number | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      try {
        setLoading(true);
        if (!pb.authStore.isValid) {
          router.replace(`/login?redirect=/account/orders/${id}/installments`);
          return;
        }

        const record = await pb.collection("orders").getOne<Order>(id, {
          requestKey: null,
        });

        setOrder(record);
      } catch (err) {
        console.error("خطا در بارگذاری اقساط:", err);
        toast.error("دریافت اطلاعات اقساط با خطا مواجه شد.");
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchOrder();
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1C3324]/20 border-t-[#1C3324]" />
          <p className="text-sm font-bold text-[#1C3324]">در حال بارگذاری جدول اقساط...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F6] p-4" dir="rtl">
        <h2 className="text-lg font-bold text-[#1C3324] mb-2">سفارش یافت نشد</h2>
        <button
          onClick={() => router.push("/account/orders")}
          className="px-5 py-2.5 rounded-xl bg-[#1C3324] text-white text-xs font-bold cursor-pointer"
        >
          بازگشت به سفارش‌ها
        </button>
      </div>
    );
  }

  const items = normalizeOrderItems(order.items);
  const primaryItem = items.find((it) => it.isInstallment) || items[0];
  const totalWeight = Number(primaryItem?.weight) || 0;
  const shareWeight = totalWeight > 0 ? totalWeight / 3 : 1;
  const currentPaidCount = Number(primaryItem?.installmentNumber) || 1;

  // نرخ طلا از ثبت اولیه یا مظنه روز
  const goldPrice = Number(primaryItem?.goldPricePerGram) || 26000000;
  const nextPayAmount = Math.round(order.totalAmount > 0 ? order.totalAmount : shareWeight * goldPrice);

  const installmentsList = [
    {
      number: 1,
      title: "قسط اول (هنگام ثبت سفارش)",
      weight: shareWeight,
      status: "paid",
      amount: order.totalAmount,
      date: formatDate(order.created),
    },
    {
      number: 2,
      title: "قسط دوم (ماه اول)",
      weight: shareWeight,
      status: currentPaidCount >= 2 ? "paid" : "pending",
      amount: nextPayAmount,
      date: "سررسید ماهانه",
    },
    {
      number: 3,
      title: "قسط سوم (ماه دوم - تسویه نهایی)",
      weight: shareWeight,
      status: currentPaidCount >= 3 ? "paid" : "pending",
      amount: nextPayAmount,
      date: "سررسید ماهانه",
    },
  ];

  const handlePayInstallment = async (installmentNumber: number) => {
    try {
      setPayingNumber(installmentNumber);

      const res = await fetch("/api/payment/pay-installment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          installmentNumber,
          amount: nextPayAmount,
          phone: order.shippingPhone,
        }),
      });

      const data = await res.json();
      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error(data.message || "خطا در اتصال به درگاه بانک");
      }
    } catch (err: any) {
      toast.error(err.message || "مشکلی در پردازش پیش آمد.");
      setPayingNumber(null);
    }
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen pb-24 pt-36 lg:pt-42 px-4 sm:px-6 lg:px-8 font-sans bg-[#FAF9F6] text-[#1C3324]"
    >
      <div className="w-full max-w-4xl mx-auto space-y-6">
        
        {/* هدر صفحه */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <button
              type="button"
              onClick={() => router.push("/account/orders")}
              className="inline-flex items-center gap-1.5 border-none bg-transparent text-xs font-bold text-[#8B263E] cursor-pointer p-0 mb-3 transition hover:opacity-75"
            >
              <ArrowRight size={16} />
              بازگشت به سفارش‌های من
            </button>
            <h1 className="text-2xl font-black text-[#1C3324] m-0">
              جدول اقساط سفارش #{order.orderNumber || order.id}
            </h1>
            <p className="mt-1 text-xs text-[#3A5A46]">
              محصول: {primaryItem?.productTitle || "کار ساخت طلا"} (وزن کل: {totalWeight} گرم)
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push(`/account/orders/${order.id}`)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#1C3324]/15 text-[#1C3324] text-xs font-bold hover:bg-[#1C3324]/5 transition"
          >
            مشاهده جزئیات سفارش
          </button>
        </div>

        {/* کارت راهنمای نحوه تسویه */}
        <div className="p-4 rounded-2xl bg-white border border-[#1C3324]/15 text-xs text-[#3A5A46] leading-6 space-y-1">
          <p className="font-bold text-[#1C3324]">قوانین تسویه طرح اقساط طلایی سروین:</p>
          <p>• هر قسط معادل یک‌سوم وزن کل اثر ({shareWeight.toFixed(3)} گرم) است.</p>
          <p>• مبالغ اقساط بعدی در لحظه پرداخت، با نرخ همان روز طلا در بازار محاسبه و تسویه می‌شوند.</p>
        </div>

        {/* جدول اقساط ۳ مرحله‌ای */}
        <div className="bg-white border border-[#1C3324]/15 rounded-3xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-extrabold text-[#1C3324] flex items-center gap-2 border-b border-[#1C3324]/10 pb-3">
            <CreditCard size={18} className="text-[#8B263E]" />
            <span>وضعیت پرداخت اقساط سه‌گانه</span>
          </h2>

          <div className="overflow-x-auto border border-[#1C3324]/15 rounded-2xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF9F6] border-b border-[#1C3324]/15 text-[#1C3324]">
                <tr>
                  <th className="p-3.5 font-bold">شماره قسط</th>
                  <th className="p-3.5 font-bold">وزن سهمی</th>
                  <th className="p-3.5 font-bold">مبلغ قسط</th>
                  <th className="p-3.5 font-bold">وضعیت تسویه</th>
                  <th className="p-3.5 font-bold text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C3324]/10 text-[#3A5A46]">
                {installmentsList.map((inst) => {
                  const isPaid = inst.status === "paid";
                  const isReadyToPay = !isPaid && inst.number === currentPaidCount + 1;
                  const isLocked = !isPaid && inst.number > currentPaidCount + 1;

                  return (
                    <tr key={inst.number} className="hover:bg-[#FAF9F6]/50 transition">
                      <td className="p-3.5 font-bold text-[#1C3324]">
                        <div>{inst.title}</div>
                        <span className="text-[11px] font-normal text-[#3A5A46]">{inst.date}</span>
                      </td>

                      <td className="p-3.5 font-mono">
                        {inst.weight.toFixed(3)} گرم
                      </td>

                      <td className="p-3.5 font-mono font-bold text-[#8B263E]">
                        {formatPrice(inst.amount)}
                      </td>

                      <td className="p-3.5">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold text-[11px]">
                            <CheckCircle2 size={13} />
                            تسویه شده
                          </span>
                        ) : isReadyToPay ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60 font-bold text-[11px]">
                            <Clock size={13} />
                            آماده تسویه
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-500 border border-gray-200 font-bold text-[11px]">
                            <Lock size={12} />
                            قفل‌شده (پس از قسط قبلی)
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        {isPaid ? (
                          <span className="text-[11px] text-emerald-600 font-bold">پرداخت موفق</span>
                        ) : isReadyToPay ? (
                          <button
                            type="button"
                            onClick={() => handlePayInstallment(inst.number)}
                            disabled={payingNumber !== null}
                            className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-xl bg-[#8B263E] text-white hover:bg-[#721f32] text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            {payingNumber === inst.number ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>در حال اتصال...</span>
                              </>
                            ) : (
                              <span>پرداخت آنلاین قسط {inst.number}</span>
                            )}
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}