"use client";

import { useEffect, useRef, useState, useMemo, ElementType, ReactNode, ComponentType } from "react";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Gem, 
  Sparkles, 
  Check, 
  Plus, 
  Gift, 
  BadgePercent, 
  Lock, 
  Scale, 
  Truck, 
  FileText, 
  CheckCircle2, 
  PhoneCall, 
  Award,
  ChevronRight,
  TrendingUp,
  Percent
} from "lucide-react";
import Link from "next/link";
import pb from "@/lib/pocketbase";
import { LiquidGradientBackground } from "@/components/backgrounds/liquid-gradient";
import { useCart, createCartItemId } from "@/context/CartContext";
import { calcProductPrice } from "@/lib/product-detail";
import { toast } from "sonner";

/* =========================================================
   TYPES & HELPERS
========================================================= */
type ProductIconComponent = ComponentType<any>;
type DisplayProduct = {
  id: string;
  cat: string;
  tag: string | null;
  name: string;
  desc: string;
  weight: number;
  karat: number;
  price: string;
  rawPrice: number;
  installmentPrice: string;
  rawInstallment: number;
  image: string;
  Icon: ProductIconComponent;
  rawProduct: any;
};

const FILTERS = [
  { key: "all", label: "همه آثار" },
  { key: "ring", label: "انگشتر" },
  { key: "necklace", label: "گردنبند" },
  { key: "bracelet", label: "دستبند" },
  { key: "earring", label: "گوشواره" },
];

const SPECIAL_COLLECTIONS = [
  { id: "nasima", title: "کالکشن نسیما", subtitle: "لطافت باد ملایم", desc: "ترکیب انحناهای ارگانیک و درخشش طلای ۱۸ عیار", href: "/collections/nasima" },
  { id: "sahra", title: "کالکشن صحرا", subtitle: "گرما و وسعت افق", desc: "بافت‌های طلایی دست‌ساز و الهام از کویر", href: "/collections/sahra" },
  { id: "delbar", title: "کالکشن دلبر", subtitle: "عناوین ظریف و مینیمال", desc: "قطعات سبک، روزمره و پر از احساس برای هدیه", href: "/collections/delbar" },
  { id: "arona", title: "کالکشن آرونا", subtitle: "شکوه و درخشش ناب", desc: "هم‌نشینی سنگ‌های اصیل با هنر زرگری کلاسیک", href: "/collections/arona" },
];

function normalizeCategory(value: unknown, name = ""): string {
  const text = `${String(value ?? "").trim().toLowerCase()} ${name}`;
  if (text.includes("ring") || text.includes("انگشتر")) return "ring";
  if (text.includes("necklace") || text.includes("گردنبند") || text.includes("آویز")) return "necklace";
  if (text.includes("bracelet") || text.includes("دستبند") || text.includes("النگو")) return "bracelet";
  if (text.includes("earring") || text.includes("گوشواره")) return "earring";
  return "all";
}

const getProductImage = (p: any): string => {
  const raw = p?.image || p?.photo || (Array.isArray(p?.images) ? p.images[0] : "");
  if (!raw) return "";
  const filename = String(raw).trim();
  if (/^https?:\/\/|^data:|^[./]/.test(filename)) return filename;
  try {
    return p?.id && p?.collectionName ? pb.files.getURL(p, filename) : "";
  } catch { return ""; }
};

/* =========================================================
   ICONS
========================================================= */
const ProductPlaceholderIcon = () => (
  <svg viewBox="0 0 120 120" fill="none" className="w-12 h-12 opacity-25 text-[#1C3324] dark:text-[#D8B65C]">
    <circle cx="60" cy="60" r="30" stroke="currentColor" strokeWidth="2" />
    <circle cx="60" cy="60" r="4" fill="#8B263E" />
  </svg>
);

/* =========================================================
   ANIMATION COMPONENT
========================================================= */
function Reveal({ children, className = "", delay = 0, as: Tag = "div" }: { children: ReactNode; className?: string; delay?: number; as?: ElementType }) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.unobserve(entry.target); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag ref={ref as any} className={className} style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)", transition: `opacity 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}s, transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}s` }}>
      {children}
    </Tag>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */
