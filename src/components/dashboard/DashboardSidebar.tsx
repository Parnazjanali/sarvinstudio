"use client";

import React, { type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Box,
  Coins,
  CreditCard,
  FileText,
  Gem,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type NavigationItem = {
  title: string;
  href: string;
  icon: ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "gold" | "crimson" | "success";
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

interface DashboardSidebarProps {
  onNavigate?: () => void;
  mobile?: boolean;
  orderCount?: number;
}

const navigationGroups: NavigationGroup[] = [
  {
    label: "پیشخوان و بازار",
    items: [
      {
        title: "پیشخوان اصلی",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "مظنه لحظه‌ای طلا",
        href: "/dashboard/gold-rate",
        icon: Coins,
        badge: "زنده",
        badgeVariant: "gold",
      },
    ],
  },
  {
    label: "فروشگاه و سفارشات",
    items: [
      {
        title: "محصولات و ویترین",
        href: "/dashboard/products",
        icon: Box,
      },
      {
        title: "مدیریت سفارش‌ها",
        href: "/dashboard/orders",
        icon: ShoppingCart,
        badge: "فعال",
        badgeVariant: "crimson",
      },
      {
        title: "فاکتورها و تسویه‌ها",
        href: "/dashboard/invoices",
        icon: FileText,
      },
      {
        title: "کاربران و مشتریان",
        href: "/dashboard/users",
        icon: Users,
      },
    ],
  },
  {
    label: "سیستم و گزارش‌ها",
    items: [
      {
        title: "گزارش‌های فروش و سود",
        href: "/dashboard/reports",
        icon: BarChart3,
      },
      {
        title: "لاگ و رویدادهای سیستم",
        href: "/dashboard/logs",
        icon: ScrollText,
      },
      {
        title: "تنظیمات گالری",
        href: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];

function isNavigationItemActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardSidebar({
  onNavigate,
  mobile = false,
  orderCount,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "h-full w-72 shrink-0 border-l border-[#1C3324]/12 bg-white/95 font-sans backdrop-blur-md transition-colors duration-300 dark:border-white/10 dark:bg-[#121A15]/95",
        mobile ? "block w-full" : "hidden lg:block"
      )}
      dir="rtl"
    >
      <div className="flex h-full min-h-screen flex-col">
        {/* Brand Header */}
        <div className="border-b border-[#1C3324]/10 p-5 dark:border-white/10">
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="group flex items-center gap-3.5 focus:outline-none"
            aria-label="ورود به پیشخوان مدیریت"
          >
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1C3324] to-[#2D4F38] text-white shadow-md transition-transform duration-300 group-hover:scale-105 dark:from-[#D8B65C] dark:to-[#B4901E] dark:text-[#101813]">
              <Gem size={22} className="stroke-[2.2]" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base font-black tracking-tight text-[#1C3324] dark:text-zinc-100 whitespace-nowrap font-heading">
                  پرنا زر
                </span>
                <Badge
                  variant="gold"
                  className="px-1.5 py-0 text-[9px] font-black shrink-0 whitespace-nowrap"
                >
                  مدیریت
                </Badge>
              </div>

              <p className="mt-0.5 text-xs text-[#8B263E] dark:text-[#D8B65C] font-bold whitespace-nowrap">
                مثل زر بدرخش
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3.5 py-5 scrollbar-thin">
          {navigationGroups.map((group) => (
            <div key={group.label} className="space-y-1.5">
              <div className="px-3 pb-1 text-[11px] font-extrabold text-[#3A5A46]/70 dark:text-zinc-500 whitespace-nowrap">
                {group.label}
              </div>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isNavigationItemActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "group relative flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all duration-200 whitespace-nowrap",
                        isActive
                          ? "bg-[#1C3324] text-white shadow-sm dark:bg-[#D8B65C] dark:text-[#101813]"
                          : "text-[#3A5A46] hover:bg-[#1C3324]/5 hover:text-[#1C3324] dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100"
                      )}
                    >
                      <span className="flex items-center gap-3 min-w-0 truncate">
                        <Icon
                          size={18}
                          strokeWidth={isActive ? 2.3 : 2}
                          className={cn(
                            "shrink-0 transition-transform duration-200 group-hover:scale-110",
                            isActive
                              ? "text-white dark:text-[#101813]"
                              : "text-[#3A5A46] dark:text-zinc-400"
                          )}
                        />
                        <span className="whitespace-nowrap truncate">{item.title}</span>
                      </span>

                      {item.badge && (
                        <Badge
                          variant={isActive ? "secondary" : item.badgeVariant || "secondary"}
                          className={cn(
                            "px-2 py-0.5 text-[10px] font-black shrink-0 whitespace-nowrap",
                            isActive && "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                          )}
                        >
                          {item.title.includes("سفارش") && orderCount
                            ? String(orderCount)
                            : item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="space-y-2 border-t border-[#1C3324]/10 p-3.5 dark:border-white/10">
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center justify-between rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] px-3.5 py-2.5 text-xs font-bold text-[#1C3324] transition-all hover:border-[#1C3324]/20 hover:bg-[#1C3324]/5 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-white/5"
          >
            <span className="flex items-center gap-2.5">
              <Store size={16} className="text-[#8B263E] dark:text-[#D8B65C]" />
              <span>مشاهده فروشگاه</span>
            </span>
            <span className="text-[10px] text-[#3A5A46] dark:text-zinc-400">
              آنلاین ↗
            </span>
          </Link>
        </div>
      </div>
    </aside>
  );
}