"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import Link from "next/link";

import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Gem,
  Maximize2,
  MessageCircle,
  ShieldCheck,
  Truck,
  Weight,
  X,
  Sparkles,
  Lock,
  Ruler,
  Star,
  HeartHandshake,
  Clock,
  Package,
  Palette,
} from "lucide-react";

import {
  calcProductPrice,
  type ProductType,
  type ProductVariantType,
  formatProductPrice,
} from "@/lib/product-detail";

import AddToCartButton from "@/components/AddToCartButton";
import { pb } from "@/lib/pocketbase";

type ProductDetailViewProps = {
  product: ProductType;
  goldGramPrice: number;
};

type ActiveTab = "description" | "reviews";

type WeightOption = {
  id: string;
  type: "base" | "variant";
  weight: number;
  stock: number | null;
  sku: string;
  variant: ProductVariantType | null;
};

type ProductWithAlternativeFields = ProductType & {
  name?: string | null;
  baseWeight?: number | string | null;
  base_weight?: number | string | null;
  weight_gram?: number | string | null;
  weightGram?: number | string | null;
  gram_weight?: number | string | null;
  stoneWeight?: number | string | null;
  stoneDetails?: string | null;
  stone_details?: string | null;
  stone_weight?: number | string | null;
  isRing?: boolean;
  color?: string | null;
  colour?: string | null;
  lead_time_days?: number | string | null;
};

function normalizeWeight(weight: number): number {
  return Number(weight.toFixed(4));
}

function getProductTitle(product: ProductType): string {
  const productWithAlternativeFields =
    product as ProductWithAlternativeFields;

  const title =
    typeof product.title === "string"
      ? product.title.trim()
      : "";

  const name =
    typeof productWithAlternativeFields.name === "string"
      ? productWithAlternativeFields.name.trim()
      : "";

  return title || name || "محصول بدون نام";
}

function getRawProductWeight(
  product: ProductType,
): number | string | null | undefined {
  const productWithAlternativeFields =
    product as ProductWithAlternativeFields;

  return (
    product.weight ??
    productWithAlternativeFields.baseWeight ??
    productWithAlternativeFields.base_weight ??
    productWithAlternativeFields.weight_gram ??
    productWithAlternativeFields.weightGram ??
    productWithAlternativeFields.gram_weight ??
    null
  );
}

function getBaseProductWeight(product: ProductType): number {
  const rawWeight = getRawProductWeight(product);

  const normalizedRawWeight =
    typeof rawWeight === "string"
      ? rawWeight
          .replace(/,/g, "")
          .replace(/،/g, "")
          .trim()
      : rawWeight;

  const weight = Number(normalizedRawWeight);

  if (!Number.isFinite(weight) || weight <= 0) {
    return 0;
  }

  return weight;
}

function getProductShortDetail(product: ProductType): string {
  const shortDetail =
    typeof product.short_detail === "string"
      ? product.short_detail.trim()
      : "";

  const description =
    typeof product.description === "string"
      ? product.description.trim()
      : "";

  const baseWeight = getBaseProductWeight(product);

  return (
    shortDetail ||
    description ||
    `وزن: ${
      baseWeight > 0
        ? baseWeight.toLocaleString("fa-IR")
        : "ثبت نشده"
    } گرم | عیار: ${product.karat ?? 18}`
  );
}

function getSafeImages(
  images: string[] | undefined | null,
): string[] {
  if (!Array.isArray(images)) {
    return [];
  }

  return images.filter(
    (image) =>
      typeof image === "string" &&
      image.trim().length > 0,
  );
}

function formatWeight(
  weight: number | null | undefined,
): string {
  if (
    weight === null ||
    weight === undefined ||
    !Number.isFinite(weight) ||
    weight <= 0
  ) {
    return "ثبت نشده";
  }

  return `${weight.toLocaleString("fa-IR")} گرم`;
}

function getAvailableVariants(
  product: ProductType,
): ProductVariantType[] {
  if (!Array.isArray(product.variants)) {
    return [];
  }

  return product.variants.filter((variant) => {
    if (!variant) {
      return false;
    }

    if (
      typeof variant.id !== "string" ||
      variant.id.trim().length === 0
    ) {
      return false;
    }

    const variantWeight = Number(variant.weight);

    if (
      !Number.isFinite(variantWeight) ||
      variantWeight <= 0
    ) {
      return false;
    }

    return true;
  });
}

function getWhatsAppMessage(
  productTitle: string,
  price: number | null,
  weight: number | null,
  sku: string,
  color: string,
): string {
  const priceText =
    price !== null && Number.isFinite(price)
      ? formatProductPrice(price)
      : "تماس بگیرید";

  const weightText =
    weight !== null &&
    Number.isFinite(weight) &&
    weight > 0
      ? `${weight.toLocaleString("fa-IR")} گرم`
      : "ثبت نشده";

  return encodeURIComponent(
    [
      "سلام وقت بخیر",
      "",
      "برای شرایط خرید محصول زیر راهنمایی می‌خواهم:",
      "",
      `نام محصول: ${productTitle}`,
      sku ? `کد کالا: ${sku}` : "",
      color ? `رنگ: ${color}` : "",
      `وزن کل: ${weightText}`,
      `قیمت کل: ${priceText}`,
    ].filter(Boolean).join("\n"),
  );
}

