"use client";

import Link from "next/link";
import { ImageIcon, BadgePercent, ArrowLeft } from "lucide-react";
import { formatPrice } from "@/lib/format";
import {
  ProductItem,
  getProductName,
  getProductDescription,
  getProductImageUrl,
  getProductWeight,
  getProductKarat,
  getProductColor,
  getColorName,
  parseProductVariants,
  toFiniteNumber,
} from "@/lib/products";

type ProductCardProps = {
  product: ProductItem;
  productPrice: number | null;
  isLoadingPrices: boolean;
  goldPriceError: boolean;
};

export default function ProductCard({
  product,
  productPrice,
  isLoadingPrices,
  goldPriceError,
}: ProductCardProps) {
  const productName = getProductName(product);
  const productDescription = getProductDescription(product);
  
  const rawImageUrl = getProductImageUrl(product);
  const productImage = typeof rawImageUrl === "string" && rawImageUrl.trim() !== "" ? rawImageUrl.trim() : null;
  
  const productColor = getProductColor(product);
  const primaryWeight = getProductWeight(product);
  const primaryAyar = getProductKarat(product);
  
  const variants = parseProductVariants(product);
  const validVariants = variants.filter((v) => toFiniteNumber(v.weight) !== null);

  const weightLabel =
    validVariants.length > 1
      ? `${validVariants.length.toLocaleString("fa-IR")} وزن`
      : primaryWeight > 0
      ? `${primaryWeight.toLocaleString("fa-IR", { maximumFractionDigits: 2 })} گرم`
      : null;

  // محاسبه مبلغ هر قسط از ۳ قسط
  const installmentAmount = productPrice && productPrice > 0 ? Math.ceil(productPrice / 3) : null;

  return (
    <article className="group relative bg-white dark:bg-[#1C080E] rounded-2xl sm:rounded-[1.75rem] border border-[#DFB76C]/25 dark:border-white/10 hover:border-[#DFB76C] transition-all duration-400 p-2.5 sm:p-5 flex flex-col justify-between shadow-[0_4px_20px_rgba(59,11,20,0.03)] hover:shadow-xl">
      <Link href={`/products/${product.id}`} className="block">
        
        {/* قاب تصویر ۱:۱ لوکس در هر دو حالت موبایل و دسکتاپ */}
        <div className="relative aspect-square w-full rounded-xl sm:rounded-2xl bg-[#FAF6F0] dark:bg-[#140508] border border-[#DFB76C]/20 dark:border-white/5 overflow-hidden flex items-center justify-center mb-2.5 sm:mb-4">
          
          {/* برچسب اختصاصی تگ */}
          {typeof product.tag === "string" && product.tag.trim() !== "" ? (
            <span className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 text-[9px] sm:text-[10px] font-black px-2 sm:px-2.5 py-0.5 bg-[#8B142D] text-white rounded-full shadow-xs">
              {product.tag.trim()}
            </span>
          ) : (
            <span className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 bg-white/95 dark:bg-[#1C080E]/90 backdrop-blur text-[#8B142D] dark:text-[#DFB76C] rounded-full border border-[#DFB76C]/30 shadow-xs">
              {primaryAyar > 0 ? `${primaryAyar.toLocaleString("fa-IR")} عیار` : "۱۸ عیار"}
            </span>
          )}

          {/* نشانگر وزن */}
          {weightLabel && (
            <span className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 bg-white/95 dark:bg-[#1C080E]/90 backdrop-blur text-[#6E3A44] dark:text-zinc-300 rounded-full border border-[#DFB76C]/30 shadow-xs">
              {weightLabel}
            </span>
          )}

          {productImage ? (
            <img
              src={productImage}
              alt={productName}
              loading="lazy"
              className="w-full h-full object-cover p-2 sm:p-3 group-hover:scale-106 transition-transform duration-500 ease-out"
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-[#3B0B14]/40 dark:text-zinc-500 p-2">
              <ImageIcon className="h-7 w-7 sm:h-9 sm:w-9 text-[#8B142D] dark:text-[#DFB76C]" />
              <span className="text-[10px] sm:text-[11px] font-medium text-[#6E3A44] dark:text-zinc-400">
                {productColor ? getColorName(productColor) : "پرنا زر"}
              </span>
            </div>
          )}
        </div>

        {/* عنوان و توضیحات اثر */}
        <h3 className="text-xs sm:text-base font-extrabold text-[#3B0B14] dark:text-zinc-100 mb-1 line-clamp-1 group-hover:text-[#8B142D] dark:group-hover:text-[#DFB76C] transition-colors leading-snug">
          {productName}
        </h3>
        <p className="text-[10.5px] sm:text-xs text-[#6E3A44] dark:text-zinc-400 line-clamp-1 mb-2 sm:mb-3.5 leading-relaxed">
          {productDescription || "طلای ۱۸ عیار دست‌ساز با شناسنامه اصالت"}
        </p>
      </Link>

      {/* بخش قیمت نقد، آفر ۳ قسط و دکمه مشاهده */}
      <div className="pt-2 sm:pt-3 border-t border-[#3B0B14]/5 dark:border-white/5 space-y-2 sm:space-y-2.5">
        
        {/* قیمت نقدی */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] sm:text-[11px] text-[#6E3A44] dark:text-zinc-400 font-medium shrink-0">قیمت:</span>
          <span className="text-xs sm:text-[15px] font-black text-[#3B0B14] dark:text-white font-mono truncate">
            {productPrice !== null
              ? `${formatPrice(productPrice)} ت`
              : isLoadingPrices 
              ? "در حال محاسبه..." 
              : goldPriceError 
              ? "نرخ در دسترس نیست" 
              : "قیمت نامشخص"}
          </span>
        </div>

        {/* برچسب آفر خرید در ۳ قسط طلایی با قیمت روز */}
        {installmentAmount !== null && (
          <div className="bg-[#FAF8F5] dark:bg-[#140508] px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-[#DFB76C]/35 flex flex-col gap-0.5 text-[9.5px] sm:text-[10.5px]">
            <div className="flex items-center justify-between font-bold text-[#8B142D] dark:text-[#DFB76C]">
              <span className="flex items-center gap-0.5 sm:gap-1 truncate">
                <BadgePercent size={12} className="shrink-0" />
                <span className="truncate">۳ قسط:</span>
              </span>
              <span className="font-mono font-black shrink-0">
                {formatPrice(installmentAmount)} ت
              </span>
            </div>
          </div>
        )}

        {/* دکمه مشاهده و خرید */}
        <Link
          href={`/products/${product.id}`}
          className="w-full py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl bg-[#3B0B14] dark:bg-[#DFB76C] text-white dark:text-[#140508] text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#8B142D] dark:hover:bg-[#E6CA7A] transition-colors shadow-xs"
        >
          <span>مشاهده و سفارش</span>
          <ArrowLeft size={12} className="shrink-0" />
        </Link>
      </div>

    </article>
  );
}
