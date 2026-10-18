"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Package,
  MapPin,
  FileText,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";

type OrderItem = {
  id?: string;
  productTitle: string;
  weight?: number;
  goldPricePerGram?: number;
  totalPrice?: number;
  price?: number;
  unitPrice?: number;
  finalPrice?: number;
  quantity?: number;
  isInstallment?: boolean;
  installmentNumber?: number;
  installmentTotalCount?: number;
};

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
  items?: OrderItem[] | Record<string, any> | string;
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

/**
 * تبدیل امن فیلد اقلام از هر ساختاری (آرایه، جیسون رشته‌ای یا آبجکت) به آرایه استاندارد
 */
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
  if (typeof rawItems === "object") {
    return [rawItems];
  }
  return [];
}

/**
 * استخراج دقیق مبلغ پرداختی هر قلم جهت جلوگیری از مغایرت قیمت خام با کل فاکتور
 */
function getItemPaidAmount(item: OrderItem, order: Order, itemsList: OrderItem[]): number {
  const orderTotal = Number(order.totalAmount) || 0;

  if (itemsList.length <= 1 && orderTotal > 0) {
    return orderTotal;
  }

  if (typeof item.finalPrice === "number" && item.finalPrice > 0) {
    return item.finalPrice * (Number(item.quantity) || 1);
  }

  const rawSum = itemsList.reduce((sum, it) => sum + (Number(it.totalPrice ?? it.price) || 0), 0);
  const currentItemPrice = Number(item.totalPrice ?? item.price) || 0;

  if (rawSum > 0 && orderTotal > 0 && Math.abs(rawSum - orderTotal) > 1000) {
    return Math.round((currentItemPrice / rawSum) * orderTotal);
  }

  return currentItemPrice || orderTotal;
}

