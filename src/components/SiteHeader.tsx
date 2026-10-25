"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { LayoutDashboard, LogOut, Menu, Package, Settings, ShieldCheck, ShoppingBag, Trash2, User, X, ChevronDown } from "lucide-react";
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
   CYPRESS (SARV) ICON COMPONENT
========================================================= */
const SarvIcon = () => (
  <svg width="20" height="22" viewBox="0 0 24 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#8B263E] transition-transform duration-300 group-hover:scale-110">
    <path d="M12 1L3 9C3 14 7 19 12 24C17 19 21 14 21 9L12 1Z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M12 7V22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M9 24H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

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
            setLastUpdate(now.toLocaleTimeString("fa-IR", {hour: '2-digit', minute:'2-digit'}));
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
    <div className="bg-[#1C3324] text-[#FFFFFF] py-2 px-6 text-sm font-medium tracking-wide flex justify-between md:justify-center items-center gap-3 md:gap-8 border-b border-[#1C3324]/20 w-full pointer-events-auto shadow-sm">
      <span className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full animate-pulse ${changeDir === 'up' ? 'bg-green-400' : changeDir === 'down' ? 'bg-red-400' : 'bg-[#8B263E]'}`}></span> 
        قیمت لحظه‌ای طلای ۱۸ عیار:
      </span>
      <span className="font-bold tabular-nums text-[#D8B65C] text-sm">
        {goldPrice} <span className="font-normal text-xs opacity-80">تومان</span>
      </span>
      <span className="hidden md:inline-block opacity-50">|</span>
      <span className="hidden md:inline-block opacity-80 text-xs">آخرین بروزرسانی: {lastUpdate || "همین الان"}</span>
    </div>
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */
export default function SiteHeader({ user: initialUser = null }: SiteHeaderProps) {
  const router = useRouter();
  const { items, totalItems, removeItem, totalPrice } = useCart();
  const [currentUser, setCurrentUser] = useState<HeaderUser | null>(initialUser);
  const [isMounted, setIsMounted] = useState(false);
  const [isCartHovered, setIsCartHovered] = useState(false);
  const [isUserHovered, setIsUserHovered] = useState(false);
  
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // تایمر برای ایجاد تاخیر نامحسوس در بسته شدن منو جهت حرکت نرم ماوس
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    <div dir="rtl" className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none">
      {/* نوار قیمت لحظه‌ای */}
      <LiveGoldTicker />

      {/* کپسول اصلی هدر */}
      <header 
        className="pointer-events-auto w-[calc(100%-2rem)] max-w-[1400px] flex items-center justify-between px-5 lg:px-7 py-3 rounded-full bg-[#FAF9F6]/95 backdrop-blur-xl border border-[#1C3324]/15 shadow-[0_10px_35px_rgba(28,51,36,0.06)] transition-all mt-3 mx-4"
        onMouseLeave={handleMenuLeave}
      >
        
        {/* لوگو */}
        <Link href="/" className="group flex shrink-0 items-center justify-center gap-2.5" onClick={() => setMobileMenuOpen(false)}>
          <SarvIcon />
          <div className="flex flex-col text-right">
            <span className="text-[1.2rem] lg:text-[1.35rem] font-extrabold tracking-tight text-[#1C3324] group-hover:text-[#8B263E] transition-colors font-heading whitespace-nowrap leading-tight">
              پرنا زر
            </span>
            <span className="text-[9.5px] font-bold text-[#8B263E] tracking-tight -mt-0.5 whitespace-nowrap hidden sm:inline font-sans">
              مثل زر بدرخش
            </span>
          </div>
        </Link>

        {/* منوی دسکتاپ */}
        <nav className="hidden lg:flex flex-1 items-center justify-center gap-1 xl:gap-3 px-2">
          
          <Link 
            href="/" 
            onMouseEnter={handleMenuLeave}
            className="px-2.5 py-1.5 text-[13.5px] xl:text-[14.5px] font-bold text-[#1C3324] hover:text-[#8B263E] transition-colors whitespace-nowrap rounded-lg hover:bg-black/5"
          >
            خانه
          </Link>

          <Link 
            href="/products" 
            onMouseEnter={handleMenuLeave}
            className="px-2.5 py-1.5 text-[13.5px] xl:text-[14.5px] font-bold text-[#1C3324] hover:text-[#8B263E] transition-colors whitespace-nowrap rounded-lg hover:bg-black/5"
          >
            محصولات
          </Link>

          {/* آثار زنانه */}
          <div className="relative py-1" onMouseEnter={() => handleMenuEnter("women")}>
            <Link href="/products?gender=women" className="px-2.5 py-1.5 text-[13.5px] xl:text-[14.5px] font-bold text-[#1C3324] hover:text-[#8B263E] transition-colors flex items-center gap-1 whitespace-nowrap rounded-lg hover:bg-black/5">
              زنانه <ChevronDown size={13} className={`opacity-60 transition-transform duration-200 ${activeMenu === "women" ? "rotate-180 text-[#8B263E]" : ""}`} />
            </Link>
          </div>

          {/* مردانه */}
          <div className="relative py-1" onMouseEnter={() => handleMenuEnter("men")}>
            <Link href="/products?gender=men" className="px-2.5 py-1.5 text-[13.5px] xl:text-[14.5px] font-bold text-[#1C3324] hover:text-[#8B263E] transition-colors flex items-center gap-1 whitespace-nowrap rounded-lg hover:bg-black/5">
              مردانه <ChevronDown size={13} className={`opacity-60 transition-transform duration-200 ${activeMenu === "men" ? "rotate-180 text-[#8B263E]" : ""}`} />
            </Link>
          </div>

          {/* کودک */}
          <div className="relative py-1" onMouseEnter={() => handleMenuEnter("kids")}>
            <Link href="/products?gender=kids" className="px-2.5 py-1.5 text-[13.5px] xl:text-[14.5px] font-bold text-[#1C3324] hover:text-[#8B263E] transition-colors flex items-center gap-1 whitespace-nowrap rounded-lg hover:bg-black/5">
              کودک <ChevronDown size={13} className={`opacity-60 transition-transform duration-200 ${activeMenu === "kids" ? "rotate-180 text-[#8B263E]" : ""}`} />
            </Link>
          </div>

          {/* کالکشن‌ها */}
          <div className="relative py-1" onMouseEnter={() => handleMenuEnter("collections")}>
            <Link href="/collections" className="px-2.5 py-1.5 text-[13.5px] xl:text-[14.5px] font-extrabold text-[#8B263E] hover:text-[#1C3324] transition-colors flex items-center gap-1 whitespace-nowrap rounded-lg hover:bg-[#8B263E]/5">
              کالکشن‌ها <ChevronDown size={13} className={`opacity-60 transition-transform duration-200 ${activeMenu === "collections" ? "rotate-180 text-[#1C3324]" : ""}`} />
            </Link>
          </div>

          <Link href="/story" className="px-2.5 py-1.5 text-[13.5px] xl:text-[14.5px] font-bold text-[#1C3324] hover:text-[#8B263E] transition-colors whitespace-nowrap rounded-lg hover:bg-black/5" onMouseEnter={handleMenuLeave}>
            سرای زر
          </Link>

          <Link href="/contact" className="px-2.5 py-1.5 text-[13.5px] xl:text-[14.5px] font-bold text-[#1C3324] hover:text-[#8B263E] transition-colors whitespace-nowrap rounded-lg hover:bg-black/5" onMouseEnter={handleMenuLeave}>
            ارتباط با ما
          </Link>
        </nav>

        {/* اکشن‌های سمت چپ */}
        <div className="hidden lg:flex shrink-0 items-center justify-end gap-2.5" onMouseEnter={handleMenuLeave}>
          {isAuthenticated && isAdmin && (
            <Link href="/dashboard" className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold transition bg-[#8B263E]/10 text-[#8B263E] hover:bg-[#8B263E]/20 whitespace-nowrap">
              <LayoutDashboard size={15} /> پنل
            </Link>
          )}

          {/* منوی کاربر */}
          <div className="relative" onMouseEnter={() => { setIsUserHovered(true); handleMenuLeave(); }} onMouseLeave={() => setIsUserHovered(false)}>
            <Link href={primaryAccountHref} className="text-[14px] font-bold text-[#1C3324] hover:text-[#8B263E] transition-colors flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-black/5 whitespace-nowrap">
              <User size={18} />
              <span>{isAuthenticated ? displayName.split(' ')[0] : 'ورود'}</span>
            </Link>

            <div className={`absolute left-0 mt-2 w-72 overflow-hidden rounded-2xl shadow-xl transition-all duration-300 bg-white border border-[#1C3324]/15 ${isUserHovered ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"}`}>
              <div className="border-b border-[#1C3324]/10 px-5 py-4 bg-[#FAF9F6]">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${isAdmin ? 'bg-[#1C3324] text-white' : 'bg-[#8B263E]/15 text-[#8B263E]'}`}>
                    {isAdmin ? <ShieldCheck size={20} /> : <User size={20} />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-[#1C3324]">{displayName}</p>
                    {displayContact && <p dir="ltr" className="mt-0.5 text-[13px] text-[#3A5A46]">{displayContact}</p>}
                  </div>
                </div>
              </div>

              <div className="p-2">
                {isAuthenticated ? (
                  <>
                    <Link href="/account/orders" className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-[13.5px] font-bold text-[#1C3324] transition hover:bg-[#FAF9F6]" onClick={() => setIsUserHovered(false)}>
                      <Package size={17} className="text-[#3A5A46]" /> سفارش‌های من
                    </Link>
                    <Link href="/account/edit" className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-[13.5px] font-bold text-[#1C3324] transition hover:bg-[#FAF9F6]" onClick={() => setIsUserHovered(false)}>
                      <Settings size={17} className="text-[#3A5A46]" /> تغییر اطلاعات
                    </Link>
                    <div className="my-1 border-t border-[#1C3324]/10" />
                    <button onClick={handleLogout} disabled={isLoggingOut} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-right text-[13.5px] font-bold text-red-600 transition hover:bg-red-50">
                      <LogOut size={17} /> {isLoggingOut ? "در حال خروج..." : "خروج از حساب"}
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1C3324] text-white px-4 py-2.5 text-[13.5px] font-bold transition hover:bg-[#8B263E]" onClick={() => setIsUserHovered(false)}>
                     ورود به حساب کاربری
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* سبد خرید */}
          <div className="relative" onMouseEnter={() => { setIsCartHovered(true); handleMenuLeave(); }} onMouseLeave={() => setIsCartHovered(false)}>
            <Link href="/cart" className="relative flex items-center justify-center rounded-full p-2.5 bg-[#1C3324] text-white hover:scale-105 transition-all shadow-md">
              <ShoppingBag size={18} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-black bg-[#8B263E] text-white border-2 border-white">
                  {totalItems}
                </span>
              )}
            </Link>

            <div className={`absolute left-0 z-50 mt-2 w-88 overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 bg-white border border-[#1C3324]/15 ${isCartHovered ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"}`}>
              {cartItems.length === 0 ? (
                <div className="py-12 text-center text-[14px] text-[#3A5A46] font-bold">سبد خرید شما خالی است.</div>
              ) : (
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
                    {cartItems.map((item) => {
                      const product = item.product;
                      const imageUrl = getProductImageUrl(product);
                      const productTitle = product.title || product.name || "محصول";
                      return (
                        <div key={item.id} className="flex items-center gap-3">
                          {imageUrl ? (
                            <img src={imageUrl} alt={productTitle} className="h-14 w-14 shrink-0 rounded-xl object-cover bg-[#FAF9F6] border border-[#1C3324]/10" />
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#F4F6F4] text-[#1C3324]"><ShoppingBag size={20} /></div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="line-clamp-1 text-[13px] font-bold text-[#1C3324] mb-1">{productTitle}</p>
                            <span className="text-[12px] text-[#3A5A46] bg-[#FAF9F6] px-2.5 py-0.5 rounded-md font-medium">تعداد: {formatNumber(item.quantity)}</span>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="p-1.5 text-[#3A5A46] hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-[#1C3324]/10 mt-2 pt-3">
                    <div className="mb-3 flex items-center justify-between px-1">
                      <span className="text-[13px] font-bold text-[#3A5A46]">جمع کل:</span>
                      <span className="text-[15px] font-black text-[#1C3324]">{formatNumber(totalPrice)} تومان</span>
                    </div>
                    <Link href="/cart" className="block w-full rounded-full py-2.5 text-center text-[13.5px] font-bold transition hover:opacity-90 bg-[#1C3324] text-white shadow-md" onClick={() => setIsCartHovered(false)}>
                      مشاهده سبد خرید
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* دکمه منوی موبایل و تبلت */}
        <div className="flex lg:hidden items-center gap-3">
          <Link href="/cart" className="relative p-2 text-[#1C3324]">
            <ShoppingBag size={22} />
            {totalItems > 0 && <span className="absolute top-0 right-0 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-bold bg-[#8B263E] text-white">{totalItems}</span>}
          </Link>
          <button className="p-1.5 text-[#1C3324]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* مگامنو دسکتاپ به همراه پل ارتباطی نامرئی جهت حفظ فوکوس ماوس */}
      {activeMenu && (
        <div 
          className="pointer-events-auto w-[calc(100%-2rem)] max-w-[1400px] mx-4 pt-2 z-50 hidden lg:block"
          onMouseEnter={() => handleMenuEnter(activeMenu)}
          onMouseLeave={handleMenuLeave}
        >
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-[#1C3324]/15 p-7 animate-in fade-in slide-in-from-top-2 duration-150 text-right">
            {activeMenu === "women" && (
              <div className="grid grid-cols-4 gap-8">
                <div>
                  <h5 className="text-xs font-black text-[#8B263E] mb-3 uppercase tracking-wider">انگشتر و دستبند</h5>
                  <ul className="space-y-2.5 text-xs font-bold text-[#1C3324]">
                    <li><Link href="/products?gender=women&type=ring" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>انگشتر طلا</Link></li>
                    <li><Link href="/products?gender=women&type=ring" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>انگشتر نگین‌دار</Link></li>
                    <li><Link href="/products?gender=women&type=bracelet" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>دستبند زنجیری</Link></li>
                    <li><Link href="/products?gender=women&type=bangle" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>النگو و دستبند صلب</Link></li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-xs font-black text-[#8B263E] mb-3 uppercase tracking-wider">گردنبند و گوشواره</h5>
                  <ul className="space-y-2.5 text-xs font-bold text-[#1C3324]">
                    <li><Link href="/products?gender=women&type=necklace" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>گردنبند طلا زنانه</Link></li>
                    <li><Link href="/products?gender=women&type=pendant" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>پلاک و آویز</Link></li>
                    <li><Link href="/products?gender=women&type=earring" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>گوشواره میخی</Link></li>
                    <li><Link href="/products?gender=women&type=earring" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>گوشواره حلقه‌ای</Link></li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-xs font-black text-[#8B263E] mb-3 uppercase tracking-wider">کالکشن‌های زنانه</h5>
                  <ul className="space-y-2.5 text-xs font-bold text-[#1C3324]">
                    <li><Link href="/collections/nasima" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>کالکشن نسیما</Link></li>
                    <li><Link href="/collections/delbar" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>مینیمال دلبر</Link></li>
                    <li><Link href="/collections/arona" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>سلطنتی آرونا</Link></li>
                  </ul>
                </div>
                <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#1C3324]/10 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-[#8B263E] uppercase">ویژه پرنا زر</span>
                    <h4 className="text-sm font-black text-[#1C3324] mt-1 font-heading">طراحی‌های دست‌ساز زنانه</h4>
                    <p className="text-xs text-[#3A5A46] mt-2 leading-relaxed">زیورآلات طلای ۱۸ عیار با امکان خرید اقساطی در ۳ قسط با قیمت روز</p>
                  </div>
                  <Link href="/products?gender=women" className="text-xs font-bold text-[#8B263E] hover:underline mt-4 inline-block" onClick={() => setActiveMenu(null)}>مشاهده همه آثار زنانه ←</Link>
                </div>
              </div>
            )}

            {activeMenu === "men" && (
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <h5 className="text-xs font-black text-[#8B263E] mb-3 uppercase tracking-wider">آثار مردانه</h5>
                  <ul className="space-y-2.5 text-xs font-bold text-[#1C3324]">
                    <li><Link href="/products?gender=men&type=ring" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>انگشتر مردانه</Link></li>
                    <li><Link href="/products?gender=men&type=bracelet" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>دستبند چرم و طلا</Link></li>
                    <li><Link href="/products?gender=men&type=chain" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>زنجیر طلا</Link></li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-xs font-black text-[#8B263E] mb-3 uppercase tracking-wider">سبک طراحی</h5>
                  <p className="text-xs text-[#3A5A46] leading-relaxed">استواریِ سرو؛ ترکیبی از صلابت و اصالت در قالب زیورآلات مردانه با طلای ۱۸ عیار و چرم طبیعی دست‌دوز.</p>
                </div>
                <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#1C3324]/10 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-[#8B263E] uppercase">مجموعه مردانه</span>
                    <h4 className="text-sm font-black text-[#1C3324] mt-1 font-heading">استواری و اصالت</h4>
                  </div>
                  <Link href="/products?gender=men" className="text-xs font-bold text-[#8B263E] hover:underline mt-4 inline-block" onClick={() => setActiveMenu(null)}>مشاهده همه آثار مردانه ←</Link>
                </div>
              </div>
            )}

            {activeMenu === "kids" && (
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <h5 className="text-xs font-black text-[#8B263E] mb-3 uppercase tracking-wider">زیورآلات کودکانه</h5>
                  <ul className="space-y-2.5 text-xs font-bold text-[#1C3324]">
                    <li><Link href="/products?gender=kids&type=bracelet" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>دستبند نوزادی و کودک</Link></li>
                    <li><Link href="/products?gender=kids&type=pendant" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>پلاک و مدال کودک</Link></li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-xs font-black text-[#8B263E] mb-3 uppercase tracking-wider">ایمنی و ظرافت</h5>
                  <p className="text-xs text-[#3A5A46] leading-relaxed">طراحی شده با لبه‌های کاملاً نرم و استاندارد ضد حساسیت برای کودکان و نوزادان.</p>
                </div>
                <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#1C3324]/10 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-[#8B263E] uppercase">کودکانه</span>
                    <h4 className="text-sm font-black text-[#1C3324] mt-1 font-heading">لحظه‌های شیرین</h4>
                  </div>
                  <Link href="/products?gender=kids" className="text-xs font-bold text-[#8B263E] hover:underline mt-4 inline-block" onClick={() => setActiveMenu(null)}>مشاهده آثار کودکانه ←</Link>
                </div>
              </div>
            )}

            {activeMenu === "collections" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-[#1C3324]/10 pb-4">
                  <div>
                    <h4 className="text-base font-black text-[#1C3324] font-heading">کالکشن‌های اختصاصی پرنا زر</h4>
                    <p className="text-xs text-[#3A5A46] mt-0.5">مجموعه‌های داستانی و انحصاری با الهام از اصالت هنر زرگری ایران</p>
                  </div>
                  <Link 
                    href="/collections" 
                    className="inline-flex items-center gap-1.5 text-xs font-black text-[#8B263E] hover:underline bg-[#8B263E]/10 px-3.5 py-1.5 rounded-xl border border-[#8B263E]/20" 
                    onClick={() => setActiveMenu(null)}
                  >
                    <span>مشاهده همه کالکشن‌ها به صورت کارت</span>
                    <span>←</span>
                  </Link>
                </div>

                <div className="grid grid-cols-5 gap-4">
                  {[
                    { slug: "nasima", title: "کالکشن نسیما", subtitle: "لطافت باد و انحناهای طلایی", image: "/banner.webp" },
                    { slug: "sahra", title: "کالکشن صحرا", subtitle: "گرما و وسعت بیکران افق", image: "/header.webp" },
                    { slug: "delbar", title: "کالکشن دلبر", subtitle: "عناوین ظریف و مینیمال", image: "/gold.webp" },
                    { slug: "arona", title: "کالکشن آرونا", subtitle: "شکوه سنگ‌های اصیل", image: "/banner.webp" },
                    { slug: "sarv", title: "کالکشن سرو", subtitle: "نماد استواری و جاودانگی", image: "/header.webp" },
                  ].map((c) => (
                    <Link
                      key={c.slug}
                      href={`/collections/${c.slug}`}
                      onClick={() => setActiveMenu(null)}
                      className="group flex flex-col rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-3 transition hover:border-[#8B263E]/40 hover:shadow-md"
                    >
                      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-white mb-2.5">
                        <img src={c.image} alt={c.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108" />
                      </div>
                      <h5 className="text-xs font-black text-[#1C3324] font-heading group-hover:text-[#8B263E] transition-colors">{c.title}</h5>
                      <p className="text-[10px] text-[#3A5A46] mt-0.5 line-clamp-1">{c.subtitle}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* منوی موبایل و تبلت */}
      {mobileMenuOpen && (
        <div className="absolute top-[115%] left-4 right-4 rounded-2xl border border-[#1C3324]/15 p-6 bg-white shadow-2xl lg:hidden pointer-events-auto">
          <div className="flex flex-col gap-2 max-h-[75vh] overflow-y-auto">
            <Link href="/" className="px-4 py-3 text-[14.5px] font-bold rounded-xl hover:bg-[#FAF9F6] text-[#1C3324]" onClick={() => setMobileMenuOpen(false)}>صفحه اصلی</Link>
            <Link href="/products" className="px-4 py-3 text-[14.5px] font-bold rounded-xl hover:bg-[#FAF9F6] text-[#1C3324]" onClick={() => setMobileMenuOpen(false)}>محصولات</Link>
            <Link href="/products?gender=women" className="px-4 py-3 text-[14.5px] font-bold rounded-xl hover:bg-[#FAF9F6] text-[#1C3324]" onClick={() => setMobileMenuOpen(false)}>آثار زنانه</Link>
            <Link href="/products?gender=men" className="px-4 py-3 text-[14.5px] font-bold rounded-xl hover:bg-[#FAF9F6] text-[#1C3324]" onClick={() => setMobileMenuOpen(false)}>مردانه</Link>
            <Link href="/products?gender=kids" className="px-4 py-3 text-[14.5px] font-bold rounded-xl hover:bg-[#FAF9F6] text-[#1C3324]" onClick={() => setMobileMenuOpen(false)}>کودک</Link>
            <Link href="/collections" className="px-4 py-3 text-[14.5px] font-black rounded-xl hover:bg-[#8B263E]/10 text-[#8B263E]" onClick={() => setMobileMenuOpen(false)}>کالکشن‌های اختصاصی</Link>
            <Link href="/story" className="px-4 py-3 text-[14.5px] font-bold rounded-xl hover:bg-[#FAF9F6] text-[#1C3324]" onClick={() => setMobileMenuOpen(false)}>سرای زر</Link>
            <Link href="/contact" className="px-4 py-3 text-[14.5px] font-bold rounded-xl hover:bg-[#FAF9F6] text-[#1C3324]" onClick={() => setMobileMenuOpen(false)}>ارتباط با ما</Link>
            
            <div className="mt-2 border-t border-[#1C3324]/10 pt-4">
              {isAuthenticated ? (
                <>
                  <Link href="/account" className="flex items-center gap-3.5 px-4 py-3 text-[14.5px] font-bold rounded-xl hover:bg-[#FAF9F6] text-[#1C3324]" onClick={() => setMobileMenuOpen(false)}>
                    <User size={19} /> حساب کاربری
                  </Link>
                  <button onClick={handleLogout} className="flex w-full items-center gap-3.5 px-4 py-3 text-right text-[14.5px] font-bold rounded-xl hover:bg-red-50 text-red-600">
                    <LogOut size={19} /> خروج از حساب
                  </button>
                </>
              ) : (
                <Link href="/login" className="flex items-center justify-center gap-2 mt-1 px-4 py-3.5 text-[14.5px] font-bold rounded-xl bg-[#1C3324] text-white shadow-md" onClick={() => setMobileMenuOpen(false)}>
                   ورود به حساب کاربری
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}