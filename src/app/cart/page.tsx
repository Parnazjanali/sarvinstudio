"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  CreditCard,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useCart, type CartProduct } from "@/context/CartContext";
import { formatNumber, getPbFileUrl } from "@/lib/format";
import { formatPrice } from "@/lib/products";
import pb from "@/lib/pocketbase";

const SHIPPING_STEP_PATH = "/checkout/shipping";
const LOGIN_PATH = "/login";

type CheckoutStep = {
  id: number;
  title: string;
  icon: React.ElementType;
};

const checkoutSteps: CheckoutStep[] = [
  {
    id: 1,
    title: "بررسی سبد خرید",
    icon: ShoppingBag,
  },
  {
    id: 2,
    title: "اطلاعات ارسال",
    icon: MapPin,
  },
  {
    id: 3,
    title: "نحوه پرداخت",
    icon: CreditCard,
  },
  {
    id: 4,
    title: "پایان خرید",
    icon: PackageCheck,
  },
];

const toFiniteNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalizedValue = value
      .trim()
      .replace(/,/g, "")
      .replace(/٬/g, "")
      .replace(/،/g, "");

    if (normalizedValue === "") {
      return 0;
    }

    const parsed = Number(normalizedValue);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const getProductName = (product: CartProduct): string => {
  const candidates = [product.name, product.title];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim() !== "") {
      return candidate.trim();
    }
  }

  return "محصول بدون نام";
};

const isAbsoluteImageUrl = (value: string): boolean => {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/")
  );
};

const getProductImageUrl = (product: CartProduct): string | null => {
  const collectionId = product.collectionId ?? product.collectionName ?? null;

  const imageCandidates: string[] = [];

  if (typeof product.image === "string" && product.image.trim() !== "") {
    imageCandidates.push(product.image.trim());
  }

  if (Array.isArray(product.images)) {
    for (const image of product.images) {
      if (typeof image === "string" && image.trim() !== "") {
        imageCandidates.push(image.trim());
      }
    }
  }

  if (typeof product.images === "string" && product.images.trim() !== "") {
    const rawImages = product.images.trim();

    try {
      const parsed: unknown = JSON.parse(rawImages);

      if (Array.isArray(parsed)) {
        for (const image of parsed) {
          if (typeof image === "string" && image.trim() !== "") {
            imageCandidates.push(image.trim());
          }
        }
      } else {
        imageCandidates.push(rawImages);
      }
    } catch {
      imageCandidates.push(rawImages);
    }
  }

  const imageValue = imageCandidates.find(
    (image): image is string =>
      typeof image === "string" && image.trim().length > 0,
  );

  if (!imageValue) {
    return null;
  }

  if (isAbsoluteImageUrl(imageValue)) {
    return imageValue;
  }

  if (!collectionId || !product.id) {
    return null;
  }

  return getPbFileUrl(collectionId, product.id, imageValue);
};

