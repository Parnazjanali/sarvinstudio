"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  TriangleAlert,
  X,
  RefreshCw,
  CreditCard,
  Coins,
  ShieldCheck,
  User,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Cookies from "js-cookie";
import Link from "next/link";
import { useRouter } from "next/navigation";

import ThemeToggle from "@/components/theme/ThemeToggle";
import { pb } from "@/lib/pocketbase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface DashboardTopbarProps {
  onOpenSidebar?: () => void;
}

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

interface NotificationOrder {
  id: string;
  type: "order";
  orderNumber: string;
  customerName: string;
  amount: number;
  created: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

interface GoldRateRecord {
  id: string;
  symbol?: string;
  name?: string;
  price?: number | string;
  change_percent?: number;
  updated?: string;
  created?: string;
}

interface GoldNotification {
  id: string;
  type: "gold";
  created: string;
  goldName: string;
  oldPrice: number;
  newPrice: number;
}

type DashboardNotification = NotificationOrder | GoldNotification;

interface OrderRecord {
  id: string;
  orderNumber?: string;
  user?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  totalAmount?: number | string;
  shippingFullName?: string;
  shippingPhone?: string;
  created?: string;
  updated?: string;
  expand?: {
    user?: UserRecord;
  };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

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

function getCustomerName(order: OrderRecord): string {
  return (
    order.shippingFullName ||
    order.expand?.user?.name ||
    "خریدار مهمان"
  );
}

function getRelativeTime(dateString?: string): string {
  if (!dateString) return "زمان نامشخص";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "زمان نامشخص";

  const diff = Math.max(0, Date.now() - date.getTime());
  const seconds = Math.floor(diff / 1000);

  if (seconds < 30) return "همین الان";
  if (seconds < 60) return `${seconds.toLocaleString("fa-IR")} ثانیه پیش`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes.toLocaleString("fa-IR")} دقیقه پیش`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours.toLocaleString("fa-IR")} ساعت پیش`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days.toLocaleString("fa-IR")} روز پیش`;

  return new Intl.DateTimeFormat("fa-IR", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatMoney(value: number): string {
  return `${value.toLocaleString("fa-IR")} تومان`;
}

function getOrderStatusText(status?: OrderStatus): string {
  switch (status) {
    case "pending":
      return "در انتظار بررسی";
    case "paid":
      return "پرداخت شده";
    case "processing":
      return "در حال آماده‌سازی";
    case "delivered":
      return "تحویل شده";
    case "cancelled":
      return "لغو شده";
    default:
      return "نامشخص";
  }
}

function getOrderStatusIcon(status?: OrderStatus) {
  switch (status) {
    case "paid":
    case "delivered":
      return CheckCircle2;
    case "processing":
      return RefreshCw;
    case "cancelled":
      return AlertCircle;
    default:
      return Clock;
  }
}

function getOrderStatusBadgeVariant(status?: OrderStatus) {
  switch (status) {
    case "paid":
    case "delivered":
      return "success" as const;
    case "processing":
      return "secondary" as const;
    case "cancelled":
      return "destructive" as const;
    default:
      return "warning" as const;
  }
}

export default function DashboardTopbar({
  onOpenSidebar,
}: DashboardTopbarProps) {
  const router = useRouter();

  const [adminName, setAdminName] = useState<string>("مدیر فروشگاه");
  const [adminEmail, setAdminEmail] = useState<string>("admin@parnazar.ir");

  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [notificationsInitialized, setNotificationsInitialized] = useState(false);
  const [isCheckingNotifications, setIsCheckingNotifications] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");

  // Live gold price for ticker chip
  const [live18kPrice, setLive18kPrice] = useState<number | null>(null);
  const [live18kChange, setLive18kChange] = useState<number>(0);

  const notifRef = useRef<HTMLDivElement>(null);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const previousGoldPriceRef = useRef<number | null>(null);
  const checkingNotificationsRef = useRef(false);

  /* ---------------------------------------------------------------------- */
  /* Admin profile from PocketBase                                          */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!pb.authStore.isValid || !pb.authStore.model) {
      return;
    }

    const model = pb.authStore.model as {
      name?: string;
      username?: string;
      email?: string;
    };

    const displayName =
      model.name?.trim() || model.username?.trim() || "مدیر فروشگاه";
    const displayEmail = model.email?.trim() || "مدیریت سیستم";

    setAdminName(displayName);
    setAdminEmail(displayEmail);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Fetch notifications & live rate                                        */
  /* ---------------------------------------------------------------------- */

  const checkForNewOrders = useCallback(
    async (initial = false) => {
      if (checkingNotificationsRef.current || !pb.authStore.isValid) {
        return;
      }

      checkingNotificationsRef.current = true;
      setIsCheckingNotifications(true);

      try {
        const [orderResult, goldRates] = await Promise.all([
          pb.collection("orders").getList<OrderRecord>(1, 20, {
            sort: "-created",
            expand: "user",
            requestKey: null,
          }),
          pb.collection("gold_rates").getFullList<GoldRateRecord>({
            sort: "-updated",
            requestKey: null,
          }),
        ]);

        const currentOrders = orderResult.items;

        const gold18k = goldRates.find(
          (item) => item.symbol === "IR_GOLD_18K"
        );

        if (gold18k) {
          const p = numberValue(gold18k.price);
          setLive18kPrice(p);
          setLive18kChange(Number(gold18k.change_percent) || 0);
        }

        if (initial || !notificationsInitialized) {
          currentOrders.forEach((order) => {
            knownOrderIdsRef.current.add(order.id);
          });

          if (gold18k) {
            previousGoldPriceRef.current = numberValue(gold18k.price);
          }

          setNotificationsInitialized(true);
          return;
        }

        const newOrders = currentOrders.filter(
          (order) => !knownOrderIdsRef.current.has(order.id)
        );

        if (newOrders.length > 0) {
          const newNotifications: NotificationOrder[] = newOrders.map(
            (order) => ({
              id: order.id,
              type: "order",
              orderNumber: order.orderNumber || order.id,
              customerName: getCustomerName(order),
              amount: numberValue(order.totalAmount),
              created: order.created || new Date().toISOString(),
              status: order.status,
              paymentStatus: order.paymentStatus,
            })
          );

          setNotifications((current) => {
            const merged = [...newNotifications, ...current];
            const unique = Array.from(
              new Map(merged.map((item) => [item.id, item])).values()
            );
            return unique.slice(0, 20);
          });

          setHasNewNotification(true);
          window.setTimeout(() => setHasNewNotification(false), 5000);
        }

        const currentGoldPrice = gold18k ? numberValue(gold18k.price) : null;
        const previousGoldPrice = previousGoldPriceRef.current;

        const goldPriceChanged =
          currentGoldPrice !== null &&
          previousGoldPrice !== null &&
          currentGoldPrice !== previousGoldPrice;

        if (goldPriceChanged && gold18k) {
          const goldNotification: GoldNotification = {
            id: `gold-price-${Date.now()}`,
            type: "gold",
            created: new Date().toISOString(),
            goldName: gold18k.name || "طلای ۱۸ عیار",
            oldPrice: previousGoldPrice,
            newPrice: currentGoldPrice,
          };

          setNotifications((current) =>
            [goldNotification, ...current].slice(0, 20)
          );

          setHasNewNotification(true);
          window.setTimeout(() => setHasNewNotification(false), 5000);
        }

        if (currentGoldPrice !== null) {
          previousGoldPriceRef.current = currentGoldPrice;
        }

        currentOrders.forEach((order) => {
          knownOrderIdsRef.current.add(order.id);
        });
      } catch (error) {
        console.error("Dashboard notifications error:", error);
      } finally {
        checkingNotificationsRef.current = false;
        setIsCheckingNotifications(false);
      }
    },
    [notificationsInitialized]
  );

  useEffect(() => {
    if (!pb.authStore.isValid) return;
    void checkForNewOrders(true);
  }, [checkForNewOrders]);

  useEffect(() => {
    if (!pb.authStore.isValid) return;
    const interval = window.setInterval(() => {
      void checkForNewOrders(false);
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [checkForNewOrders]);

  /* Outside click listener for notification popover */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      pb.authStore.clear();
      Cookies.remove("pb_auth", { path: "/" });
      Cookies.remove("token", { path: "/" });
      Cookies.remove("user_role", { path: "/" });

      setLogoutConfirmOpen(false);
      router.replace("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setHasNewNotification(false);
  };

  const openNotification = (orderId: string) => {
    setNotificationsOpen(false);
    router.push(`/dashboard/orders/${orderId}`);
  };

  const unreadCount = notifications.length;

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === "orders") return item.type === "order";
    if (activeTab === "gold") return item.type === "gold";
    return true;
  });

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b border-[#1C3324]/12 bg-white/85 px-4 py-3 backdrop-blur-xl transition-colors duration-300 sm:px-6 lg:px-8 font-sans dark:border-white/10 dark:bg-[#101813]/85"
        dir="rtl"
      >
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          {/* Left / Brand Section */}
          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onOpenSidebar}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#1C3324]/10 text-[#1C3324] transition-colors hover:bg-[#1C3324]/5 focus:outline-none dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5 lg:hidden cursor-pointer"
              aria-label="باز کردن منو"
            >
              <Menu size={20} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[#1C3324] sm:text-base dark:text-zinc-100">
                  پیشخوان مدیریت
                </span>
                <span className="hidden sm:inline-block">
                  <Badge variant="outline" className="text-[10px] py-0 font-bold">
                    نسخه ۲.۰
                  </Badge>
                </span>
              </div>
              <p className="hidden text-[11px] text-[#3A5A46] sm:block dark:text-zinc-400">
                گالری طلا و جواهر پرنا زر — مثل زر بدرخش
              </p>
            </div>
          </div>

          {/* Center: Live 18K Gold Ticker Pill & Quick Search */}
          <div className="flex items-center gap-3">
            {live18kPrice !== null && (
              <Link
                href="/dashboard/gold-rate"
                className="hidden md:flex items-center gap-2 rounded-2xl border border-[#B4901E]/30 bg-[#B4901E]/10 px-3 py-1.5 text-xs transition-colors hover:bg-[#B4901E]/15 dark:border-[#D8B65C]/30 dark:bg-[#D8B65C]/10"
                title="مشاهده و تغییر نرخ طلا"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-xl bg-[#B4901E] text-white shadow-2xs dark:bg-[#D8B65C] dark:text-[#101813]">
                  <Coins size={13} />
                </div>
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="text-[#3A5A46] text-[11px] dark:text-zinc-300">
                    طلای ۱۸:
                  </span>
                  <span className="font-mono text-[#1C3324] dark:text-[#D8B65C]">
                    {live18kPrice.toLocaleString("fa-IR")}
                  </span>
                  <span className="text-[10px] text-[#3A5A46] dark:text-zinc-400">
                    تومان
                  </span>
                  {live18kChange !== 0 && (
                    <span
                      className={cn(
                        "flex items-center text-[10px] font-extrabold mr-1",
                        live18kChange > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {live18kChange > 0 ? (
                        <ArrowUpRight size={12} />
                      ) : (
                        <ArrowDownRight size={12} />
                      )}
                      {Math.abs(live18kChange).toFixed(1)}٪
                    </span>
                  )}
                </div>
              </Link>
            )}

            {/* Quick search input */}
            <div className="hidden xl:block w-72">
              <label className="relative block">
                <Search
                  size={15}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#3A5A46] dark:text-zinc-400"
                />
                <input
                  type="search"
                  placeholder="جست‌وجو در پیشخوان..."
                  className="h-9 w-full rounded-2xl border border-[#1C3324]/12 bg-[#FAF9F6] pl-9 pr-9 text-xs text-[#1C3324] placeholder:text-[#3A5A46]/60 focus:border-[#1C3324] focus:outline-none focus:ring-2 focus:ring-[#1C3324]/10 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[#D8B65C]"
                />
                <kbd className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-md border border-[#1C3324]/10 bg-white px-1.5 py-0.5 text-[9px] font-mono text-[#3A5A46] dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-400">
                  ⌘K
                </kbd>
              </label>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            {/* Theme toggle */}
            <ThemeToggle />

            {/* Notifications Popover */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((prev) => !prev);
                  if (!notificationsOpen) setHasNewNotification(false);
                }}
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-2xl border border-[#1C3324]/10 text-[#1C3324] transition-all hover:bg-[#1C3324]/5 focus:outline-none dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5 cursor-pointer",
                  hasNewNotification && "animate-[pulse_1s_ease-in-out_3]"
                )}
                aria-label="اعلان‌ها"
                aria-expanded={notificationsOpen}
              >
                <Bell size={18} />

                {unreadCount > 0 && (
                  <>
                    <span className="absolute -left-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#8B263E] px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-[#101813]">
                      {unreadCount > 99 ? "۹۹+" : unreadCount.toLocaleString("fa-IR")}
                    </span>
                    {hasNewNotification && (
                      <span className="absolute -left-1 -top-1 h-5 w-5 animate-ping rounded-full bg-[#8B263E]/60 opacity-75" />
                    )}
                  </>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {notificationsOpen && (
                <div
                  className="absolute left-0 mt-2 w-80 sm:w-96 origin-top-left rounded-3xl border border-[#1C3324]/15 bg-white p-4 shadow-2xl transition-all duration-200 z-50 dark:border-white/10 dark:bg-[#15221B] dark:text-zinc-100"
                  role="menu"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-[#1C3324]/10 pb-3 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#8B263E]/10 text-[#8B263E] dark:bg-[#8B263E]/25 dark:text-rose-300">
                        <Bell size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-[#1C3324] dark:text-zinc-100">
                          مرکز اعلان‌ها
                        </h4>
                        <p className="text-[10px] text-[#3A5A46] dark:text-zinc-400">
                          {isCheckingNotifications ? "در حال همگام‌سازی..." : "بروزرسانی لحظه‌ای"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={clearNotifications}
                          className="text-[10px] font-bold text-zinc-400 transition hover:text-red-500 cursor-pointer"
                        >
                          پاک کردن همه
                        </button>
                      )}
                      <Badge variant="crimson" className="text-[10px] font-black">
                        {notifications.length.toLocaleString("fa-IR")} جدید
                      </Badge>
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="mt-3 w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3 h-8">
                      <TabsTrigger value="all" className="text-[11px] py-1">
                        همه ({notifications.length})
                      </TabsTrigger>
                      <TabsTrigger value="orders" className="text-[11px] py-1">
                        سفارش‌ها
                      </TabsTrigger>
                      <TabsTrigger value="gold" className="text-[11px] py-1">
                        نرخ طلا
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* List */}
                  <div className="mt-3 max-h-80 divide-y divide-[#1C3324]/5 overflow-y-auto pr-1 dark:divide-white/5 scrollbar-thin">
                    {filteredNotifications.length === 0 ? (
                      <div className="flex min-h-40 flex-col items-center justify-center px-4 py-8 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FAF9F6] text-[#3A5A46] border border-[#1C3324]/10 dark:bg-zinc-900 dark:border-white/10 dark:text-zinc-400">
                          <Bell size={20} />
                        </div>
                        <p className="mt-3 text-xs font-bold text-[#1C3324] dark:text-zinc-200">
                          اعلان جدیدی وجود ندارد
                        </p>
                        <p className="mt-1 text-[10px] text-[#3A5A46] dark:text-zinc-400">
                          سفارش‌های جدید به صورت خودکار در این بخش نمایش داده می‌شوند.
                        </p>
                      </div>
                    ) : (
                      filteredNotifications.map((notification) => {
                        if (notification.type === "gold") {
                          const isIncrease =
                            notification.newPrice > notification.oldPrice;

                          return (
                            <div
                              key={notification.id}
                              className="flex flex-col gap-1.5 rounded-2xl p-2.5 transition hover:bg-[#FAF9F6] dark:hover:bg-white/5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
                                    <Coins size={14} />
                                  </div>
                                  <span className="text-xs font-bold text-[#1C3324] dark:text-zinc-200">
                                    تغییر مظنه بازار
                                  </span>
                                </div>
                                <span className="text-[10px] text-[#3A5A46] dark:text-zinc-400">
                                  {getRelativeTime(notification.created)}
                                </span>
                              </div>

                              <div className="mr-9 text-[11px]">
                                <span className="text-[#3A5A46] dark:text-zinc-400">
                                  {notification.goldName}:{" "}
                                </span>
                                <span className="font-mono font-bold text-[#8B263E] dark:text-[#D8B65C]">
                                  {formatMoney(notification.newPrice)}
                                </span>
                                <span
                                  className={cn(
                                    "mr-2 font-bold text-[10px]",
                                    isIncrease
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-rose-600 dark:text-rose-400"
                                  )}
                                >
                                  ({isIncrease ? "افزایش" : "کاهش"})
                                </span>
                              </div>
                            </div>
                          );
                        }

                        const StatusIcon = getOrderStatusIcon(notification.status);
                        const statusVariant = getOrderStatusBadgeVariant(
                          notification.status
                        );

                        return (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => openNotification(notification.id)}
                            className="group flex w-full flex-col gap-1.5 rounded-2xl p-2.5 text-right transition hover:bg-[#FAF9F6] dark:hover:bg-white/5 cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#8B263E]/10 text-[#8B263E] dark:bg-[#8B263E]/20 dark:text-rose-300">
                                  <ShoppingBag size={14} />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-black text-[#1C3324] dark:text-zinc-100">
                                    سفارش جدید
                                  </span>
                                  <span className="font-mono text-[10px] text-[#3A5A46] dark:text-zinc-400">
                                    #{notification.orderNumber}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] text-[#3A5A46] dark:text-zinc-400">
                                {getRelativeTime(notification.created)}
                              </span>
                            </div>

                            <div className="mr-9 flex items-center justify-between">
                              <span className="text-xs font-bold text-[#1C3324] dark:text-zinc-200">
                                {notification.customerName}
                              </span>
                              <span className="font-mono font-black text-xs text-[#8B263E] dark:text-[#D8B65C]">
                                {formatMoney(notification.amount)}
                              </span>
                            </div>

                            <div className="mr-9 mt-1 flex items-center justify-between">
                              <Badge
                                variant={statusVariant}
                                className="text-[10px] py-0 gap-1 font-bold"
                              >
                                <StatusIcon size={11} />
                                <span>{getOrderStatusText(notification.status)}</span>
                              </Badge>

                              {notification.paymentStatus === "paid" && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  <CreditCard size={11} />
                                  تسویه شده
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-3 border-t border-[#1C3324]/10 pt-2.5 dark:border-white/10">
                    <Button
                      asChild
                      variant="default"
                      size="sm"
                      className="w-full text-xs font-bold justify-center"
                    >
                      <Link
                        href="/dashboard/orders"
                        onClick={() => setNotificationsOpen(false)}
                      >
                        <span>مشاهده همه سفارش‌ها</span>
                        <ExternalLink size={13} />
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 rounded-2xl border border-[#1C3324]/10 p-1.5 transition-all hover:bg-[#1C3324]/5 focus:outline-none dark:border-white/10 dark:hover:bg-white/5 cursor-pointer"
                  aria-label="منوی کاربر مدیر"
                >
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#1C3324] to-[#2D4F38] text-xs font-black text-white shadow-2xs dark:from-[#D8B65C] dark:to-[#B4901E] dark:text-[#101813]">
                    {adminName.charAt(0)}
                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#101813]" />
                  </div>

                  <div className="hidden text-right md:block">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-black text-[#1C3324] dark:text-zinc-100">
                        {adminName}
                      </p>
                      <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p
                      className="max-w-[120px] truncate text-[10px] text-[#3A5A46] dark:text-zinc-400"
                      dir="ltr"
                    >
                      {adminEmail}
                    </p>
                  </div>

                  <ChevronDown
                    size={14}
                    className="hidden text-[#3A5A46] transition-transform duration-200 md:block dark:text-zinc-400"
                  />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56 font-sans">
                <DropdownMenuLabel className="font-normal p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-black text-[#1C3324] dark:text-zinc-100">
                      {adminName}
                    </p>
                    <p
                      className="text-[10px] text-[#3A5A46] truncate dark:text-zinc-400"
                      dir="ltr"
                    >
                      {adminEmail}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex items-center gap-2">
                    <Settings size={14} />
                    <span>تنظیمات پیشخوان</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/dashboard/users" className="flex items-center gap-2">
                    <User size={14} />
                    <span>مدیریت کاربران</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/dashboard/logs" className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>رویدادهای امنیتی</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => setLogoutConfirmOpen(true)}
                  className="text-rose-600 focus:bg-rose-50 focus:text-rose-700 dark:text-rose-400 dark:focus:bg-rose-950/40"
                >
                  <LogOut size={14} />
                  <span>خروج از حساب</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Dialog (Shadcn Dialog) */}
      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <TriangleAlert size={22} />
              </div>
              <div>
                <DialogTitle className="text-base font-black">
                  تأیید خروج از سیستم مدیریت
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs">
                  مدیر گرامی {adminName}، آیا مایل به بستن نشست کاری خود هستید؟
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <p className="text-xs leading-6 text-[#3A5A46] dark:text-zinc-300">
            با خروج از حساب، برای دسترسی مجدد به پنل مدیریت لازم است اطلاعات حساب کاربری خود را وارد فرمایید.
          </p>

          <DialogFooter className="mt-4 gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLogoutConfirmOpen(false)}
              disabled={isLoggingOut}
            >
              انصراف و بازگشت
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="gap-2"
            >
              {isLoggingOut ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  <span>در حال خروج...</span>
                </>
              ) : (
                <>
                  <LogOut size={15} />
                  <span>بله، خروج از حساب</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}