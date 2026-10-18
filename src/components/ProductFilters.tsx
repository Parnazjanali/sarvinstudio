"use client";

import { useState } from "react";
import { Search, RotateCcw, Check, Zap, CreditCard, Gem, Sliders, ChevronDown, ChevronUp, Users } from "lucide-react";
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

// گزینه‌های رنگ منطبق با مقادیر فارسی دیتابیس پاکت‌بیس
const COLOR_OPTIONS = [
  { key: "all", label: "همه رنگ‌ها" },
  { key: "زرد", label: "زرد" },
  { key: "سفید", label: "سفید" },
  { key: "رزگلد", label: "رزگلد" },
  { key: "دو رنگ", label: "دو رنگ" },
];

// لیست سنگ‌های قیمتی برای بخش بیشتر/کمتر
const GEMSTONES = [
  { id: "all", label: "همه سنگ‌ها" },
  { id: "diamond", label: "الماس و برلیان" },
  { id: "ruby", label: "یاقوت سرخ" },
  { id: "sapphire", label: "یاقوت کبود" },
  { id: "emerald", label: "زمرد" },
  { id: "turquoise", label: "فیروزه اصل" },
  { id: "pearl", label: "مروارید پرورشی" },
  { id: "none", label: "بدون سنگ (تمام طلا)" },
];

// دسته‌بندی و جنسیت
const CATEGORIES = [
  { key: "all", label: "همه آثار" },
  { key: "women", label: "زنانه" },
  { key: "men", label: "مردانه" },
  { key: "kids", label: "کودک و نوزاد" },
  { key: "ring", label: "انگشتر" },
  { key: "necklace", label: "گردنبند" },
  { key: "bracelet", label: "دستبند" },
  { key: "earring", label: "گوشواره" },
];

