"use client";

import { useState } from "react";
import { 
  Search, 
  RotateCcw, 
  Check, 
  Zap, 
  BadgePercent, 
  Gem, 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  Scale,
  Sparkles,
  X,
  Infinity as InfinityIcon
} from "lucide-react";
import type { ProductColor } from "@/lib/products";

type FilterProps = {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  selectedColor: "all" | ProductColor | string;
  setSelectedColor: (val: any) => void; 
  minPrice: string;
  setMinPrice: (val: string) => void;
  maxPrice: string;
  setMaxPrice: (val: string) => void;
  minWeight: string;
  setMinWeight: (val: string) => void;
  maxWeight: string;
  setMaxWeight: (val: string) => void;
  hasActiveFilters: boolean;
  onReset: () => void;
  priceRange: string;
  setPriceRange: (val: string) => void;
  weightRange: string;
  setWeightRange: (val: string) => void;
  isGiftFilter: boolean;
  setIsGiftFilter: (val: boolean) => void;
  inStockOnly: boolean;
  setInStockOnly: (val: boolean) => void;
  snappPayOnly: boolean;
  setSnappPayOnly: (val: boolean) => void;
  selectedOccasion: string;
  setSelectedOccasion: (val: string) => void;
};

// رنگ‌های طلا با پالت بصری
const COLOR_OPTIONS = [
  { key: "all", label: "همه رنگ‌ها", bg: "bg-transparent border-dashed" },
  { key: "زرد", label: "طلای زرد", bg: "bg-[#E6CA7A] border-[#D8B65C]" },
  { key: "سفید", label: "طلای سفید", bg: "bg-[#E4E7E5] border-zinc-300" },
  { key: "رزگلد", label: "رزگلد", bg: "bg-[#E8A598] border-[#D88D7F]" },
  { key: "دو رنگ", label: "دو رنگ", bg: "bg-gradient-to-r from-[#E6CA7A] to-[#E4E7E5] border-zinc-300" },
];

// محدوده‌های وزنی سریع
const WEIGHT_PRESETS: { key: string; label: string; min: string; max: string }[] = [
  { key: "all", label: "همه وزن‌ها", min: "", max: "" },
  { key: "gift", label: "هدیه (زیر ۱ گرم)", min: "", max: "1" },
  { key: "light", label: "سبک و مینیمال (زیر ۳ گرم)", min: "", max: "3" },
  { key: "medium", label: "متوسط (۳ تا ۷ گرم)", min: "3", max: "7" },
  { key: "heavy", label: "سرمایه‌گذاری (بالای ۷ گرم)", min: "7", max: "" },
];

// سنگ‌های قیمتی
const GEMSTONES = [
  { id: "all", label: "همه آثار" },
  { id: "none", label: "بدون نگین (تمام طلا)" },
  { id: "diamond", label: "الماس و برلیان" },
  { id: "ruby", label: "یاقوت سرخ" },
  { id: "sapphire", label: "یاقوت کبود" },
  { id: "emerald", label: "زمرد اصل" },
  { id: "pearl", label: "مروارید پرورشی" },
];

// سقف مقیاس برای حرکت لغزنده (بالاتر از ۲۰۰ میلیون به عنوان بدون سقف شمرده می‌شود)
const SLIDER_MAX = 200000000;
const SLIDER_STEP = 2000000;

