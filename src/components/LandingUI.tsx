"use client";

import { useEffect, useRef, useState, useMemo, ElementType, ReactNode, ComponentType } from "react";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Gem, 
  Sparkles, 
  Check, 
  Plus, 
  BadgePercent, 
  Lock, 
  Truck, 
  FileText, 
  CheckCircle2, 
  PhoneCall,
  Eye
} from "lucide-react";
import Link from "next/link";
import pb from "@/lib/pocketbase";
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

export interface DynamicCollectionItem {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description?: string;
  image?: string;
  featured?: boolean;
  sort_order?: number;
}

const FILTERS = [
  { key: "all", label: "همه آثار" },
  { key: "ring", label: "انگشتر" },
  { key: "necklace", label: "گردنبند" },
  { key: "bracelet", label: "دستبند" },
  { key: "earring", label: "گوشواره" },
];

const DEFAULT_COLLECTIONS: DynamicCollectionItem[] = [
  { id: "1", slug: "nasima", title: "کالکشن نسیما", subtitle: "لطافت باد و انحناهای طلایی", image: "/banner.webp" },
  { id: "2", slug: "sahra", title: "کالکشن صحرا", subtitle: "گرما و وسعت بیکران افق", image: "/header.webp" },
  { id: "3", slug: "delbar", title: "کالکشن دلبر", subtitle: "عناوین ظریف و مینیمال", image: "/gold.webp" },
  { id: "4", slug: "arona", title: "کالکشن آرونا", subtitle: "شکوه سنگ‌های اصیل", image: "/candle.webp" },
  { id: "5", slug: "sarv", title: "کالکشن سرو", subtitle: "نماد استواری و جاودانگی", image: "/header.webp" },
  { id: "6", slug: "kandoo", title: "کالکشن کندو", subtitle: "نظم هندسی و طلای خالص", image: "/gold.webp" },
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
   ICONS & ANIMATION COMPONENT
========================================================= */
const ProductPlaceholderIcon = () => (
  <svg viewBox="0 0 120 120" fill="none" className="w-12 h-12 opacity-25 text-[#3B0B14] dark:text-[#DFB76C]">
    <circle cx="60" cy="60" r="30" stroke="currentColor" strokeWidth="2" />
    <circle cx="60" cy="60" r="4" fill="#8B142D" />
  </svg>
);

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
   3-INSTALLMENT SECTION (Viewport-triggered Circular Animation)
========================================================= */
function InstallmentSection({ scrollToProducts }: { scrollToProducts: () => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.unobserve(entry.target);
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="installment-offer" className="max-w-[1280px] mx-auto px-5 sm:px-8 -mt-12 sm:-mt-16 relative z-20 pb-14 sm:pb-20 scroll-mt-28">
      <div 
        ref={containerRef}
        className="bg-gradient-to-br from-[#2D060F] via-[#22040A] to-[#170206] text-white rounded-[2rem] p-6 sm:p-10 border border-[#DFB76C]/45 ring-1 ring-[#DFB76C]/15 relative overflow-hidden shadow-[0_15px_40px_rgba(223,183,108,0.12),0_20px_50px_rgba(0,0,0,0.6)]"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#DFB76C]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#8B142D]/25 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-[#DFB76C]/20">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#DFB76C] uppercase tracking-wider mb-2">
                <Sparkles size={14} /> طرح اختصاصی پرنا زر
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white font-heading">
                پرداخت در ۳ قسط طلایی با قیمت روز طلا
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-md leading-relaxed">
              وزن خالص طلا به ۳ سهم مساوی تقسیم می‌شود. قسط اول را امروز به نرخ روز طلا بپردازید و اقساط بعدی در سررسید به قیمت روز طلا بدون کارمزد بانکی تسویه می‌شوند.
            </p>
          </div>

          {/* سه کارت اقساط با پر شدن انیمیشنی دایره‌ای پای‌چارت‌ها ۱/۳، ۲/۳ و ۳/۳ هنگام رسیدن ویوپورت */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
            
            {/* مرحله اول: ۱/۳ */}
            <div 
              className={`bg-white/5 backdrop-blur-xs p-5 rounded-2xl border border-[#DFB76C]/20 flex flex-col justify-between hover:border-[#DFB76C]/50 transition-all duration-700 hover:bg-white/[0.08] group ${
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "100ms" }}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-[#DFB76C]">قدم اول (امروز)</span>
                  
                  {/* پای چارت ۱/۳ انیمیشنی */}
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="rgba(223, 183, 108, 0.15)"
                        strokeWidth="3.5"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#DFB76C"
                        strokeWidth="3.5"
                        strokeDasharray="87.96"
                        strokeDashoffset={inView ? 87.96 * (1 - 1 / 3) : 87.96}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        style={{ transitionDelay: "200ms" }}
                      />
                    </svg>
                    <span className="absolute text-[11px] font-mono font-bold text-[#DFB76C]">۱/۳</span>
                  </div>
                </div>

                <h3 className="text-sm font-black text-white mb-1.5 group-hover:text-[#DFB76C] transition-colors">
                  پیش‌پرداخت به نرخ زنده روز
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  پرداخت آنلاین سهم یک‌سوم به نرخ لحظه‌ای امروز، تخصیص وزنی در فاکتور و ثبت قطعی سفارش.
                </p>
              </div>
            </div>

            {/* مرحله دوم: ۲/۳ */}
            <div 
              className={`bg-white/5 backdrop-blur-xs p-5 rounded-2xl border border-[#DFB76C]/20 flex flex-col justify-between hover:border-[#DFB76C]/50 transition-all duration-700 hover:bg-white/[0.08] group ${
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "250ms" }}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-[#DFB76C]">قدم دوم (۳۰ روز بعد)</span>
                  
                  {/* پای چارت ۲/۳ انیمیشنی */}
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="rgba(223, 183, 108, 0.15)"
                        strokeWidth="3.5"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#DFB76C"
                        strokeWidth="3.5"
                        strokeDasharray="87.96"
                        strokeDashoffset={inView ? 87.96 * (1 - 2 / 3) : 87.96}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        style={{ transitionDelay: "450ms" }}
                      />
                    </svg>
                    <span className="absolute text-[11px] font-mono font-bold text-[#DFB76C]">۲/۳</span>
                  </div>
                </div>

                <h3 className="text-sm font-black text-white mb-1.5 group-hover:text-[#DFB76C] transition-colors">
                  قسط دوم با نرخ روز طلا
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  تسویه آنلاین سهم یک‌سوم دوم با نرخ روز طلا در زمان سررسید؛ بدون سود و کارمزد بانکی.
                </p>
              </div>
            </div>

            {/* مرحله سوم: ۳/۳ */}
            <div 
              className={`bg-white/5 backdrop-blur-xs p-5 rounded-2xl border border-[#DFB76C]/20 flex flex-col justify-between hover:border-[#DFB76C]/50 transition-all duration-700 hover:bg-white/[0.08] group ${
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "400ms" }}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-[#DFB76C]">قدم سوم (۶۰ روز بعد)</span>
                  
                  {/* پای چارت ۳/۳ (تکمیل شده دایره‌ای انیمیشنی) */}
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="rgba(223, 183, 108, 0.15)"
                        strokeWidth="3.5"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#DFB76C"
                        strokeWidth="3.5"
                        strokeDasharray="87.96"
                        strokeDashoffset={inView ? 0 : 87.96}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        style={{ transitionDelay: "700ms" }}
                      />
                    </svg>
                    <span className="absolute text-[11px] font-mono font-bold text-[#DFB76C]">۳/۳</span>
                  </div>
                </div>

                <h3 className="text-sm font-black text-white mb-1.5 group-hover:text-[#DFB76C] transition-colors">
                  تسویه نهایی و تحویل
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  تسویه سهم یک‌سوم نهایی به قیمت روز سررسید، صدور شناسنامه طلا، بسته‌بندی لوکس و تحویل.
                </p>
              </div>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#DFB76C]/20">
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-200">
              <span className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 size={15} /> سود بانکی: ۰٪</span>
              <span className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 size={15} /> بدون چک صیادی</span>
              <span className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 size={15} /> فاکتور رسمی و معتبر</span>
            </div>

            <button 
              onClick={scrollToProducts}
              className="w-full sm:w-auto px-7 py-2.5 bg-[#DFB76C] hover:bg-[#E6CA7A] text-[#140508] text-xs font-black rounded-full transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>مشاهده آثار اقساطی ویترین</span>
              <ArrowLeft size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
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
  const [collections, setCollections] = useState<DynamicCollectionItem[]>(DEFAULT_COLLECTIONS);
  const { addItem } = useCart();

  // دریافت کالکشن‌ها به صورت لحظه‌ای از دیتابیس PocketBase
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const records = await pb.collection("exclusive_collections").getFullList<DynamicCollectionItem>({
          sort: "sort_order",
          filter: "featured = true",
          requestKey: null,
        });
        if (records && records.length > 0) {
          setCollections(records);
        }
      } catch (err) {
        console.warn("Using fallback collections:", err);
      }
    };

    fetchCollections();

    try {
      pb.collection("exclusive_collections").subscribe("*", (e) => {
        if (e.action === "update" || e.action === "create" || e.action === "delete") {
          fetchCollections();
        }
      });
      return () => {
        pb.collection("exclusive_collections").unsubscribe("*");
      };
    } catch {
      // fallback
    }
  }, []);

  // دریافت زنده نرخ اتحادیه
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
        desc: p?.short_detail || p?.description || "طلای ۱۸ عیار دست‌ساز با کد استاندارد اتحادیه",
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
    <div dir="rtl" className="bg-[#FAF8F5] dark:bg-[#120306] text-[#3B0B14] dark:text-zinc-100 min-h-screen font-sans selection:bg-[#8B142D] selection:text-white overflow-x-hidden transition-colors duration-300">
      
      {/* 
        =====================================================
        1. HERO SECTION (Warm Velvet & Centered Solitaire Ring)
        ===================================================== 
      */}
      <section className="relative min-h-[75vh] sm:min-h-[82vh] flex flex-col justify-center overflow-hidden pt-28 sm:pt-36 pb-24 sm:pb-32 bg-[#1A0307]">
        
        {/* تصویر پس‌زمینه با تنظیم کانون عمودی روی 28% جهت خروج نگین الماس از پشت تیتر */}
      <div className="absolute inset-0 z-0">
          <img 
            src="/backk.webp" 
            alt="Parna Zar Art Gallery" 
            className="w-full h-full object-cover select-none object-[center_42%]"
            loading="eager"
          />
          {/* گرادیانت یکپارچه‌ساز و چشم‌نواز روی تصویر */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#2A050D]/60 via-65% to-[#1A0307]" />
        </div>

        {/* هاله نور طلایی پس‌زمینه هیرو */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#DFB76C]/10 rounded-full blur-[120px] pointer-events-none z-1" />

        {/* ترنزیشن نرم و پیوسته انتهای هیرو: محو شدن تدریجی مخمل یاقوتی به رنگ مرواریدی لوکس صفحه */}
        <div className="absolute bottom-0 left-0 right-0 h-40 sm:h-56 bg-gradient-to-b from-transparent via-[#1A0307]/75 to-[#FAF8F5] dark:to-[#120306] pointer-events-none z-10" />

        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-5 sm:px-8 flex flex-col items-center text-center">
          <Reveal delay={0.1}>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.3] sm:leading-[1.25] mb-5 text-white max-w-4xl font-heading">
              گالری طلا <span className="text-[#DFB76C] drop-shadow-[0_2px_12px_rgba(223,183,108,0.4)]">پرنا زر</span> <br className="hidden sm:inline" />
              «مثل زر بدرخش»
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="text-xs sm:text-sm md:text-base text-zinc-200 dark:text-zinc-300 leading-relaxed max-w-xl mb-8">
              در پرنا زر، دست‌ساخته‌های طلای ۱۸ عیار را بدون کارمزد بانکی و بدون نیاز به چک و ضامن، در <strong className="text-[#DFB76C] font-black">۳ قسط ماهانه</strong> همراه با فاکتور رسمی معتبر تجربه کنید.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={scrollToProducts} 
                className="w-full sm:w-auto px-8 py-3.5 bg-[#DFB76C] hover:bg-[#E6CA7A] text-[#140508] text-xs sm:text-sm font-black rounded-full hover:scale-103 transition-all shadow-[0_8px_25px_rgba(223,183,108,0.35)] flex items-center justify-center gap-2 cursor-pointer"
              >
                مشاهدۀ ویترین طلا <ArrowLeft size={15} />
              </button>

              <button 
                onClick={scrollToInstallments} 
                className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold rounded-full transition-all border border-[#DFB76C]/40 backdrop-blur-md shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <BadgePercent size={15} className="text-[#DFB76C]" /> شرایط طرح ۳ قسط
              </button>
            </div>
          </Reveal>

          <Reveal delay={0.4}>
            <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8 mt-10 text-[11px] sm:text-xs font-bold text-zinc-300 dark:text-zinc-400">
              <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#DFB76C]" /> طلای ۱۸ عیار استاندارد ۷۵۰</span>
              <span className="flex items-center gap-1.5"><BadgePercent size={14} className="text-[#DFB76C]" /> ۳ قسط مساوی بدون سود</span>
              <span className="flex items-center gap-1.5"><FileText size={14} className="text-[#DFB76C]" /> فاکتور رسمی معتبر</span>
            </div>
          </Reveal>

        </div>
      </section>

      {/* 
        =====================================================
        2. THE 3-INSTALLMENT SPOTLIGHT (Nested Bridge Section)
        ===================================================== 
      */}
      <InstallmentSection scrollToProducts={scrollToProducts} />
      {/* 
        =====================================================
        3. EXCLUSIVE COLLECTIONS (Minimal Square Layout)
        ===================================================== 
      */}
    <section className="w-full py-14 sm:py-20 overflow-hidden" dir="rtl">
  {/* انیمیشن دقیق لوپ بی‌نهایت: حرکت پیوسته به سمت چپ (خروج از چپ، ورود از راست) */}
  <style>{`
    @keyframes scrollLeftContinuous {
      from {
        transform: translateX(0);
      }
      to {
        transform: translateX(-50%);
      }
    }
    .marquee-track {
      display: flex;
      width: max-content;
      animation: scrollLeftContinuous 60s linear infinite;
    }
    .marquee-track:hover {
      animation-play-state: paused;
    }
  `}</style>

  {/* هدر بخش */}
  <div className="max-w-[1400px] mx-auto px-5 sm:px-8 flex items-end justify-between mb-6 pb-4 border-b border-[#3B0B14]/10 dark:border-white/10">
    <div>
      <span className="text-[11px] font-mono tracking-[0.25em] text-[#3B0B14]/60 dark:text-[#DFB76C] uppercase font-bold block mb-1">
        EXCLUSIVE COLLECTIONS
      </span>
      <h2 className="text-xl sm:text-2xl font-black text-[#3B0B14] dark:text-white font-heading">
        کالکشن‌های اختصاصی پرنا زر
      </h2>
    </div>

    {/* فلش‌های جابه‌جایی دستی */}
    <div className="flex items-center gap-2">
      <button 
        type="button"
        onClick={() => {
          document.getElementById('collections-scroll-container')?.scrollBy({ left: 320, behavior: 'smooth' });
        }}
        className="w-8 h-8 rounded-full border border-[#3B0B14]/20 dark:border-white/20 flex items-center justify-center text-[#3B0B14] dark:text-white hover:border-[#DFB76C] hover:text-[#8B142D] transition-colors cursor-pointer"
        aria-label="Previous"
      >
        →
      </button>
      <button 
        type="button"
        onClick={() => {
          document.getElementById('collections-scroll-container')?.scrollBy({ left: -320, behavior: 'smooth' });
        }}
        className="w-8 h-8 rounded-full border border-[#3B0B14]/20 dark:border-white/20 flex items-center justify-center text-[#3B0B14] dark:text-white hover:border-[#DFB76C] hover:text-[#8B142D] transition-colors cursor-pointer"
        aria-label="Next"
      >
        ←
      </button>
    </div>
  </div>

  {/* ریل اسکرول پیوسته */}
  <div 
    id="collections-scroll-container"
    dir="ltr" /* برای هماهنگی ریاضی ترنسلیت منفی به سمت چپ */
    className="w-full overflow-hidden select-none"
  >
    {(() => {
      // اگر تعداد کم باشد (مثلاً ۳ تا)، آن‌قدر تکرار می‌شود تا ردیف به اندازه کافی بزرگ شود و هرگز خالی نیفتد
      let baseList = [...collections];
      while (baseList.length < 8 && baseList.length > 0) {
        baseList = [...baseList, ...collections];
      }
      // ردیف اصلی دوبار پشت سر هم کپی می‌شود (دقیقا 50% اول و 50% دوم)
      const fullList = [...baseList, ...baseList];

      return (
        <div className="marquee-track gap-4 px-2" dir="rtl">
          {fullList.map((col, idx) => (
            <Link 
              key={`${col.id || col.slug}-${idx}`}
              href={`/collections/${col.slug}`} 
              className="group flex flex-col items-center shrink-0 w-[42vw] sm:w-[26vw] md:w-[18vw] lg:w-[14vw]"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#F2EFE9] dark:bg-zinc-900 border border-[#3B0B14]/5 shadow-sm">
                <img
                  src={col.image || "/banner.webp"}
                  alt={col.title}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/banner.webp";
                  }}
                />
              </div>

              <span className="mt-2.5 text-xs sm:text-[13px] font-medium text-[#3B0B14] dark:text-zinc-300 group-hover:text-[#8B142D] dark:group-hover:text-[#DFB76C] transition-colors text-center">
                {col.title.replace("کالکشن", "").trim()}
              </span>
            </Link>
          ))}
        </div>
      );
    })()}
  </div>
</section>

      {/* 
        =====================================================
        4. SHOP THE LOOK (پیشنهادات استایل پرنا زر)
        ===================================================== 
      */}
      <section className="max-w-[1360px] mx-auto px-5 sm:px-8 py-16 border-t border-[#DFB76C]/20">
        <div className="text-center mb-12">
          <Reveal>
            <span className="text-[11px] font-mono tracking-[0.25em] text-[#8B142D] dark:text-[#DFB76C] uppercase block mb-1">
              Shop The Look
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-[#3B0B14] dark:text-white font-heading">
              پیشنهادات استایل پرنا زر
            </h2>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* عکس اصلی مدلینگ و تن‌خور زیورآلات */}
          <div className="lg:col-span-5 relative aspect-[3/4] rounded-3xl overflow-hidden bg-[#F5F2EB] shadow-lg border border-[#DFB76C]/20">
            <img
              src="/back.webp"
              alt="پیشنهاد ست استایل گالری طلا پرنا زر"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/backk.webp";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex items-end p-6">
              <div className="text-white">
                <span className="text-[11px] font-bold text-[#DFB76C] uppercase tracking-wider block mb-1">استایل برگزیده گالری</span>
                <h3 className="text-lg font-black font-heading">هارمونی انگشتر و دستبند مینیمال</h3>
                <p className="text-xs text-zinc-300 mt-1">ترکیبی متوازن از خطوط هندسی طلا با درخشش نگین برای استایل روزمره و فاخر</p>
              </div>
            </div>
          </div>

          {/* کارت‌های محصولات تشکیل‌دهنده این استایل */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {displayProducts.slice(0, 6).map((item) => (
              <Link
                key={item.id}
                href={`/products/${item.id}`}
                className="group flex flex-col bg-white dark:bg-[#1C080E]/80 p-3 rounded-2xl border border-[#DFB76C]/20 hover:border-[#DFB76C] transition-all duration-300 hover:shadow-md"
              >
                <div className="relative aspect-square w-full rounded-xl bg-[#FAF8F5] dark:bg-black/30 overflow-hidden mb-2.5 flex items-center justify-center">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-contain p-2 group-hover:scale-108 transition-transform duration-500"
                    />
                  ) : (
                    <Gem size={28} className="text-[#8B142D] opacity-40" />
                  )}
                </div>
                <span className="text-xs font-bold text-[#3B0B14] dark:text-zinc-100 line-clamp-1 group-hover:text-[#8B142D] dark:group-hover:text-[#DFB76C] transition-colors">
                  {item.name}
                </span>
                <span className="text-[10px] text-[#6E3A44] dark:text-zinc-400 mt-0.5 font-sans">
                  {item.weight > 0 ? `${item.weight} گرم طلای ۱۸ عیار` : "طلای ۱۸ عیار"}
                </span>
                <span className="text-xs font-mono font-black text-[#8B142D] dark:text-[#DFB76C] mt-2">
                  {item.price}
                </span>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* 
        =====================================================
        5. THE CURATED VITRINE (Jewelry Showcase)
        ===================================================== 
      */}
      <section id="vitrine" className="max-w-[1280px] mx-auto px-5 sm:px-8 py-10 sm:py-16 scroll-mt-24 border-t border-[#DFB76C]/20">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
          <Reveal>
            <span className="block text-[10px] sm:text-xs font-black mb-1 text-[#8B142D] dark:text-[#DFB76C] tracking-widest uppercase">
              The Curated Vitrine
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#3B0B14] dark:text-white font-heading">
              محبوب‌ترین آثار گالری
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <Link 
              href="/products" 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3B0B14] dark:text-zinc-200 hover:text-[#8B142D] dark:hover:text-[#DFB76C] transition-colors border-b border-[#DFB76C]/40 pb-0.5"
            >
              مشاهده تمامی آثار گالری <ArrowLeft size={13} />
            </Link>
          </Reveal>
        </div>

        <Reveal delay={0.15}>
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 scrollbar-none">
            {FILTERS.map((f) => (
              <button 
                key={f.key} 
                onClick={() => setFilter(f.key)} 
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 shrink-0 cursor-pointer ${
                  filter === f.key 
                    ? "bg-[#3B0B14] text-[#DFB76C] dark:bg-[#DFB76C] dark:text-[#140508] border border-[#DFB76C]/50 shadow-md font-extrabold" 
                    : "bg-white dark:bg-[#1C080E] text-[#6E3A44] dark:text-zinc-300 border border-[#DFB76C]/25 hover:border-[#DFB76C] hover:text-[#3B0B14]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Reveal>

        {shown.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {shown.map((p, i) => {
               const ProductIcon = p.Icon;
               return (
                <Reveal key={p.id} delay={(i % 3) * 0.08}>
                  <article className="group bg-white dark:bg-[#1C080E] rounded-2xl sm:rounded-[1.75rem] border border-[#DFB76C]/25 hover:border-[#DFB76C] transition-all duration-400 p-2.5 sm:p-5 flex flex-col justify-between shadow-[0_4px_20px_rgba(59,11,20,0.04)] hover:shadow-[0_16px_36px_rgba(59,11,20,0.12)]">
                    
                    <Link href={`/products/${p.id}`} className="block relative aspect-square rounded-xl sm:rounded-2xl bg-[#FBF7F0] dark:bg-[#140508] overflow-hidden mb-2.5 sm:mb-4 flex items-center justify-center border border-[#DFB76C]/15">
                      {p.tag && (
                        <span className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 text-[9px] sm:text-[10px] font-black px-2 sm:px-2.5 py-0.5 bg-[#8B142D] text-white rounded-full shadow-xs">
                          {p.tag}
                        </span>
                      )}

                      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 flex flex-col items-end gap-1">
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 bg-white/90 dark:bg-[#1C080E]/90 backdrop-blur text-[#3B0B14] dark:text-zinc-200 rounded-full border border-[#DFB76C]/25 shadow-xs">
                          {p.karat} عیار
                        </span>
                        {p.weight > 0 && (
                          <span className="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 bg-white/90 dark:bg-[#1C080E]/90 backdrop-blur text-[#8B142D] dark:text-[#DFB76C] rounded-full border border-[#DFB76C]/25 shadow-xs">
                            {p.weight.toLocaleString("fa-IR")} گرم
                          </span>
                        )}
                      </div>

                      {p.image ? (
                        <img 
                          src={p.image} 
                          alt={`خرید ${p.name} - طلای ۱۸ عیار دست‌ساز گالری پرنا زر`}
                          className="w-full h-full object-cover p-2 sm:p-3 group-hover:scale-106 transition-transform duration-500 ease-out" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ProductIcon />
                        </div>
                      )}

                      <button 
                        onClick={(e) => handleQuickAdd(e, p)}
                        className={`absolute bottom-2 left-2 sm:bottom-3 sm:left-3 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 z-10 shadow-md cursor-pointer ${
                          addedItems.includes(p.id) 
                            ? 'bg-emerald-600 text-white opacity-100' 
                            : 'bg-white dark:bg-[#1C080E] text-[#3B0B14] dark:text-white opacity-0 group-hover:opacity-100 hover:bg-[#8B142D] hover:text-white'
                        }`}
                        title="افزودن به سبد خرید"
                      >
                        {addedItems.includes(p.id) ? <Check size={14} /> : <Plus size={14} />}
                      </button>
                    </Link>

                    <div>
                      <h3 className="text-xs sm:text-base font-extrabold text-[#3B0B14] dark:text-zinc-100 mb-1 line-clamp-1 group-hover:text-[#8B142D] dark:group-hover:text-[#DFB76C] transition-colors font-heading">
                        <Link href={`/products/${p.id}`}>{p.name}</Link>
                      </h3>
                      <p className="text-[10.5px] sm:text-xs text-[#6E3A44] dark:text-zinc-400 mb-2 sm:mb-3 line-clamp-1">
                        {p.desc}
                      </p>

                      <div className="pt-2 sm:pt-2.5 border-t border-[#DFB76C]/15 space-y-2">
                        <div className="flex items-center justify-between text-[11px] sm:text-xs">
                          <span className="text-[#6E3A44] dark:text-zinc-400">قیمت نقد:</span>
                          <span className="font-black text-[#3B0B14] dark:text-white font-mono">{p.price}</span>
                        </div>

                        {p.rawInstallment > 0 && (
                          <div className="bg-[#FAF3E8]/80 dark:bg-white/5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-[#DFB76C]/40 flex flex-col gap-0.5 text-[9.5px] sm:text-[10.5px]">
                            <div className="flex items-center justify-between font-bold text-[#8B142D] dark:text-[#DFB76C]">
                              <span className="flex items-center gap-1">
                                <BadgePercent size={12} />
                                <span>۳ قسط طلایی:</span>
                              </span>
                              <span className="font-mono font-black">
                                {p.installmentPrice}
                              </span>
                            </div>
                          </div>
                        )}

                        <Link 
                          href={`/products/${p.id}`}
                          className="block w-full py-2 sm:py-2.5 bg-[#3B0B14] dark:bg-[#DFB76C] text-[#DFB76C] dark:text-[#140508] text-[11px] sm:text-xs font-bold rounded-xl text-center hover:bg-[#8B142D] dark:hover:bg-[#E6CA7A] hover:text-white transition-colors shadow-sm"
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
          <div className="text-center py-16 text-[#6E3A44] dark:text-zinc-400 text-xs bg-white dark:bg-[#1C080E] rounded-2xl border border-dashed border-[#DFB76C]/30 shadow-xs">
            اثری در این دسته‌بندی یافت نشد.
          </div>
        )}
      </section>

      {/* 
        =====================================================
        6. BRAND STORY & TRUST (Pillars & CTA)
        ===================================================== 
      */}
      <section className="relative py-16 sm:py-24 overflow-hidden border-t border-[#DFB76C]/20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#DFB76C]/[0.04] to-[#24040A]/[0.06] dark:via-white/[0.02] dark:to-[#1C080E]/60 pointer-events-none" />

        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Reveal>
              <span className="text-[10px] sm:text-xs font-black text-[#8B142D] dark:text-[#DFB76C] tracking-widest uppercase mb-1 block">
                Brand Heritage & Craftsmanship
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#3B0B14] dark:text-white font-heading">
                اصالت، شفافیت و ظرافتِ پرنا زر
              </h2>
              <p className="text-xs sm:text-sm text-[#6E3A44] dark:text-zinc-400 mt-2 leading-relaxed">
                تعهد ما در گالری پرنا زر، ارائه‌ی دست‌ساخته‌های مستقیم کارگاهی، ضمانت عیار استاندارد اتحادیه و صدور فاکتور رسمی معتبر است.
              </p>
            </Reveal>
          </div>

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
                  <div className="h-full bg-white/90 dark:bg-[#1C080E]/80 backdrop-blur-md p-6 sm:p-7 rounded-3xl border border-[#DFB76C]/25 shadow-xs hover:border-[#DFB76C] hover:shadow-lg transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#DFB76C]/15 text-[#8B142D] dark:text-[#DFB76C]">
                          {pillar.tag}
                        </span>
                        <PillarIcon size={20} className="text-[#8B142D] dark:text-[#DFB76C] opacity-80" />
                      </div>
                      <h3 className="text-base font-extrabold text-[#3B0B14] dark:text-white mb-2.5 font-heading">
                        {pillar.title}
                      </h3>
                      <p className="text-xs text-[#6E3A44] dark:text-zinc-400 leading-relaxed">
                        {pillar.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={0.2}>
            <div className="relative rounded-[2.5rem] bg-gradient-to-br from-[#350711] via-[#24040A] to-[#1A0307] text-white p-8 sm:p-12 overflow-hidden border border-[#DFB76C]/35 shadow-2xl">
              <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-[#8B142D]/35 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#DFB76C]/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-right">
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-[#DFB76C] mb-3">
                    <Sparkles size={14} />
                    <span>سفارش طراحی اختصاصی و مشاوره حضوری</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold leading-snug mb-3 font-heading">
                    اثری اختصاصی به سلیقه خود خلق کنید
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    امکان شخصی‌سازی قطعات، حکاکی رایگان و تحویل حضوری در گالری با هماهنگی قبلی فراهم است.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                  <Link
                    href="/customer-order"
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#DFB76C] hover:bg-[#E6CA7A] text-[#140508] text-xs font-black rounded-full transition-all shadow-[0_8px_25px_rgba(223,183,108,0.35)] flex items-center justify-center gap-2"
                  >
                    ثبت سفارش شخصی‌سازی <ArrowLeft size={14} />
                  </Link>
                  <a
                    href="tel:0938308095"
                    className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-full transition-all border border-[#DFB76C]/40 backdrop-blur-xs flex items-center justify-center gap-2"
                  >
                    <PhoneCall size={14} className="text-[#DFB76C]" /> گفت‌وگو با کارشناس
                  </a>
                </div>
              </div>

              <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 pt-8 border-t border-[#DFB76C]/20 text-center">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck size={20} className="text-[#DFB76C]" />
                  <span className="text-xs font-bold text-white">کد استاندارد ۷۵۰</span>
                  <span className="text-[13px] text-zinc-400">اتحادیه رسمی طلا</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <BadgePercent size={20} className="text-[#DFB76C]" />
                  <span className="text-xs font-bold text-white">۳ قسط بدون کارمزد</span>
                  <span className="text-[13px] text-zinc-400">بدون چک و سفته</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <FileText size={20} className="text-[#DFB76C]" />
                  <span className="text-xs font-bold text-white">فاکتور رسمی معتبر</span>
                  <span className="text-[13px] text-zinc-400">شناسنامه وزنی و سنگ</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Truck size={20} className="text-[#DFB76C]" />
                  <span className="text-xs font-bold text-white">ارسال ایمن و بیمه‌شده</span>
                  <span className="text-[13px] text-zinc-400">تحویل سراسری با ضمانت</span>
                </div>
              </div>
            </div>
          </Reveal>

        </div>
      </section>
    </div>
  );
}