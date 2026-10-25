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
  ArrowUpDown,
  Copy,
  Check,
  PackageCheck,
  PackageX,
  ExternalLink,
  CircleDollarSign,
  TrendingUp,
} from "lucide-react";

import pb from "@/lib/pocketbase";
import { getGoldGramPrice } from "@/lib/product-detail";
import { calculateDynamicGoldPrice } from "@/lib/products";
import { recordAuditLogClient } from "@/lib/audit-client";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* =========================================================
   Types
========================================================= */

interface CategoryRecord {
  id: string;
  name?: string;
  title?: string;
  label?: string;
  category_name?: string;
}

interface ProductExpand {
  category?: CategoryRecord | CategoryRecord[] | null;
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
  colour?: string;
  lead_time_days?: number | string;
  created?: string;
  updated?: string;
  expand?: ProductExpand;
}

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  categories: string[];
  categoryLabel: string;
  weight: number;
  wage: number;
  profit: number;
  tax: number;
  karat: string;
  karatNumber: number;
  stock: number;
  isActive: boolean;
  firstImage?: string;
  livePrice: number;
  status: "available" | "low_stock" | "out_of_stock";
  raw: ProductRecord;
}

/* =========================================================
   Helpers
========================================================= */

function numberValue(value: unknown): number {
  const normalizedValue =
    typeof value === "string"
      ? value.replace(/[۰-۹]/g, (digit) =>
          String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
        )
      : value;

  const number = Number(normalizedValue);
  return Number.isFinite(number) ? number : 0;
}

function formatKarat(value: unknown): string {
  const karat = numberValue(value);
  if (!karat) return "۱۸ عیار";
  return `${karat} عیار`;
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeCategories(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .filter((item): item is string => typeof item === "string")
          .flatMap((item) => item.split(/[،,]/))
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }

  if (typeof value === "string") {
    return Array.from(
      new Set(
        value
          .split(/[،,]/)
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }

  return [];
}

function getExpandedCategories(record: ProductRecord): string[] {
  const expandedCategory = record.expand?.category;
  if (!expandedCategory) return [];

  const expandedCategories = Array.isArray(expandedCategory)
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
            normalizeText(category.category_name)
          );
        })
        .filter(Boolean)
    )
  );
}

function getProductCategories(record: ProductRecord): string[] {
  const expandedCategories = getExpandedCategories(record);
  if (expandedCategories.length > 0) return expandedCategories;

  const rawCategory = record.category;
  const rawCategories = normalizeCategories(rawCategory);

  const relationIds = new Set(
    Array.isArray(rawCategory)
      ? rawCategory
      : typeof rawCategory === "string"
      ? [rawCategory]
      : []
  );

  const containsOnlyRelationIds =
    rawCategories.length > 0 &&
    rawCategories.every((category) => relationIds.has(category));

  if (containsOnlyRelationIds) return [];
  return rawCategories;
}

function getFirstImage(images: ProductRecord["images"]): string | undefined {
  if (Array.isArray(images)) {
    return images.find(
      (image): image is string =>
        typeof image === "string" && image.trim().length > 0
    );
  }
  if (typeof images === "string" && images.trim()) {
    return images.trim();
  }
  return undefined;
}