export default function ProductFilters(props: FilterProps) {
  const [isGemsExpanded, setIsGemsExpanded] = useState(false);
  const [selectedGem, setSelectedGem] = useState("all");

  const numericMin = props.minPrice ? Number(props.minPrice) : 0;
  const isNoLimit = !props.maxPrice;
  const numericMax = isNoLimit ? SLIDER_MAX : Number(props.maxPrice);

  const minPercent = Math.min(100, Math.max(0, (numericMin / SLIDER_MAX) * 100));
  const maxPercent = isNoLimit ? 100 : Math.min(100, Math.max(0, (numericMax / SLIDER_MAX) * 100));

  const formatWithComma = (val: string | number) => {
    if (!val && val !== 0) return "";
    return Number(val).toLocaleString("fa-IR");
  };

  const handleMinSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (!isNoLimit && val >= numericMax) return;
    props.setMinPrice(val === 0 ? "" : String(val));
    props.setPriceRange("custom");
  };

  const handleMaxSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (val <= numericMin) return;
    if (val >= SLIDER_MAX) {
      props.setMaxPrice(""); // باز گذاشتن انتهای بازه بدون سقف عددی
    } else {
      props.setMaxPrice(String(val));
    }
    props.setPriceRange("custom");
  };

  const handleManualInput = (type: "min" | "max", rawVal: string) => {
    const cleanNum = rawVal.replace(/[^\d]/g, "");
    if (type === "min") {
      props.setMinPrice(cleanNum);
    } else {
      props.setMaxPrice(cleanNum);
    }
    props.setPriceRange("custom");
  };

  return (
    <div className="flex flex-col gap-4 font-sans text-right" dir="rtl">
      
      {/* دکمه‌های آفر طلایی: ۳ قسط با قیمت روز + آماده ارسال */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => props.setSnappPayOnly(!props.snappPayOnly)}
          className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
            props.snappPayOnly 
              ? "bg-[#8B263E] text-white border-[#8B263E] shadow-sm scale-101" 
              : "bg-white dark:bg-[#15221B] border-[#1C3324]/10 dark:border-white/10 text-[#1C3324] dark:text-zinc-200 hover:border-[#8B263E] dark:hover:border-[#D8B65C]"
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <BadgePercent size={16} className={props.snappPayOnly ? "text-[#E6CA7A]" : "text-[#8B263E] dark:text-[#D8B65C]"} />
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${props.snappPayOnly ? "bg-white text-[#8B263E] border-white" : "border-[#1C3324]/20 dark:border-white/20"}`}>
              {props.snappPayOnly && <Check size={11} strokeWidth={3} />}
            </div>
          </div>
          <span className="text-xs font-black">پرداخت اقساطی</span>
          <span className={`text-[10px] mt-0.5 ${props.snappPayOnly ? "text-white/80" : "text-[#3A5A46] dark:text-zinc-400"}`}>
             تسویه با نرخ روز
          </span>
        </button>

        <button
          type="button"
          onClick={() => props.setInStockOnly(!props.inStockOnly)}
          className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
            props.inStockOnly 
              ? "bg-[#1C3324] dark:bg-[#D8B65C] text-white dark:text-[#101813] border-[#1C3324] dark:border-[#D8B65C] shadow-sm scale-101" 
              : "bg-white dark:bg-[#15221B] border-[#1C3324]/10 dark:border-white/10 text-[#1C3324] dark:text-zinc-200 hover:border-[#8B263E] dark:hover:border-[#D8B65C]"
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <Zap size={16} className={props.inStockOnly ? "text-[#D8B65C] dark:text-[#101813]" : "text-[#8B263E] dark:text-[#D8B65C]"} />
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${props.inStockOnly ? "bg-white dark:bg-[#101813] text-[#1C3324] dark:text-[#D8B65C] border-white" : "border-[#1C3324]/20 dark:border-white/20"}`}>
              {props.inStockOnly && <Check size={11} strokeWidth={3} />}
            </div>
          </div>
          <span className="text-xs font-black">آماده ارسال فوری</span>
          <span className={`text-[10px] mt-0.5 ${props.inStockOnly ? "text-white/80 dark:text-zinc-800" : "text-[#3A5A46] dark:text-zinc-400"}`}>
            تحویل سریع از گالری
          </span>
        </button>
      </div>

      {/* ۱. جستجوی نام مدل */}
      <div className="bg-white dark:bg-[#15221B] p-3.5 rounded-2xl border border-[#1C3324]/10 dark:border-white/10 shadow-xs">
        <label className="block text-xs font-bold text-[#1C3324] dark:text-zinc-200 mb-2">جستجو در آثار</label>
        <div className="relative">
          <input
            type="text"
            placeholder="نام مدل، انگشتر، کارتیه..."
            value={props.searchQuery}
            onChange={(e) => props.setSearchQuery(e.target.value)}
            className="w-full py-2 pr-3 pl-8 rounded-xl border border-[#1C3324]/15 dark:border-white/10 bg-[#FAF9F6] dark:bg-[#101813] text-[#1C3324] dark:text-white text-xs outline-none focus:border-[#8B263E] dark:focus:border-[#D8B65C] transition-all placeholder:text-[#3A5A46]/50 dark:placeholder:text-zinc-500 font-medium"
          />
          {props.searchQuery ? (
            <button 
              type="button"
              onClick={() => props.setSearchQuery("")} 
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-red-500 cursor-pointer"
            >
              <X size={14} />
            </button>
          ) : (
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#3A5A46] dark:text-zinc-400 pointer-events-none" />
          )}
        </div>
      </div>

      {/* ۲. رنگ طلا با دایره‌های بصری لوکس */}
      <div className="bg-white dark:bg-[#15221B] p-3.5 rounded-2xl border border-[#1C3324]/10 dark:border-white/10 shadow-xs">
        <label className="block text-xs font-bold text-[#1C3324] dark:text-zinc-200 mb-2.5 pb-1.5 border-b border-[#1C3324]/10 dark:border-white/10 flex items-center justify-between">
          <span className="flex items-center gap-1.5"><Gem size={13} className="text-[#8B263E] dark:text-[#D8B65C]" /> رنگ طلا</span>
          {props.selectedColor !== "all" && (
            <button type="button" onClick={() => props.setSelectedColor("all")} className="text-[10px] text-[#8B263E] dark:text-[#D8B65C] hover:underline cursor-pointer">
              پاک کردن
            </button>
          )}
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {COLOR_OPTIONS.map((c) => {
            const isActive = props.selectedColor === c.key;
            return (
              <button
                type="button"
                key={c.key}
                onClick={() => props.setSelectedColor(c.key)}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all flex items-center gap-2 ${
                  isActive 
                    ? "bg-[#1C3324] dark:bg-[#D8B65C] text-white dark:text-[#101813] border-[#1C3324] dark:border-[#D8B65C] shadow-xs" 
                    : "bg-[#FAF9F6] dark:bg-[#101813] border-[#1C3324]/10 dark:border-white/10 text-[#1C3324] dark:text-zinc-300 hover:border-[#8B263E]"
                }`}
              >
                <span className={`w-3 h-3 rounded-full border shrink-0 ${c.bg}`} />
                <span className="truncate">{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ۳. فیلتر بر اساس وزن طلا */}
      <div className="bg-white dark:bg-[#15221B] p-3.5 rounded-2xl border border-[#1C3324]/10 dark:border-white/10 shadow-xs">
        <label className="block text-xs font-bold text-[#1C3324] dark:text-zinc-200 mb-2.5 pb-1.5 border-b border-[#1C3324]/10 dark:border-white/10 flex items-center justify-between">
          <span className="flex items-center gap-1.5"><Scale size={13} className="text-[#8B263E] dark:text-[#D8B65C]" /> محدوده وزنی آثار</span>
          {(props.minWeight || props.maxWeight || props.weightRange !== "all") && (
            <button 
              type="button"
              onClick={() => { props.setMinWeight(""); props.setMaxWeight(""); props.setWeightRange("all"); }} 
              className="text-[10px] text-[#8B263E] dark:text-[#D8B65C] hover:underline cursor-pointer"
            >
              پاک کردن
            </button>
          )}
        </label>
        <div className="flex flex-col gap-1.5">
          {WEIGHT_PRESETS.map((w, idx) => {
            const isSelected = props.weightRange === w.key;
            return (
              <button
                type="button"
                key={`${w.key}-${idx}`}
                onClick={() => {
                  props.setWeightRange(w.key);
                  props.setMinWeight(w.min);
                  props.setMaxWeight(w.max);
                }}
                className={`w-full text-right px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-between cursor-pointer ${
                  isSelected 
                    ? "bg-[#1C3324] dark:bg-[#D8B65C] text-white dark:text-[#101813] shadow-xs" 
                    : "bg-[#FAF9F6] dark:bg-[#101813] text-[#3A5A46] dark:text-zinc-300 hover:border-[#8B263E] border border-[#1C3324]/5 dark:border-white/5"
                }`}
              >
                <span>{w.label}</span>
                {isSelected && <Check size={12} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ۴. فیلتر قیمت متناسب با پالت طلای لوکس (سبز زمردی، عنابی و طلایی) */}
      <div className="bg-white dark:bg-[#15221B] p-3.5 rounded-2xl border border-[#1C3324]/10 dark:border-white/10 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-[#1C3324]/10 dark:border-white/10">
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#1C3324] dark:text-zinc-200">
            <Sliders size={13} className="text-[#8B263E] dark:text-[#D8B65C]" />
            محدوده بودجه
          </span>
          {(props.minPrice || props.maxPrice) && (
            <button 
              type="button"
              onClick={() => { props.setMinPrice(""); props.setMaxPrice(""); props.setPriceRange("all"); }} 
              className="text-[10px] text-[#8B263E] dark:text-[#D8B65C] hover:underline cursor-pointer"
            >
              پاک کردن
            </button>
          )}
        </div>

        {/* باکس‌های ورودی عدد دستی با رنگ‌بندی طلایی و سبز */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-[#FAF9F6] dark:bg-[#101813] p-2 rounded-xl border border-[#1C3324]/10 dark:border-white/10 focus-within:border-[#8B263E] dark:focus-within:border-[#D8B65C] transition-colors">
            <span className="text-[10px] text-[#3A5A46] dark:text-zinc-400 block mb-1">از قیمت</span>
            <div className="flex items-center justify-between gap-1">
              <input
                type="text"
                inputMode="numeric"
                placeholder="۰"
                value={formatWithComma(props.minPrice)}
                onChange={(e) => handleManualInput("min", e.target.value)}
                className="w-full bg-transparent text-xs font-black text-[#1C3324] dark:text-white outline-none selection:bg-[#E6CA7A]/40"
              />
              <span className="text-[9px] text-[#3A5A46]/70 dark:text-zinc-500 shrink-0">تومان</span>
            </div>
          </div>

          <div className="bg-[#FAF9F6] dark:bg-[#101813] p-2 rounded-xl border border-[#1C3324]/10 dark:border-white/10 focus-within:border-[#8B263E] dark:focus-within:border-[#D8B65C] transition-colors">
            <span className="text-[10px] text-[#3A5A46] dark:text-zinc-400 block mb-1">تا قیمت</span>
            <div className="flex items-center justify-between gap-1">
              {isNoLimit ? (
                <div className="flex items-center gap-1 text-xs font-black text-[#8B263E] dark:text-[#D8B65C]">
                  <InfinityIcon size={14} />
                  <span>بدون سقف</span>
                </div>
              ) : (
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="بدون سقف"
                  value={formatWithComma(props.maxPrice)}
                  onChange={(e) => handleManualInput("max", e.target.value)}
                  className="w-full bg-transparent text-xs font-black text-[#1C3324] dark:text-white outline-none selection:bg-[#E6CA7A]/40"
                />
              )}
              <span className="text-[9px] text-[#3A5A46]/70 dark:text-zinc-500 shrink-0">تومان</span>
            </div>
          </div>
        </div>

        {/* نوار کشویی اختصاصی با هایلایت طلایی-عنابی و دستگیره‌های طلا */}
        <div className="relative w-full h-8 flex items-center px-1" dir="ltr">
          {/* مسیر خاکستری-زیتونی زمینه */}
          <div className="absolute w-full h-1.5 bg-[#1C3324]/10 dark:bg-white/10 rounded-full" />
          
          {/* نوار گرادینت بازه فعال طلا */}
          <div 
            className="absolute h-1.5 bg-gradient-to-r from-[#8B263E] via-[#C5A059] to-[#D8B65C] rounded-full shadow-xs"
            style={{
              left: `${minPercent}%`,
              width: `${Math.max(0, maxPercent - minPercent)}%`
            }}
          />

          {/* اسلایدر حداقل قیمت - بدون رنگ آبی پیش‌فرض مرورگر */}
          <input
            type="range"
            min={0}
            max={SLIDER_MAX}
            step={SLIDER_STEP}
            value={numericMin}
            onChange={handleMinSlider}
            aria-label="حداقل قیمت"
            className="absolute w-full appearance-none pointer-events-none bg-transparent h-1.5 z-20 outline-none
              [&::-webkit-slider-runnable-track]:bg-transparent
              [&::-moz-range-track]:bg-transparent
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:pointer-events-auto 
              [&::-webkit-slider-thumb]:w-4.5 
              [&::-webkit-slider-thumb]:h-4.5 
              [&::-webkit-slider-thumb]:rounded-full 
              [&::-webkit-slider-thumb]:bg-[#8B263E] 
              dark:[&::-webkit-slider-thumb]:bg-[#D8B65C] 
              [&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(139,38,62,0.35)] 
              dark:[&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(216,182,92,0.35)] 
              [&::-webkit-slider-thumb]:cursor-pointer 
              [&::-webkit-slider-thumb]:border-2 
              [&::-webkit-slider-thumb]:border-[#FAF9F6] 
              dark:[&::-webkit-slider-thumb]:border-[#101813]
              [&::-webkit-slider-thumb]:hover:scale-115
              [&::-webkit-slider-thumb]:active:scale-95
              [&::-webkit-slider-thumb]:transition-transform
              [&::-moz-range-thumb]:appearance-none
              [&::-moz-range-thumb]:pointer-events-auto 
              [&::-moz-range-thumb]:w-4.5 
              [&::-moz-range-thumb]:h-4.5 
              [&::-moz-range-thumb]:rounded-full 
              [&::-moz-range-thumb]:bg-[#8B263E] 
              dark:[&::-moz-range-thumb]:bg-[#D8B65C] 
              [&::-moz-range-thumb]:border-2 
              [&::-moz-range-thumb]:border-[#FAF9F6] 
              dark:[&::-moz-range-thumb]:border-[#101813]"
          />

          {/* اسلایدر حداکثر قیمت - بدون رنگ آبی پیش‌فرض مرورگر */}
          <input
            type="range"
            min={0}
            max={SLIDER_MAX}
            step={SLIDER_STEP}
            value={isNoLimit ? SLIDER_MAX : numericMax}
            onChange={handleMaxSlider}
            aria-label="حداکثر قیمت"
            className="absolute w-full appearance-none pointer-events-none bg-transparent h-1.5 z-30 outline-none
              [&::-webkit-slider-runnable-track]:bg-transparent
              [&::-moz-range-track]:bg-transparent
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:pointer-events-auto 
              [&::-webkit-slider-thumb]:w-4.5 
              [&::-webkit-slider-thumb]:h-4.5 
              [&::-webkit-slider-thumb]:rounded-full 
              [&::-webkit-slider-thumb]:bg-[#8B263E] 
              dark:[&::-webkit-slider-thumb]:bg-[#D8B65C] 
              [&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(139,38,62,0.35)] 
              dark:[&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(216,182,92,0.35)] 
              [&::-webkit-slider-thumb]:cursor-pointer 
              [&::-webkit-slider-thumb]:border-2 
              [&::-webkit-slider-thumb]:border-[#FAF9F6] 
              dark:[&::-webkit-slider-thumb]:border-[#101813]
              [&::-webkit-slider-thumb]:hover:scale-115
              [&::-webkit-slider-thumb]:active:scale-95
              [&::-webkit-slider-thumb]:transition-transform
              [&::-moz-range-thumb]:appearance-none
              [&::-moz-range-thumb]:pointer-events-auto 
              [&::-moz-range-thumb]:w-4.5 
              [&::-moz-range-thumb]:h-4.5 
              [&::-moz-range-thumb]:rounded-full 
              [&::-moz-range-thumb]:bg-[#8B263E] 
              dark:[&::-moz-range-thumb]:bg-[#D8B65C] 
              [&::-moz-range-thumb]:border-2 
              [&::-moz-range-thumb]:border-[#FAF9F6] 
              dark:[&::-moz-range-thumb]:border-[#101813]"
          />
        </div>

        {/* برچسب‌های راهنمای زیر اسلایدر */}
        <div className="flex justify-between items-center text-[10px] text-[#3A5A46]/70 dark:text-zinc-500 font-medium px-1 mt-1">
          <span>۰</span>
          <span>۵۰ م</span>
          <span>۱۰۰ م</span>
          <span className="flex items-center gap-0.5 text-[#8B263E] dark:text-[#D8B65C] font-bold">
            +۲۰۰ م (بدون سقف)
          </span>
        </div>
      </div>

      {/* ۵. نگین و سنگ‌های قیمتی */}
      <div className="bg-white dark:bg-[#15221B] p-3.5 rounded-2xl border border-[#1C3324]/10 dark:border-white/10 shadow-xs">
        <label className="block text-xs font-bold text-[#1C3324] dark:text-zinc-200 mb-2 pb-1.5 border-b border-[#1C3324]/10 dark:border-white/10 flex items-center justify-between">
          <span className="flex items-center gap-1.5"><Sparkles size={13} className="text-[#8B263E] dark:text-[#D8B65C]" /> نوع نگین</span>
        </label>
        <div className="flex flex-col gap-1">
          {(isGemsExpanded ? GEMSTONES : GEMSTONES.slice(0, 3)).map((gem) => {
            const isSelected = selectedGem === gem.id;
            return (
              <button
                type="button"
                key={gem.id}
                onClick={() => setSelectedGem(gem.id)}
                className={`w-full text-right px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-between cursor-pointer ${
                  isSelected 
                    ? "bg-[#1C3324] dark:bg-[#D8B65C] text-white dark:text-[#101813] shadow-xs" 
                    : "bg-[#FAF9F6] dark:bg-[#101813] text-[#3A5A46] dark:text-zinc-300 hover:bg-[#8B263E]/10 border border-[#1C3324]/5 dark:border-white/5"
                }`}
              >
                <span>{gem.label}</span>
                {isSelected && <Check size={12} />}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsGemsExpanded(!isGemsExpanded)}
            className="mt-1 text-[10.5px] font-bold text-[#8B263E] dark:text-[#D8B65C] hover:underline flex items-center justify-center gap-1 py-1 cursor-pointer"
          >
            {isGemsExpanded ? (
              <>بستن موارد <ChevronUp size={12} /></>
            ) : (
              <>سایر سنگ‌ها <ChevronDown size={12} /></>
            )}
          </button>
        </div>
      </div>

      {/* دکمه پاک‌سازی کلی فیلترها */}
      {props.hasActiveFilters && (
        <button
          type="button"
          onClick={props.onReset}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[#8B263E] dark:border-[#D8B65C] bg-white dark:bg-[#15221B] text-[#8B263E] dark:text-[#D8B65C] font-black text-xs transition-all hover:bg-[#8B263E] hover:text-white dark:hover:bg-[#D8B65C] dark:hover:text-[#101813] shadow-xs cursor-pointer"
        >
          <RotateCcw size={13} /> پاک‌سازی تمام فیلترها
        </button>
      )}

    </div>
  );
}