"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Filter, SlidersHorizontal, X } from "lucide-react";

import { CATEGORIES } from "@/lib/constants";
import { formatPrice, roundPrice } from "@/lib/format";
import type { ProductColor, ProductItem } from "@/lib/products";
import {
  getProductColor,
  getProductCreatedTime,
  getProductDescription,
  getProductName,
  getProductKarat,
  getProductWeight,
} from "@/lib/products";
import { calcProductPrice, getGoldGramPrice } from "@/lib/product-detail";

import ProductCard from "./ProductCard";
import ProductFilters from "./ProductFilters";

type Props = {
  initialProducts: ProductItem[];
};

type SortOption = "newest" | "price_asc" | "price_desc" | "weight_asc" | "weight_desc";

export default function ProductsPageClient({ initialProducts }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedColor, setSelectedColor] = useState<"all" | ProductColor | string>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minWeight, setMinWeight] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [priceRange, setPriceRange] = useState("all");
  const [weightRange, setWeightRange] = useState("all");
  const [isGiftFilter, setIsGiftFilter] = useState(false);

  const [inStockOnly, setInStockOnly] = useState(false);
  const [snappPayOnly, setSnappPayOnly] = useState(false);
  const [selectedOccasion, setSelectedOccasion] = useState("all");
  
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const [goldGramPrice, setGoldGramPrice] = useState<number | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [goldPriceError, setGoldPriceError] = useState(false);

  const products = useMemo(() => initialProducts, [initialProducts]);

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

    for (const product of products) {
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
  }, [products, goldGramPrice]);

  const getDisplayProductPrice = (product: ProductItem): number | null => {
    const price = calculatedPrices[product.id];
    return typeof price === "number" && price > 0 ? price : null;
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedColor("all");
    setMinPrice("");
    setMaxPrice("");
    setMinWeight("");
    setMaxWeight("");
    setPriceRange("all");
    setWeightRange("all");
    setIsGiftFilter(false);
    setInStockOnly(false);
    setSnappPayOnly(false);
    setSelectedOccasion("all");
    setSortBy("newest");
  };

  const filteredProducts = useMemo(() => {
    const search = searchQuery.trim().toLocaleLowerCase("fa-IR");
    const pMinPrice = minPrice !== "" ? Number(minPrice) : null;
    const pMaxPrice = maxPrice !== "" ? Number(maxPrice) : null;
    const pMinWeight = minWeight !== "" ? Number(minWeight) : null;
    const pMaxWeight = maxWeight !== "" ? Number(maxWeight) : null;

    return products
      .filter((product) => {
        if (search) {
          const name = getProductName(product).toLocaleLowerCase("fa-IR");
          const desc = getProductDescription(product).toLocaleLowerCase("fa-IR");
          if (!name.includes(search) && !desc.includes(search)) return false;
        }

        if (selectedCategory !== "all") {
          const catField = product.category;
          const typeField = String(product.type || "").trim().toLowerCase();
          const targetCat = selectedCategory.toLowerCase();

          let matchesCat = false;
          if (Array.isArray(catField)) {
            matchesCat = catField.some(id => String(id).toLowerCase() === targetCat || id === selectedCategory);
          } else if (typeof catField === "string") {
            matchesCat = catField.trim().toLowerCase() === targetCat;
          }

          const matchesType = typeField === targetCat;
          const categoryObj = CATEGORIES.find(c => c.key === selectedCategory);
          const matchesLabel = categoryObj ? getProductName(product).toLowerCase().includes(categoryObj.label.toLowerCase()) : false;

          if (!matchesCat && !matchesType && !matchesLabel) return false;
        }

        // فیلتر رنگ طلا با در نظر گرفتن «زرد» به عنوان پیش‌فرض در صورت خالی بودن رنگ در دیتابیس
        if (selectedColor !== "all") {
          const prodColor = getProductColor(product) || "زرد";
          if (prodColor !== selectedColor) return false;
        }

        if (isGiftFilter) {
          const tag = String(product.tag || "").toLowerCase();
          const desc = String(product.description || "").toLowerCase();
          if (!tag.includes("gift") && !tag.includes("کادو") && !desc.includes("کادو")) return false;
        }

        if (inStockOnly) {
          const stock = Number(product.stock ?? 1);
          if (stock <= 0) return false;
        }

        if (selectedOccasion !== "all") {
          const desc = String(product.description || "").toLowerCase();
          const tag = String(product.tag || "").toLowerCase();
          const name = getProductName(product).toLowerCase();
          
          if (selectedOccasion === "baby") {
            if (!desc.includes("کودک") && !desc.includes("نوزاد") && !name.includes("کودک") && !name.includes("نوزاد") && !tag.includes("baby")) return false;
          } else {
            if (!desc.includes(selectedOccasion) && !tag.includes(selectedOccasion)) return false;
          }
        }

        const price = getDisplayProductPrice(product);
        if (pMinPrice !== null && pMaxPrice !== null) {
          if (price === null || price < pMinPrice || price > pMaxPrice) return false;
        }

        const weight = getProductWeight(product);
        if (pMinWeight !== null && pMaxWeight !== null) {
          if (weight < pMinWeight || weight > pMaxWeight) return false;
        }

        return true;
      })
      .sort((a, b) => {
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
  }, [products, searchQuery, selectedCategory, selectedColor, minPrice, maxPrice, minWeight, maxWeight, priceRange, weightRange, isGiftFilter, inStockOnly, snappPayOnly, selectedOccasion, sortBy, calculatedPrices]);

  const hasActiveFilters = searchQuery !== "" || selectedCategory !== "all" || selectedColor !== "all" || priceRange !== "all" || weightRange !== "all" || isGiftFilter || inStockOnly || snappPayOnly || selectedOccasion !== "all";

  const filterProps = {
    searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, 
    selectedColor, setSelectedColor,
    minPrice, setMinPrice, maxPrice, setMaxPrice, minWeight, setMinWeight, maxWeight, setMaxWeight,
    hasActiveFilters, onReset: handleResetFilters, priceRange, setPriceRange, weightRange, setWeightRange, 
    isGiftFilter, setIsGiftFilter, inStockOnly, setInStockOnly, snappPayOnly, setSnappPayOnly, selectedOccasion, setSelectedOccasion
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#FAF9F6] text-[#1C3324] font-sans pb-24 pt-32 sm:pt-40">
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header & Category Pills */}
        <div className="mb-8 sm:mb-10">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 sm:mb-8">
            <div>
              <span className="text-[10px] sm:text-xs font-bold text-[#8B263E] tracking-widest uppercase mb-1.5 sm:mb-2 block">Sarvin Studio Gallery</span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1C3324] m-0 mb-1">
                {selectedCategory === "all" ? "تمامی آثار استودیو" : CATEGORIES.find(c => c.key === selectedCategory)?.label || "گالری"}
              </h1>
              <p className="text-[#3A5A46] text-xs sm:text-sm font-medium">خرید آنلاین و اقساطی جواهرات دست‌ساز از استودیو سروین</p>
            </div>
            <Link href="/" className="inline-flex items-center gap-2 text-[#8B263E] font-bold text-xs sm:text-[13px] bg-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-[#1C3324]/15 hover:border-[#8B263E] transition-all w-fit shadow-xs">
              <ArrowLeft size={15} /> بازگشت به صفحه اصلی
            </Link>
          </div>

          <div className="flex flex-row-reverse items-center justify-end gap-2 overflow-x-auto pb-3 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-[14px] font-bold whitespace-nowrap transition-all duration-300 cursor-pointer shrink-0 ${
                    isActive ? "bg-[#1C3324] text-white shadow-md scale-105" : "bg-white text-[#3A5A46] border border-[#1C3324]/15 hover:border-[#8B263E] hover:text-[#1C3324]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-6 sm:mb-8 bg-white p-3.5 sm:p-4 rounded-3xl border border-[#1C3324]/15 shadow-xs text-xs">
            <span className="font-bold text-[#3A5A46] ml-2">فیلترهای فعال:</span>
            
            {selectedCategory !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FAF9F6] border border-[#8B263E]/30 text-[#8B263E] rounded-full font-bold">
                دسته: {CATEGORIES.find(c => c.key === selectedCategory)?.label}
                <button onClick={() => setSelectedCategory("all")} className="hover:text-red-500 cursor-pointer"><X size={14} /></button>
              </span>
            )}

            {inStockOnly && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FAF9F6] border border-[#8B263E]/30 text-[#8B263E] rounded-full font-bold">
                آماده ارسال
                <button onClick={() => setInStockOnly(false)} className="hover:text-red-500 cursor-pointer"><X size={14} /></button>
              </span>
            )}

            {snappPayOnly && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FAF9F6] border border-[#8B263E]/30 text-[#8B263E] rounded-full font-bold">
                خرید اقساطی
                <button onClick={() => setSnappPayOnly(false)} className="hover:text-red-500 cursor-pointer"><X size={14} /></button>
              </span>
            )}

            {selectedOccasion !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FAF9F6] border border-[#8B263E]/30 text-[#8B263E] rounded-full font-bold">
                مخاطب/مناسبت
                <button onClick={() => setSelectedOccasion("all")} className="hover:text-red-500 cursor-pointer"><X size={14} /></button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FAF9F6] border border-[#8B263E]/30 text-[#8B263E] rounded-full font-bold">
                جستجو: {searchQuery}
                <button onClick={() => setSearchQuery("")} className="hover:text-red-500 cursor-pointer"><X size={14} /></button>
              </span>
            )}

            {selectedColor !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FAF9F6] border border-[#8B263E]/30 text-[#8B263E] rounded-full font-bold">
                رنگ: {selectedColor}
                <button onClick={() => setSelectedColor("all")} className="hover:text-red-500 cursor-pointer"><X size={14} /></button>
              </span>
            )}

            {isGiftFilter && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FAF9F6] border border-[#8B263E]/30 text-[#8B263E] rounded-full font-bold">
                مخصوص هدیه
                <button onClick={() => setIsGiftFilter(false)} className="hover:text-red-500 cursor-pointer"><X size={14} /></button>
              </span>
            )}

            <button onClick={handleResetFilters} className="text-red-600 font-bold mr-auto hover:underline cursor-pointer">
              حذف همه فیلترها
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="relative z-20 flex justify-between items-center mb-6 sm:mb-10 bg-white px-4 sm:px-6 py-3.5 sm:py-4 rounded-3xl border border-[#1C3324]/15 shadow-xs">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileFilterOpen(true)} className="lg:hidden flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-[#8B263E]/30 bg-[#FAF9F6] text-[#8B263E] font-bold text-xs cursor-pointer">
              <Filter size={14} /> فیلترها
            </button>
            <span className="text-xs sm:text-sm text-[#3A5A46] font-bold">
              تعداد آثار: <span className="text-[#1C3324]">{filteredProducts.length.toLocaleString("fa-IR")}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-[#3A5A46] font-bold hidden sm:inline">مرتب‌سازی:</span>
            <div className="relative inline-block">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as SortOption)} 
                className="py-2.5 pl-8 pr-3.5 sm:pl-9 sm:pr-4 rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] text-[#1C3324] text-xs sm:text-sm font-bold outline-none focus:border-[#8B263E] cursor-pointer appearance-none w-full"
              >
                <option value="newest">جدیدترین</option>
                <option value="price_asc">ارزان‌ترین</option>
                <option value="price_desc">گران‌ترین</option>
                <option value="weight_asc">سبک‌ترین</option>
                <option value="weight_desc">سنگین‌ترین</option>
              </select>
              <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1C3324] pointer-events-none opacity-70" />
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start">
          
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block bg-white border border-[#1C3324]/15 rounded-3xl p-6 shadow-xs sticky top-40">
            <div className="flex items-center gap-2 font-bold text-[15px] text-[#1C3324] mb-6 pb-4 border-b border-[#1C3324]/15">
              <SlidersHorizontal size={18} className="text-[#8B263E]" />
              <span>فیلترهای هوشمند</span>
            </div>
            <ProductFilters {...filterProps} />
          </aside>

          {/* Products Grid */}
          <div className="min-w-0">
            {filteredProducts.length === 0 ? (
              <div className="bg-white border border-dashed border-[#1C3324]/25 rounded-3xl py-16 px-6 text-center shadow-xs">
                <p className="text-lg sm:text-xl font-bold text-[#1C3324] mb-2">اثری با این ویژگی‌ها یافت نشد!</p>
                <p className="text-xs sm:text-sm text-[#3A5A46] mb-6">لطفاً فیلترها را تغییر دهید یا پاک کنید.</p>
                <button onClick={handleResetFilters} className="bg-[#1C3324] text-white rounded-2xl px-6 sm:px-8 py-3 sm:py-3.5 font-bold text-xs sm:text-sm shadow-md cursor-pointer hover:bg-[#8B263E] transition-colors">
                  مشاهده تمام آثار
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
                {filteredProducts.map((product) => (
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
          </div>
        </div>
      </section>

      {/* Mobile Modal */}
      {isMobileFilterOpen && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setIsMobileFilterOpen(false); }} className="fixed inset-0 bg-[#1C3324]/40 backdrop-blur-sm z-[100] flex justify-end">
          <div className="w-[85%] max-w-[360px] bg-white h-full p-6 overflow-y-auto shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#1C3324]/15">
                <h3 className="m-0 text-lg font-bold text-[#1C3324]">فیلترهای پیشرفته</h3>
                <button onClick={() => setIsMobileFilterOpen(false)} className="text-[#3A5A46] hover:text-red-500 cursor-pointer"><X size={22} /></button>
              </div>
              <ProductFilters {...filterProps} />
            </div>
            <button onClick={() => setIsMobileFilterOpen(false)} className="w-full py-3.5 rounded-2xl bg-[#1C3324] text-white font-bold mt-6 shadow-md cursor-pointer hover:bg-[#8B263E] transition-colors">
              اعمال فیلترها ({filteredProducts.length.toLocaleString("fa-IR")} اثر)
            </button>
          </div>
        </div>
      )}
    </main>
  );
}