"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, PackageCheck } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function VerifyPaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");

  const hasExecutedRef = useRef(false);

  const orderIdParam = searchParams.get("orderId");
  const installmentNumberParam = searchParams.get("installmentNumber");
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
        const response = await fetch("/api/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: orderIdParam,
            installmentNumber: installmentNumberParam,
            status: statusParam,
            authority,
            zarinpalStatus,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // خالی کردن سبد خرید در صورت موفقیت
          clearCart();
          localStorage.removeItem("cart-items-v2");
          localStorage.removeItem("cart-items-v1");
          localStorage.removeItem("sarvin_gold_cart");
          localStorage.removeItem("parnazar_gold_cart");
          localStorage.removeItem("checkout_selected_shipping_info");
          localStorage.removeItem("checkout_shipping_information");

          setStatus("success");

          if (installmentNumberParam) {
            setTimeout(() => {
              router.replace(`/account/orders/${orderIdParam}/installments?paid=${installmentNumberParam}`);
            }, 1500);
          } else {
            setTimeout(() => {
              router.replace("/account/orders");
            }, 1500);
          }
        } else {
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
    <main dir="rtl" className="min-h-screen flex items-center justify-center bg-[#FDF8F9] px-4 pt-28 pb-16 font-sans text-[#3B0B14]">
      <div className="w-full max-w-md rounded-3xl border border-[#3B0B14]/15 bg-white p-8 text-center shadow-xs space-y-6">
        <div className="flex justify-center mb-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3B0B14] text-white shadow-md">
            <PackageCheck size={26} />
          </div>
        </div>

        {status === "loading" && (
          <div className="space-y-4 py-6">
            <Loader2 size={40} className="animate-spin text-[#8B142D] mx-auto" />
            <h2 className="text-base font-black text-[#3B0B14]">در حال بررسی وضعیت پرداخت...</h2>
            <p className="text-xs text-[#6E3A44]">لطفاً تا تایید نهایی تراکنش از شبکه بانکی صبور باشید.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 py-2">
            <CheckCircle2 size={50} className="text-emerald-600 mx-auto" />
            <h2 className="text-lg font-black text-[#3B0B14]">پرداخت با موفقیت انجام شد!</h2>
            <p className="text-xs text-[#6E3A44] leading-6">
              سفارش شما در پرنا زر ثبت شد. مثل زر بدرخش ✨ در حال انتقال به صفحه سفارش‌های من...
            </p>
            <div className="pt-2">
              <Link
                href="/account/orders"
                className="w-full rounded-2xl bg-[#3B0B14] py-3.5 text-xs font-black text-white transition hover:bg-[#8B142D] shadow-sm inline-block text-center"
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
            <p className="text-xs text-[#6E3A44] leading-6">
              تراکنش توسط شما لغو گردید یا خطایی در درگاه بانکی رخ داد.
            </p>
            <div className="pt-4 flex flex-col gap-3">
              <Link
                href="/checkout/payment"
                className="w-full rounded-2xl bg-[#3B0B14] py-3.5 text-xs font-black text-white transition hover:bg-[#8B142D] shadow-sm inline-block text-center"
              >
                تلاش مجدد پرداخت
              </Link>
              <Link
                href="/account/orders"
                className="w-full rounded-2xl border border-[#3B0B14]/15 bg-[#FDF8F9] py-3.5 text-xs font-bold text-[#3B0B14] transition hover:bg-[#3B0B14]/5 inline-block text-center"
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