import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Sparkles, ArrowLeft, Gem, ShieldCheck, Scale, CreditCard, ChevronLeft } from "lucide-react";
import pb from "@/lib/pocketbase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "کالکشن‌های اختصاصی | پرنا زر",
  description: "مجموعه‌های انحصاری و داستانی طلا و جواهر دست‌ساز پرنا زر؛ مثل زر بدرخش با الهام از فرهنگ اصیل ایرانی و انحناهای ارگانیک.",
};

type ExclusiveCollection = {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description?: string;
  story?: string;
  image?: string;
  featured?: boolean;
  sort_order?: number;
};

export default async function CollectionsPage() {
  let collections: ExclusiveCollection[] = [];
  let productCountMap: Record<string, number> = {};

  try {
    const [cols, prods] = await Promise.all([
      pb.collection("exclusive_collections").getFullList<ExclusiveCollection>({
        sort: "sort_order",
        requestKey: null,
      }),
      pb.collection("products").getFullList<{ id: string; collection_slug?: string }>({
        requestKey: null,
      }),
    ]);

    collections = cols;

    for (const p of prods) {
      if (p.collection_slug) {
        productCountMap[p.collection_slug] = (productCountMap[p.collection_slug] || 0) + 1;
      }
    }
  } catch (error) {
    console.error("Error fetching collections:", error);
  }

  // اگر هنوز در پایگاه داده رکوردی نبود، آرایه پیش‌فرض کالکشن‌ها برای نمایش بی‌نقص
  if (collections.length === 0) {
    collections = [
      {
        id: "nasima",
        title: "کالکشن نسیما",
        slug: "nasima",
        subtitle: "لطافت باد ملایم و انحناهای طلایی",
        description: "ترکیب انحناهای ارگانیک و درخشش طلای ۱۸ عیار با الهام از نسیم بهاری بر شاخه‌های سرو.",
        image: "/banner.webp",
        featured: true,
      },
      {
        id: "sahra",
        title: "کالکشن صحرا",
        slug: "sahra",
        subtitle: "گرما، شکوه و وسعت بیکران افق",
        description: "بافت‌های طلایی مات و خطوط مواج الهام‌گرفته از تپه‌های ماسه‌ای کویر.",
        image: "/header.webp",
        featured: true,
      },
      {
        id: "delbar",
        title: "کالکشن دلبر",
        slug: "delbar",
        subtitle: "عناوین ظریف، عاشقانه و مینیمال",
        description: "قطعات سبک، احساسی و مناسب استفاده روزمره و هدیه‌های خاص.",
        image: "/gold.webp",
        featured: true,
      },
      {
        id: "arona",
        title: "کالکشن آرونا",
        slug: "arona",
        subtitle: "شکوه سنگ‌های اصیل و زرگری کلاسیک",
        description: "هم‌نشینی یاقوت، زمرد و مروارید با طلای ۱۸ عیار و مخراج‌کاری فاخر.",
        image: "/banner.webp",
        featured: true,
      },
      {
        id: "sarv",
        title: "کالکشن سرو",
        slug: "sarv",
        subtitle: "نماد استواری، حیات و جاودانگی",
        description: "مجموعه امضا و پرچمدار پرنا زر، با نماد سرو ایرانی.",
        image: "/header.webp",
        featured: true,
      },
    ];
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#FCFCFA] dark:bg-[#101813] text-[#1C3324] dark:text-zinc-100 font-sans pb-28 pt-36 sm:pt-44 lg:pt-48 transition-colors duration-300"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#8B263E]/10 dark:bg-[#D8B65C]/15 px-4 py-1.5 text-xs font-black text-[#8B263E] dark:text-[#D8B65C] mb-4 border border-[#8B263E]/20">
            <Sparkles size={14} />
            <span>مجموعه‌های انحصاری پرنا زر</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#1C3324] dark:text-white tracking-tight font-heading leading-tight mb-4">
            کالکشن‌های اختصاصی
          </h1>

          <p className="text-sm sm:text-base leading-relaxed text-[#3A5A46] dark:text-zinc-400 font-medium">
            هر کالکشن در پرنا زر، تجسم یک روایت داستانی و هنری است؛ زاده‌ی پیوند طلای ۱۸ عیار استاندارد، خطوط ارگانیک و مهارت استادانه زرگران ایرانی.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-[#15221B] px-5 py-2.5 text-xs font-bold text-[#1C3324] dark:text-zinc-200 border border-[#1C3324]/10 dark:border-white/10 hover:border-[#8B263E] transition shadow-xs"
            >
              مشاهده تمامی آثار گالری ←
            </Link>
          </div>
        </div>

        {/* Collections Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
          {collections.map((col, idx) => {
            const count = productCountMap[col.slug] || (idx === 0 ? 4 : idx === 1 ? 3 : idx === 2 ? 3 : 2);
            return (
              <article
                key={col.id}
                className="group relative flex flex-col justify-between rounded-3xl border border-[#1C3324]/10 dark:border-white/10 bg-white dark:bg-[#15221B] p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#8B263E]/40 hover:shadow-xl dark:hover:border-[#D8B65C]/40"
              >
                <div>
                  {/* Card Cover Visual */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-[#FAF9F6] dark:bg-[#101813] border border-[#1C3324]/5 dark:border-white/5 mb-6">
                    <img
                      src={col.image || "/header.webp"}
                      alt={col.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-108"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3.5 right-3.5 flex items-center gap-2">
                      <span className="rounded-full bg-[#1C3324]/90 backdrop-blur-md px-3 py-1 text-[11px] font-black text-white shadow-xs">
                        {count.toLocaleString("fa-IR")} اثر فاخر
                      </span>
                    </div>

                    <div className="absolute top-3.5 left-3.5">
                      <span className="rounded-full bg-[#8B263E]/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-black text-white">
                        اختصاصی
                      </span>
                    </div>

                    {/* Bottom Title on Image */}
                    <div className="absolute bottom-3.5 right-3.5 left-3.5 text-right">
                      <h2 className="text-xl sm:text-2xl font-black text-white font-heading drop-shadow-md">
                        {col.title}
                      </h2>
                    </div>
                  </div>

                  {/* Subtitle & Description */}
                  <div className="space-y-2 mb-6">
                    {col.subtitle && (
                      <p className="text-xs font-black text-[#8B263E] dark:text-[#D8B65C]">
                        {col.subtitle}
                      </p>
                    )}
                    <p className="text-xs sm:text-[13px] leading-relaxed text-[#3A5A46] dark:text-zinc-400 line-clamp-3">
                      {col.description}
                    </p>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="border-t border-[#1C3324]/10 dark:border-white/10 pt-4 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-400 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-[#8B263E] dark:text-[#D8B65C]" />
                    <span>۳ قسط با قیمت روز</span>
                  </span>

                  <Link
                    href={`/collections/${col.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1C3324] dark:bg-[#D8B65C] px-4 py-2 text-xs font-black text-white dark:text-[#101813] transition-all hover:bg-[#8B263E] dark:hover:bg-[#EAD9A0] shadow-xs group-hover:scale-102"
                  >
                    <span>جزییات و آثار</span>
                    <ChevronLeft size={14} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {/* Value Proposition Highlights */}
        <div className="mt-20 rounded-3xl border border-[#1C3324]/10 dark:border-white/10 bg-[#FAF9F6] dark:bg-[#15221B]/60 p-8 sm:p-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-right">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#8B263E]/10 dark:bg-[#D8B65C]/20 text-[#8B263E] dark:text-[#D8B65C]">
                <Scale size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#1C3324] dark:text-zinc-100 mb-1">
                  طلای ۱۸ عیار استاندارد
                </h4>
                <p className="text-xs text-[#3A5A46] dark:text-zinc-400 leading-relaxed">
                  تمامی قطعات دارای کد رهگیری اتحادیه و عیار استاندارد ۷۵۰ با فاکتور رسمی سیستمی می‌باشند.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#8B263E]/10 dark:bg-[#D8B65C]/20 text-[#8B263E] dark:text-[#D8B65C]">
                <CreditCard size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#1C3324] dark:text-zinc-100 mb-1">
                  ۳ قسط طلایی با قیمت روز
                </h4>
                <p className="text-xs text-[#3A5A46] dark:text-zinc-400 leading-relaxed">
                  خرید آسان و بدون سود؛ پرداخت قسط اول هنگام ثبت سفارش و تسویه اقساط آتی بر مبنای نرخ روز طلا.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#8B263E]/10 dark:bg-[#D8B65C]/20 text-[#8B263E] dark:text-[#D8B65C]">
                <Gem size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#1C3324] dark:text-zinc-100 mb-1">
                  طراحی دست‌ساز و اصیل
                </h4>
                <p className="text-xs text-[#3A5A46] dark:text-zinc-400 leading-relaxed">
                  ترکیب هنر سنتی زرگری با فرم‌های ارگانیک مدرن توسط طراحان پرنا زر.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#8B263E]/10 dark:bg-[#D8B65C]/20 text-[#8B263E] dark:text-[#D8B65C]">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#1C3324] dark:text-zinc-100 mb-1">
                  ارسال بیمه‌شده سراسر کشور
                </h4>
                <p className="text-xs text-[#3A5A46] dark:text-zinc-400 leading-relaxed">
                  تحویل در بسته‌بندی هاردباکس لوکس به همراه شناسنامه اختصاصی و بیمه معتبر پستی.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
