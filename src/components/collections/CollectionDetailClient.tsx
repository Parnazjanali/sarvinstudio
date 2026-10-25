"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  ArrowLeft, 
  ChevronLeft, 
  CreditCard, 
  Gem, 
  Scale, 
  ShieldCheck, 
  SlidersHorizontal,
  ChevronDown
} from "lucide-react";

import { roundPrice } from "@/lib/format";
import type { ProductItem } from "@/lib/products";
import { getProductKarat, getProductWeight, getProductCreatedTime } from "@/lib/products";
import { calcProductPrice, getGoldGramPrice } from "@/lib/product-detail";
import ProductCard from "@/components/ProductCard";

export type ExclusiveCollection = {
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

type Props = {
  collection: ExclusiveCollection;
  products: ProductItem[];
  otherCollections: ExclusiveCollection[];
};

type SortOption = "newest" | "price_asc" | "price_desc" | "weight_asc" | "weight_desc";

export default function CollectionDetailClient({
  collection,
  products: initialProducts,
  otherCollections,
}: Props) {
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [goldGramPrice, setGoldGramPrice] = useState<number | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [goldPriceError, setGoldPriceError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadGoldPrice() {
      setIsLoadingPrices(true);
      setGoldPriceError(false);
      try {
        const price = await getGoldGramPrice();
        if (cancelled) return;
        if (Number.isFinite(price) && price > 0) setGoldGramPrice(price);
        else setGoldPriceError(true);
      } catch (error) {
        if (!cancelled) setGoldPriceError(true);
      } finally {
        if (!cancelled) setIsLoadingPrices(false);
      }
    }
    void loadGoldPrice();
    return () => { cancelled = true; };
  }, []);

  const calculatedPrices = useMemo(() => {
    const nextPrices: Record<string, number> = {};
    if (!goldGramPrice || goldGramPrice <= 0) return nextPrices;

    for (const product of initialProducts) {
      const productKarat = getProductKarat(product);
      const priceInfo = calcProductPrice({
        weight: getProductWeight(product),
        karat: productKarat > 0 ? productKarat : 18,
        wage_percent: typeof product.wage_percent === "number" ? product.wage_percent : 0,
        profit_percent: typeof product.profit_percent === "number" ? product.profit_percent : 0,
        tax_percent: typeof product.tax_percent === "number" ? product.tax_percent : 0,
      }, goldGramPrice);

      if (priceInfo && Number.isFinite(priceInfo.total) && priceInfo.total > 0) {
        nextPrices[product.id] = roundPrice(priceInfo.total);
      }
    }
    return nextPrices;
  }, [initialProducts, goldGramPrice]);

  const getDisplayProductPrice = (product: ProductItem): number | null => {
    const price = calculatedPrices[product.id];
    return typeof price === "number" && price > 0 ? price : null;
  };

  const sortedProducts = useMemo(() => {
    return [...initialProducts].sort((a, b) => {
      const priceA = getDisplayProductPrice(a);
      const priceB = getDisplayProductPrice(b);
      const weightA = getProductWeight(a);
      const weightB = getProductWeight(b);

      if (sortBy === "price_asc") return (priceA || Infinity) - (priceB || Infinity);
      if (sortBy === "price_desc") return (priceB || 0) - (priceA || 0);
      if (sortBy === "weight_asc") return weightA - weightB;
      if (sortBy === "weight_desc") return weightB - weightA;
      return getProductCreatedTime(b) - getProductCreatedTime(a);
    });
  }, [initialProducts, sortBy, calculatedPrices]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#FCFCFA] dark:bg-[#101813] text-[#1C3324] dark:text-zinc-100 font-sans pb-28 pt-36 sm:pt-44 lg:pt-48 transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
          <Link href="/" className="hover:text-[#8B263E] transition-colors">خانه</Link>
          <span>/</span>
          <Link href="/collections" className="hover:text-[#8B263E] transition-colors">کالکشن‌های اختصاصی</Link>
          <span>/</span>
          <span className="text-[#1C3324] dark:text-white">{collection.title}</span>
        </nav>

        {/* Hero Banner for Collection */}
        <div className="relative mb-14 overflow-hidden rounded-[2.5rem] border border-[#1C3324]/10 dark:border-white/10 bg-white dark:bg-[#15221B] shadow-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            
            {/* Story & Info Side */}
            <div className="lg:col-span-7 p-8 sm:p-12 lg:p-14 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#8B263E]/10 dark:bg-[#D8B65C]/15 px-4 py-1.5 text-xs font-black text-[#8B263E] dark:text-[#D8B65C] mb-4 border border-[#8B263E]/20">
                  <Sparkles size={14} />
                  <span>شاهکار اختصاصی پرنا زر</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1C3324] dark:text-white tracking-tight font-heading leading-tight mb-3">
                  {collection.title}
                </h1>

                {collection.subtitle && (
                  <p className="text-base sm:text-lg font-bold text-[#8B263E] dark:text-[#D8B65C] mb-6">
                    {collection.subtitle}
                  </p>
                )}

                <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-[#3A5A46] dark:text-zinc-300 font-medium text-justify">
                  {collection.story ? (
                    <p>{collection.story}</p>
                  ) : (
                    <p>{collection.description}</p>
                  )}
                  {collection.description && collection.story && (
                    <p className="text-[13px] opacity-90">{collection.description}</p>
                  )}
                </div>
              </div>

              {/* Highlights in Hero */}
              <div className="mt-8 pt-6 border-t border-[#1C3324]/10 dark:border-white/10 flex flex-wrap items-center gap-4 text-xs font-bold text-[#1C3324] dark:text-zinc-200">
                <span className="flex items-center gap-1.5 bg-[#FAF9F6] dark:bg-[#101813] px-3.5 py-2 rounded-xl border border-[#1C3324]/5">
                  <Scale size={15} className="text-[#8B263E] dark:text-[#D8B65C]" />
                  <span>طلای ۱۸ عیار (۷۵۰)</span>
                </span>
                <span className="flex items-center gap-1.5 bg-[#FAF9F6] dark:bg-[#101813] px-3.5 py-2 rounded-xl border border-[#1C3324]/5">
                  <CreditCard size={15} className="text-[#8B263E] dark:text-[#D8B65C]" />
                  <span>۳ قسط طلایی با قیمت روز</span>
                </span>
                <span className="flex items-center gap-1.5 bg-[#FAF9F6] dark:bg-[#101813] px-3.5 py-2 rounded-xl border border-[#1C3324]/5">
                  <ShieldCheck size={15} className="text-[#8B263E] dark:text-[#D8B65C]" />
                  <span>شناسنامه و ضمانت مادام‌العمر</span>
                </span>
              </div>
            </div>

            {/* Visual Cover Side */}
            <div className="lg:col-span-5 relative min-h-[300px] lg:min-h-full overflow-hidden bg-[#FAF9F6] dark:bg-[#101813]">
              <img
                src={collection.image || "/banner.webp"}
                alt={collection.title}
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:hidden" />
              <div className="absolute bottom-4 right-4 lg:hidden">
                <span className="rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-bold text-white">
                  {sortedProducts.length.toLocaleString("fa-IR")} اثر فاخر
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Products Section Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 bg-white dark:bg-[#15221B] px-6 py-4 rounded-2xl border border-[#1C3324]/10 dark:border-white/10 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#1C3324] dark:text-white font-heading m-0">
              آثار و قطعات {collection.title}
            </h2>
            <p className="text-xs text-[#3A5A46] dark:text-zinc-400 mt-1">
              مجموعاً {sortedProducts.length.toLocaleString("fa-IR")} قطعه طراحی‌شده در این کالکشن
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#3A5A46] dark:text-zinc-400 font-bold hidden sm:inline">مرتب‌سازی:</span>
            <div className="relative inline-block">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="py-2 pl-7 pr-3 rounded-xl border border-[#1C3324]/10 dark:border-white/10 bg-[#FAF9F6] dark:bg-[#101813] text-[#1C3324] dark:text-zinc-200 text-xs font-bold outline-none focus:border-[#8B263E] cursor-pointer appearance-none"
              >
                <option value="newest">جدیدترین</option>
                <option value="price_asc">ارزان‌ترین</option>
                <option value="price_desc">گران‌ترین</option>
                <option value="weight_asc">سبک‌ترین</option>
                <option value="weight_desc">سنگین‌ترین</option>
              </select>
              <ChevronDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#3A5A46] dark:text-zinc-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {sortedProducts.length === 0 ? (
          <div className="bg-white dark:bg-[#15221B] border border-dashed border-[#1C3324]/20 dark:border-white/10 rounded-3xl py-16 px-6 text-center shadow-xs mb-16">
            <p className="text-base sm:text-lg font-bold text-[#1C3324] dark:text-white mb-2">
              قطعات این کالکشن به زودی به ویترین افزوده می‌شوند.
            </p>
            <p className="text-xs text-[#3A5A46] dark:text-zinc-400 mb-6">
              جهت سفارش اختصاصی قطعات کالکشن {collection.title} با پشتیبانی گالری در ارتباط باشید.
            </p>
            <Link
              href="/products"
              className="inline-block bg-[#1C3324] dark:bg-[#D8B65C] text-white dark:text-[#101813] rounded-xl px-6 py-2.5 font-bold text-xs shadow-md hover:bg-[#8B263E] transition-colors"
            >
              مشاهده تمامی آثار گالری
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 mb-20">
            {sortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                productPrice={getDisplayProductPrice(product)}
                isLoadingPrices={isLoadingPrices}
                goldPriceError={goldPriceError}
              />
            ))}
          </div>
        )}

        {/* Other Exclusive Collections Section */}
        {otherCollections.length > 0 && (
          <div className="mt-16 pt-12 border-t border-[#1C3324]/10 dark:border-white/10">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-[#1C3324] dark:text-white font-heading">
                  سایر کالکشن‌های اختصاصی
                </h3>
                <p className="text-xs text-[#3A5A46] dark:text-zinc-400 mt-1">
                  کالکشن‌های دیگر پرنا زر را کشف کنید
                </p>
              </div>

              <Link
                href="/collections"
                className="text-xs font-bold text-[#8B263E] dark:text-[#D8B65C] hover:underline flex items-center gap-1"
              >
                <span>مشاهده همه کالکشن‌ها</span>
                <ChevronLeft size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {otherCollections.map((col) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.slug}`}
                  className="group relative flex flex-col rounded-2xl border border-[#1C3324]/10 dark:border-white/10 bg-white dark:bg-[#15221B] p-4 shadow-xs transition hover:border-[#8B263E]/40 hover:shadow-lg dark:hover:border-[#D8B65C]/40"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-[#FAF9F6] dark:bg-[#101813] mb-3">
                    <img
                      src={col.image || "/header.webp"}
                      alt={col.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
                    />
                  </div>
                  <h4 className="text-sm font-black text-[#1C3324] dark:text-white font-heading">
                    {col.title}
                  </h4>
                  {col.subtitle && (
                    <p className="text-[11px] font-bold text-[#8B263E] dark:text-[#D8B65C] mt-0.5 line-clamp-1">
                      {col.subtitle}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
