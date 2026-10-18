import type { Metadata } from "next";
import { Leaf, ExternalLink, Package, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "رهگیری مرسولات پستی | سروین استودیو",
  description:
    "پیگیری وضعیت بسته‌های پستی و مرسولات طلا و جواهر در سامانه رسمی اداره پست.",
};

export default function TrackingPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#FAF9F6] pt-36 lg:pt-44 pb-20 px-4 sm:px-6 text-[#1C3324] font-sans">
      <div className="mx-auto max-w-2xl space-y-10">
        
        {/* هدر صفحه */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1C3324]/5 px-4 py-1.5 text-xs font-bold text-[#8B263E]">
            <span>پیگیری سفارش‌ها</span>
            <Leaf size={14} className="text-[#8B263E]" />
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-[#1C3324]">
            رهگیری مرسولات پستی
          </h1>
        </div>

        {/* کارت راهنما و دکمه هدایت به سایت پست */}
        <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-10 shadow-xs space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
            <Package size={30} />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-black text-[#1C3324]">سامانه رهگیری مرسولات کشور</h2>
            <p className="text-xs sm:text-sm text-[#3A5A46] max-w-md mx-auto leading-7">
              برای پیگیری بسته‌ی پستی خود، روی دکمه زیر کلیک کنید تا مستقیماً وارد سایت رسمی رهگیری مرسولات پست شوید و بارکد ۲۴ رقمی خود را آنجا وارد کنید.
            </p>
          </div>

          <div className="pt-2">
            <a
              href="https://tracking.post.ir"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1C3324] px-8 py-4 text-xs font-black text-white transition hover:bg-[#8B263E] shadow-sm cursor-pointer"
            >
              <span>ورود به سامانه رهگیری پست</span>
              <ExternalLink size={16} />
            </a>
          </div>

          <div className="rounded-2xl bg-[#FAF9F6] p-4 border border-[#1C3324]/10 flex items-start gap-3 text-right">
            <ShieldCheck size={20} className="text-[#8B263E] shrink-0 mt-0.5" />
            <div className="text-[11px] leading-6 text-[#3A5A46]">
              <strong>نکته:</strong> بارکد پستی سفارش شما بلافاصله پس از آماده‌سازی و ارسال، در قسمت «سفارش‌های من» در پروفایل کاربری‌تان قابل مشاهده خواهد بود.
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}