function PriceTooltip() {
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-3 hidden w-[min(340px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-[#DFB76C]/40 bg-white dark:bg-[#1E050A] p-4 text-right shadow-2xl group-hover:block dark:border-[#DFB76C]/30">
      <div className="mb-3 text-sm font-black text-[#1E050A] dark:text-[#DFB76C]">
        نحوه محاسبه قیمت محصول
      </div>

      <div className="space-y-2 text-xs leading-6 text-[#5A252E] dark:text-zinc-200">
        <div>(قیمت طلا خام + اجرت) × وزن طلا + متعلقات + ۷٪ سود + ۹٪ مالیات</div>

        <div className="mt-3 rounded-xl bg-[#FAF8F5] dark:bg-[#2A0710] border border-[#DFB76C]/35 px-3 py-2 text-[11px] font-bold text-[#8B142D] dark:text-[#DFB76C]">
          قیمت نهایی با نرخ زنده روز طلا محاسبه می‌شود.
        </div>
      </div>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-2.5 sm:gap-3 rounded-2xl border border-[#DFB76C]/30 bg-white/90 dark:bg-[#1C080E] dark:border-white/10 p-3 sm:p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#DFB76C] shadow-[0_4px_16px_rgba(59,11,20,0.03)]">
      <div className="mt-0.5 shrink-0 text-[#8B142D] dark:text-[#DFB76C]">
        {icon}
      </div>

      <div>
        <div className="font-bold text-xs sm:text-sm text-[#3B0B14] dark:text-zinc-100">
          {title}
        </div>

        <div className="text-[11px] sm:text-xs leading-5 sm:leading-6 text-[#6E3A44] dark:text-zinc-400 mt-0.5">
          {description}
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailView({
  product,
  goldGramPrice,
}: ProductDetailViewProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  useEffect(() => {
    setIsLoggedIn(pb.authStore.isValid);
    setAuthLoaded(true);
    const unsubscribe = pb.authStore.onChange((token) => {
      setIsLoggedIn(Boolean(token));
    });
    return () => unsubscribe();
  }, []);

  const title = getProductTitle(product);
  const shortDetail = getProductShortDetail(product);

  const productExtended = product as ProductWithAlternativeFields;
  const stoneDetails = productExtended.stoneDetails || productExtended.stone_details || "";
  const stoneWeight = productExtended.stoneWeight || productExtended.stone_weight || "";
  const hasStone = Boolean(stoneDetails || stoneWeight);

  // خواندن رنگ مستقیم از پاکت‌بیس، در غیر این صورت زرد
  const rawColor = productExtended.colour || productExtended.color;
  const productItemColor = useMemo(() => {
    if (typeof rawColor === "string" && rawColor.trim().length > 0) {
      return rawColor.trim();
    }
    return "زرد";
  }, [rawColor]);

  // بررسی زمان ساخت
  const leadTimeDays = useMemo(() => {
    const rawVal = productExtended.lead_time_days;
    if (rawVal === null || rawVal === undefined) return null;
    const num = Number(rawVal);
    return Number.isFinite(num) && num > 0 ? num : null;
  }, [productExtended.lead_time_days]);

  const isMadeToOrder = leadTimeDays !== null;

  const productCat = typeof product.category === "string" ? product.category.toLowerCase() : "";
  const isRingProduct = Boolean(
    productExtended.isRing ||
    title.includes("انگشتر") ||
    title.includes("حلقه") ||
    productCat.includes("ring") ||
    productCat.includes("انگشتر") ||
    productCat.includes("حلقه")
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>("description");
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const variants = useMemo(() => {
    return getAvailableVariants(product);
  }, [product]);

  const baseWeight = useMemo(() => {
    return getBaseProductWeight(product);
  }, [product]);

  const weightOptions = useMemo<WeightOption[]>(() => {
    const options: WeightOption[] = [];
    const usedWeights = new Set<number>();

    if (baseWeight > 0) {
      const normalizedBaseWeight = normalizeWeight(baseWeight);
      options.push({
        id: "base",
        type: "base",
        weight: baseWeight,
        stock: product.stock,
        sku: product.sku || "",
        variant: null,
      });
      usedWeights.add(normalizedBaseWeight);
    }

    for (const variant of variants) {
      const variantWeight = Number(variant.weight);
      if (!Number.isFinite(variantWeight) || variantWeight <= 0) continue;

      const normalizedVariantWeight = normalizeWeight(variantWeight);
      if (usedWeights.has(normalizedVariantWeight)) continue;

      usedWeights.add(normalizedVariantWeight);
      options.push({
        id: `variant:${variant.id}`,
        type: "variant",
        weight: variantWeight,
        stock: variant.stock,
        sku: variant.sku || "",
        variant,
      });
    }

    return options;
  }, [baseWeight, variants, product.stock, product.sku]);

  // انتخاب اولین وزن موجود به عنوان پیش‌فرض در صورت امکان
  const defaultWeightOptionId = useMemo(() => {
    const firstInStock = weightOptions.find(
      (opt) => opt.stock === null || Number(opt.stock) > 0
    );
    if (firstInStock) return firstInStock.id;
    if (baseWeight > 0) return "base";
    return weightOptions[0]?.id ?? "";
  }, [baseWeight, weightOptions]);

  const [selectedWeightOptionId, setSelectedWeightOptionId] =
    useState<string>(defaultWeightOptionId);

  useEffect(() => {
    const selectedOptionStillExists = weightOptions.some(
      (option) => option.id === selectedWeightOptionId,
    );
    if (!selectedOptionStillExists) {
      setSelectedWeightOptionId(defaultWeightOptionId);
    }
  }, [defaultWeightOptionId, selectedWeightOptionId, weightOptions]);

  const selectedWeightOption = useMemo(() => {
    return (
      weightOptions.find(
        (option) => option.id === selectedWeightOptionId,
      ) ??
      weightOptions[0] ??
      null
    );
  }, [selectedWeightOptionId, weightOptions]);

  const selectedWeight = selectedWeightOption?.weight ?? baseWeight;
  const selectedVariant = selectedWeightOption?.variant ?? null;
  const currentSku = selectedWeightOption?.sku || product.sku || "ثبت نشده";

  const selectedStock = selectedWeightOption?.stock ?? null;
  // بررسی ناموجود بودن وزن انتخاب‌شده
  const isSelectedOutOfStock = selectedStock !== null && Number(selectedStock) <= 0;

  const effectiveGoldRate = goldGramPrice > 0 ? goldGramPrice : 25658600;

  const selectedPriceInfo = useMemo(() => {
    if (selectedWeight <= 0) return null;
    return calcProductPrice(
      { ...product, weight: selectedWeight },
      effectiveGoldRate,
    );
  }, [effectiveGoldRate, product, selectedWeight]);

  const selectedPrice = selectedPriceInfo?.total ?? null;

  const installmentCount = 3;
  const installmentWeight = selectedWeight > 0 ? Math.round((selectedWeight / installmentCount) * 100) / 100 : null;
  const installmentPrice =
    selectedPrice !== null && selectedPrice > 0
      ? Math.ceil(selectedPrice / installmentCount)
      : null;

  const installmentProduct = useMemo<ProductType>(
    () => ({
      ...product,
      title: `${title} (قسط اول از ۳ - وزن سهمی: ${installmentWeight?.toFixed(2)} گرم)`,
      weight: installmentWeight ?? selectedWeight,
      totalWeight: Number(selectedWeight.toFixed(2)),
      installmentWeight: installmentWeight ?? 0,
      price: installmentPrice ?? 0,
      goldPricePerGram: goldGramPrice,
      goldPrice: goldGramPrice,
      color: productItemColor,
      isInstallment: true,
      installmentNumber: 1,
      installmentTotalCount: 3,
      sku: currentSku,
      stock: null,
      variants: [],
    }),
    [product, title, installmentWeight, selectedWeight, installmentPrice, goldGramPrice, productItemColor, currentSku],
  );

  const selectedProduct = useMemo<ProductType>(
    () => ({
      ...product,
      weight: selectedWeight,
      price: selectedPrice ?? 0,
      goldPricePerGram: goldGramPrice,
      goldPrice: goldGramPrice,
      color: productItemColor,
      sku: currentSku,
      stock: null,
      variants: [],
    }),
    [product, selectedPrice, selectedWeight, goldGramPrice, productItemColor, currentSku],
  );

  const selectedVariantForCart =
    selectedVariant === null
      ? null
      : {
          ...selectedVariant,
          sku: currentSku,
          stock: 0,
        };

  const images = useMemo(
    () => getSafeImages(product.images),
    [product.images],
  );

  const [selectedImage, setSelectedImage] = useState<string | null>(
    images[0] ?? null,
  );

  const selectedImageIndex = useMemo(() => {
    if (!selectedImage) return 0;
    const index = images.indexOf(selectedImage);
    return index >= 0 ? index : 0;
  }, [images, selectedImage]);

  useEffect(() => {
    setSelectedImage(images[0] ?? null);
  }, [images]);

  const showPreviousImage = () => {
    if (images.length <= 1) return;
    const prevIndex = selectedImageIndex === 0 ? images.length - 1 : selectedImageIndex - 1;
    setSelectedImage(images[prevIndex] ?? null);
  };

  const showNextImage = () => {
    if (images.length <= 1) return;
    const nextIndex = selectedImageIndex === images.length - 1 ? 0 : selectedImageIndex + 1;
    setSelectedImage(images[nextIndex] ?? null);
  };

  useEffect(() => {
    if (!isImageModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        showPreviousImage();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        showNextImage();
      }
      if (e.key === "Escape") {
        setIsImageModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isImageModalOpen, selectedImageIndex, images]);

  const karat =
    product.karat !== null &&
    product.karat !== undefined &&
    Number(product.karat) > 0
      ? Number(product.karat)
      : 18;

  const hasDescription =
    typeof product.description === "string" &&
    product.description.trim().length > 0;

  const whatsappNumber = "989383080950";
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${getWhatsAppMessage(
    title,
    selectedPrice,
    selectedWeight > 0 ? selectedWeight : null,
    currentSku,
    productItemColor,
  )}`;

  return (
    <div className="w-full pt-1 sm:pt-2 pb-36 lg:pb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <section className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:gap-10 items-start">
        {/* ستون گالری با حالت Sticky و کارت‌های اعتماد در پایین آن */}
        <div className="min-w-0 lg:sticky lg:top-6 self-start space-y-4">
          <div className="rounded-[22px] border border-[#DFB76C]/30 bg-white/95 dark:bg-[#1C080E] p-3 shadow-[0_4px_24px_rgba(59,11,20,0.04)] sm:rounded-[28px] sm:p-5 dark:border-white/10 transition-colors">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="relative overflow-hidden rounded-[18px] border border-[#DFB76C]/20 bg-[#FAF6F0] dark:bg-[#150408] sm:rounded-[24px] dark:border-white/5">
                <div className="aspect-square w-full p-2.5 sm:p-4 flex items-center justify-center">
                  {selectedImage ? (
                    <button
                      type="button"
                      onClick={() => setIsImageModalOpen(true)}
                      className="group relative flex h-full w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-[14px] focus:outline-none focus:ring-4 focus:ring-[#8B142D]/20 sm:rounded-[18px]"
                      aria-label={`بزرگ‌نمایی تصویر ${title}`}
                    >
                      <img
                        src={selectedImage}
                        alt={title}
                        className="h-full w-full rounded-[14px] object-contain transition-transform duration-500 group-hover:scale-[1.035] sm:rounded-[18px]"
                      />
                      <span className="absolute bottom-3 left-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#3B0B14]/85 text-white shadow-lg backdrop-blur-sm transition-all duration-200 group-hover:bg-[#8B142D] sm:bottom-4 sm:left-4 sm:h-auto sm:w-auto sm:gap-2 sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-xs sm:opacity-0 sm:group-hover:opacity-100">
                        <Maximize2 className="h-4 w-4" />
                        <span className="hidden sm:inline">بزرگ‌نمایی تصویر</span>
                      </span>
                    </button>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-center p-4 sm:p-6 bg-gradient-to-br from-[#FAF6F0] via-[#F4ECE1] to-[#EFE3D3] dark:from-[#1A050A] dark:via-[#140407] dark:to-[#0F0205] rounded-[14px]">
                      <div className="relative mb-3 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-white/80 dark:bg-white/5 border border-[#DFB76C]/40 shadow-sm">
                        <Gem className="h-8 w-8 sm:h-10 sm:w-10 text-[#8B142D] dark:text-[#DFB76C]" />
                        <Sparkles className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 text-[#DFB76C] animate-pulse" />
                      </div>
                      <span className="text-xs sm:text-sm font-extrabold text-[#3B0B14] dark:text-zinc-100">دست‌ساخته طلای ۱۸ عیار پرنا زر</span>
                      <span className="text-[11px] sm:text-xs text-[#6E3A44] dark:text-zinc-400 mt-1 max-w-[260px] leading-relaxed">طراحی اختصاصی با شناسنامه رسمی و عیار استاندارد اتحادیه</span>
                    </div>
                  )}
                </div>
              </div>

              {images.length > 1 && (
                <div className="-mx-1 overflow-x-auto px-1 pb-2">
                  <div className="flex min-w-max gap-2 sm:gap-3">
                    {images.map((image, index) => {
                      const isActive = image === selectedImage;
                      return (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => setSelectedImage(image)}
                          className={[
                            "group relative w-[68px] shrink-0 overflow-hidden rounded-xl border bg-white dark:bg-[#1C080E] p-1 transition-all duration-200 sm:w-[88px] sm:rounded-2xl sm:p-1.5 cursor-pointer",
                            isActive
                              ? "border-[#8B142D] dark:border-[#DFB76C] shadow-sm ring-2 ring-[#8B142D]/25 dark:ring-[#DFB76C]/25"
                              : "border-[#DFB76C]/25 dark:border-white/10 hover:border-[#DFB76C]",
                          ].join(" ")}
                        >
                          <div className="aspect-square overflow-hidden rounded-[10px] bg-[#FAF6F0] dark:bg-[#150408] sm:rounded-[14px]">
                            <img
                              src={image}
                              alt={`${title} ${index + 1}`}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <BenefitCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="ضمانت اصالت و عیار ۱۸"
              description="همراه با فاکتور رسمی معتبر اتحادیه طلا."
            />
            <BenefitCard
              icon={<Truck className="h-5 w-5" />}
              title="ارسال امن و بیمه‌شده"
              description="بسته‌بندی نفیس و بیمه کامل مرسوله پستی."
            />
          </div>
        </div>

        {/* ستون اطلاعات و سفارش */}
        <div className="min-w-0 rounded-[22px] border border-[#DFB76C]/30 bg-white/95 dark:bg-[#1C080E] p-4 shadow-[0_4px_24px_rgba(59,11,20,0.04)] sm:rounded-[28px] sm:p-6 lg:p-8 dark:border-white/10 transition-colors">
          <div className="mb-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                <span className="rounded-full bg-[#8B142D] px-3 py-1 text-white shadow-xs font-heading">
                  پرنا زر
                </span>
                <span className="rounded-full border border-[#DFB76C]/40 bg-[#DFB76C]/10 px-2.5 py-1 text-[#8B142D] dark:text-[#DFB76C] font-black">
                  عیار {karat}
                </span>
                <span className="rounded-full border border-[#DFB76C]/25 bg-white/70 dark:bg-white/5 px-2.5 py-1 font-mono text-[#3B0B14] dark:text-zinc-200">
                  کد: {currentSku}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#DFB76C]/40 bg-[#DFB76C]/10 px-2.5 py-1 text-[#8B142D] dark:text-[#DFB76C]">
                  <Palette size={12} />
                  <span>طلای {productItemColor}</span>
                </span>
              </div>

              {isRingProduct && (
                <button
                  type="button"
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#DFB76C]/50 bg-white/80 dark:bg-[#250910] px-3 py-1 text-[11px] font-bold text-[#8B142D] dark:text-[#DFB76C] shadow-2xs transition-all hover:bg-[#8B142D] hover:text-white cursor-pointer"
                >
                  <Ruler size={13} />
                  <span>راهنمای سایز</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5 pt-1">
              <h1 className="text-2xl font-black tracking-tight text-[#1E050A] dark:text-white sm:text-3xl lg:text-[2rem] leading-tight font-heading">
                {title}
              </h1>
              <p className="text-xs sm:text-sm leading-relaxed text-[#5A252E] dark:text-zinc-200">
                {shortDetail}
              </p>
            </div>
          </div>

          {/* انتخاب وزن با خط زدن روی وزن‌های ناموجود و عدم نمایش آماده ارسال */}
          {weightOptions.length > 1 && (
            <div className="mb-5 rounded-[18px] border border-[#DFB76C]/30 bg-[#FAF8F5] dark:bg-[#150408] p-4 sm:mb-6 sm:rounded-[22px] sm:p-5 dark:border-white/10 transition-colors">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-[#1E050A] dark:text-zinc-100">انتخاب وزن / سایز</h2>
                  <p className="mt-1 text-xs text-[#5A252E] dark:text-zinc-400">وزن موردنظر خود را انتخاب کنید.</p>
                </div>
                <Weight className="h-6 w-6 shrink-0 text-[#8B142D] dark:text-[#DFB76C]" />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                {weightOptions.map((option) => {
                  const isSelected = option.id === selectedWeightOption?.id;
                  const isOptionOutOfStock = option.stock !== null && Number(option.stock) <= 0;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => !isOptionOutOfStock && setSelectedWeightOptionId(option.id)}
                      disabled={isOptionOutOfStock}
                      className={[
                        "group relative overflow-hidden rounded-xl border p-3 text-right transition-all duration-200 sm:rounded-2xl cursor-pointer",
                        isSelected && !isOptionOutOfStock
                          ? "border-[#DFB76C] bg-white dark:bg-[#250910] shadow-sm ring-2 ring-[#DFB76C]/40 font-bold"
                          : "border-[#DFB76C]/25 bg-white/90 dark:bg-[#1C080E] text-[#5A252E] dark:text-zinc-300 hover:border-[#DFB76C]",
                        isOptionOutOfStock ? "cursor-not-allowed bg-red-50/40 dark:bg-red-950/20 opacity-60 border-red-200" : "",
                      ].join(" ")}
                    >
                      {/* خط مورب قرمز روی کارهای ناموجود */}
                      {isOptionOutOfStock && (
                        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="w-full h-[1.5px] bg-red-500 rotate-[-15deg] absolute" />
                        </span>
                      )}

                      <span
                        className={[
                          "relative z-10 block text-sm font-black",
                          isOptionOutOfStock ? "text-red-700 dark:text-red-400 line-through" : "text-[#1E050A] dark:text-white",
                        ].join(" ")}
                      >
                        {formatWeight(option.weight)}
                      </span>

                      {/* نمایش برچسب دقیق: ناموجود در صورت stock صفر */}
                      {isOptionOutOfStock ? (
                        <span className="relative z-10 block text-[10px] text-red-600 font-bold mt-0.5">
                          ناموجود
                        </span>
                      ) : (
                        <span className={`relative z-10 block text-[10px] font-bold mt-0.5 ${!isMadeToOrder ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                          {!isMadeToOrder ? "آماده ارسال" : "سفارش ساخت"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-5 rounded-[18px] border border-[#DFB76C]/30 bg-white/95 dark:bg-[#1C080E] p-4 sm:mb-6 sm:rounded-[22px] sm:p-5 space-y-4 dark:border-white/10 shadow-xs transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#5A252E] dark:text-zinc-300">قیمت کل محصول</span>
              <span className="text-[11px] text-[#8B142D] dark:text-[#DFB76C] font-extrabold bg-[#DFB76C]/10 border border-[#DFB76C]/30 px-2.5 py-0.5 rounded-full">عیار {karat}</span>
            </div>

            <div className="flex flex-wrap items-end gap-2 sm:gap-3">
              <strong className="text-2xl font-black text-[#8B142D] dark:text-[#DFB76C] sm:text-3xl font-mono">
                {formatProductPrice(selectedPrice)}
              </strong>
            </div>

            {/* وضعیت تحویل بر اساس stock واقعی و زمان ساخت */}
            <div className="flex items-center gap-2 pt-1 text-xs">
              {isSelectedOutOfStock ? (
                <span className="inline-flex items-center gap-1.5 text-red-700 font-bold bg-red-50 dark:bg-red-950/40 px-3 py-1.5 rounded-xl border border-red-200">
                  <X size={14} />
                  <span>این وزن در حال حاضر ناموجود است</span>
                </span>
              ) : isMadeToOrder ? (
                <span className="inline-flex items-center gap-1.5 text-amber-850 font-bold bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200 dark:text-amber-300">
                  <Clock size={14} />
                  <span>سفارش ساخت (زمان ساخت و آماده‌سازی: {leadTimeDays} روز کاری)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:text-emerald-300">
                  <Package size={14} />
                  <span>موجود در گالری پرنا زر (آماده تحویل و ارسال فوری)</span>
                </span>
              )}
            </div>

            {hasStone && (
              <div className="mt-2 text-[11px] text-[#8B142D] dark:text-[#DFB76C] font-bold bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200">
                💎 این اثر دارای سنگ/نگین می‌باشد: {stoneDetails} {stoneWeight ? `(وزن سنگ: ${stoneWeight})` : ""}
              </div>
            )}
          </div>

          <div className="mb-5 grid grid-cols-3 gap-2 sm:mb-6 sm:gap-3">
            <div className="rounded-xl bg-white/90 dark:bg-[#160408] border border-[#DFB76C]/25 dark:border-[#DFB76C]/20 p-3 sm:rounded-2xl sm:p-4 shadow-2xs">
              <Weight className="mb-2 h-5 w-5 text-[#8B142D] dark:text-[#DFB76C]" />
              <span className="block text-xs text-[#5A252E] dark:text-zinc-400">وزن کل</span>
              <strong className="mt-1 block text-xs text-[#1E050A] dark:text-white sm:text-sm font-mono">
                {formatWeight(selectedWeight)}
              </strong>
            </div>
            <div className="rounded-xl bg-white/90 dark:bg-[#160408] border border-[#DFB76C]/25 dark:border-[#DFB76C]/20 p-3 sm:rounded-2xl sm:p-4 shadow-2xs">
              <Gem className="mb-2 h-5 w-5 text-[#8B142D] dark:text-[#DFB76C]" />
              <span className="block text-xs text-[#5A252E] dark:text-zinc-400">عیار</span>
              <strong className="mt-1 block text-xs text-[#1E050A] dark:text-white sm:text-sm font-mono">{karat}</strong>
            </div>
            <div className="rounded-xl bg-white/90 dark:bg-[#160408] border border-[#DFB76C]/25 dark:border-[#DFB76C]/20 p-3 sm:rounded-2xl sm:p-4 shadow-2xs">
              <BadgeCheck className="mb-2 h-5 w-5 text-[#8B142D] dark:text-[#DFB76C]" />
              <span className="block text-xs text-[#5A252E] dark:text-zinc-400">اصالت</span>
              <strong className="mt-1 block text-xs text-[#1E050A] dark:text-white sm:text-sm">تضمین‌شده</strong>
            </div>
          </div>

          <div className="mb-5 flex justify-center sm:mb-6">
            <div className="group relative inline-flex">
              <button
                type="button"
                className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-2xl border border-[#DFB76C]/50 bg-white dark:bg-[#1C080E] dark:border-[#DFB76C]/30 px-5 py-3 text-sm font-extrabold text-[#1E050A] dark:text-[#DFB76C] shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#DFB76C]/10 sm:min-w-[240px] sm:rounded-3xl sm:px-7 sm:py-4 sm:text-base cursor-pointer"
              >
                <CircleDollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-[#8B142D] dark:text-[#DFB76C]" />
                نحوه محاسبه قیمت
              </button>
              <PriceTooltip />
            </div>
          </div>

          {/* ردیف دکمه‌های تجاری: افزودن به سبد خرید مسلط و مشاوره واتساپ */}
          <div id="main-buy-actions" className="mb-5 grid gap-3 sm:mb-6 sm:grid-cols-[1.6fr_1fr]">
            <div className="h-[54px] flex items-center w-full">
              {isSelectedOutOfStock ? (
                <button
                  type="button"
                  disabled
                  className="w-full h-[54px] rounded-2xl bg-zinc-200 dark:bg-zinc-800 text-zinc-500 text-xs font-bold cursor-not-allowed flex items-center justify-center"
                >
                  محصول با این وزن ناموجود است
                </button>
              ) : (
                <AddToCartButton
                  product={selectedProduct}
                  price={selectedPrice}
                  selectedVariant={selectedVariantForCart}
                  className="w-full !h-[54px] !py-0 flex items-center justify-center"
                />
              )}
            </div>

            <div className="h-[54px] flex items-center w-full">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full h-[54px] items-center justify-center gap-2 rounded-2xl border border-emerald-600/40 bg-emerald-800/90 hover:bg-emerald-700 text-white dark:bg-emerald-900/85 dark:hover:bg-emerald-800/95 px-4 text-xs sm:text-sm font-extrabold shadow-sm transition hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
              >
                <MessageCircle size={18} className="shrink-0" />
                <span>مشاوره و سفارش واتساپ</span>
              </a>
            </div>
          </div>

          {/* طرح اقساط طلایی با قیمت روز طلا */}
          <div className="rounded-[22px] border border-[#3B0B14]/20 dark:border-white/10 bg-white dark:bg-[#1C080E] p-5 text-[#3B0B14] dark:text-zinc-100 shadow-xs sm:rounded-[26px] sm:p-6 transition-colors">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-base font-black text-[#8B142D] dark:text-[#DFB76C]">
                  <Sparkles className="h-5 w-5 text-[#8B142D] dark:text-[#DFB76C]" />
                  <span>طرح اقساط طلایی پرنا زر (۳ قسط با قیمت روز طلا)</span>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                  بدون سود و بدون چک
                </span>
              </div>

              <div>
                <p className="text-xs leading-6 text-[#6E3A44] dark:text-zinc-300">
                  در این طرح، وزن خالص طلا به ۳ سهم مساوی تقسیم می‌شود. <strong className="text-[#8B142D] dark:text-[#DFB76C]">قسط اول</strong> همین الان با نرخ زنده بازار پرداخت شده و سفارش ثبت می‌شود. <strong className="text-[#3B0B14] dark:text-white">اقساط دوم و سوم</strong> در موعد سررسید بر اساس <strong>نرخ روز طلا</strong> تسویه می‌گردند.
                </p>

                {installmentWeight !== null && installmentPrice !== null && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="rounded-2xl bg-[#FDF8F9] dark:bg-[#140508] p-3 text-right border-2 border-[#8B142D] dark:border-[#DFB76C] shadow-xs">
                      <span className="block text-[10px] font-extrabold text-[#8B142D] dark:text-[#DFB76C]">۱. قسط اول (همین الان):</span>
                      <strong className="block text-xs font-black text-[#3B0B14] dark:text-white mt-1">
                        {formatProductPrice(installmentPrice)}
                      </strong>
                      <span className="block text-[10px] text-[#6E3A44] dark:text-zinc-400 mt-0.5">وزن سهمی: {installmentWeight.toFixed(2)} گرم (به نرخ امروز)</span>
                    </div>

                    <div className="rounded-2xl bg-[#FDF8F9] dark:bg-[#140508] p-3 text-right border border-[#3B0B14]/15 dark:border-white/10">
                      <span className="block text-[10px] font-bold text-[#6E3A44] dark:text-zinc-400">۲. قسط دوم (ماه آینده):</span>
                      <strong className="block text-xs font-black text-[#3B0B14] dark:text-white mt-1">
                        محاسبه با نرخ روز طلا
                      </strong>
                      <span className="block text-[10px] text-[#6E3A44] dark:text-zinc-400 mt-0.5">وزن سهمی: {installmentWeight.toFixed(2)} گرم</span>
                    </div>

                    <div className="rounded-2xl bg-[#FDF8F9] dark:bg-[#140508] p-3 text-right border border-[#3B0B14]/15 dark:border-white/10">
                      <span className="block text-[10px] font-bold text-[#6E3A44] dark:text-zinc-400">۳. قسط سوم (ماه بعد):</span>
                      <strong className="block text-xs font-black text-[#3B0B14] dark:text-white mt-1">
                        محاسبه با نرخ روز طلا
                      </strong>
                      <span className="block text-[10px] text-[#6E3A44] dark:text-zinc-400 mt-0.5">وزن سهمی: {installmentWeight.toFixed(2)} گرم (تسویه و تحویل)</span>
                    </div>
                  </div>
                )}
              </div>

              {installmentPrice !== null && (
                <div className="space-y-2 pt-2 border-t border-[#3B0B14]/15 dark:border-white/10">
                  {isSelectedOutOfStock ? (
                    <button
                      type="button"
                      disabled
                      className="w-full h-[50px] rounded-2xl bg-gray-200 dark:bg-zinc-800 text-gray-500 text-xs font-bold cursor-not-allowed flex items-center justify-center"
                    >
                      خرید اقساطی به دلیل ناموجودی این وزن امکان‌پذیر نیست
                    </button>
                  ) : !isLoggedIn ? (
                    <Link
                      href={`/login?redirect=/products/${product.id}`}
                      className="w-full h-[50px] rounded-2xl bg-[#8B142D] hover:bg-[#6e1e31] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition-colors"
                    >
                      <Lock size={15} />
                      <span>ورود به حساب کاربری و خرید قسط اول ({formatProductPrice(installmentPrice)})</span>
                    </Link>
                  ) : (
                    <div className="w-full [&_button]:!w-full [&_button]:!h-[50px] [&_button]:!bg-[#3B0B14] dark:[&_button]:!bg-[#DFB76C] dark:[&_button]:hover:!bg-[#E6CA7A] dark:[&_button]:!text-[#140508] [&_button]:hover:!bg-[#8B142D] [&_button]:!text-white [&_button]:!rounded-2xl [&_button]:!border-none [&_button]:!shadow-xs [&_button_*]:!text-inherit">
                      <AddToCartButton
                        product={installmentProduct}
                        price={installmentPrice}
                        selectedVariant={selectedVariantForCart}
                        className="w-full !h-[50px] !bg-[#3B0B14] hover:!bg-[#8B142D] dark:!bg-[#DFB76C] dark:hover:!bg-[#E6CA7A] !text-white dark:!text-[#140508] !rounded-2xl !border-none !text-xs !font-black cursor-pointer shadow-xs"
                      />
                    </div>
                  )}
                  <p className="text-[11px] text-center text-[#6E3A44] dark:text-zinc-400">
                    با ثبت سفارش، مبلغ <span className="font-bold text-[#3B0B14] dark:text-white">قسط اول به نرخ روز طلا</span> پرداخت شده و سفارش شما قطعی می‌شود.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-14 rounded-3xl border border-[#DFB76C]/30 bg-white/95 dark:bg-[#1C080E] p-6 sm:p-8 shadow-[0_4px_24px_rgba(59,11,20,0.03)] dark:border-white/10 space-y-6 transition-colors">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#3B0B14]/10 dark:border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold text-[#8B142D] dark:text-[#DFB76C] block mb-1">کلکسیون اختصاصی</span>
            <h2 className="text-xl sm:text-2xl font-black text-[#3B0B14] dark:text-zinc-100 font-heading">بهترین انتخاب از گالری طلا پرنا زر</h2>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3B0B14] dark:text-[#DFB76C] hover:text-[#8B142D] transition cursor-pointer"
          >
            <span>مشاهده همه آثار</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#150408] border border-[#DFB76C]/20 dark:border-white/10 space-y-2">
            <Sparkles className="text-[#8B142D] dark:text-[#DFB76C]" size={22} />
            <h3 className="font-bold text-sm text-[#3B0B14] dark:text-zinc-100">طراحی اصیل و فاخر</h3>
            <p className="text-xs text-[#6E3A44] dark:text-zinc-400 leading-relaxed">تلفیق هنر اصیل زرگری با ظرافت مدرن برای دوست‌داران طلای ناب.</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#150408] border border-[#DFB76C]/20 dark:border-white/10 space-y-2">
            <ShieldCheck className="text-[#8B142D] dark:text-[#DFB76C]" size={22} />
            <h3 className="font-bold text-sm text-[#3B0B14] dark:text-zinc-100">عیار ۱۸ استاندارد</h3>
            <p className="text-xs text-[#6E3A44] dark:text-zinc-400 leading-relaxed">تضمین عیار رسمی طلا همراه با فاکتور معتبر و قابل استعلام.</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#150408] border border-[#DFB76C]/20 dark:border-white/10 space-y-2">
            <HeartHandshake className="text-[#8B142D] dark:text-[#DFB76C]" size={22} />
            <h3 className="font-bold text-sm text-[#3B0B14] dark:text-zinc-100">خرید اقساطی بدون چک</h3>
            <p className="text-xs text-[#6E3A44] dark:text-zinc-400 leading-relaxed">طرح ویژه سه مرحله‌ای با محاسبه منصفانه مبتنی بر نرخ روز.</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#150408] border border-[#DFB76C]/20 dark:border-white/10 space-y-2">
            <Truck className="text-[#8B142D] dark:text-[#DFB76C]" size={22} />
            <h3 className="font-bold text-sm text-[#3B0B14] dark:text-zinc-100">بسته‌بندی هدیه لوکس</h3>
            <p className="text-xs text-[#6E3A44] dark:text-zinc-400 leading-relaxed">ارسال امن با بسته‌بندی ویژه و مناسب هدیه دادن به عزیزانتان.</p>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-[#DFB76C]/30 bg-white/95 dark:bg-[#1C080E] p-6 sm:p-8 shadow-[0_4px_24px_rgba(59,11,20,0.03)] dark:border-white/10 space-y-6 transition-colors">
        <div className="flex items-center gap-3 border-b border-[#3B0B14]/10 dark:border-white/10 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("description")}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition cursor-pointer ${
              activeTab === "description"
                ? "bg-[#3B0B14] dark:bg-[#DFB76C] text-white dark:text-[#140508] shadow-xs"
                : "bg-[#FAF8F5] dark:bg-[#150408] text-[#6E3A44] dark:text-zinc-400 hover:bg-[#3B0B14]/5"
            }`}
          >
            توضیحات و مشخصات تکمیلی
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition cursor-pointer ${
              activeTab === "reviews"
                ? "bg-[#3B0B14] dark:bg-[#DFB76C] text-white dark:text-[#140508] shadow-xs"
                : "bg-[#FAF8F5] dark:bg-[#150408] text-[#6E3A44] dark:text-zinc-400 hover:bg-[#3B0B14]/5"
            }`}
          >
            دیدگاه‌های مشتریان
          </button>
        </div>

        {activeTab === "description" ? (
          <div className="space-y-4 text-xs sm:text-sm text-[#6E3A44] dark:text-zinc-300 leading-relaxed">
            {hasDescription ? (
              <p className="whitespace-pre-line">{product.description}</p>
            ) : (
              <p>توضیحات تکمیلی برای این محصول ثبت نشده است. ساخت این اثر با دقت بالا در گالری پرنا زر انجام شده است.</p>
            )}
          </div>
        ) : (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FAF8F5] dark:bg-[#150408] border border-[#DFB76C]/30 flex items-center justify-center mx-auto text-[#8B142D] dark:text-[#DFB76C]">
              <Star size={20} />
            </div>
            <h3 className="text-base font-black text-[#3B0B14] dark:text-zinc-100">هنوز دیدگاهی ثبت نشده است</h3>
            <p className="text-xs text-[#6E3A44] dark:text-zinc-400">اولین نفری باشید که نظر خود را درباره این اثر به اشتراک می‌گذارد.</p>
          </div>
        )}
      </section>

      {isSizeGuideOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setIsSizeGuideOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#1C080E] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative border border-transparent dark:border-[#DFB76C]/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
              <h3 className="text-base font-black text-[#1E050A] dark:text-white flex items-center gap-2">
                <Ruler size={18} className="text-[#8B142D] dark:text-[#DFB76C]" />
                <span>راهنمای انتخاب سایز انگشتر</span>
              </h3>
              <button
                onClick={() => setIsSizeGuideOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-white/20 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-xs text-[#5A252E] dark:text-zinc-300 space-y-3 leading-relaxed">
              <p>برای تعیین سایز انگشتر در خانه می‌توانید از روش زیر استفاده کنید:</p>
              <div className="bg-[#FDF8F9] dark:bg-[#140508] p-3 rounded-2xl border border-[#3B0B14]/10 dark:border-white/10 space-y-1">
                <strong className="text-[#1E050A] dark:text-[#DFB76C] block">روش اندازه‌گیری محیط انگشت:</strong>
                <p>۱. یک تکه نخ یا نوار کاغذی را دور انگشت مورد نظر بپیچید.</p>
                <p>۲. محل تلاقی دو سر نخ را با خودکار علامت بزنید.</p>
                <p>۳. طول نخ را روی خط‌کش بر حسب میلی‌متر اندازه‌گیری کنید.</p>
              </div>
            </div>

            <button
              onClick={() => setIsSizeGuideOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#8B142D] dark:bg-[#DFB76C] text-white dark:text-[#140508] text-xs font-bold hover:bg-[#6e1e31] dark:hover:bg-[#E6CA7A] transition cursor-pointer"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}

      {/* نوار ثابت خرید سریع - فقط در موبایل (زیر سایز lg) نمایش داده می‌شود و در دسکتاپ پنهان است */}
      <div className="fixed left-0 right-0 bottom-16 z-40 lg:hidden">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 py-2.5 bg-[#190408]/95 backdrop-blur-2xl border-t border-[#DFB76C]/35 shadow-[0_-10px_35px_rgba(25,4,8,0.7)] text-white">
          <div className="flex items-center justify-between gap-3">
            {/* اطلاعات محصول در نوار موبایل */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white/10 border border-[#DFB76C]/30">
                {selectedImage ? (
                  <img src={selectedImage} alt={title} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-[#DFB76C]"><Gem size={18} /></div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black truncate text-white max-w-[140px] sm:max-w-xs">{title}</p>
                <div className="flex items-center gap-2 text-[10px] text-zinc-300 mt-0.5">
                  <span className="font-mono text-[#DFB76C] font-black">{formatProductPrice(selectedPrice)}</span>
                  {selectedWeight > 0 && <span className="opacity-70">| {formatWeight(selectedWeight)}</span>}
                </div>
              </div>
            </div>

            {/* اکشن‌های خرید سریع */}
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                title="مشاوره واتساپ"
                className="h-10 px-3 rounded-xl border border-emerald-500/40 bg-emerald-900/80 hover:bg-emerald-800 text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                <MessageCircle size={16} />
              </a>

              <div className="w-36 sm:w-44">
                {isSelectedOutOfStock ? (
                  <button
                    type="button"
                    disabled
                    className="w-full h-10 rounded-xl bg-zinc-700 text-zinc-300 text-[11px] font-bold cursor-not-allowed flex items-center justify-center"
                  >
                    ناموجود
                  </button>
                ) : (
                  <AddToCartButton
                    product={selectedProduct}
                    price={selectedPrice}
                    selectedVariant={selectedVariantForCart}
                    className="w-full !h-10 !py-0 flex items-center justify-center text-xs"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isImageModalOpen && selectedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#3B0B14]/90 p-2 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div
            className="relative flex h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl sm:h-[calc(100dvh-4rem)] sm:rounded-[28px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#3B0B14]/10 bg-[#3B0B14] px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{title}</p>
                {images.length > 1 && (
                  <p className="text-[11px] text-white/75">
                    تصویر {(selectedImageIndex + 1).toLocaleString("fa-IR")} از {images.length.toLocaleString("fa-IR")}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative flex flex-1 items-center justify-center p-4 bg-[#FDF8F9] overflow-hidden select-none">
              <img src={selectedImage} alt={title} className="max-h-full max-w-full object-contain rounded-2xl pointer-events-none" />

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); showPreviousImage(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#3B0B14]/80 text-white flex items-center justify-center shadow-lg hover:bg-[#8B142D] transition cursor-pointer z-20"
                    aria-label="تصویر قبلی"
                  >
                    <ChevronRight size={24} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); showNextImage(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#3B0B14]/80 text-white flex items-center justify-center shadow-lg hover:bg-[#8B142D] transition cursor-pointer z-20"
                    aria-label="تصویر بعدی"
                  >
                    <ChevronLeft size={24} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}