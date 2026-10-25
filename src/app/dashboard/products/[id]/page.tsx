"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Edit3,
  Gem,
  Package,
  RefreshCw,
  Tag,
  Weight,
  Percent,
  CircleDollarSign,
  Layers,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Hash,
  CalendarDays,
  Copy,
  Printer,
  Sparkles,
  ExternalLink,
  Scale,
  ShieldCheck,
  TrendingUp,
  Boxes,
  Clock,
  Eye,
  Check,
} from "lucide-react";

import pb from "@/lib/pocketbase";
import { getGoldGramPrice } from "@/lib/product-detail";
import {
  calculateDynamicGoldPrice,
  formatPrice,
  getColorName,
  getProductColor,
  getProductDescription,
  getProductImageUrl,
  getProductKarat,
  getProductName,
  getProductWeight,
  parseProductVariants,
  type ProductItem,
  type ProductVariantLike,
} from "@/lib/products";
import { recordAuditLogClient } from "@/lib/audit-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* =========================================================
   Types
========================================================= */

type CategoryRecord = {
  id: string;
  name?: string;
  title?: string;
  label?: string;
  category_name?: string;
};

type ProductExpand = {
  category?: CategoryRecord | CategoryRecord[] | null;
};

type ProductRecord = ProductItem & {
  isactive?: boolean;
  stock?: number | string | null;
  wage_percent?: number | string | null;
  profit_percent?: number | string | null;
  tax_percent?: number | string | null;
  lead_time_days?: number | string | null;
  colour?: string | null;
  category?: string | string[] | null;
  sku?: string | null;
  collectionId?: string;
  collectionName?: string;
  expand?: ProductExpand;
};

/* =========================================================
   Helpers
========================================================= */

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "string") {
    const normalized = value
      .replace(/,/g, "")
      .replace(/،/g, "")
      .replace(/[۰-۹]/g, (digit) =>
        String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
      );

    const result = Number(normalized);
    return Number.isFinite(result) ? result : 0;
  }

  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function formatNumber(value: unknown): string {
  return toNumber(value).toLocaleString("fa-IR");
}

