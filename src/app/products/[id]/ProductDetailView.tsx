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
    <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-3 hidden w-[min(340px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-[#1C3324]/15 bg-white p-4 text-right shadow-xl group-hover:block">
      <div className="mb-3 text-sm font-black text-[#1C3324]">
        نحوه محاسبه قیمت محصول
      </div>

      <div className="space-y-2 text-xs leading-6 text-[#3A5A46]">
        <div>(قیمت طلا خام + اجرت) × وزن طلا + متعلقات + ۷٪ سود + ۹٪ مالیات</div>

        <div className="mt-3 rounded-xl bg-white border border-[#8B263E]/20 px-3 py-2 text-[11px] font-bold text-[#8B263E]">
          قیمت نهایی با قیمت روز طلا محاسبه می‌شود.
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
    <div className="flex items-start gap-3 rounded-2xl border border-[#1C3324]/10 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1C3324]/25 shadow-xs">
      <div className="mt-0.5 shrink-0 text-[#8B263E]">
        {icon}
      </div>

      <div>
        <div className="font-bold text-xs sm:text-sm text-[#1C3324]">
          {title}
        </div>

        <div className="text-[11px] sm:text-xs leading-6 text-[#3A5A46] mt-0.5">
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

  const selectedPriceInfo = useMemo(() => {
    if (selectedWeight <= 0) return null;
    return calcProductPrice(
      { ...product, weight: selectedWeight },
      goldGramPrice,
    );
  }, [goldGramPrice, product, selectedWeight]);

  const selectedPrice = selectedPriceInfo?.total ?? null;

  const installmentCount = 3;
  const installmentWeight = selectedWeight > 0 ? selectedWeight / installmentCount : null;
  const installmentPrice =
    selectedPrice !== null && selectedPrice > 0
      ? Math.ceil(selectedPrice / installmentCount)
      : null;

  const installmentProduct = useMemo<ProductType>(
    () => ({
      ...product,
      title: `${title} (قسط اول از ۳ - وزن سهمی: ${installmentWeight?.toFixed(3)} گرم)`,
      weight: installmentWeight ?? selectedWeight,
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
    <div className="w-full pt-1 sm:pt-2 pb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <section className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:gap-10 items-start">
        {/* ستون گالری با حالت Sticky و کارت‌های اعتماد در پایین آن */}
        <div className="min-w-0 lg:sticky lg:top-6 self-start space-y-4">
          <div className="rounded-[22px] border border-[#1C3324]/15 bg-white p-3 shadow-xs sm:rounded-[28px] sm:p-5">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="relative overflow-hidden rounded-[18px] border border-[#1C3324]/15 bg-white sm:rounded-[24px]">
                <div className="aspect-square min-h-[280px] p-3 sm:min-h-[420px] sm:p-4">
                  {selectedImage ? (
                    <button
                      type="button"
                      onClick={() => setIsImageModalOpen(true)}
                      className="group relative flex h-full w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-[14px] focus:outline-none focus:ring-4 focus:ring-[#1C3324]/25 sm:rounded-[18px]"
                      aria-label={`بزرگ‌نمایی تصویر ${title}`}
                    >
                      <img
                        src={selectedImage}
                        alt={title}
                        className="h-full w-full rounded-[14px] object-contain transition-transform duration-500 group-hover:scale-[1.035] sm:rounded-[18px]"
                      />
                      <span className="absolute bottom-3 left-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1C3324]/80 text-white shadow-lg backdrop-blur-sm transition-all duration-200 group-hover:bg-[#8B263E] sm:bottom-4 sm:left-4 sm:h-auto sm:w-auto sm:gap-2 sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-xs sm:opacity-0 sm:group-hover:opacity-100">
                        <Maximize2 className="h-4 w-4" />
                        <span className="hidden sm:inline">بزرگ‌نمایی تصویر</span>
                      </span>
                    </button>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-[#3A5A46]">
                      <Gem className="mb-3 h-14 w-14 text-[#1C3324] sm:h-16 sm:w-16" />
                      <span className="text-sm font-bold">تصویر محصول موجود نیست</span>
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
                            "group relative w-[72px] shrink-0 overflow-hidden rounded-xl border bg-white p-1 transition-all duration-200 sm:w-[88px] sm:rounded-2xl sm:p-1.5 cursor-pointer",
                            isActive
                              ? "border-[#8B263E] shadow-sm ring-2 ring-[#8B263E]/25"
                              : "border-[#1C3324]/15 hover:border-[#1C3324]/35",
                          ].join(" ")}
                        >
                          <div className="aspect-square overflow-hidden rounded-[10px] bg-white sm:rounded-[14px]">
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

          <div className="grid grid-cols-2 gap-3">
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
        <div className="min-w-0 rounded-[22px] border border-[#1C3324]/15 bg-white p-4 shadow-xs sm:rounded-[28px] sm:p-6 lg:p-8">
          <div className="mb-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                <span className="rounded-full bg-[#1C3324] px-3 py-1 text-white shadow-xs">
                  سروین استودیو
                </span>
                <span className="rounded-full border border-[#1C3324]/15 bg-white px-2.5 py-1 text-[#1C3324]">
                  عیار {karat}
                </span>
                <span className="rounded-full border border-[#1C3324]/10 bg-[#FAF9F6] px-2.5 py-1 font-mono text-[#3A5A46]">
                  کد: {currentSku}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#8B263E]/20 bg-[#8B263E]/5 px-2.5 py-1 text-[#8B263E]">
                  <Palette size={12} />
                  <span>طلای {productItemColor}</span>
                </span>
              </div>

              {isRingProduct && (
                <button
                  type="button"
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#8B263E]/25 bg-white px-3 py-1 text-[11px] font-bold text-[#8B263E] shadow-2xs transition-all hover:bg-[#8B263E] hover:text-white cursor-pointer"
                >
                  <Ruler size={13} />
                  <span>راهنمای سایز</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5 pt-1">
              <h1 className="text-2xl font-black tracking-tight text-[#1C3324] sm:text-3xl lg:text-[2rem] leading-tight">
                {title}
              </h1>
              <p className="text-xs sm:text-sm leading-relaxed text-[#3A5A46]/90">
                {shortDetail}
              </p>
            </div>
          </div>

          {/* انتخاب وزن با خط زدن روی وزن‌های ناموجود و عدم نمایش آماده ارسال */}
          {weightOptions.length > 1 && (
            <div className="mb-5 rounded-[18px] border border-[#1C3324]/15 bg-white p-4 sm:mb-6 sm:rounded-[22px] sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-[#1C3324]">انتخاب وزن / سایز</h2>
                  <p className="mt-1 text-xs text-[#3A5A46]">وزن موردنظر خود را انتخاب کنید.</p>
                </div>
                <Weight className="h-6 w-6 shrink-0 text-[#8B263E]" />
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
                          ? "border-[#1C3324] bg-white shadow-sm ring-2 ring-[#1C3324]/20 font-bold"
                          : "border-[#1C3324]/15 bg-white text-[#3A5A46] hover:border-[#1C3324]/40",
                        isOptionOutOfStock ? "cursor-not-allowed bg-red-50/40 opacity-60 border-red-200" : "",
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
                          isOptionOutOfStock ? "text-red-700 line-through" : "text-[#1C3324]",
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
                        <span className={`relative z-10 block text-[10px] font-bold mt-0.5 ${!isMadeToOrder ? "text-emerald-700" : "text-amber-700"}`}>
                          {!isMadeToOrder ? "آماده ارسال" : "سفارش ساخت"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-5 rounded-[18px] border border-[#1C3324]/15 bg-white p-4 sm:mb-6 sm:rounded-[22px] sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#3A5A46]">قیمت کل محصول</span>
              <span className="text-[11px] text-[#8B263E] font-bold">عیار {karat}</span>
            </div>

            <div className="flex flex-wrap items-end gap-2 sm:gap-3">
              <strong className="text-2xl font-black text-[#8B263E] sm:text-3xl">
                {formatProductPrice(selectedPrice)}
              </strong>
            </div>

            {/* وضعیت تحویل بر اساس stock واقعی و زمان ساخت */}
            <div className="flex items-center gap-2 pt-1 text-xs">
              {isSelectedOutOfStock ? (
                <span className="inline-flex items-center gap-1.5 text-red-700 font-bold bg-red-50 px-3 py-1.5 rounded-xl border border-red-200">
                  <X size={14} />
                  <span>این وزن در حال حاضر ناموجود است</span>
                </span>
              ) : isMadeToOrder ? (
                <span className="inline-flex items-center gap-1.5 text-amber-850 font-bold bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                  <Clock size={14} />
                  <span>سفارش ساخت (زمان ساخت و آماده‌سازی: {leadTimeDays} روز کاری)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <Package size={14} />
                  <span>موجود در گالری سروین (آماده تحویل و ارسال فوری)</span>
                </span>
              )}
            </div>

            {hasStone && (
              <div className="mt-2 text-[11px] text-[#8B263E] font-bold bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                💎 این اثر دارای سنگ/نگین می‌باشد: {stoneDetails} {stoneWeight ? `(وزن سنگ: ${stoneWeight})` : ""}
              </div>
            )}
          </div>

          <div className="mb-5 grid grid-cols-3 gap-2 sm:mb-6 sm:gap-3">
            <div className="rounded-xl bg-white border border-[#1C3324]/10 p-3 sm:rounded-2xl sm:p-4">
              <Weight className="mb-2 h-5 w-5 text-[#8B263E]" />
              <span className="block text-xs text-[#3A5A46]">وزن کل</span>
              <strong className="mt-1 block text-xs text-[#1C3324] sm:text-sm">
                {formatWeight(selectedWeight)}
              </strong>
            </div>
            <div className="rounded-xl bg-white border border-[#1C3324]/10 p-3 sm:rounded-2xl sm:p-4">
              <Gem className="mb-2 h-5 w-5 text-[#8B263E]" />
              <span className="block text-xs text-[#3A5A46]">عیار</span>
              <strong className="mt-1 block text-xs text-[#1C3324] sm:text-sm">{karat}</strong>
            </div>
            <div className="rounded-xl bg-white border border-[#1C3324]/10 p-3 sm:rounded-2xl sm:p-4">
              <BadgeCheck className="mb-2 h-5 w-5 text-[#8B263E]" />
              <span className="block text-xs text-[#3A5A46]">اصالت</span>
              <strong className="mt-1 block text-xs text-[#1C3324] sm:text-sm">تضمین‌شده</strong>
            </div>
          </div>

          <div className="mb-5 flex justify-center sm:mb-6">
            <div className="group relative inline-flex">
              <button
                type="button"
                className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-2xl border border-[#1C3324]/20 bg-white px-5 py-3 text-sm font-extrabold text-[#1C3324] shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1C3324]/5 sm:min-w-[240px] sm:rounded-3xl sm:px-7 sm:py-4 sm:text-base cursor-pointer"
              >
                <CircleDollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-[#8B263E]" />
                نحوه محاسبه قیمت
              </button>
              <PriceTooltip />
            </div>
          </div>

          <div className="mb-5 grid gap-3 sm:mb-6 sm:grid-cols-2">
            <div className="h-[52px] flex items-center w-full">
              {isSelectedOutOfStock ? (
                <button
                  type="button"
                  disabled
                  className="w-full h-[52px] rounded-2xl bg-gray-200 text-gray-500 text-xs font-bold cursor-not-allowed flex items-center justify-center"
                >
                  محصول با این وزن ناموجود است
                </button>
              ) : (
                <AddToCartButton
                  product={selectedProduct}
                  price={selectedPrice}
                  selectedVariant={selectedVariantForCart}
                  className="w-full !h-[52px] !py-0 flex items-center justify-center"
                />
              )}
            </div>

            <div className="h-[52px] flex items-center w-full">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full h-[52px] items-center justify-center gap-2 rounded-2xl border border-[#25D366]/30 bg-[#25D366] px-6 text-sm font-extrabold text-white transition hover:bg-[#1fb85a] shadow-xs cursor-pointer"
              >
                <MessageCircle size={18} />
                <span>مشاوره و سفارش از واتساپ</span>
              </a>
            </div>
          </div>

          {/* طرح اقساط طلایی */}
          <div className="rounded-[22px] border border-[#1C3324]/20 bg-white p-5 text-[#1C3324] shadow-xs sm:rounded-[26px] sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-base font-black text-[#8B263E]">
                  <Sparkles className="h-5 w-5 text-[#8B263E]" />
                  <span>طرح اقساط طلایی سروین (۳ قسط بدون چک)</span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl p-1">
                {authLoaded && !isLoggedIn && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-[3px] text-center p-3">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1C3324] text-white shadow-md">
                        <Lock className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-black text-[#1C3324]">
                        برای مشاهده جدول اقساط لطفا وارد حساب کاربری خود شوید
                      </span>
                      <Link
                        href="/login"
                        className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-[#1C3324] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#8B263E] transition-colors"
                      >
                        ورود به حساب کاربری
                      </Link>
                    </div>
                  </div>
                )}

                <div className={!isLoggedIn ? "opacity-30 filter blur-[4px] select-none pointer-events-none" : ""}>
                  <p className="text-xs leading-6 text-[#3A5A46]">
                    قسط اول همین الان بر اساس یک‌سوم مبلغ کل نهایی محاسبه شده و به سبد خرید اضافه می‌شود. اقساط بعدی در زمان سررسید با قیمت روز تسویه می‌گردند.
                  </p>

                  {installmentWeight !== null && installmentPrice !== null && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="rounded-2xl bg-[#FAF9F6] p-3 text-right border-2 border-[#1C3324] shadow-xs">
                        <span className="block text-[10px] font-extrabold text-[#8B263E]">۱. قسط اول (همین الان):</span>
                        <strong className="block text-xs font-black text-[#1C3324] mt-1">
                          {formatProductPrice(installmentPrice)}
                        </strong>
                        <span className="block text-[10px] text-[#3A5A46] mt-0.5">وزن سهمی: {installmentWeight.toFixed(2)} گرم (یک‌سوم کل)</span>
                      </div>

                      <div className="rounded-2xl bg-[#FAF9F6] p-3 text-right border border-[#1C3324]/15">
                        <span className="block text-[10px] font-bold text-[#3A5A46]">۲. قسط دوم (ماه آینده):</span>
                        <strong className="block text-xs font-black text-[#1C3324] mt-1">
                          محاسبه با قیمت روز
                        </strong>
                        <span className="block text-[10px] text-[#3A5A46] mt-0.5">وزن سهمی: {installmentWeight.toFixed(2)} گرم</span>
                      </div>

                      <div className="rounded-2xl bg-[#FAF9F6] p-3 text-right border border-[#1C3324]/15">
                        <span className="block text-[10px] font-bold text-[#3A5A46]">۳. قسط سوم (ماه بعد):</span>
                        <strong className="block text-xs font-black text-[#1C3324] mt-1">
                          محاسبه با قیمت روز
                        </strong>
                        <span className="block text-[10px] text-[#3A5A46] mt-0.5">وزن سهمی: {installmentWeight.toFixed(2)} گرم</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {authLoaded && isLoggedIn && installmentPrice !== null && (
                <div className="space-y-2 pt-2 border-t border-[#1C3324]/15">
                  {isSelectedOutOfStock ? (
                    <button
                      type="button"
                      disabled
                      className="w-full h-[50px] rounded-2xl bg-gray-200 text-gray-500 text-xs font-bold cursor-not-allowed flex items-center justify-center"
                    >
                      خرید اقساطی به دلیل ناموجودی این وزن امکان‌پذیر نیست
                    </button>
                  ) : (
                    <div className="w-full [&_button]:!w-full [&_button]:!h-[50px] [&_button]:!bg-[#1C3324] [&_button]:hover:!bg-[#8B263E] [&_button]:!text-white [&_button]:!rounded-2xl [&_button]:!border-none [&_button]:!shadow-xs [&_button_*]:!text-white">
                      <AddToCartButton
                        product={installmentProduct}
                        price={installmentPrice}
                        selectedVariant={selectedVariantForCart}
                        className="w-full !h-[50px] !bg-[#1C3324] hover:!bg-[#8B263E] !text-white !rounded-2xl !border-none !text-xs !font-black cursor-pointer shadow-xs"
                      />
                    </div>
                  )}
                  <p className="text-[11px] text-center text-[#3A5A46]">
                    با کلیک روی دکمه بالا، مبلغ <span className="font-bold text-[#1C3324]">قسط اول</span> به همراه مشخصات انتخاب‌شده به سبد خرید اضافه خواهد شد.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-14 rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#1C3324]/10 pb-4">
          <div>
            <span className="text-xs font-bold text-[#8B263E] block mb-1">کلکسیون اختصاصی</span>
            <h2 className="text-xl sm:text-2xl font-black text-[#1C3324]">بهترین انتخاب از استودیو سروین</h2>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C3324] hover:text-[#8B263E] transition cursor-pointer"
          >
            <span>مشاهده همه آثار</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#1C3324]/10 space-y-2">
            <Sparkles className="text-[#8B263E]" size={22} />
            <h3 className="font-bold text-sm text-[#1C3324]">طراحی الهام‌گرفته از سرو</h3>
            <p className="text-xs text-[#3A5A46] leading-relaxed">تلفیق هنر اصیل ایرانی با مینیمالیسم مدرن برای بانوان خاص‌پوش.</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#1C3324]/10 space-y-2">
            <ShieldCheck className="text-[#8B263E]" size={22} />
            <h3 className="font-bold text-sm text-[#1C3324]">عیار ۱۸ استاندارد</h3>
            <p className="text-xs text-[#3A5A46] leading-relaxed">تضمین عیار رسمی طلا همراه با فاکتور معتبر و قابل استعلام.</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#1C3324]/10 space-y-2">
            <HeartHandshake className="text-[#8B263E]" size={22} />
            <h3 className="font-bold text-sm text-[#1C3324]">خرید اقساطی بدون چک</h3>
            <p className="text-xs text-[#3A5A46] leading-relaxed">طرح ویژه سه مرحله‌ای با محاسبه منصفانه مبتنی بر نرخ روز.</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#1C3324]/10 space-y-2">
            <Truck className="text-[#8B263E]" size={22} />
            <h3 className="font-bold text-sm text-[#1C3324]">بسته‌بندی هدیه لوکس</h3>
            <p className="text-xs text-[#3A5A46] leading-relaxed">ارسال امن با بسته‌بندی ویژه و مناسب هدیه دادن به عزیزانتان.</p>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-[#1C3324]/10 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("description")}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition cursor-pointer ${
              activeTab === "description"
                ? "bg-[#1C3324] text-white shadow-xs"
                : "bg-[#FAF9F6] text-[#3A5A46] hover:bg-[#1C3324]/5"
            }`}
          >
            توضیحات و مشخصات تکمیلی
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition cursor-pointer ${
              activeTab === "reviews"
                ? "bg-[#1C3324] text-white shadow-xs"
                : "bg-[#FAF9F6] text-[#3A5A46] hover:bg-[#1C3324]/5"
            }`}
          >
            دیدگاه‌های مشتریان
          </button>
        </div>

        {activeTab === "description" ? (
          <div className="space-y-4 text-xs sm:text-sm text-[#3A5A46] leading-relaxed">
            {hasDescription ? (
              <p className="whitespace-pre-line">{product.description}</p>
            ) : (
              <p>توضیحات تکمیلی برای این محصول ثبت نشده است. ساخت این اثر با دقت بالا در استودیو سروین انجام شده است.</p>
            )}
          </div>
        ) : (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#1C3324]/15 flex items-center justify-center mx-auto text-[#8B263E]">
              <Star size={20} />
            </div>
            <h3 className="text-base font-black text-[#1C3324]">هنوز دیدگاهی ثبت نشده است</h3>
            <p className="text-xs text-[#3A5A46]">اولین نفری باشید که نظر خود را درباره این اثر به اشتراک می‌گذارد.</p>
          </div>
        )}
      </section>

      {isSizeGuideOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setIsSizeGuideOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-[#1C3324] flex items-center gap-2">
                <Ruler size={18} className="text-[#8B263E]" />
                <span>راهنمای انتخاب سایز انگشتر</span>
              </h3>
              <button
                onClick={() => setIsSizeGuideOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-xs text-[#3A5A46] space-y-3 leading-relaxed">
              <p>برای تعیین سایز انگشتر در خانه می‌توانید از روش زیر استفاده کنید:</p>
              <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-[#1C3324]/10 space-y-1">
                <strong className="text-[#1C3324] block">روش اندازه‌گیری محیط انگشت:</strong>
                <p>۱. یک تکه نخ یا نوار کاغذی را دور انگشت مورد نظر بپیچید.</p>
                <p>۲. محل تلاقی دو سر نخ را با خودکار علامت بزنید.</p>
                <p>۳. طول نخ را روی خط‌کش بر حسب میلی‌متر اندازه‌گیری کنید.</p>
              </div>
            </div>

            <button
              onClick={() => setIsSizeGuideOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#1C3324] text-white text-xs font-bold hover:bg-[#8B263E] transition cursor-pointer"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}

      {isImageModalOpen && selectedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1C3324]/90 p-2 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div
            className="relative flex h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl sm:h-[calc(100dvh-4rem)] sm:rounded-[28px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1C3324]/10 bg-[#1C3324] px-4 py-3">
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

            <div className="relative flex flex-1 items-center justify-center p-4 bg-[#FAF9F6] overflow-hidden select-none">
              <img src={selectedImage} alt={title} className="max-h-full max-w-full object-contain rounded-2xl pointer-events-none" />

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); showPreviousImage(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#1C3324]/80 text-white flex items-center justify-center shadow-lg hover:bg-[#8B263E] transition cursor-pointer z-20"
                    aria-label="تصویر قبلی"
                  >
                    <ChevronRight size={24} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); showNextImage(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#1C3324]/80 text-white flex items-center justify-center shadow-lg hover:bg-[#8B263E] transition cursor-pointer z-20"
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