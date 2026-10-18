"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  Eye,
  RefreshCw,
  Gem,
  Sparkles,
  Crown,
  Coins,
  CircleDot,
  CheckCircle2,
  AlertCircle,
  Package,
  X,
  Layers,
  ChevronLeft,
  Boxes,
  Scale,
  Percent,
  ShieldCheck,
} from "lucide-react";
import pb from "@/lib/pocketbase";

interface CategoryRecord {
  id: string;
  name?: string;
  title?: string;
  label?: string;
  category_name?: string;
}

interface ProductExpand {
  category?:
    | CategoryRecord
    | CategoryRecord[]
    | null;
}

interface ProductRecord {
  id: string;
  title?: string;
  images?: string | string[];
  weight?: number | string;
  karat?: number | string;
  wage_percent?: number | string;
  profit_percent?: number | string;
  category?: string | string[];
  tax_percent?: number | string;
  isactive?: boolean;
  description?: string;
  short_detail?: string;
  sku?: string;
  stock?: number | string;
  variations?: unknown;
  created?: string;
  updated?: string;
  expand?: ProductExpand;
}

interface ProductItem {
  id: string;
  name: string;
  categories: string[];
  categoryLabel: string;
  weight: number;
  wage: number;
  karat: string;
  stock: number;
  firstImage?: string;
  status:
    | "available"
    | "low_stock"
    | "out_of_stock";
  raw: ProductRecord;
}

function numberValue(value: unknown): number {
  const normalizedValue =
    typeof value === "string"
      ? value.replace(/[۰-۹]/g, (digit) =>
          String(
            "۰۱۲۳۴۵۶۷۸۹".indexOf(digit),
          ),
        )
      : value;

  const number = Number(normalizedValue);

  return Number.isFinite(number)
    ? number
    : 0;
}

