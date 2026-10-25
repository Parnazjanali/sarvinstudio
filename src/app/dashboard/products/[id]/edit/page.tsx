"use client";

import React, { useEffect, useRef, useState, useMemo, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Save,
  Loader2,
  X,
  CheckCircle2,
  Package,
  Percent,
  Scale,
  Plus,
  Layers,
  ImageIcon,
  Upload,
  Trash2,
  Check,
  Palette,
  Clock,
  Zap,
  CircleDollarSign,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Coins,
  AlertCircle,
} from "lucide-react";

import pb from "@/lib/pocketbase";
import { getGoldGramPrice } from "@/lib/product-detail";
import { calculateDynamicGoldPrice } from "@/lib/products";
import { recordAuditLogClient } from "@/lib/audit-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* =========================================================
   Types
========================================================= */

interface CategoryRecord {
  id: string;
  name: string;
  title?: string;
}

interface ProductRecord {
  id: string;
  title: string;
  sku?: string;
  weight?: number;
  stock?: number;
  karat?: number;
  wage_percent?: number;
  profit_percent?: number;
  tax_percent?: number;
  description?: string;
  short_detail?: string;
  colour?: string;
  isactive?: boolean;
  lead_time_days?: number;
  category?: string[];
  images?: string[];
  expand?: {
    category?: CategoryRecord[];
  };
}

interface VariantRecord {
  id: string;
  product: string;
  weight: number;
  stock: number;
  sku: string;
  is_default: boolean;
}

interface CategoryItem {
  id: string;
  name: string;
}

interface LocalVariant {
  id: string;
  remoteId?: string;
  weight: string;
  stock: string;
  sku: string;
  is_default: boolean;
}

interface ProductForm {
  title: string;
  sku: string;
  weight: string;
  stock: string;
  karat: string;
  wage_percent: string;
  profit_percent: string;
  tax_percent: string;
  colors: string[];
  lead_time_days: string;
  description: string;
  short_detail: string;
  isactive: boolean;
}

interface PBError extends Error {
  response?: {
    message: string;
    code: number;
    data: Record<string, unknown>;
  };
}

const emptyProductForm: ProductForm = {
  title: "",
  sku: "SRV-",
  weight: "0",
  stock: "1",
  karat: "18",
  wage_percent: "0",
  profit_percent: "7",
  tax_percent: "9",
  colors: ["yellow"],
  lead_time_days: "3",
  description: "",
  short_detail: "",
  isactive: true,
};

const GOLD_COLORS = [
  { id: "yellow", label: "طلای زرد" },
  { id: "white", label: "طلای سفید" },
  { id: "rose", label: "رزگلد" },
  { id: "mixed", label: "دو رنگ / ترکیبی" },
];

