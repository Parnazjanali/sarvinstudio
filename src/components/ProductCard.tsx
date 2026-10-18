import Link from "next/link";
import { ImageIcon } from "lucide-react";
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
  
  // رفع مشکل نمایش عکس در کارت
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
      : "وزن مشخص نشده";

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(28, 51, 36, 0.12)",
        borderRadius: 22,
        padding: 16,
        boxShadow: "0 4px 20px rgba(28, 51, 36, 0.04)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minWidth: 0,
        transition: "all 300ms ease",
      }}
    >
      <Link href={`/products/${product.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        {/* تصویر */}
        <div
          style={{
            height: 180,
            borderRadius: 16,
            background: "linear-gradient(135deg, #F4F6F4, #FFFFFF)",
            border: "1px solid rgba(28, 51, 36, 0.08)",
            marginBottom: 14,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {productImage ? (
            <img
              src={productImage}
              alt={productName}
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <ImageIcon size={42} color="#1C3324" opacity={0.3} />
              <span style={{ fontSize: 12, color: "#3A5A46", fontWeight: 600 }}>
                {productColor ? getColorName(productColor) : "تصویر موجود نیست"}
              </span>
            </div>
          )}
          {typeof product.tag === "string" && product.tag.trim() !== "" && (
            <span
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "rgba(139, 38, 62, 0.1)",
                color: "#8B263E",
                borderRadius: 999,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 800,
                border: "1px solid rgba(139, 38, 62, 0.2)",
              }}
            >
              {product.tag.trim()}
            </span>
          )}
        </div>

        {/* عنوان و توضیحات */}
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px 0", color: "#1C3324", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {productName}
        </h2>
        <p style={{ fontSize: 13, color: "#3A5A46", lineHeight: 1.7, marginBottom: 14, minHeight: 44, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {productDescription}
        </p>
      </Link>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#F4F6F4", borderRadius: 12, fontSize: 12, fontWeight: 700, color: "#3A5A46", marginBottom: 14 }}>
          <span>وزن: {weightLabel}</span>
          <span>عیار: {primaryAyar.toLocaleString("fa-IR")}</span>
        </div>

        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 10, color: "#3A5A46", display: "block", marginBottom: 3 }}>قیمت:</span>
          <span style={{ fontSize: 15, fontWeight: 900, color: "#8B263E" }}>
            {productPrice !== null
              ? formatPrice(productPrice) + " تومان"
              : isLoadingPrices ? "در حال محاسبه..." : goldPriceError ? "نرخ طلا در دسترس نیست" : "قیمت نامشخص"}
          </span>
        </div>

        <Link
          href={`/products/${product.id}`}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "10px 14px", borderRadius: 12, background: "#1C3324", color: "#FFFFFF", textDecoration: "none", fontSize: 13, fontWeight: 800, transition: "background 200ms ease" }}
        >
          مشاهده جزئیات
        </Link>
      </div>
    </div>
  );
}