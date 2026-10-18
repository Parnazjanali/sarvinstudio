"use client";

import { useEffect, useRef, useState, ElementType, ReactNode, ComponentType } from "react";
import { ArrowLeft, ShieldCheck, Gem, Heart, Sparkles, Check, Plus, Gift } from "lucide-react";
import Link from "next/link";
import pb from "@/lib/pocketbase";
import { LiquidGradientBackground } from "@/components/backgrounds/liquid-gradient"; 

/* =========================================================
   TYPES & HELPERS
========================================================= */
type ProductIconComponent = ComponentType<any>;
type DisplayProduct = { id: string; cat: string; tag: string | null; name: string; desc: string; price: string; image: string; Icon: ProductIconComponent; };

const FILTERS = [
  { key: "all", label: "همه آثار" },
  { key: "ring", label: "انگشتر" },
  { key: "necklace", label: "گردنبند" },
  { key: "bracelet", label: "دستبند" },
  { key: "earring", label: "گوشواره" },
];

const SPECIAL_COLLECTIONS = [
  { id: "nasima", title: "کالکشن نسیما", subtitle: "لطافت باد ملایم", href: "/products?collection=nasima" },
  { id: "sahra", title: "کالکشن صحرا", subtitle: "گرما و وسعت افق", href: "/products?collection=sahra" },
  { id: "delbar", title: "کالکشن دلبر", subtitle: "عناوین ظریف و مینیمال", href: "/products?collection=delbar" },
  { id: "arona", title: "کالکشن آرونا", subtitle: "شکوه و درخشش ناب", href: "/products?collection=arona" },
];

function normalizeCategory(value: unknown, name = ""): string {
  const text = `${String(value ?? "").trim().toLowerCase()} ${name}`;
  if (text.includes("ring") || text.includes("انگشتر")) return "ring";
  if (text.includes("necklace") || text.includes("گردنبند")) return "necklace";
  if (text.includes("bracelet") || text.includes("دستبند")) return "bracelet";
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
  <svg viewBox="0 0 120 120" fill="none" className="w-12 h-12 opacity-30">
    <circle cx="60" cy="60" r="30" className="stroke-[#1C3324]" strokeWidth="2" />
    <circle cx="60" cy="60" r="4" className="fill-[#8B263E]" />
  </svg>
);

const InstagramIcon = ({ size = 32, className = "" }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
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
    <Tag ref={ref as any} className={className} style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(25px)", transition: `opacity 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}s, transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}s` }}>
      {children}
    </Tag>
  );
}

const BrandMarquee = () => (
  <div className="bg-[#1C3324] text-[#FFFFFF] py-3.5 overflow-hidden relative border-y border-[#1C3324]/10 flex whitespace-nowrap shadow-inner">
    <div className="animate-[marquee_25s_linear_infinite] flex items-center min-w-full">
       {[...Array(6)].map((_, i) => (
         <div key={i} className="flex items-center gap-8 md:gap-16 mx-4 md:mx-8 text-[13px] font-bold tracking-widest uppercase">
           <span className="text-[#FFFFFF]">✦ استواریِ سرو (طلای خالص ۱۸ عیار)</span>
           <span className="text-[#D8B65C]">✦ امنیتِ سایه (ضمانت اصالت و عیار)</span>
           <span className="text-[#D8B65C] font-extrabold">✦ ستایشِ زیبایی (طراحی دست‌ساز)</span>
           <span className="text-[#FFFFFF]">✦ امکان پرداخت اقساطی ماهانه</span>
         </div>
       ))}
    </div>
  </div>
);