export default function ProductFilters(props: FilterProps) {
  const [isGemsExpanded, setIsGemsExpanded] = useState(false);
  const [selectedGem, setSelectedGem] = useState("all");

  const maxPriceLimit = 200000000; // 200 میلیون تومان سقف اسلایدر

  return (
    <div className="flex flex-col gap-6 font-sans">
      
      {/* دکمه‌های سریع هوشمند (آماده ارسال + اقساط) */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => props.setInStockOnly(!props.inStockOnly)}
          className={`p-3 rounded-2xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
            props.inStockOnly 
              ? "bg-[#1C3324] text-white border-[#1C3324] shadow-xs" 
              : "bg-white border-[#1C3324]/15 text-[#1C3324] hover:border-[#8B263E]"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <Zap size={15} className={props.inStockOnly ? "text-[#D8B65C]" : "text-[#8B263E]"} />
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${props.inStockOnly ? "bg-white text-[#1C3324] border-white" : "border-[#1C3324]/20"}`}>
              {props.inStockOnly && <Check size={10} strokeWidth={3} />}
            </div>
          </div>
          <span className="text-[12px] font-bold mt-1">آماده ارسال</span>
        </button>

        <button
          onClick={() => props.setSnappPayOnly(!props.snappPayOnly)}
          className={`p-3 rounded-2xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
            props.snappPayOnly 
              ? "bg-[#8B263E] text-white border-[#8B263E] shadow-xs" 
              : "bg-white border-[#1C3324]/15 text-[#1C3324] hover:border-[#8B263E]"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <CreditCard size={15} className={props.snappPayOnly ? "text-white" : "text-[#8B263E]"} />
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${props.snappPayOnly ? "bg-white text-[#8B263E] border-white" : "border-[#1C3324]/20"}`}>
              {props.snappPayOnly && <Check size={10} strokeWidth={3} />}
            </div>
          </div>
          <span className="text-[12px] font-bold mt-1">خرید اقساطی</span>
        </button>
      </div>

      {/* ۱. جستجو در آثار */}
      <div className="bg-white p-4 rounded-2xl border border-[#1C3324]/15 shadow-xs">
        <label className="block text-[13px] font-bold text-[#1C3324] mb-2.5">جستجو در آثار</label>
        <div className="relative">
          <input
            type="text"
            placeholder="نام مدل، انگشتر، گردنبند..."
            value={props.searchQuery}
            onChange={(e) => props.setSearchQuery(e.target.value)}
            className="w-full py-2.5 pr-3 pl-10 rounded-xl border border-[#1C3324]/15 bg-[#FAF9F6] text-[#1C3324] text-[13px] outline-none focus:border-[#8B263E] transition-all placeholder:text-[#3A5A46]/50 font-medium"
          />
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3A5A46] pointer-events-none" />
        </div>
      </div>

      {/* ۲. دسته‌بندی و جنسیت (مردانه، زنانه، کودک) */}
      <div className="bg-white p-4 rounded-2xl border border-[#1C3324]/15 shadow-xs">
        <label className="block text-[13px] font-bold text-[#1C3324] mb-3 pb-2 border-b border-[#1C3324]/10 flex items-center gap-1.5">
          <Users size={14} className="text-[#8B263E]" /> دسته‌بندی و جنسیت
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const isSelected = props.selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => props.setSelectedCategory(cat.key)}
                className={`px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                  isSelected 
                    ? "bg-[#1C3324] text-white shadow-xs" 
                    : "bg-[#FAF9F6] text-[#3A5A46] border border-[#1C3324]/10 hover:border-[#8B263E] hover:text-[#1C3324]"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ۳. محدوده قیمت کشویی (Range Slider) */}
      <div className="bg-white p-4 rounded-2xl border border-[#1C3324]/15 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1C3324]/10">
          <label className="text-[13px] font-bold text-[#1C3324] flex items-center gap-1.5">
            <Sliders size={14} className="text-[#8B263E]" /> محدوده قیمت
          </label>
          <span className="text-[11px] font-bold text-[#3A5A46]">
            {props.maxPrice ? `${Number(props.maxPrice).toLocaleString("fa-IR")} تومان` : "تا ۲۰۰ میلیون"}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <input
            type="range"
            min="0"
            max={maxPriceLimit}
            step="5000000"
            value={props.maxPrice ? Number(props.maxPrice) : maxPriceLimit}
            onChange={(e) => {
              props.setMinPrice("0");
              props.setMaxPrice(e.target.value);
              props.setPriceRange("custom");
            }}
            className="w-full accent-[#1C3324] cursor-pointer h-1.5 bg-[#FAF9F6] rounded-lg"
          />
          <div className="flex justify-between items-center text-[11px] font-bold text-[#3A5A46]">
            <span>۰ تومان</span>
            <button 
              onClick={() => { props.setMinPrice(""); props.setMaxPrice(""); props.setPriceRange("all"); }}
              className="text-[#8B263E] hover:underline cursor-pointer"
            >
              بازنشانی قیمت
            </button>
          </div>
        </div>
      </div>

      {/* ۴. رنگ طلا با مقادیر فارسی (زرد، سفید، رزگلد، دو رنگ) */}
      <div className="bg-white p-4 rounded-2xl border border-[#1C3324]/15 shadow-xs">
        <label className="block text-[13px] font-bold text-[#1C3324] mb-3 pb-2 border-b border-[#1C3324]/10 flex items-center gap-1.5">
          <Gem size={14} className="text-[#8B263E]" /> رنگ طلا
        </label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((color) => {
            const isActive = props.selectedColor === color.key;
            return (
              <button
                key={color.key}
                onClick={() => props.setSelectedColor(color.key)}
                className={`px-4 py-2 rounded-xl border text-[12px] font-bold cursor-pointer transition-all ${
                  isActive 
                    ? "bg-[#1C3324] text-white border-[#1C3324] shadow-xs" 
                    : "bg-[#FAF9F6] border-[#1C3324]/15 text-[#1C3324] hover:border-[#8B263E]"
                }`}
              >
                {color.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ۵. بخش سنگ‌های قیمتی با قابلیت «بیشتر و کمتر» */}
      <div className="bg-white p-4 rounded-2xl border border-[#1C3324]/15 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1C3324]/10">
          <label className="text-[13px] font-bold text-[#1C3324] flex items-center gap-1.5">
            <Gem size={14} className="text-[#8B263E]" /> سنگ‌ها و نگین‌های قیمتی
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          {(isGemsExpanded ? GEMSTONES : GEMSTONES.slice(0, 4)).map((gem) => {
            const isSelected = selectedGem === gem.id;
            return (
              <button
                key={gem.id}
                onClick={() => setSelectedGem(gem.id)}
                className={`w-full text-right px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-between cursor-pointer ${
                  isSelected 
                    ? "bg-[#1C3324] text-white shadow-xs" 
                    : "bg-[#FAF9F6] text-[#3A5A46] hover:bg-[#8B263E]/10 hover:text-[#1C3324] border border-[#1C3324]/10"
                }`}
              >
                <span>{gem.label}</span>
                {isSelected && <Check size={14} />}
              </button>
            );
          })}

          <button
            onClick={() => setIsGemsExpanded(!isGemsExpanded)}
            className="mt-2 text-xs font-bold text-[#8B263E] hover:underline flex items-center justify-center gap-1 py-1 cursor-pointer"
          >
            {isGemsExpanded ? (
              <>کمتر <ChevronUp size={14} /></>
            ) : (
              <>موارد بیشتر <ChevronDown size={14} /></>
            )}
          </button>
        </div>
      </div>

      {/* دکمه پاک‌سازی فیلترها */}
      {props.hasActiveFilters && (
        <button
          onClick={props.onReset}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border border-[#8B263E] bg-white text-[#8B263E] font-bold text-[13px] transition-all hover:bg-[#8B263E] hover:text-white shadow-xs cursor-pointer"
        >
          <RotateCcw size={16} /> پاک‌سازی تمام فیلترها
        </button>
      )}
    </div>
  );
}