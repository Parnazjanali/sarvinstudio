import type { RecordModel } from "pocketbase";

import pb from "./pocketbase";

export type ProductColor =
  | "yellow"
  | "white"
  | "rose"
  | "mixed"
  | "زرد"
  | "سفید"
  | "رزگلد"
  | "دو رنگ";

export type ProductVariantLike = {
  id?: string | number | null;
  weight?: number | string | null;
  price?: number | string | null;
  karat?: number | string | null;
  ayar?: number | string | null;

  [key: string]: unknown;
};

export type ProductItem = {
  id: string;

  name?: string | null;
  title?: string | null;
  product_name?: string | null;
  productName?: string | null;
  label?: string | null;

  category?: string | string[] | null;
  category_name?: string | null;
  category_slugs?: string[] | null;
  category_names?: string[] | null;
  collection_slug?: string | null;
  type?: string | null;

  description?: string | null;
  details?: string | null;
  detail?: string | null;
  short_detail?: string | null;
  summary?: string | null;

  price?: number | string | null;
  selling_price?: number | string | null;
  sellingPrice?: number | string | null;

  weight?: number | string | null;
  product_weight?: number | string | null;
  productWeight?: number | string | null;

  karat?: number | string | null;
  ayar?: number | string | null;
  gold_karat?: number | string | null;

  color?: ProductColor | string | null;
  colour?: ProductColor | string | null;
  tag?: string | null;

  image?: string | null;
  photo?: string | null;
  productImage?: string | null;
  thumbnail?: string | null;
  cover?: string | null;

  images?: string | string[] | null;
  photos?: string | string[] | null;
  gallery?: string | string[] | null;

  variants?: ProductVariantLike[] | string | null;
  weights?: ProductVariantLike[] | string | null;
  product_variants?:
    | ProductVariantLike[]
    | string
    | null;

  created?: string | null;
  updated?: string | null;
  createdAt?: string | null;

  collectionId?: string;
  collectionName?: string;

  expand?: Record<string, unknown>;

  [key: string]: unknown;
};

export type PocketBaseProductRecord =
  RecordModel &
    Omit<ProductItem, "id"> & {
      id: string;
    };

function normalizeString(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const result = value.trim();

  return result.length > 0 ? result : null;
}

export function toFiniteNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getFirstValue(
  source: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const key of keys) {
    const value = source[key];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return null;
}

function parseJsonArray(
  value: unknown,
): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return [];
  }

  const normalized = value.trim();

  if (!normalized) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(normalized);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseProductVariants(
  product: ProductItem,
): ProductVariantLike[] {
  const rawVariants =
    product.variants ??
    product.weights ??
    product.product_variants;

  return parseJsonArray(rawVariants).filter(
    (variant): variant is ProductVariantLike =>
      typeof variant === "object" &&
      variant !== null,
  );
}

export function getProductName(
  product: ProductItem,
): string {
  const source = product as Record<string, unknown>;

  const value = getFirstValue(source, [
    "name",
    "title",
    "product_name",
    "productName",
    "label",
  ]);

  return (
    normalizeString(value) ??
    "محصول بدون نام"
  );
}

export function getProductDescription(
  product: ProductItem,
): string {
  const source = product as Record<string, unknown>;

  const value = getFirstValue(source, [
    "short_detail",
    "description",
    "details",
    "detail",
    "summary",
  ]);

  return (
    normalizeString(value) ??
    "توضیحات محصول موجود نیست."
  );
}

function getFirstImageFilename(
  product: ProductItem,
): string | null {
  const source = product as Record<string, unknown>;

  const singleImage = getFirstValue(source, [
    "image",
    "photo",
    "productImage",
    "thumbnail",
    "cover",
  ]);

  const normalizedSingleImage =
    normalizeString(singleImage);

  if (normalizedSingleImage) {
    return normalizedSingleImage;
  }

  const gallery = getFirstValue(source, [
    "images",
    "photos",
    "gallery",
  ]);

  if (Array.isArray(gallery)) {
    for (const image of gallery) {
      const normalizedImage =
        normalizeString(image);

      if (normalizedImage) {
        return normalizedImage;
      }
    }
  }

  if (typeof gallery === "string") {
    const normalizedGallery = gallery.trim();

    if (!normalizedGallery) {
      return null;
    }

    try {
      const parsed: unknown =
        JSON.parse(normalizedGallery);

      if (Array.isArray(parsed)) {
        for (const image of parsed) {
          const normalizedImage =
            normalizeString(image);

          if (normalizedImage) {
            return normalizedImage;
          }
        }
      }

      if (typeof parsed === "string") {
        return normalizeString(parsed);
      }
    } catch {
      return normalizedGallery;
    }
  }

  return null;
}

