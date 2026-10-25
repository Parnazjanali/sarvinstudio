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
    <article className="group relative bg-white dark:bg-[#15221B] rounded-[1.75rem] border border-[#1C3324]/10 dark:border-white/10 hover:border-[#8B263E]/40 dark:hover:border-[#D8B65C]/40 transition-all duration-400 p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-xl">
      <Link href={`/products/${product.id}`} className="block">
        
        {/* قاب تصویر لوکس با پس‌زمینه ارگانیک */}
        <div className="relative aspect-[4/4.5] rounded-2xl bg-[#FAF9F6] dark:bg-[#101813] border border-[#1C3324]/5 dark:border-white/5 overflow-hidden flex items-center justify-center mb-4">
          
          {/* برچسب اختصاصی تگ */}
          {typeof product.tag === "string" && product.tag.trim() !== "" ? (
            <span className="absolute top-3 right-3 z-10 text-[10px] font-black px-2.5 py-0.5 bg-[#8B263E] text-white rounded-full shadow-xs">
              {product.tag.trim()}
            </span>
          ) : (
            <span className="absolute top-3 right-3 z-10 text-[10px] font-bold px-2 py-0.5 bg-white/90 dark:bg-[#15221B]/90 backdrop-blur text-[#8B263E] dark:text-[#D8B65C] rounded-full border border-[#8B263E]/20 dark:border-[#D8B65C]/20 shadow-xs">
              {primaryAyar > 0 ? `${primaryAyar.toLocaleString("fa-IR")} عیار` : "۱۸ عیار"}
            </span>
          )}

          {/* نشانگر وزن */}
          {weightLabel && (
            <span className="absolute top-3 left-3 z-10 text-[10px] font-mono font-bold px-2 py-0.5 bg-white/90 dark:bg-[#15221B]/90 backdrop-blur text-[#3A5A46] dark:text-zinc-300 rounded-full border border-[#1C3324]/10 dark:border-white/10 shadow-xs">
              {weightLabel}
            </span>
          )}

          {productImage ? (
            <img
              src={productImage}
              alt={productName}
              loading="lazy"
              className="w-full h-full object-cover p-3 group-hover:scale-106 transition-transform duration-500 ease-out"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-[#1C3324]/30 dark:text-zinc-500">
              <ImageIcon size={36} />
              <span className="text-[11px] font-medium text-[#3A5A46] dark:text-zinc-400">
                {productColor ? getColorName(productColor) : "پرنا زر"}
              </span>
            </div>
          )}
        </div>

        {/* عنوان و توضیحات اثر */}
        <h3 className="text-sm sm:text-base font-extrabold text-[#1C3324] dark:text-zinc-100 mb-1 line-clamp-1 group-hover:text-[#8B263E] dark:group-hover:text-[#D8B65C] transition-colors">
          {productName}
        </h3>
        <p className="text-xs text-[#3A5A46] dark:text-zinc-400 line-clamp-1 mb-3.5 leading-relaxed">
          {productDescription || "طلای ۱۸ عیار دست‌ساز با شناسنامه اصالت"}
        </p>
      </Link>

      {/* بخش قیمت نقد، آفر ۳ قسط و دکمه مشاهده */}
      <div className="pt-3 border-t border-[#1C3324]/5 dark:border-white/5 space-y-2.5">
        
        {/* قیمت نقدی */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#3A5A46] dark:text-zinc-400 font-medium">قیمت روز:</span>
          <span className="text-sm sm:text-[15px] font-black text-[#1C3324] dark:text-white font-mono">
            {productPrice !== null
              ? `${formatPrice(productPrice)} تومان`
              : isLoadingPrices 
              ? "در حال محاسبه..." 
              : goldPriceError 
              ? "نرخ طلا در دسترس نیست" 
              : "قیمت نامشخص"}
          </span>
        </div>

        {/* برچسب آفر خرید در ۳ قسط طلایی با قیمت روز */}
        {installmentAmount !== null && (
          <div className="bg-[#FAF9F6] dark:bg-[#101813] px-2.5 py-1.5 rounded-xl border border-[#D8B65C]/35 flex flex-col gap-0.5 text-[10.5px]">
            <div className="flex items-center justify-between font-bold text-[#8B263E] dark:text-[#D8B65C]">
              <span className="flex items-center gap-1">
                <BadgePercent size={13} />
                <span>۳ قسط طلایی با قیمت روز:</span>
              </span>
              <span className="font-mono font-black">
                قسط اول: {formatPrice(installmentAmount)} ت
              </span>
            </div>
            <span className="text-[9.5px] text-[#3A5A46] dark:text-zinc-400">
              اقساط بعدی معادل ۱/۳ وزن به نرخ روز طلا
            </span>
          </div>
        )}

        {/* دکمه مشاهده و خرید */}
        <Link
          href={`/products/${product.id}`}
          className="w-full py-2.5 px-3 rounded-xl bg-[#1C3324] dark:bg-[#D8B65C] text-white dark:text-[#101813] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#8B263E] dark:hover:bg-[#E6CA7A] transition-colors shadow-xs"
        >
          <span>مشاهده و سفارش</span>
          <ArrowLeft size={13} />
        </Link>
      </div>

    </article>
  );
}