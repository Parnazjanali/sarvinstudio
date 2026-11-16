"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { LayoutDashboard, LogOut, Menu, Package, Settings, ShieldCheck, ShoppingBag, Trash2, User, X, ChevronDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";

import { useCart } from "@/context/CartContext";
import { formatNumber, getPbFileUrl } from "@/lib/format";
import { pb } from "@/lib/pocketbase";

/* =========================================================
   TYPES
========================================================= */
export type HeaderUser = { id?: string | null; name?: string | null; username?: string | null; phone?: string | null; email?: string | null; role?: string | null; isAdmin?: boolean; };
type SiteHeaderProps = { user?: HeaderUser | null; };
type ProductLike = { id?: string; title?: string | null; name?: string | null; image?: string | null; imageUrl?: string | null; images?: string | string[] | null; collectionId?: string | null; collectionName?: string | null; ayar?: number | string | null; weight?: number | string | null; color?: string | null; };
type CartItemLike = { id: string; quantity: number; product: ProductLike; };

export interface HeaderCollectionItem {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  image?: string;
  featured?: boolean;
  sort_order?: number;
}

const DEFAULT_COLLECTIONS: HeaderCollectionItem[] = [
  { id: "1", slug: "nasima", title: "کالکشن نسیما", subtitle: "لطافت باد و انحناهای طلایی", image: "/banner.webp" },
  { id: "2", slug: "sahra", title: "کالکشن صحرا", subtitle: "گرما و وسعت بیکران افق", image: "/header.webp" },
  { id: "3", slug: "delbar", title: "کالکشن دلبر", subtitle: "عناوین ظریف و مینیمال", image: "/gold.webp" },
  { id: "4", slug: "arona", title: "کالکشن آرونا", subtitle: "شکوه سنگ‌های اصیل", image: "/banner.webp" },
  { id: "5", slug: "sarv", title: "کالکشن سرو", subtitle: "نماد استواری و جاودانگی", image: "/header.webp" },
];

/* =========================================================
   HELPERS
========================================================= */
function isAdminUser(user: HeaderUser | null | undefined): boolean {
  if (!user) return false;
  const normalizedRole = user.role?.toLowerCase();
  return Boolean(user.isAdmin || normalizedRole === "admin" || normalizedRole === "superadmin" || normalizedRole === "administrator");
}

function getProductImageUrl(product: ProductLike): string | null {
  const collectionId = product.collectionId || product.collectionName || "";
  const directImage = product.imageUrl || product.image || null;
  if (typeof directImage === "string" && directImage.trim() !== "") {
    const value = directImage.trim();
    if (value.startsWith("http") || value.startsWith("/")) return value;
    if (collectionId && product.id) return getPbFileUrl(collectionId, product.id, value);
  }
  if (Array.isArray(product.images) && product.images.length > 0) {
    const firstImage = product.images[0];
    if (typeof firstImage === "string" && firstImage.trim() !== "") {
      const value = firstImage.trim();
      if (value.startsWith("http") || value.startsWith("/")) return value;
      if (collectionId && product.id) return getPbFileUrl(collectionId, product.id, value);
    }
  }
  return null;
}

function getUserFromAuthStore(): HeaderUser | null {
  if (!pb.authStore.isValid || !pb.authStore.model) return null;
  const model = pb.authStore.model as any;
  const admin = Boolean(model.collectionName === "_superusers" || model.isAdmin === true || ["admin", "superadmin", "administrator"].includes(model.role?.toLowerCase()));
  return { id: model.id || null, name: model.name || model.username || (admin ? "مدیر سیستم" : "کاربر گرامی"), username: model.username || null, email: model.email || null, phone: model.phone || null, role: admin ? "admin" : model.role || "user", isAdmin: admin, };
}

