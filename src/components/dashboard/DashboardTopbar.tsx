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
} from "lucide-react";
import Cookies from "js-cookie";
import Link from "next/link";
import { useRouter } from "next/navigation";

import ThemeToggle from "@/components/theme/ThemeToggle";
import { pb } from "@/lib/pocketbase";

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
          String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
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
  if (!dateString) {
    return "زمان نامشخص";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "زمان نامشخص";
  }

  const diff = Math.max(
    0,
    Date.now() - date.getTime(),
  );

  const seconds = Math.floor(diff / 1000);

  if (seconds < 30) {
    return "همین الان";
  }

  if (seconds < 60) {
    return `${seconds.toLocaleString("fa-IR")} ثانیه پیش`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes.toLocaleString("fa-IR")} دقیقه پیش`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours.toLocaleString("fa-IR")} ساعت پیش`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days.toLocaleString("fa-IR")} روز پیش`;
  }

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
      return CheckCircle2;

    case "processing":
      return RefreshCw;

    case "cancelled":
      return AlertCircle;

    case "delivered":
      return CheckCircle2;

    default:
      return Clock;
  }
}

function getOrderStatusClass(status?: OrderStatus): string {
  switch (status) {
    case "paid":
      return "text-emerald-600";

    case "processing":
      return "text-indigo-600";

    case "cancelled":
      return "text-red-600";

    case "delivered":
      return "text-teal-600";

    default:
      return "text-amber-600";
  }
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function DashboardTopbar({
  onOpenSidebar,
}: DashboardTopbarProps) {
  const router = useRouter();

  const [adminName, setAdminName] =
    useState<string>("مدیر فروشگاه");

  const [adminEmail, setAdminEmail] =
    useState<string>("admin@sarvin.ir");

  const [notificationsOpen, setNotificationsOpen] =
    useState<boolean>(false);

  const [profileMenuOpen, setProfileMenuOpen] =
    useState<boolean>(false);

  const [logoutConfirmOpen, setLogoutConfirmOpen] =
    useState<boolean>(false);

  const [isLoggingOut, setIsLoggingOut] =
    useState<boolean>(false);

  const [notifications, setNotifications] =
    useState<DashboardNotification[]>([]);

  const [notificationsInitialized, setNotificationsInitialized] =
    useState(false);

  const [isCheckingNotifications, setIsCheckingNotifications] =
    useState(false);

  const [hasNewNotification, setHasNewNotification] =
    useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const previousGoldPriceRef = useRef<number | null>(null);
  const checkingNotificationsRef = useRef(false);

  /* ---------------------------------------------------------------------- */
  /* Admin                                                                  */
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
      model.name?.trim() ||
      model.username?.trim() ||
      "مدیر فروشگاه";

    const displayEmail =
      model.email?.trim() ||
      "مدیریت سیستم";

    setAdminName(displayName);
    setAdminEmail(displayEmail);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Fetch notifications                                                    */
  /* ---------------------------------------------------------------------- */

  const checkForNewOrders = useCallback(
    async (initial = false) => {
      if (checkingNotificationsRef.current) {
        return;
      }

      if (!pb.authStore.isValid) {
        return;
      }

      checkingNotificationsRef.current = true;
      setIsCheckingNotifications(true);

      try {
        const [orderResult, goldRates] = await Promise.all([
          pb.collection("orders").getList<OrderRecord>(
            1,
            20,
            {
              sort: "-created",
              expand: "user",
              requestKey: null,
            },
          ),

          pb.collection("gold_rates").getFullList<GoldRateRecord>({
            sort: "-updated",
            requestKey: null,
          }),
        ]);

        const currentOrders = orderResult.items;

        if (
          initial ||
          !notificationsInitialized
        ) {
          currentOrders.forEach((order) => {
            knownOrderIdsRef.current.add(order.id);
          });

          const gold18k = goldRates.find(
            (item) => item.symbol === "IR_GOLD_18K",
          );

          if (gold18k) {
            previousGoldPriceRef.current = numberValue(gold18k.price);
          }

          setNotificationsInitialized(true);

          return;
        }

        const newOrders =
          currentOrders.filter(
            (order) =>
              !knownOrderIdsRef.current.has(order.id),
          );

        if (newOrders.length > 0) {
          const newNotifications: NotificationOrder[] =
            newOrders.map((order) => ({
              id: order.id,
              type: "order",
              orderNumber:
                order.orderNumber || order.id,
              customerName:
                getCustomerName(order),
              amount:
                numberValue(order.totalAmount),
              created:
                order.created ||
                new Date().toISOString(),
              status: order.status,
              paymentStatus:
                order.paymentStatus,
            }));

          setNotifications((current) => {
            const merged = [
              ...newNotifications,
              ...current,
            ];

            const unique = Array.from(
              new Map(
                merged.map((item) => [
                  item.id,
                  item,
                ]),
              ).values(),
            );

            return unique.slice(0, 20);
          });

          setHasNewNotification(true);

          window.setTimeout(() => {
            setHasNewNotification(false);
          }, 5000);
        }

        const gold18k = goldRates.find(
          (item) => item.symbol === "IR_GOLD_18K",
        );

        const currentGoldPrice = gold18k
          ? numberValue(gold18k.price)
          : null;

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
            [goldNotification, ...current].slice(0, 20),
          );

          setHasNewNotification(true);

          window.setTimeout(() => {
            setHasNewNotification(false);
          }, 5000);
        }

        if (currentGoldPrice !== null) {
          previousGoldPriceRef.current = currentGoldPrice;
        }

        currentOrders.forEach((order) => {
          knownOrderIdsRef.current.add(order.id);
        });
      } catch (error) {
        console.error(
          "Dashboard notifications error:",
          error,
        );
      } finally {
        checkingNotificationsRef.current = false;
        setIsCheckingNotifications(false);
      }
    },
    [notificationsInitialized],
  );

  useEffect(() => {
    if (!pb.authStore.isValid) {
      return;
    }

    void checkForNewOrders(true);
  }, [checkForNewOrders]);

  useEffect(() => {
    if (!pb.authStore.isValid) {
      return;
    }

    const interval = window.setInterval(() => {
      void checkForNewOrders(false);
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [checkForNewOrders]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        notifRef.current &&
        !notifRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(target)
      ) {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  useEffect(() => {
    if (notificationsOpen) {
      setHasNewNotification(false);
    }
  }, [notificationsOpen]);

  useEffect(() => {
    if (!logoutConfirmOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        !isLoggingOut
      ) {
        setLogoutConfirmOpen(false);
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );

      document.body.style.overflow = "";
    };
  }, [
    logoutConfirmOpen,
    isLoggingOut,
  ]);

  const openLogoutConfirmation = () => {
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
    setLogoutConfirmOpen(true);
  };

  const closeLogoutConfirmation = () => {
    if (isLoggingOut) {
      return;
    }

    setLogoutConfirmOpen(false);
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      pb.authStore.clear();

      Cookies.remove("pb_auth", {
        path: "/",
      });

      Cookies.remove("token", {
        path: "/",
      });

      Cookies.remove("user_role", {
        path: "/",
      });

      setLogoutConfirmOpen(false);

      router.replace("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const unreadCount = notifications.length;

  const clearNotifications = () => {
    setNotifications([]);
    setHasNewNotification(false);
  };

  const openNotification = (
    orderId: string,
  ) => {
    setNotificationsOpen(false);

    router.push(
      `/dashboard/orders/${orderId}`,
    );
  };

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b border-[#1C3324]/15 bg-white/95 px-4 py-3.5 backdrop-blur-xl sm:px-6 lg:px-8 font-sans"
        dir="rtl"
      >
        <div className="flex items-center justify-between gap-4">
          
          {/* Brand */}
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={onOpenSidebar}
              className="rounded-xl p-2 text-[#1C3324] transition hover:bg-[#1C3324]/5 focus:outline-none lg:hidden"
              aria-label="باز کردن منو"
            >
              <Menu size={22} />
            </button>

            <div>
              <p className="text-xs font-medium text-[#3A5A46]">
                داشبورد مدیریت طلا و جواهر
              </p>

              <h2 className="mt-0.5 text-base font-extrabold text-[#1C3324] sm:text-lg">
                سروین استودیو
              </h2>
            </div>
          </div>

          {/* Search */}
          <div className="hidden max-w-md flex-1 md:block">
            <label className="relative block">
              <Search
                size={18}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3A5A46]"
              />

              <input
                type="search"
                placeholder="جست‌وجو در محصولات، سفارش‌ها، مشتریان..."
                className="w-full rounded-full border border-[#1C3324]/15 bg-[#FAF9F6] py-2.5 pl-4 pr-11 text-sm text-[#1C3324] outline-none transition placeholder:text-[#3A5A46]/60 focus:border-[#1C3324] focus:ring-2 focus:ring-[#1C3324]/10"
              />
            </label>
          </div>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />

            {/* Notifications */}
            <div
              ref={notifRef}
              className="relative"
              onMouseEnter={() =>
                setNotificationsOpen(true)
              }
            >
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen(
                    (previous) => !previous,
                  );

                  setProfileMenuOpen(false);
                }}
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-[#1C3324] transition hover:bg-[#1C3324]/5 focus:outline-none ${
                  hasNewNotification
                    ? "animate-[pulse_1s_ease-in-out_2]"
                    : ""
                }`}
                aria-label="اعلان‌ها"
                aria-expanded={
                  notificationsOpen
                }
                aria-haspopup="menu"
              >
                <Bell size={20} />

                {unreadCount > 0 ? (
                  <>
                    <span className="absolute -right-0.5 -top-0.5 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#8B263E] px-1 text-[9px] font-black text-white ring-2 ring-white">
                      {unreadCount > 99
                        ? "۹۹+"
                        : unreadCount.toLocaleString(
                            "fa-IR",
                          )}
                    </span>

                    {hasNewNotification && (
                      <span className="absolute right-0 top-0 h-3 w-3 animate-ping rounded-full bg-[#8B263E]/60 opacity-75" />
                    )}
                  </>
                ) : null}
              </button>

              {notificationsOpen ? (
                <div
                  className="absolute left-0 mt-2 w-80 origin-top-left rounded-3xl border border-[#1C3324]/15 bg-white p-3 shadow-2xl transition-all duration-200 sm:w-96"
                  onMouseLeave={() =>
                    setNotificationsOpen(false)
                  }
                  role="menu"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-[#1C3324]/10 px-2 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Bell
                          size={18}
                          className="text-[#8B263E]"
                        />

                        {isCheckingNotifications && (
                          <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                        )}
                      </div>

                      <span className="text-sm font-bold text-[#1C3324]">
                        اعلان‌ها
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={
                            clearNotifications
                          }
                          className="text-[10px] font-bold text-zinc-400 transition hover:text-red-500 cursor-pointer"
                        >
                          پاک کردن
                        </button>
                      )}

                      <span className="rounded-full bg-[#FAF9F6] px-2 py-0.5 text-xs font-semibold text-[#8B263E] border border-[#1C3324]/10">
                        {notifications.length.toLocaleString(
                          "fa-IR",
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Notification list */}
                  <div className="mt-2 max-h-80 divide-y divide-[#1C3324]/5 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex min-h-44 flex-col items-center justify-center px-5 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
                          <Bell size={21} />
                        </div>

                        <p className="mt-3 text-xs font-bold text-[#1C3324]">
                          اعلان جدیدی ندارید
                        </p>

                        <p className="mt-1 max-w-[230px] text-[10px] leading-5 text-[#3A5A46]">
                          سفارش‌های جدید هر ۳۰ ثانیه بررسی می‌شوند.
                        </p>
                      </div>
                    ) : (
                      notifications.map((notification) => {
                        if (notification.type === "gold") {
                          const isIncrease =
                            notification.newPrice > notification.oldPrice;

                          return (
                            <div
                              key={notification.id}
                              className="flex w-full flex-col gap-2 rounded-2xl p-2.5 text-right transition hover:bg-[#FAF9F6]"
                              role="menuitem"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
                                    <span className="text-sm">💰</span>
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-black text-[#1C3324]">
                                      تغییر قیمت طلا
                                    </p>
                                    <p className="mt-0.5 text-[10px] text-[#3A5A46]">
                                      {notification.goldName}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-1 text-[10px] text-[#3A5A46]">
                                  <Clock size={11} />
                                  <span>
                                    {getRelativeTime(notification.created)}
                                  </span>
                                </div>
                              </div>

                              <div className="pr-10">
                                <p className="text-[10px] text-[#3A5A46]">
                                  قیمت قبلی
                                </p>
                                <p className="text-xs font-bold text-zinc-600">
                                  {formatMoney(notification.oldPrice)}
                                </p>

                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <span
                                    className={
                                      isIncrease
                                        ? "text-[10px] font-black text-emerald-600"
                                        : "text-[10px] font-black text-red-600"
                                    }
                                  >
                                    {isIncrease
                                      ? "↑ افزایش قیمت"
                                      : "↓ کاهش قیمت"}
                                  </span>

                                  <span className="text-xs font-black text-[#8B263E]">
                                    {formatMoney(notification.newPrice)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const StatusIcon =
                          getOrderStatusIcon(notification.status);

                        const statusClass =
                          getOrderStatusClass(notification.status);

                        return (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() =>
                              openNotification(notification.id)
                            }
                            className="group flex w-full flex-col gap-1.5 rounded-2xl p-2.5 text-right transition hover:bg-[#FAF9F6] cursor-pointer"
                            role="menuitem"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
                                  <ShoppingBag size={15} />
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="truncate text-xs font-black text-[#1C3324]">
                                      سفارش جدید
                                    </span>

                                    <span className="font-mono text-[9px] text-[#3A5A46]">
                                      #{notification.orderNumber}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-1 text-[10px] text-[#3A5A46]">
                                <Clock size={11} />
                                <span>
                                  {getRelativeTime(notification.created)}
                                </span>
                              </div>
                            </div>

                            <div className="pr-10">
                              <p className="text-xs font-bold text-[#1C3324]">
                                {notification.customerName}
                              </p>

                              <p className="mt-1 text-xs font-black text-[#8B263E]">
                                {formatMoney(notification.amount)}
                              </p>
                            </div>

                            <div className="mt-1 flex items-center justify-between pr-10">
                              <span
                                className={`flex items-center gap-1 text-[10px] font-bold ${statusClass}`}
                              >
                                <StatusIcon
                                  size={12}
                                  className={
                                    notification.status === "processing"
                                      ? "animate-spin"
                                      : ""
                                  }
                                />

                                {getOrderStatusText(notification.status)}
                              </span>

                              {notification.paymentStatus === "paid" && (
                                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                                  <CreditCard size={11} />
                                  پرداخت موفق
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-2 border-t border-[#1C3324]/10 pt-2">
                    <Link
                      href="/dashboard/orders"
                      onClick={() =>
                        setNotificationsOpen(
                          false,
                        )
                      }
                      className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#1C3324] py-2.5 text-center text-xs font-bold text-white transition hover:bg-[#8B263E]"
                    >
                      <span>
                        مشاهده تمام سفارش‌ها
                      </span>

                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Profile */}
            <div
              ref={profileRef}
              className="relative border-r border-[#1C3324]/15 pr-2 sm:pr-3"
            >
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(
                    (previous) => !previous,
                  );

                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2.5 rounded-2xl p-1.5 transition hover:bg-[#1C3324]/5 focus:outline-none cursor-pointer"
                aria-label="باز کردن منوی مدیر"
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1C3324] text-sm font-bold text-white shadow-sm">
                  {adminName.charAt(0)}
                </div>

                <div className="hidden text-right sm:block">
                  <p className="text-sm font-bold text-[#1C3324]">
                    {adminName}
                  </p>

                  <p
                    className="mt-0.5 max-w-44 truncate text-[11px] text-[#3A5A46]"
                    dir="ltr"
                  >
                    {adminEmail}
                  </p>
                </div>

                <ChevronDown
                  size={14}
                  className={`hidden text-[#3A5A46] transition-transform duration-200 sm:block ${
                    profileMenuOpen
                      ? "rotate-180"
                      : ""
                  }`}
                />
              </button>

              {profileMenuOpen ? (
                <div
                  className="absolute left-0 mt-2 w-52 rounded-3xl border border-[#1C3324]/15 bg-white p-2 shadow-2xl"
                  role="menu"
                >
                  <div className="border-b border-[#1C3324]/10 px-3 py-2 sm:hidden">
                    <p className="text-xs font-bold text-[#1C3324]">
                      {adminName}
                    </p>

                    <p
                      className="mt-1 truncate text-left text-[10px] text-[#3A5A46]"
                      dir="ltr"
                    >
                      {adminEmail}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      openLogoutConfirmation
                    }
                    className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-50 focus:outline-none cursor-pointer"
                    role="menuitem"
                  >
                    <LogOut size={16} />

                    <span>
                      خروج از حساب
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Logout confirmation */}
      {logoutConfirmOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          dir="rtl"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeLogoutConfirmation();
            }
          }}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#1C3324]/20 bg-white shadow-2xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            aria-describedby="logout-dialog-description"
          >
            <button
              type="button"
              onClick={
                closeLogoutConfirmation
              }
              disabled={isLoggingOut}
              className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-[#3A5A46] transition hover:bg-[#FAF9F6] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              aria-label="بستن پنجره تأیید خروج"
            >
              <X size={19} />
            </button>

            <div className="px-6 pb-5 pt-7 sm:px-7">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-200">
                  <TriangleAlert
                    size={25}
                  />
                </div>

                <div className="pl-8">
                  <h3
                    id="logout-dialog-title"
                    className="text-lg font-black text-[#1C3324]"
                  >
                    تأیید خروج مدیر
                  </h3>

                  <p
                    id="logout-dialog-description"
                    className="mt-2 text-sm leading-7 text-[#3A5A46]"
                  >
                    مدیر محترم{" "}
                    <span className="font-bold text-[#8B263E]">
                      {adminName}
                    </span>
                    ، آیا مطمئن هستید که می‌خواهید
                    از حساب کاربری خود خارج شوید؟
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#1C3324]/10 bg-[#FAF9F6] px-6 py-4 sm:flex-row">
              <button
                type="button"
                onClick={
                  closeLogoutConfirmation
                }
                disabled={isLoggingOut}
                className="flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-[#1C3324]/15 bg-white px-4 text-sm font-bold text-[#3A5A46] transition hover:bg-[#FAF9F6] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                خیر، می‌مانم
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400 cursor-pointer"
              >
                {isLoggingOut ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />

                    <span>
                      در حال خروج...
                    </span>
                  </>
                ) : (
                  <>
                    <LogOut size={17} />

                    <span>
                      بله، خارج می‌شوم
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}