export default function OrderDetailPage({
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

    async function fetchOrderDetails() {
      try {
        // کمی تأمل برای هیدراته شدن کامل توکن در کلاینت
        if (!pb.authStore.isValid) {
          await new Promise((r) => setTimeout(r, 100));
        }

        if (!pb.authStore.isValid) {
          router.replace(`/login?redirect=/account/orders/${id}`);
          return;
        }

        const record = await pb.collection("orders").getOne<Order>(id, {
          requestKey: null,
        });

        if (!isCancelled) {
          setOrder(record);
        }
      } catch (err: any) {
        if (err?.isAbort) return;
        console.error("خطا در دریافت جزئیات سفارش:", err);
        toast.error("دریافت اطلاعات سفارش با خطا مواجه شد.");
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    if (id) {
      fetchOrderDetails();
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
          <p className="text-sm font-bold text-[#1C3324]">در حال بارگذاری جزئیات سفارش...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F6] p-4" dir="rtl">
        <h2 className="text-lg font-bold text-[#1C3324] mb-2">سفارش مورد نظر یافت نشد</h2>
        <button
          onClick={() => router.push("/account/orders")}
          className="px-5 py-2.5 rounded-xl bg-[#1C3324] text-white text-xs font-bold cursor-pointer"
        >
          بازگشت به سفارش‌ها
        </button>
      </div>
    );
  }

  const itemsList = normalizeOrderItems(order.items);

  return (
    <main
      dir="rtl"
      className="min-h-screen pb-24 pt-36 lg:pt-42 px-4 sm:px-6 lg:px-8 font-sans bg-[#FAF9F6] text-[#1C3324]"
    >
      <div className="w-full max-w-4xl mx-auto space-y-6">
        
        {/* هدر و دکمه بازگشت */}
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
              جزئیات سفارش #{order.orderNumber || order.id}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => router.push(`/account/orders/${order.id}/invoice`)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1C3324] text-white hover:bg-[#8B263E] text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <FileText size={16} />
            <span>مشاهده و چاپ فاکتور رسمی</span>
          </button>
        </div>

        {/* کارت‌های خلاصه وضعیت */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-[#1C3324]/15 shadow-xs">
            <span className="text-xs text-[#3A5A46] block mb-1">تاریخ ثبت سفارش:</span>
            <strong className="text-xs sm:text-sm text-[#1C3324] font-bold">{formatDate(order.created)}</strong>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#1C3324]/15 shadow-xs">
            <span className="text-xs text-[#3A5A46] block mb-1">مبلغ کل پرداخت‌شده:</span>
            <strong className="text-xs sm:text-sm text-[#8B263E] font-black">{formatPrice(order.totalAmount)}</strong>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#1C3324]/15 shadow-xs">
            <span className="text-xs text-[#3A5A46] block mb-1">وضعیت پرداخت:</span>
            <strong className="text-xs sm:text-sm text-emerald-700 font-bold">
              {order.paymentStatus === "paid" ? "پرداخت شده موفق" : "نامشخص"}
            </strong>
          </div>
        </div>

        {/* جدول اقلام سفارش */}
        <div className="bg-white border border-[#1C3324]/15 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-base font-extrabold text-[#1C3324] flex items-center gap-2 border-b border-[#1C3324]/10 pb-3">
            <Package size={20} className="text-[#8B263E]" />
            <span>اقلام خریداری‌شده و جزئیات پرداخت</span>
          </h2>

          {itemsList.length > 0 ? (
            <div className="overflow-x-auto border border-[#1C3324]/15 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF9F6] border-b border-[#1C3324]/15 text-[#1C3324]">
                  <tr>
                    <th className="p-3.5 font-bold">نام کار ساخت (محصول)</th>
                    <th className="p-3.5 font-bold">نوع خرید (نقدی / قسطی)</th>
                    <th className="p-3.5 font-bold">نرخ هر گرم طلا</th>
                    <th className="p-3.5 font-bold">مبلغ پرداختی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C3324]/10 text-[#3A5A46]">
                  {itemsList.map((item, idx) => {
                    const isInstallment = item.isInstallment === true;
                    const itemAmount = getItemPaidAmount(item, order, itemsList);

                    return (
                      <tr key={idx} className="hover:bg-[#FAF9F6]/50 transition">
                        <td className="p-3.5 font-bold text-[#1C3324]">
                          <div>{item.productTitle || "طلا و جواهرات سروین"}</div>
                          {item.weight ? (
                            <span className="text-[11px] text-[#3A5A46] font-normal">وزن: {item.weight} گرم</span>
                          ) : null}
                        </td>

                        <td className="p-3.5">
                          {isInstallment ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60 font-bold text-[11px]">
                              <Clock size={13} />
                              قسطی {item.installmentNumber ? `(قسط ${item.installmentNumber} از ${item.installmentTotalCount || '؟'})` : ""}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold text-[11px]">
                              <CheckCircle2 size={13} />
                              نقدی (کامل)
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 font-mono font-medium">
                          {item.goldPricePerGram ? formatPrice(item.goldPricePerGram) : "ثبت سیستمی"}
                        </td>

                        <td className="p-3.5 font-black text-[#8B263E] font-mono">
                          {formatPrice(itemAmount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-[#3A5A46] italic py-4">هیچ اقلامی برای این سفارش ثبت نشده است.</p>
          )}
        </div>

        {/* مشخصات نشانی و ارسال */}
        <div className="bg-white border border-[#1C3324]/15 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-base font-extrabold text-[#1C3324] flex items-center gap-2 border-b border-[#1C3324]/10 pb-3">
            <MapPin size={20} className="text-[#8B263E]" />
            <span>اطلاعات ارسال و نشانی تحویل</span>
          </h2>

          <div className="grid sm:grid-cols-2 gap-4 text-xs text-[#3A5A46]">
            <div><strong className="text-[#1C3324]">تحویل‌گیرنده:</strong> {order.shippingFullName || "—"}</div>
            <div><strong className="text-[#1C3324]">شماره تماس:</strong> <span dir="ltr">{order.shippingPhone || "—"}</span></div>
            <div><strong className="text-[#1C3324]">استان و شهر:</strong> {order.shippingProvince || "—"}</div>
            <div><strong className="text-[#1C3324]">کد پستی:</strong> <span dir="ltr">{order.shippingPostalCode || "—"}</span></div>
            <div className="sm:col-span-2">
              <strong className="text-[#1C3324]">آدرس پستی کامل:</strong> {order.address || "—"}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}