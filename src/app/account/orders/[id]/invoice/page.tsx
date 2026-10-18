"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Printer,
  Package,
  CalendarDays,
  CreditCard,
  MapPin,
  Phone,
  User,
  ReceiptText,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";

type Order = {
  id: string;
  user: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  shippingFullName: string;
  shippingProvince: string;
  shippingPhone: string;
  shippingPostalCode: string;
  shippingMethod: string;
  shippingCost: string;
  address: string;
  created: string;
  updated: string;
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

export default function OrderInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function fetchOrderInvoice() {
      try {
        setLoading(true);
        if (!pb.authStore.isValid) {
          router.replace("/login");
          return;
        }

        // اضافه کردن requestKey: null برای جلوگیری از خطای Auto-Cancellation
        const record = await pb.collection("orders").getOne<Order>(id, {
          requestKey: null,
        });

        if (!isCancelled) {
          setOrder(record);
        }
      } catch (err: any) {
        // اگر خطا مربوط به لغو شدن بود نیازی به نمایش توست نیست
        if (err?.isAbort) return;
        console.error("خطا در دریافت اطلاعات فاکتور:", err);
        toast.error("یافتن اطلاعات فاکتور با خطا مواجه شد.");
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    if (id) {
      fetchOrderInvoice();
    }

    return () => {
      isCancelled = true;
    };
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1C3324]/20 border-t-[#1C3324]" />
          <p className="text-sm font-bold text-[#1C3324]">در حال آماده‌سازی فاکتور...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F6] p-4" dir="rtl">
        <h2 className="text-lg font-bold text-[#1C3324] mb-2">فاکتور مورد نظر یافت نشد</h2>
        <button
          onClick={() => router.push("/account/orders")}
          className="px-5 py-2.5 rounded-xl bg-[#1C3324] text-white text-xs font-bold cursor-pointer"
        >
          بازگشت به سفارش‌ها
        </button>
      </div>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen pb-24 pt-36 lg:pt-42 px-4 sm:px-6 lg:px-8 font-sans bg-[#FAF9F6] text-[#1C3324]"
    >
      <div className="w-full max-w-3xl mx-auto space-y-6">
        
        {/* دکمه‌های کنترلی بالای صفحه */}
        <div className="flex items-center justify-between no-print">
          <button
            type="button"
            onClick={() => router.push("/account/orders")}
            className="inline-flex items-center gap-1.5 border-none bg-transparent text-xs font-bold text-[#8B263E] cursor-pointer p-0 transition hover:opacity-75"
          >
            <ArrowRight size={16} />
            بازگشت به سفارش‌ها
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1C3324] text-white hover:bg-[#8B263E] text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Printer size={16} />
            چاپ فاکتور
          </button>
        </div>

        {/* برگه اصلی فاکتور */}
        <div className="bg-white border border-[#1C3324]/15 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8 relative overflow-hidden">
          
          {/* هدر فاکتور */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-[#1C3324]/15 gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#1C3324] m-0">
                سروین استودیو
              </h1>
              <p className="text-xs text-[#3A5A46] mt-1 m-0">فاکتور رسمی خرید طلا و جواهرات</p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs text-[#3A5A46]">شماره سفارش:</div>
              <div className="text-sm font-black text-[#1C3324] font-mono mt-0.5">
                {order.orderNumber || order.id}
              </div>
            </div>
          </div>

          {/* اطلاعات زمانی و مالی کلی */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-[#FAF9F6] p-4 rounded-2xl border border-[#1C3324]/10 text-xs">
            <div>
              <span className="block text-[#3A5A46] mb-1">تاریخ ثبت سفارش:</span>
              <span className="font-bold text-[#1C3324]">{formatDate(order.created)}</span>
            </div>
            <div>
              <span className="block text-[#3A5A46] mb-1">وضعیت پرداخت:</span>
              <span className="font-bold text-emerald-700">
                {order.paymentStatus === "paid" ? "پرداخت شده" : "نامشخص"}
              </span>
            </div>
            <div>
              <span className="block text-[#3A5A46] mb-1">روش ارسال:</span>
              <span className="font-bold text-[#1C3324]">{order.shippingMethod || "پستی"}</span>
            </div>
          </div>

          {/* مشخصات گیرنده */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-[#1C3324] border-b border-[#1C3324]/10 pb-2">
              مشخصات تحویل‌گیرنده و نشانی
            </h3>
            <div className="grid sm:grid-cols-2 gap-3 text-xs text-[#3A5A46]">
              <div><strong className="text-[#1C3324]">نام:</strong> {order.shippingFullName || "—"}</div>
              <div><strong className="text-[#1C3324]">تلفن:</strong> <span dir="ltr">{order.shippingPhone || "—"}</span></div>
              <div><strong className="text-[#1C3324]">استان و شهر:</strong> {order.shippingProvince || "—"}</div>
              <div><strong className="text-[#1C3324]">کد پستی:</strong> <span dir="ltr">{order.shippingPostalCode || "—"}</span></div>
              <div className="sm:col-span-2">
                <strong className="text-[#1C3324]">آدرس کامل:</strong> {order.address || "—"}
              </div>
            </div>
          </div>

          {/* جمع کل فاکتور */}
          <div className="pt-6 border-t border-[#1C3324]/15 flex items-center justify-between">
            <span className="text-sm font-bold text-[#3A5A46]">مبلغ قابل پرداخت:</span>
            <span className="text-lg sm:text-xl font-black text-[#8B263E]">
              {formatPrice(order.totalAmount)}
            </span>
          </div>

          {/* فوتر فاکتور */}
          <div className="text-center pt-8 border-t border-[#1C3324]/10 text-[11px] text-[#3A5A46]">
            از خرید شما از سروین استودیو کمال تشکر را داریم. این فاکتور به صورت سیستمی صادر شده است. ✨
          </div>

        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </main>
  );
}