"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";

import { roundPrice } from "@/lib/format";

export type CartProduct = {
  id: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  short_detail?: string | null;
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
  selectedVariantId?: string | null;
  selectedWeight?: number | string | null;
  isInstallment?: boolean;
  installmentNumber?: number;
  variants?: unknown;
  [key: string]: unknown;
};

export type CartItem = {
  id: string;
  product: CartProduct;
  quantity: number;
  price?: number | string | null;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "cart-items-v2";

export function createCartItemId(
  productId: string,
  variantId?: string | null,
  isInstallment?: boolean,
): string {
  const normalizedProductId = String(productId).trim();
  const normalizedVariantId = typeof variantId === "string" ? variantId.trim() : "";
  const installmentTag = isInstallment ? "::installment" : "";

  if (normalizedVariantId) {
    return `${normalizedProductId}::variant::${normalizedVariantId}${installmentTag}`;
  }

  return `${normalizedProductId}::base${installmentTag}`;
}

function toFiniteNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const normalized = value.trim().replace(/,/g, "").replace(/٬/g, "").replace(/،/g, "");
    if (normalized === "") return 0;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getVariantIdFromProduct(product: CartProduct): string | null {
  const directVariantId = typeof product.selectedVariantId === "string" ? product.selectedVariantId.trim() : "";
  if (directVariantId) return directVariantId;

  const possibleVariantId = product.variantId ?? product.selected_variant_id ?? product.selectedVariant;
  if (typeof possibleVariantId === "string") return possibleVariantId.trim() || null;
  return null;
}

function getCartItemId(item: CartItem, product: CartProduct): string {
  const variantId = getVariantIdFromProduct(product);
  const isInstallment = Boolean(product.isInstallment || (item as any).isInstallment);
  return createCartItemId(product.id, variantId, isInstallment);
}

function normalizeProduct(product: CartProduct, fallbackPrice?: number | string | null): CartProduct {
  const resolvedName =
    typeof product.name === "string" && product.name.trim() !== ""
      ? product.name.trim()
      : typeof product.title === "string" && product.title.trim() !== ""
        ? product.title.trim()
        : "محصول بدون نام";

  const rawPrice = toFiniteNumber(product.price ?? fallbackPrice);
  const resolvedPrice = rawPrice > 0 ? roundPrice(rawPrice) : 0;
  const resolvedWeight = toFiniteNumber(product.selectedWeight ?? product.weight);
  const resolvedKarat = toFiniteNumber(product.karat);
  const resolvedAyar = toFiniteNumber(product.ayar);
  const selectedVariantId = getVariantIdFromProduct(product);

  return {
    ...product,
    id: String(product.id),
    name: resolvedName,
    title: resolvedName,
    price: resolvedPrice,
    weight: resolvedWeight,
    selectedWeight: resolvedWeight,
    karat: resolvedKarat || resolvedAyar || 18,
    ayar: resolvedAyar || resolvedKarat || 18,
    selectedVariantId,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hasLoadedCart, setHasLoadedCart] = useState(false);
  const isClearingRef = useRef(false);

  // لود سبد خرید در ابتدا
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load cart:", error);
    } finally {
      setHasLoadedCart(true);
    }

    // لیسنر هماهنگی با بقیه صفحات یا تب‌های مرورگر
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        if (!e.newValue || e.newValue === "[]") {
          setItems([]);
        } else {
          try {
            setItems(JSON.parse(e.newValue));
          } catch {}
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // ذخیره سبد خرید
  useEffect(() => {
    if (!hasLoadedCart) return;

    if (isClearingRef.current) {
      isClearingRef.current = false;
      return;
    }

    try {
      if (items.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }
    } catch (error) {
      console.error("Failed to save cart:", error);
    }
  }, [hasLoadedCart, items]);

  const addItem = (item: CartItem) => {
    const normalizedProduct = normalizeProduct(item.product, item.price);
    const normalizedItemId = getCartItemId(item, normalizedProduct);
    const normalizedQuantity = Math.max(1, Math.floor(toFiniteNumber(item.quantity) || 1));

    const normalizedItem: CartItem = {
      id: normalizedItemId,
      quantity: normalizedQuantity,
      price: normalizedProduct.price,
      product: normalizedProduct,
    };

    setItems((currentItems) => {
      const existingIndex = currentItems.findIndex((ci) => ci.id === normalizedItem.id);
      if (existingIndex >= 0) {
        const next = [...currentItems];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + normalizedItem.quantity,
          price: normalizedItem.price,
        };
        return next;
      }
      return [...currentItems, normalizedItem];
    });
  };

  const removeItem = (itemId: string) => {
    setItems((curr) => curr.filter((i) => i.id !== String(itemId)));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    const q = Math.floor(toFiniteNumber(quantity));
    if (q <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((curr) => curr.map((i) => (i.id === String(itemId) ? { ...i, quantity: q } : i)));
  };

  // خالی کردن قطعی، فوری و بدون برگشت
  const clearCart = () => {
    isClearingRef.current = true;
    setItems([]);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem("cart-items-v1");
        // ارسال ایونت به تمام تب‌ها و کامپوننت‌ها
        window.dispatchEvent(new Event("cart_cleared"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totalItems = useMemo(() => {
    return items.reduce((sum, item) => sum + Math.max(1, Math.floor(toFiniteNumber(item.quantity))), 0);
  }, [items]);

  const totalPrice = useMemo(() => {
    const rawSum = items.reduce((sum, item) => {
      const q = Math.max(1, Math.floor(toFiniteNumber(item.quantity)));
      const p = toFiniteNumber(item.price ?? item.product.price);
      return sum + p * q;
    }, 0);
    return roundPrice(rawSum);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}