export default function EditProductPage() {
  const params = useParams();
  const productId =
    typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [goldRate, setGoldRate] = useState<number>(25658600);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [variants, setVariants] = useState<LocalVariant[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCategories = async () => {
    setIsCategoryLoading(true);
    try {
      const records = await pb.collection("categories").getFullList<CategoryRecord>({
        requestKey: null,
        sort: "name",
      });

      const mapped = records
        .map((record) => ({
          id: record.id,
          name: record.name ?? record.title ?? "",
        }))
        .filter((item) => item.name.trim().length > 0)
        .sort((a, b) => a.name.localeCompare(b.name, "fa"));

      setCategories(mapped);
    } catch (err) {
      console.error("Categories load failed:", err);
    } finally {
      setIsCategoryLoading(false);
    }
  };

  const loadProduct = async () => {
    if (!productId) {
      setLoadError("شناسه محصول نامعتبر است.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError("");
    try {
      const [rate, record] = await Promise.all([
        getGoldGramPrice(),
        pb.collection("products").getOne<ProductRecord>(productId, {
          requestKey: null,
          expand: "category",
        }),
      ]);

      if (rate && rate > 0) {
        setGoldRate(rate);
      }

      let parsedColors = ["yellow"];
      if (record.colour) {
        parsedColors = record.colour.split(",").map((c) => c.trim()).filter(Boolean);
      }

      setForm({
        title: record.title || "",
        sku: record.sku || "SRV-",
        weight: String(record.weight ?? 0),
        stock: String(record.stock ?? 0),
        karat: String(record.karat ?? 18),
        wage_percent: String(record.wage_percent ?? 0),
        profit_percent: String(record.profit_percent ?? 7),
        tax_percent: String(record.tax_percent ?? 9),
        colors: parsedColors.length > 0 ? parsedColors : ["yellow"],
        lead_time_days: String(record.lead_time_days ?? 3),
        description: record.description || "",
        short_detail: record.short_detail || "",
        isactive: record.isactive !== false,
      });

      const currentCategories = record.expand?.category ?? [];
      const currentCategoryIds =
        currentCategories.length > 0
          ? currentCategories.map((c) => c.id)
          : (record.category ?? []);
      setCategoryIds(currentCategoryIds);

      setExistingImages(Array.isArray(record.images) ? record.images : []);

      const variantRecords = await pb.collection("product_variants").getFullList<VariantRecord>({
        requestKey: null,
        filter: `product = "${productId}"`,
        sort: "-is_default,weight",
      });

      setVariants(
        variantRecords.map((v) => ({
          id: v.id,
          remoteId: v.id,
          weight: String(v.weight ?? 0),
          stock: String(v.stock ?? 0),
          sku: v.sku || "",
          is_default: Boolean(v.is_default),
        }))
      );
    } catch (err) {
      console.error("Load product failed:", err);
      setLoadError("محصول مورد نظر یافت نشد یا ارتباط با سرور برقرار نشد.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProduct();
    void loadCategories();
  }, [productId]);

  const updateForm = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleColor = (colorId: string) => {
    setForm((current) => {
      const exists = current.colors.includes(colorId);
      if (exists) {
        if (current.colors.length === 1) return current;
        return { ...current, colors: current.colors.filter((c) => c !== colorId) };
      } else {
        return { ...current, colors: [...current.colors, colorId] };
      }
    });
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setError("نام دسته‌بندی نمی‌تواند خالی باشد.");
      return;
    }

    setIsAddingCategory(true);
    setError("");
    try {
      const created = await pb.collection("categories").create({
        name: newCategoryName.trim(),
      });

      await loadCategories();
      setCategoryIds((prev) => [...prev, created.id]);
      setNewCategoryName("");
      setIsCategoryModalOpen(false);
      setSuccess("دسته‌بندی جدید با موفقیت افزوده شد.");
    } catch (err) {
      console.error("Add category failed:", err);
      setError("خطا در ثبت دسته‌بندی جدید.");
    } finally {
      setIsAddingCategory(false);
    }
  };

  const removeCategory = (catId: string) => {
    setCategoryIds((prev) => prev.filter((id) => id !== catId));
  };

  const addVariant = () => {
    setVariants((prev) => {
      const nextIndex = prev.length + 1;
      const baseSku = form.sku.trim() || "SRV-001";
      const newVariant: LocalVariant = {
        id: Math.random().toString(36).substring(2, 9),
        weight: "",
        stock: "1",
        sku: `${baseSku}-V${nextIndex}`,
        is_default: prev.length === 0,
      };
      return [...prev, newVariant];
    });
  };

  const updateVariant = <K extends keyof LocalVariant>(id: string, key: K, value: LocalVariant[K]) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (key === "is_default" && value === true) {
          return { ...v, is_default: v.id === id };
        }
        if (v.id === id) {
          return { ...v, [key]: value };
        }
        return v;
      })
    );
  };

  const removeVariant = (id: string) => {
    setVariants((prev) => {
      const filtered = prev.filter((v) => v.id !== id);
      if (filtered.length > 0 && !filtered.some((v) => v.is_default)) {
        filtered[0] = { ...filtered[0], is_default: true };
      }
      return filtered;
    });
  };

  const removeExistingImage = (filename: string) => {
    setExistingImages((prev) => prev.filter((img) => img !== filename));
    setRemovedImages((prev) => (prev.includes(filename) ? prev : [...prev, filename]));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setNewImages((prev) => [...prev, ...selectedFiles]);
      const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
      setNewImagePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const getPocketBaseImageUrl = (filename: string) => {
    return `${pb.baseUrl}/api/files/products/${productId}/${filename}`;
  };

  // Live Price Calculation Preview
  const livePricePreview = useMemo(() => {
    const w = Number(form.weight) || 0;
    if (w <= 0 || !goldRate || goldRate <= 0) return null;

    return calculateDynamicGoldPrice(
      {
        weight: w,
        karat: Number(form.karat) || 18,
        wage_percent: Number(form.wage_percent) || 0,
        profit_percent: Number(form.profit_percent) ?? 7,
        tax_percent: Number(form.tax_percent) ?? 9,
      },
      goldRate
    );
  }, [form.weight, form.karat, form.wage_percent, form.profit_percent, form.tax_percent, goldRate]);

  const triggerSubmit = () => {
    const formElement = document.getElementById("product-edit-form");
    if (formElement) {
      (formElement as HTMLFormElement).requestSubmit();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("لطفاً نام محصول را وارد کنید.");
      return;
    }

    let mainWeight = Number(form.weight) || 0;
    let mainStock = Number(form.stock) || 0;
    let mainSku = form.sku.trim();

    if (variants.length > 0) {
      const defaultVariant = variants.find((v) => v.is_default) || variants[0];
      mainWeight = Number(defaultVariant.weight) || 0;
      mainStock = Number(defaultVariant.stock) || 0;
      if (defaultVariant.sku.trim()) {
        mainSku = defaultVariant.sku.trim();
      }
    }

    setIsSaving(true);

    try {
      const productPayload: Record<string, unknown> = {
        title: form.title.trim(),
        sku: mainSku,
        weight: mainWeight,
        stock: mainStock,
        karat: Number(form.karat) || 18,
        wage_percent: Number(form.wage_percent) || 0,
        profit_percent: Number(form.profit_percent) || 0,
        tax_percent: Number(form.tax_percent) || 0,
        colour: form.colors.join(","),
        lead_time_days: Number(form.lead_time_days) || 3,
        description: form.description.trim(),
        short_detail: form.short_detail.trim(),
        isactive: form.isactive,
        category: categoryIds,
      };

      if (removedImages.length > 0) {
        productPayload["images-"] = removedImages;
      }

      await pb.collection("products").update<ProductRecord>(productId, productPayload);

      // ثبت خودکار لاگ رویداد
      void recordAuditLogClient({
        category: "stock",
        title: `ویرایش مشخصات محصول: ${form.title.trim()}`,
        description: `مشخصات، وزن و قیمت‌گذاری محصول «${form.title.trim()}» بروزرسانی گردید.`,
        level: "info",
        targetId: productId,
        targetType: "product",
        metadata: {
          title: form.title.trim(),
          weight: mainWeight,
          wage_percent: form.wage_percent,
        },
      });

      const keptRemoteIds = variants
        .map((v) => v.remoteId)
        .filter((id): id is string => Boolean(id));

      const allRemoteVariants = await pb.collection("product_variants").getFullList<VariantRecord>({
        requestKey: null,
        filter: `product = "${productId}"`,
      });

      for (const remoteVariant of allRemoteVariants) {
        if (!keptRemoteIds.includes(remoteVariant.id)) {
          await pb.collection("product_variants").delete(remoteVariant.id);
        }
      }

      for (const variant of variants) {
        const variantPayload = {
          product: productId,
          weight: Number(variant.weight) || 0,
          stock: Number(variant.stock) || 0,
          sku: variant.sku.trim() || mainSku,
          is_default: Boolean(variant.is_default),
        };

        if (variant.remoteId) {
          await pb.collection("product_variants").update(variant.remoteId, variantPayload);
        } else {
          await pb.collection("product_variants").create(variantPayload);
        }
      }

      if (newImages.length > 0) {
        const fd = new FormData();
        newImages.forEach((file) => {
          fd.append("images", file);
        });
        await pb.collection("products").update(productId, fd);
      }

      setSuccess("تغییرات محصول با موفقیت ذخیره شد.");
      setNewImages([]);
      setNewImagePreviews([]);
      setRemovedImages([]);
      if (imageInputRef.current) imageInputRef.current.value = "";

      const fresh = await pb.collection("products").getOne<ProductRecord>(productId, {
        requestKey: null,
      });
      setExistingImages(Array.isArray(fresh.images) ? fresh.images : []);

      setTimeout(() => {
        router.push("/dashboard/products");
      }, 1000);
    } catch (err) {
      console.error("PocketBase update product error:", err);
      const typedErr = err as PBError;
      const responseMessage =
        typedErr?.response?.message || typedErr?.message || "خطای ناشناخته در ارتباط با سرور";
      setError(`خطا در ذخیره تغییرات: ${responseMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#FAF9F6] dark:bg-[#101813]">
        <div className="inline-flex flex-col items-center gap-3 text-[#3A5A46] dark:text-zinc-400">
          <Loader2 className="h-8 w-8 animate-spin text-[#8B263E] dark:text-[#D8B65C]" />
          <span className="text-xs font-bold">در حال بارگذاری اطلاعات محصول و مظنه طلا...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#FAF9F6] p-6 text-[#1C3324] dark:bg-[#101813] dark:text-zinc-100">
        <div className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xs dark:border-rose-900/40 dark:bg-[#15221B]">
          <X className="mx-auto h-12 w-12 text-rose-600" />
          <h2 className="mt-4 text-base font-black">خطا در بارگذاری اطلاعات کالا</h2>
          <p className="mt-2 text-xs text-[#3A5A46] dark:text-zinc-400">{loadError}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="default" onClick={() => void loadProduct()}>
              تلاش مجدد
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard/products")}>
              بازگشت به محصولات
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#FAF9F6] px-4 py-6 font-sans text-[#1C3324] sm:px-6 lg:px-8 dark:bg-[#101813] dark:text-zinc-100"
    >
      {/* Top Bar Navigation */}
      <div className="mx-auto mb-8 flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-2xl dark:border-white/10 dark:bg-[#15221B]"
          >
            <Link href="/dashboard/products">
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>

          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-[#1C3324] sm:text-3xl dark:text-zinc-100">
              ویرایش محصول
              <span className="inline-flex items-center rounded-xl bg-[#8B263E]/10 px-2.5 py-1 text-xs font-black text-[#8B263E] border border-[#8B263E]/20 dark:bg-[#D8B65C]/10 dark:text-[#D8B65C] dark:border-[#D8B65C]/20">
                {form.title || "پرنا زر"}
              </span>
            </h1>
            <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
              ویرایش اوزان، درصد اجرت، عیار، گالری تصاویر، وضعیت ویترین آنلاین و دسته‌بندی
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="default"
            size="default"
            onClick={triggerSubmit}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>ذخیره تغییرات</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="mx-auto mb-6 flex max-w-7xl items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} className="text-rose-500">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mx-auto mb-6 flex max-w-7xl items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span>{success}</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
      )}

      <form
        id="product-edit-form"
        onSubmit={handleSubmit}
        className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-12"
      >
        {/* Left Column (8 cols): Main Inputs */}
        <div className="space-y-6 lg:col-span-8">

          {/* Section 1: Title & Identity */}
          <Card className="border-[#1C3324]/12 bg-white/80 p-6 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-black/5 dark:border-white/5">
              <Package className="h-5 w-5 text-[#8B263E] dark:text-[#D8B65C]" />
              <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                مشخصات شناسنامه‌ای و کد کالا
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                  نام محصول <span className="text-[#8B263E] dark:text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="مثال: دستبند بنگل کارتیه ۱۸ عیار"
                  className="text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                  شناسه کالا / SKU
                </label>
                <Input
                  type="text"
                  value={form.sku}
                  onChange={(e) => updateForm("sku", e.target.value)}
                  placeholder="SRV-001"
                  className="font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                  زمان ساخت و تحویل (روز کاری)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={form.lead_time_days}
                  onChange={(e) => updateForm("lead_time_days", e.target.value)}
                  className="font-mono text-xs font-bold"
                />
              </div>

              {/* Colors Multi-Select */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                  رنگ‌های قابل سفارش طلا
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {GOLD_COLORS.map((color) => {
                    const isSelected = form.colors.includes(color.id);
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => toggleColor(color.id)}
                        className={cn(
                          "flex items-center justify-between rounded-2xl border p-3 text-xs font-bold transition cursor-pointer",
                          isSelected
                            ? "border-[#8B263E] bg-[#8B263E]/5 text-[#8B263E] dark:border-[#D8B65C] dark:bg-[#D8B65C]/10 dark:text-[#D8B65C]"
                            : "border-[#1C3324]/12 bg-[#FAF9F6] text-[#3A5A46] hover:border-[#8B263E]/40 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300"
                        )}
                      >
                        <span>{color.label}</span>
                        {isSelected && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* Section 2: Weight, Karat, Wage & Guild Parameters */}
          <Card className="border-[#1C3324]/12 bg-white/80 p-6 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-black/5 dark:border-white/5">
              <Scale className="h-5 w-5 text-[#8B263E] dark:text-[#D8B65C]" />
              <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                مشخصات وزنی، عیار و درصدهای قانونی قیمت‌گذاری
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                  وزن پایه طلا (گرم)
                </label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.weight}
                  onChange={(e) => updateForm("weight", e.target.value)}
                  placeholder="0.000"
                  className="font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                  عیار طلا (پیش‌فرض ۱۸)
                </label>
                <select
                  value={form.karat}
                  onChange={(e) => updateForm("karat", e.target.value)}
                  className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-4 py-2.5 text-xs font-bold text-[#1C3324] outline-none dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-100"
                >
                  <option value="18">۱۸ عیار (۷۵۰)</option>
                  <option value="21">۲۱ عیار (۸۷۵)</option>
                  <option value="24">۲۴ عیار (۹۹۹)</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                  موجودی کلی در انبار
                </label>
                <Input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => updateForm("stock", e.target.value)}
                  className="font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                  اجرت ساخت کارگاه (درصد ٪)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.wage_percent}
                  onChange={(e) => updateForm("wage_percent", e.target.value)}
                  placeholder="مثال: ۱۶"
                  className="font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                  سود گالری (درصد ٪ - مصوب ۷٪)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.profit_percent}
                  onChange={(e) => updateForm("profit_percent", e.target.value)}
                  placeholder="7"
                  className="font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                  مالیات ارزش افزوده (درصد ٪)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.tax_percent}
                  onChange={(e) => updateForm("tax_percent", e.target.value)}
                  placeholder="9"
                  className="font-mono text-xs font-bold"
                />
              </div>
            </div>
          </Card>

          {/* Section 3: Variants (تنوع وزنی) */}
          <Card className="border-[#1C3324]/12 bg-white/80 p-6 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#8B263E] dark:text-[#D8B65C]" />
                <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                  تنوع‌های وزنی محصول (Variants)
                </h2>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addVariant} className="gap-1.5">
                <Plus className="h-4 w-4" />
                <span>افزودن تنوع وزنی</span>
              </Button>
            </div>

            {variants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#1C3324]/20 p-6 text-center dark:border-white/20">
                <p className="text-xs text-[#3A5A46] dark:text-zinc-400">
                  محصول به صورت تک‌وزن با وزن اصلی فرم ثبت خواهد شد. جهت افزودن سایزبندی یا وزن‌های گوناگون دکمه بالا را بزنید.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {variants.map((v, idx) => (
                  <div
                    key={v.id}
                    className="flex flex-col gap-3 rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4 sm:flex-row sm:items-center dark:border-white/10 dark:bg-zinc-900/40"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id={`default-${v.id}`}
                        name="default_variant"
                        checked={v.is_default}
                        onChange={() => updateVariant(v.id, "is_default", true)}
                        className="h-4 w-4 text-[#8B263E] cursor-pointer"
                      />
                      <label htmlFor={`default-${v.id}`} className="text-xs font-bold text-[#1C3324] dark:text-zinc-200">
                        سایز پیش‌فرض
                      </label>
                    </div>

                    <div className="flex-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="وزن (گرم)"
                        value={v.weight}
                        onChange={(e) => updateVariant(v.id, "weight", e.target.value)}
                        className="font-mono text-xs font-bold"
                      />
                      <Input
                        type="number"
                        placeholder="موجودی"
                        value={v.stock}
                        onChange={(e) => updateVariant(v.id, "stock", e.target.value)}
                        className="font-mono text-xs font-bold"
                      />
                      <Input
                        type="text"
                        placeholder="کد کالا SKU"
                        value={v.sku}
                        onChange={(e) => updateVariant(v.id, "sku", e.target.value)}
                        className="font-mono text-xs font-bold"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeVariant(v.id)}
                      className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Section 4: Descriptions */}
          <Card className="border-[#1C3324]/12 bg-white/80 p-6 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80 space-y-4">
            <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
              توضیحات و معرفی محصول
            </h2>

            <div>
              <label className="mb-2 block text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                خلاصه مشخصات (نمایش در کارت محصول)
              </label>
              <Input
                type="text"
                value={form.short_detail}
                onChange={(e) => updateForm("short_detail", e.target.value)}
                placeholder="مثال: طراحی سبک و مینیمال مناسب استفاده روزمره"
                className="text-xs"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                توضیحات کامل کالا و ویژگی‌های طلا
              </label>
              <textarea
                rows={5}
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                placeholder="توضیحات فنی، جزئیات قفل، ابعاد و نکات نگهداری..."
                className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] p-4 text-xs font-medium text-[#1C3324] outline-none transition focus:border-[#1C3324] dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-100"
              />
            </div>
          </Card>
        </div>

        {/* Right Column (4 cols): Sticky Price Calculator Preview + Vitrine & Images */}
        <div className="space-y-6 lg:col-span-4">

          {/* Live Gold Price Calculator Preview */}
          <Card className="border-[#1C3324]/12 bg-gradient-to-br from-white to-amber-50/40 p-5 backdrop-blur-md dark:border-white/10 dark:from-[#15221B] dark:to-emerald-950/30 space-y-4 sticky top-6">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-5 w-5 text-[#8B263E] dark:text-[#D8B65C]" />
                <h3 className="text-xs font-black text-[#1C3324] dark:text-zinc-100">
                  پیش‌نمایش زنده قیمت فروش
                </h3>
              </div>
              <Badge variant="gold" className="text-[10px] font-bold">
                مظنه: {goldRate.toLocaleString("fa-IR")}
              </Badge>
            </div>

            {livePricePreview ? (
              <div className="space-y-3">
                <div className="rounded-2xl bg-[#8B263E]/5 p-4 border border-[#8B263E]/15 text-center dark:bg-[#D8B65C]/10 dark:border-[#D8B65C]/20">
                  <span className="text-[11px] font-bold text-[#8B263E] dark:text-[#D8B65C]">
                    قیمت نهایی مصرف‌کننده
                  </span>
                  <div className="mt-1 font-mono text-2xl font-black text-[#8B263E] dark:text-[#D8B65C]">
                    {livePricePreview.total.toLocaleString("fa-IR")} تومان
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                    <span className="text-[#3A5A46] dark:text-zinc-400">ارزش طلای خام:</span>
                    <span className="font-mono font-bold">{livePricePreview.raw.toLocaleString("fa-IR")} تومان</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                    <span className="text-[#3A5A46] dark:text-zinc-400">مبلغ اجرت ساخت:</span>
                    <span className="font-mono font-bold">{livePricePreview.wage.toLocaleString("fa-IR")} تومان</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                    <span className="text-[#3A5A46] dark:text-zinc-400">مبلغ سود گالری:</span>
                    <span className="font-mono font-bold">{livePricePreview.profit.toLocaleString("fa-IR")} تومان</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#3A5A46] dark:text-zinc-400">مالیات ارزش افزوده:</span>
                    <span className="font-mono font-bold">{livePricePreview.tax.toLocaleString("fa-IR")} تومان</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-[#3A5A46] dark:text-zinc-400">
                با وارد کردن وزن طلا در کادر سمت چپ، قیمت زنده در اینجا محاسبه و نمایش داده می‌شود.
              </div>
            )}
          </Card>

          {/* Vitrine Status & Publication */}
          <Card className="border-[#1C3324]/12 bg-white/80 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80 space-y-4">
            <h3 className="text-xs font-black text-[#1C3324] dark:text-zinc-100">
              تنظیمات انتشار در ویترین آنلاین
            </h3>

            <div className="flex items-center justify-between rounded-2xl bg-[#FAF9F6] p-4 border border-[#1C3324]/10 dark:bg-zinc-900/60 dark:border-white/10">
              <div>
                <span className="text-xs font-bold text-[#1C3324] dark:text-zinc-200">
                  نمایش در ویترین فروشگاه
                </span>
                <p className="mt-0.5 text-[10px] text-[#3A5A46] dark:text-zinc-400">
                  در صورت غیرفعال بودن، کالا تنها در انبار است
                </p>
              </div>

              <input
                type="checkbox"
                checked={form.isactive}
                onChange={(e) => updateForm("isactive", e.target.checked)}
                className="h-5 w-5 accent-[#1C3324] cursor-pointer"
              />
            </div>
          </Card>

          {/* Categories Assignment */}
          <Card className="border-[#1C3324]/12 bg-white/80 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#1C3324] dark:text-zinc-100">
                دسته‌بندی کالا
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCategoryModalOpen(true)}
                className="h-7 text-[11px] font-bold text-[#8B263E] dark:text-[#D8B65C]"
              >
                + دسته جدید
              </Button>
            </div>

            <div className="space-y-2">
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && !categoryIds.includes(val)) {
                    setCategoryIds((prev) => [...prev, val]);
                  }
                  e.target.value = "";
                }}
                className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] p-3 text-xs font-bold text-[#1C3324] outline-none dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-100"
              >
                <option value="">انتخاب دسته برای افزودن...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap gap-1.5 pt-2">
                {categoryIds.map((catId) => {
                  const cat = categories.find((c) => c.id === catId);
                  const name = cat?.name || catId;
                  return (
                    <Badge
                      key={catId}
                      variant="secondary"
                      className="gap-1 px-2.5 py-1 text-xs font-bold"
                    >
                      <span>{name}</span>
                      <button
                        type="button"
                        onClick={() => removeCategory(catId)}
                        className="text-zinc-400 hover:text-rose-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Images Management */}
          <Card className="border-[#1C3324]/12 bg-white/80 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80 space-y-4">
            <h3 className="text-xs font-black text-[#1C3324] dark:text-zinc-100">
              تصاویر و گالری ویترین
            </h3>

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div>
                <span className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-400">
                  تصاویر موجود در پاکت‌بیس:
                </span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {existingImages.map((img) => (
                    <div
                      key={img}
                      className="relative aspect-square overflow-hidden rounded-xl border border-black/10 dark:border-white/10 group"
                    >
                      <img
                        src={getPocketBaseImageUrl(img)}
                        alt="Product"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(img)}
                        className="absolute top-1 left-1 flex h-6 w-6 items-center justify-center rounded-lg bg-rose-600 text-white shadow-xs opacity-90 hover:opacity-100 cursor-pointer"
                        title="حذف تصویر"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Upload Previews */}
            {newImagePreviews.length > 0 && (
              <div>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  تصاویر جدید آماده بارگذاری:
                </span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {newImagePreviews.map((preview, idx) => (
                    <div
                      key={preview}
                      className="relative aspect-square overflow-hidden rounded-xl border border-emerald-500/30 group"
                    >
                      <img src={preview} alt="New" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeNewImage(idx)}
                        className="absolute top-1 left-1 flex h-6 w-6 items-center justify-center rounded-lg bg-rose-600 text-white shadow-xs cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File Input trigger */}
            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => imageInputRef.current?.click()}
              className="w-full gap-2 border-dashed"
            >
              <Upload className="h-4 w-4" />
              <span>انتخاب و بارگذاری تصاویر جدید</span>
            </Button>
          </Card>
        </div>
      </form>

      {/* New Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md dark:border-white/10 dark:bg-[#15221B]">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-[#1C3324] dark:text-zinc-100">
              افزودن دسته‌بندی جدید
            </DialogTitle>
            <DialogDescription className="text-xs text-[#3A5A46] dark:text-zinc-400">
              دسته‌بندی جدید در پاکت‌بیس ثبت و به این کالا متصل می‌گردد.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="mb-2 block text-xs font-bold text-[#3A5A46] dark:text-zinc-300">
              نام دسته‌بندی
            </label>
            <Input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="مثال: دستبند چرم و طلا"
              className="text-xs font-bold"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setNewCategoryName("");
                setIsCategoryModalOpen(false);
              }}
              disabled={isAddingCategory}
            >
              انصراف
            </Button>
            <Button
              variant="default"
              onClick={handleAddCategory}
              disabled={isAddingCategory || !newCategoryName.trim()}
              className="gap-2"
            >
              {isAddingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>ثبت دسته‌بندی</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}