"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronDown, Filter, SlidersHorizontal, X, Sparkles, Gem } from "lucide-react";

import { roundPrice } from "@/lib/format";
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

export type AvailableCategory = {
  id: string;
  name: string;
  slug: string;
  icon?: string;
};

type Props = {
  initialProducts: ProductItem[];
  availableCategories?: AvailableCategory[];
};

type SortOption = "newest" | "price_asc" | "price_desc" | "weight_asc" | "weight_desc";

const DEFAULT_CATEGORY_PILLS = [
  { key: "all", label: "همه آثار" },
  { key: "women", label: "آثار زنانه", gender: "women" },
  { key: "men", label: "مردانه", gender: "men" },
  { key: "kids", label: "کودک و نوزاد", gender: "kids" },
  { key: "necklace", label: "گردنبند" },
  { key: "ring", label: "انگشتر" },
  { key: "bracelet", label: "دستبند" },
  { key: "earring", label: "گوشواره" },
  { key: "bangle", label: "النگو" },
  { key: "set", label: "سرویس و نیم‌ست" },
];

export default function ProductsPageClient({ initialProducts, availableCategories = [] }: Props) {
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedGender, setSelectedGender] = useState<"all" | "women" | "men" | "kids">("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCollection, setSelectedCollection] = useState("all");

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

  // همگام‌سازی فیلترها با پارامترهای آدرس URL
  useEffect(() => {
    if (!searchParams) return;
    const cat = searchParams.get("category");
    const gender = searchParams.get("gender");
    const type = searchParams.get("type");
    const collection = searchParams.get("collection");
    const query = searchParams.get("search");

    if (query) setSearchQuery(query);

    if (gender && ["women", "men", "kids"].includes(gender.toLowerCase())) {
      setSelectedGender(gender.toLowerCase() as "women" | "men" | "kids");
    } else if (cat && ["women", "men", "kids"].includes(cat.toLowerCase())) {
      setSelectedGender(cat.toLowerCase() as "women" | "men" | "kids");
      setSelectedCategory("all");
    }

    if (type) {
      setSelectedType(type.toLowerCase());
    }

    if (cat && !["women", "men", "kids"].includes(cat.toLowerCase())) {
      setSelectedCategory(cat.toLowerCase());
    }

    if (collection) {
      setSelectedCollection(collection.toLowerCase());
    }
  }, [searchParams]);

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
    setSelectedGender("all");
    setSelectedType("all");
    setSelectedCollection("all");
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
        // ۱. جستجوی متنی
        if (search) {
          const name = getProductName(product).toLocaleLowerCase("fa-IR");
          const desc = getProductDescription(product).toLocaleLowerCase("fa-IR");
          if (!name.includes(search) && !desc.includes(search)) return false;
        }

        const catSlugs = (product.category_slugs || []).map((s) => s.toLowerCase());
        const catArray = Array.isArray(product.category)
          ? product.category.map((c) => String(c).toLowerCase())
          : typeof product.category === "string"
          ? [product.category.toLowerCase()]
          : [];
        const prodName = getProductName(product).toLowerCase();
        const prodDesc = getProductDescription(product).toLowerCase();

        // ۲. فیلتر کالکشن‌های اختصاصی
        if (selectedCollection !== "all") {
          const targetCol = selectedCollection.toLowerCase();
          const prodCol = String(product.collection_slug || "").toLowerCase();
          const matchesCol =
            prodCol === targetCol ||
            prodName.includes(targetCol) ||
            prodDesc.includes(targetCol);
          if (!matchesCol) return false;
        }

        // ۳. فیلتر جنسیت / مخاطب (زنانه، مردانه، کودک)
        if (selectedGender !== "all") {
          const targetGender = selectedGender.toLowerCase();
          const hasGenderSlug = catSlugs.includes(targetGender);
          const hasGenderId = catArray.some((id) => id === targetGender);

          let hasGenderWord = false;
          if (targetGender === "women") {
            hasGenderWord =
              prodName.includes("زنانه") ||
              prodDesc.includes("زنانه") ||
              (!catSlugs.includes("men") && !catSlugs.includes("kids"));
          } else if (targetGender === "men") {
            hasGenderWord =
              prodName.includes("مردانه") || prodDesc.includes("مردانه");
          } else if (targetGender === "kids") {
            hasGenderWord =
              prodName.includes("کودک") ||
              prodName.includes("نوزاد") ||
              prodDesc.includes("کودک");
          }

          if (!hasGenderSlug && !hasGenderId && !hasGenderWord) return false;
        }

        // ۴. فیلتر دسته‌بندی اصلی / نوع قطعه
        if (selectedCategory !== "all") {
          const targetCat = selectedCategory.toLowerCase();

          if (targetCat === "women" || targetCat === "men" || targetCat === "kids") {
            const hasSlug = catSlugs.includes(targetCat);
            const hasWord =
              targetCat === "women"
                ? prodName.includes("زنانه") || prodDesc.includes("زنانه") || (!catSlugs.includes("men") && !catSlugs.includes("kids"))
                : targetCat === "men"
                ? prodName.includes("مردانه") || prodDesc.includes("مردانه")
                : prodName.includes("کودک") || prodName.includes("نوزاد");
            if (!hasSlug && !hasWord) return false;
          } else {
            const hasCatSlug = catSlugs.includes(targetCat);
            const hasCatId = catArray.some((id) => id === targetCat);
            const typeField = String(product.type || "").trim().toLowerCase();
            const matchesType = typeField === targetCat;

            const PERSIAN_TYPE_MAP: Record<string, string[]> = {
              ring: ["انگشتر", "حلقه", "رینگ"],
              necklace: ["گردنبند", "پلاک", "مدال", "آویز", "سینه ریز", "زنجیر"],
              bracelet: ["دستبند", "النگو", "بنگل"],
              earring: ["گوشواره"],
              bangle: ["النگو", "تک‌پوش", "بنگل"],
              pendant: ["پلاک", "مدال", "آویز"],
              chain: ["زنجیر"],
              set: ["سرویس", "نیم‌ست", "نیم ست"],
              bridal: ["عروس", "مجلسی", "سرویس"],
              minimal: ["مینیمال", "ظریف", "روزمره"],
              gift: ["هدیه", "کادو"],
            };

            const keywords = PERSIAN_TYPE_MAP[targetCat] || [targetCat];
            const matchesKeyword = keywords.some(
              (kw) => prodName.includes(kw) || prodDesc.includes(kw)
            );

            if (!hasCatSlug && !hasCatId && !matchesType && !matchesKeyword) return false;
          }
        }

        // ۵. فیلتر نوع اختصاصی (type) در صورتی که همراه با دسته‌بندی ارسال شده باشد
        if (selectedType !== "all") {
          const targetType = selectedType.toLowerCase();
          const hasTypeSlug = catSlugs.includes(targetType);

          const PERSIAN_TYPE_MAP: Record<string, string[]> = {
            ring: ["انگشتر", "حلقه", "رینگ"],
            necklace: ["گردنبند", "پلاک", "مدال", "آویز"],
            bracelet: ["دستبند", "النگو"],
            earring: ["گوشواره"],
            bangle: ["النگو", "تک‌پوش"],
            pendant: ["پلاک", "مدال"],
            chain: ["زنجیر"],
            set: ["سرویس", "نیم‌ست"],
          };
          const keywords = PERSIAN_TYPE_MAP[targetType] || [targetType];
          const matchesKeyword = keywords.some(
            (kw) => prodName.includes(kw) || prodDesc.includes(kw)
          );

          if (!hasTypeSlug && !matchesKeyword) return false;
        }

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

        if (snappPayOnly) {
          const price = getDisplayProductPrice(product);
          const stock = Number(product.stock ?? 1);
          if (!price || price <= 0 || stock <= 0) return false;
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
  }, [
    products,
    searchQuery,
    selectedCategory,
    selectedGender,
    selectedType,
    selectedCollection,
    selectedColor,
    minPrice,
    maxPrice,
    minWeight,
    maxWeight,
    priceRange,
    weightRange,
    isGiftFilter,
    inStockOnly,
    snappPayOnly,
    selectedOccasion,
    sortBy,
    calculatedPrices,
  ]);

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedCategory !== "all" ||
    selectedGender !== "all" ||
    selectedType !== "all" ||
    selectedCollection !== "all" ||
    selectedColor !== "all" ||
    priceRange !== "all" ||
    weightRange !== "all" ||
    isGiftFilter ||
    inStockOnly ||
    snappPayOnly ||
    selectedOccasion !== "all";

  // محاسبه هوشمند عنوان و توضیحات صفحه بر اساس فیلترهای فعال
  const pageTitle = useMemo(() => {
    if (selectedCollection !== "all") {
      const colMap: Record<string, string> = {
        nasima: "آثار کالکشن نسیما",
        sahra: "آثار کالکشن صحرا",
        delbar: "آثار کالکشن دلبر",
        arona: "آثار کالکشن آرونا",
        sarv: "آثار کالکشن سرو",
      };
      return colMap[selectedCollection] || `کالکشن ${selectedCollection}`;
    }

    const typeLabels: Record<string, string> = {
      necklace: "گردنبندهای",
      ring: "انگشترهای",
      bracelet: "دستبندهای",
      earring: "گوشواره‌های",
      bangle: "النگوها و تک‌پوش‌های",
      pendant: "پلاک‌ها و آویزهای",
      chain: "زنجیرهای",
      set: "سرویس‌ها و نیم‌ست‌های",
    };

    const activeType =
      selectedType !== "all"
        ? selectedType
        : selectedCategory !== "women" &&
          selectedCategory !== "men" &&
          selectedCategory !== "kids" &&
          selectedCategory !== "all"
        ? selectedCategory
        : null;

    if (selectedGender === "women" || selectedCategory === "women") {
      if (activeType && typeLabels[activeType]) {
        return `${typeLabels[activeType]} زنانه`;
      }
      return "تمامی آثار و زیورآلات زنانه";
    }

    if (selectedGender === "men" || selectedCategory === "men") {
      if (activeType && typeLabels[activeType]) {
        return `${typeLabels[activeType]} مردانه`;
      }
      return "مجموعه آثار و زیورآلات مردانه";
    }

    if (selectedGender === "kids" || selectedCategory === "kids") {
      if (activeType && typeLabels[activeType]) {
        return `${typeLabels[activeType]} کودک و نوزاد`;
      }
      return "زیورآلات کودک و نوزاد";
    }

    if (activeType && typeLabels[activeType]) {
      return `${typeLabels[activeType]} طلا`;
    }

    return "تمامی آثار پرنا زر";
  }, [selectedGender, selectedCategory, selectedType, selectedCollection]);

  const pageSubtitle = useMemo(() => {
    if (selectedCollection !== "all") {
      return "مجموعه داستانی و اختصاصی دست‌ساز طلای ۱۸ عیار با امکان خرید اقساطی در ۳ قسط طلایی";
    }
    if (selectedGender === "women" || selectedCategory === "women") {
      return "زیورآلات لوکس زنانه با انحناهای ارگانیک، طراحی اختصاصی و گارانتی اصالت پرنا زر";
    }
    if (selectedGender === "men" || selectedCategory === "men") {
      return "ترکیب صلابت و اصالت با دست‌سازه‌های طلای ۱۸ عیار و چرم طبیعی درجه یک";
    }
    if (selectedGender === "kids" || selectedCategory === "kids") {
      return "طراحی‌های ارگونومیک، ضد حساسیت و بدون لبه‌های تیز مخصوص نوزاد و کودک";
    }
    return "تلفیق ظرافت و هنر در طلا و جواهر دست‌ساز";
  }, [selectedGender, selectedCategory, selectedCollection]);

  const handlePillClick = (key: string, gender?: string) => {
    if (key === "all") {
      setSelectedCategory("all");
      setSelectedGender("all");
      setSelectedType("all");
      setSelectedCollection("all");
      return;
    }

    if (gender) {
      setSelectedGender(gender as "women" | "men" | "kids");
      setSelectedCategory("all");
      setSelectedType("all");
      return;
    }

    if (key === "women" || key === "men" || key === "kids") {
      setSelectedGender(key as "women" | "men" | "kids");
      setSelectedCategory("all");
      setSelectedType("all");
      return;
    }

    // It's a category
    setSelectedCategory(key);
    setSelectedType("all");
  };

  const isPillActive = (key: string, gender?: string) => {
    if (key === "all") {
      return (
        selectedCategory === "all" &&
        selectedGender === "all" &&
        selectedType === "all" &&
        selectedCollection === "all"
      );
    }
    if (gender) {
      return selectedGender === gender && selectedCategory === "all" && selectedType === "all";
    }
    if (key === "women" || key === "men" || key === "kids") {
      return selectedGender === key && selectedCategory === "all" && selectedType === "all";
    }
    return selectedCategory === key || selectedType === key;
  };

  const filterProps = {
    searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, 
    selectedColor, setSelectedColor,
    minPrice, setMinPrice, maxPrice, setMaxPrice, minWeight, setMinWeight, maxWeight, setMaxWeight,
    hasActiveFilters, onReset: handleResetFilters, priceRange, setPriceRange, weightRange, setWeightRange, 
    isGiftFilter, setIsGiftFilter, inStockOnly, setInStockOnly, snappPayOnly, setSnappPayOnly, selectedOccasion, setSelectedOccasion
  };

  return (
    <main 
      dir="rtl" 
      className="min-h-screen bg-[#FCFCFA] dark:bg-[#101813] text-[#1C3324] dark:text-zinc-100 font-sans pb-24 pt-36 sm:pt-44 lg:pt-48 transition-colors duration-300"
    >
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header & Category Pills */}
        <div className="mb-8 sm:mb-10">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1C3324] dark:text-white m-0 mb-1 font-heading">
                {pageTitle}
              </h1>
              <p className="text-xs sm:text-sm text-[#3A5A46] dark:text-zinc-400 mt-1 max-w-2xl">
                {pageSubtitle}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link 
                href="/collections" 
                className="inline-flex items-center gap-2 text-[#8B263E] dark:text-[#D8B65C] font-bold text-xs sm:text-[13px] bg-[#8B263E]/10 dark:bg-[#D8B65C]/10 px-4 py-2.5 rounded-xl border border-[#8B263E]/20 hover:bg-[#8B263E]/20 transition-all w-fit shadow-xs whitespace-nowrap"
              >
                <Gem size={14} /> مشاهده کالکشن‌های اختصاصی
              </Link>
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 text-[#1C3324] dark:text-zinc-200 font-bold text-xs sm:text-[13px] bg-white dark:bg-[#15221B] px-4 py-2.5 rounded-xl border border-[#1C3324]/10 dark:border-white/10 hover:border-[#8B263E] dark:hover:border-[#D8B65C] transition-all w-fit shadow-xs whitespace-nowrap"
              >
                <ArrowLeft size={14} /> بازگشت
              </Link>
            </div>
          </div>

          {/* نوار قرصی دسته‌بندی‌ها */}
          <div className="flex flex-row-reverse items-center justify-end gap-2 overflow-x-auto pb-2 scrollbar-none">
            {DEFAULT_CATEGORY_PILLS.map((cat) => {
              const active = isPillActive(cat.key, cat.gender);
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => handlePillClick(cat.key, cat.gender)}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 cursor-pointer shrink-0 ${
                    active 
                      ? "bg-[#1C3324] dark:bg-[#D8B65C] text-white dark:text-[#101813] shadow-md scale-102" 
                      : "bg-white dark:bg-[#15221B] text-[#3A5A46] dark:text-zinc-300 border border-[#1C3324]/10 dark:border-white/10 hover:border-[#8B263E] dark:hover:border-[#D8B65C]"
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
          <div className="flex flex-wrap items-center gap-2 mb-6 bg-white dark:bg-[#15221B] p-3 sm:p-3.5 rounded-2xl border border-[#1C3324]/10 dark:border-white/10 shadow-xs text-xs">
            <span className="font-bold text-[#3A5A46] dark:text-zinc-400 ml-2">فیلترهای فعال:</span>
            
            {selectedGender !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#FAF9F6] dark:bg-[#101813] border border-[#8B263E]/30 text-[#8B263E] dark:text-[#D8B65C] rounded-full font-bold">
                مخاطب: {selectedGender === "women" ? "آثار زنانه" : selectedGender === "men" ? "مردانه" : "کودک و نوزاد"}
                <button type="button" onClick={() => setSelectedGender("all")} className="hover:text-red-500 cursor-pointer"><X size={13} /></button>
              </span>
            )}

            {selectedCategory !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#FAF9F6] dark:bg-[#101813] border border-[#8B263E]/30 text-[#8B263E] dark:text-[#D8B65C] rounded-full font-bold">
                دسته: {DEFAULT_CATEGORY_PILLS.find(c => c.key === selectedCategory)?.label || selectedCategory}
                <button type="button" onClick={() => setSelectedCategory("all")} className="hover:text-red-500 cursor-pointer"><X size={13} /></button>
              </span>
            )}

            {selectedType !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#FAF9F6] dark:bg-[#101813] border border-[#8B263E]/30 text-[#8B263E] dark:text-[#D8B65C] rounded-full font-bold">
                نوع: {DEFAULT_CATEGORY_PILLS.find(c => c.key === selectedType)?.label || selectedType}
                <button type="button" onClick={() => setSelectedType("all")} className="hover:text-red-500 cursor-pointer"><X size={13} /></button>
              </span>
            )}

            {selectedCollection !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#FAF9F6] dark:bg-[#101813] border border-[#8B263E]/30 text-[#8B263E] dark:text-[#D8B65C] rounded-full font-bold">
                کالکشن: {selectedCollection}
                <button type="button" onClick={() => setSelectedCollection("all")} className="hover:text-red-500 cursor-pointer"><X size={13} /></button>
              </span>
            )}

            {inStockOnly && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#FAF9F6] dark:bg-[#101813] border border-[#8B263E]/30 text-[#8B263E] dark:text-[#D8B65C] rounded-full font-bold">
                آماده ارسال فوری
                <button type="button" onClick={() => setInStockOnly(false)} className="hover:text-red-500 cursor-pointer"><X size={13} /></button>
              </span>
            )}

            {snappPayOnly && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#8B263E]/10 border border-[#8B263E]/30 text-[#8B263E] dark:text-[#D8B65C] rounded-full font-bold">
                ۳ قسط با قیمت روز
                <button type="button" onClick={() => setSnappPayOnly(false)} className="hover:text-red-500 cursor-pointer"><X size={13} /></button>
              </span>
            )}

            {weightRange !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#FAF9F6] dark:bg-[#101813] border border-[#8B263E]/30 text-[#8B263E] dark:text-[#D8B65C] rounded-full font-bold">
                وزن: {weightRange === "light" ? "سبک (زیر ۳ گرم)" : weightRange === "medium" ? "متوسط (۳ تا ۷ گرم)" : "سرمایه‌گذاری (بالای ۷ گرم)"}
                <button type="button" onClick={() => { setWeightRange("all"); setMinWeight(""); setMaxWeight(""); }} className="hover:text-red-500 cursor-pointer"><X size={13} /></button>
              </span>
            )}

            {priceRange !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#FAF9F6] dark:bg-[#101813] border border-[#8B263E]/30 text-[#8B263E] dark:text-[#D8B65C] rounded-full font-bold">
                بودجه: {priceRange === "under10" ? "زیر ۱۰ م.ت" : priceRange === "10to30" ? "۱۰ تا ۳۰ م.ت" : priceRange === "30to70" ? "۳۰ تا ۷۰ م.ت" : "بالای ۷۰ م.ت"}
                <button type="button" onClick={() => { setPriceRange("all"); setMinPrice(""); setMaxPrice(""); }} className="hover:text-red-500 cursor-pointer"><X size={13} /></button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#FAF9F6] dark:bg-[#101813] border border-[#8B263E]/30 text-[#8B263E] dark:text-[#D8B65C] rounded-full font-bold">
                جستجو: {searchQuery}
                <button type="button" onClick={() => setSearchQuery("")} className="hover:text-red-500 cursor-pointer"><X size={13} /></button>
              </span>
            )}

            <button type="button" onClick={handleResetFilters} className="text-red-600 dark:text-red-400 font-bold mr-auto hover:underline cursor-pointer">
              حذف همه فیلترها
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex justify-between items-center mb-6 sm:mb-8 bg-white dark:bg-[#15221B] px-4 sm:px-5 py-3 rounded-2xl border border-[#1C3324]/10 dark:border-white/10 shadow-xs">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => setIsMobileFilterOpen(true)} 
              className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#8B263E]/30 dark:border-[#D8B65C]/30 bg-[#FAF9F6] dark:bg-[#101813] text-[#8B263E] dark:text-[#D8B65C] font-bold text-xs cursor-pointer"
            >
              <Filter size={14} /> فیلترها
            </button>
            <span className="text-xs text-[#3A5A46] dark:text-zinc-400 font-bold">
              تعداد آثار: <span className="text-[#1C3324] dark:text-white font-mono font-black">{filteredProducts.length.toLocaleString("fa-IR")}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start">
          
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block bg-white dark:bg-[#15221B] border border-[#1C3324]/10 dark:border-white/10 rounded-2xl p-5 shadow-xs sticky top-36 lg:top-40 max-h-[calc(100vh-170px)] overflow-y-auto scrollbar-none">
            <div className="flex items-center gap-2 font-bold text-sm text-[#1C3324] dark:text-white mb-5 pb-3 border-b border-[#1C3324]/10 dark:border-white/10">
              <SlidersHorizontal size={16} className="text-[#8B263E] dark:text-[#D8B65C]" />
              <span>فیلترهای گالری</span>
            </div>
            <ProductFilters {...filterProps} />
          </aside>

          {/* Products Grid */}
          <div className="min-w-0">
            {filteredProducts.length === 0 ? (
              <div className="bg-white dark:bg-[#15221B] border border-dashed border-[#1C3324]/20 dark:border-white/10 rounded-3xl py-16 px-6 text-center shadow-xs">
                <p className="text-base sm:text-lg font-bold text-[#1C3324] dark:text-white mb-2">اثری با این ویژگی‌ها یافت نشد!</p>
                <p className="text-xs text-[#3A5A46] dark:text-zinc-400 mb-5">لطفاً فیلترها را تغییر دهید یا پاک کنید.</p>
                <button 
                  type="button"
                  onClick={handleResetFilters} 
                  className="bg-[#1C3324] dark:bg-[#D8B65C] text-white dark:text-[#101813] rounded-xl px-6 py-2.5 font-bold text-xs shadow-md cursor-pointer hover:bg-[#8B263E] transition-colors"
                >
                  مشاهده تمام آثار
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
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

      {/* Mobile Filters Modal */}
      {isMobileFilterOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsMobileFilterOpen(false); }} 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex justify-end"
        >
          <div className="w-[85%] max-w-[340px] bg-white dark:bg-[#15221B] h-full p-5 overflow-y-auto shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#1C3324]/10 dark:border-white/10">
                <h3 className="m-0 text-base font-bold text-[#1C3324] dark:text-white">فیلترهای گالری</h3>
                <button type="button" onClick={() => setIsMobileFilterOpen(false)} className="text-[#3A5A46] hover:text-red-500 cursor-pointer"><X size={20} /></button>
              </div>
              <ProductFilters {...filterProps} />
            </div>
            <button 
              type="button"
              onClick={() => setIsMobileFilterOpen(false)} 
              className="w-full py-3 rounded-xl bg-[#1C3324] dark:bg-[#D8B65C] text-white dark:text-[#101813] font-bold text-xs mt-6 shadow-md cursor-pointer hover:bg-[#8B263E] transition-colors"
            >
              اعمال فیلترها ({filteredProducts.length.toLocaleString("fa-IR")} اثر)
            </button>
          </div>
        </div>
      )}
    </main>
  );
}