function formatKarat(value: unknown): string {
  const karat = numberValue(value);

  if (!karat) {
    return "-";
  }

  return Number.isInteger(karat)
    ? `${karat}k`
    : `${karat.toLocaleString("fa-IR")}k`;
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeCategories(
  value: unknown,
): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .filter(
            (
              item,
            ): item is string =>
              typeof item === "string",
          )
          .flatMap((item) =>
            item.split(/[،,]/),
          )
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
  }

  if (typeof value === "string") {
    return Array.from(
      new Set(
        value
          .split(/[،,]/)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
  }

  return [];
}

function getExpandedCategories(
  record: ProductRecord,
): string[] {
  const expandedCategory =
    record.expand?.category;

  if (!expandedCategory) {
    return [];
  }

  const expandedCategories =
    Array.isArray(expandedCategory)
      ? expandedCategory
      : [expandedCategory];

  return Array.from(
    new Set(
      expandedCategories
        .map((category) => {
          return (
            normalizeText(category.name) ||
            normalizeText(category.title) ||
            normalizeText(category.label) ||
            normalizeText(
              category.category_name,
            )
          );
        })
        .filter(Boolean),
    ),
  );
}

function getProductCategories(
  record: ProductRecord,
): string[] {
  const expandedCategories =
    getExpandedCategories(record);

  if (expandedCategories.length > 0) {
    return expandedCategories;
  }

  const rawCategory = record.category;
  const rawCategories =
    normalizeCategories(rawCategory);

  const relationIds = new Set(
    Array.isArray(rawCategory)
      ? rawCategory
      : typeof rawCategory === "string"
        ? [rawCategory]
        : [],
  );

  const containsOnlyRelationIds =
    rawCategories.length > 0 &&
    rawCategories.every((category) =>
      relationIds.has(category),
    );

  if (containsOnlyRelationIds) {
    return [];
  }

  return rawCategories;
}

function getFirstImage(
  images: ProductRecord["images"],
): string | undefined {
  if (Array.isArray(images)) {
    return images.find(
      (
        image,
      ): image is string =>
        typeof image === "string" &&
        image.trim().length > 0,
    );
  }

  if (
    typeof images === "string" &&
    images.trim()
  ) {
    return images.trim();
  }

  return undefined;
}

function mapProduct(
  record: ProductRecord,
): ProductItem {
  const stock = numberValue(record.stock);
  const categories =
    getProductCategories(record);

  return {
    id:
      record.sku?.trim() ||
      record.id,
    name:
      record.title?.trim() ||
      "بدون نام",
    categories,
    categoryLabel:
      categories.length > 0
        ? categories.join("، ")
        : "بدون دسته‌بندی",
    weight: numberValue(record.weight),
    wage: numberValue(
      record.wage_percent,
    ),
    karat: formatKarat(record.karat),
    stock,
    firstImage: getFirstImage(
      record.images,
    ),
    status:
      stock <= 0
        ? "out_of_stock"
        : stock <= 2
          ? "low_stock"
          : "available",
    raw: record,
  };
}

function ProductFallbackIcon({
  name,
  category,
}: {
  name: string;
  category: string;
}) {
  const text =
    `${name} ${category}`.toLowerCase();

  if (
    text.includes("انگشتر") ||
    text.includes("حلقه") ||
    text.includes("ring")
  ) {
    return (
      <CircleDot className="h-7 w-7 text-[#8B263E]" />
    );
  }

  if (
    text.includes("گردنبند") ||
    text.includes("پلاک") ||
    text.includes("necklace") ||
    text.includes("تاج")
  ) {
    return (
      <Crown className="h-7 w-7 text-[#8B263E]" />
    );
  }

  if (
    text.includes("سکه") ||
    text.includes("شمش") ||
    text.includes("coin") ||
    text.includes("bar")
  ) {
    return (
      <Coins className="h-7 w-7 text-[#8B263E]" />
    );
  }

  if (
    text.includes("دستبند") ||
    text.includes("النگو") ||
    text.includes("پابند") ||
    text.includes("bracelet")
  ) {
    return (
      <Sparkles className="h-7 w-7 text-[#8B263E]" />
    );
  }

  return (
    <Gem className="h-7 w-7 text-[#8B263E]" />
  );
}

function StatusBadge({
  status,
}: {
  status: ProductItem["status"];
}) {
  if (status === "available") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        موجود
      </span>
    );
  }

  if (status === "low_stock") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">
        <AlertCircle className="h-3.5 w-3.5" />
        موجودی کم
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-700">
      <Package className="h-3.5 w-3.5" />
      ناموجود
    </span>
  );
}

