"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Package,
  MapPin,
  Heart,
  LogOut,
  ShieldCheck,
  ChevronLeft,
  Clock,
  ShoppingBag,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { pb } from "@/lib/pocketbase";
import Cookies from "js-cookie";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  isAdmin?: boolean;
}

interface OrderRecord {
  id: string;
  orderNumber?: string;
  status?: string;
  total?: number;
  created?: string;
  productTitle?: string;
}

function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  return `${Math.round(value).toLocaleString("fa-IR")} تومان`;
}

function formatOrderDate(date?: string): string {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsed);
}

function getStatusLabel(status?: string): string {
  switch (status) {
    case "paid":
      return "پرداخت شده";
    case "pending":
      return "در انتظار پرداخت";
    case "processing":
      return "در حال پردازش";
    case "shipped":
      return "ارسال شده";
    case "delivered":
      return "تحویل شده";
    case "cancelled":
      return "لغو شده";
    default:
      return status || "ثبت شده";
  }
}

function getStatusClass(status?: string): string {
  switch (status) {
    case "paid":
    case "delivered":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
    case "cancelled":
      return "bg-red-50 text-red-700 border-red-200/60";
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200/60";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200/60";
  }
}

export default function AccountPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadAccount = async () => {
      try {
        if (!pb.authStore.isValid || !pb.authStore.model) {
          router.replace("/login?redirect=/account");
          return;
        }

        const model = pb.authStore.model as {
          id: string;
          name?: string;
          username?: string;
          email?: string;
          phone?: string;
          role?: string;
          isAdmin?: boolean;
          collectionName?: string;
        };

        const isSuperUser = model.collectionName === "_superusers";
        const isAdmin =
          model.role === "admin" ||
          model.role === "Admin" ||
          model.role === "superadmin" ||
          model.isAdmin === true ||
          isSuperUser;

        setUser({
          id: model.id,
          name: model.name || model.username || "کاربر گرامی",
          email: model.email || "",
          phone: model.phone || "",
          role: isAdmin ? "admin" : model.role || "user",
          isAdmin,
        });

        setLoading(false);

        try {
          setOrdersLoading(true);
          const userId = model.id;

          const records = await pb.collection("orders").getList(1, 5, {
            filter: `user = "${userId}"`,
            sort: "-created",
            requestKey: null,
          });

          const normalizedOrders: OrderRecord[] = records.items.map((record) => {
            const rawRecord = record as unknown as Record<string, unknown>;
            const totalValue =
              typeof rawRecord.total === "number"
                ? rawRecord.total
                : Number(rawRecord.total || 0);

            return {
              id: record.id,
              orderNumber:
                typeof rawRecord.orderNumber === "string"
                  ? rawRecord.orderNumber
                  : typeof rawRecord.order_number === "string"
                  ? rawRecord.order_number
                  : record.id,
              status:
                typeof rawRecord.status === "string"
                  ? rawRecord.status
                  : undefined,
              total: Number.isFinite(totalValue) ? totalValue : undefined,
              created:
                typeof rawRecord.created === "string"
                  ? rawRecord.created
                  : undefined,
              productTitle:
                typeof rawRecord.productTitle === "string"
                  ? rawRecord.productTitle
                  : undefined,
            };
          });

          setOrders(normalizedOrders);
        } catch (orderError) {
          console.error("خطا در دریافت سفارش‌های کاربر:", orderError);
          setOrders([]);
        } finally {
          setOrdersLoading(false);
        }
      } catch (error) {
        console.error("خطا در بارگذاری حساب کاربری:", error);
        setLoading(false);
        setOrdersLoading(false);
      }
    };

    loadAccount();
  }, [router]);

  const handleLogout = () => {
    pb.authStore.clear();
    Cookies.remove("pb_auth", { path: "/" });
    Cookies.remove("token", { path: "/" });
    Cookies.remove("user_role", { path: "/" });
    toast.success("از حساب کاربری خود خارج شدید.");
    router.replace("/login");
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[#FAF9F6]"
        dir="rtl"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#1C3324]/20 border-t-[#1C3324]" />
          <p className="text-sm font-bold text-[#1C3324]">
            در حال بارگذاری اطلاعات حساب...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div
      className="min-h-screen pb-24 pt-36 lg:pt-42 px-4 sm:px-6 lg:px-8 font-sans bg-[#FAF9F6] text-[#1C3324]"
      dir="rtl"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* بنر خوش‌آمدگویی ظریف */}
        <div className="p-6 sm:p-8 rounded-3xl border border-[#1C3324]/15 bg-white shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-[#8B263E]/5 pointer-events-none blur-xl" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner shrink-0 bg-[#1C3324] text-white">
              {user.name?.charAt(0) || "U"}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-[#1C3324]">
                  {user.name}
                </h1>

                {user.isAdmin ? (
                  <span className="bg-[#1C3324] text-white text-xs px-3 py-1 rounded-full font-bold shadow-xs">
                    مدیر سیستم
                  </span>
                ) : (
                  <span className="bg-[#FAF9F6] text-[#8B263E] text-xs px-3 py-1 rounded-full font-bold border border-[#8B263E]/20">
                    مشتری سروین استودیو
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm mt-1.5 text-[#3A5A46] font-medium" dir="ltr">
                {user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto relative z-10">
            {user.isAdmin && (
              <Link
                href="/dashboard"
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm text-white shadow-xs transition hover:bg-[#8B263E] bg-[#1C3324]"
              >
                <ShieldCheck size={18} />
                پنل مدیریت فروشگاه
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm text-red-600 bg-red-50 hover:bg-red-100 transition border border-red-100 cursor-pointer"
            >
              <LogOut size={16} />
              خروج
            </button>
          </div>
        </div>

        {/* کارت‌های میانبر سریع */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/account/orders"
            className="p-5 rounded-3xl border border-[#1C3324]/15 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xs hover:border-[#8B263E] flex flex-col gap-3 group"
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-[#1C3324] bg-[#FAF9F6] transition group-hover:bg-[#1C3324] group-hover:text-white border border-[#1C3324]/10">
              <Package size={20} />
            </div>
            <div>
              <p className="font-extrabold text-sm text-[#1C3324]">سفارش‌های من</p>
              <p className="text-xs text-[#3A5A46] mt-0.5">پیگیری و سوابق خریدها</p>
            </div>
          </Link>

          <Link
            href="/account/addresses"
            className="p-5 rounded-3xl border border-[#1C3324]/15 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xs hover:border-[#8B263E] flex flex-col gap-3 group"
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-[#1C3324] bg-[#FAF9F6] transition group-hover:bg-[#1C3324] group-hover:text-white border border-[#1C3324]/10">
              <MapPin size={20} />
            </div>
            <div>
              <p className="font-extrabold text-sm text-[#1C3324]">آدرس‌های من</p>
              <p className="text-xs text-[#3A5A46] mt-0.5">مدیریت نشانی ارسال</p>
            </div>
          </Link>

          <Link
            href="/account/favorites"
            className="p-5 rounded-3xl border border-[#1C3324]/15 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xs hover:border-[#8B263E] flex flex-col gap-3 group"
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-[#1C3324] bg-[#FAF9F6] transition group-hover:bg-[#1C3324] group-hover:text-white border border-[#1C3324]/10">
              <Heart size={20} />
            </div>
            <div>
              <p className="font-extrabold text-sm text-[#1C3324]">علاقه‌مندی‌ها</p>
              <p className="text-xs text-[#3A5A46] mt-0.5">طلا و جواهرات نشان‌شده</p>
            </div>
          </Link>

          <Link
            href="/account/edit"
            className="p-5 rounded-3xl border border-[#1C3324]/15 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xs hover:border-[#8B263E] flex flex-col gap-3 group"
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-[#1C3324] bg-[#FAF9F6] transition group-hover:bg-[#1C3324] group-hover:text-white border border-[#1C3324]/10">
              <User size={20} />
            </div>
            <div>
              <p className="font-extrabold text-sm text-[#1C3324]">اطلاعات فردی</p>
              <p className="text-xs text-[#3A5A46] mt-0.5">ویرایش اطلاعات حساب</p>
            </div>
          </Link>
        </div>

        {/* بخش آخرین خریدهای کاربر */}
        <div className="p-6 sm:p-8 rounded-3xl border border-[#1C3324]/15 bg-white shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#1C3324]/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FAF9F6] text-[#1C3324] flex items-center justify-center border border-[#1C3324]/10">
                <ShoppingBag size={18} />
              </div>
              <h2 className="font-extrabold text-base sm:text-lg text-[#1C3324]">
                آخرین خریدهای شما
              </h2>
            </div>

            <Link
              href="/account/orders"
              className="flex items-center gap-1 text-xs font-bold text-[#8B263E] transition hover:opacity-75"
            >
              <span>مشاهده همه</span>
              <ChevronLeft size={14} />
            </Link>
          </div>

          {ordersLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="h-7 w-7 animate-spin rounded-full border-3 border-[#1C3324]/20 border-t-[#1C3324]" />
              <p className="text-xs text-[#3A5A46]">در حال دریافت سفارش‌ها...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-[#FAF9F6] text-[#1C3324] border border-[#1C3324]/10">
                <ShoppingBag size={28} />
              </div>

              <h3 className="font-extrabold text-base mb-2 text-[#1C3324]">
                هنوز سفارشی ثبت نکرده‌اید
              </h3>

              <p className="text-sm text-[#3A5A46] max-w-sm leading-7">
                وقتی اولین خریدتان را از سروین استودیو ثبت کنید، سفارش شما در این قسمت به صورت تفکیک‌شده نمایش داده می‌شود.
              </p>

              <Link
                href="/products"
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-xs transition hover:bg-[#8B263E] bg-[#1C3324]"
              >
                <Sparkles size={16} />
                مشاهده محصولات استودیو
              </Link>
            </div>
          ) : (
            <div className="grid gap-3.5">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 sm:p-5 rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] transition hover:border-[#8B263E] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-extrabold text-sm text-[#1C3324]">
                        {order.productTitle || "سفارش طلا و جواهرات سروین استودیو"}
                      </span>

                      {order.status && (
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-lg font-semibold border ${getStatusClass(
                            order.status
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#3A5A46] flex-wrap">
                      <span>کد سفارش: {order.orderNumber || order.id}</span>
                      {order.created && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatOrderDate(order.created)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1C3324]/10">
                    {order.total !== undefined && (
                      <span className="font-black text-sm sm:text-base text-[#8B263E]">
                        {formatPrice(order.total)}
                      </span>
                    )}

                    <Link
                      href={`/account/orders/${order.id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#1C3324] hover:bg-[#8B263E] hover:text-white text-xs font-bold transition shadow-2xs border border-[#1C3324]/10"
                      aria-label="مشاهده جزئیات سفارش"
                    >
                      <span>جزئیات</span>
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}