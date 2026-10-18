"use client";

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
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import pb from "@/lib/pocketbase";
import {
  formatPrice,
  getProductColor,
  getProductDescription,
  getProductImageUrl,
  getProductKarat,
  getProductName,
  getProductPrice,
  getProductWeight,
  parseProductVariants,
  type ProductItem,
  type ProductVariantLike,
} from "@/lib/products";

/* =========================================================
   Types
========================================================= */

type ProductRecord = ProductItem & {
  isactive?: boolean;
  stock?: number | string | null;
  wage_percent?: number | string | null;
  profit_percent?: number | string | null;
  tax_percent?: number | string | null;

  category?: string | string[] | null;

  sku?: string | null;

  collectionId?: string;
  collectionName?: string;
};

type CategoryRecord = {
  id: string;
  name?: string;
  title?: string;
  label?: string;
  category_name?: string;
};

type ProductExpand = {
  category?:
    | CategoryRecord
    | CategoryRecord[]
    | null;
};

type ProductWithExpand = ProductRecord & {
  expand?: ProductExpand;
};

/* =========================================================
   Helpers
========================================================= */

function toNumber(value: unknown): number {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  if (typeof value === "string") {
    const normalized = value
      .replace(/,/g, "")
      .replace(/،/g, "")
      .replace(/[۰-۹]/g, (digit) =>
        String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
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

function getCategoryNames(
  product: ProductWithExpand,
): string[] {
  const expanded = product.expand?.category;

  if (expanded) {
    const categories = Array.isArray(expanded)
      ? expanded
      : [expanded];

    const names = categories
      .map(
        (category) =>
          category.name ||
          category.title ||
          category.label ||
          category.category_name ||
          "",
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
      (item): item is string =>
        typeof item === "string" &&
        item.trim().length > 0,
    );
  }

  if (
    typeof rawCategory === "string" &&
    rawCategory.trim()
  ) {
    return rawCategory
      .split(/[،,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getStock(
  product: ProductItem,
): number {
  return toNumber(product.stock);
}

function getWage(
  product: ProductItem,
): number {
  return toNumber(product.wage_percent);
}

function getProfit(
  product: ProductItem,
): number {
  return toNumber(product.profit_percent);
}

function getTax(
  product: ProductItem,
): number {
  return toNumber(product.tax_percent);
}

function getSku(
  product: ProductItem,
): string {
  const sku = product.sku;

  return typeof sku === "string" && sku.trim()
    ? sku.trim()
    : "بدون SKU";
}

/* =========================================================
   Page
========================================================= */

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const productId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const [product, setProduct] =
    useState<ProductWithExpand | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedVariantId, setSelectedVariantId] =
    useState<string>("");

  const [duplicating, setDuplicating] =
    useState(false);

  /* =======================================================
     Load Product
  ======================================================= */

  const loadProduct = useCallback(
    async () => {
      if (!productId) {
        setError("شناسه محصول نامعتبر است.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const record =
          await pb
            .collection("products")
            .getOne<ProductWithExpand>(
              productId,
              {
                expand: "category",
                requestKey: null,
              },
            );

        setProduct(record);

        const variants =
          parseProductVariants(record);

        if (variants.length > 0) {
          const defaultVariant =
            variants.find(
              (variant) =>
                variant.is_default === true,
            ) ?? variants[0];

          if (defaultVariant?.id) {
            setSelectedVariantId(
              String(defaultVariant.id),
            );
          }
        }
      } catch (err) {
        console.error(
          "PocketBase product details error:",
          err,
        );

        setError(
          "اطلاعات محصول پیدا نشد یا دسترسی به آن امکان‌پذیر نیست.",
        );
      } finally {
        setLoading(false);
      }
    },
    [productId],
  );

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  /* =======================================================
     Duplicate Product
  ======================================================= */

  const handleDuplicateProduct = async () => {
    if (!product || duplicating) return;

    try {
      setDuplicating(true);
      // جدا کردن فیلدهای سیستمی برای ایجاد کپی جدید
      const { id, created, updated, collectionId, collectionName, expand, ...productData } = product as any;

      const newRecord = await pb.collection("products").create({
        ...productData,
        title: `${getProductName(product)} (کپی)`,
        sku: product.sku ? `${product.sku}-COPY` : "",
      });

      if (newRecord?.id) {
        router.push(`/dashboard/products/${newRecord.id}`);
      } else {
        router.push("/dashboard/products");
      }
    } catch (err) {
      console.error("Error duplicating product:", err);
      alert("خطا در کپی کردن محصول رخ داد.");
    } finally {
      setDuplicating(false);
    }
  };

  /* =======================================================
     Derived Data
  ======================================================= */

  const variants = useMemo<ProductVariantLike[]>(
    () =>
      product
        ? parseProductVariants(product)
        : [],
    [product],
  );

  const selectedVariant = useMemo(
    () => {
      if (!selectedVariantId) {
        return variants[0] ?? null;
      }

      return (
        variants.find(
          (variant) =>
            String(variant.id) ===
            selectedVariantId,
        ) ??
        variants[0] ??
        null
      );
    },
    [variants, selectedVariantId],
  );

  const displayWeight = selectedVariant
    ? toNumber(selectedVariant.weight)
    : product
      ? getProductWeight(product)
      : 0;

  const displayPrice = product
    ? getProductPrice(product)
    : null;

  const displayKarat = product
    ? getProductKarat(product)
    : 18;

  const stock = product
    ? getStock(product)
    : 0;

  const wage = product
    ? getWage(product)
    : 0;

  const profit = product
    ? getProfit(product)
    : 0;

  const tax = product
    ? getTax(product)
    : 0;

  const categories = product
    ? getCategoryNames(product)
    : [];

  const productName = product
    ? getProductName(product)
    : "";

  const description = product
    ? getProductDescription(product)
    : "";

  const color = product
    ? getProductColor(product)
    : null;

  const imageUrl = product
    ? getProductImageUrl(product)
    : null;

  const isActive = product?.isactive ?? true;

  const status = !isActive
    ? "inactive"
    : stock <= 0
      ? "out"
      : stock <= 2
        ? "low"
        : "available";

  /* =======================================================
     Loading
  ======================================================= */

  if (loading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#FAF9F6]"
      >
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-[#8B263E]" />

          <span className="text-xs font-bold text-[#3A5A46]">
            در حال دریافت اطلاعات محصول...
          </span>
        </div>
      </div>
    );
  }

  /* =======================================================
     Error
  ======================================================= */

  if (error || !product) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#FAF9F6] p-6 font-sans text-[#1C3324]"
      >
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xs">
            <XCircle className="mx-auto h-12 w-12 text-rose-600" />

            <h1 className="mt-4 text-lg font-black text-[#1C3324]">
              محصول پیدا نشد
            </h1>

            <p className="mt-2 text-xs font-medium text-[#3A5A46]">
              {error ||
                "اطلاعات این محصول در دیتابیس موجود نیست."}
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => void loadProduct()}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1C3324] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#8B263E] cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                تلاش مجدد
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/dashboard/products",
                  )
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-[#1C3324]/15 bg-white px-5 py-3 text-xs font-bold text-[#1C3324] transition hover:bg-[#FAF9F6] cursor-pointer"
              >
                بازگشت
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     Render
  ======================================================= */

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#FAF9F6] p-4 font-sans text-[#1C3324] sm:p-6 lg:p-8"
    >
      <div className="mx-auto max-w-7xl space-y-6">

        {/* =================================================
            Header
        ================================================== */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard/products",
                )
              }
              className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-[#3A5A46] transition hover:text-[#8B263E] cursor-pointer"
            >
              <ArrowRight className="h-4 w-4" />
              بازگشت به محصولات
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1C3324] text-white shadow-xs">
                <Gem className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-2xl font-black tracking-tight text-[#1C3324]">
                  {productName}
                </h1>

                <p className="mt-1 font-mono text-xs font-bold text-[#3A5A46]">
                  {getSku(product)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-3 text-xs font-bold text-[#1C3324] shadow-xs transition hover:bg-[#FAF9F6] cursor-pointer"
              title="چاپ لیبل یا برگه محصول"
            >
              <Printer className="h-4 w-4" />
              چاپ لیبل
            </button>

            <button
              type="button"
              onClick={() => void handleDuplicateProduct()}
              disabled={duplicating}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-3 text-xs font-bold text-[#1C3324] shadow-xs transition hover:border-[#8B263E] hover:bg-[#8B263E]/5 hover:text-[#8B263E] cursor-pointer disabled:opacity-50"
            >
              <Copy className="h-4 w-4" />
              {duplicating ? "در حال کپی..." : "کپی محصول"}
            </button>

            <button
              type="button"
              onClick={() => void loadProduct()}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-3 text-xs font-bold text-[#1C3324] shadow-xs transition hover:border-[#8B263E] hover:bg-[#8B263E]/5 hover:text-[#8B263E] cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              بروزرسانی
            </button>

            <Link
              href={`/dashboard/products/${product.id}/edit`}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1C3324] px-5 py-3 text-xs font-black text-white shadow-xs transition hover:bg-[#8B263E]"
            >
              <Edit3 className="h-4 w-4" />
              ویرایش
            </Link>
          </div>
        </div>

        {/* =================================================
            Status
        ================================================== */}

        <div className="flex flex-wrap items-center gap-2">
          {status === "available" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-black text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              موجود در انبار
            </span>
          )}

          {status === "low" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-black text-amber-700">
              <AlertCircle className="h-4 w-4" />
              موجودی کم
            </span>
          )}

          {status === "out" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1 text-xs font-black text-rose-700">
              <XCircle className="h-4 w-4" />
              ناموجود (تکمیل ظرفیت انبار)
            </span>
          )}

          {status === "inactive" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1 text-xs font-black text-rose-600">
              <XCircle className="h-4 w-4" />
              غیرفعال (موجود نیست)
            </span>
          )}
        </div>

        {/* =================================================
            Main Grid
        ================================================== */}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Product Image */}
          <section className="overflow-hidden rounded-3xl border border-[#1C3324]/15 bg-white shadow-xs">
            <div className="aspect-square bg-[#FAF9F6]">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={productName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-[#3A5A46]">
                  <Gem className="h-16 w-16" />
                  <span className="text-xs font-bold">
                    تصویر محصول موجود نیست
                  </span>
                </div>
              )}
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#3A5A46]">
                  کد SKU
                </span>

                <span className="font-mono text-xs font-black text-[#1C3324]">
                  {getSku(product)}
                </span>
              </div>
            </div>
          </section>

          {/* Basic Information */}
          <section className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs lg:col-span-2 space-y-5">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#8B263E]" />

              <h2 className="text-base font-black text-[#1C3324]">
                اطلاعات محصول
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <DetailCard
                icon={<Weight className="h-4 w-4" />}
                label="وزن"
                value={`${formatWeight(displayWeight)} گرم`}
              />

              <DetailCard
                icon={<Gem className="h-4 w-4" />}
                label="عیار"
                value={`${displayKarat}k`}
              />

              <DetailCard
                icon={<Package className="h-4 w-4" />}
                label="موجودی"
                value={`${formatNumber(
                  selectedVariant
                    ? selectedVariant.stock
                    : stock,
                )} عدد`}
              />

              <DetailCard
                icon={<Percent className="h-4 w-4" />}
                label="اجرت"
                value={`${formatNumber(wage)}٪`}
              />

              <DetailCard
                icon={<Percent className="h-4 w-4" />}
                label="سود"
                value={`${formatNumber(profit)}٪`}
              />

              <DetailCard
                icon={<Percent className="h-4 w-4" />}
                label="مالیات"
                value={`${formatNumber(tax)}٪`}
              />
            </div>

            {/* Categories */}
            <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#3A5A46]">
                <Tag className="h-4 w-4" />
                دسته‌بندی
              </div>

              {categories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {categories.map(
                    (category) => (
                      <span
                        key={category}
                        className="rounded-xl bg-white border border-[#1C3324]/10 px-3 py-1.5 text-xs font-black text-[#1C3324] shadow-xs"
                      >
                        {category}
                      </span>
                    ),
                  )}
                </div>
              ) : (
                <span className="text-xs font-bold text-[#3A5A46]">
                  بدون دسته‌بندی
                </span>
              )}
            </div>

            {/* Color */}
            {color && (
              <div className="flex items-center justify-between rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] px-4 py-3">
                <span className="text-xs font-bold text-[#3A5A46]">
                  رنگ طلا
                </span>

                <span className="text-xs font-black text-[#1C3324]">
                  {color === "yellow"
                    ? "طلای زرد"
                    : color === "white"
                      ? "طلای سفید"
                      : color === "rose"
                        ? "رزگلد"
                        : color === "mixed"
                          ? "دو رنگ / ترکیبی"
                          : color}
                </span>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="mb-2 text-xs font-black text-[#1C3324]">
                توضیحات
              </h3>

              <p className="whitespace-pre-line text-xs leading-7 text-[#3A5A46]">
                {description || "توضیحی ثبت نشده است."}
              </p>
            </div>
          </section>
        </div>

        {/* =================================================
            Price & Variants
        ================================================== */}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Price */}
          <section className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 text-[#8B263E]" />

              <h2 className="text-base font-black text-[#1C3324]">
                اطلاعات قیمت
              </h2>
            </div>

            <div className="rounded-2xl border border-[#8B263E]/20 bg-[#8B263E]/5 p-5">
              <div className="text-xs font-bold text-[#3A5A46]">
                قیمت ثبت‌شده محصول
              </div>

              <div className="mt-2 text-2xl font-black text-[#8B263E]">
                {displayPrice !== null
                  ? formatPrice(displayPrice)
                  : "تماس بگیرید"}
              </div>
            </div>

            <div className="space-y-3">
              <InfoRow
                label="اجرت ساخت"
                value={`${formatNumber(wage)}٪`}
              />

              <InfoRow
                label="سود فروش"
                value={`${formatNumber(profit)}٪`}
              />

              <InfoRow
                label="مالیات"
                value={`${formatNumber(tax)}٪`}
              />

              <InfoRow
                label="عیار"
                value={`${displayKarat}k`}
              />

              <InfoRow
                label="وزن"
                value={`${formatWeight(displayWeight)} گرم`}
              />
            </div>
          </section>

          {/* Variants */}
          <section className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#8B263E]" />

              <h2 className="text-base font-black text-[#1C3324]">
                وزن‌ها و تنوع محصول
              </h2>
            </div>

            {variants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#1C3324]/20 bg-[#FAF9F6] px-4 py-10 text-center">
                <Layers className="mx-auto h-8 w-8 text-[#3A5A46]" />

                <p className="mt-3 text-xs font-bold text-[#3A5A46]">
                  این محصول Variant ندارد.
                </p>

                <p className="mt-1 text-[11px] text-[#3A5A46]">
                  وزن اصلی محصول در اطلاعات محصول نمایش داده می‌شود.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {variants.map((variant, index) => {
                  const variantId =
                    variant.id !== undefined &&
                    variant.id !== null
                      ? String(variant.id)
                      : String(index);

                  const isSelected =
                    selectedVariantId === variantId;

                  const variantStock =
                    toNumber(variant.stock);

                  const variantSku =
                    typeof variant.sku === "string" &&
                    variant.sku.trim()
                      ? variant.sku.trim()
                      : "بدون SKU";

                  const variantWeight =
                    toNumber(variant.weight);

                  return (
                    <button
                      key={variantId}
                      type="button"
                      onClick={() =>
                        setSelectedVariantId(variantId)
                      }
                      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-right transition cursor-pointer ${
                        isSelected
                          ? "border-[#8B263E] bg-[#8B263E]/5 shadow-xs"
                          : "border-[#1C3324]/15 bg-[#FAF9F6] hover:border-[#8B263E]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            isSelected
                              ? "bg-[#1C3324] text-white"
                              : "bg-white text-[#3A5A46] border border-[#1C3324]/10"
                          }`}
                        >
                          <Weight className="h-4 w-4" />
                        </div>

                        <div>
                          <div className="text-xs font-black text-[#1C3324]">
                            {formatWeight(variantWeight)} گرم
                          </div>

                          <div className="mt-1 font-mono text-[10px] font-bold text-[#3A5A46]">
                            {variantSku}
                          </div>
                        </div>
                      </div>

                      <div className="text-left">
                        <div
                          className={`text-xs font-black ${
                            variantStock <= 0
                              ? "text-rose-600"
                              : variantStock <= 2
                                ? "text-amber-600"
                                : "text-emerald-600"
                          }`}
                        >
                          {formatNumber(variantStock)}
                        </div>

                        <div className="text-[10px] text-[#3A5A46]">
                          موجودی
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* =================================================
            Technical Information
        ================================================== */}

        <section className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-[#8B263E]" />

            <h2 className="text-base font-black text-[#1C3324]">
              اطلاعات فنی
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <TechnicalItem
              label="PocketBase ID"
              value={product.id}
              mono
            />

            <TechnicalItem
              label="SKU"
              value={getSku(product)}
              mono
            />

            <TechnicalItem
              label="Collection"
              value={
                product.collectionName ||
                "products"
              }
            />

            <TechnicalItem
              label="تعداد Variant"
              value={`${variants.length.toLocaleString(
                "fa-IR",
              )} مورد`}
            />

            <TechnicalItem
              label="تاریخ ایجاد"
              value={
                product.created
                  ? new Date(
                      product.created,
                    ).toLocaleString(
                      "fa-IR",
                    )
                  : "—"
              }
              icon={
                <CalendarDays className="h-4 w-4" />
              }
            />

            <TechnicalItem
              label="آخرین بروزرسانی"
              value={
                product.updated
                  ? new Date(
                      product.updated,
                    ).toLocaleString(
                      "fa-IR",
                    )
                  : "—"
              }
              icon={
                <CalendarDays className="h-4 w-4" />
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}

/* =========================================================
   Components
========================================================= */

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4">
      <div className="flex items-center gap-2 text-[#3A5A46]">
        {icon}

        <span className="text-xs font-bold">
          {label}
        </span>
      </div>

      <div className="mt-2 text-sm font-black text-[#1C3324]">
        {value}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#1C3324]/10 pb-3 last:border-0 last:pb-0">
      <span className="text-xs font-bold text-[#3A5A46]">
        {label}
      </span>

      <span className="text-xs font-black text-[#1C3324]">
        {value}
      </span>
    </div>
  );
}

function TechnicalItem({
  label,
  value,
  mono = false,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4">
      <div className="flex items-center gap-2 text-xs font-bold text-[#3A5A46]">
        {icon}
        {label}
      </div>

      <div
        className={`mt-2 truncate text-xs font-bold text-[#1C3324] ${
          mono ? "font-mono" : ""
        }`}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}