export default function LandingUI({ 
  initialProducts = [],
  initialGoldRate = 25658600
}: { 
  initialProducts?: any[];
  initialGoldRate?: number;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [addedItems, setAddedItems] = useState<string[]>([]);
  const [goldRate, setGoldRate] = useState<number>(initialGoldRate);
  const { addItem } = useCart();

  // دریافت لحظه‌ای نرخ طلا
  useEffect(() => {
    try {
      pb.collection("gold_rates").subscribe("*", (e) => {
        if (e.action === "update" || e.action === "create") {
          const rec = e.record as any;
          if (rec.symbol === "IR_GOLD_18K" || rec.symbol === "geram18" || rec.name?.includes("18")) {
            const parsed = Number(rec.price);
            if (parsed > 0) setGoldRate(parsed);
          }
        }
      });
      return () => {
        pb.collection("gold_rates").unsubscribe("*");
      };
    } catch {
      // fallback
    }
  }, []);

  const scrollToInstallments = () => {
    document.getElementById("installment-offer")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToProducts = () => {
    document.getElementById("vitrine")?.scrollIntoView({ behavior: "smooth" });
  };

  // آماده‌سازی محصولات با محاسبه نرخ روز و اقساط ۳ ماهه
  const displayProducts: DisplayProduct[] = useMemo(() => {
    if (!initialProducts || initialProducts.length === 0) return [];

    return initialProducts.map((p, index) => {
      const weight = typeof p.weight === "number" && p.weight > 0 ? p.weight : 0;
      const karat = typeof p.karat === "number" && p.karat > 0 ? p.karat : 18;
      
      let finalPrice = 0;
      const priceCalc = calcProductPrice({
        weight,
        karat,
        wage_percent: p.wage_percent ?? 15,
        profit_percent: p.profit_percent ?? 7,
        tax_percent: p.tax_percent ?? 9,
      }, goldRate);

      if (priceCalc && priceCalc.total > 0) {
        finalPrice = priceCalc.total;
      } else {
        const rawFallback = p?.price ?? p?.selling_price;
        if (typeof rawFallback === "number" && rawFallback > 0) {
          finalPrice = rawFallback;
        }
      }

      const rawInstallment = finalPrice > 0 ? Math.ceil(finalPrice / 3) : 0;

      return {
        id: String(p?.id ?? `product-${index}`),
        cat: normalizeCategory(p?.category || p?.type, String(p?.title || p?.name || "")),
        tag: p?.tag ? String(p.tag) : (index === 0 ? "طرح ویژه اقساط" : null),
        name: p?.title || p?.name || "اثر زرگری پرنا زر",
        desc: p?.short_detail || p?.description || "طلای ۱۸ عیار دست‌ساز با کد استاندارد",
        weight,
        karat,
        price: finalPrice > 0 ? `${finalPrice.toLocaleString("fa-IR")} تومان` : "تماس بگیرید",
        rawPrice: finalPrice,
        installmentPrice: rawInstallment > 0 ? `${rawInstallment.toLocaleString("fa-IR")} تومان` : "۳ قسطه",
        rawInstallment,
        image: getProductImage(p),
        Icon: ProductPlaceholderIcon,
        rawProduct: p,
      };
    });
  }, [initialProducts, goldRate]);

  const shown = filter === "all" 
    ? displayProducts.slice(0, 6) 
    : displayProducts.filter((p) => p.cat === filter).slice(0, 6);

  const handleQuickAdd = (e: React.MouseEvent, product: DisplayProduct) => {
    e.preventDefault();
    if (addedItems.includes(product.id)) return;
    
    addItem({
      id: createCartItemId(product.id),
      product: {
        id: product.id,
        name: product.name,
        title: product.name,
        price: product.rawPrice,
        weight: product.weight,
        karat: product.karat,
        image: product.image,
        category: product.cat,
      },
      quantity: 1,
      price: product.rawPrice,
    });

    setAddedItems((prev) => [...prev, product.id]);
    toast.success(`«${product.name}» به سبد خرید افزوده شد.`);
    setTimeout(() => setAddedItems((prev) => prev.filter((id) => id !== product.id)), 2000);
  };

  return (
    <div dir="rtl" className="bg-[#FCFCFA] dark:bg-[#101813] text-[#1C3324] dark:text-zinc-100 min-h-screen font-sans selection:bg-[#8B263E] selection:text-white overflow-x-hidden transition-colors duration-300">
      
      {/* 
        =====================================================
        1. HERO SECTION (Simple, Modern, Luxury & Breathable)
        ===================================================== 
      */}
      <section className="relative min-h-[75vh] sm:min-h-[82vh] flex flex-col justify-center overflow-hidden pt-28 sm:pt-36 pb-14 border-b border-[#1C3324]/10 dark:border-white/10">
        <div className="absolute inset-0 z-0 opacity-30 dark:opacity-15 pointer-events-none">
          <LiquidGradientBackground />
        </div>

        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-5 sm:px-8 flex flex-col items-center text-center">
          
          {/* نشانگر ظریف و مینیمال نرخ طلا + آفر ۳ قسط */}
          <Reveal>
            <div className="inline-flex items-center gap-2 sm:gap-3 text-xs font-bold text-[#8B263E] dark:text-[#E6CA7A] bg-white/90 dark:bg-[#15221B]/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#8B263E]/20 dark:border-[#D8B65C]/30 shadow-xs mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>مظنه طلای ۱۸ عیار اتحادیه:</span>
              <span className="font-mono font-black text-[#1C3324] dark:text-white">{goldRate.toLocaleString("fa-IR")} تومان</span>
              <span className="opacity-40">|</span>
              <span className="text-[#8B263E] dark:text-[#D8B65C] font-extrabold">طرح خرید در ۳ قسط بدون سود</span>
            </div>
          </Reveal>
          
          <Reveal delay={0.1}>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.3] sm:leading-[1.25] mb-5 text-[#1C3324] dark:text-white max-w-4xl font-heading">
              گالری طلا و جواهر <span className="text-[#8B263E] dark:text-[#D8B65C]">پرنا زر</span> <br className="hidden sm:inline" />
              «مثل زر بدرخش»
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="text-xs sm:text-sm md:text-base text-[#3A5A46] dark:text-zinc-300 leading-relaxed max-w-xl mb-8">
              در پرنا زر، دست‌ساخته‌های طلای ۱۸ عیار را بدون کارمزد بانکی و بدون نیاز به چک و ضامن، در <strong className="text-[#8B263E] dark:text-[#D8B65C] font-black">۳ قسط ماهانه</strong> همراه با فاکتور رسمی معتبر تجربه کنید.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={scrollToProducts} 
                className="w-full sm:w-auto px-7 py-3.5 bg-[#1C3324] dark:bg-[#D8B65C] text-white dark:text-[#101813] text-xs sm:text-sm font-black rounded-full hover:bg-[#8B263E] dark:hover:bg-[#E6CA7A] hover:scale-103 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                مشاهده ویترین طلا <ArrowLeft size={15} />
              </button>

              <button 
                onClick={scrollToInstallments} 
                className="w-full sm:w-auto px-6 py-3.5 bg-white dark:bg-[#15221B] text-[#8B263E] dark:text-[#D8B65C] text-xs sm:text-sm font-bold rounded-full hover:bg-[#8B263E] hover:text-white dark:hover:bg-[#D8B65C] dark:hover:text-[#101813] transition-all border border-[#8B263E]/20 dark:border-[#D8B65C]/30 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <BadgePercent size={15} /> شرایط طرح ۳ قسط
              </button>
            </div>
          </Reveal>

          {/* ۳ نشان ظریف زیر دکمه‌ها */}
          <Reveal delay={0.4}>
            <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8 mt-10 text-[11px] sm:text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
              <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#8B263E] dark:text-[#D8B65C]" /> طلای ۱۸ عیار استاندارد ۷۵۰</span>
              <span className="flex items-center gap-1.5"><BadgePercent size={14} className="text-[#8B263E] dark:text-[#D8B65C]" /> ۳ قسط مساوی بدون سود</span>
              <span className="flex items-center gap-1.5"><FileText size={14} className="text-[#8B263E] dark:text-[#D8B65C]" /> فاکتور رسمی</span>
            </div>
          </Reveal>

        </div>
      </section>

      {/* 
        =====================================================
        2. THE 3-INSTALLMENT SPOTLIGHT (Clean, Sleek & Modern)
        ===================================================== 
      */}
      <section id="installment-offer" className="max-w-[1280px] mx-auto px-5 sm:px-8 py-14 sm:py-20 scroll-mt-24">
        <Reveal>
          <div className="bg-[#1C3324] dark:bg-[#15221B] text-white rounded-[2rem] p-6 sm:p-10 border border-[#D8B65C]/30 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#D8B65C]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#8B263E]/25 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              
              {/* هدر آفر */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-white/10">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#D8B65C] uppercase tracking-wider mb-2">
                    <Sparkles size={14} /> طرح اختصاصی پرنا زر
                  </div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white">
                    پرداخت در ۳ قسط طلایی با قیمت روز طلا
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-zinc-300 max-w-md leading-relaxed">
                  وزن خالص طلا به ۳ سهم مساوی تقسیم می‌شود. قسط اول را امروز به نرخ روز طلا بپردازید و اقساط بعدی در سررسید به قیمت روز طلا بدون کارمزد بانکی تسویه می‌شوند.
                </p>
              </div>

              {/* ۳ گام شفاف اقساط با قیمت روز */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
                
                <div className="bg-white/5 backdrop-blur-xs p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#D8B65C] mb-2">
                      <span>قدم اول (امروز)</span>
                      <span className="font-mono">۱/۳ وزن طلا</span>
                    </div>
                    <h3 className="text-sm font-black text-white mb-1.5">پیش‌پرداخت به نرخ زنده روز</h3>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      پرداخت آنلاین سهم یک‌سوم به نرخ لحظه‌ای امروز، تخصیص وزنی در فاکتور و ثبت قطعی سفارش.
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xs p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#D8B65C] mb-2">
                      <span>قدم دوم (۳۰ روز بعد)</span>
                      <span className="font-mono">۱/۳ وزن طلا</span>
                    </div>
                    <h3 className="text-sm font-black text-white mb-1.5">قسط دوم با نرخ روز طلا</h3>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      تسویه آنلاین سهم یک‌سوم دوم با نرخ روز طلا در زمان سررسید؛ بدون سود و کارمزد بانکی.
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xs p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#D8B65C] mb-2">
                      <span>قدم سوم (۶۰ روز بعد)</span>
                      <span className="font-mono">۱/۳ وزن طلا</span>
                    </div>
                    <h3 className="text-sm font-black text-white mb-1.5">تسویه نهایی و تحویل</h3>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      تسویه سهم یک‌سوم نهایی به قیمت روز سررسید، صدور شناسنامه طلا، بسته‌بندی لوکس و تحویل.
                    </p>
                  </div>
                </div>

              </div>

              {/* نوار مزایا و دکمه اقدام */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-200">
                  <span className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 size={15} /> سود بانکی: ۰٪</span>
                  <span className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 size={15} /> بدون چک صیادی</span>
                  <span className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 size={15} /> فاکتور رسمی و معتبر</span>
                </div>

                <button 
                  onClick={scrollToProducts}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#D8B65C] text-[#101813] text-xs font-black rounded-full hover:bg-white transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  مشاهده آثار اقساطی ویترین <ArrowLeft size={14} />
                </button>
              </div>

            </div>
          </div>
        </Reveal>
      </section>

      {/* 
        =====================================================
        3. THE CURATED VITRINE (Jewelry Showcase)
        ===================================================== 
      */}
      <section id="vitrine" className="max-w-[1280px] mx-auto px-5 sm:px-8 py-12 sm:py-16 scroll-mt-24">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
          <Reveal>
            <span className="block text-[10px] sm:text-xs font-black mb-1 text-[#8B263E] dark:text-[#D8B65C] tracking-widest uppercase">
              The Curated Vitrine
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#1C3324] dark:text-white">
              محبوب‌ترین آثار گالری
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <Link 
              href="/products" 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C3324] dark:text-zinc-200 hover:text-[#8B263E] dark:hover:text-[#D8B65C] transition-colors border-b border-[#1C3324]/20 dark:border-white/20 pb-0.5"
            >
              مشاهده تمامی آثار گالری <ArrowLeft size={13} />
            </Link>
          </Reveal>
        </div>

        {/* فیلترهای شیک دسته‌بندی */}
        <Reveal delay={0.15}>
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 scrollbar-none">
            {FILTERS.map((f) => (
              <button 
                key={f.key} 
                onClick={() => setFilter(f.key)} 
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 shrink-0 cursor-pointer ${
                  filter === f.key 
                    ? "bg-[#1C3324] dark:bg-[#D8B65C] text-white dark:text-[#101813] shadow-sm font-extrabold" 
                    : "bg-white dark:bg-[#15221B] text-[#3A5A46] dark:text-zinc-300 border border-[#1C3324]/10 dark:border-white/10 hover:border-[#8B263E]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Reveal>

        {/* گرید آثار */}
        {shown.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {shown.map((p, i) => {
               const ProductIcon = p.Icon;
               return (
                <Reveal key={p.id} delay={(i % 3) * 0.08}>
                  <article className="group bg-white dark:bg-[#15221B] rounded-[1.75rem] border border-[#1C3324]/10 dark:border-white/10 hover:border-[#8B263E]/40 dark:hover:border-[#D8B65C]/40 transition-all duration-400 p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-xl">
                    
                    {/* تصویر اثر */}
                    <Link href={`/products/${p.id}`} className="block relative aspect-[4/4.5] rounded-2xl bg-[#FAF9F6] dark:bg-[#101813] overflow-hidden mb-4 flex items-center justify-center">
                      {p.tag && (
                        <span className="absolute top-3 right-3 z-10 text-[10px] font-black px-2.5 py-0.5 bg-[#8B263E] text-white rounded-full shadow-xs">
                          {p.tag}
                        </span>
                      )}

                      <div className="absolute top-3 left-3 z-10 flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-white/90 dark:bg-[#15221B]/90 backdrop-blur text-[#1C3324] dark:text-zinc-200 rounded-full border border-[#1C3324]/10 dark:border-white/10 shadow-xs">
                          {p.karat} عیار
                        </span>
                        {p.weight > 0 && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-white/90 dark:bg-[#15221B]/90 backdrop-blur text-[#3A5A46] dark:text-[#D8B65C] rounded-full border border-[#1C3324]/10 dark:border-white/10 shadow-xs">
                            {p.weight.toLocaleString("fa-IR")} گرم
                          </span>
                        )}
                      </div>

                      {p.image ? (
                        <img 
                          src={p.image} 
                          alt={p.name} 
                          className="w-full h-full object-cover p-3 group-hover:scale-106 transition-transform duration-500 ease-out" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ProductIcon />
                        </div>
                      )}

                      {/* دکمه افزودن سریع */}
                      <button 
                        onClick={(e) => handleQuickAdd(e, p)}
                        className={`absolute bottom-3 left-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 z-10 shadow-md cursor-pointer ${
                          addedItems.includes(p.id) 
                            ? 'bg-emerald-600 text-white opacity-100' 
                            : 'bg-white dark:bg-[#15221B] text-[#1C3324] dark:text-white opacity-0 group-hover:opacity-100 hover:bg-[#8B263E] hover:text-white'
                        }`}
                        title="افزودن به سبد خرید"
                      >
                        {addedItems.includes(p.id) ? <Check size={16} /> : <Plus size={16} />}
                      </button>
                    </Link>

                    {/* اطلاعات و قیمت */}
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-[#1C3324] dark:text-zinc-100 mb-1 line-clamp-1 group-hover:text-[#8B263E] dark:group-hover:text-[#D8B65C] transition-colors">
                        <Link href={`/products/${p.id}`}>{p.name}</Link>
                      </h3>
                      <p className="text-xs text-[#3A5A46] dark:text-zinc-400 mb-3 line-clamp-1">
                        {p.desc}
                      </p>

                      <div className="pt-2.5 border-t border-[#1C3324]/5 dark:border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#3A5A46] dark:text-zinc-400">قیمت نقد:</span>
                          <span className="font-black text-[#1C3324] dark:text-white font-mono">{p.price}</span>
                        </div>

                        {p.rawInstallment > 0 && (
                          <div className="bg-[#FAF9F6] dark:bg-[#101813] px-2.5 py-1.5 rounded-xl border border-[#D8B65C]/35 flex flex-col gap-0.5 text-[10.5px]">
                            <div className="flex items-center justify-between font-bold text-[#8B263E] dark:text-[#D8B65C]">
                              <span className="flex items-center gap-1">
                                <BadgePercent size={13} />
                                <span>۳ قسط طلایی با قیمت روز:</span>
                              </span>
                              <span className="font-mono font-black">
                                قسط اول: {p.installmentPrice}
                              </span>
                            </div>
                            <span className="text-[9.5px] text-[#3A5A46] dark:text-zinc-400">
                              اقساط بعدی معادل ۱/۳ وزن به نرخ روز طلا
                            </span>
                          </div>
                        )}

                        <Link 
                          href={`/products/${p.id}`}
                          className="block w-full py-2 bg-[#1C3324] dark:bg-[#D8B65C] text-white dark:text-[#101813] text-xs font-bold rounded-xl text-center hover:bg-[#8B263E] dark:hover:bg-[#E6CA7A] transition-colors"
                        >
                          مشاهده و سفارش
                        </Link>
                      </div>
                    </div>

                  </article>
                </Reveal>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-[#3A5A46] dark:text-zinc-400 text-xs bg-white dark:bg-[#15221B] rounded-2xl border border-dashed border-[#1C3324]/15 shadow-xs">
            اثری در این دسته‌بندی یافت نشد.
          </div>
        )}
      </section>

      {/* 
        =====================================================
        4. SPECIAL COLLECTIONS (Minimal Grid)
        ===================================================== 
      */}
      <section className="max-w-[1280px] mx-auto px-5 sm:px-8 py-12 sm:py-16 border-t border-[#1C3324]/10 dark:border-white/10">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-8">
          <Reveal>
            <span className="text-[10px] sm:text-xs font-black text-[#8B263E] dark:text-[#D8B65C] tracking-widest uppercase mb-1 block">
              Signature Collections
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C3324] dark:text-white font-heading">
              کالکشن‌های انحصاری پرنا زر
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <Link
              href="/collections"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8B263E] dark:text-[#D8B65C] hover:underline"
            >
              <span>مشاهده همه کالکشن‌ها به صورت کارت</span>
              <ArrowLeft size={13} />
            </Link>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {SPECIAL_COLLECTIONS.map((col, idx) => (
            <Reveal key={col.id} delay={idx * 0.08}>
              <Link 
                href={col.href} 
                className="group relative block aspect-[4/4.5] rounded-2xl overflow-hidden bg-white dark:bg-[#15221B] border border-[#1C3324]/10 dark:border-white/10 shadow-xs hover:shadow-lg transition-all p-5 flex flex-col justify-end"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#1C3324]/90 via-[#1C3324]/30 to-transparent dark:from-[#0A110D]/90 dark:via-[#0A110D]/30 z-10" />
                <div className="absolute inset-0 bg-[#FAF9F6] dark:bg-[#15221B] flex items-center justify-center text-[#8B263E]/15 dark:text-[#D8B65C]/15">
                  <Gem size={64} strokeWidth={1} />
                </div>
                <div className="relative z-20 text-right">
                  <span className="text-[10px] font-black text-[#D8B65C] tracking-widest uppercase block mb-0.5">{col.subtitle}</span>
                  <h3 className="text-base font-bold text-white mb-1">{col.title}</h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1C3324] bg-white px-2.5 py-1 rounded-full w-fit group-hover:bg-[#D8B65C] group-hover:text-[#101813] transition-all">
                    مشاهده آثار <ArrowLeft size={12} />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

     {/* 
        =====================================================
        5. BRAND STORY & TRUST (Redesigned Flow)
        ===================================================== 
      */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        {/* گرادیانت ملایم پس‌زمینه برای عمق دادن */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1C3324]/[0.03] to-[#1C3324]/[0.08] dark:via-white/[0.02] dark:to-[#15221B]/60 pointer-events-none" />

        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8">
          
          {/* ستون‌های ۳ گانه با ظاهر شیشه‌ای و حاشیه‌های ظریف */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
  {[
    {
      tag: "تولید دست‌اول",
      title: "اصالتِ کارگاه",
      desc: "ساخت مستقیم در کارگاه و بدون واسطه. تمامی آثار منحصراً از طلای ۱۸ عیار استاندارد ۷۵۰ با ضمانت قطعی عیار و شناسنامه رسمی تقدیم می‌شوند.",
      icon: ShieldCheck,
    },
    {
      tag: "شفافیت",
      title: "صداقت در عیار و قیمت",
      desc: "فاکتور رسمی و دقیق با تفکیک وزن، اجرت واقعی کارگاهی و بدون هزینه‌های پنهان واسطه‌گری؛ همراه با امکان تسویه در ۳ قسط ماهانه.",
      icon: Lock,
    },
    {
      tag: "درخشش",
      title: "ظرافتِ پرنا زر",
      desc: "طراحی پیوسته و لطیفِ طلا با دقتی متناسب با درخشش روزمره شما. همان‌گونه که شایسته است: ساده، اصیل و مثل زر بدرخشید.",
      icon: Gem,
    },
  ].map((pillar, idx) => {
    const PillarIcon = pillar.icon;
    return (
      <Reveal key={pillar.title} delay={idx * 0.1}>
        <div className="h-full bg-white/80 dark:bg-[#15221B]/80 backdrop-blur-md p-6 sm:p-7 rounded-3xl border border-[#1C3324]/10 dark:border-white/10 shadow-xs hover:border-[#8B263E]/30 dark:hover:border-[#D8B65C]/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#1C3324]/5 dark:bg-white/5 text-[#8B263E] dark:text-[#D8B65C]">
                {pillar.tag}
              </span>
              <PillarIcon size={20} className="text-[#8B263E] dark:text-[#D8B65C] opacity-80" />
            </div>
            <h3 className="text-base font-extrabold text-[#1C3324] dark:text-white mb-2.5">
              {pillar.title}
            </h3>
            <p className="text-xs text-[#3A5A46] dark:text-zinc-400 leading-relaxed">
              {pillar.desc}
            </p>
          </div>
        </div>
      </Reveal>
    );
  })}
</div>

          {/* 
            بنر اختصاصی دعوت پایانی (پل اتصال به فوتر)
            این باکس با تم غنی سبز و طلایی، انتهای صفحه را به جای یک قطع ناگهانی، به اوج می‌رساند.
          */}
          <Reveal delay={0.2}>
            <div className="relative rounded-[2.5rem] bg-[#1C3324] dark:bg-[#15221B] text-white p-8 sm:p-12 overflow-hidden border border-[#D8B65C]/30 shadow-2xl">
              {/* نورپردازی پس‌زمینه */}
              <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-[#8B263E]/30 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#D8B65C]/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-right">
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-[#D8B65C] mb-3">
                    <Sparkles size={14} />
                    <span>سفارش طراحی اختصاصی و مشاوره حضوری</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold leading-snug mb-3">
                    اثری اختصاصی به سلیقه خود خلق کنید
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    امکان شخصی‌سازی قطعات، حکاکی رایگان و تحویل حضوری در گالری با هماهنگی قبلی فراهم است.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                  <Link
                    href="/customer-order"
                    className="w-full sm:w-auto px-7 py-3.5 bg-[#D8B65C] text-[#101813] text-xs font-black rounded-full hover:bg-white transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    ثبت سفارش شخصی‌سازی <ArrowLeft size={14} />
                  </Link>
                  <a
                    href="tel:0938308095"
                    className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-full transition-all border border-white/20 backdrop-blur-xs flex items-center justify-center gap-2"
                  >
                    <PhoneCall size={14} /> گفت‌وگو با کارشناس
                  </a>
                </div>
              </div>

              {/* نوار پیوسته ۴ گارانتی رسمی زیر CTA */}
              <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 pt-8 border-t border-white/10 text-center">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck size={20} className="text-[#D8B65C]" />
                  <span className="text-xs font-bold text-white">کد استاندارد ۷۵۰</span>
                  <span className="text-[14px] text-zinc-400">اتحادیه طلا و جواهر</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <BadgePercent size={20} className="text-[#D8B65C]" />
                  <span className="text-xs font-bold text-white">۳ قسط بدون کارمزد</span>
                  <span className="text-[14px] text-zinc-400">بدون چک و سفته</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <FileText size={20} className="text-[#D8B65C]" />
                  <span className="text-xs font-bold text-white">فاکتور رسمی معتبر</span>
                  <span className="text-[14px] text-zinc-400">شناسنامه وزنی و سنگ</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Truck size={20} className="text-[#D8B65C]" />
                  <span className="text-xs font-bold text-white">ارسال ایمن و بیمه‌شده</span>
                  <span className="text-[14px] text-zinc-400">تحویل سراسری با ضمانت</span>
                </div>
              </div>
            </div>
          </Reveal>

        </div>
      </section>
    </div>
  );
}