export default function DashboardProducts() {
  const router = useRouter();

  const [products, setProducts] =
    useState<ProductItem[]>([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [categoryFilter, setCategoryFilter] =
    useState("all");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [deleteTarget, setDeleteTarget] =
    useState<ProductItem | null>(null);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [brokenImages, setBrokenImages] =
    useState<Record<string, boolean>>({});

  const loadProducts =
    useCallback(
      async (refresh = false) => {
        setError("");

        if (refresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        try {
          const records =
            await pb
              .collection("products")
              .getFullList<ProductRecord>({
                sort: "-created",
                expand: "category",
                requestKey: null,
              });

          setProducts(
            records.map(mapProduct),
          );
        } catch (err) {
          console.error(
            "PocketBase products error:",
            err,
          );

          setError(
            "دریافت اطلاعات محصولات از دیتابیس با خطا مواجه شد. قوانین دسترسی PocketBase را بررسی کنید.",
          );
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const categories = useMemo(() => {
    const categorySet =
      new Set<string>();

    products.forEach((product) => {
      product.categories.forEach(
        (category) => {
          const normalizedCategory =
            category.trim();

          if (normalizedCategory) {
            categorySet.add(
              normalizedCategory,
            );
          }
        },
      );
    });

    return Array.from(
      categorySet,
    ).sort((first, second) =>
      first.localeCompare(
        second,
        "fa",
      ),
    );
  }, [products]);

  const stats = useMemo(() => {
    return {
      total: products.length,
      available: products.filter(
        (product) =>
          product.status ===
          "available",
      ).length,
      lowStock: products.filter(
        (product) =>
          product.status ===
          "low_stock",
      ).length,
      outOfStock: products.filter(
        (product) =>
          product.status ===
          "out_of_stock",
      ).length,
    };
  }, [products]);

  const filteredProducts =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLocaleLowerCase("fa");

      return products.filter(
        (product) => {
          const searchableCategories =
            product.categories
              .join(" ")
              .toLocaleLowerCase(
                "fa",
              );

          const matchesSearch =
            !query ||
            product.name
              .toLocaleLowerCase(
                "fa",
              )
              .includes(query) ||
            product.id
              .toLocaleLowerCase(
                "fa",
              )
              .includes(query) ||
            searchableCategories.includes(
              query,
            );

          const matchesCategory =
            categoryFilter ===
              "all" ||
            product.categories.includes(
              categoryFilter,
            );

          return (
            matchesSearch &&
            matchesCategory
          );
        },
      );
    }, [
      products,
      searchTerm,
      categoryFilter,
    ]);

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      await pb
        .collection("products")
        .delete(
          deleteTarget.raw.id,
        );

      setProducts(
        (currentProducts) =>
          currentProducts.filter(
            (product) =>
              product.raw.id !==
              deleteTarget.raw.id,
          ),
      );

      setDeleteTarget(null);
    } catch (err) {
      console.error(
        "PocketBase delete error:",
        err,
      );

      setError(
        "خطا در حذف قطعی محصول رخ داد.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const getPocketBaseImageUrl = (
    recordId: string,
    filename: string,
  ): string => {
    return `${pb.baseUrl}/api/files/products/${recordId}/${encodeURIComponent(
      filename,
    )}`;
  };

  const handleProductClick = (
    productId: string,
  ) => {
    router.push(
      `/dashboard/products/${productId}`,
    );
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#FAF9F6] p-4 font-sans text-[#1C3324] sm:p-6 lg:p-8"
    >
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* Header */}
        <header className="relative overflow-hidden rounded-[2rem] border border-[#1C3324]/15 bg-white p-5 shadow-xs sm:p-7">
          <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[#8B263E]/5 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1C3324] text-white shadow-sm">
                  <Gem className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8B263E]">
                    Sarvin Studio
                  </p>

                  <h1 className="text-xl font-black tracking-tight text-[#1C3324] sm:text-2xl">
                    مدیریت محصولات و ویترین
                  </h1>
                </div>
              </div>

              <p className="max-w-2xl text-xs font-medium leading-6 text-[#3A5A46]">
                مدیریت کاتالوگ طلا و جواهر، موجودی، وزن، عیار و اجرت ساخت محصولات سروین استودیو.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  void loadProducts(true)
                }
                disabled={isRefreshing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-3 text-xs font-black text-[#1C3324] shadow-xs transition hover:border-[#8B263E] hover:bg-[#8B263E]/5 hover:text-[#8B263E] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    isRefreshing
                      ? "animate-spin text-[#8B263E]"
                      : ""
                  }`}
                />

                <span className="hidden sm:inline">
                  بروزرسانی
                </span>
              </button>

              <Link
                href="/dashboard/products/new"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1C3324] px-5 py-3 text-xs font-black text-white shadow-sm transition hover:bg-[#8B263E] active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>ثبت محصول جدید</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-[#3A5A46]">
                  کل محصولات
                </p>

                <p className="mt-2 text-2xl font-black text-[#1C3324]">
                  {stats.total.toLocaleString(
                    "fa-IR",
                  )}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FAF9F6] text-[#1C3324] border border-[#1C3324]/10">
                <Boxes className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-emerald-700">
                  موجود
                </p>

                <p className="mt-2 text-2xl font-black text-emerald-800">
                  {stats.available.toLocaleString(
                    "fa-IR",
                  )}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-xs border border-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-amber-700">
                  موجودی کم
                </p>

                <p className="mt-2 text-2xl font-black text-amber-800">
                  {stats.lowStock.toLocaleString(
                    "fa-IR",
                  )}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-xs border border-amber-200">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-rose-700">
                  ناموجود
                </p>

                <p className="mt-2 text-2xl font-black text-rose-800">
                  {stats.outOfStock.toLocaleString(
                    "fa-IR",
                  )}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-rose-700 shadow-xs border border-rose-200">
                <Package className="h-4 w-4" />
              </div>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              aria-label="بستن پیام خطا"
              className="rounded-xl p-1 text-rose-500 transition hover:bg-rose-100 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Filters */}
        <section className="rounded-3xl border border-[#1C3324]/15 bg-white p-4 shadow-xs">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3A5A46]" />

              <input
                type="text"
                placeholder="جستجوی نام محصول، SKU، کد کالا یا دسته‌بندی..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value,
                  )
                }
                className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] py-3.5 pl-10 pr-11 text-xs font-bold text-[#1C3324] outline-none transition placeholder:text-[#3A5A46]/60 focus:border-[#1C3324] focus:bg-white"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchTerm("")
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl p-1 text-[#3A5A46] hover:bg-[#1C3324]/10 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-3">
              <Filter className="h-4 w-4 shrink-0 text-[#3A5A46]" />

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value,
                  )
                }
                className="min-w-[150px] cursor-pointer bg-transparent py-3.5 text-xs font-black text-[#1C3324] outline-none"
              >
                <option value="all">
                  همه دسته‌ها
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ),
                )}
              </select>
            </div>

            {(searchTerm ||
              categoryFilter !==
                "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter(
                    "all",
                  );
                }}
                className="rounded-2xl border border-[#1C3324]/15 px-5 py-3.5 text-xs font-black text-[#3A5A46] transition hover:border-[#8B263E] hover:bg-[#8B263E]/5 hover:text-[#8B263E] cursor-pointer"
              >
                پاک کردن فیلترها
              </button>
            )}
          </div>
        </section>

        {/* Desktop table */}
        <section className="hidden overflow-hidden rounded-[2rem] border border-[#1C3324]/15 bg-white shadow-xs lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-right text-xs">
              <thead className="border-b border-[#1C3324]/10 bg-[#FAF9F6]">
                <tr>
                  <th className="px-6 py-4 font-black text-[#1C3324]">
                    محصول
                  </th>

                  <th className="px-5 py-4 font-black text-[#1C3324]">
                    دسته‌بندی
                  </th>

                  <th className="px-5 py-4 font-black text-[#1C3324]">
                    وزن
                  </th>

                  <th className="px-5 py-4 font-black text-[#1C3324]">
                    اجرت
                  </th>

                  <th className="px-5 py-4 font-black text-[#1C3324]">
                    عیار
                  </th>

                  <th className="px-5 py-4 font-black text-[#1C3324]">
                    موجودی
                  </th>

                  <th className="px-5 py-4 font-black text-[#1C3324]">
                    وضعیت
                  </th>

                  <th className="px-5 py-4 text-center font-black text-[#1C3324]">
                    عملیات
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#1C3324]/5">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-20 text-center"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E]">
                          <RefreshCw className="h-5 w-5 animate-spin" />
                        </div>

                        <span className="text-xs font-bold text-[#3A5A46]">
                          در حال بارگذاری کاتالوگ محصولات...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-20 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF9F6] border border-[#1C3324]/10 text-[#3A5A46]">
                          <Search className="h-6 w-6" />
                        </div>

                        <p className="mt-4 text-sm font-black text-[#1C3324]">
                          محصولی پیدا نشد
                        </p>

                        <p className="mt-1 text-xs font-medium text-[#3A5A46]">
                          عبارت جستجو یا فیلتر دسته‌بندی را تغییر دهید.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(
                    (product) => {
                      const hasValidImage =
                        Boolean(
                          product.firstImage,
                        ) &&
                        !brokenImages[
                          product.raw.id
                        ];

                      const imageUrl =
                        product.firstImage
                          ? getPocketBaseImageUrl(
                              product.raw.id,
                              product.firstImage,
                            )
                          : null;

                      return (
                        <tr
                          key={
                            product.raw.id
                          }
                          onClick={() =>
                            handleProductClick(
                              product.raw.id,
                            )
                          }
                          className="group cursor-pointer transition-colors hover:bg-[#FAF9F6]"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5">
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] shadow-xs transition duration-300 group-hover:scale-[1.03] group-hover:border-[#8B263E]">
                                {hasValidImage &&
                                imageUrl ? (
                                  <img
                                    src={
                                      imageUrl
                                    }
                                    alt={
                                      product.name
                                    }
                                    className="h-full w-full object-cover"
                                    onError={() =>
                                      setBrokenImages(
                                        (
                                          currentImages,
                                        ) => ({
                                          ...currentImages,
                                          [product
                                            .raw
                                            .id]: true,
                                        }),
                                      )
                                    }
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <ProductFallbackIcon
                                      name={
                                        product.name
                                      }
                                      category={
                                        product.categoryLabel
                                      }
                                    />
                                  </div>
                                )}

                                <div className="absolute bottom-1 right-1 h-2 w-2 rounded-full border border-white bg-emerald-500 shadow-xs" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="truncate font-black text-[#1C3324] transition group-hover:text-[#8B263E]">
                                    {
                                      product.name
                                    }
                                  </span>

                                  <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-[#3A5A46] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                                </div>

                                <div className="mt-1 flex items-center gap-2">
                                  <span className="font-mono text-[10px] font-bold text-[#3A5A46]">
                                    {
                                      product.id
                                    }
                                  </span>

                                  <span className="h-1 w-1 rounded-full bg-[#3A5A46]/40" />

                                  <span className="text-[10px] font-bold text-[#3A5A46]">
                                    مشاهده جزئیات
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {product.categories
                              .length >
                            0 ? (
                              <div className="flex max-w-[190px] flex-wrap gap-1.5">
                                {product.categories
                                  .slice(
                                    0,
                                    2,
                                  )
                                  .map(
                                    (
                                      category,
                                    ) => (
                                      <span
                                        key={`${product.raw.id}-${category}`}
                                        className="rounded-xl bg-[#FAF9F6] border border-[#1C3324]/10 px-2.5 py-1 text-[10px] font-black text-[#1C3324]"
                                      >
                                        {
                                          category
                                        }
                                      </span>
                                    ),
                                  )}

                                {product
                                  .categories
                                  .length >
                                  2 && (
                                  <span className="rounded-xl bg-[#8B263E]/10 px-2 py-1 text-[10px] font-black text-[#8B263E]">
                                    +
                                    {(
                                      product
                                        .categories
                                        .length -
                                      2
                                    ).toLocaleString(
                                      "fa-IR",
                                    )}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-[#3A5A46]">
                                بدون دسته‌بندی
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <Scale className="h-3.5 w-3.5 text-[#8B263E]" />

                              <span className="font-mono font-black text-[#1C3324]">
                                {product.weight.toFixed(
                                  3,
                                )}
                              </span>

                              <span className="text-[10px] text-[#3A5A46]">
                                گرم
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <Percent className="h-3.5 w-3.5 text-[#3A5A46]" />

                              <span className="font-black text-[#1C3324]">
                                {product.wage.toLocaleString(
                                  "fa-IR",
                                )}
                                ٪
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#1C3324]/15 bg-[#FAF9F6] px-2.5 py-1 font-mono text-[10px] font-black text-[#1C3324] shadow-xs">
                              <ShieldCheck className="h-3 w-3 text-[#8B263E]" />
                              {product.karat}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-col">
                              <span
                                className={`font-black ${
                                  product.status ===
                                  "out_of_stock"
                                    ? "text-rose-600"
                                    : product.status ===
                                        "low_stock"
                                      ? "text-amber-600"
                                      : "text-[#1C3324]"
                                }`}
                              >
                                {product.stock.toLocaleString(
                                  "fa-IR",
                                )}
                              </span>

                              <span className="text-[9px] font-medium text-[#3A5A46]">
                                عدد
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                product.status
                              }
                            />
                          </td>

                          <td
                            className="px-5 py-4 text-center"
                            onClick={(
                              event,
                            ) =>
                              event.stopPropagation()
                            }
                          >
                            <div className="flex items-center justify-center gap-1">
                              <Link
                                href={`/dashboard/products/${product.raw.id}`}
                                title="مشاهده جزئیات"
                                className="rounded-xl p-2 text-[#3A5A46] transition hover:bg-[#8B263E]/10 hover:text-[#8B263E]"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>

                              <Link
                                href={`/dashboard/products/${product.raw.id}/edit`}
                                title="ویرایش قطعه"
                                className="rounded-xl p-2 text-[#3A5A46] transition hover:bg-[#1C3324]/5 hover:text-[#1C3324]"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Link>

                              <button
                                type="button"
                                title="حذف از کاتالوگ"
                                onClick={() =>
                                  setDeleteTarget(
                                    product,
                                  )
                                }
                                className="rounded-xl p-2 text-[#3A5A46] transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && (
            <div className="flex flex-col gap-2 border-t border-[#1C3324]/10 bg-[#FAF9F6] px-6 py-3.5 text-[10px] font-bold text-[#3A5A46] sm:flex-row sm:items-center sm:justify-between">
              <span>
                نمایش{" "}
                <b className="text-[#1C3324]">
                  {filteredProducts.length.toLocaleString(
                    "fa-IR",
                  )}
                </b>{" "}
                محصول
              </span>

              <span>
                کل کاتالوگ:{" "}
                <b className="text-[#1C3324]">
                  {products.length.toLocaleString(
                    "fa-IR",
                  )}
                </b>{" "}
                محصول
              </span>
            </div>
          )}
        </section>

        {/* Mobile cards */}
        <section className="space-y-3 lg:hidden">
          {isLoading ? (
            <div className="rounded-3xl border border-[#1C3324]/15 bg-white px-5 py-16 text-center">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#8B263E]" />

              <p className="mt-3 text-xs font-bold text-[#3A5A46]">
                در حال بارگذاری محصولات...
              </p>
            </div>
          ) : filteredProducts.length ===
            0 ? (
            <div className="rounded-3xl border border-[#1C3324]/15 bg-white px-5 py-16 text-center">
              <Search className="mx-auto h-7 w-7 text-[#3A5A46]" />

              <p className="mt-3 text-sm font-black text-[#1C3324]">
                محصولی پیدا نشد
              </p>

              <p className="mt-1 text-xs text-[#3A5A46]">
                فیلتر یا عبارت جستجو را تغییر دهید.
              </p>
            </div>
          ) : (
            filteredProducts.map(
              (product) => {
                const hasValidImage =
                  Boolean(
                    product.firstImage,
                  ) &&
                  !brokenImages[
                    product.raw.id
                  ];

                const imageUrl =
                  product.firstImage
                    ? getPocketBaseImageUrl(
                        product.raw.id,
                        product.firstImage,
                      )
                    : null;

                return (
                  <article
                    key={
                      product.raw.id
                    }
                    onClick={() =>
                      handleProductClick(
                        product.raw.id,
                      )
                    }
                    className="group cursor-pointer rounded-3xl border border-[#1C3324]/15 bg-white p-4 shadow-xs transition hover:border-[#8B263E] hover:shadow-sm"
                  >
                    <div className="flex gap-3.5">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6]">
                        {hasValidImage &&
                        imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={
                              product.name
                            }
                            className="h-full w-full object-cover"
                            onError={() =>
                              setBrokenImages(
                                (
                                  currentImages,
                                ) => ({
                                  ...currentImages,
                                  [product
                                    .raw
                                    .id]: true,
                                }),
                              )
                            }
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ProductFallbackIcon
                              name={
                                product.name
                              }
                              category={
                                product.categoryLabel
                              }
                            />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="truncate text-sm font-black text-[#1C3324]">
                              {
                                product.name
                              }
                            </h2>

                            <p className="mt-1 truncate font-mono text-[10px] font-bold text-[#3A5A46]">
                              {
                                product.id
                              }
                            </p>
                          </div>

                          <ChevronLeft className="h-4 w-4 shrink-0 text-[#3A5A46] transition group-hover:-translate-x-1 group-hover:text-[#8B263E]" />
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <StatusBadge
                            status={
                              product.status
                            }
                          />

                          {product
                            .categories
                            .length >
                            0 && (
                            <span className="truncate rounded-xl bg-[#FAF9F6] border border-[#1C3324]/10 px-2.5 py-1 text-[9px] font-bold text-[#3A5A46]">
                              {
                                product
                                  .categories[0]
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 divide-x divide-x-reverse divide-[#1C3324]/10 rounded-2xl bg-[#FAF9F6] py-3 border border-[#1C3324]/10">
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-[#3A5A46]">
                          وزن
                        </p>

                        <p className="mt-1 font-mono text-xs font-black text-[#1C3324]">
                          {product.weight.toFixed(
                            3,
                          )}
                          <span className="mr-1 text-[9px] font-sans font-normal text-[#3A5A46]">
                            گرم
                          </span>
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-[9px] font-bold text-[#3A5A46]">
                          عیار
                        </p>

                        <p className="mt-1 font-mono text-xs font-black text-[#1C3324]">
                          {
                            product.karat
                          }
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-[9px] font-bold text-[#3A5A46]">
                          موجودی
                        </p>

                        <p
                          className={`mt-1 text-xs font-black ${
                            product.status ===
                            "out_of_stock"
                              ? "text-rose-600"
                              : product.status ===
                                  "low_stock"
                                ? "text-amber-600"
                                : "text-emerald-600"
                          }`}
                        >
                          {product.stock.toLocaleString(
                            "fa-IR",
                          )}
                          <span className="mr-1 text-[9px] font-normal">
                            عدد
                          </span>
                        </p>
                      </div>
                    </div>

                    <div
                      className="mt-3 flex items-center justify-end gap-1"
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                    >
                      <Link
                        href={`/dashboard/products/${product.raw.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black text-[#8B263E] transition hover:bg-[#8B263E]/10"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        جزئیات
                      </Link>

                      <Link
                        href={`/dashboard/products/${product.raw.id}/edit`}
                        className="rounded-xl p-2 text-[#3A5A46] transition hover:bg-[#1C3324]/5 hover:text-[#1C3324]"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget(
                            product,
                          )
                        }
                        className="rounded-xl p-2 text-[#3A5A46] transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                );
              },
            )
          )}
        </section>
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={() =>
            !isDeleting &&
            setDeleteTarget(null)
          }
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-[2rem] border border-[#1C3324]/20 bg-white shadow-2xl"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="border-b border-rose-100 bg-rose-50/70 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 border border-rose-200">
                    <Trash2 className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-sm font-black text-[#1C3324]">
                      حذف محصول
                    </h2>

                    <p className="mt-0.5 text-[10px] font-medium text-rose-600">
                      این عملیات قابل بازگشت نیست
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget(null)
                  }
                  disabled={isDeleting}
                  aria-label="بستن پنجره حذف"
                  className="rounded-xl p-2 text-[#3A5A46] transition hover:bg-white disabled:opacity-50 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#8B263E] shadow-xs border border-[#1C3324]/10">
                    <Gem className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-[#1C3324]">
                      «{deleteTarget.name}»
                    </p>

                    <p className="mt-1 font-mono text-[9px] font-bold text-[#3A5A46]">
                      {deleteTarget.id}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-xs font-medium leading-6 text-[#3A5A46]">
                آیا از حذف دائمی این محصول از کاتالوگ و انبار مطمئن هستید؟
              </p>

              <div className="mt-5 flex gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget(null)
                  }
                  disabled={isDeleting}
                  className="flex-1 rounded-2xl border border-[#1C3324]/15 py-3 text-xs font-black text-[#1C3324] transition hover:bg-[#FAF9F6] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  انصراف
                </button>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() =>
                    void handleDelete()
                  }
                  className="flex-1 rounded-2xl bg-rose-600 py-3 text-xs font-black text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {isDeleting
                    ? "در حال حذف..."
                    : "حذف قطعی"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}