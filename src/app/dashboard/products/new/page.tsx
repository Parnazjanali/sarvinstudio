"use client";

import React, { useEffect, useRef, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import pb from "@/lib/pocketbase";
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
  Sparkles,
  Trash2,
  Check,
  Palette,
  Clock,
  Zap,
} from "lucide-react";

interface CategoryRecord {
  id: string;
  name: string;
  title?: string;
}

interface CategoryItem {
  id: string;
  name: string;
}

interface LocalVariant {
  id: string;
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
  isactive: boolean; // به عنوان ارسال فوری
}

interface PBError extends Error {
  response?: {
    message: string;
    code: number;
    data: any;
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

export default function NewProductPage() {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [variants, setVariants] = useState<LocalVariant[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCategories = async () => {
    setIsCategoryLoading(true);
    setError("");
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
      setError("خطا در بارگذاری دسته‌بندی‌ها.");
    } finally {
      setIsCategoryLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

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

  const generateSku = () => {
    setForm((current) => {
      let nextNumber = 1;
      const match = current.sku.match(/^SRV-(\d+)$/i);
      if (match && match[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
      const padded = String(nextNumber).padStart(3, "0");
      return { ...current, sku: `SRV-${padded}` };
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
        weight: form.weight ? String(form.weight) : "",
        stock: form.stock ? String(form.stock) : "1",
        sku: `${baseSku}-V${nextIndex}`,
        is_default: prev.length === 0,
      };
      return [...prev, newVariant];
    });
  };

  const updateVariant = <K extends keyof LocalVariant>(
    id: string,
    key: K,
    value: LocalVariant[K]
  ) => {
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setImages((prev) => [...prev, ...selectedFiles]);

      const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const triggerSubmit = () => {
    const formElement = document.getElementById("product-form");
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
    let mainSku = form.sku.trim() || `SRV-${Math.floor(100 + Math.random() * 900)}`;

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
      };

      if (categoryIds.length > 0) {
        productPayload.category = categoryIds;
      }

      const createdProduct = await pb.collection("products").create(productPayload);

      const variantsToSave =
        variants.length > 0
          ? variants.map((v) => ({
              product: createdProduct.id,
              weight: Number(v.weight) || 0,
              stock: Number(v.stock) || 0,
              sku: v.sku.trim() || mainSku,
              is_default: Boolean(v.is_default),
            }))
          : [
              {
                product: createdProduct.id,
                weight: mainWeight,
                stock: mainStock,
                sku: mainSku,
                is_default: true,
              },
            ];

      for (const variantData of variantsToSave) {
        await pb.collection("product_variants").create(variantData);
      }

      if (images.length > 0) {
        const fd = new FormData();
        images.forEach((file) => {
          fd.append("images", file);
        });
        await pb.collection("products").update(createdProduct.id, fd);
      }

      setSuccess("محصول و تنوع‌های وزنی با موفقیت ذخیره شدند.");

      setForm(emptyProductForm);
      setVariants([]);
      setCategoryIds([]);
      setImages([]);
      setImagePreviews([]);
      if (imageInputRef.current) imageInputRef.current.value = "";

      window.setTimeout(() => {
        router.push("/dashboard/products");
      }, 1200);
    } catch (err) {
      console.error("PocketBase create product error:", err);
      const typedErr = err as PBError;
      const responseMessage =
        typedErr?.response?.message || typedErr?.message || "خطای ناشناخته در ارتباط با سرور";
      setError(`خطا در ثبت اطلاعات: ${responseMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#FAF9F6] px-4 py-6 font-sans text-[#1C3324] sm:px-6 lg:px-8"
    >
      {/* Top Bar Navigation */}
      <div className="mx-auto mb-8 flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/products"
            className="group flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1C3324]/15 bg-white text-[#3A5A46] shadow-xs transition hover:border-[#8B263E] hover:bg-[#8B263E]/5 hover:text-[#8B263E]"
          >
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>

          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-[#1C3324] sm:text-3xl">
              ثبت محصول جدید
              <span className="inline-flex items-center rounded-xl bg-[#8B263E]/10 px-2.5 py-1 text-xs font-black text-[#8B263E] border border-[#8B263E]/20">
                سروین استودیو
              </span>
            </h1>
            <p className="mt-1 text-xs text-[#3A5A46]">
              مشخصات طلا، زیرساخت وزنی، رنگ‌ها، زمان تحویل و دسته‌بندی کالا را تنظیم کنید.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={triggerSubmit}
          disabled={isSaving}
          className="relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-[#1C3324] px-6 py-3.5 text-xs font-black text-white shadow-sm transition-all hover:bg-[#8B263E] active:scale-95 focus:outline-none disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          <span>ذخیره نهایی محصول</span>
        </button>
      </div>

      {error && (
        <div className="mx-auto mb-6 flex max-w-7xl items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-rose-500 hover:text-rose-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {success && (
        <div className="mx-auto mb-6 flex max-w-7xl items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-700">
          <span>{success}</span>
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        </div>
      )}

      <form
        id="product-form"
        onSubmit={handleSubmit}
        className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-12"
      >
        <div className="space-y-8 lg:col-span-8">
          
          {/* Card 1: Product Identity & Colors */}
          <div className="relative overflow-hidden rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs sm:p-8">
            <div className="absolute top-0 right-0 h-1 w-full bg-[#1C3324]" />

            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E] border border-[#1C3324]/10">
                <Package className="h-5 w-5" />
              </div>
              <h2 className="text-base font-black text-[#1C3324]">
                اطلاعات شناسنامه‌ای کالا
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-bold text-[#3A5A46]">
                  نام محصول <span className="text-[#8B263E]">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="مثال: گردنبند کارتیه"
                  className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-4 py-3.5 text-xs font-bold text-[#1C3324] outline-none transition focus:border-[#1C3324] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-[#3A5A46]">
                  کد کالا (SKU)
                </label>
                <div className="flex items-stretch gap-2">
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => updateForm("sku", e.target.value)}
                    placeholder="SRV-001"
                    className="min-w-0 flex-1 rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-4 py-3.5 text-left font-mono text-xs font-bold text-[#1C3324] outline-none transition focus:border-[#1C3324]"
                  />
                  <button
                    type="button"
                    onClick={generateSku}
                    title="تولید کد خودکار"
                    className="flex shrink-0 items-center justify-center gap-1.5 self-stretch rounded-2xl bg-[#1C3324] px-4 text-xs font-bold text-white transition hover:bg-[#8B263E] active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    تولید
                  </button>
                </div>
              </div>

             <div>
                <label className="mb-2 block text-xs font-bold text-[#3A5A46]">
                  عیار طلا <span className="text-[#3A5A46]/60">(پیش‌فرض ۱۸)</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    value={form.karat}
                    onChange={(e) => updateForm("karat", e.target.value)}
                    className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] py-3.5 pr-4 pl-14 text-right font-mono text-xs font-bold text-[#1C3324] outline-none transition focus:border-[#1C3324]"
                  />
                  <span className="pointer-events-none absolute left-4 text-xs font-bold text-[#3A5A46]">
                    عیار
                  </span>
                </div>
              </div>

              {/* انتخاب چند رنگ طلا (تیک‌دار) */}
              <div className="sm:col-span-2">
                <label className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#3A5A46]">
                  <Palette className="h-4 w-4 text-[#8B263E]" />
                  رنگ‌ 
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {GOLD_COLORS.map((c) => {
                    const isSelected = form.colors.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleColor(c.id)}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? "border-[#1C3324] bg-[#1C3324] text-white shadow-xs"
                            : "border-[#1C3324]/15 bg-[#FAF9F6] text-[#3A5A46] hover:border-[#8B263E]"
                        }`}
                      >
                        <span>{c.label}</span>
                        <div className={`flex h-5 w-5 items-center justify-center rounded-lg border ${isSelected ? "border-white bg-white text-[#1C3324]" : "border-[#3A5A46]/30 bg-white"}`}>
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Financial Coefficients & Lead Time */}
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E] border border-[#1C3324]/10">
                <Percent className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-[#1C3324]">
                  ضرایب محاسبه قیمت و زمان تحویل
                </h2>
                <p className="mt-0.5 text-xs text-[#3A5A46]">
                  اجرت، سود، مالیات و تعداد روز لازم برای آماده‌سازی محصول.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-[#3A5A46]">
                  اجرت ساخت (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.wage_percent}
                  onChange={(e) => updateForm("wage_percent", e.target.value)}
                  className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-4 py-3.5 text-left font-mono text-xs font-bold text-[#1C3324] outline-none focus:border-[#1C3324]"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-[#3A5A46]">
                  سود گالری (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.profit_percent}
                  onChange={(e) => updateForm("profit_percent", e.target.value)}
                  className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-4 py-3.5 text-left font-mono text-xs font-bold text-[#1C3324] outline-none focus:border-[#1C3324]"
                  placeholder="7"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-[#3A5A46]">
                  مالیات بر ارزش افزوده (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.tax_percent}
                  onChange={(e) => updateForm("tax_percent", e.target.value)}
                  className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-4 py-3.5 text-left font-mono text-xs font-bold text-[#1C3324] outline-none focus:border-[#1C3324]"
                  placeholder="9"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-1 text-xs font-bold text-[#3A5A46]">
                  <Clock className="h-3.5 w-3.5 text-[#8B263E]" />
                  زمان تحویل (روز)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={form.lead_time_days}
                  onChange={(e) => updateForm("lead_time_days", e.target.value)}
                  className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-4 py-3.5 text-left font-mono text-xs font-bold text-[#1C3324] outline-none focus:border-[#1C3324]"
                  placeholder="3"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Variants Management */}
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs sm:p-8">
            <div className="mb-6 flex items-center justify-between border-b border-[#1C3324]/10 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E] border border-[#1C3324]/10">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#1C3324]">
                    مشخصات وزنی و تنوع‌ها (Variants)
                  </h2>
                  <p className="text-xs text-[#3A5A46]">
                    وزن بر حسب گرم با دقت سه رقم اعشار در جدول وارییشن‌ها ذخیره می‌شود.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={addVariant}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1C3324] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#8B263E] active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                افزودن تنوع وزنی
              </button>
            </div>

            {variants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#1C3324]/20 bg-[#FAF9F6] p-6 text-center">
                <p className="mb-4 text-xs font-bold text-[#3A5A46]">
                  وزن و موجودی پایه تک‌محصول (بدون تنوع چندگانه)
                </p>

                <div className="mx-auto grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-right text-xs font-bold text-[#3A5A46]">
                      وزن محصول (گرم) <span className="text-[#8B263E]">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={form.weight}
                      onChange={(e) => updateForm("weight", e.target.value)}
                      placeholder="مثال: ۴.۳۵۰"
                      className="w-full rounded-xl border border-[#1C3324]/15 bg-white px-3 py-2.5 text-left font-mono text-xs font-bold text-[#1C3324] outline-none focus:border-[#1C3324]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-right text-xs font-bold text-[#3A5A46]">
                      موجودی انبار (تعداد)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={form.stock}
                      onChange={(e) => updateForm("stock", e.target.value)}
                      placeholder="1"
                      className="w-full rounded-xl border border-[#1C3324]/15 bg-white px-3 py-2.5 text-left font-mono text-xs font-bold text-[#1C3324] outline-none focus:border-[#1C3324]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {variants.map((variant, index) => (
                  <div
                    key={variant.id}
                    className={`relative rounded-2xl border p-5 transition-all ${
                      variant.is_default
                        ? "border-[#8B263E] bg-[#8B263E]/5 shadow-xs"
                        : "border-[#1C3324]/15 bg-[#FAF9F6]"
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between border-b border-[#1C3324]/10 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1C3324] text-xs font-black text-white">
                          {index + 1}
                        </span>
                        <span className="text-xs font-black text-[#1C3324]">
                          تنوع {variant.weight ? `${variant.weight} گرم` : "جدید"}
                        </span>
                        {variant.is_default && (
                          <span className="rounded-full border border-[#8B263E]/30 bg-[#8B263E]/10 px-2 py-0.5 text-[10px] font-black text-[#8B263E]">
                            تنوع پیش‌فرض اصلی
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeVariant(variant.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-500 hover:text-white cursor-pointer"
                        title="حذف این وارییشن"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-[#3A5A46]">
                          وزن (گرم)
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={variant.weight}
                          onChange={(e) => updateVariant(variant.id, "weight", e.target.value)}
                          placeholder="0.000"
                          className="w-full rounded-xl border border-[#1C3324]/15 bg-white px-3 py-2 text-left font-mono text-xs font-bold text-[#1C3324] outline-none focus:border-[#1C3324]"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-[#3A5A46]">
                          موجودی این وزن
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={variant.stock}
                          onChange={(e) => updateVariant(variant.id, "stock", e.target.value)}
                          placeholder="1"
                          className="w-full rounded-xl border border-[#1C3324]/15 bg-white px-3 py-2 text-left font-mono text-xs font-bold text-[#1C3324] outline-none focus:border-[#1C3324]"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-[#3A5A46]">
                          کد تنوع (SKU)
                        </label>
                        <input
                          type="text"
                          value={variant.sku}
                          onChange={(e) => updateVariant(variant.id, "sku", e.target.value)}
                          placeholder="SRV-001-V1"
                          className="w-full rounded-xl border border-[#1C3324]/15 bg-white px-3 py-2 text-left font-mono text-xs font-bold text-[#1C3324] outline-none focus:border-[#1C3324]"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-end">
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[#3A5A46]">
                        <input
                          type="radio"
                          name="default_variant"
                          checked={variant.is_default}
                          onChange={() => updateVariant(variant.id, "is_default", true)}
                          className="h-4 w-4 text-[#8B263E] accent-[#8B263E]"
                        />
                        انتخاب به عنوان تنوع پیش‌فرض اصلی
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 4: Description */}
          <div className="space-y-6 rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs sm:p-8">
            <h2 className="text-base font-black text-[#1C3324]">
              توضیحات و مشخصات کالا
            </h2>

            <div>
              <label className="mb-2 block text-xs font-bold text-[#3A5A46]">
                خلاصه کوتاه
              </label>
              <textarea
                rows={2}
                value={form.short_detail}
                onChange={(e) => updateForm("short_detail", e.target.value)}
                placeholder="توضیح مختصر جهت نمایش در لیست محصولات..."
                className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-4 py-3 text-xs font-bold text-[#1C3324] outline-none focus:border-[#1C3324]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-[#3A5A46]">
                توضیحات کامل محصول
              </label>
              <textarea
                rows={5}
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                placeholder="توضیحات کامل، ابعاد، ویژگی‌های ساخت و نکات نگهداری..."
                className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-4 py-3 text-xs font-bold text-[#1C3324] outline-none focus:border-[#1C3324]"
              />
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8 lg:col-span-4">
          
          {/* دکمه ارسال فوری */}
          <div className="flex items-center justify-between rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <span className={`block text-xs font-black ${form.isactive ? "text-amber-700" : "text-[#3A5A46]"}`}>
                  {form.isactive ? "ارسال فوری (آماده ارسال)" : "ساخت سفارشی"}
                </span>
                <span className="text-[11px] text-[#3A5A46]">
                  وضعیت تحویل محصول در سایت
                </span>
              </div>
            </div>

            <div dir="ltr">
              <button
                type="button"
                role="switch"
                aria-checked={form.isactive}
                onClick={() => updateForm("isactive", !form.isactive)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  form.isactive ? "bg-amber-500" : "bg-neutral-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    form.isactive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4 rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#1C3324]/10 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#8B263E]" />
                <h3 className="text-base font-black text-[#1C3324]">
                  دسته‌بندی‌ها
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                aria-label="ایجاد دسته‌بندی جدید"
                title="ایجاد دسته جدید"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1C3324] text-white transition hover:bg-[#8B263E] active:scale-90 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {isCategoryLoading ? (
              <div className="py-4 text-center text-xs text-[#3A5A46]">
                در حال دریافت دسته‌ها...
              </div>
            ) : categories.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#3A5A46]">
                هیچ دسته‌ای یافت نشد.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-2">
                {categories.map((cat) => {
                  const isSelected = categoryIds.includes(cat.id);

                  return (
                    <div
                      key={cat.id}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-[#1C3324] text-white shadow-xs"
                          : "border border-[#1C3324]/15 bg-[#FAF9F6] text-[#3A5A46]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setCategoryIds((prev) =>
                            isSelected ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                          )
                        }
                        className="flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                        {cat.name}
                      </button>

                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCategory(cat.id);
                          }}
                          className="flex h-5 w-5 items-center justify-center rounded-lg bg-rose-600 text-white transition hover:bg-rose-700 cursor-pointer"
                          title="حذف دسته‌بندی از این محصول"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Images */}
          <div className="space-y-4 rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#1C3324]/10 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-[#8B263E]" />
                <h3 className="text-base font-black text-[#1C3324]">
                  گالری تصاویر
                </h3>
              </div>
              <span className="text-xs font-bold text-[#3A5A46]">
                {images.length} تصویر
              </span>
            </div>

            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageChange}
              multiple
              accept="image/*"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#1C3324]/20 bg-[#FAF9F6] p-6 text-center transition hover:border-[#8B263E] hover:bg-[#8B263E]/5 cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1C3324]/10 bg-white text-[#8B263E] shadow-xs">
                <Upload className="h-6 w-6" />
              </div>
              <p className="mt-3 text-xs font-black text-[#1C3324]">
                برای افزودن عکس کلیک کنید
              </p>
              <p className="mt-1 text-[10px] text-[#3A5A46]">
                فرمت‌های تصویری تا ۱۰ مگابایت
              </p>
            </button>

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 pt-2">
                {imagePreviews.map((src, idx) => (
                  <div
                    key={idx}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-[#1C3324]/15 bg-[#FAF9F6]"
                  >
                    <img src={src} alt="Preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 left-1 flex h-6 w-6 items-center justify-center rounded-lg bg-rose-600 text-white opacity-0 transition group-hover:opacity-100 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Modal: New Category Creation */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-[#1C3324]/20 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1C3324]/10 pb-3">
              <h3 className="text-base font-black text-[#1C3324]">
                افزودن دسته‌بندی جدید
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-[#3A5A46] hover:text-[#1C3324] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-[#3A5A46]">
                نام دسته‌بندی
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="مثلاً: گوشواره"
                className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-4 py-3 text-xs font-bold text-[#1C3324] outline-none focus:border-[#1C3324]"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-[#3A5A46] transition hover:bg-[#FAF9F6] cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={handleAddCategory}
                disabled={isAddingCategory}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1C3324] px-5 py-2.5 text-xs font-black text-white transition hover:bg-[#8B263E] disabled:opacity-50 cursor-pointer"
              >
                {isAddingCategory && <Loader2 className="h-4 w-4 animate-spin" />}
                افزودن دسته
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}