function CheckoutRoadmap() {
  const activeStep = 1;

  return (
    <section
      className="mb-8 overflow-hidden rounded-3xl border border-[#1C3324]/15 bg-white p-5 sm:p-7 shadow-xs"
      aria-label="مراحل فرآیند خرید"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black sm:text-lg text-[#1C3324]">
            مراحل تکمیل خرید
          </h2>

          <p className="mt-1 text-xs sm:text-sm text-[#3A5A46]">
            مرحله اول: محصولات سبد خرید خود را بررسی کنید.
          </p>
        </div>

        <span className="rounded-full bg-[#1C3324]/5 px-3.5 py-1 text-xs font-bold text-[#8B263E]">
          مرحله {activeStep} از {checkoutSteps.length}
        </span>
      </div>

      <div className="relative">
        <div className="absolute right-[12%] left-[12%] top-5 hidden h-0.5 bg-[#1C3324]/15 sm:block" />

        <div className="relative grid grid-cols-4 gap-2">
          {checkoutSteps.map((step) => {
            const Icon = step.icon;
            const isActive = step.id === activeStep;
            const isCompleted = step.id < activeStep;

            return (
              <div
                key={step.id}
                className="flex min-w-0 flex-col items-center text-center"
              >
                <div
                  className={[
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition sm:h-11 sm:w-11",
                    isActive || isCompleted
                      ? "bg-[#1C3324] border-[#1C3324] text-white shadow-md"
                      : "bg-white border-[#1C3324]/20 text-[#3A5A46]",
                  ].join(" ")}
                >
                  {isCompleted ? <Check size={18} /> : <Icon size={17} />}
                </div>

                <span
                  className={[
                    "mt-2 max-w-20 text-[10px] leading-4 sm:max-w-none sm:text-xs font-bold",
                    isActive ? "text-[#8B263E]" : "text-[#3A5A46]",
                  ].join(" ")}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function CartPage() {
  const router = useRouter();

  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
  } = useCart();

  const handleContinueCheckout = () => {
    const isAuthenticated =
      pb.authStore.isValid && Boolean(pb.authStore.record);

    if (!isAuthenticated) {
      toast.info("برای ادامه خرید، ابتدا وارد حساب کاربری خود شوید.", {
        duration: 3500,
      });

      const loginUrl = `${LOGIN_PATH}?next=${encodeURIComponent(
        SHIPPING_STEP_PATH,
      )}`;

      router.push(loginUrl);

      return;
    }

    router.push(SHIPPING_STEP_PATH);
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-32 lg:pt-40 sm:px-6">
        <CheckoutRoadmap />

        <div className="flex flex-col items-center py-16 text-center sm:py-24">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#1C3324]/5 text-[#8B263E]">
            <ShoppingBag size={40} />
          </div>

          <h1 className="text-2xl font-black text-[#1C3324]">
            سبد خرید شما خالی است
          </h1>

          <p className="mt-3 text-sm text-[#3A5A46]">
            هنوز محصولی به سبد خرید اضافه نکرده‌اید.
          </p>

          <Link
            href="/products"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#1C3324] px-6 py-3.5 text-xs font-black text-white shadow-sm transition hover:bg-[#8B263E]"
          >
            <ShoppingBag size={16} />
            مشاهده محصولات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-32 lg:pt-40 sm:px-6">
      <CheckoutRoadmap />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1C3324]">
            سبد خرید
          </h1>

          <p className="mt-1 text-sm text-[#3A5A46]">
            {formatNumber(totalItems)} کالا در سبد خرید شما قرار دارد.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            clearCart();

            toast.success("سبد خرید خالی شد", {
              duration: 3000,
            });
          }}
          className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100 cursor-pointer"
        >
          <Trash2 size={14} />
          خالی کردن سبد
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {items.map((item) => {
            const { product, quantity } = item;

            const productName = getProductName(product);
            const imageUrl = getProductImageUrl(product);
            const ayar = toFiniteNumber(product.ayar ?? product.karat);
            const weight = toFiniteNumber(product.weight);
            const price = toFiniteNumber(product.price);

            return (
              <article
                key={item.id}
                className="flex flex-col gap-4 rounded-2xl border border-[#1C3324]/15 bg-white p-4 sm:flex-row sm:items-center shadow-xs"
              >
                <Link
                  href={`/products/${product.id}`}
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[#1C3324]/10 bg-[#FAF9F6]"
                  aria-label={`مشاهده ${productName}`}
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={productName}
                      className="h-full w-full object-cover transition duration-300 hover:scale-105"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#3A5A46]">
                      <ShoppingBag size={28} />
                    </div>
                  )}
                </Link>

                <div className="flex flex-1 flex-col gap-2">
                  <Link
                    href={`/products/${product.id}`}
                    className="font-black text-[#1C3324] transition hover:text-[#8B263E]"
                  >
                    {productName}
                  </Link>

                  <p className="text-xs text-[#3A5A46]">
                    {ayar > 0 && <span>عیار {formatNumber(ayar)}</span>}
                    {ayar > 0 && weight > 0 && <span> · </span>}
                    {weight > 0 && <span>{formatNumber(weight)} گرم</span>}
                    {ayar <= 0 && weight <= 0 && <span>جزئیات محصول ثبت نشده است</span>}
                  </p>

                  <p className="text-sm font-black text-[#8B263E]">
                    {formatPrice(price)}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="flex items-center gap-1 rounded-2xl border border-[#1C3324]/15 p-1 bg-[#FAF9F6]">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-[#1C3324] transition hover:bg-[#1C3324]/10 cursor-pointer"
                      aria-label={`افزایش تعداد ${productName}`}
                    >
                      <Plus size={14} />
                    </button>

                    <span className="min-w-8 text-center text-xs font-bold text-[#1C3324]">
                      {formatNumber(quantity)}
                    </span>

                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-[#1C3324] transition hover:bg-[#1C3324]/10 cursor-pointer"
                      aria-label={`کاهش تعداد ${productName}`}
                    >
                      <Minus size={14} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      removeItem(item.id);
                      toast.success("از سبد خرید حذف شد", {
                        duration: 3000,
                      });
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-red-600 transition hover:bg-red-50 cursor-pointer"
                    aria-label={`حذف ${productName} از سبد خرید`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="h-fit rounded-3xl border border-[#1C3324]/15 bg-white p-6 lg:sticky lg:top-28 shadow-xs space-y-4">
          <h2 className="text-base font-black text-[#1C3324]">
            خلاصه سفارش
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#3A5A46]">تعداد اقلام</span>
              <span className="font-bold text-[#1C3324]">{formatNumber(totalItems)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#3A5A46]">جمع سبد خرید</span>
              <span className="font-bold text-[#1C3324]">{formatPrice(totalPrice)}</span>
            </div>

            <div className="border-t border-[#1C3324]/10 pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-[#1C3324]">مبلغ قابل پرداخت</span>
                <span className="text-base font-black text-[#8B263E]">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleContinueCheckout}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1C3324] px-5 py-3.5 text-xs font-black text-white shadow-sm transition hover:bg-[#8B263E] cursor-pointer"
          >
            ادامه فرآیند خرید
            <ChevronLeft size={16} />
          </button>

          <p className="text-center text-[11px] text-[#3A5A46]">
            قیمت‌ها به تومان و بر اساس ارزش روز طلا محاسبه می‌شوند.
          </p>
        </aside>
      </div>
    </div>
  );
}