import type { Metadata } from "next";
import { Leaf, ExternalLink, Package, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "رهگیری مرسولات پستی | پرنا زر",
  description:
    "پیگیری وضعیت بسته‌های پستی و مرسولات طلا در سامانه رسمی اداره پست.",
};

export default function TrackingPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#FDF8F9] pt-36 lg:pt-44 pb-20 px-4 sm:px-6 text-[#3B0B14] font-sans">
      <div className="mx-auto max-w-2xl space-y-10">
        
        {/* هدر صفحه */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3B0B14]/5 px-4 py-1.5 text-xs font-bold text-[#8B142D]">
            <span>پیگیری سفارش‌ها</span>
            <Leaf size={14} className="text-[#8B142D]" />
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-[#3B0B14]">
            رهگیری مرسولات پستی
          </h1>
        </div>

        {/* کارت راهنما و دکمه هدایت به سایت پست */}
        <div className="rounded-3xl border border-[#3B0B14]/15 bg-white p-6 sm:p-10 shadow-xs space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FDF8F9] text-[#8B142D] border border-[#3B0B14]/10">
            <Package size={30} />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-black text-[#3B0B14]">سامانه رهگیری مرسولات کشور</h2>
            <p className="text-xs sm:text-sm text-[#6E3A44] max-w-md mx-auto leading-7">
              برای پیگیری بسته‌ی پستی خود، روی دکمه زیر کلیک کنید تا مستقیماً وارد سایت رسمی رهگیری مرسولات پست شوید و بارکد ۲۴ رقمی خود را آنجا وارد کنید.
            </p>
          </div>

          <div className="pt-2">
            <a
              href="https://tracking.post.ir"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#3B0B14] px-8 py-4 text-xs font-black text-white transition hover:bg-[#8B142D] shadow-sm cursor-pointer"
            >
              <span>ورود به سامانه رهگیری پست</span>
              <ExternalLink size={16} />
            </a>
          </div>

          <div className="rounded-2xl bg-[#FDF8F9] p-4 border border-[#3B0B14]/10 flex items-start gap-3 text-right">
            <ShieldCheck size={20} className="text-[#8B142D] shrink-0 mt-0.5" />
            <div className="text-[11px] leading-6 text-[#6E3A44]">
              <strong>نکته:</strong> بارکد پستی سفارش شما بلافاصله پس از آماده‌سازی و ارسال، در قسمت «سفارش‌های من» در پروفایل کاربری‌تان قابل مشاهده خواهد بود.
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}