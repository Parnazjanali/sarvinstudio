"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, PackageCheck } from "lucide-react";
import Link from "next/link";
import pb from "@/lib/pocketbase";
import { useCart } from "@/context/CartContext";

export default function VerifyPaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");

  const hasExecutedRef = useRef(false);

  const orderIdParam = searchParams.get("orderId");
  const statusParam = searchParams.get("status");
  const authority = searchParams.get("Authority");
  const zarinpalStatus = searchParams.get("Status");

  useEffect(() => {
    async function verifyOrder() {
      if (!orderIdParam) {
        setStatus("failed");
        return;
      }

      if (hasExecutedRef.current) return;
      hasExecutedRef.current = true;

      try {
        if (statusParam === "success" || (zarinpalStatus === "OK" && authority)) {
          // ۱. آپدیت وضعیت سفارش در پاکت‌بیس
          await pb.collection("orders").update(
            orderIdParam,
            {
              paymentStatus: "paid",
              status: "processing",
            },
            { requestKey: null }
          );

          // ۲. خالی کردن سبد خرید در State و LocalStorage
          clearCart();
          localStorage.removeItem("cart-items-v2");
          localStorage.removeItem("cart-items-v1");
          localStorage.removeItem("sarvin_gold_cart");
          localStorage.removeItem("parza_gold_cart");
          localStorage.removeItem("checkout_selected_shipping_info");
          localStorage.removeItem("checkout_shipping_information");

          setStatus("success");
          
          // ۳. هدایت خودکار به صفحه سفارش‌ها پس از ۱.۵ ثانیه
          setTimeout(() => {
            router.replace("/account/orders");
          }, 1500);
        } else {
          await pb.collection("orders").update(
            orderIdParam,
            {
              paymentStatus: "cancelled",
              status: "cancelled",
            },
            { requestKey: null }
          );
          setStatus("failed");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("failed");
      }
    }

    verifyOrder();
  }, [orderIdParam, statusParam, authority, zarinpalStatus, router, clearCart]);

  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center bg-[#FAF9F6] px-4 pt-28 pb-16 font-sans text-[#1C3324]">
      <div className="w-full max-w-md rounded-3xl border border-[#1C3324]/15 bg-white p-8 text-center shadow-xs space-y-6">
        <div className="flex justify-center mb-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1C3324] text-white shadow-md">
            <PackageCheck size={26} />
          </div>
        </div>

        {status === "loading" && (
          <div className="space-y-4 py-6">
            <Loader2 size={40} className="animate-spin text-[#8B263E] mx-auto" />
            <h2 className="text-base font-black text-[#1C3324]">در حال بررسی وضعیت پرداخت...</h2>
            <p className="text-xs text-[#3A5A46]">لطفاً تا تایید نهایی تراکنش از شبکه بانکی صبور باشید.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 py-2">
            <CheckCircle2 size={50} className="text-emerald-600 mx-auto" />
            <h2 className="text-lg font-black text-[#1C3324]">پرداخت با موفقیت انجام شد!</h2>
            <p className="text-xs text-[#3A5A46] leading-6">
              سفارش شما در سروین استودیو ثبت شد. در حال انتقال به صفحه سفارش‌های من...
            </p>
            <div className="pt-2">
              <Link
                href="/account/orders"
                className="w-full rounded-2xl bg-[#1C3324] py-3.5 text-xs font-black text-white transition hover:bg-[#8B263E] shadow-sm inline-block text-center"
              >
                ورود به سفارش‌های من
              </Link>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="space-y-4 py-2">
            <XCircle size={50} className="text-red-600 mx-auto" />
            <h2 className="text-lg font-black text-red-700">پرداخت ناموفق یا لغو شد</h2>
            <p className="text-xs text-[#3A5A46] leading-6">
              تراکنش توسط شما لغو گردید یا خطایی در درگاه بانکی رخ داد.
            </p>
            <div className="pt-4 flex flex-col gap-3">
              <Link
                href="/checkout/payment"
                className="w-full rounded-2xl bg-[#1C3324] py-3.5 text-xs font-black text-white transition hover:bg-[#8B263E] shadow-sm inline-block text-center"
              >
                تلاش مجدد پرداخت
              </Link>
              <Link
                href="/account/orders"
                className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] py-3.5 text-xs font-bold text-[#1C3324] transition hover:bg-[#1C3324]/5 inline-block text-center"
              >
                مشاهده سفارش‌ها
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}