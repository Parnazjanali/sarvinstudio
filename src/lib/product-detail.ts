import pb from "@/lib/pocketbase";
import { roundPrice } from "@/lib/format";

export function formatProductPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || !Number.isFinite(price) || price <= 0) {
    return "تماس بگیرید";
  }
  
  return `${roundPrice(price).toLocaleString("fa-IR")} تومان`;
}

export type ProductColorType = "زرد" | "سفید" | "رزگلد" | "دو رنگ" | string;

export type ProductVariantType = {
  id: string;
  collectionId?: string;
  collectionName?: string;
  product: string;
  weight: number;
  stock: number;
  sku: string;
  is_default: boolean;
  created?: string;
  updated?: string;
};

export type ProductType = {
  id: string;
  title: string;
  description: string;
  colour: ProductColorType;
  short_detail: string;
  images: string[];
  isactive: boolean;
  stock: number | null;
  sku: string;
  weight: number | null;
  karat: number | null;
  price: number | null;
  wage_percent: number | null;
  profit_percent: number | null;
  tax_percent: number | null;
  lead_time_days: number | null; // فیلد روزهای زمان ساخت
  category: string | null; // فیلد دسته‌بندی (ریلیشن پاکت‌بیس)
  variants: ProductVariantType[];
  created: string;
  updated: string;
};

export type PriceInfo = {
  raw: number;
  wage: number;
  profit: number;
  tax: number;
  total: number;
  baseGramPrice: number;
};

type GoldRateRecord = {
  id: string;
  symbol?: string;
  name?: string;
  price?: number | string | null;
  change_percent?: number | string | null;
  unit?: string;
  updated?: string;
};

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * تبدیل و یکپارچه‌سازی رنگ به مقادیر: "زرد" | "سفید" | "رزگلد" | "دو رنگ"
 */
function normalizeProductColor(value: unknown): ProductColorType {
  const raw = toText(value).trim().toLowerCase();

  if (!raw) return "زرد";

  if (raw === "سفید" || raw.includes("white")) {
    return "سفید";
  }
  if (raw === "رزگلد" || raw === "رز گلد" || raw.includes("rose")) {
    return "رزگلد";
  }
  if (
    raw === "دو رنگ" ||
    raw === "دورنگ" ||
    raw.includes("bicolor") ||
    raw.includes("two-tone") ||
    raw.includes("twotone")
  ) {
    return "دو رنگ";
  }
  if (raw === "زرد" || raw.includes("yellow") || raw.includes("gold")) {
    return "زرد";
  }

  // اگر متن سفارشی دیگری ثبت شده بود عیناً حفظ می‌شود
  return toText(value).trim();
}

function toNumber(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const normalizedValue =
    typeof value === "string"
      ? value
          .replace(/,/g, "")
          .replace(/،/g, "")
          .trim()
      : value;

  const numberValue = Number(normalizedValue);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue;
}

function toPositiveNumber(value: unknown): number {
  const numberValue = toNumber(value);

  if (
    numberValue === null ||
    numberValue < 0
  ) {
    return 0;
  }

  return numberValue;
}

function toBoolean(value: unknown): boolean {
  return value === true;
}

function escapePocketBaseFilterValue(
  value: string,
): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

function normalizeProductVariant(
  record: Record<string, unknown>,
): ProductVariantType {
  return {
    id: toText(record.id),
    collectionId: toText(record.collectionId) || undefined,
    collectionName: toText(record.collectionName) || undefined,
    product: toText(record.product),
    weight: toPositiveNumber(record.weight),
    stock: Math.floor(
      toPositiveNumber(record.stock),
    ),
    sku: toText(record.sku).trim(),
    is_default: toBoolean(record.is_default),
    created: toText(record.created) || undefined,
    updated: toText(record.updated) || undefined,
  };
}

async function getProductVariants(
  productId: string,
): Promise<ProductVariantType[]> {
  try {
    const safeProductId =
      escapePocketBaseFilterValue(productId);

    const records = await pb
      .collection("product_variants")
      .getFullList({
        filter: `product = "${safeProductId}"`,
        sort: "-is_default,weight",
        requestKey: null,
      });

    return records
      .map((record) =>
        normalizeProductVariant(
          record as unknown as Record<
            string,
            unknown
          >,
        ),
      )
      .filter(
        (variant) =>
          variant.id.length > 0 &&
          variant.weight > 0,
      );
  } catch (error) {
    console.error(
      "خطا در دریافت ورییشن‌های محصول از PocketBase:",
      error,
    );

    return [];
  }
}

