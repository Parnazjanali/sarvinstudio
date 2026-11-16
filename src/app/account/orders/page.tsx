"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Package,
  FileText,
  Eye,
  Truck,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import { resolveOrderInstallmentWeights, isInstallmentDue } from "@/lib/installment-utils";

type OrderItem = {
  id?: string;
  productTitle: string;
  weight?: number;
  colour?: string;
  goldPricePerGram?: number;
  totalPrice?: number;
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
  trackingCode?: string;
  address: string;
  items?: OrderItem[] | Record<string, any> | string;
  created: string;
  updated: string;
};

type FilterTab = "all" | "processing" | "delivered" | "installment";

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

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    let isCancelled = false;

    async function loadOrders() {
      try {
        setLoading(true);

        if (!pb.authStore.isValid || !pb.authStore.model?.id) {
          await new Promise((r) => setTimeout(r, 100));
        }

        if (!pb.authStore.isValid || !pb.authStore.model?.id) {
          router.replace("/login?redirect=/account/orders");
          return;
        }

        const userId = pb.authStore.model.id;
        const result = await pb.collection("orders").getList<Order>(1, 50, {
          filter: `user = "${userId}" || user.id = "${userId}"`,
          sort: "-created",
          requestKey: null,
        });

        if (!isCancelled) {
          setOrders(result.items);
        }
      } catch (err: any) {
        if (err?.isAbort) return;
        console.error("خطا در دریافت سفارش‌ها:", err);
        toast.error("دریافت فهرست سفارش‌ها با مشکل مواجه شد.");
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadOrders();
    return () => {
      isCancelled = true;
    };
  }, [router]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const items = normalizeOrderItems(order.items);
      const isInstallment = items.some((it) => it.isInstallment);

      if (activeTab === "processing") {
        return order.status === "processing" || order.status === "pending";
      }
      if (activeTab === "delivered") {
        return order.status === "delivered" || order.status === "completed";
      }
      if (activeTab === "installment") {
        return isInstallment;
      }
      return true;
    });
  }, [orders, activeTab]);

  return (
    <main
      dir="rtl"
      className="min-h-screen pb-24 pt-36 lg:pt-42 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDF8F9] text-[#3B0B14]"
    >
      <div className="w-full max-w-5xl mx-auto space-y-8">
        
        {/* هدر صفحه و خلاصه وضعیت */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <button
              type="button"
              onClick={() => router.push("/account")}
              className="inline-flex items-center gap-1.5 border-none bg-transparent text-xs font-bold text-[#8B142D] cursor-pointer p-0 mb-3 transition hover:opacity-75"
            >
              <ArrowRight size={16} />
              بازگشت به حساب کاربری
            </button>
            <h1 className="text-2xl sm:text-3xl font-black text-[#3B0B14] m-0">
              سفارش‌های من
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[#6E3A44] leading-relaxed">
              سوابق خرید و پیگیری وضعیت آثار در گالری طلا پرنا زر.
            </p>
          </div>

          {!loading && orders.length > 0 && (
            <div className="px-4 py-2 rounded-2xl bg-white border border-[#3B0B14]/15 shadow-xs text-xs font-bold text-[#3B0B14]">
              مجموع خریدهای ثبت‌شده:{" "}
              <span className="text-[#8B142D] font-black">{orders.length} سفارش</span>
            </div>
          )}
        </div>

        {/* فیلتر تب‌ها */}
        {!loading && orders.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: "all", label: "همه سفارش‌ها" },
              { id: "processing", label: "در حال پردازش و ساخت" },
              { id: "delivered", label: "تحویل‌شده" },
              { id: "installment", label: "سفارش‌های اقساطی" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as FilterTab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#3B0B14] text-white shadow-xs"
                    : "bg-white text-[#6E3A44] border border-[#3B0B14]/10 hover:border-[#3B0B14]/25"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* لودینگ */}
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[350px] bg-white border border-[#3B0B14]/15 rounded-3xl shadow-xs">
            <div className="w-10 h-10 rounded-full border-4 border-[#3B0B14]/20 border-t-[#3B0B14] animate-spin" />
            <p className="mt-4 text-sm font-bold text-[#6E3A44]">در حال بارگذاری تاریخچه سفارش‌ها...</p>
          </div>
        )}

        {/* لیست خالی */}
        {!loading && filteredOrders.length === 0 && (
          <div className="bg-white border border-[#3B0B14]/15 rounded-3xl p-12 text-center shadow-xs">
            <Package size={34} className="mx-auto mb-4 text-[#8B142D]" />
            <h2 className="text-lg font-black text-[#3B0B14] mb-2">
              {activeTab === "all" ? "هنوز سفارشی ثبت نکرده‌اید" : "سفارشی در این بخش وجود ندارد"}
            </h2>
            <p className="text-xs text-[#6E3A44] max-w-sm mx-auto leading-6">
              می‌توانید از جدیدترین کلکسیون آثار پرنا زر دیدن فرمایید.
            </p>
            <button
              type="button"
              onClick={() => router.push("/products")}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#3B0B14] text-white text-xs font-bold shadow-xs cursor-pointer hover:bg-[#8B142D] transition"
            >
              مشاهده محصولات استودیو
            </button>
          </div>
        )}

        {/* کارت‌های سفارش */}
        {!loading && filteredOrders.length > 0 && (
          <div className="flex flex-col gap-5">
            {filteredOrders.map((order) => {
              const items = normalizeOrderItems(order.items);
              const isInstallment = items.some((it) => it.isInstallment);
              const installmentItem = items.find((it) => it.isInstallment);
              
              const { totalWeight: instTotalWeight, shareWeight, currentInstallmentNum } = resolveOrderInstallmentWeights(installmentItem);
              const dueInfo = isInstallment ? isInstallmentDue(order.created, currentInstallmentNum) : null;
              
              const totalWeight = isInstallment 
                ? instTotalWeight 
                : items.reduce((sum, it) => sum + (Number(it.weight) || 0), 0);

              return (
                <article
                  key={order.id}
                  className="bg-white border border-[#3B0B14]/15 rounded-3xl overflow-hidden shadow-xs transition duration-200 hover:border-[#3B0B14]/30"
                >
                  {/* هدر کارت سفارش */}
                  <div className="p-5 sm:p-6 border-b border-[#3B0B14]/10 flex items-center justify-between gap-4 flex-wrap bg-[#FDF8F9]/60">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-white text-[#3B0B14] border border-[#3B0B14]/15 flex items-center justify-center shrink-0 shadow-2xs">
                        <Package size={20} className="text-[#8B142D]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-black text-[#3B0B14]">
                            #{order.orderNumber || order.id}
                          </span>
                          {isInstallment && (
                            currentInstallmentNum >= 3 ? (
                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                تسویه کامل ۳ قسط
                              </span>
                            ) : dueInfo?.isDue ? (
                              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1 animate-pulse">
                                ● موعد پرداخت قسط {currentInstallmentNum + 1} فرا رسیده
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                قسط {currentInstallmentNum} از ۳ تسویه شده (سررسید بعدی: {dueInfo?.dueDateShamsi})
                              </span>
                            )
                          )}
                        </div>
                        <div className="text-[11px] text-[#6E3A44] mt-0.5">
                          ثبت شده در {formatDate(order.created)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* دکمه انتقال مستقیم به صفحه مدیریت و جدول اقساط */}
                      {isInstallment && (
                        <button
                          type="button"
                          onClick={() => router.push(`/account/orders/${order.id}/installments`)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-black transition shadow-xs cursor-pointer ${
                            dueInfo?.isDue ? "bg-[#8B142D] hover:bg-[#721f32] ring-2 ring-[#8B142D]/20 animate-pulse" : "bg-[#8B142D] hover:bg-[#721f32]"
                          }`}
                        >
                          <CreditCard size={14} />
                          <span>{currentInstallmentNum >= 3 ? "مشاهده جدول اقساط" : "پرداخت و جدول اقساط"}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => router.push(`/account/orders/${order.id}/invoice`)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#3B0B14]/15 text-[#3B0B14] hover:bg-[#3B0B14]/5 text-xs font-bold transition cursor-pointer"
                      >
                        <FileText size={14} />
                        <span>فاکتور رسمی</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push(`/account/orders/${order.id}`)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B0B14] text-white hover:bg-[#8B142D] text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <Eye size={14} />
                        <span>جزئیات اقلام</span>
                      </button>
                    </div>
                  </div>

                  {/* بدنه و خلاصه اقلام بدون شکلک */}
                  <div className="p-5 sm:p-6 space-y-4">
                    {items.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1 pb-2">
                        {items.map((it, idx) => {
                          const w = resolveOrderInstallmentWeights(it);
                          return (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#FDF8F9] border border-[#3B0B14]/10 px-3 py-1.5 text-xs font-bold text-[#3B0B14]"
                            >
                              <span>{it.productTitle || "کار ساخت طلا"}</span>
                              {w.totalWeight > 0 ? (
                                <span className="text-[11px] font-normal text-[#6E3A44]">
                                  {it.isInstallment
                                    ? `(وزن کل: ${w.totalWeight.toFixed(2)} گرم - سهم قسط: ${w.shareWeight.toFixed(2)} گرم)`
                                    : `(${w.totalWeight.toFixed(2)} گرم)`}
                                </span>
                              ) : null}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                      <div className="p-3.5 rounded-2xl bg-[#FDF8F9] border border-[#3B0B14]/10">
                        <span className="text-[#6E3A44] block mb-1">مشخصات وزن:</span>
                        <strong className="text-[#3B0B14]">
                          {totalWeight > 0 ? (
                            isInstallment
                              ? `${totalWeight.toFixed(2)} گرم (سهم هر قسط: ${shareWeight.toFixed(2)} گرم)`
                              : `${totalWeight.toFixed(2)} گرم طلای ۱۸ عیار`
                          ) : "ثبت کارگاهی"}
                        </strong>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#FDF8F9] border border-[#3B0B14]/10">
                        <span className="text-[#6E3A44] block mb-1">وضعیت ارسال:</span>
                        <strong className="text-[#3B0B14] flex items-center gap-1">
                          <Truck size={14} className="text-[#8B142D]" />
                          <span>{order.shippingMethod || "پست پیشتاز بیمه‌شده"}</span>
                        </strong>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#FDF8F9] border border-[#3B0B14]/10">
                        <span className="text-[#6E3A44] block mb-1">مبلغ پرداختی:</span>
                        <strong className="text-sm font-black text-[#8B142D]">
                          {formatPrice(order.totalAmount)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}