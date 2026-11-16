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
  Bell,
  Send,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import {
  resolveOrderInstallmentWeights,
  getInstallmentDueDate,
  formatShamsiDate,
  isInstallmentDue,
  formatGoldWeight,
  roundGoldWeight,
} from "@/lib/installment-utils";

type OrderItem = {
  id?: string;
  productTitle: string;
  weight?: number;
  totalWeight?: number;
  installmentWeight?: number;
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
  shippingFullName?: string;
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
  const [sendingSms, setSendingSms] = useState(false);
  const [liveGoldPrice, setLiveGoldPrice] = useState<number>(26500000);

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

        // دریافت نرخ زنده طلا جهت محاسبه دقیق قسط به قیمت روز
        try {
          const goldRes = await fetch("/api/sync-gold");
          const goldData = await goldRes.json();
          if (goldData?.success && goldData?.results) {
            const gold18k = goldData.results.find((r: any) => r.symbol === "IR_GOLD_18K");
            if (gold18k && Number(gold18k.price) > 0) {
              setLiveGoldPrice(Number(gold18k.price));
            }
          }
        } catch {
          // استفاده از نرخ پیش‌فرض در صورت عدم پاسخگویی
        }
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
      <div className="min-h-screen flex items-center justify-center bg-[#FDF8F9]" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#3B0B14]/20 border-t-[#3B0B14]" />
          <p className="text-sm font-bold text-[#3B0B14]">در حال بارگذاری جدول اقساط...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDF8F9] p-4" dir="rtl">
        <h2 className="text-lg font-bold text-[#3B0B14] mb-2">سفارش یافت نشد</h2>
        <button
          onClick={() => router.push("/account/orders")}
          className="px-5 py-2.5 rounded-xl bg-[#3B0B14] text-white text-xs font-bold cursor-pointer"
        >
          بازگشت به سفارش‌ها
        </button>
      </div>
    );
  }

  const items = normalizeOrderItems(order.items);
  const primaryItem = items.find((it) => it.isInstallment) || items[0];

  // محاسبه صحیح و دقیق وزن با ۲ رقم اعشار و جلوگیری از تقسیم مجدد
  const { totalWeight, shareWeight, currentInstallmentNum } = resolveOrderInstallmentWeights(primaryItem);
  const currentPaidCount = Number(primaryItem?.installmentNumber) || currentInstallmentNum || 1;

  // محاسبه مبلغ قسط بعدی بر پایه مظنه زنده روز طلا
  const nextPayAmount = Math.round(shareWeight * liveGoldPrice);

  // محاسبه وضعیت سررسید سر هر برج
  const dueStatus = isInstallmentDue(order.created, currentPaidCount);

  // سررسیدهای ۳ گانه
  const dueDate1 = formatShamsiDate(order.created);
  const dueDate2 = formatShamsiDate(getInstallmentDueDate(order.created, 2));
  const dueDate3 = formatShamsiDate(getInstallmentDueDate(order.created, 3));

  const installmentsList = [
    {
      number: 1,
      title: "قسط اول (هنگام ثبت سفارش)",
      weight: shareWeight,
      status: "paid",
      amount: order.totalAmount,
      date: dueDate1,
      isDueNow: false,
    },
    {
      number: 2,
      title: "قسط دوم (ماه اول)",
      weight: shareWeight,
      status: currentPaidCount >= 2 ? "paid" : "pending",
      amount: currentPaidCount >= 2 ? order.totalAmount : nextPayAmount,
      date: dueDate2,
      isDueNow: currentPaidCount < 2 && dueStatus.isDue,
    },
    {
      number: 3,
      title: "قسط سوم (ماه دوم - تسویه نهایی)",
      weight: shareWeight,
      status: currentPaidCount >= 3 ? "paid" : "pending",
      amount: currentPaidCount >= 3 ? order.totalAmount : nextPayAmount,
      date: dueDate3,
      isDueNow: currentPaidCount === 2 && dueStatus.isDue,
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

  const handleSendReminderSms = async () => {
    try {
      setSendingSms(true);
      const res = await fetch("/api/sms/send-installment-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          installmentNumber: currentPaidCount + 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "پیامک یادآوری موعد قسط به شماره شما ارسال شد.");
      } else {
        throw new Error(data.message || "ارسال پیامک با خطا مواجه شد.");
      }
    } catch (err: any) {
      toast.error(err.message || "ارسال پیامک انجام نشد.");
    } finally {
      setSendingSms(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen pb-24 pt-36 lg:pt-42 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDF8F9] text-[#3B0B14]"
    >
      <div className="w-full max-w-4xl mx-auto space-y-6">
        
        {/* هدر صفحه */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <button
              type="button"
              onClick={() => router.push("/account/orders")}
              className="inline-flex items-center gap-1.5 border-none bg-transparent text-xs font-bold text-[#8B142D] cursor-pointer p-0 mb-3 transition hover:opacity-75"
            >
              <ArrowRight size={16} />
              بازگشت به سفارش‌های من
            </button>
            <h1 className="text-2xl font-black text-[#3B0B14] m-0">
              جدول اقساط سفارش #{order.orderNumber || order.id}
            </h1>
            <p className="mt-1 text-xs text-[#6E3A44]">
              محصول: {primaryItem?.productTitle || "کار ساخت طلا"} (وزن کل: {totalWeight.toFixed(2)} گرم | سهم هر قسط: {shareWeight.toFixed(2)} گرم)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {currentPaidCount < 3 && (
              <button
                type="button"
                onClick={handleSendReminderSms}
                disabled={sendingSms}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#DFB76C]/20 border border-[#DFB76C]/40 text-[#9E782F] text-xs font-bold hover:bg-[#DFB76C]/30 transition cursor-pointer disabled:opacity-50"
                title="ارسال پیامک یادآوری به شماره ثبت شده شما"
              >
                {sendingSms ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>ارسال پیامک یادآوری قسط</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => router.push(`/account/orders/${order.id}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#3B0B14]/15 text-[#3B0B14] text-xs font-bold hover:bg-[#3B0B14]/5 transition"
            >
              مشاهده جزئیات سفارش
            </button>
          </div>
        </div>

        {/* بنر موعد سررسید اگر زمان پرداخت فرا رسیده باشد */}
        {currentPaidCount < 3 && dueStatus.isDue && (
          <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-600"></span>
              </span>
              <div>
                <h4 className="text-sm font-black text-amber-950">
                  زمان پرداخت قسط {currentPaidCount + 1} فرا رسیده است!
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  موعد سررسید: {dueStatus.dueDateShamsi} — مبلغ محاسبه‌شده به مظنه زنده روز: {formatPrice(nextPayAmount)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handlePayInstallment(currentPaidCount + 1)}
              disabled={payingNumber !== null}
              className="px-5 py-2.5 rounded-xl bg-[#8B142D] text-white text-xs font-black shadow-md hover:bg-[#721f32] transition cursor-pointer whitespace-nowrap shrink-0"
            >
              {payingNumber === currentPaidCount + 1 ? "در حال اتصال..." : `پرداخت آنلاین قسط ${currentPaidCount + 1}`}
            </button>
          </div>
        )}

        {/* کارت راهنمای نحوه تسویه */}
        <div className="p-4 rounded-2xl bg-white border border-[#3B0B14]/15 text-xs text-[#6E3A44] leading-6 space-y-1">
          <p className="font-bold text-[#3B0B14]">قوانین تسویه طرح اقساط طلایی پرنا زر:</p>
          <p>• هر قسط معادل یک‌سوم وزن کل اثر ({shareWeight.toFixed(2)} گرم طلا) است.</p>
          <p>• مبالغ اقساط بعدی در لحظه پرداخت، با نرخ لحظه‌ای همان روز طلا در بازار ({liveGoldPrice.toLocaleString("fa-IR")} تومان) محاسبه و تسویه می‌شوند.</p>
          <p>• سررسید اقساط به صورت ماهانه (سر هر برج) بوده و پیامک و هشدار پیش از موعد برای شما ارسال می‌گردد.</p>
        </div>

        {/* جدول اقساط ۳ مرحله‌ای */}
        <div className="bg-white border border-[#3B0B14]/15 rounded-3xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-extrabold text-[#3B0B14] flex items-center gap-2 border-b border-[#3B0B14]/10 pb-3">
            <CreditCard size={18} className="text-[#8B142D]" />
            <span>وضعیت پرداخت اقساط سه‌گانه</span>
          </h2>

          <div className="overflow-x-auto border border-[#3B0B14]/15 rounded-2xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FDF8F9] border-b border-[#3B0B14]/15 text-[#3B0B14]">
                <tr>
                  <th className="p-3.5 font-bold">شماره قسط</th>
                  <th className="p-3.5 font-bold">وزن سهمی</th>
                  <th className="p-3.5 font-bold">مبلغ قسط</th>
                  <th className="p-3.5 font-bold">وضعیت تسویه</th>
                  <th className="p-3.5 font-bold text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3B0B14]/10 text-[#6E3A44]">
                {installmentsList.map((inst) => {
                  const isPaid = inst.status === "paid";
                  const isReadyToPay = !isPaid && inst.number === currentPaidCount + 1;
                  const isLocked = !isPaid && inst.number > currentPaidCount + 1;

                  return (
                    <tr key={inst.number} className="hover:bg-[#FDF8F9]/50 transition">
                      <td className="p-3.5 font-bold text-[#3B0B14]">
                        <div>{inst.title}</div>
                        <span className="text-[11px] font-normal text-[#6E3A44] flex items-center gap-1 mt-0.5">
                          <Calendar size={12} className="opacity-70" />
                          سررسید: {inst.date}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-[#3B0B14]">
                        {inst.weight.toFixed(2)} گرم
                      </td>

                      <td className="p-3.5 font-mono font-bold text-[#8B142D]">
                        {formatPrice(inst.amount)}
                      </td>

                      <td className="p-3.5">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold text-[11px]">
                            <CheckCircle2 size={13} />
                            تسویه شده
                          </span>
                        ) : isReadyToPay ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60 font-bold text-[11px]">
                              <Clock size={13} />
                              آماده تسویه
                            </span>
                            {inst.isDueNow && (
                              <span className="text-[10px] text-rose-600 font-extrabold flex items-center gap-1 animate-pulse">
                                ● موعد پرداخت فرا رسیده
                              </span>
                            )}
                          </div>
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
                            className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-xl bg-[#8B142D] text-white hover:bg-[#721f32] text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
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