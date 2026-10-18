"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";

import {
  Check,
  ShoppingCart,
} from "lucide-react";

import { toast } from "sonner";

import { useCart } from "@/context/CartContext";

type SelectedVariantInput = {
  id?: string | number | null;
  weight?: number | string | null;
  price?: number | string | null;
  karat?: number | string | null;
  ayar?: number | string | null;
  color?: string | null;
  sku?: string | null;
  stock?: number | string | null;
  [key: string]: unknown;
};

type CartProductInput = {
  id: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  short_detail?: string | null;
  summary?: string | null;
  price?: number | string | null;
  weight?: number | string | null;
  karat?: number | string | null;
  ayar?: number | string | null;
  color?: string | null;
  category?: string | null;
  tag?: string | null;
  image?: string | null;
  images?: string[] | string | null;
  collectionId?: string | null;
  collectionName?: string | null;
  variants?: unknown;
  [key: string]: unknown;
};

type AddToCartButtonProps = {
  product: CartProductInput;
  price?: number | string | null;
  selectedVariant?: SelectedVariantInput | null;
  className?: string;
};

function normalizeDigits(value: string): string {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

  return value
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)));
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const normalizedValue = normalizeDigits(value)
    .trim()
    .replace(/[,٬،\s]/g, "");

  if (normalizedValue === "") return null;

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function getProductName(product: CartProductInput): string {
  const name = typeof product.name === "string" ? product.name.trim() : "";
  const title = typeof product.title === "string" ? product.title.trim() : "";
  return name || title || "محصول بدون نام";
}

function createCartItemId(productId: string, selectedVariantId: string | null): string {
  const normalizedProductId = String(productId).trim();
  return selectedVariantId ? `${normalizedProductId}::variant::${selectedVariantId}` : `${normalizedProductId}::base`;
}

export default function AddToCartButton({
  product,
  price,
  selectedVariant = null,
  className = "",
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const productName = getProductName(product);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleAddToCart = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isAdded) return;

    const selectedWeight =
      toFiniteNumber(selectedVariant?.weight) ?? toFiniteNumber(product.weight);

    const selectedPrice =
      toFiniteNumber(price) ??
      toFiniteNumber(selectedVariant?.price) ??
      toFiniteNumber(product.price);

    const selectedKarat =
      toFiniteNumber(selectedVariant?.karat) ??
      toFiniteNumber(selectedVariant?.ayar) ??
      toFiniteNumber(product.karat) ??
      toFiniteNumber(product.ayar) ??
      18;

    const selectedVariantId =
      selectedVariant?.id !== null &&
      selectedVariant?.id !== undefined &&
      String(selectedVariant.id).trim() !== ""
        ? String(selectedVariant.id).trim()
        : null;

    if (selectedPrice === null || selectedPrice < 0) {
      toast.error("قیمت محصول معتبر نیست.");
      return;
    }

    if (selectedWeight === null || selectedWeight <= 0) {
      toast.error("وزن محصول معتبر نیست.");
      return;
    }

    const cartItemId = createCartItemId(product.id, selectedVariantId);

    const normalizedProduct = {
      ...product,
      id: String(product.id),
      name: productName,
      title: productName,
      price: selectedPrice,
      weight: selectedWeight,
      selectedWeight,
      karat: selectedKarat,
      ayar: selectedKarat,
      selectedVariantId,
      selectedWeightType: selectedVariantId ? "variant" : "base",
      color:
        typeof selectedVariant?.color === "string" && selectedVariant.color.trim() !== ""
          ? selectedVariant.color.trim()
          : typeof product.color === "string" && product.color.trim() !== ""
            ? product.color.trim()
            : null,
      collectionId: product.collectionId ?? null,
      collectionName: product.collectionName ?? null,
      image: typeof product.image === "string" && product.image.trim() !== "" ? product.image : null,
      images: product.images ?? null,
      sku: "",
      stock: null,
      variants: [],
    };

    addItem({
      id: cartItemId,
      product: normalizedProduct,
      quantity: 1,
    });

    setIsAdded(true);

    toast.success("محصول به سبد خرید اضافه شد", {
      description: `${productName} — ${selectedWeight.toLocaleString("fa-IR")} گرم`,
      duration: 2500,
    });

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div
      className={`relative z-10 flex w-full justify-center ${className}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={isAdded}
        className={[
          "inline-flex min-w-[210px] items-center justify-center gap-2",
          "rounded-2xl border px-6 py-3.5 text-center text-sm font-extrabold cursor-pointer",
          "transition-all duration-300 ease-out shadow-xs",
          "focus:outline-none focus:ring-4",
          "disabled:cursor-default",
          isAdded
            ? [
                "scale-[1.02] border-[#8B263E] bg-[#8B263E]",
                "text-white shadow-md shadow-[#8B263E]/25",
                "focus:ring-[#8B263E]/25",
              ].join(" ")
            : [
                "border-[#1C3324] bg-white text-[#1C3324]",
                "hover:-translate-y-0.5 hover:bg-[#1C3324] hover:text-white",
                "active:translate-y-0 active:scale-[0.98]",
                "focus:ring-[#1C3324]/20",
              ].join(" "),
        ].join(" ")}
        aria-label={
          isAdded
            ? `${productName} به سبد خرید اضافه شد`
            : `افزودن ${productName} به سبد خرید`
        }
        aria-live="polite"
      >
        <span
          className={[
            "flex items-center justify-center",
            "transition-all duration-300 ease-out",
            isAdded ? "scale-110 rotate-0" : "scale-100 -rotate-6",
          ].join(" ")}
        >
          {isAdded ? (
            <Check className="h-[19px] w-[19px] stroke-[3]" />
          ) : (
            <ShoppingCart className="h-[18px] w-[18px]" />
          )}
        </span>

        <span className="min-w-[132px]">
          {isAdded ? "به سبد اضافه شد" : "افزودن به سبد خرید"}
        </span>
      </button>
    </div>
  );
}