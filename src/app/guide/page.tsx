import type { Metadata } from "next";
import { Leaf, Ruler, Sparkles, CheckCircle2, Watch, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "راهنمای انتخاب سایز و اندازه | پرنا زر",
  description:
    "راهنمای جامع تعیین سایز انگشتر، دستبند و طول زنجیر گردنبند (زنانه، مردانه و کودک) در گالری طلا و جواهر پرنا زر؛ مثل زر بدرخش.",
};

export default function SizeGuidePage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#FAF9F6] pt-36 lg:pt-44 pb-20 px-4 sm:px-6 text-[#1C3324] font-sans">
      <div className="mx-auto max-w-4xl space-y-10">
        
        {/* هدر صفحه */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1C3324]/5 px-4 py-1.5 text-xs font-bold text-[#8B263E]">
            <span>راهنمای اندازه‌گیری</span>
            <Leaf size={14} className="text-[#8B263E]" />
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-[#1C3324]">
            راهنمای انتخاب سایز و اندازه زیورآلات
          </h1>
          <p className="text-xs sm:text-sm text-[#3A5A46] max-w-lg mx-auto">
            راهنمای دقیق تعیین سایز انگشتر، دستبند و طول زنجیر گردنبند (زنانه، مردانه و کودک) در منزل.
          </p>
        </div>

        {/* محتوای اصلی راهنما */}
        <div className="space-y-6">
          
          {/* ۱. راهنمای سایز انگشتر */}
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-3 text-[#1C3324] font-black text-base sm:text-lg">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
                <Ruler size={22} />
              </div>
              <h2>۱. راهنمای تعیین سایز انگشتر</h2>
            </div>
            
            <div className="pr-14 space-y-3 text-xs sm:text-sm leading-8 text-[#3A5A46] text-justify">
              <p>برای پیدا کردن سایز انگشتر در خانه می‌توانید از دو روش زیر استفاده کنید:</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="rounded-2xl bg-[#FAF9F6] p-4 border border-[#1C3324]/10 space-y-1">
                  <strong className="text-[#1C3324] block font-black">روش محیط انگشت:</strong>
                  <p className="text-[11px] leading-6">
                    یک تکه نخ یا نوار کاغذی را دور بند انگشت بپیچید، محل تقاطع را علامت بزنید و طول آن را بر حسب میلی‌متر با خط‌کش اندازه بگیرید.
                  </p>
                </div>

                <div className="rounded-2xl bg-[#FAF9F6] p-4 border border-[#1C3324]/10 space-y-1">
                  <strong className="text-[#1C3324] block font-black">روش قطر داخلی انگشتر:</strong>
                  <p className="text-[11px] leading-6">
                    یک انگشتر مناسب را روی میز بگذارید و فاصله داخلی (قطر دایره) را بر حسب میلی‌متر اندازه‌گیری کنید.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ۲. راهنمای سایز دستبند (زنانه، مردانه و کودک) */}
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-3 text-[#1C3324] font-black text-base sm:text-lg">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
                <Watch size={22} />
              </div>
              <h2>۲. راهنمای اندازه دستبند (زنانه، مردانه و کودک)</h2>
            </div>
            
            <div className="pr-14 space-y-3 text-xs sm:text-sm leading-8 text-[#3A5A46] text-justify">
              <p>برای اندازه گیری مچ دست، یک متر نواری یا یک تکه نخ را دور استخوان مچ دست خود (بدون فشار دادن یا خیلی شل گرفتن) بپیچید و مقدار آن را بر حسب سانتی‌متر یادداشت کنید:</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="rounded-2xl bg-[#FAF9F6] p-4 border border-[#1C3324]/10 space-y-1">
                  <strong className="text-[#1C3324] block font-black text-xs">دستبند زنانه</strong>
                  <p className="text-[11px] leading-6">استاندارد رایج بین ۱۶ تا ۱۸ سانتی‌متر است (مناسب مچ‌های معمولی).</p>
                </div>

                <div className="rounded-2xl bg-[#FAF9F6] p-4 border border-[#1C3324]/10 space-y-1">
                  <strong className="text-[#1C3324] block font-black text-xs">دستبند مردانه</strong>
                  <p className="text-[11px] leading-6">استاندارد رایج بین ۱۹ تا ۲۱ سانتی‌متر بسته به فریم دست آقایان است.</p>
                </div>

                <div className="rounded-2xl bg-[#FAF9F6] p-4 border border-[#1C3324]/10 space-y-1">
                  <strong className="text-[#1C3324] block font-black text-xs">دستبند کودک</strong>
                  <p className="text-[11px] leading-6">متناسب با سن کودک معمولاً بین ۱۱ تا ۱۴ سانتی‌متر متغیر می‌باشد.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ۳. راهنمای طول گردنبند (زنانه، مردانه و کودک) */}
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-3 text-[#1C3324] font-black text-base sm:text-lg">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
                <Sparkles size={22} />
              </div>
              <h2>۳. راهنمای طول زنجیر گردنبند (زنانه، مردانه و کودک)</h2>
            </div>
            
            <div className="pr-14 space-y-3 text-xs sm:text-sm leading-8 text-[#3A5A46] text-justify">
              <p>انتخاب طول زنجیر تأثیر زیادی روی جلوه پلاک و گردنی دارد:</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="rounded-2xl bg-[#FAF9F6] p-4 border border-[#1C3324]/10 space-y-1">
                  <strong className="text-[#1C3324] block font-black text-xs">گردنبند زنانه</strong>
                  <p className="text-[11px] leading-6">سایز استاندارد ۴۰ تا ۴۵ سانتی‌متر (چوکر یا روی استخوان ترقوه).</p>
                </div>

                <div className="rounded-2xl bg-[#FAF9F6] p-4 border border-[#1C3324]/10 space-y-1">
                  <strong className="text-[#1C3324] block font-black text-xs">گردنبند مردانه</strong>
                  <p className="text-[11px] leading-6">سایز استاندارد ۵0 تا ۵۵ سانتی‌متر (بالای سینه).</p>
                </div>

                <div className="rounded-2xl bg-[#FAF9F6] p-4 border border-[#1C3324]/10 space-y-1">
                  <strong className="text-[#1C3324] block font-black text-xs">گردنبند کودک</strong>
                  <p className="text-[11px] leading-6">سایز ایمن و مناسب کودکان معمولاً ۳۵ تا ۳۸ سانتی‌متر است.</p>
                </div>
              </div>
            </div>
          </div>

          {/* نکات مهم */}
          <div className="rounded-3xl border border-[#8B263E]/20 bg-[#FAF9F6] p-6 sm:p-7 shadow-xs space-y-3">
            <h3 className="font-black text-sm sm:text-base text-[#8B263E]">
              💡 نکته مهم برای سفارش آنلاین:
            </h3>
            <p className="text-xs sm:text-sm leading-7 text-[#3A5A46]">
              اگر برای هدیه دادن خرید می‌کنید یا از اندازه دقیق مچ و انگشت عزیزانتان مطمئن نیستید، می‌توانید از طریق دکمه واتساپ موجود در سایت با تیم پشتیبانی پرنا زر مشورت کنید تا شما را به بهترین شکل راهنمایی کنیم.
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}