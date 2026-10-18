"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Box,
  Coins,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  ScrollText,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";

type NavigationItem = {
  title: string;
  href: string;
  icon: ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  badge?: string;
};

interface DashboardSidebarProps {
  onNavigate?: () => void;
  mobile?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    title: "داشبورد",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "مظنه طلا",
    href: "/dashboard/gold-rate",
    icon: Coins,
  },
  {
    title: "محصولات و ویترین",
    href: "/dashboard/products",
    icon: Box,
  },
  {
    title: "سفارش‌ها",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    badge: "۸",
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
  {
    title: "لاگ سیستم",
    href: "/dashboard/logs",
    icon: ScrollText,
  },
  {
    title: "گزارش‌ها و سود",
    href: "/dashboard/reports",
    icon: BarChart3,
  },
  {
    title: "تنظیمات گالری",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

function isNavigationItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardSidebar({
  onNavigate,
  mobile = false,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`h-full w-72 shrink-0 border-l border-[#1C3324]/15 bg-white font-sans ${
        mobile ? "block" : "hidden lg:block"
      }`}
      dir="rtl"
    >
      <div className="flex h-full min-h-screen flex-col">
        <div className="flex items-center justify-between border-b border-[#1C3324]/10 p-6">
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-3"
            aria-label="ورود به پیشخوان مدیریت"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1C3324] text-white shadow-sm">
              <Package size={23} />
            </div>

            <div>
              <h1 className="text-base font-extrabold text-[#1C3324]">
                داشبورد سروین استودیو
              </h1>

              <p className="mt-1 text-xs text-[#3A5A46]">
                پنل مدیریت فروشگاه طلا
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavigationItemActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                  isActive
                    ? "bg-[#1C3324] text-white shadow-xs"
                    : "text-[#3A5A46] hover:bg-zinc-50 hover:text-[#1C3324]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    size={19}
                    strokeWidth={2}
                    className="transition-transform duration-200 group-hover:scale-110"
                  />

                  <span>{item.title}</span>
                </span>

                {item.badge ? (
                  <span
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#1C3324]/10 p-4">
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-[#3A5A46] transition hover:bg-zinc-50 hover:text-[#1C3324]"
          >
            <LogOut size={19} />
            <span>بازگشت به فروشگاه</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}