export function getProductImageUrl(
  product: ProductItem,
): string | null {
  const filename =
    getFirstImageFilename(product);

  if (!filename) {
    return null;
  }

  if (
    filename.startsWith("http://") ||
    filename.startsWith("https://") ||
    filename.startsWith("data:") ||
    filename.startsWith("/")
  ) {
    return filename;
  }

  const record =
    product as PocketBaseProductRecord;

  if (
    !record.id ||
    !record.collectionName
  ) {
    return null;
  }

  try {
    return pb.files.getURL(record, filename);
  } catch {
    return null;
  }
}

export function getProductColor(
  product: ProductItem,
): ProductColor | null {
  const rawColor = getFirstValue(product as Record<string, unknown>, ["color", "colour"]);
  const color = normalizeString(rawColor)?.toLowerCase();

  if (!color) return null;

  if (color === "yellow" || color === "زرد") return "زرد";
  if (color === "white" || color === "سفید") return "سفید";
  if (color === "rose" || color === "رزگلد" || color === "رز گلد") return "رزگلد";
  if (color === "mixed" || color === "دو رنگ" || color === "دورنگ") return "دو رنگ";

  return null;
}

export function calculateDynamicGoldPrice(
  product: {
    weight?: number | string | null;
    karat?: number | string | null;
    wage_percent?: number | string | null;
    profit_percent?: number | string | null;
    tax_percent?: number | string | null;
  },
  goldGramPrice: number = 25658600
): {
  raw: number;
  wage: number;
  profit: number;
  tax: number;
  total: number;
} | null {
  const weight = toFiniteNumber(product.weight) ?? 0;
  if (weight <= 0 || !goldGramPrice || goldGramPrice <= 0) return null;

  const karat = toFiniteNumber(product.karat) || 18;
  const wagePercent = toFiniteNumber(product.wage_percent) || 0;
  const profitPercent = toFiniteNumber(product.profit_percent) ?? 7;
  const taxPercent = toFiniteNumber(product.tax_percent) ?? 9;

  const purityFactor = karat / 18;
  const raw = weight * goldGramPrice * purityFactor;
  const wage = raw * (wagePercent / 100);
  const profit = (raw + wage) * (profitPercent / 100);
  const tax = (wage + profit) * (taxPercent / 100);
  const total = raw + wage + profit + tax;

  return {
    raw: Math.round(raw),
    wage: Math.round(wage),
    profit: Math.round(profit),
    tax: Math.round(tax),
    total: Math.round(total),
  };
}

export function getProductPrice(
  product: ProductItem,
  goldGramPrice?: number
): number | null {
  const variants =
    parseProductVariants(product);

  const primaryVariant = variants[0];

  const variantPrice =
    primaryVariant?.price;

  const source = product as Record<string, unknown>;

  const productPrice = getFirstValue(source, [
    "price",
    "selling_price",
    "sellingPrice",
  ]);

  const directPrice =
    toFiniteNumber(variantPrice) ??
    toFiniteNumber(productPrice);

  if (directPrice !== null && directPrice > 0) {
    return directPrice;
  }

  // اگر قیمت ثابت در دیتابیس نبود، بر اساس وزن و عیار و مظنه لحظه‌ای طلا محاسبه می‌شود
  if (goldGramPrice && goldGramPrice > 0) {
    const calc = calculateDynamicGoldPrice(
      {
        weight: getProductWeight(product),
        karat: getProductKarat(product),
        wage_percent: (source.wage_percent as number) ?? 0,
        profit_percent: (source.profit_percent as number) ?? 7,
        tax_percent: (source.tax_percent as number) ?? 9,
      },
      goldGramPrice
    );

    if (calc && calc.total > 0) {
      return calc.total;
    }
  }

  return null;
}

export function getProductWeight(
  product: ProductItem,
): number {
  const variants =
    parseProductVariants(product);

  const primaryVariant = variants[0];

  const source = product as Record<string, unknown>;

  const productWeight = getFirstValue(source, [
    "weight",
    "product_weight",
    "productWeight",
  ]);

  return (
    toFiniteNumber(primaryVariant?.weight) ??
    toFiniteNumber(productWeight) ??
    0
  );
}

