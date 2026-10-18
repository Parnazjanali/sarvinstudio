"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
    <div className="bg-[#1C3324] text-[#FFFFFF] py-2 px-6 text-sm font-medium tracking-wide flex justify-between md:justify-center items-center gap-3 md:gap-8 border-b border-[#1C3324]/20 w-full pointer-events-auto shadow-sm font-vazir">
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
  
  // مدیریت منوی فعال
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const syncUser = () => setCurrentUser(getUserFromAuthStore() || initialUser || null);
    syncUser();
    setIsMounted(true);
    const unsubscribe = pb.authStore.onChange(syncUser);
    return () => unsubscribe();
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
    <div dir="rtl" className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none font-vazir" onMouseLeave={() => setActiveMenu(null)}>
      {/* ۱. نوار قیمت طلا */}
      <LiveGoldTicker />

      {/* ۲. کپسول شیشه‌ای هدر اصلی با استایل تمیز و روان */}
      <header className="pointer-events-auto w-full max-w-[1400px] flex items-center justify-between gap-6 px-8 py-4 rounded-full bg-[#FAF9F6]/95 backdrop-blur-xl border border-[#1C3324]/15 shadow-[0_12px_40px_rgba(28,51,36,0.08)] transition-all mt-3 mx-4">
        
        {/* ================= LOGO (Far Right) با آیکون سرو کوچک ================= */}
        <Link href="/" className="group flex shrink-0 items-center justify-center gap-2.5 pl-4" onClick={() => setMobileMenuOpen(false)}>
          <SarvIcon />
          <div className="text-[1.5rem] font-extrabold tracking-wide text-[#1C3324] group-hover:text-[#8B263E] transition-colors">استودیو سروین</div>
        </Link>

        {/* ================= DESKTOP NAV ================= */}
        <nav className="hidden xl:flex flex-1 gap-6 text-[15px] font-bold items-center justify-center">
          <Link href="/" className="relative text-[#1C3324] hover:text-[#8B263E] transition-colors tracking-wide whitespace-nowrap py-1 group">
            صفحه اصلی
            <span className="absolute bottom-0 right-0 w-0 h-[2px] bg-[#8B263E] transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link href="/products" className="relative text-[#1C3324] hover:text-[#8B263E] transition-colors tracking-wide whitespace-nowrap py-1 group">
            محصولات
            <span className="absolute bottom-0 right-0 w-0 h-[2px] bg-[#8B263E] transition-all duration-300 group-hover:w-full"></span>
          </Link>

          {/* زنانه */}
          <div className="relative py-2" onMouseEnter={() => setActiveMenu("women")}>
            <Link href="/products?category=women" className="relative text-[#1C3324] hover:text-[#8B263E] transition-colors tracking-wide flex items-center gap-1 whitespace-nowrap py-1 group">
              زنانه <ChevronDown size={14} className="opacity-70" />
              <span className="absolute bottom-0 right-0 w-0 h-[2px] bg-[#8B263E] transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </div>

          {/* مردانه */}
          <div className="relative py-2" onMouseEnter={() => setActiveMenu("men")}>
            <Link href="/products?category=men" className="relative text-[#1C3324] hover:text-[#8B263E] transition-colors tracking-wide flex items-center gap-1 whitespace-nowrap py-1 group">
              مردانه <ChevronDown size={14} className="opacity-70" />
              <span className="absolute bottom-0 right-0 w-0 h-[2px] bg-[#8B263E] transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </div>

          {/* کودک */}
          <div className="relative py-2" onMouseEnter={() => setActiveMenu("kids")}>
            <Link href="/products?category=kids" className="relative text-[#1C3324] hover:text-[#8B263E] transition-colors tracking-wide flex items-center gap-1 whitespace-nowrap py-1 group">
              کودک <ChevronDown size={14} className="opacity-70" />
              <span className="absolute bottom-0 right-0 w-0 h-[2px] bg-[#8B263E] transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </div>

          {/* سرای سرو */}
          <div className="relative py-2" onMouseEnter={() => setActiveMenu("world")}>
            <Link href="/story" className="relative text-[#8B263E] font-black hover:text-[#1C3324] transition-colors tracking-wide whitespace-nowrap flex items-center gap-1 py-1 group">
              سرای سرو <ChevronDown size={14} className="opacity-70" />
              <span className="absolute bottom-0 right-0 w-0 h-[2px] bg-[#1C3324] transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </div>

          <Link href="/contact" className="relative text-[#1C3324] hover:text-[#8B263E] transition-colors tracking-wide whitespace-nowrap py-1 group" onMouseEnter={() => setActiveMenu(null)}>
            ارتباط با ما
            <span className="absolute bottom-0 right-0 w-0 h-[2px] bg-[#8B263E] transition-all duration-300 group-hover:w-full"></span>
          </Link>
        </nav>

        {/* منوی نمایشی برای لپ‌تاپ‌های متوسط */}
        <nav className="hidden md:flex xl:hidden flex-1 gap-3 text-[13px] font-bold items-center justify-center flex-wrap">
          <Link href="/" className="text-[#1C3324]">خانه</Link>
          <Link href="/products" className="text-[#1C3324]">محصولات</Link>
          <Link href="/products?category=women" className="text-[#1C3324]">زنانه</Link>
          <Link href="/products?category=men" className="text-[#1C3324]">مردانه</Link>
          <Link href="/story" className="text-[#8B263E]">سرای سرو</Link>
          <Link href="/contact" className="text-[#1C3324]">ارتباط</Link>
        </nav>

        {/* ================= DESKTOP ACTIONS (Left Side) ================= */}
        <div className="hidden shrink-0 items-center justify-end gap-4 md:flex pr-4" onMouseEnter={() => setActiveMenu(null)}>
          {isAuthenticated && isAdmin && (
            <Link href="/dashboard" className="hidden lg:flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-bold transition hover:opacity-90 bg-[#8B263E]/15 text-[#8B263E] hover:bg-[#8B263E]/25 whitespace-nowrap">
              <LayoutDashboard size={17} /> پنل مدیریت
            </Link>
          )}

          {/* User Dropdown */}
          <div className="relative py-2" onMouseEnter={() => { setIsUserHovered(true); setActiveMenu(null); }} onMouseLeave={() => setIsUserHovered(false)}>
            <Link href={primaryAccountHref} className="text-[15px] font-bold text-[#1C3324] hover:text-[#8B263E] transition-colors flex items-center gap-2 px-3 py-1.5 whitespace-nowrap">
              {isAuthenticated ? displayName.split(' ')[0] : 'ورود'} <User size={20} />
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

              <div className="p-2.5">
                {isAuthenticated && (
                  <>
                    <Link href="/account/orders" className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-bold text-[#1C3324] transition hover:bg-[#FAF9F6]" onClick={() => setIsUserHovered(false)}>
                      <Package size={18} className="text-[#3A5A46]" /> سفارش‌های من
                    </Link>
                    <Link href="/account/edit" className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-bold text-[#1C3324] transition hover:bg-[#FAF9F6]" onClick={() => setIsUserHovered(false)}>
                      <Settings size={18} className="text-[#3A5A46]" /> تغییر اطلاعات
                    </Link>
                    <div className="my-1.5 border-t border-[#1C3324]/10" />
                    <button onClick={handleLogout} disabled={isLoggingOut} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-[14px] font-bold text-red-600 transition hover:bg-red-50">
                      <LogOut size={18} /> {isLoggingOut ? "در حال خروج..." : "خروج از حساب"}
                    </button>
                  </>
                )}
                {!isAuthenticated && (
                  <Link href="/login" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1C3324] text-white px-4 py-3 text-[14px] font-bold transition hover:bg-[#8B263E]" onClick={() => setIsUserHovered(false)}>
                     ورود به حساب کاربری
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Cart Dropdown */}
          <div className="relative py-2" onMouseEnter={() => { setIsCartHovered(true); setActiveMenu(null); }} onMouseLeave={() => setIsCartHovered(false)}>
            <Link href="/cart" className="relative flex items-center gap-2.5 rounded-full px-5 py-3 text-[15px] font-bold bg-[#1C3324] text-white hover:scale-105 transition-transform duration-300 shadow-md">
              <ShoppingBag size={20} />
              {totalItems > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold bg-[#8B263E] text-white border-2 border-[#FAF9F6]">{totalItems}</span>}
            </Link>

            <div className={`absolute left-0 z-50 mt-2 w-96 overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 bg-white border border-[#1C3324]/15 ${isCartHovered ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"}`}>
              {cartItems.length === 0 ? (
                <div className="py-14 text-center text-[15px] text-[#3A5A46] font-bold">سبد خرید شما خالی است.</div>
              ) : (
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
                    {cartItems.map((item) => {
                      const product = item.product;
                      const imageUrl = getProductImageUrl(product);
                      const productTitle = product.title || product.name || "محصول";
                      return (
                        <div key={item.id} className="flex items-center gap-3">
                          {imageUrl ? (
                            <img src={imageUrl} alt={productTitle} className="h-16 w-16 shrink-0 rounded-xl object-cover bg-[#FAF9F6] border border-[#1C3324]/10" />
                          ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#F4F6F4] text-[#1C3324]"><ShoppingBag size={22} /></div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="line-clamp-1 text-[14px] font-bold text-[#1C3324] mb-1">{productTitle}</p>
                            <span className="text-[13px] text-[#3A5A46] bg-[#FAF9F6] px-3 py-1 rounded-md font-medium">تعداد: {formatNumber(item.quantity)}</span>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="p-2 text-[#3A5A46] hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-[#1C3324]/10 mt-3 pt-4">
                    <div className="mb-4 flex items-center justify-between px-1">
                      <span className="text-[14px] font-bold text-[#3A5A46]">جمع کل:</span>
                      <span className="text-[17px] font-black text-[#1C3324]">{formatNumber(totalPrice)} تومان</span>
                    </div>
                    <Link href="/cart" className="block w-full rounded-full py-3.5 text-center text-[15px] font-bold transition hover:opacity-90 bg-[#1C3324] text-white shadow-lg" onClick={() => setIsCartHovered(false)}>
                      مشاهده سبد خرید
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= MOBILE MENU BUTTON ================= */}
        <div className="flex md:hidden items-center gap-3">
          <Link href="/cart" className="relative text-[#1C3324]">
            <ShoppingBag size={24} />
            {totalItems > 0 && <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[11px] font-bold bg-[#8B263E] text-white">{totalItems}</span>}
          </Link>
          <button className="text-[#1C3324]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </header>

      {/* ================= MEGA MENU BLUR PANEL ================= */}
      {activeMenu && (
        <div 
          className="pointer-events-auto w-full max-w-[1400px] mx-4 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-[#1C3324]/15 p-8 mt-2 animate-in fade-in slide-in-from-top-3 duration-200 text-right z-50"
          onMouseEnter={() => setActiveMenu(activeMenu)}
          onMouseLeave={() => setActiveMenu(null)}
        >
          {activeMenu === "women" && (
            <div className="grid grid-cols-4 gap-8">
              <div>
                <h5 className="text-xs font-black text-[#8B263E] mb-3 uppercase tracking-wider">انگشتر و دستبند</h5>
                <ul className="space-y-2.5 text-xs font-bold text-[#1C3324]">
                  <li><Link href="/products?category=women&type=ring" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>انگشتر طلا</Link></li>
                  <li><Link href="/products?category=women&type=ring-gem" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>انگشتر نگین‌دار</Link></li>
                  <li><Link href="/products?category=women&type=bracelet" className="hover:text-[#8B263E] transition-colors">دستبند زنجیری</Link></li>
                  <li><Link href="/products?category=women&type=bangle" className="hover:text-[#8B263E] transition-colors">النگو و دستبند صلب</Link></li>
                </ul>
              </div>
              <div>
                <h5 className="text-xs font-black text-[#8B263E] mb-3 uppercase tracking-wider">گردنبند و گوشواره</h5>
                <ul className="space-y-2.5 text-xs font-bold text-[#1C3324]">
                  <li><Link href="/products?category=women&type=necklace" className="hover:text-[#8B263E] transition-colors">گردنبند طلا</Link></li>
                  <li><Link href="/products?category=women&type=pendant" className="hover:text-[#8B263E] transition-colors">پلاک و آویز</Link></li>
                  <li><Link href="/products?category=women&type=earring-stud" className="hover:text-[#8B263E] transition-colors">گوشواره میخی</Link></li>
                  <li><Link href="/products?category=women&type=earring-hoop" className="hover:text-[#8B263E] transition-colors">گوشواره حلقه‌ای</Link></li>
                </ul>
              </div>
              <div>
                <h5 className="text-xs font-black text-[#8B263E] mb-3 uppercase tracking-wider">کالکشن‌های زنانه</h5>
                <ul className="space-y-2.5 text-xs font-bold text-[#1C3324]">
                  <li><Link href="/products?collection=bridal" className="hover:text-[#8B263E] transition-colors">کالکشن عروس</Link></li>
                  <li><Link href="/products?collection=minimal" className="hover:text-[#8B263E] transition-colors">مینیمال روزمره</Link></li>
                </ul>
              </div>
              <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#1C3324]/10 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-[#8B263E] uppercase">ویژه استودیو سروین</span>
                  <h4 className="text-sm font-black text-[#1C3324] mt-1">طراحی‌های دست‌ساز زنانه</h4>
                </div>
                <Link href="/products?category=women" className="text-xs font-bold text-[#8B263E] hover:underline mt-4 inline-block" onClick={() => setActiveMenu(null)}>مشاهده همه آثار زنانه ←</Link>
              </div>
            </div>
          )}

          {activeMenu === "men" && (
            <div className="grid grid-cols-3 gap-8">
              <div>
                <h5 className="text-xs font-black text-[#8B263E] mb-3 uppercase tracking-wider">آثار مردانه</h5>
                <ul className="space-y-2.5 text-xs font-bold text-[#1C3324]">
                  <li><Link href="/products?category=men&type=ring" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>انگشتر مردانه</Link></li>
                  <li><Link href="/products?category=men&type=bracelet" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>دستبند چرم و طلا</Link></li>
                  <li><Link href="/products?category=men&type=chain" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>زنجیر طلا</Link></li>
                </ul>
              </div>
              <div>
                <h5 className="text-xs font-black text-[#8B263E] mb-3 uppercase tracking-wider">سبک طراحی</h5>
                <p className="text-xs text-[#3A5A46] leading-relaxed">استواریِ سرو؛ ترکیبی از صلابت و اصالت در قالب زیورآلات مردانه.</p>
              </div>
              <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#1C3324]/10 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-[#8B263E] uppercase">مجموعه مردانه</span>
                  <h4 className="text-sm font-black text-[#1C3324] mt-1">استواری و اصالت</h4>
                </div>
                <Link href="/products?category=men" className="text-xs font-bold text-[#8B263E] hover:underline mt-4 inline-block" onClick={() => setActiveMenu(null)}>مشاهده همه آثار مردانه ←</Link>
              </div>
            </div>
          )}

          {activeMenu === "kids" && (
            <div className="grid grid-cols-3 gap-8">
              <div>
                <h5 className="text-xs font-black text-[#8B263E] mb-3 uppercase tracking-wider">زیورآلات کودکانه</h5>
                <ul className="space-y-2.5 text-xs font-bold text-[#1C3324]">
                  <li><Link href="/products?category=kids&type=bracelet" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>دستبند نوزادی و کودک</Link></li>
                  <li><Link href="/products?category=kids&type=pendant" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>پلاک و مدال کودک</Link></li>
                </ul>
              </div>
              <div>
                <h5 className="text-xs font-black text-[#8B263E] mb-3 uppercase tracking-wider">ایمنی و ظرافت</h5>
                <p className="text-xs text-[#3A5A46] leading-relaxed">طراحی شده با لبه‌های کاملاً نرم و استاندارد برای کودکان.</p>
              </div>
              <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#1C3324]/10 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-[#8B263E] uppercase">کودکانه</span>
                  <h4 className="text-sm font-black text-[#1C3324] mt-1">لحظه‌های شیرین</h4>
                </div>
                <Link href="/products?category=kids" className="text-xs font-bold text-[#8B263E] hover:underline mt-4 inline-block" onClick={() => setActiveMenu(null)}>مشاهده آثار کودکانه ←</Link>
              </div>
            </div>
          )}

          {activeMenu === "world" && (
            <div className="grid grid-cols-3 gap-8">
              <div>
                <h5 className="text-xs font-black text-[#8B263E] mb-3 uppercase tracking-wider">کالکشن‌های اختصاصی</h5>
                <ul className="space-y-2.5 text-xs font-bold text-[#1C3324]">
                  <li><Link href="/products?collection=nasima" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>کالکشن نسیما</Link></li>
                  <li><Link href="/products?collection=sahra" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>کالکشن صحرا</Link></li>
                  <li><Link href="/products?collection=delbar" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>کالکشن دلبر</Link></li>
                  <li><Link href="/products?collection=arona" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>کالکشن آرونا</Link></li>
                </ul>
              </div>
              <div>
                <h5 className="text-xs font-black text-[#8B263E] mb-3 uppercase tracking-wider">فلسفه و داستان</h5>
                <ul className="space-y-2.5 text-xs font-bold text-[#1C3324]">
                  <li><Link href="/story" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>سرو، سایه، ستایش</Link></li>
                  <li><Link href="/blog" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>مجله و راهنمای طلا</Link></li>
                  <li><Link href="/contact" className="hover:text-[#8B263E] transition-colors" onClick={() => setActiveMenu(null)}>طراحی اسم و حکاکی</Link></li>
                </ul>
              </div>
              <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#1C3324]/10 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-[#8B263E] uppercase">سرای سرو</span>
                  <h4 className="text-sm font-black text-[#1C3324] mt-1">روایت اصالت و هنر</h4>
                </div>
                <Link href="/story" className="text-xs font-bold text-[#8B263E] hover:underline mt-4 inline-block" onClick={() => setActiveMenu(null)}>ورود به سرای سرو ←</Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MOBILE MENU ================= */}
      {mobileMenuOpen && (
        <div className="absolute top-[120%] left-4 right-4 rounded-2xl border border-[#1C3324]/15 p-6 bg-white shadow-2xl md:hidden pointer-events-auto">
          <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
            <Link href="/" className="px-4 py-3 text-[15px] font-bold rounded-xl hover:bg-[#FAF9F6] text-[#1C3324]" onClick={() => setMobileMenuOpen(false)}>صفحه اصلی</Link>
            <Link href="/products" className="px-4 py-3 text-[15px] font-bold rounded-xl hover:bg-[#FAF9F6] text-[#1C3324]" onClick={() => setMobileMenuOpen(false)}>محصولات</Link>
            <Link href="/products?category=women" className="px-4 py-3 text-[15px] font-bold rounded-xl hover:bg-[#FAF9F6] text-[#1C3324]" onClick={() => setMobileMenuOpen(false)}>زنانه</Link>
            <Link href="/products?category=men" className="px-4 py-3 text-[15px] font-bold rounded-xl hover:bg-white text-[#1C3324]" onClick={() => setMobileMenuOpen(false)}>مردانه</Link>
            <Link href="/products?category=kids" className="px-4 py-3 text-[15px] font-bold rounded-xl hover:bg-[#FAF9F6] text-[#1C3324]" onClick={() => setMobileMenuOpen(false)}>کودک</Link>
            <Link href="/story" className="px-4 py-3 text-[15px] font-black rounded-xl hover:bg-[#FAF9F6] text-[#8B263E]" onClick={() => setMobileMenuOpen(false)}>سرای سرو</Link>
            <Link href="/contact" className="px-4 py-3 text-[15px] font-bold rounded-xl hover:bg-[#FAF9F6] text-[#1C3324]" onClick={() => setMobileMenuOpen(false)}>ارتباط با ما</Link>
            
            <div className="mt-2 border-t border-[#1C3324]/10 pt-4">
              {isAuthenticated ? (
                <>
                  <Link href="/account" className="flex items-center gap-3.5 px-4 py-3 text-[15px] font-bold rounded-xl hover:bg-[#FAF9F6] text-[#1C3324]" onClick={() => setMobileMenuOpen(false)}>
                    <User size={20} /> حساب کاربری
                  </Link>
                  <button onClick={handleLogout} className="flex w-full items-center gap-3.5 px-4 py-3 text-right text-[15px] font-bold rounded-xl hover:bg-red-50 text-red-600">
                    <LogOut size={20} /> خروج از حساب
                  </button>
                </>
              ) : (
                <Link href="/login" className="flex items-center justify-center gap-2 mt-1 px-4 py-3.5 text-[15px] font-bold rounded-xl bg-[#1C3324] text-white shadow-md" onClick={() => setMobileMenuOpen(false)}>
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