"use client";

import React, { useState } from "react";
import {
  Type,
  Upload,
  Sparkles,
  Printer,
  Heading as HeadingIcon,
  FileText,
  Trash2,
  Loader2,
  RefreshCw,
  Sliders,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import {
  applyTypography,
  CustomFont,
  resolveFontFamily,
} from "@/components/DynamicTypography";

export type FontOption = {
  id: string;
  name: string;
  family: string;
  description: string;
  tag?: string;
  isCustom?: boolean;
  url?: string;
};

const PRESET_FONTS: FontOption[] = [
  {
    id: "Doran",
    name: "دوران (Doran)",
    family: "Doran",
    description: "قلم هندسی، لوکس و مناسب تیترهای طلا و جواهر (پیش‌فرض سربرگ‌ها)",
    tag: "پیش‌فرض سربرگ",
  },
  {
    id: "IRANSans",
    name: "ایران سنس (IRANSans)",
    family: "IRANSans",
    description: "خوانایی فوق‌العاده بالا، بهینه‌شده برای متون وب و گزارش‌های مالی",
    tag: "پیش‌فرض بدنه و پرینت",
  },
  {
    id: "IRANYekan",
    name: "ایران یکان (IRANYekan)",
    family: "IRANYekan",
    description: "طراحی مدرن، پرکاربرد با پشتیبانی کامل از اعداد فارسی",
    tag: "اعداد فارسی",
  },
  {
    id: "Vazirmatn",
    name: "وزیرمتن (Vazirmatn)",
    family: "Vazirmatn",
    description: "فونت آزاد و استاندارد تایپ فارسی در وب",
    tag: "استاندارد وب",
  },
];

const HEADING_SIZE_PRESETS = [
  { label: "ریز (۹۰٪)", value: 90 },
  { label: "استاندارد (۱۰۰٪)", value: 100 },
  { label: "درشت (۱۱۰٪)", value: 110 },
  { label: "خیلی بزرگ (۱۲۰٪)", value: 120 },
];

const BODY_SIZE_PRESETS = [
  { label: "۱۲px (ریز)", value: 12 },
  { label: "۱۳px (فشرده)", value: 13 },
  { label: "۱۴px (استاندارد)", value: 14 },
  { label: "۱۵px (خوانا)", value: 15 },
  { label: "۱۶px (درشت)", value: 16 },
];

const PRINT_SIZE_PRESETS = [
  { label: "۹px (فوق‌فشرده)", value: 9 },
  { label: "۱۰px (فشرده)", value: 10 },
  { label: "۱۱px (استاندارد A4)", value: 11 },
  { label: "۱۲px (بزرگ)", value: 12 },
  { label: "۱۳px (خوانا)", value: 13 },
];

interface TypographySettingsTabProps {
  fontHeading: string;
  fontBody: string;
  fontPrint: string;
  fontHeadingSize: number;
  fontBodySize: number;
  fontPrintSize: number;
  customFonts: CustomFont[];
  onHeadingChange: (val: string) => void;
  onBodyChange: (val: string) => void;
  onPrintChange: (val: string) => void;
  onHeadingSizeChange: (val: number) => void;
  onBodySizeChange: (val: number) => void;
  onPrintSizeChange: (val: number) => void;
  onCustomFontsChange: (fonts: CustomFont[]) => void;
}

export default function TypographySettingsTab({
  fontHeading,
  fontBody,
  fontPrint,
  fontHeadingSize = 100,
  fontBodySize = 14,
  fontPrintSize = 11,
  customFonts = [],
  onHeadingChange,
  onBodyChange,
  onPrintChange,
  onHeadingSizeChange,
  onBodySizeChange,
  onPrintSizeChange,
  onCustomFontsChange,
}: TypographySettingsTabProps) {
  const [uploading, setUploading] = useState(false);
  const [newFontName, setNewFontName] = useState("");
  const [newFontFamily, setNewFontFamily] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Combine preset and custom fonts
  const allFontOptions: FontOption[] = [
    ...PRESET_FONTS,
    ...customFonts.map((cf) => ({
      id: cf.family,
      name: `${cf.name} (${cf.family})`,
      family: cf.family,
      description: "فونت سفارشی آپلود شده توسط مدیر",
      tag: "سفارشی",
      isCustom: true,
      url: cf.url,
    })),
  ];

  const headingCssFamily = resolveFontFamily(fontHeading || "Doran", customFonts);
  const bodyCssFamily = resolveFontFamily(fontBody || "IRANSans", customFonts);
  const printCssFamily = resolveFontFamily(fontPrint || "IRANSans", customFonts);

  const handleLivePreview = () => {
    applyTypography({
      fontHeading,
      fontBody,
      fontPrint,
      fontHeadingSize,
      fontBodySize,
      fontPrintSize,
      customFonts,
    });
    toast.success("پیش‌نمایش فونت و سایزها در کل این صفحه اعمال شد.");
  };

  const handleFontUpload = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();

    if (!selectedFile) {
      toast.error("لطفاً فایل فونت را انتخاب کنید.");
      return;
    }

    if (!newFontName.trim()) {
      toast.error("لطفاً نام نمایشی فونت را وارد کنید.");
      return;
    }

    try {
      setUploading(true);

      const token = pb.authStore.token;
      if (!token) {
        throw new Error("نشست کاربری شما معتبر نیست. لطفاً مجدداً وارد شوید.");
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", newFontName.trim());
      if (newFontFamily.trim()) {
        formData.append("family", newFontFamily.trim());
      }

      const response = await fetch("/api/admin/fonts/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "خطا در آپلود فونت");
      }

      const newFont: CustomFont = resData.font;
      const updatedList = [...customFonts, newFont];
      onCustomFontsChange(updatedList);

      // Register new font face immediately in DOM
      applyTypography({
        fontHeading,
        fontBody,
        fontPrint,
        fontHeadingSize,
        fontBodySize,
        fontPrintSize,
        customFonts: updatedList,
      });

      toast.success(resData.message || `فونت «${newFont.name}» با موفقیت افزوده شد.`);

      // Reset form
      setNewFontName("");
      setNewFontFamily("");
      setSelectedFile(null);
      const fileInput = document.getElementById("font-file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err) {
      console.error("Font upload error:", err);
      toast.error(err instanceof Error ? err.message : "خطا در آپلود فونت");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCustomFont = (id: string) => {
    const fontToRemove = customFonts.find((f) => f.id === id);
    const updated = customFonts.filter((f) => f.id !== id);
    onCustomFontsChange(updated);

    // If removed font was selected, revert to default
    if (fontToRemove) {
      if (fontHeading === fontToRemove.family) onHeadingChange("Doran");
      if (fontBody === fontToRemove.family) onBodyChange("IRANSans");
      if (fontPrint === fontToRemove.family) onPrintChange("IRANSans");
    }

    toast.info("فونت از لیست حذف شد. برای ذخیره نهایی، دکمه ذخیره تنظیمات را بزنید.");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Overview Info Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[#1C3324]/10 bg-linear-to-br from-[#FAF9F5] via-white to-[#F2EFE9] p-6 shadow-xs dark:border-white/10 dark:from-[#15221B] dark:via-[#101813] dark:to-[#18281F]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1C3324] text-[#D8B65C] shadow-md dark:bg-[#D8B65C] dark:text-[#101813]">
              <Type className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                تنظیمات قلم و سایز تایپوگرافی سایت
              </h2>
              <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400 leading-relaxed">
                نوع قلم و مقیاس اندازه فونت‌ها را برای سربرگ‌ها، متون بدنه و چاپ اسناد شخصی‌سازی کنید. تغییرات فونت و اندازه به شکل سراسری در تمامی بخش‌های سایت (هدر، فوتر، ویترین، مقالات، کارت‌ها و فاکتورها) اعمال می‌شوند.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLivePreview}
            className="flex items-center justify-center gap-2 rounded-2xl border border-[#1C3324]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#1C3324] shadow-xs transition hover:bg-[#1C3324] hover:text-white dark:border-white/20 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-[#D8B65C] dark:hover:text-[#101813] cursor-pointer shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            پیش‌نمایش آنی فونت و سایزها در صفحه
          </button>
        </div>
      </div>

      {/* Main Font & Size Selectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Heading Font & Size */}
        <div className="rounded-3xl border border-[#1C3324]/12 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#15221B] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-black text-[#1C3324] dark:text-zinc-100">
                <HeadingIcon className="h-4 w-4 text-[#8B263E] dark:text-[#D8B65C]" />
                فونت سربرگ و تیترها (Headings)
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                پیش‌فرض: دوران
              </span>
            </div>
            <p className="text-[11px] text-[#3A5A46] dark:text-zinc-400 leading-5">
              برای تمام عنوان‌ها (h1 تا h6)، لوگو، منوی سایت و تیترهای ویترین استفاده می‌شود.
            </p>

            {/* Font Family Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#1C3324] dark:text-zinc-300">
                انتخاب قلم:
              </label>
              <select
                value={fontHeading || "Doran"}
                onChange={(e) => onHeadingChange(e.target.value)}
                className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F5] px-4 py-2.5 text-xs font-bold text-[#1C3324] outline-none transition focus:border-[#1C3324] focus:bg-white dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100 dark:focus:border-[#D8B65C]"
              >
                {allFontOptions.map((f) => (
                  <option key={`heading-${f.id}`} value={f.family}>
                    {f.name} {f.tag ? `[${f.tag}]` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Heading Size Slider & Presets */}
            <div className="space-y-2 border-t border-[#1C3324]/10 pt-3 dark:border-white/10">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="flex items-center gap-1.5 text-[#1C3324] dark:text-zinc-200">
                  <Sliders className="h-3 w-3 text-[#8B263E] dark:text-[#D8B65C]" />
                  مقیاس سایز تیترها:
                </span>
                <span className="font-mono text-[#8B263E] dark:text-[#D8B65C]">
                  {fontHeadingSize}%
                </span>
              </div>

              <input
                type="range"
                min="80"
                max="140"
                step="2"
                value={fontHeadingSize}
                onChange={(e) => onHeadingSizeChange(Number(e.target.value))}
                className="w-full accent-[#1C3324] dark:accent-[#D8B65C] cursor-pointer"
              />

              <div className="flex flex-wrap gap-1.5 pt-1">
                {HEADING_SIZE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => onHeadingSizeChange(p.value)}
                    className={`rounded-xl px-2 py-1 text-[10px] font-bold transition cursor-pointer ${
                      fontHeadingSize === p.value
                        ? "bg-[#1C3324] text-white dark:bg-[#D8B65C] dark:text-[#101813]"
                        : "bg-[#FAF9F5] text-[#3A5A46] hover:bg-[#1C3324]/10 dark:bg-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Mini Preview */}
          <div className="mt-5 rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F5] p-3.5 dark:border-white/5 dark:bg-[#101813]">
            <span className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
              پیش‌نمایش زنده تیتر ({fontHeadingSize}%):
            </span>
            <div
              style={{
                fontFamily: headingCssFamily,
                fontSize: `${1.1 * (fontHeadingSize / 100)}rem`,
              }}
              className="mt-1.5 font-black text-[#1C3324] dark:text-zinc-100 truncate"
            >
              گالری طلا و جواهر پرنا زر
            </div>
          </div>
        </div>

        {/* 2. Body Font & Size */}
        <div className="rounded-3xl border border-[#1C3324]/12 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#15221B] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-black text-[#1C3324] dark:text-zinc-100">
                <FileText className="h-4 w-4 text-[#1C3324] dark:text-[#D8B65C]" />
                فونت بدنه و متون (Body Font)
              </span>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                پیش‌فرض: ایران سنس
              </span>
            </div>
            <p className="text-[11px] text-[#3A5A46] dark:text-zinc-400 leading-5">
              برای تمام پاراگراف‌ها، کارت محصولات، دکمه‌ها، جداول و مقادیر متنی سایت اعمال می‌شود.
            </p>

            {/* Font Family Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#1C3324] dark:text-zinc-300">
                انتخاب قلم:
              </label>
              <select
                value={fontBody || "IRANSans"}
                onChange={(e) => onBodyChange(e.target.value)}
                className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F5] px-4 py-2.5 text-xs font-bold text-[#1C3324] outline-none transition focus:border-[#1C3324] focus:bg-white dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100 dark:focus:border-[#D8B65C]"
              >
                {allFontOptions.map((f) => (
                  <option key={`body-${f.id}`} value={f.family}>
                    {f.name} {f.tag ? `[${f.tag}]` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Body Base Size Slider & Presets */}
            <div className="space-y-2 border-t border-[#1C3324]/10 pt-3 dark:border-white/10">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="flex items-center gap-1.5 text-[#1C3324] dark:text-zinc-200">
                  <Sliders className="h-3 w-3 text-[#1C3324] dark:text-[#D8B65C]" />
                  سایز پایه متون بدنه:
                </span>
                <span className="font-mono text-[#1C3324] dark:text-[#D8B65C]">
                  {fontBodySize}px
                </span>
              </div>

              <input
                type="range"
                min="12"
                max="18"
                step="1"
                value={fontBodySize}
                onChange={(e) => onBodySizeChange(Number(e.target.value))}
                className="w-full accent-[#1C3324] dark:accent-[#D8B65C] cursor-pointer"
              />

              <div className="flex flex-wrap gap-1.5 pt-1">
                {BODY_SIZE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => onBodySizeChange(p.value)}
                    className={`rounded-xl px-2 py-1 text-[10px] font-bold transition cursor-pointer ${
                      fontBodySize === p.value
                        ? "bg-[#1C3324] text-white dark:bg-[#D8B65C] dark:text-[#101813]"
                        : "bg-[#FAF9F5] text-[#3A5A46] hover:bg-[#1C3324]/10 dark:bg-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Mini Preview */}
          <div className="mt-5 rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F5] p-3.5 dark:border-white/5 dark:bg-[#101813]">
            <span className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
              پیش‌نمایش زنده متن ({fontBodySize}px):
            </span>
            <div
              style={{
                fontFamily: bodyCssFamily,
                fontSize: `${fontBodySize}px`,
              }}
              className="mt-1.5 text-[#1C3324] dark:text-zinc-200 line-clamp-2 leading-relaxed"
            >
              خرید مطمئن و آنلاین انواع طلا و زیورآلات ۱۸ عیار با ضمانت اصالت فاکتور.
            </div>
          </div>
        </div>

        {/* 3. Print & Invoice Font & Size */}
        <div className="rounded-3xl border border-[#1C3324]/12 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#15221B] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-black text-[#1C3324] dark:text-zinc-100">
                <Printer className="h-4 w-4 text-[#8B263E] dark:text-[#D8B65C]" />
                فونت چاپ و فاکتورها (Print Font)
              </span>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                خوانایی پرینتر
              </span>
            </div>
            <p className="text-[11px] text-[#3A5A46] dark:text-zinc-400 leading-5">
              برای خروجی پرینت فاکتورها، گزارش‌های سود و زیان و نسخه‌های چاپی A4 اعمال می‌گردد.
            </p>

            {/* Font Family Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#1C3324] dark:text-zinc-300">
                انتخاب قلم:
              </label>
              <select
                value={fontPrint || "IRANSans"}
                onChange={(e) => onPrintChange(e.target.value)}
                className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F5] px-4 py-2.5 text-xs font-bold text-[#1C3324] outline-none transition focus:border-[#1C3324] focus:bg-white dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100 dark:focus:border-[#D8B65C]"
              >
                {allFontOptions.map((f) => (
                  <option key={`print-${f.id}`} value={f.family}>
                    {f.name} {f.tag ? `[${f.tag}]` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Print Size Slider & Presets */}
            <div className="space-y-2 border-t border-[#1C3324]/10 pt-3 dark:border-white/10">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="flex items-center gap-1.5 text-[#1C3324] dark:text-zinc-200">
                  <Sliders className="h-3 w-3 text-[#8B263E] dark:text-[#D8B65C]" />
                  سایز قلم فاکتورهای چاپی:
                </span>
                <span className="font-mono text-[#8B263E] dark:text-[#D8B65C]">
                  {fontPrintSize}px
                </span>
              </div>

              <input
                type="range"
                min="8"
                max="16"
                step="1"
                value={fontPrintSize}
                onChange={(e) => onPrintSizeChange(Number(e.target.value))}
                className="w-full accent-[#8B263E] dark:accent-[#D8B65C] cursor-pointer"
              />

              <div className="flex flex-wrap gap-1.5 pt-1">
                {PRINT_SIZE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => onPrintSizeChange(p.value)}
                    className={`rounded-xl px-2 py-1 text-[10px] font-bold transition cursor-pointer ${
                      fontPrintSize === p.value
                        ? "bg-[#1C3324] text-white dark:bg-[#D8B65C] dark:text-[#101813]"
                        : "bg-[#FAF9F5] text-[#3A5A46] hover:bg-[#1C3324]/10 dark:bg-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Mini Preview */}
          <div className="mt-5 rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F5] p-3.5 dark:border-white/5 dark:bg-[#101813]">
            <span className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
              پیش‌نمایش زنده فاکتور ({fontPrintSize}px):
            </span>
            <div
              style={{
                fontFamily: printCssFamily,
                fontSize: `${fontPrintSize}px`,
              }}
              className="mt-1.5 font-mono font-bold text-[#1C3324] dark:text-zinc-200 truncate"
            >
              فاکتور شماره: INV-1403-902 | ۲۵,۶۵۸,۶۰۰ تومان
            </div>
          </div>
        </div>
      </div>

      {/* Typography Live Studio & Comparison Card */}
      <div className="rounded-3xl border border-[#1C3324]/12 bg-white p-6 sm:p-8 shadow-xs dark:border-white/10 dark:bg-[#15221B]">
        <div className="flex items-center gap-3 border-b border-[#1C3324]/10 pb-4 dark:border-white/10">
          <Sparkles className="h-5 w-5 text-[#8B263E] dark:text-[#D8B65C]" />
          <div>
            <h3 className="text-sm font-black text-[#1C3324] dark:text-zinc-100">
              استودیوی پیش‌نمایش زنده تایپوگرافی و مقیاس‌ها
            </h3>
            <p className="text-xs text-[#3A5A46] dark:text-zinc-400 mt-0.5">
              نحوه نمایش همزمان تیترها، متون بدنه و اعداد فارسی با مقیاس اندازه و فونت‌های تنظیمی
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Web Preview Mockup */}
          <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FCFCFA] p-6 dark:border-white/10 dark:bg-[#101813]/70 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1C3324]/10 pb-3 dark:border-white/10">
              <span className="text-[11px] font-black text-[#3A5A46] dark:text-zinc-400">
                پیش‌نمایش سایت (فونت: {fontHeading} | مقیاس: {fontHeadingSize}٪)
              </span>
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
            </div>

            {/* Heading in chosen Heading font & scale */}
            <div>
              <span className="text-[10px] font-bold text-[#8B263E] dark:text-[#D8B65C] block mb-1">
                تیتر اول [فونت: {fontHeading || "Doran"} - مقیاس: {fontHeadingSize}%]
              </span>
              <h1
                style={{
                  fontFamily: headingCssFamily,
                  fontSize: `calc(1.5rem * ${fontHeadingSize / 100})`,
                }}
                className="font-black text-[#1C3324] dark:text-zinc-100 leading-snug"
              >
                زیبایی بی‌بدیل طلا با طراحی مدرن پرنا زر — مثل زر بدرخش
              </h1>
            </div>

            {/* Paragraph in chosen Body font & size */}
            <div>
              <span className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400 block mb-1">
                متن بدنه و اعداد [فونت: {fontBody || "IRANSans"} - سایز: {fontBodySize}px]
              </span>
              <p
                style={{
                  fontFamily: bodyCssFamily,
                  fontSize: `${fontBodySize}px`,
                }}
                className="text-[#3A5A46] dark:text-zinc-300 leading-6"
              >
                کلیه زیورآلات با عیار استاندارد ۷۵۰ (۱۸ عیار) و با فاکتور رسمی معتبر ارائه می‌شوند.
                طرح پرداخت در ۳ قسط طلایی با قیمت روز طلا، خریدی آسان و هوشمندانه را برای شما فراهم می‌سازد.
              </p>
            </div>

            {/* Persian Numbers Demo */}
            <div className="rounded-xl border border-[#1C3324]/10 bg-white p-3 dark:border-white/10 dark:bg-zinc-900/50">
              <span className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
                مقایسه ارقام فارسی:
              </span>
              <div className="mt-2 flex flex-wrap gap-4 text-xs font-mono font-bold text-[#1C3324] dark:text-zinc-100">
                <span style={{ fontFamily: headingCssFamily }}>
                  تیتر: ۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹
                </span>
                <span style={{ fontFamily: bodyCssFamily, fontSize: `${fontBodySize}px` }}>
                  بدنه: ۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹
                </span>
                <span style={{ fontFamily: printCssFamily, fontSize: `${fontPrintSize}px` }}>
                  چاپ: ۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹
                </span>
              </div>
            </div>
          </div>

          {/* Invoice Print Mockup */}
          <div className="rounded-2xl border-2 border-dashed border-[#1C3324]/20 bg-white p-6 shadow-xs dark:border-white/20 dark:bg-[#101813] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1C3324]/10 pb-3 dark:border-white/10">
              <span className="flex items-center gap-1.5 text-[11px] font-black text-[#1C3324] dark:text-zinc-100">
                <Printer className="h-3.5 w-3.5 text-[#8B263E] dark:text-[#D8B65C]" />
                پیش‌نمایش خروجی فاکتور رسمی (چاپ A4)
              </span>
              <span className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
                فونت: {fontPrint || "IRANSans"} | سایز: {fontPrintSize}px
              </span>
            </div>

            <div
              style={{
                fontFamily: printCssFamily,
                fontSize: `${fontPrintSize}px`,
              }}
              className="space-y-3"
            >
              <div className="flex justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                <span className="font-bold text-zinc-600 dark:text-zinc-400">شماره فاکتور:</span>
                <span className="font-mono font-black text-zinc-900 dark:text-zinc-100">INV-1403-9024</span>
              </div>

              <div className="flex justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                <span className="font-bold text-zinc-600 dark:text-zinc-400">شرح کالا:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">دستبند کارتیه ۱۸ عیار طلایی</span>
              </div>

              <div className="flex justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                <span className="font-bold text-zinc-600 dark:text-zinc-400">وزن خالص:</span>
                <span className="font-mono font-black text-zinc-900 dark:text-zinc-100">۴.۳۲۰ گرم</span>
              </div>

              <div className="flex justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                <span className="font-bold text-zinc-600 dark:text-zinc-400">نرخ طلای ۱۸ عیار:</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">۲۵,۶۵۸,۶۰۰ تومان</span>
              </div>

              <div className="flex justify-between items-center rounded-xl bg-[#FAF9F5] p-3 dark:bg-zinc-900/60 font-black">
                <span className="text-[#1C3324] dark:text-zinc-100">مبلغ نهایی فاکتور:</span>
                <span className="text-sm font-mono text-[#8B263E] dark:text-[#D8B65C]">
                  ۱۱۸,۹۴۰,۰۰۰ تومان
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add & Upload Custom Font Section */}
      <div className="rounded-3xl border border-[#1C3324]/12 bg-white p-6 sm:p-8 shadow-xs dark:border-white/10 dark:bg-[#15221B]">
        <div className="flex items-center gap-3 border-b border-[#1C3324]/10 pb-4 dark:border-white/10">
          <Upload className="h-5 w-5 text-[#1C3324] dark:text-[#D8B65C]" />
          <div>
            <h3 className="text-sm font-black text-[#1C3324] dark:text-zinc-100">
              افزودن و آپلود فونت جدید
            </h3>
            <p className="text-xs text-[#3A5A46] dark:text-zinc-400 mt-0.5">
              می‌توانید فونت‌های دلخواه خود را با فرمت‌های woff2، woff یا ttf در سرور بارگذاری کنید.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#1C3324] dark:text-zinc-200">
                نام نمایشی فونت (فارسی) *
              </label>
              <input
                type="text"
                value={newFontName}
                onChange={(e) => setNewFontName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleFontUpload(e);
                  }
                }}
                placeholder="مثال: فونت دانا، قلم شبنم، فونت ساحل"
                className="w-full rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-3.5 text-xs font-bold text-[#1C3324] outline-none transition placeholder:text-[#3A5A46]/50 focus:border-[#1C3324] dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[#D8B65C]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#1C3324] dark:text-zinc-200">
                شناسه قلم انگلیسی (Font Family)
              </label>
              <input
                type="text"
                value={newFontFamily}
                onChange={(e) => setNewFontFamily(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleFontUpload(e);
                  }
                }}
                placeholder="مثال: Dana, Shabnam, Sahel (اختیاری)"
                className="w-full rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-3.5 text-xs font-bold text-[#1C3324] outline-none transition placeholder:text-[#3A5A46]/50 focus:border-[#1C3324] dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[#D8B65C]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#1C3324] dark:text-zinc-200">
              انتخاب فایل وب‌فونت (.woff2, .woff, .ttf, .otf) *
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                id="font-file-input"
                type="file"
                accept=".woff2,.woff,.ttf,.otf"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                }}
                className="w-full file:mr-0 file:ml-4 file:rounded-xl file:border-0 file:bg-[#1C3324] file:px-4 file:py-2.5 file:text-xs file:font-black file:text-white hover:file:bg-[#8B263E] dark:file:bg-[#D8B65C] dark:file:text-[#101813] text-xs font-bold text-[#3A5A46] dark:text-zinc-400 cursor-pointer"
              />

              <button
                type="button"
                onClick={handleFontUpload}
                disabled={uploading || !selectedFile}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-[#1C3324] px-6 py-3 text-xs font-black text-white shadow-xs transition hover:bg-[#8B263E] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer shrink-0 dark:bg-[#D8B65C] dark:text-[#101813] dark:hover:bg-[#EAD9A0]"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    در حال آپلود...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    آپلود و افزودن فونت
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-[#3A5A46]/70 dark:text-zinc-500">
              فایل‌های woff2 به دلیل فشرده‌سازی بالا و بارگذاری سریع، بهترین گزینه برای وب هستند.
            </p>
          </div>
        </div>

        {/* Custom Fonts List */}
        {customFonts.length > 0 && (
          <div className="mt-8 border-t border-[#1C3324]/10 pt-6 dark:border-white/10">
            <h4 className="text-xs font-black text-[#1C3324] dark:text-zinc-200 mb-4">
              فونت‌های سفارشی ذخیره‌شده ({customFonts.length} فونت)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {customFonts.map((cf) => (
                <div
                  key={cf.id}
                  className="flex items-center justify-between rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F5] p-3.5 dark:border-white/5 dark:bg-[#101813]"
                >
                  <div className="min-w-0 pr-1">
                    <p className="text-xs font-black text-[#1C3324] dark:text-zinc-100 truncate">
                      {cf.name}
                    </p>
                    <p className="text-[10px] font-mono text-[#3A5A46] dark:text-zinc-400 truncate">
                      Family: {cf.family}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveCustomFont(cf.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-rose-500 transition hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/40 cursor-pointer shrink-0"
                    title="حذف فونت"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