/* =========================================================
   MAIN COMPONENT
========================================================= */
export default function LandingUI({ initialProducts = [] }: { initialProducts?: any[] }) {
  const [filter, setFilter] = useState<string>("all");
  const [addedItems, setAddedItems] = useState<string[]>([]); 

  const scrollToProducts = () => document.getElementById("edit")?.scrollIntoView({ behavior: "smooth" });

  const displayProducts: DisplayProduct[] = initialProducts.length > 0
    ? initialProducts.map((p, index) => {
        const rawPrice = p?.price ?? p?.selling_price ?? "";
        let calculatedPrice = "تماس بگیرید";
        if (typeof rawPrice === "number" && rawPrice > 0) calculatedPrice = `${rawPrice.toLocaleString("fa-IR")} تومان`;

        return {
          id: String(p?.id ?? `product-${index}`),
          cat: normalizeCategory(p?.category || p?.type, String(p?.name || p?.title || "")),
          tag: p?.tag ? String(p.tag) : null,
          name: p?.name || p?.title || "اثری بدون نام",
          desc: p?.short_detail || p?.description || "طلای خالص ۱۸ عیار",
          price: calculatedPrice,
          image: getProductImage(p),
          Icon: ProductPlaceholderIcon
        };
      })
    : [];

  const shown = filter === "all" ? displayProducts.slice(0, 6) : displayProducts.filter((p) => p.cat === filter).slice(0, 6);

  const handleQuickAdd = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (addedItems.includes(id)) return;
    setAddedItems(prev => [...prev, id]);
    setTimeout(() => setAddedItems(prev => prev.filter(itemId => itemId !== id)), 1500);
  };

  return (
    <div dir="rtl" className="bg-[#FAF9F6] text-[#1C3324] min-h-screen font-sans selection:bg-[#8B263E] selection:text-white overflow-x-hidden">
      <style>{`
        .glass-btn { background: rgba(255,255,255,0.9); backdrop-filter: blur(12px); border: 1px solid rgba(139,38,62,0.2); }
        .glass-btn:hover { background: #8B263E; color: #FFFFFF; transform: scale(1.06); }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(50%); } }
      `}</style>

      {/* 
        =====================================================
        HERO SECTION 
        ===================================================== 
      */}
      <section className="relative min-h-[82vh] sm:min-h-[88vh] flex flex-col justify-center overflow-hidden pt-32 sm:pt-36 lg:pt-40 pb-12 sm:pb-16 border-b border-[#1C3324]/10 bg-[#FAF9F6]">
        <div className="absolute inset-0 z-0 opacity-60">
          <LiquidGradientBackground />
        </div>

        <div className="relative z-10 w-full max-w-[1320px] mx-auto px-5 sm:px-6 flex flex-col items-start text-right">
          <Reveal>
            <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-bold tracking-[0.18em] text-[#8B263E] mb-4 sm:mb-6 uppercase bg-white/90 backdrop-blur-md px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#8B263E]/20 shadow-xs">
              <span className="w-5 sm:w-6 h-[2px] bg-[#8B263E]" /> 
              Sarvin Studio Collection
            </div>
          </Reveal>
          
          <Reveal delay={0.1}>
            {/* اصلاح اندازه فونت برای موبایل جهت جلوگیری از به هم ریختگی و تداخل خطوط */}
            <h1 className="text-[2.1rem] xs:text-[2.4rem] sm:text-4xl md:text-5xl lg:text-[4.2rem] font-extrabold leading-[1.35] sm:leading-[1.25] mb-5 sm:mb-6 text-[#1C3324]">
              استواریِ <span className="text-[#8B263E]">سرو</span>، <br />
              امنیتِ <span className="text-[#1C3324]">سایه</span>، <br />
              <span className="text-[#1C3324]">ستایشِ</span> زیبایی و هنر
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="text-xs sm:text-sm md:text-base text-[#3A5A46] leading-relaxed max-w-xl mb-8 sm:mb-10 border-r-4 border-[#8B263E] pr-4 sm:pr-5 py-2 bg-white/75 backdrop-blur-sm rounded-l-xl shadow-xs">
              در سروین استودیو، هر قطعه طلا داستانی از ریشه‌های اصیل، پناهی از عشق و تقدیر از زیبایی‌های ناب درون شماست؛ ساخته شده برای همراهی در تمام لحظه‌های ماندگار.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 sm:gap-4 w-full sm:w-auto">
              <button onClick={scrollToProducts} className="w-full sm:w-auto px-7 sm:px-8 py-3.5 bg-[#1C3324] text-white text-xs sm:text-sm font-bold rounded-full hover:bg-[#8B263E] hover:scale-105 transition-all duration-300 shadow-lg flex items-center justify-center gap-2">
                کشف آثار استودیو <ArrowLeft size={16} />
              </button>
              <Link href="/contact" className="w-full sm:w-auto text-[#1C3324] text-xs sm:text-sm font-bold hover:text-[#8B263E] transition-colors flex items-center justify-center gap-2 bg-white/90 backdrop-blur-md px-6 sm:px-7 py-3.5 rounded-full border border-[#1C3324]/15 shadow-xs">
                سفارش طراحی اختصاصی
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 
        =====================================================
        THE EDIT (Editorial Grid Layout)
        ===================================================== 
      */}
      <section id="edit" className="max-w-[1320px] mx-auto px-5 sm:px-6 py-16 sm:py-24 scroll-mt-24">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
          <Reveal>
            <span className="block text-[10px] sm:text-[11px] font-bold mb-1.5 sm:mb-2 text-[#8B263E] tracking-widest uppercase">The Gallery Selection</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1C3324]">محبوب‌ترین آثار سروین</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <Link href="/products" className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-[#1C3324] hover:text-[#8B263E] transition-colors border-b border-[#1C3324]/20 pb-1 hover:border-[#8B263E]">
              مشاهده تمامی آثار <ArrowLeft size={15} />
            </Link>
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 sm:mb-14 scrollbar-none -mx-5 px-5 sm:mx-0 sm:px-0">
            {FILTERS.map((f) => (
              <button 
                key={f.key} 
                onClick={() => setFilter(f.key)} 
                className={`whitespace-nowrap px-4 sm:px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 shrink-0 ${
                  filter === f.key ? "bg-[#1C3324] text-white shadow-md scale-105 border-transparent" : "bg-white text-[#3A5A46] border border-[#1C3324]/15 hover:border-[#8B263E]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Reveal>

        {shown.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
            {shown.map((p, i) => {
               const ProductIcon = p.Icon;
               return (
              <Reveal key={p.id} delay={(i % 3) * 0.1}>
                <article className="group cursor-pointer flex flex-col h-full">
                  <Link href={`/products/${p.id}`} className="block relative bg-white rounded-t-[999px] rounded-b-3xl border border-[#1C3324]/15 aspect-[3/4] overflow-hidden mb-5 shadow-xs hover:shadow-xl hover:border-[#8B263E]/40 transition-all duration-500">
                    {p.tag && <span className="absolute top-7 right-1/2 translate-x-1/2 z-10 text-[10px] font-bold px-3.5 py-1 bg-white/95 backdrop-blur text-[#8B263E] rounded-full border border-[#8B263E]/30 shadow-xs">{p.tag}</span>}
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover p-4 group-hover:scale-105 transition-transform duration-700 ease-out" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#F4F6F4]"><ProductIcon /></div>
                    )}
                    
                    <button 
                      onClick={(e) => handleQuickAdd(e, p.id)}
                      className={`glass-btn absolute bottom-4 left-1/2 -translate-x-1/2 w-11 h-11 rounded-full flex items-center justify-center text-[#1C3324] transition-all duration-300 z-10 opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 ${addedItems.includes(p.id) ? 'bg-[#8B263E] text-white opacity-100 translate-y-0 border-transparent' : ''}`}
                      aria-label="افزودن به سبد خرید"
                    >
                      {addedItems.includes(p.id) ? <Check size={16} /> : <Plus size={16} />}
                    </button>
                  </Link>

                  <div className="flex flex-col text-center px-4">
                    <h3 className="text-base text-[#1C3324] font-bold mb-1">{p.name}</h3>
                    <p className="text-xs text-[#3A5A46] mb-2.5 line-clamp-1">{p.desc}</p>
                    <div className="mt-auto text-sm font-extrabold text-[#8B263E]">{p.price}</div>
                  </div>
                </article>
              </Reveal>
            )})}
          </div>
        ) : (
          <div className="text-center py-28 text-[#3A5A46] text-base bg-white rounded-3xl border border-dashed border-[#1C3324]/20 shadow-xs">اثری در این دسته‌بندی یافت نشد.</div>
        )}
      </section>

      {/* 
        =====================================================
        SPECIAL COLLECTIONS GRID 
        ===================================================== 
      */}
      <section className="max-w-[1320px] mx-auto px-5 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <Reveal>
            <span className="text-[10px] sm:text-xs font-bold text-[#8B263E] tracking-widest uppercase mb-1.5 sm:mb-2 block">Exclusive Collections</span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#1C3324]">کالکشن‌های انحصاری سروین</h2>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {SPECIAL_COLLECTIONS.map((col, idx) => (
            <Reveal key={col.id} delay={idx * 0.1}>
              <Link href={col.href} className="group relative block aspect-[4/5] rounded-3xl overflow-hidden bg-white border border-[#8B263E]/20 shadow-xs hover:shadow-xl transition-all duration-500 p-6 flex flex-col justify-end">
                <div className="absolute inset-0 bg-gradient-to-t from-[#1C3324]/85 via-[#1C3324]/30 to-transparent z-10 group-hover:from-[#1C3324]/95 transition-colors" />
                <div className="absolute inset-0 bg-[#F4F6F4] group-hover:scale-105 transition-transform duration-700 flex items-center justify-center text-[#8B263E]/20">
                  <Gem size={64} strokeWidth={1} />
                </div>
                <div className="relative z-20 text-right">
                  <span className="text-[10px] font-bold text-[#D8B65C] tracking-widest uppercase block mb-1">{col.subtitle}</span>
                  <h3 className="text-lg font-bold text-white mb-3">{col.title}</h3>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8B263E] bg-white/95 backdrop-blur px-3 py-1.5 rounded-full w-fit group-hover:bg-[#8B263E] group-hover:text-white transition-all">
                    مشاهده آثار <ArrowLeft size={14} />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* نوار متحرک برند */}
      <BrandMarquee />

      {/* 
        =====================================================
        BRAND PHILOSOPHY 
        ===================================================== 
      */}
      <section className="bg-white py-16 sm:py-24 border-b border-[#1C3324]/10">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-6 text-center max-w-3xl mb-12 sm:mb-16">
          <Reveal>
            <span className="text-[10px] sm:text-xs font-bold text-[#8B263E] tracking-widest uppercase mb-1.5 sm:mb-2 block">Our Philosophy</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1C3324] mb-3 sm:mb-4">سرو، سایه، ستایش</h2>
            <p className="text-[#3A5A46] text-xs sm:text-base leading-relaxed">
              فلسفه‌ی شکل‌گیری سروین استودیو، پیوند میان سه مفهوم بنیادین در معماری روح و هنر ایرانی است.
            </p>
          </Reveal>
        </div>

        <div className="max-w-[1320px] mx-auto px-5 sm:px-6 grid md:grid-cols-3 gap-6 sm:gap-8">
          {[
            { title: "استواریِ سرو", desc: "نماد اصالت، ایستادگی و ریشه‌های محکمی که در هر قطعه طلای خالص ۱۸ عیار متجلی شده است." },
            { title: "امنیتِ سایه", desc: "پناهی امن از همراهی و ضمانت اصالت؛ آرامشی که هنگام انتخاب یک اثر ماندگار تجربه می‌کنید." },
            { title: "ستایشِ زیبایی", desc: "تقدیر از هنر دست و زیبایی‌شناسی ناب در طراحی‌های مینیمال، اختصاصی و بی‌زمان." }
          ].map((item, idx) => (
            <Reveal key={item.title} delay={idx * 0.1}>
              <div className="bg-[#FAF9F6] p-6 sm:p-8 rounded-3xl border border-[#8B263E]/20 h-full flex flex-col justify-between text-right shadow-xs">
                <div>
                  <div className="w-10 h-10 rounded-full bg-[#8B263E] text-white flex items-center justify-center font-bold text-sm mb-4 sm:mb-6 shadow-xs">۰{idx + 1}</div>
                  <h3 className="text-base sm:text-lg font-bold text-[#1C3324] mb-2 sm:mb-3">{item.title}</h3>
                  <p className="text-[#3A5A46] text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 
        =====================================================
        GIFTING & LIFESTYLE 
        ===================================================== 
      */}
      <section className="py-16 sm:py-24 border-b border-[#1C3324]/10 bg-[#FAF9F6]">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            
            <Reveal className="grid grid-cols-2 gap-4 h-[400px] sm:h-[480px]">
              <div className="bg-white rounded-[2rem] border border-[#8B263E]/20 overflow-hidden relative group cursor-pointer shadow-xs hover:shadow-md transition-shadow">
                <div className="absolute inset-0 flex items-center justify-center text-[#1C3324]/50 flex-col gap-2.5 group-hover:scale-105 transition-transform duration-500">
                  <InstagramIcon size={32} />
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#1C3324]">Sarvin Studio Life</span>
                </div>
              </div>
              <div className="grid grid-rows-2 gap-4">
                <div className="bg-white rounded-[2rem] border border-[#8B263E]/20 flex items-center justify-center text-[#1C3324]/40 hover:bg-[#8B263E]/5 transition-colors shadow-xs"><Gem size={38} /></div>
                <div className="bg-white rounded-[2rem] border border-[#8B263E]/20 flex items-center justify-center text-[#1C3324]/40 hover:bg-[#8B263E]/5 transition-colors shadow-xs"><Sparkles size={38} /></div>
              </div>
            </Reveal>

            <Reveal delay={0.2} className="flex flex-col justify-center">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[#8B263E] uppercase tracking-widest mb-3.5 bg-white px-3.5 py-1.5 rounded-full w-fit border border-[#8B263E]/20 shadow-xs">
                <Gift size={15} /> The Art of Gifting
              </span>
              <h2 className="text-2.5rem sm:text-3xl md:text-4xl font-extrabold leading-tight text-[#1C3324] mb-4 sm:mb-5">
                پناهی از جنس عشق، <br/>هدیه‌ای برای ماندگاری.
              </h2>
              <p className="text-[#3A5A46] text-xs sm:text-base leading-relaxed max-w-md mb-6 sm:mb-8">
                در فلسفه‌ی سروین، هدیه دادن تنها یک پیشکش نیست؛ بلکه بازتابی از «سایه» امنِ همراهی و «ستایش» حضور یک انسان خاص در زندگی شماست. تمامی آثار با بسته‌بندی انحصاری استودیو آماده تقدیم می‌شوند.
              </p>
              
              <div className="flex flex-col gap-3.5">
                <Link href="/products?filter=gifts" className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-[#8B263E]/20 hover:border-[#8B263E] transition-all bg-white shadow-xs hover:shadow-sm">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#1C3324] mb-0.5 group-hover:text-[#8B263E] transition-colors">آثار ظریف زیر ۱۰ میلیون تومان</h3>
                    <p className="text-[11px] sm:text-xs text-[#3A5A46]">انتخاب‌هایی لطیف برای ابراز عشق و قدردانی.</p>
                  </div>
                  <ArrowLeft size={18} className="text-[#8B263E] opacity-70 group-hover:opacity-100 group-hover:-translate-x-1 transition-all shrink-0" />
                </Link>
                <Link href="/products?filter=bestsellers" className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-[#8B263E]/20 hover:border-[#8B263E] transition-all bg-white shadow-xs hover:shadow-sm">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#1C3324] mb-0.5 group-hover:text-[#8B263E] transition-colors">محبوب‌ترین‌های استودیو</h3>
                    <p className="text-[11px] sm:text-xs text-[#3A5A46]">پرهوادارترین قطعاتی که نام سروین را جاودانه کرده‌اند.</p>
                  </div>
                  <ArrowLeft size={18} className="text-[#8B263E] opacity-70 group-hover:opacity-100 group-hover:-translate-x-1 transition-all shrink-0" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 
        =====================================================
        MATERIALS & PROMISE 
        ===================================================== 
      */}
      <section id="promise" className="bg-white py-16 sm:py-24 md:py-32 border-b border-[#1C3324]/10">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-6 grid md:grid-cols-12 gap-10 md:gap-6 items-center">
          <div className="md:col-span-5 flex flex-col justify-center">
            <Reveal>
              <h2 className="text-2.5rem sm:text-3xl md:text-5xl font-extrabold leading-[1.25] text-[#1C3324] mb-4 sm:mb-5">
                فراتر از <br />یک قطعه طلا
              </h2>
              <p className="text-[#3A5A46] text-sm md:text-lg leading-relaxed max-w-sm mb-6 sm:mb-7">
                ساخته شده با دست، برای ماندن و تعویض نشدن.
              </p>
              <Link href="/story" className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#8B263E] hover:text-[#1C3324] transition-colors border-b border-[#8B263E]/30 pb-1 hover:border-[#1C3324]">
                داستان کامل برند ما را بخوانید <ArrowLeft size={15} />
              </Link>
            </Reveal>
          </div>
          
          <div className="md:col-span-6 md:col-start-7 flex flex-col justify-center">
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-8 sm:gap-y-10">
              {[
                { Icon: ShieldCheck, title: "طلای خالص ۱۸ عیار", text: "بدون آبکاری و ناخالصی. ریخته‌گری و پولیش شده با دست." },
                { Icon: Gem, title: "سنگ‌های شناسنامه‌دار", text: "همراه با شناسنامه‌ای که داستان اصالت سنگ را روایت می‌کند." },
                { Icon: Heart, title: "طراحی بی‌زمان", text: "زیبایی در سادگی است. طراحی‌هایی برای همیشه." },
                { Icon: Sparkles, title: "بسته‌بندی لوکس", text: "آماده برای هدیه دادن و ثبت یک لحظه فراموش‌نشدنی." }
              ].map(({ Icon, title, text }, i) => (
                <Reveal key={title} delay={i * 0.1} as="li">
                  <div className="w-12 h-12 rounded-2xl border border-[#8B263E]/20 flex justify-center items-center mb-4 bg-[#FAF9F6] shadow-xs text-[#8B263E]">
                    <Icon size={22} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-base font-bold text-[#1C3324] mb-1.5">{title}</h3>
                  <p className="text-[#3A5A46] text-xs sm:text-sm leading-relaxed">{text}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

    </div>
  );
}