function mapProduct(record: ProductRecord, goldRate: number): ProductItem {
  const stock = numberValue(record.stock);
  const categories = getProductCategories(record);
  const weight = numberValue(record.weight);
  const wage = numberValue(record.wage_percent);
  const profit = record.profit_percent !== undefined && record.profit_percent !== null ? numberValue(record.profit_percent) : 7;
  const tax = record.tax_percent !== undefined && record.tax_percent !== null ? numberValue(record.tax_percent) : 9;
  const karatNum = numberValue(record.karat) || 18;

  const priceCalc = calculateDynamicGoldPrice(
    {
      weight,
      karat: karatNum,
      wage_percent: wage,
      profit_percent: profit,
      tax_percent: tax,
    },
    goldRate
  );

  return {
    id: record.id,
    sku: record.sku?.trim() || `#${record.id.slice(0, 6)}`,
    name: record.title?.trim() || "زیورآلات بدون نام",
    categories,
    categoryLabel:
      categories.length > 0 ? categories.join("، ") : "بدون دسته‌بندی",
    weight,
    wage,
    profit,
    tax,
    karat: formatKarat(record.karat),
    karatNumber: karatNum,
    stock,
    isActive: record.isactive !== false,
    firstImage: getFirstImage(record.images),
    livePrice: priceCalc?.total ?? 0,
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
  const text = `${name} ${category}`.toLowerCase();

  if (
    text.includes("انگشتر") ||
    text.includes("حلقه") ||
    text.includes("ring")
  ) {
    return <CircleDot className="h-6 w-6 text-[#8B263E] dark:text-[#D8B65C]" />;
  }

  if (
    text.includes("گردنبند") ||
    text.includes("پلاک") ||
    text.includes("necklace") ||
    text.includes("تاج")
  ) {
    return <Crown className="h-6 w-6 text-[#8B263E] dark:text-[#D8B65C]" />;
  }

  if (
    text.includes("سکه") ||
    text.includes("شمش") ||
    text.includes("coin") ||
    text.includes("bar")
  ) {
    return <Coins className="h-6 w-6 text-[#8B263E] dark:text-[#D8B65C]" />;
  }

  if (
    text.includes("دستبند") ||
    text.includes("النگو") ||
    text.includes("پابند") ||
    text.includes("bracelet")
  ) {
    return <Sparkles className="h-6 w-6 text-[#8B263E] dark:text-[#D8B65C]" />;
  }

  return <Gem className="h-6 w-6 text-[#8B263E] dark:text-[#D8B65C]" />;
}

/* =========================================================
   Component
========================================================= */

export default function DashboardProducts() {
  const router = useRouter();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [goldRate, setGoldRate] = useState<number>(25658600);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vitrineFilter, setVitrineFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<ProductItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  const loadProducts = useCallback(async (refresh = false) => {
    setError("");
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [rate, records] = await Promise.all([
        getGoldGramPrice(),
        pb.collection("products").getFullList<ProductRecord>({
          sort: "-created",
          expand: "category",
          requestKey: null,
        }),
      ]);

      const activeRate = rate > 0 ? rate : 25658600;
      setGoldRate(activeRate);
      setProducts(records.map((r) => mapProduct(r, activeRate)));
    } catch (err) {
      console.error("PocketBase products error:", err);
      setError("دریافت اطلاعات محصولات از دیتابیس با خطا مواجه شد.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    products.forEach((product) => {
      product.categories.forEach((category) => {
        const normalized = category.trim();
        if (normalized) categorySet.add(normalized);
      });
    });
    return Array.from(categorySet).sort((a, b) => a.localeCompare(b, "fa"));
  }, [products]);

  // Enhanced Stat Cards Calculations
  const stats = useMemo(() => {
    const totalWeight = products.reduce(
      (sum, p) => sum + p.weight * Math.max(p.stock, 0),
      0
    );

    const totalGoldValue = Math.round(totalWeight * goldRate);

    const totalWageSum = products.reduce((sum, p) => sum + p.wage, 0);
    const avgWage = products.length > 0 ? totalWageSum / products.length : 0;

    return {
      total: products.length,
      available: products.filter((p) => p.status === "available").length,
      lowStock: products.filter((p) => p.status === "low_stock").length,
      outOfStock: products.filter((p) => p.status === "out_of_stock").length,
      vitrineActive: products.filter((p) => p.isActive).length,
      totalWeight,
      totalGoldValue,
      avgWage,
    };
  }, [products, goldRate]);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("fa");

    let result = products.filter((product) => {
      const searchableCategories = product.categories
        .join(" ")
        .toLocaleLowerCase("fa");

      const matchesSearch =
        !query ||
        product.name.toLocaleLowerCase("fa").includes(query) ||
        product.sku.toLocaleLowerCase("fa").includes(query) ||
        product.id.toLocaleLowerCase("fa").includes(query) ||
        searchableCategories.includes(query);

      const matchesCategory =
        categoryFilter === "all" ||
        product.categories.includes(categoryFilter);

      const matchesStatus =
        statusFilter === "all" || product.status === statusFilter;

      const matchesVitrine =
        vitrineFilter === "all" ||
        (vitrineFilter === "active" && product.isActive) ||
        (vitrineFilter === "inactive" && !product.isActive);

      return matchesSearch && matchesCategory && matchesStatus && matchesVitrine;
    });

    // Sorting
    result = [...result].sort((a, b) => {
      if (sortBy === "price_desc") return b.livePrice - a.livePrice;
      if (sortBy === "price_asc") return a.livePrice - b.livePrice;
      if (sortBy === "weight_desc") return b.weight - a.weight;
      if (sortBy === "weight_asc") return a.weight - b.weight;
      if (sortBy === "stock_desc") return b.stock - a.stock;
      if (sortBy === "wage_desc") return b.wage - a.wage;
      return 0; // default newest
    });

    return result;
  }, [products, searchTerm, categoryFilter, statusFilter, vitrineFilter, sortBy]);

  // Instant toggle for vitrine status
  const handleToggleVitrine = async (product: ProductItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = !product.isActive;

    try {
      await pb.collection("products").update(product.raw.id, {
        isactive: nextStatus,
      });

      setProducts((current) =>
        current.map((p) =>
          p.id === product.id ? { ...p, isActive: nextStatus } : p
        )
      );

      void recordAuditLogClient({
        category: "stock",
        title: `تغییر وضعیت ویترین: ${product.name}`,
        description: `کالای «${product.name}» در ویترین آنلاین ${nextStatus ? "فعال و نمایان" : "غیرفعال"} گردید.`,
        level: "info",
        targetId: product.raw.id,
        targetType: "product",
      });
    } catch (err) {
      console.error("Error toggling product status:", err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setError("");

    try {
      const targetTitle = deleteTarget.raw.title || "محصول";
      const targetId = deleteTarget.raw.id;

      await pb.collection("products").delete(targetId);

      void recordAuditLogClient({
        category: "stock",
        title: `حذف محصول: ${targetTitle}`,
        description: `محصول «${targetTitle}» با شناسه ${targetId} از ویترین و انبار حذف گردید.`,
        level: "warning",
        targetId,
        targetType: "product",
      });

      setProducts((current) =>
        current.filter((p) => p.raw.id !== targetId)
      );
      setDeleteTarget(null);
    } catch (err) {
      console.error("PocketBase delete error:", err);
      setError("خطا در حذف قطعی محصول رخ داد.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getPocketBaseImageUrl = (recordId: string, filename: string): string => {
    return `${pb.baseUrl}/api/files/products/${recordId}/${encodeURIComponent(
      filename
    )}`;
  };

  const handleCopySku = (sku: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sku).then(() => {
      setCopiedSku(sku);
      setTimeout(() => setCopiedSku(null), 2000);
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8 font-sans" dir="rtl">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 rounded-3xl border border-[#1C3324]/12 bg-white/80 p-5 shadow-xs backdrop-blur-md transition-colors lg:flex-row lg:items-center lg:p-6 dark:border-white/10 dark:bg-[#15221B]/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-black text-[#8B263E] dark:text-[#D8B65C]">
              کاتالوگ طلا و جواهرات · ویترین آنلاین
            </span>
            <span className="text-xs text-zinc-400">|</span>
            <span className="text-xs font-mono font-bold text-[#3A5A46] dark:text-zinc-400">
              مظنه ۱۸ عیار: {goldRate.toLocaleString("fa-IR")} تومان
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-black text-[#1C3324] sm:text-3xl dark:text-zinc-100">
            محصولات و ویترین طلا
          </h1>
          <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
            مدیریت موجودی انبار، عیار و وزن، اجرت ساخت، قیمت‌گذاری خودکار لحظه‌ای و کنترل ویترین آنلاین
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="default"
            onClick={() => void loadProducts(true)}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin text-[#8B263E] dark:text-[#D8B65C]")}
            />
            <span>{isRefreshing ? "در حال دریافت..." : "بروزرسانی مظنه و لیست"}</span>
          </Button>

          <Button asChild variant="default" size="default" className="gap-2">
            <Link href="/dashboard/products/new">
              <Plus className="h-4 w-4" />
              <span>ثبت محصول جدید</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Enhanced Stat Cards (DashboardStatCard with full dark mode support) */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          title="کل محصولات در کاتالوگ"
          value={stats.total.toLocaleString("fa-IR")}
          unit="قلم کالا"
          accent="gold"
          icon={Boxes}
          description="تنوع اقلام طلا و زیورآلات"
          secondaryInfo={{
            label: "ارزش تقریبی موجودی طلا",
            value: `${(stats.totalGoldValue / 1_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} میلیون تومان`,
          }}
          isLoading={isLoading}
        />

        <DashboardStatCard
          title="موجود در ویترین فروشگاه"
          value={stats.available.toLocaleString("fa-IR")}
          unit="کالا"
          accent="emerald"
          icon={PackageCheck}
          trend={`${Math.round((stats.available / Math.max(stats.total, 1)) * 100)}٪`}
          trendType="positive"
          description="آماده تحویل و خرید آنلاین مشتریان"
          secondaryInfo={{
            label: "مجموع وزن طلای موجود",
            value: `${stats.totalWeight.toFixed(2)} گرم`,
          }}
          isLoading={isLoading}
        />

        <DashboardStatCard
          title="موجودی رو به اتمام"
          value={stats.lowStock.toLocaleString("fa-IR")}
          unit="کالا (۱ یا ۲ عدد)"
          accent="crimson"
          icon={AlertCircle}
          description="نیازمند سفارش ساخت یا شارژ کارگاه"
          secondaryInfo={{
            label: "وضعیت ویترین",
            value: stats.lowStock > 0 ? "نیازمند اقدام" : "موجودی کافی",
            highlight: stats.lowStock > 0,
          }}
          isLoading={isLoading}
        />

        <DashboardStatCard
          title="میانگین اجرت ساخت طلا"
          value={`${stats.avgWage.toFixed(1)}٪`}
          unit="کارمزد ساخت"
          accent="default"
          icon={Percent}
          description={`تعداد ${stats.outOfStock.toLocaleString("fa-IR")} کالا اتمام موجودی`}
          secondaryInfo={{
            label: "منتشر در ویترین",
            value: `${stats.vitrineActive} از ${stats.total}`,
          }}
          isLoading={isLoading}
        />
      </section>

      {/* Error alert */}
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle size={17} className="text-rose-600" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError("")} className="text-rose-500">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Filters Card */}
      <Card className="border-[#1C3324]/12 bg-white/80 p-4 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3A5A46] dark:text-zinc-400" />
            <Input
              type="text"
              placeholder="جست‌وجوی نام طلا، کد کالا (SKU)، دسته‌بندی..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9 text-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3A5A46] hover:text-[#1C3324] dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-[#1C3324]/12 bg-[#FAF9F6] px-3 py-1.5 text-xs font-bold dark:border-white/10 dark:bg-zinc-900/60">
              <Filter className="h-3.5 w-3.5 text-[#3A5A46] dark:text-zinc-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#1C3324] outline-none cursor-pointer dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
              >
                <option value="all">همه دسته‌ها</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Vitrine Status Filter */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-[#1C3324]/12 bg-[#FAF9F6] px-3 py-1.5 text-xs font-bold dark:border-white/10 dark:bg-zinc-900/60">
              <Eye className="h-3.5 w-3.5 text-[#3A5A46] dark:text-zinc-400" />
              <select
                value={vitrineFilter}
                onChange={(e) => setVitrineFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#1C3324] outline-none cursor-pointer dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
              >
                <option value="all">همه وضعیت‌های ویترین</option>
                <option value="active">نمایان در ویترین سایت</option>
                <option value="inactive">مخفی شده در ویترین</option>
              </select>
            </div>

            {/* Stock Status Filter */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-[#1C3324]/12 bg-[#FAF9F6] px-3 py-1.5 text-xs font-bold dark:border-white/10 dark:bg-zinc-900/60">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#1C3324] outline-none cursor-pointer dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
              >
                <option value="all">همه موجودی‌ها</option>
                <option value="available">موجود در انبار</option>
                <option value="low_stock">موجودی کم (۱ یا ۲ عدد)</option>
                <option value="out_of_stock">اتمام موجودی</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-[#1C3324]/12 bg-[#FAF9F6] px-3 py-1.5 text-xs font-bold dark:border-white/10 dark:bg-zinc-900/60">
              <ArrowUpDown className="h-3.5 w-3.5 text-[#3A5A46] dark:text-zinc-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#1C3324] outline-none cursor-pointer dark:text-zinc-200 dark:[&>option]:bg-zinc-900"
              >
                <option value="newest">جدیدترین محصولات</option>
                <option value="price_desc">بیشترین قیمت روز</option>
                <option value="price_asc">کمترین قیمت روز</option>
                <option value="weight_desc">بیشترین وزن طلا</option>
                <option value="weight_asc">کمترین وزن طلا</option>
                <option value="stock_desc">بیشترین موجودی</option>
                <option value="wage_desc">بالاترین اجرت ساخت</option>
              </select>
            </div>

            {/* Reset Filters */}
            {(searchTerm || categoryFilter !== "all" || statusFilter !== "all" || vitrineFilter !== "all" || sortBy !== "newest") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("all");
                  setStatusFilter("all");
                  setVitrineFilter("all");
                  setSortBy("newest");
                }}
                className="text-xs"
              >
                پاک کردن فیلترها
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Products Table (Shadcn Table with Price & Showcase Controls) */}
      <Card className="border-[#1C3324]/12 bg-white/80 p-6 dark:border-white/10 dark:bg-[#15221B]/80">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-extrabold text-[#1C3324] dark:text-zinc-100">
              کاتالوگ و لیست محصولات
            </CardTitle>
            <CardDescription className="text-xs">
              نمایش {filteredProducts.length.toLocaleString("fa-IR")} محصول از مجموع{" "}
              {products.length.toLocaleString("fa-IR")} کالا در پایگاه داده
            </CardDescription>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">محصول و تصویر</TableHead>
                <TableHead>شناسه / SKU</TableHead>
                <TableHead>دسته‌بندی</TableHead>
                <TableHead>وزن طلا</TableHead>
                <TableHead>عیار</TableHead>
                <TableHead>اجرت ساخت</TableHead>
                <TableHead>قیمت روز (مظنه لحظه‌ای)</TableHead>
                <TableHead>موجودی</TableHead>
                <TableHead>ویترین آنلاین</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="h-6 w-6 animate-spin text-[#8B263E] dark:text-[#D8B65C]" />
                      <span className="text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                        در حال بارگذاری اطلاعات محصولات و محاسبه مظنه طلا...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FAF9F6] border border-[#1C3324]/10 dark:bg-zinc-800 dark:border-white/10">
                        <Search className="h-6 w-6 text-[#3A5A46] dark:text-zinc-400" />
                      </div>
                      <p className="mt-3 text-sm font-black text-[#1C3324] dark:text-zinc-100">
                        محصولی یافت نشد
                      </p>
                      <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
                        معیارهای جست‌وجو یا فیلتر دسته‌بندی را تغییر دهید.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const hasValidImage =
                    Boolean(product.firstImage) && !brokenImages[product.raw.id];
                  const imageUrl = product.firstImage
                    ? getPocketBaseImageUrl(product.raw.id, product.firstImage)
                    : null;

                  return (
                    <TableRow
                      key={product.raw.id}
                      className="cursor-pointer transition hover:bg-[#FAF9F6] dark:hover:bg-white/5"
                      onClick={() => router.push(`/dashboard/products/${product.raw.id}`)}
                    >
                      {/* Image & Title */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-[#1C3324]/12 bg-[#FAF9F6] shadow-2xs dark:border-white/10 dark:bg-zinc-800">
                            {hasValidImage && imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={product.name}
                                className="h-full w-full object-cover"
                                onError={() =>
                                  setBrokenImages((prev) => ({
                                    ...prev,
                                    [product.raw.id]: true,
                                  }))
                                }
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ProductFallbackIcon
                                  name={product.name}
                                  category={product.categoryLabel}
                                />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-[#1C3324] dark:text-zinc-100">
                              {product.name}
                            </p>
                            <span className="text-[10px] text-[#3A5A46] dark:text-zinc-400">
                              مشاهده شناسنامه ↗
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* SKU */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-[#8B263E] dark:text-[#D8B65C]">
                            {product.sku}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopySku(product.sku, e)}
                            title="کپی شناسه کالا"
                            className="rounded-md p-1 text-zinc-400 hover:bg-black/5 hover:text-zinc-600 dark:hover:bg-white/5"
                          >
                            {copiedSku === product.sku ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </TableCell>

                      {/* Categories */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {product.categories.length > 0 ? (
                            product.categories.slice(0, 2).map((cat) => (
                              <Badge
                                key={cat}
                                variant="secondary"
                                className="text-[10px] py-0 px-2 font-bold"
                              >
                                {cat}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-[10px] text-zinc-400">بدون دسته</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Weight */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Scale size={13} className="text-[#8B263E] dark:text-[#D8B65C]" />
                          <span className="font-mono font-black text-xs text-[#1C3324] dark:text-zinc-100">
                            {product.weight.toFixed(3)}
                          </span>
                          <span className="text-[10px] text-[#3A5A46] dark:text-zinc-400">
                            گرم
                          </span>
                        </div>
                      </TableCell>

                      {/* Karat */}
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {product.karat}
                        </Badge>
                      </TableCell>

                      {/* Wage */}
                      <TableCell>
                        <span className="font-mono font-bold text-xs text-[#1C3324] dark:text-zinc-200">
                          {product.wage}٪
                        </span>
                      </TableCell>

                      {/* Live Price (NEW COLUMN) */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono font-black text-xs text-[#8B263E] dark:text-[#D8B65C]">
                            {product.livePrice > 0
                              ? `${product.livePrice.toLocaleString("fa-IR")} تومان`
                              : "تماس بگیرید"}
                          </span>
                          {product.livePrice > 0 && (
                            <span className="text-[9px] text-[#3A5A46] dark:text-zinc-400">
                              با سود و مالیات
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Stock */}
                      <TableCell>
                        <span
                          className={cn(
                            "font-mono font-black text-xs",
                            product.status === "out_of_stock"
                              ? "text-rose-600"
                              : product.status === "low_stock"
                              ? "text-amber-600"
                              : "text-emerald-700 dark:text-emerald-400"
                          )}
                        >
                          {product.stock.toLocaleString("fa-IR")} عدد
                        </span>
                      </TableCell>

                      {/* Showcase Status Toggle */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleVitrine(product, e)}
                          title="کلیک برای تغییر وضعیت در ویترین آنلاین"
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition",
                            product.isActive
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              product.isActive ? "bg-emerald-500" : "bg-zinc-400"
                            )}
                          />
                          <span>{product.isActive ? "فعال در ویترین" : "مخفی"}</span>
                        </button>
                      </TableCell>

                      {/* Action buttons */}
                      <TableCell className="text-left" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            asChild
                            variant="ghost"
                            size="icon-sm"
                            title="مشاهده شناسنامه محصول"
                          >
                            <Link href={`/dashboard/products/${product.raw.id}`}>
                              <Eye size={14} />
                            </Link>
                          </Button>

                          <Button
                            asChild
                            variant="ghost"
                            size="icon-sm"
                            title="ویرایش مشخصات"
                          >
                            <Link href={`/dashboard/products/${product.raw.id}/edit`}>
                              <Edit3 size={14} />
                            </Link>
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="حذف از ویترین"
                            onClick={() => setDeleteTarget(product)}
                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-md dark:border-white/10 dark:bg-[#15221B]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <Trash2 size={22} />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                  تأیید حذف قطعی محصول از ویترین
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
                  آیا از حذف محصول «{deleteTarget?.name}» اطمینان کامل دارید؟
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <p className="text-xs leading-6 text-[#3A5A46] dark:text-zinc-300">
            با حذف این محصول، اطلاعات و فایل‌های تصویری آن به طور کامل از دیتابیس پاک خواهند شد و این عملیات غیرقابل بازگشت است.
          </p>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>در حال حذف...</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>بله، حذف قطعی محصول</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}