"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Lock,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Wallet,
  Loader2,
  Tag,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import { useCart } from "@/context/CartContext";
import { roundPrice } from "@/lib/format";

const checkoutSteps = [
  { id: 1, title: "بررسی سبد خرید", icon: ShoppingBag },
  { id: 2, title: "اطلاعات ارسال", icon: MapPin },
  { id: 3, title: "نحوه پرداخت", icon: CreditCard },
  { id: 4, title: "پایان خرید", icon: PackageCheck },
];

type ShippingInfo = {
  id?: string;
  fullName: string;
  phone: string;
  province: string;
  city: string;
  postalCode: string;
  address: string;
};

type CartItem = {
  id?: string;
  productTitle: string;
  weight?: number;
  colour?: string;
  goldPricePerGram: number;
  totalPrice: number;
  isInstallment?: boolean;
  installmentNumber?: number;
  installmentTotalCount?: number;
};

export default function PaymentPage() {
  const router = useRouter();
  const { items: cartContextItems, totalPrice: cartContextTotal } = useCart();

  const [paymentMethod, setPaymentMethod] = useState<"balepay" | "zarinpal">("zarinpal");
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountRecordId, setDiscountRecordId] = useState<string | null>(null);

  useEffect(() => {
    try {
      // ۱. بارگذاری اطلاعات ارسال
      const possibleKeys = [
        "checkout_selected_shipping_info",
        "checkout_shipping_information",
        `checkout_shipping_information_${pb.authStore.record?.id}`,
      ];

      let foundInfo: ShippingInfo | null = null;
      for (const key of possibleKeys) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as ShippingInfo;
          if (parsed && parsed.fullName && parsed.address) {
            foundInfo = parsed;
            break;
          }
        }
      }

      if (foundInfo) {
        setShippingInfo(foundInfo);
      } else {
        const user = pb.authStore.record;
        if (user) {
          setShippingInfo({
            fullName: user.name || "کاربر گرامی",
            phone: user.phone || "09120000000",
            province: "تهران",
            city: "تهران",
            postalCode: "1234567890",
            address: user.address || "ثبت نشده در پروفایل",
          });
        }
      }

      // ۲. نگاشت دقیق و صحیح قیمت‌ها از CartContext
      if (cartContextItems && cartContextItems.length > 0) {
        const formattedItems: CartItem[] = cartContextItems.map((cartItem: any) => {
          const prod = cartItem.product || {};
          const quantity = Math.max(1, Number(cartItem.quantity) || 1);

          // قیمت هر گرم طلای زنده ثبت‌شده روی محصول
          const goldPrice = Number(
            prod.goldPricePerGram || 
            prod.goldPrice || 
            prod.currentGoldPrice || 
            0
          );

          // قیمت نهایی هر آیتم شامل اجرت، سود و مالیات (نه فقط قیمت طلای خام!)
          const unitFinalPrice = Number(cartItem.price ?? prod.price ?? 0);
          const itemTotal = roundPrice(unitFinalPrice * quantity);

          // بررسی خرید اقساطی
          const isInstallment = Boolean(prod.isInstallment || cartItem.isInstallment);
          const installmentNumber = prod.installmentNumber || cartItem.installmentNumber || (isInstallment ? 1 : undefined);
          const installmentTotalCount = prod.installmentTotalCount || cartItem.installmentTotalCount || (isInstallment ? 3 : undefined);

          return {
            productTitle: prod.name || prod.title || "طلا و جواهر پرنا زر",
            weight: Number(prod.weight) || 0,
            colour: prod.colour || prod.color || "زرد",
            goldPricePerGram: goldPrice,
            totalPrice: itemTotal, // مبلغ پرداختی کامل و همخوان با درگاه
            isInstallment,
            installmentNumber,
            installmentTotalCount,
          };
        });

        setCartItems(formattedItems);

        // جمع کل مبلغ سبد
        const calculatedTotal = formattedItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
        setCartTotal(cartContextTotal > 0 ? roundPrice(cartContextTotal) : calculatedTotal);
      }
    } catch (e) {
      console.error("Failed to load checkout details:", e);
    }
  }, [cartContextItems, cartContextTotal]);

  const finalAmount = discountApplied
    ? roundPrice(cartTotal * (1 - discountPercent / 100))
    : cartTotal;

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      toast.error("لطفاً کد تخفیف را وارد کنید.");
      return;
    }

    try {
      const records = await pb.collection("discounts").getList(1, 1, {
        filter: `code = "${discountCode.trim()}" && isActive = true`,
        requestKey: null,
      });

      if (records.items.length > 0) {
        const coupon = records.items[0];
        const percent = Number(coupon.discountPercent) || 0;
        
        setDiscountPercent(percent);
        setDiscountRecordId(coupon.id);
        setDiscountApplied(true);
        toast.success(`کد تخفیف ${percent} درصدی با موفقیت اعمال شد.`);
      } else {
        toast.error("کد تخفیف معتبر نیست یا منقضی شده است.");
      }
    } catch (error) {
      console.error("Discount check error:", error);
      toast.error("بررسی کد تخفیف با خطا مواجه شد.");
    }
  };

  const handlePayment = async () => {
    if (!pb.authStore.isValid || !pb.authStore.model) {
      toast.error("جلسه کاربری شما منقضی شده است. لطفاً دوباره وارد شوید.");
      router.replace("/login");
      return;
    }

    if (!shippingInfo) {
      toast.error("اطلاعات ارسال یافت نشد.");
      return;
    }

    setIsProcessing(true);

    try {
      const userId = pb.authStore.model.id;
      const orderNumber = `SRV-${Math.floor(100000 + Math.random() * 900000)}`;
      const sanitizedAmount = roundPrice(finalAmount > 0 ? finalAmount : 100000);

      // ثبت سفارش با فیلد JSON اقلام کاملاً همخوان با مبلغ کل
      const orderData: Record<string, any> = {
        user: userId,
        orderNumber,
        status: "pending",
        paymentStatus: "unpaid",
        totalAmount: sanitizedAmount,
        shippingFullName: shippingInfo.fullName || "",
        shippingPhone: shippingInfo.phone || "",
        shippingProvince: shippingInfo.province || "",
        shippingPostalCode: shippingInfo.postalCode || "",
        shippingMethod: "پستی پیشتاز بیمه‌شده پرنا زر",
        shippingCost: "رایگان",
        items: cartItems, // اکنون totalPrice هر آیتم همان مبلغ واقعی فاکتور است
      };

      if (shippingInfo.id && shippingInfo.id.length === 15) {
        orderData.address = shippingInfo.id;
      }

      if (discountApplied && discountRecordId) {
        orderData.discount = discountRecordId;
      }

      const createdOrder = await pb.collection("orders").create(orderData);

      if (paymentMethod === "zarinpal") {
        const response = await fetch("/api/payment/zarinpal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: sanitizedAmount,
            callbackUrl: `${window.location.origin}/checkout/verify?orderId=${createdOrder.id}`,
            description: `خرید طلا و جواهرات از پرنا زر - فاکتور ${orderNumber}`,
            mobile: shippingInfo.phone,
            email: pb.authStore.model.email || "",
          }),
        });

        const data = await response.json();

        if (data && data.data && data.data.code === 100) {
          const authority = data.data.authority;
          window.location.href = `https://sandbox.zarinpal.com/pg/StartPay/${authority}`;
          return;
        } else {
          throw new Error(data.errors?.message || "خطا در اتصال به درگاه تستی زرین‌پال");
        }
      } else {
        setTimeout(() => {
          setIsProcessing(false);
          router.push(`/checkout/result?orderId=${createdOrder.id}&status=success`);
        }, 1500);
      }
    } catch (error: unknown) {
      console.error("Payment initiation error details:", error);
      const pbError = error as { message?: string; response?: { message?: string; data?: any } };
      const serverMsg = pbError?.response?.data 
        ? JSON.stringify(pbError.response.data) 
        : (pbError?.response?.message || pbError?.message);

      toast.error(`خطا در ثبت سفارش: ${serverMsg || "مشکل ناشناخته"}`);
      setIsProcessing(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen pb-24 pt-36 lg:pt-42 font-sans bg-[#FAF9F6] text-[#1C3324]"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* مراحل خرید */}
        <section
          className="mb-8 overflow-hidden rounded-3xl border border-[#1C3324]/15 p-4 sm:p-6 shadow-xs bg-white"
          aria-label="مراحل فرآیند خرید"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-extrabold sm:text-lg text-[#1C3324]">
                تکمیل فرآیند خرید
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-[#3A5A46]">
                مرحله سوم: درگاه و شیوه پرداخت سفارش در پرنا زر.
              </p>
            </div>

            <span className="rounded-full px-3 py-1 text-xs font-bold border bg-[#FAF9F6] text-[#1C3324] border-[#1C3324]/20">
              مرحله ۳ از ۴
            </span>
          </div>

          <div className="relative">
            <div className="absolute right-[12%] left-[12%] top-5 hidden h-0.5 sm:block bg-[#1C3324]/15" />
            <div className="relative grid grid-cols-4 gap-2">
              {checkoutSteps.map((step) => {
                const Icon = step.icon;
                const isCompleted = step.id < 3;
                const isActive = step.id === 3;

                return (
                  <div key={step.id} className="flex min-w-0 flex-col items-center text-center">
                    <div
                      className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 sm:h-11 sm:w-11 transition-all ${
                        isCompleted || isActive
                          ? "bg-[#1C3324] border-[#1C3324] text-white shadow-md"
                          : "bg-white border-[#1C3324]/20 text-[#3A5A46]"
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 size={18} /> : <Icon size={17} />}
                    </div>
                    <span
                      className={`mt-2 max-w-20 text-[10px] leading-4 font-bold sm:max-w-none sm:text-xs ${
                        isActive ? "text-[#1C3324]" : "text-[#3A5A46]"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <section className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 sm:p-7 lg:col-span-2 shadow-xs space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FAF9F6] border border-[#1C3324]/15 text-[#1C3324]">
                <CreditCard size={21} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-[#1C3324]">
                  انتخاب درگاه پرداخت الکترونیک
                </h2>
                <p className="mt-1 text-xs text-[#3A5A46]">
                  درگاه امن بانکی پرنا زر.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label
                onClick={() => setPaymentMethod("zarinpal")}
                className={`relative flex cursor-pointer items-center justify-between rounded-2xl border p-4 sm:p-5 transition-all ${
                  paymentMethod === "zarinpal"
                    ? "border-[#1C3324] bg-[#FAF9F6] ring-1 ring-[#1C3324]"
                    : "border-[#1C3324]/15 bg-white hover:border-[#1C3324]/40"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${
                      paymentMethod === "zarinpal" ? "border-[#1C3324] bg-[#1C3324]" : "border-[#1C3324]/30 bg-white"
                    }`}
                  >
                    {paymentMethod === "zarinpal" && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm sm:text-base text-[#1C3324]">
                        درگاه تستی زرین‌پال (Sandbox)
                      </span>
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                        آزمایشی
                      </span>
                    </div>
                    <span className="text-xs text-[#3A5A46] mt-1">
                      اتصال به درگاه تستی برای بررسی روند خرید
                    </span>
                  </div>
                </div>
                <Award className="h-6 w-6 text-[#8B263E] shrink-0" />
              </label>

              <label
                onClick={() => setPaymentMethod("balepay")}
                className={`relative flex cursor-pointer items-center justify-between rounded-2xl border p-4 sm:p-5 transition-all ${
                  paymentMethod === "balepay"
                    ? "border-[#1C3324] bg-[#FAF9F6] ring-1 ring-[#1C3324]"
                    : "border-[#1C3324]/15 bg-white hover:border-[#1C3324]/40"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${
                      paymentMethod === "balepay" ? "border-[#1C3324] bg-[#1C3324]" : "border-[#1C3324]/30 bg-white"
                    }`}
                  >
                    {paymentMethod === "balepay" && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm sm:text-base text-[#1C3324]">
                        درگاه بله‌پی (شبیه‌ساز مستقیم)
                      </span>
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                        آنی
                      </span>
                    </div>
                    <span className="text-xs text-[#3A5A46] mt-1">
                      اتصال شبیه‌سازی‌شده مستقیم به اتمام خرید
                    </span>
                  </div>
                </div>
                <Wallet className="h-6 w-6 text-[#8B263E] shrink-0" />
              </label>
            </div>

            {/* بخش کد تخفیف */}
            <div className="rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1C3324]">
                <Tag size={16} className="text-[#8B263E]" />
                <span>کد تخفیف یا کارت هدیه دارید؟</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  placeholder="مثلاً SARV10"
                  disabled={discountApplied}
                  className="flex-1 rounded-xl border border-[#1C3324]/15 bg-white px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-[#8B263E] font-medium"
                />
                <button
                  type="button"
                  onClick={handleApplyDiscount}
                  disabled={discountApplied}
                  className="rounded-xl bg-[#1C3324] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#8B263E] cursor-pointer disabled:opacity-50"
                >
                  {discountApplied ? "اعمال شد" : "اعمال کد"}
                </button>
              </div>
              {discountApplied && (
                <p className="text-[11px] text-emerald-600 font-bold">
                  ✓ تخفیف {discountPercent} درصدی روی فاکتور شما اعمال گردید.
                </p>
              )}
            </div>

            {/* دکمه‌های ناوبری پایین صفحه */}
            <div className="flex flex-col-reverse gap-3 border-t border-[#1C3324]/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/checkout/shipping"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-5 py-3 text-xs font-bold text-[#1C3324] transition hover:bg-[#1C3324]/5"
              >
                <ArrowRight size={16} />
                بازگشت به نشانی ارسال
              </Link>

              <button
                type="button"
                onClick={handlePayment}
                disabled={isProcessing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1C3324] px-7 py-3 text-xs font-bold text-white transition hover:bg-[#8B263E] disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    در حال اتصال به درگاه...
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    پرداخت نهایی و ثبت سفارش ({new Intl.NumberFormat("fa-IR").format(finalAmount)} تومان)
                  </>
                )}
              </button>
            </div>
          </section>

          <aside className="space-y-4">
            {shippingInfo && (
              <section className="rounded-3xl border border-[#1C3324]/15 p-5 shadow-xs bg-white">
                <h3 className="font-extrabold text-sm mb-3 pb-2 border-b border-[#1C3324]/10 text-[#1C3324]">
                  خلاصه نشانی تحویل
                </h3>
                <div className="text-xs space-y-2 text-[#3A5A46]">
                  <p><strong className="text-[#1C3324]">تحویل‌گیرنده:</strong> {shippingInfo.fullName}</p>
                  <p><strong className="text-[#1C3324]">شماره تماس:</strong> {shippingInfo.phone}</p>
                  <p className="leading-5">
                    <strong className="text-[#1C3324]">مقصد:</strong> {shippingInfo.province}، {shippingInfo.city}، {shippingInfo.address}
                  </p>
                  <p><strong className="text-[#1C3324]">کد پستی:</strong> {shippingInfo.postalCode}</p>
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-[#1C3324]/15 p-5 shadow-xs bg-white">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF9F6] border border-[#1C3324]/15 text-[#8B263E]">
                  <ShieldCheck size={19} />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-[#1C3324]">
                    ضمانت اصالت و بازگشت
                  </h2>
                  <p className="mt-2 text-xs leading-6 text-[#3A5A46]">
                    تمام محصولات با فاکتور رسمی معتبر پرنا زر و ضمانت بازگشت ارسال می‌گردند.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}