export function getProductKarat(
  product: ProductItem,
): number {
  const variants =
    parseProductVariants(product);

  const primaryVariant = variants[0];

  const source = product as Record<string, unknown>;

  const productKarat = getFirstValue(source, [
    "karat",
    "ayar",
    "gold_karat",
  ]);

  return (
    toFiniteNumber(primaryVariant?.karat) ??
    toFiniteNumber(primaryVariant?.ayar) ??
    toFiniteNumber(productKarat) ??
    18
  );
}

export function getProductCreatedTime(
  product: ProductItem,
): number {
  const source = product as Record<string, unknown>;

  const created = getFirstValue(source, [
    "createdAt",
    "created",
    "updated",
  ]);

  const normalized =
    normalizeString(created);

  if (!normalized) {
    return 0;
  }

  const timestamp =
    new Date(normalized).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

export function formatPrice(
  value: unknown,
): string {
  const price = toFiniteNumber(value);

  if (price === null || price <= 0) {
    return "تماس بگیرید";
  }

  return `${price.toLocaleString(
    "fa-IR",
  )} تومان`;
}

export function getColorName(
  color: ProductColor | null,
): string {
  switch (color) {
    case "yellow":
    case "زرد":
      return "طلای زرد";

    case "white":
    case "سفید":
      return "طلای سفید";

    case "rose":
    case "رزگلد":
      return "رزگلد";

    case "mixed":
    case "دو رنگ":
      return "دو رنگ / ترکیبی";

    default:
      return "رنگ مشخص نشده";
  }
}

export function mapPocketBaseProduct(
  record: PocketBaseProductRecord,
): ProductItem {
  const source = record as Record<string, unknown>;

  const mappedName = getFirstValue(source, [
    "name",
    "title",
    "product_name",
    "productName",
    "label",
  ]);

  const mappedImage = getFirstValue(source, [
    "image",
    "photo",
    "productImage",
    "thumbnail",
    "cover",
  ]);

  const mappedImages = getFirstValue(source, [
    "images",
    "photos",
    "gallery",
  ]);

  const rawCategory = getFirstValue(source, ["category", "category_name", "type"]);
  const rawColor = getFirstValue(source, ["color", "colour"]);

  const expandObj = (source.expand as Record<string, unknown>) || {};
  const expandCats = Array.isArray(expandObj.category)
    ? (expandObj.category as Array<{ id?: string; name?: string; slug?: string }>)
    : [];

  const categorySlugs = expandCats
    .map((c) => (c && typeof c.slug === "string" ? c.slug.toLowerCase().trim() : ""))
    .filter(Boolean);

  const categoryNames = expandCats
    .map((c) => (c && typeof c.name === "string" ? c.name.trim() : ""))
    .filter(Boolean);

  const collectionSlug = typeof source.collection_slug === "string" ? source.collection_slug.trim() : null;

  return {
    ...record,

    id: record.id,

    name: normalizeString(mappedName),
    title: normalizeString(mappedName),

    color: normalizeString(rawColor),
    colour: normalizeString(rawColor),

    collection_slug: collectionSlug,
    category_slugs: categorySlugs.length > 0 ? categorySlugs : null,
    category_names: categoryNames.length > 0 ? categoryNames : null,

    category: Array.isArray(rawCategory) 
      ? rawCategory 
      : normalizeString(rawCategory),

    description: normalizeString(
      getFirstValue(source, [
        "description",
        "details",
        "detail",
        "summary",
      ]),
    ),

    short_detail: normalizeString(
      getFirstValue(source, [
        "short_detail",
        "description",
        "summary",
      ]),
    ),

    image: typeof mappedImage === "string" ? mappedImage : null,

    images: Array.isArray(mappedImages) || typeof mappedImages === "string"
      ? (mappedImages as string | string[])
      : null,

    price: getFirstValue(source, [
      "price",
      "selling_price",
      "sellingPrice",
    ]) as number | string | null,

    weight: getFirstValue(source, [
      "weight",
      "product_weight",
      "productWeight",
    ]) as number | string | null,

    karat: getFirstValue(source, [
      "karat",
      "ayar",
      "gold_karat",
    ]) as number | string | null,

    ayar: getFirstValue(source, [
      "ayar",
      "karat",
      "gold_karat",
    ]) as number | string | null,

    variants: getFirstValue(source, [
      "variants",
      "weights",
      "product_variants",
    ]) as ProductVariantLike[] | string | null,
  };
}