function formatWeight(value: unknown): string {
  return toNumber(value).toLocaleString("fa-IR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function getCategoryNames(product: ProductRecord): string[] {
  const expanded = product.expand?.category;

  if (expanded) {
    const categories = Array.isArray(expanded) ? expanded : [expanded];
    const names = categories
      .map(
        (category) =>
          category.name ||
          category.title ||
          category.label ||
          category.category_name ||
          ""
      )
      .map((name) => name.trim())
      .filter(Boolean);

    if (names.length > 0) {
      return Array.from(new Set(names));
    }
  }

  const rawCategory = product.category;
  if (Array.isArray(rawCategory)) {
    return rawCategory.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    );
  }

  if (typeof rawCategory === "string" && rawCategory.trim()) {
    return rawCategory
      .split(/[،,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

/* =========================================================
   Page Component
========================================================= */

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const productId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [goldRate, setGoldRate] = useState<number>(25658600);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [duplicating, setDuplicating] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [copiedSku, setCopiedSku] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);

  /* =======================================================
     Load Product & Gold Rate
  ======================================================= */

  const loadData = useCallback(async () => {
    if (!productId) {
      setError("شناسه محصول نامعتبر است.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [rate, record] = await Promise.all([
        getGoldGramPrice(),
        pb.collection("products").getOne<ProductRecord>(productId, {
          expand: "category",
          requestKey: null,
        }),
      ]);

      if (rate && rate > 0) {
        setGoldRate(rate);
      }

      setProduct(record);

      const variants = parseProductVariants(record);
      if (variants.length > 0) {
        const defaultVariant =
          variants.find((v) => v.is_default === true) ?? variants[0];
        if (defaultVariant?.id) {
          setSelectedVariantId(String(defaultVariant.id));
        }
      }
    } catch (err) {
      console.error("PocketBase product details error:", err);
      setError("اطلاعات محصول پیدا نشد یا دسترسی به آن امکان‌پذیر نیست.");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* =======================================================
     Duplicate Product
  ======================================================= */

  const handleDuplicateProduct = async () => {
    if (!product || duplicating) return;

    try {
      setDuplicating(true);
      const { id, created, updated, collectionId, collectionName, expand, ...productData } =
        product as any;

      const newRecord = await pb.collection("products").create({
        ...productData,
        title: `${getProductName(product)} (کپی)`,
        sku: product.sku ? `${product.sku}-COPY` : `SRV-${Math.floor(100 + Math.random() * 900)}`,
      });

      void recordAuditLogClient({
        category: "stock",
        title: `کپی محصول: ${getProductName(product)}`,
        description: `محصول جدید بر اساس «${getProductName(product)}» تکثیر گردید.`,
        level: "info",
        targetId: newRecord.id,
        targetType: "product",
      });

      if (newRecord?.id) {
        router.push(`/dashboard/products/${newRecord.id}`);
      }
    } catch (err) {
      console.error("Error duplicating product:", err);
      alert("خطا در کپی کردن محصول رخ داد.");
    } finally {
      setDuplicating(false);
    }
  };

  /* =======================================================
     Toggle Active Showcase Status
  ======================================================= */

  const handleToggleActive = async () => {
    if (!product || isTogglingActive) return;

    try {
      setIsTogglingActive(true);
      const nextActive = !Boolean(product.isactive);
      await pb.collection("products").update(product.id, {
        isactive: nextActive,
      });

      setProduct((prev) => (prev ? { ...prev, isactive: nextActive } : prev));

      void recordAuditLogClient({
        category: "stock",
        title: `تغییر وضعیت ویترین: ${getProductName(product)}`,
        description: `وضعیت انتشار در ویترین آنلاین به «${nextActive ? "فعال و نمایان" : "مخفی و غیرفعال"}» تغییر یافت.`,
        level: "info",
        targetId: product.id,
        targetType: "product",
      });
    } catch (err) {
      console.error("Error toggling active status:", err);
      alert("خطا در تغییر وضعیت نمایش در ویترین رخ داد.");
    } finally {
      setIsTogglingActive(false);
    }
  };

  /* =======================================================
     Derived Product Data & Calculations
  ======================================================= */

  const variants = useMemo<ProductVariantLike[]>(
    () => (product ? parseProductVariants(product) : []),
    [product]
  );

  const selectedVariant = useMemo(() => {
    if (!selectedVariantId) return variants[0] ?? null;
    return variants.find((v) => String(v.id) === selectedVariantId) ?? variants[0] ?? null;
  }, [variants, selectedVariantId]);

  const displayWeight = selectedVariant
    ? toNumber(selectedVariant.weight)
    : product
    ? getProductWeight(product)
    : 0;

  const displayKarat = product ? getProductKarat(product) : 18;
  const stock = selectedVariant ? toNumber(selectedVariant.stock) : product ? toNumber(product.stock) : 0;
  const wage = product ? toNumber(product.wage_percent) : 0;
  const profit = product && product.profit_percent !== undefined && product.profit_percent !== null ? toNumber(product.profit_percent) : 7;
  const tax = product && product.tax_percent !== undefined && product.tax_percent !== null ? toNumber(product.tax_percent) : 9;
  const leadTimeDays = product ? toNumber(product.lead_time_days) : 3;

  // Real-time gold price calculation
  const priceCalculation = useMemo(() => {
    if (displayWeight <= 0 || !goldRate || goldRate <= 0) return null;
    return calculateDynamicGoldPrice(
      {
        weight: displayWeight,
        karat: displayKarat,
        wage_percent: wage,
        profit_percent: profit,
        tax_percent: tax,
      },
      goldRate
    );
  }, [displayWeight, displayKarat, wage, profit, tax, goldRate]);

  // Images list
  const allImages = useMemo(() => {
    if (!product) return [];
    const imgs = product.images;
    if (Array.isArray(imgs)) {
      return imgs
        .filter((img): img is string => typeof img === "string" && img.trim().length > 0)
        .map((img) => `${pb.baseUrl}/api/files/products/${product.id}/${img}`);
    }
    if (typeof imgs === "string" && imgs.trim()) {
      return [`${pb.baseUrl}/api/files/products/${product.id}/${imgs.trim()}`];
    }
    const single = getProductImageUrl(product);
    return single ? [single] : [];
  }, [product]);

  const categories = useMemo(() => (product ? getCategoryNames(product) : []), [product]);
  const productName = product ? getProductName(product) : "";
  const description = product ? getProductDescription(product) : "";
  const shortDetail = product?.short_detail ? String(product.short_detail) : "";
  const color = product ? getProductColor(product) : null;
  const isActive = product?.isactive ?? true;

  const status = !isActive
    ? "inactive"
    : stock <= 0
    ? "out"
    : stock <= 2
    ? "low"
    : "available";

  const handleCopySku = () => {
    const sku = product?.sku || "";
    if (sku) {
      navigator.clipboard.writeText(sku);
      setCopiedSku(true);
      setTimeout(() => setCopiedSku(false), 2000);
    }
  };

  /* =======================================================
     Loading State
  ======================================================= */

  if (loading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#FAF9F6] dark:bg-[#101813]"
      >
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-[#8B263E] dark:text-[#D8B65C]" />
          <span className="text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
            در حال دریافت شناسنامه محصول و استعلام مظنه طلا...
          </span>
        </div>
      </div>
    );
  }

  /* =======================================================
     Error State
  ======================================================= */

  if (error || !product) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#FAF9F6] p-6 font-sans text-[#1C3324] dark:bg-[#101813] dark:text-zinc-100"
      >
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xs dark:border-rose-900/40 dark:bg-[#15221B]">
            <XCircle className="mx-auto h-12 w-12 text-rose-600 dark:text-rose-400" />
            <h1 className="mt-4 text-lg font-black text-[#1C3324] dark:text-zinc-100">
              محصول پیدا نشد
            </h1>
            <p className="mt-2 text-xs font-medium text-[#3A5A46] dark:text-zinc-400">
              {error || "اطلاعات این محصول در دیتابیس موجود نیست یا حذف شده است."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="default"
                size="default"
                onClick={() => void loadData()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                تلاش مجدد
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={() => router.push("/dashboard/products")}
              >
                بازگشت به لیست محصولات
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     Main Render
  ======================================================= */

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#FAF9F6] p-4 font-sans text-[#1C3324] sm:p-6 lg:p-8 dark:bg-[#101813] dark:text-zinc-100"
    >
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Top Header / Actions Bar */}
        <div className="flex flex-col justify-between gap-5 rounded-3xl border border-[#1C3324]/12 bg-white/80 p-5 shadow-xs backdrop-blur-md transition-colors lg:flex-row lg:items-center lg:p-6 dark:border-white/10 dark:bg-[#15221B]/80">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs font-bold text-[#3A5A46] hover:text-[#8B263E] dark:text-zinc-400 dark:hover:text-[#D8B65C]"
              >
                <Link href="/dashboard/products">
                  <ArrowRight className="h-4 w-4" />
                  بازگشت به ویترین و کاتالوگ
                </Link>
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1C3324] text-white shadow-xs dark:bg-[#D8B65C] dark:text-[#101813]">
                <Gem className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[#1C3324] sm:text-3xl dark:text-zinc-100">
                  {productName}
                </h1>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-[#8B263E] dark:text-[#D8B65C]">
                    {product.sku || `#${product.id.slice(0, 8)}`}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySku}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    title="کپی شناسه کالا"
                  >
                    {copiedSku ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <span className="text-xs text-[#3A5A46] dark:text-zinc-400">·</span>
                  <span className="text-xs text-[#3A5A46] dark:text-zinc-400">
                    مظنه مرجع طلا: {goldRate.toLocaleString("fa-IR")} تومان / گرم
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="default"
              onClick={handleToggleActive}
              disabled={isTogglingActive}
              className={cn(
                "gap-2",
                isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                  : "border-zinc-300 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              )}
            >
              {isActive ? <Eye className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              <span>{isActive ? "نمایان در ویترین آنلاین" : "مخفی در فروشگاه"}</span>
            </Button>

            <Button
              asChild
              variant="outline"
              size="default"
              className="gap-2"
            >
              <Link href={`/products/${product.id}`} target="_blank">
                <ExternalLink className="h-4 w-4" />
                <span>مشاهده در سایت</span>
              </Link>
            </Button>

            <Button
              variant="outline"
              size="default"
              onClick={() => window.print()}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              <span>چاپ شناسنامه</span>
            </Button>

            <Button
              variant="outline"
              size="default"
              onClick={() => void handleDuplicateProduct()}
              disabled={duplicating}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              <span>{duplicating ? "در حال کپی..." : "کپی کالا"}</span>
            </Button>

            <Button
              asChild
              variant="default"
              size="default"
              className="gap-2"
            >
              <Link href={`/dashboard/products/${product.id}/edit`}>
                <Edit3 className="h-4 w-4" />
                <span>ویرایش محصول</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Status Badges Row */}
        <div className="flex flex-wrap items-center gap-2">
          {status === "available" && (
            <Badge variant="success" className="gap-1.5 px-3 py-1 text-xs font-bold">
              <CheckCircle2 className="h-4 w-4" />
              موجود در انبار ({stock.toLocaleString("fa-IR")} عدد)
            </Badge>
          )}

          {status === "low" && (
            <Badge variant="warning" className="gap-1.5 px-3 py-1 text-xs font-bold">
              <AlertCircle className="h-4 w-4" />
              موجودی کم در انبار ({stock.toLocaleString("fa-IR")} عدد)
            </Badge>
          )}

          {status === "out" && (
            <Badge variant="destructive" className="gap-1.5 px-3 py-1 text-xs font-bold">
              <XCircle className="h-4 w-4" />
              اتمام موجودی در ویترین
            </Badge>
          )}

          {status === "inactive" && (
            <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs font-bold">
              <XCircle className="h-4 w-4" />
              غیرفعال در ویترین آنلاین
            </Badge>
          )}

          <Badge variant="outline" className="gap-1.5 px-3 py-1 text-xs font-bold">
            <Clock className="h-3.5 w-3.5 text-[#8B263E] dark:text-[#D8B65C]" />
            زمان ساخت و تحویل: {leadTimeDays.toLocaleString("fa-IR")} روز کاری
          </Badge>
        </div>

        {/* Main Grid: Images + Core Specs */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

          {/* Left/Main Column: Image Gallery (4 Cols) */}
          <div className="space-y-4 lg:col-span-4">
            <Card className="overflow-hidden border-[#1C3324]/12 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80">
              <div className="aspect-square bg-[#FAF9F6] relative overflow-hidden dark:bg-zinc-900/60 flex items-center justify-center">
                {allImages.length > 0 ? (
                  <img
                    src={allImages[selectedImageIndex] || allImages[0]}
                    alt={productName}
                    className="h-full w-full object-cover transition duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 text-[#3A5A46] dark:text-zinc-500">
                    <Gem className="h-16 w-16" />
                    <span className="text-xs font-bold">تصویر محصول بارگذاری نشده است</span>
                  </div>
                )}
              </div>

              {/* Thumbnails Row */}
              {allImages.length > 1 && (
                <div className="flex items-center gap-2 p-3 overflow-x-auto border-t border-[#1C3324]/10 dark:border-white/10">
                  {allImages.map((img, idx) => (
                    <button
                      key={img}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={cn(
                        "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border transition",
                        selectedImageIndex === idx
                          ? "border-[#8B263E] ring-2 ring-[#8B263E]/20 dark:border-[#D8B65C]"
                          : "border-black/10 opacity-70 hover:opacity-100 dark:border-white/10"
                      )}
                    >
                      <img src={img} alt={`thumb-${idx}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Quick Details Card */}
            <Card className="border-[#1C3324]/12 bg-white/80 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80">
              <h3 className="text-xs font-black text-[#1C3324] mb-3 dark:text-zinc-100">
                مشخصات ظاهری و دسته‌بندی
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[#3A5A46] dark:text-zinc-400">رنگ طلای پایه:</span>
                  <span className="font-bold text-[#1C3324] dark:text-zinc-200">
                    {color ? getColorName(color) : "طلای زرد"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[#3A5A46] dark:text-zinc-400">دسته‌بندی‌ها:</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {categories.length > 0 ? (
                      categories.map((c) => (
                        <Badge key={c} variant="secondary" className="text-[10px] py-0 px-2 font-bold">
                          {c}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-zinc-400">بدون دسته</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[#3A5A46] dark:text-zinc-400">کد انبارداری (SKU):</span>
                  <span className="font-mono font-bold text-[#8B263E] dark:text-[#D8B65C]">
                    {product.sku || "—"}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Dynamic Pricing Engine + Specs (8 Cols) */}
          <div className="space-y-6 lg:col-span-8">

            {/* Live Gold Pricing Box (SOLVES "تماس بگیرید") */}
            <Card className="border-[#1C3324]/12 bg-gradient-to-br from-white via-white to-amber-50/30 p-6 backdrop-blur-md dark:border-white/10 dark:from-[#15221B] dark:via-[#15221B] dark:to-emerald-950/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1C3324]/10 dark:border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <CircleDollarSign className="h-5 w-5 text-[#8B263E] dark:text-[#D8B65C]" />
                    <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                      محاسبه قیمت لحظه‌ای طلا (مظنه زنده بازار)
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
                    محاسبه شفاف بر مبنای ماده ۲۶ قانون مالیات بر ارزش افزوده و فرمول مصوب اتحادیه طلا
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-2xl bg-[#FAF9F6] px-3.5 py-2 border border-[#1C3324]/10 dark:bg-zinc-900/60 dark:border-white/10">
                  <TrendingUp className="h-4 w-4 text-[#8B263E] dark:text-[#D8B65C]" />
                  <div className="text-right">
                    <div className="text-[10px] text-[#3A5A46] dark:text-zinc-400">مظنه طلای ۱۸ عیار</div>
                    <div className="font-mono text-xs font-black text-[#1C3324] dark:text-zinc-100">
                      {goldRate.toLocaleString("fa-IR")} تومان/گرم
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              {priceCalculation ? (
                <div className="mt-6 space-y-6">
                  {/* Hero Total Price */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-[#8B263E]/5 p-5 border border-[#8B263E]/15 dark:bg-[#D8B65C]/10 dark:border-[#D8B65C]/20">
                    <div>
                      <span className="text-xs font-black text-[#8B263E] dark:text-[#D8B65C]">
                        قیمت فروش نهایی به مشتری (با احتساب کلیه کسورات قانونی)
                      </span>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-mono text-3xl font-black text-[#8B263E] sm:text-4xl dark:text-[#D8B65C]">
                          {priceCalculation.total.toLocaleString("fa-IR")}
                        </span>
                        <span className="text-sm font-bold text-[#8B263E] dark:text-[#D8B65C]">
                          تومان
                        </span>
                      </div>
                    </div>

                    <div className="text-right sm:text-left text-xs">
                      <Badge variant="gold" className="px-3 py-1 font-bold">
                        محاسبه زنده بر اساس {displayWeight.toFixed(3)} گرم
                      </Badge>
                      <p className="mt-1.5 text-[11px] text-[#3A5A46] dark:text-zinc-400">
                        قیمت با هر تغییر مظنه بازار خودکار بروز می‌شود.
                      </p>
                    </div>
                  </div>

                  {/* 4 Pillars Grid: Raw, Wage, Profit, Tax */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4 dark:border-white/10 dark:bg-zinc-900/40">
                      <span className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-400">
                        ۱. ارزش طلای خام
                      </span>
                      <div className="mt-1 font-mono text-sm font-black text-[#1C3324] dark:text-zinc-100">
                        {priceCalculation.raw.toLocaleString("fa-IR")} تومان
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {displayWeight.toFixed(3)} گرم × مظنه روز
                      </span>
                    </div>

                    <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4 dark:border-white/10 dark:bg-zinc-900/40">
                      <span className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-400">
                        ۲. اجرت ساخت ({wage}٪)
                      </span>
                      <div className="mt-1 font-mono text-sm font-black text-[#1C3324] dark:text-zinc-100">
                        {priceCalculation.wage.toLocaleString("fa-IR")} تومان
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        کارمزد ساخت کارگاه
                      </span>
                    </div>

                    <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4 dark:border-white/10 dark:bg-zinc-900/40">
                      <span className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-400">
                        ۳. سود گالری ({profit}٪)
                      </span>
                      <div className="mt-1 font-mono text-sm font-black text-[#1C3324] dark:text-zinc-100">
                        {priceCalculation.profit.toLocaleString("fa-IR")} تومان
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        سود قانونی مصوب اتحادیه
                      </span>
                    </div>

                    <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4 dark:border-white/10 dark:bg-zinc-900/40">
                      <span className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-400">
                        ۴. مالیات ارزش افزوده ({tax}٪)
                      </span>
                      <div className="mt-1 font-mono text-sm font-black text-[#1C3324] dark:text-zinc-100">
                        {priceCalculation.tax.toLocaleString("fa-IR")} تومان
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        منحصراً بر اجرت و سود (ماده ۲۶)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>
                      مطابق بخشنامه جدید سازمان امور مالیاتی، اصل طلای خام از ۹٪ ارزش افزوده معاف است و مالیات تنها بر جمع اجرت و سود اعمال شده است.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-[#1C3324]/20 p-6 text-center dark:border-white/20">
                  <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
                  <p className="mt-2 text-xs font-bold text-[#1C3324] dark:text-zinc-200">
                    وزن طلا جهت محاسبه مظنه ثبت نشده است (وزن: ۰ گرم)
                  </p>
                  <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
                    لطفاً با کلیک بر روی دکمه ویرایش، وزن پایه یا تنوع وزنی را وارد کنید تا قیمت زنده محاسبه گردد.
                  </p>
                </div>
              )}
            </Card>

            {/* Core Specifications Grid */}
            <Card className="border-[#1C3324]/12 bg-white/80 p-6 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1C3324]/10 dark:border-white/10">
                <Scale className="h-5 w-5 text-[#8B263E] dark:text-[#D8B65C]" />
                <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                  مشخصات فیزیکی و مقادیر انبارداری
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <DetailCard
                  icon={<Weight className="h-4 w-4 text-[#8B263E] dark:text-[#D8B65C]" />}
                  label="وزن انتخابی طلا"
                  value={`${formatWeight(displayWeight)} گرم`}
                  subLabel={selectedVariant ? "بر مبنای Variant فعال" : "وزن پیش‌فرض کالا"}
                />

                <DetailCard
                  icon={<Gem className="h-4 w-4 text-[#8B263E] dark:text-[#D8B65C]" />}
                  label="عیار طلا"
                  value={`${displayKarat} عیار (۷۵۰)`}
                  subLabel="استاندارد طلای ۱۸"
                />

                <DetailCard
                  icon={<Boxes className="h-4 w-4 text-[#8B263E] dark:text-[#D8B65C]" />}
                  label="موجودی انبار"
                  value={`${formatNumber(stock)} عدد`}
                  subLabel={stock > 0 ? "آماده تحویل فوری" : "نیازمند ساخت مجدد"}
                />

                <DetailCard
                  icon={<Percent className="h-4 w-4 text-[#8B263E] dark:text-[#D8B65C]" />}
                  label="درصد اجرت ساخت"
                  value={`${formatNumber(wage)}٪`}
                  subLabel="محاسبه روی طلای خام"
                />

                <DetailCard
                  icon={<Percent className="h-4 w-4 text-[#8B263E] dark:text-[#D8B65C]" />}
                  label="درصد سود فروش"
                  value={`${formatNumber(profit)}٪`}
                  subLabel="سود مصوب گالری"
                />

                <DetailCard
                  icon={<Percent className="h-4 w-4 text-[#8B263E] dark:text-[#D8B65C]" />}
                  label="درصد مالیات ارزش افزوده"
                  value={`${formatNumber(tax)}٪`}
                  subLabel="معافیت اصل طلا"
                />
              </div>
            </Card>

            {/* Variants / Weights Options */}
            <Card className="border-[#1C3324]/12 bg-white/80 p-6 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1C3324]/10 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-[#8B263E] dark:text-[#D8B65C]" />
                  <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                    تنوع‌های وزنی (Variants) و موجودی هر اندازه
                  </h2>
                </div>
                <Badge variant="secondary" className="font-bold">
                  {variants.length.toLocaleString("fa-IR")} سایز / وزن
                </Badge>
              </div>

              {variants.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#1C3324]/20 p-6 text-center dark:border-white/20">
                  <Layers className="mx-auto h-6 w-6 text-[#3A5A46] dark:text-zinc-500" />
                  <p className="mt-2 text-xs font-bold text-[#1C3324] dark:text-zinc-200">
                    برای این محصول تنوع وزنی ثبت نشده است.
                  </p>
                  <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
                    قیمت و موجودی کالا بر اساس مشخصات اولیه (تک‌وزن) محاسبه می‌گردد.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {variants.map((v, index) => {
                    const variantId = v.id ? String(v.id) : String(index);
                    const isSelected = selectedVariantId === variantId;
                    const vWeight = toNumber(v.weight);
                    const vStock = toNumber(v.stock);

                    // Compute live price for this variant
                    const vPriceCalc = calculateDynamicGoldPrice(
                      {
                        weight: vWeight,
                        karat: displayKarat,
                        wage_percent: wage,
                        profit_percent: profit,
                        tax_percent: tax,
                      },
                      goldRate
                    );

                    return (
                      <button
                        key={variantId}
                        type="button"
                        onClick={() => setSelectedVariantId(variantId)}
                        className={cn(
                          "flex items-center justify-between rounded-2xl border p-4 text-right transition cursor-pointer",
                          isSelected
                            ? "border-[#8B263E] bg-[#8B263E]/5 shadow-xs dark:border-[#D8B65C] dark:bg-[#D8B65C]/10"
                            : "border-[#1C3324]/12 bg-[#FAF9F6] hover:border-[#8B263E]/50 dark:border-white/10 dark:bg-zinc-900/40"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs",
                              isSelected
                                ? "bg-[#8B263E] text-white dark:bg-[#D8B65C] dark:text-[#101813]"
                                : "bg-white text-[#1C3324] border border-black/10 dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-200"
                            )}
                          >
                            {v.is_default ? "اصلی" : `#${index + 1}`}
                          </div>
                          <div>
                            <div className="font-mono text-xs font-black text-[#1C3324] dark:text-zinc-100">
                              {vWeight.toFixed(3)} گرم
                            </div>
                            <div className="font-mono text-[10px] text-zinc-400">
                              {String(v.sku || `SKU-${index + 1}`)}
                            </div>
                          </div>
                        </div>

                        <div className="text-left">
                          <div className="font-mono text-xs font-black text-[#8B263E] dark:text-[#D8B65C]">
                            {vPriceCalc ? `${vPriceCalc.total.toLocaleString("fa-IR")} تومان` : "—"}
                          </div>
                          <div className="text-[10px] font-bold text-zinc-400">
                            موجودی: {vStock.toLocaleString("fa-IR")} عدد
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Description & Technical Summary */}
            <Card className="border-[#1C3324]/12 bg-white/80 p-6 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80 space-y-4">
              <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                توضیحات و مشخصات تکمیلی کالا
              </h2>

              {shortDetail && (
                <div className="rounded-2xl bg-[#FAF9F6] p-4 border border-[#1C3324]/10 dark:bg-zinc-900/40 dark:border-white/10">
                  <span className="text-xs font-bold text-[#8B263E] dark:text-[#D8B65C]">
                    معرفی کوتاه:
                  </span>
                  <p className="mt-1 text-xs leading-6 text-[#1C3324] dark:text-zinc-200">
                    {shortDetail}
                  </p>
                </div>
              )}

              <div className="text-xs leading-7 text-[#3A5A46] dark:text-zinc-300 whitespace-pre-line">
                {description || "توضیحاتی برای این محصول در سامانه ثبت نشده است."}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#1C3324]/10 sm:grid-cols-4 dark:border-white/10">
                <TechnicalItem label="شناسه دیتابیس (PB ID)" value={product.id} mono />
                <TechnicalItem label="کد کاتالوگ (SKU)" value={product.sku || "—"} mono />
                <TechnicalItem
                  label="تاریخ ثبت در سیستم"
                  value={product.created ? new Date(product.created).toLocaleDateString("fa-IR") : "—"}
                />
                <TechnicalItem
                  label="آخرین بروزرسانی"
                  value={product.updated ? new Date(product.updated).toLocaleDateString("fa-IR") : "—"}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Small Subcomponents with Full Dark Mode
========================================================= */

function DetailCard({
  icon,
  label,
  value,
  subLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4 transition dark:border-white/10 dark:bg-zinc-900/40">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-400">
          {label}
        </span>
      </div>
      <div className="mt-2 text-sm font-black text-[#1C3324] dark:text-zinc-100">
        {value}
      </div>
      {subLabel && (
        <span className="mt-1 block text-[10px] text-zinc-400 dark:text-zinc-500">
          {subLabel}
        </span>
      )}
    </div>
  );
}

function TechnicalItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-3 text-right dark:border-white/10 dark:bg-zinc-900/40">
      <span className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
        {label}
      </span>
      <div
        className={cn(
          "mt-1 truncate text-xs font-bold text-[#1C3324] dark:text-zinc-200",
          mono && "font-mono"
        )}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}