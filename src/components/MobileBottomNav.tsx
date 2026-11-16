"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, LayoutGrid, ShoppingBag, User, ShieldCheck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { pb } from "@/lib/pocketbase";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const syncAuth = () => {
      const isValid = Boolean(pb.authStore.isValid && pb.authStore.model);
      setIsAuthenticated(isValid);
      if (isValid && pb.authStore.model) {
        const model = pb.authStore.model as any;
        const admin = Boolean(
          model.collectionName === "_superusers" ||
            model.isAdmin === true ||
            ["admin", "superadmin", "administrator"].includes(
              model.role?.toLowerCase()
            )
        );
        setIsAdmin(admin);
      } else {
        setIsAdmin(false);
      }
    };

    syncAuth();
    setIsMounted(true);
    const unsubscribe = pb.authStore.onChange(syncAuth);
    return () => unsubscribe();
  }, []);

  // تعیین مسیر دکمه حساب کاربری
  const userHref = !isMounted
    ? "/account"
    : isAuthenticated
    ? isAdmin
      ? "/dashboard"
      : "/account"
    : "/login";

  // بررسی وضعیت فعال بودن هر تب
  const isHomeActive = pathname === "/";
  const isProductsActive =
    pathname === "/products" || pathname.startsWith("/products/");
  const isCartActive = pathname === "/cart";
  const isUserActive =
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/dashboard");

  // تبدیل اعداد به فارسی
  const toPersianDigits = (num: number) =>
    num.toString().replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

  const navItems = [
    {
      href: "/",
      label: "صفحه اصلی",
      icon: Home,
      isActive: isHomeActive,
      badge: 0,
    },
    {
      href: "/products",
      label: "محصولات",
      icon: LayoutGrid, // آیکون استاندارد و طبیعی برای ویترین محصولات
      isActive: isProductsActive,
      badge: 0,
    },
    {
      href: "/cart",
      label: "سبد خرید",
      icon: ShoppingBag,
      isActive: isCartActive,
      badge: isMounted ? totalItems : 0,
    },
    {
      href: userHref,
      label: !isMounted
        ? "اطلاعات کاربری"
        : isAuthenticated
        ? isAdmin
          ? "پنل مدیریت"
          : "اطلاعات کاربری"
        : "ورود / حساب",
      icon: isMounted && isAdmin ? ShieldCheck : User,
      isActive: isUserActive,
      badge: 0,
    },
  ];

  return (
    <nav
      aria-label="ناوبری اصلی موبایل"
      className="fixed bottom-0 inset-x-0 z-50 lg:hidden pb-[max(env(safe-area-inset-bottom),0.35rem)] bg-[#190408]/95 backdrop-blur-2xl border-t border-[#DFB76C]/35 shadow-[0_-10px_30px_rgba(20,2,6,0.75)]"
    >
      <div className="grid grid-cols-4 h-16 w-full max-w-lg mx-auto items-center px-2 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative group flex flex-col items-center justify-center h-13 rounded-2xl transition-all duration-250 active:scale-95 select-none ${
                item.isActive
                  ? "bg-gradient-to-b from-[#DFB76C]/15 to-transparent text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {/* خط نورانی طلایی در بالاترین نقطه تب فعال */}
              {item.isActive && (
                <span className="absolute -top-[5px] w-8 h-[2.5px] rounded-full bg-gradient-to-r from-transparent via-[#DFB76C] to-transparent shadow-[0_0_10px_#DFB76C]" />
              )}

              <div className="relative flex items-center justify-center mb-1">
                <Icon
                  size={21}
                  strokeWidth={item.isActive ? 2.25 : 1.8}
                  className={`transition-all duration-250 ${
                    item.isActive
                      ? "text-[#DFB76C] scale-105 drop-shadow-[0_0_8px_rgba(223,183,108,0.45)]"
                      : "opacity-85 group-hover:opacity-100"
                  }`}
                />

                {/* نشانگر تعداد محصولات سبد خرید */}
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold bg-[#8B142D] text-white border border-[#DFB76C] shadow-sm">
                    {toPersianDigits(item.badge)}
                  </span>
                )}
              </div>

              <span
                className={`text-[10.5px] leading-tight transition-colors ${
                  item.isActive
                    ? "font-black text-[#F5D99B]"
                    : "font-medium text-zinc-400"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}