export async function getProductById(
  id: string,
): Promise<ProductType | null> {
  try {
    const record = await pb
      .collection("products")
      .getOne(id, {
        requestKey: null,
      });

    if (record.isactive === false) {
      return null;
    }

    const imageNames = Array.isArray(record.images)
      ? record.images.filter(
          (image): image is string =>
            typeof image === "string" &&
            image.trim().length > 0,
        )
      : [];

    const imageUrls = imageNames.map((imageName) =>
      pb.files.getURL(record, imageName),
    );

    const variants = await getProductVariants(
      record.id,
    );

    const productWeight = toNumber(
      record.weight,
    );

    const productStock = Math.floor(
      toPositiveNumber(record.stock),
    );

    // خواندن مقدار از فیلد color یا colour و نرمال‌سازی به چهار رنگ استاندارد
    const normalizedColor = normalizeProductColor(
      record.color ?? record.colour,
    );

    const product: ProductType = {
      id: record.id,
      title:
        toText(record.title).trim() ||
        "محصول بدون نام",
      description: toText(
        record.description,
      ),
      short_detail: toText(
        record.short_detail,
      ),
      images: imageUrls,
      isactive: toBoolean(
        record.isactive,
      ),
      stock: productStock,
      sku: toText(record.sku).trim(),
      weight: productWeight,
      karat: toNumber(record.karat),
      price: null,
      wage_percent: toNumber(
        record.wage_percent,
      ),
      profit_percent: toNumber(
        record.profit_percent,
      ),
      tax_percent: toNumber(
        record.tax_percent,
      ),
      colour: normalizedColor,
      lead_time_days: toNumber(record.lead_time_days),
      category: toText(record.category) || null,
      variants,
      created: toText(
        record.created,
      ),
      updated: toText(
        record.updated,
      ),
    };

    return product;
  } catch (error) {
    console.error(
      "خطا در دریافت محصول از PocketBase:",
      error,
    );

    return null;
  }
}

export function getProductTitle(
  product: ProductType | null | undefined,
): string {
  return (
    product?.title?.trim() ||
    "محصول بدون نام"
  );
}

export async function getGoldGramPrice(): Promise<number> {
  try {
    const record =
      await pb
        .collection("gold_rates")
        .getFirstListItem<GoldRateRecord>(
          'symbol="IR_GOLD_18K"',
          {
            requestKey: null,
          },
        );

    const parsedPrice = toNumber(
      record.price,
    );

    if (
      parsedPrice === null ||
      parsedPrice <= 0 ||
      !Number.isFinite(parsedPrice)
    ) {
      return 0;
    }

    return parsedPrice;
  } catch (error: unknown) {
    console.error(
      "خطا در دریافت قیمت طلای ۱۸ عیار از gold_rates:",
      error,
    );

    return 0;
  }
}

export function calcProductPrice(
  product: Pick<
    ProductType,
    | "weight"
    | "karat"
    | "wage_percent"
    | "profit_percent"
    | "tax_percent"
  >,
  goldGramPrice: number,
): PriceInfo | null {
  const weight = product.weight ?? 0;

  if (
    weight <= 0 ||
    !Number.isFinite(weight) ||
    goldGramPrice <= 0 ||
    !Number.isFinite(goldGramPrice)
  ) {
    return null;
  }

  const karat =
    product.karat !== null &&
    product.karat !== undefined &&
    product.karat > 0
      ? product.karat
      : 18;

  const wagePercent =
    product.wage_percent ?? 0;

  const profitPercent =
    product.profit_percent ?? 0;

  const taxPercent =
    product.tax_percent ?? 0;

  const purityFactor =
    karat / 18;

  const raw =
    weight *
    goldGramPrice *
    purityFactor;

  const wage =
    raw *
    (wagePercent / 100);

  const profit =
    (raw + wage) *
    (profitPercent / 100);

  const tax =
    (raw + wage + profit) *
    (taxPercent / 100);

  const total =
    raw +
    wage +
    profit +
    tax;

  return {
    raw,
    wage,
    profit,
    tax,
    total,
    baseGramPrice: goldGramPrice,
  };
}