/* =========================================================
   LIVE TICKER
========================================================= */
const LiveGoldTicker = () => {
  const [goldPrice, setGoldPrice] = useState<string>("در حال بروزرسانی...");
  const [changeDir, setChangeDir] = useState<"up" | "down" | "none">("none");
  const [lastUpdate, setLastUpdate] = useState<string>("");

  useEffect(() => {
    const fetchGoldPrice = async () => {
      try {
        const response = await fetch('/api/sync-gold', { next: { revalidate: 300 } });
        const data = await response.json();
        if (data.success && data.results) {
          const gold18k = data.results.find((r: any) => r.symbol === "IR_GOLD_18K");
          if (gold18k && gold18k.price) {
            setGoldPrice(gold18k.price.toLocaleString("fa-IR"));
            if (gold18k.change > 0) setChangeDir("up");
            else if (gold18k.change < 0) setChangeDir("down");
            const now = new Date();
            setLastUpdate(now.toLocaleTimeString("fa-IR", { hour: '2-digit', minute: '2-digit' }));
          }
        }
      } catch (error) {
        console.error("Failed to fetch gold price", error);
      }
    };
    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#120205]/95 text-zinc-300 py-1.5 px-4 text-[11px] sm:text-xs flex justify-center items-center gap-2.5 sm:gap-4 border-b border-[#DFB76C]/15 w-full pointer-events-auto backdrop-blur-md shadow-xs">
      <span className="flex items-center gap-1.5 text-zinc-200 font-medium">
        <span 
          className={`w-1.5 h-1.5 rounded-full animate-pulse ${
            changeDir === 'up' 
              ? 'bg-emerald-400' 
              : changeDir === 'down' 
              ? 'bg-red-400' 
              : 'bg-[#DFB76C]'
          }`}
        />
        <span>مظنه طلای ۱۸ عیار اتحادیه:</span>
      </span>

      <span className="font-mono font-bold text-[#DFB76C] text-xs sm:text-sm">
        {goldPrice} <span className="text-[10px] text-zinc-400 font-sans font-normal">تومان</span>
      </span>

      <span className="opacity-25 text-[#DFB76C] hidden sm:inline">|</span>

      <span className="text-[10px] text-zinc-400 hidden sm:inline">
        آخرین بروزرسانی: {lastUpdate || "همین الان"}
      </span>
    </div>
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */
export default function SiteHeader({ user: initialUser = null }: SiteHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  const { items, totalItems, removeItem, totalPrice } = useCart();
  const [currentUser, setCurrentUser] = useState<HeaderUser | null>(initialUser);
  const [isMounted, setIsMounted] = useState(false);
  const [isCartHovered, setIsCartHovered] = useState(false);
  const [isUserHovered, setIsUserHovered] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [headerCollections, setHeaderCollections] = useState<HeaderCollectionItem[]>(DEFAULT_COLLECTIONS);

  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMenuEnter = (menuName: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActiveMenu(menuName);
  };

  const handleMenuLeave = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  useEffect(() => {
    const fetchHeaderCollections = async () => {
      try {
        const result = await pb.collection("exclusive_collections").getList<HeaderCollectionItem>(1, 5, {
          sort: "sort_order",
          filter: "featured = true",
          requestKey: null,
        });
        if (result?.items && result.items.length > 0) {
          setHeaderCollections(result.items);
        }
      } catch (err) {
        console.warn("Failed to fetch header collections:", err);
      }
    };

    fetchHeaderCollections();

    try {
      pb.collection("exclusive_collections").subscribe("*", (e) => {
        if (e.action === "create" || e.action === "update" || e.action === "delete") {
          fetchHeaderCollections();
        }
      });
      return () => {
        pb.collection("exclusive_collections").unsubscribe("*");
      };
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    const syncUser = () => setCurrentUser(getUserFromAuthStore() || initialUser || null);
    syncUser();
    setIsMounted(true);
    const unsubscribe = pb.authStore.onChange(syncUser);
    return () => {
      unsubscribe();
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [initialUser]);

  const isAuthenticated = isMounted ? Boolean(pb.authStore.isValid && currentUser) : Boolean(initialUser);
  const isAdmin = isAdminUser(currentUser);
  const displayName = currentUser?.name || currentUser?.username || (isAuthenticated ? "کاربر گرامی" : "کاربر مهمان");
  const displayContact = currentUser?.phone || currentUser?.email || null;
  const primaryAccountHref = !isAuthenticated ? "/login" : isAdmin ? "/dashboard" : "/account";
  const cartItems = items as unknown as CartItemLike[];

  // فعال‌سازی حالت لعل شیشه‌ای در اسکرول یا در صفحاتی غیر از صفحه اصلی
  const isRubyGlass = isScrolled || !isHomePage;

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      pb.authStore.clear();
      Cookies.remove("pb_auth");
      setCurrentUser(null);
      setIsUserHovered(false);
      setIsCartHovered(false);
      setMobileMenuOpen(false);
      setShowLogoutConfirm(false);
      toast.success("با موفقیت از حساب خارج شدید.");
      router.push("/");
      router.refresh();
      setTimeout(() => { setIsLoggingOut(false); window.location.reload(); }, 800);
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("خروج از حساب کاربری انجام نشد.");
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <div dir="rtl" className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none">
        <LiveGoldTicker />

        {/* کپسول اصلی هدر: در صفحات سفید یا اسکرول، حالت لعل شیشه‌ای (عنابی تیره با بافت مات) اعمال می‌شود */}
        <header 
          className={`pointer-events-auto w-[calc(100%-2rem)] max-w-[1400px] flex items-center justify-between px-5 lg:px-7 py-3 rounded-full transition-all duration-500 mt-3 mx-4 ${
            isRubyGlass
              ? "bg-[#240308]/85 backdrop-blur-2xl border border-[#DFB76C]/40 shadow-[0_16px_45px_rgba(20,1,4,0.45),0_1px_3px_rgba(223,183,108,0.25)] text-white"
              : "bg-transparent border border-white/10 text-white shadow-none"
          }`}
          onMouseLeave={handleMenuLeave}
        >
          {/* لوگو */}
          <Link href="/" className="group flex shrink-0 items-center justify-center gap-2.5" onClick={() => setMobileMenuOpen(false)}>
            <div className="flex flex-col text-right">
              <span className="text-[1.2rem] lg:text-[1.35rem] font-extrabold tracking-tight font-heading whitespace-nowrap leading-tight transition-colors text-white group-hover:text-[#DFB76C]">
                پرنا زر
              </span>
              <span className="text-[9.5px] font-bold tracking-tight -mt-0.5 whitespace-nowrap hidden sm:inline font-sans text-[#DFB76C]">
                مثل زر بدرخش
              </span>
            </div>
          </Link>

          {/* منوی دسکتاپ */}
          <nav className="hidden lg:flex flex-1 items-center justify-center gap-1 xl:gap-3 px-2">
            <Link 
              href="/" 
              onMouseEnter={handleMenuLeave}
              className="px-2.5 py-1.5 text-[13.5px] xl:text-[14.5px] font-bold transition-colors whitespace-nowrap text-zinc-100 hover:text-[#DFB76C]"
            >
              خانه
            </Link>

            <Link 
              href="/products" 
              onMouseEnter={handleMenuLeave}
              className="px-2.5 py-1.5 text-[13.5px] xl:text-[14.5px] font-bold transition-colors whitespace-nowrap text-zinc-100 hover:text-[#DFB76C]"
            >
              محصولات
            </Link>

            {/* آثار زنانه */}
            <div className="relative py-1" onMouseEnter={() => handleMenuEnter("women")}>
              <Link 
                href="/products?gender=women" 
                className="px-2.5 py-1.5 text-[13.5px] xl:text-[14.5px] font-bold transition-colors flex items-center gap-1 whitespace-nowrap text-zinc-100 hover:text-[#DFB76C]"
              >
                زنانه <ChevronDown size={13} className={`opacity-70 transition-transform duration-200 ${activeMenu === "women" ? "rotate-180 text-[#DFB76C]" : ""}`} />
              </Link>
            </div>

            {/* مردانه */}
            <div className="relative py-1" onMouseEnter={() => handleMenuEnter("men")}>
              <Link 
                href="/products?gender=men" 
                className="px-2.5 py-1.5 text-[13.5px] xl:text-[14.5px] font-bold transition-colors flex items-center gap-1 whitespace-nowrap text-zinc-100 hover:text-[#DFB76C]"
              >
                مردانه <ChevronDown size={13} className={`opacity-70 transition-transform duration-200 ${activeMenu === "men" ? "rotate-180 text-[#DFB76C]" : ""}`} />
              </Link>
            </div>

            {/* کودک */}
            <div className="relative py-1" onMouseEnter={() => handleMenuEnter("kids")}>
              <Link 
                href="/products?gender=kids" 
                className="px-2.5 py-1.5 text-[13.5px] xl:text-[14.5px] font-bold transition-colors flex items-center gap-1 whitespace-nowrap text-zinc-100 hover:text-[#DFB76C]"
              >
                کودک <ChevronDown size={13} className={`opacity-70 transition-transform duration-200 ${activeMenu === "kids" ? "rotate-180 text-[#DFB76C]" : ""}`} />
              </Link>
            </div>

            {/* کالکشن‌ها */}
            <div className="relative py-1" onMouseEnter={() => handleMenuEnter("collections")}>
              <Link 
                href="/collections" 
                className="px-2.5 py-1.5 text-[13.5px] xl:text-[14.5px] font-extrabold transition-colors flex items-center gap-1 whitespace-nowrap text-[#DFB76C] hover:text-white"
              >
                کالکشن‌ها <ChevronDown size={13} className={`opacity-70 transition-transform duration-200 ${activeMenu === "collections" ? "rotate-180 text-[#DFB76C]" : ""}`} />
              </Link>
            </div>

            <Link 
              href="/story" 
              className="px-2.5 py-1.5 text-[13.5px] xl:text-[14.5px] font-bold transition-colors whitespace-nowrap text-zinc-100 hover:text-[#DFB76C]"
              onMouseEnter={handleMenuLeave}
            >
              سرای زر
            </Link>

            <Link 
              href="/contact" 
              className="px-2.5 py-1.5 text-[13.5px] xl:text-[14.5px] font-bold transition-colors whitespace-nowrap text-zinc-100 hover:text-[#DFB76C]"
              onMouseEnter={handleMenuLeave}
            >
              ارتباط با ما
            </Link>
          </nav>

          {/* اکشن‌های سمت چپ */}
          <div className="hidden lg:flex shrink-0 items-center justify-end gap-2.5" onMouseEnter={handleMenuLeave}>
            {isAuthenticated && isAdmin && (
              <Link href="/dashboard" className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold transition bg-[#DFB76C]/15 border border-[#DFB76C]/30 text-[#DFB76C] hover:bg-[#DFB76C]/25 whitespace-nowrap">
                <LayoutDashboard size={15} /> پنل
              </Link>
            )}

            {/* دراپ‌داون کاربر */}
            <div className="relative" onMouseEnter={() => { setIsUserHovered(true); handleMenuLeave(); }} onMouseLeave={() => setIsUserHovered(false)}>
              <Link 
                href={primaryAccountHref} 
                className="text-[14px] font-bold transition-colors flex items-center gap-1.5 px-3 py-2 rounded-full whitespace-nowrap text-zinc-100 hover:text-[#DFB76C]"
              >
                <User size={18} />
                <span>{isAuthenticated ? displayName.split(' ')[0] : 'ورود'}</span>
              </Link>

              <div className={`absolute left-0 mt-2 w-72 overflow-hidden rounded-3xl shadow-[0_25px_60px_rgba(20,1,4,0.4)] transition-all duration-300 bg-[#240308]/95 backdrop-blur-2xl border border-[#DFB76C]/40 ${isUserHovered ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"}`}>
                <div className="border-b border-white/10 px-5 py-4 bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${isAdmin ? 'bg-[#DFB76C] text-[#240308]' : 'bg-[#DFB76C]/20 text-[#DFB76C]'}`}>
                      {isAdmin ? <ShieldCheck size={20} /> : <User size={20} />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-white">{displayName}</p>
                      {displayContact && <p dir="ltr" className="mt-0.5 text-[13px] text-zinc-300">{displayContact}</p>}
                    </div>
                  </div>
                </div>

                <div className="p-2 space-y-0.5">
                  {isAuthenticated ? (
                    <>
                      <Link href="/account/orders" className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-[13.5px] font-bold text-zinc-200 transition hover:text-[#DFB76C] hover:bg-white/5" onClick={() => setIsUserHovered(false)}>
                        <Package size={17} className="text-[#DFB76C]" /> سفارش‌های من
                      </Link>
                      <Link href="/account/edit" className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-[13.5px] font-bold text-zinc-200 transition hover:text-[#DFB76C] hover:bg-white/5" onClick={() => setIsUserHovered(false)}>
                        <Settings size={17} className="text-[#DFB76C]" /> تغییر اطلاعات
                      </Link>
                      <div className="my-1 border-t border-white/10" />
                      <button 
                        type="button"
                        onClick={() => {
                          setIsUserHovered(false);
                          setShowLogoutConfirm(true);
                        }} 
                        disabled={isLoggingOut} 
                        className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-right text-[13.5px] font-bold text-red-400 transition hover:bg-red-500/10"
                      >
                        <LogOut size={17} /> خروج از حساب
                      </button>
                    </>
                  ) : (
                    <Link href="/login" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#DFB76C] text-[#240308] px-4 py-2.5 text-[13.5px] font-black transition hover:bg-[#F2CD86]" onClick={() => setIsUserHovered(false)}>
                       ورود به حساب کاربری
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* دکمه و دراپ‌داون سبد خرید */}
            <div className="relative" onMouseEnter={() => { setIsCartHovered(true); handleMenuLeave(); }} onMouseLeave={() => setIsCartHovered(false)}>
              <Link href="/cart" className="relative flex items-center justify-center rounded-full p-2.5 bg-[#DFB76C] text-[#240308] border border-[#DFB76C] shadow-md hover:scale-105 transition-transform">
                <ShoppingBag size={18} />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-black bg-[#8B142D] text-white border-2 border-[#240308]">
                    {totalItems}
                  </span>
                )}
              </Link>

              <div className={`absolute left-0 z-50 mt-2 w-88 overflow-hidden rounded-3xl shadow-[0_25px_60px_rgba(20,1,4,0.4)] transition-all duration-300 bg-[#240308]/95 backdrop-blur-2xl border border-[#DFB76C]/40 ${isCartHovered ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"}`}>
                {cartItems.length === 0 ? (
                  <div className="py-12 text-center text-[14px] text-zinc-300 font-bold">سبد خرید شما خالی است.</div>
                ) : (
                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
                      {cartItems.map((item) => {
                        const product = item.product;
                        const imageUrl = getProductImageUrl(product);
                        const productTitle = product.title || product.name || "محصول";
                        return (
                          <div key={item.id} className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
                            {imageUrl ? (
                              <img src={imageUrl} alt={productTitle} className="h-14 w-14 shrink-0 rounded-xl object-cover bg-white/10 border border-white/15" />
                            ) : (
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#DFB76C]"><ShoppingBag size={20} /></div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="line-clamp-1 text-[13px] font-bold text-white mb-1">{productTitle}</p>
                              <span className="text-[12px] text-zinc-300 bg-white/10 px-2.5 py-0.5 rounded-md font-medium">تعداد: {formatNumber(item.quantity)}</span>
                            </div>
                            <button onClick={() => removeItem(item.id)} className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t border-white/10 mt-2 pt-3">
                      <div className="mb-3 flex items-center justify-between px-1">
                        <span className="text-[13px] font-bold text-zinc-300">جمع کل:</span>
                        <span className="text-[15px] font-black text-[#DFB76C]">{formatNumber(totalPrice)} تومان</span>
                      </div>
                      <Link href="/cart" className="block w-full rounded-full py-2.5 text-center text-[13.5px] font-bold transition hover:bg-[#F2CD86] bg-[#DFB76C] text-[#240308] shadow-md" onClick={() => setIsCartHovered(false)}>
                        مشاهده سبد خرید
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* منوی موبایل دکمه باز/بسته */}
          <div className="flex lg:hidden items-center gap-3">
            <Link href="/cart" className="relative p-2 text-white">
              <ShoppingBag size={22} />
              {totalItems > 0 && <span className="absolute top-0 right-0 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-bold bg-[#DFB76C] text-[#240308]">{totalItems}</span>}
            </Link>
            <button className="p-1.5 text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>

        {/* مگامنو شیشه‌ای لعل دسکتاپ */}
        {activeMenu && (
          <div 
            className="pointer-events-auto w-[calc(100%-2rem)] max-w-[1400px] mx-4 pt-2 z-50 hidden lg:block"
            onMouseEnter={() => handleMenuEnter(activeMenu)}
            onMouseLeave={handleMenuLeave}
          >
            <div className="bg-[#240308]/95 backdrop-blur-3xl rounded-3xl shadow-[0_25px_60px_rgba(20,1,4,0.45)] border border-[#DFB76C]/40 p-7 animate-in fade-in slide-in-from-top-2 duration-150 text-right">
              {activeMenu === "women" && (
                <div className="grid grid-cols-4 gap-8">
                  <div>
                    <p className="text-xs font-black text-[#DFB76C] mb-3 uppercase tracking-wider">انگشتر و دستبند</p>
                    <ul className="space-y-2.5 text-xs font-bold text-zinc-200">
                      <li><Link href="/products?gender=women&type=ring" className="hover:text-[#DFB76C] transition-colors" onClick={() => setActiveMenu(null)}>انگشتر طلا</Link></li>
                      <li><Link href="/products?gender=women&type=ring" className="hover:text-[#DFB76C] transition-colors" onClick={() => setActiveMenu(null)}>انگشتر نگین‌دار</Link></li>
                      <li><Link href="/products?gender=women&type=bracelet" className="hover:text-[#DFB76C] transition-colors" onClick={() => setActiveMenu(null)}>دستبند زنجیری</Link></li>
                      <li><Link href="/products?gender=women&type=bangle" className="hover:text-[#DFB76C] transition-colors" onClick={() => setActiveMenu(null)}>النگو و دستبند صلب</Link></li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#DFB76C] mb-3 uppercase tracking-wider">گردنبند و گوشواره</p>
                    <ul className="space-y-2.5 text-xs font-bold text-zinc-200">
                      <li><Link href="/products?gender=women&type=necklace" className="hover:text-[#DFB76C] transition-colors" onClick={() => setActiveMenu(null)}>گردنبند طلا زنانه</Link></li>
                      <li><Link href="/products?gender=women&type=pendant" className="hover:text-[#DFB76C] transition-colors" onClick={() => setActiveMenu(null)}>پلاک و آویز</Link></li>
                      <li><Link href="/products?gender=women&type=earring" className="hover:text-[#DFB76C] transition-colors" onClick={() => setActiveMenu(null)}>گوشواره میخی</Link></li>
                      <li><Link href="/products?gender=women&type=earring" className="hover:text-[#DFB76C] transition-colors" onClick={() => setActiveMenu(null)}>گوشواره حلقه‌ای</Link></li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#DFB76C] mb-3 uppercase tracking-wider">کالکشن‌های زنانه</p>
                    <ul className="space-y-2.5 text-xs font-bold text-zinc-200">
                      <li><Link href="/collections/nasima" className="hover:text-[#DFB76C] transition-colors" onClick={() => setActiveMenu(null)}>کالکشن نسیما</Link></li>
                      <li><Link href="/collections/delbar" className="hover:text-[#DFB76C] transition-colors" onClick={() => setActiveMenu(null)}>مینیمال دلبر</Link></li>
                      <li><Link href="/collections/arona" className="hover:text-[#DFB76C] transition-colors" onClick={() => setActiveMenu(null)}>سلطنتی آرونا</Link></li>
                    </ul>
                  </div>
                  <div className="bg-white/5 p-5 rounded-3xl border border-[#DFB76C]/30 backdrop-blur-md flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold text-[#DFB76C] uppercase">ویژه پرنا زر</span>
                      <h4 className="text-sm font-black text-white mt-1 font-heading">طراحی‌های دست‌ساز زنانه</h4>
                      <p className="text-xs text-zinc-300 mt-2 leading-relaxed">زیورآلات طلای ۱۸ عیار با امکان خرید اقساطی در ۳ قسط با قیمت روز</p>
                    </div>
                    <Link href="/products?gender=women" className="text-xs font-bold text-[#DFB76C] hover:underline mt-4 inline-block" onClick={() => setActiveMenu(null)}>مشاهده همه آثار زنانه ←</Link>
                  </div>
                </div>
              )}

              {activeMenu === "men" && (
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <p className="text-xs font-black text-[#DFB76C] mb-3 uppercase tracking-wider">آثار مردانه</p>
                    <ul className="space-y-2.5 text-xs font-bold text-zinc-200">
                      <li><Link href="/products?gender=men&type=ring" className="hover:text-[#DFB76C] transition-colors" onClick={() => setActiveMenu(null)}>انگشتر مردانه</Link></li>
                      <li><Link href="/products?gender=men&type=bracelet" className="hover:text-[#DFB76C] transition-colors" onClick={() => setActiveMenu(null)}>دستبند چرم و طلا</Link></li>
                      <li><Link href="/products?gender=men&type=chain" className="hover:text-[#DFB76C] transition-colors" onClick={() => setActiveMenu(null)}>زنجیر طلا</Link></li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#DFB76C] mb-3 uppercase tracking-wider">سبک طراحی</p>
                    <p className="text-xs text-zinc-300 leading-relaxed">استواریِ سرو؛ ترکیبی از صلابت و اصالت در قالب زیورآلات مردانه با طلای ۱۸ عیار و چرم طبیعی دست‌دوز.</p>
                  </div>
                  <div className="bg-white/5 p-5 rounded-3xl border border-[#DFB76C]/30 backdrop-blur-md flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold text-[#DFB76C] uppercase">مجموعه مردانه</span>
                      <h4 className="text-sm font-black text-white mt-1 font-heading">استواری و اصالت</h4>
                    </div>
                    <Link href="/products?gender=men" className="text-xs font-bold text-[#DFB76C] hover:underline mt-4 inline-block" onClick={() => setActiveMenu(null)}>مشاهده همه آثار مردانه ←</Link>
                  </div>
                </div>
              )}

              {activeMenu === "kids" && (
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <p className="text-xs font-black text-[#DFB76C] mb-3 uppercase tracking-wider">زیورآلات کودکانه</p>
                    <ul className="space-y-2.5 text-xs font-bold text-zinc-200">
                      <li><Link href="/products?gender=kids&type=bracelet" className="hover:text-[#DFB76C] transition-colors" onClick={() => setActiveMenu(null)}>دستبند نوزادی و کودک</Link></li>
                      <li><Link href="/products?gender=kids&type=pendant" className="hover:text-[#DFB76C] transition-colors" onClick={() => setActiveMenu(null)}>پلاک و مدال کودک</Link></li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#DFB76C] mb-3 uppercase tracking-wider">ایمنی و ظرافت</p>
                    <p className="text-xs text-zinc-300 leading-relaxed">طراحی شده با لبه‌های کاملاً نرم و استاندارد ضد حساسیت برای کودکان و نوزادان.</p>
                  </div>
                  <div className="bg-white/5 p-5 rounded-3xl border border-[#DFB76C]/30 backdrop-blur-md flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold text-[#DFB76C] uppercase">کودکانه</span>
                      <h4 className="text-sm font-black text-white mt-1 font-heading">لحظه‌های شیرین</h4>
                    </div>
                    <Link href="/products?gender=kids" className="text-xs font-bold text-[#DFB76C] hover:underline mt-4 inline-block" onClick={() => setActiveMenu(null)}>مشاهده آثار کودکانه ←</Link>
                  </div>
                </div>
              )}

              {/* کالکشن‌ها: نمایش ۵ مورد در یک ردیف */}
              {activeMenu === "collections" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <div>
                      <h4 className="text-base font-black text-white font-heading">کالکشن‌های اختصاصی پرنا زر</h4>
                      <p className="text-xs text-zinc-300 mt-0.5">مجموعه‌های داستانی و انحصاری با الهام از اصالت هنر زرگری ایران</p>
                    </div>
                    <Link 
                      href="/collections" 
                      className="inline-flex items-center gap-1.5 text-xs font-black text-[#DFB76C] hover:underline bg-[#DFB76C]/15 px-3.5 py-1.5 rounded-2xl border border-[#DFB76C]/30 backdrop-blur-md" 
                      onClick={() => setActiveMenu(null)}
                    >
                      <span>مشاهده همه کالکشن‌ها</span>
                      <span>←</span>
                    </Link>
                  </div>

                  <div className="grid grid-cols-5 gap-3.5">
                    {headerCollections.slice(0, 5).map((c) => (
                      <Link
                        key={c.id || c.slug}
                        href={`/collections/${c.slug}`}
                        onClick={() => setActiveMenu(null)}
                        className="group flex flex-col rounded-3xl border border-[#DFB76C]/25 bg-white/5 p-3 backdrop-blur-md min-w-0 hover:border-[#DFB76C]/60 transition-colors"
                      >
                        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-white/10 mb-2.5">
                          <img 
                            src={c.image || "/banner.webp"} 
                            alt={c.title} 
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/banner.webp";
                            }}
                          />
                        </div>
                        <span className="text-xs font-black text-white font-heading group-hover:text-[#DFB76C] transition-colors block truncate">
                          {c.title}
                        </span>
                        {c.subtitle && (
                          <p className="text-[10px] text-zinc-300 mt-0.5 truncate">
                            {c.subtitle}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* منوی موبایل */}
        {mobileMenuOpen && (
          <div className="absolute top-[115%] left-4 right-4 rounded-3xl border border-[#DFB76C]/40 p-5 bg-[#240308]/95 backdrop-blur-3xl shadow-[0_25px_60px_rgba(20,1,4,0.5)] lg:hidden pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-1.5 max-h-[75vh] overflow-y-auto">
              <Link href="/" className="px-4 py-2.5 text-[14px] font-bold rounded-2xl text-white hover:text-[#DFB76C] transition-colors" onClick={() => setMobileMenuOpen(false)}>صفحه اصلی</Link>
              <Link href="/products" className="px-4 py-2.5 text-[14px] font-bold rounded-2xl text-white hover:text-[#DFB76C] transition-colors" onClick={() => setMobileMenuOpen(false)}>محصولات</Link>
              <Link href="/products?gender=women" className="px-4 py-2.5 text-[14px] font-bold rounded-2xl text-white hover:text-[#DFB76C] transition-colors" onClick={() => setMobileMenuOpen(false)}>آثار زنانه</Link>
              <Link href="/products?gender=men" className="px-4 py-2.5 text-[14px] font-bold rounded-2xl text-white hover:text-[#DFB76C] transition-colors" onClick={() => setMobileMenuOpen(false)}>مردانه</Link>
              <Link href="/products?gender=kids" className="px-4 py-2.5 text-[14px] font-bold rounded-2xl text-white hover:text-[#DFB76C] transition-colors" onClick={() => setMobileMenuOpen(false)}>کودک</Link>
              <Link href="/collections" className="px-4 py-2.5 text-[14px] font-black rounded-2xl bg-[#DFB76C]/15 text-[#DFB76C]" onClick={() => setMobileMenuOpen(false)}>کالکشن‌های اختصاصی</Link>
              <Link href="/story" className="px-4 py-2.5 text-[14px] font-bold rounded-2xl text-white hover:text-[#DFB76C] transition-colors" onClick={() => setMobileMenuOpen(false)}>سرای زر</Link>
              <Link href="/contact" className="px-4 py-2.5 text-[14px] font-bold rounded-2xl text-white hover:text-[#DFB76C] transition-colors" onClick={() => setMobileMenuOpen(false)}>ارتباط با ما</Link>
              
              <div className="mt-2 border-t border-white/10 pt-3">
                {isAuthenticated ? (
                  <>
                    <Link href="/account" className="flex items-center gap-3 px-4 py-2.5 text-[14px] font-bold rounded-2xl text-white hover:text-[#DFB76C] transition-colors" onClick={() => setMobileMenuOpen(false)}>
                      <User size={18} /> حساب کاربری
                    </Link>
                    <button 
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setShowLogoutConfirm(true);
                      }} 
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-right text-[14px] font-bold rounded-2xl text-red-400 hover:opacity-80 transition-opacity"
                    >
                      <LogOut size={18} /> خروج از حساب
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="flex items-center justify-center gap-2 mt-1 px-4 py-3 text-[14px] font-bold rounded-2xl bg-[#DFB76C] text-[#240308] shadow-md hover:bg-[#F2CD86] transition-colors" onClick={() => setMobileMenuOpen(false)}>
                     ورود به حساب کاربری
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* مودال خروج */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div 
            dir="rtl" 
            className="w-full max-w-sm rounded-3xl bg-[#240308]/95 backdrop-blur-2xl p-6 shadow-2xl border border-[#DFB76C]/40 animate-in zoom-in-95 duration-200 text-center"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DFB76C]/15 text-[#DFB76C]">
              <AlertTriangle size={28} />
            </div>

            <h3 className="text-lg font-black text-white font-heading mb-2">
              خروج از حساب کاربری
            </h3>

            <p className="text-xs text-zinc-300 leading-relaxed mb-6 font-medium">
              آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-zinc-200 bg-white/10 hover:bg-white/15 transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold text-white bg-[#8B142D] hover:bg-[#6B0F22] transition-colors shadow-sm"
              >
                {isLoggingOut ? "در حال خروج..." : "بله، خارج شو"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}