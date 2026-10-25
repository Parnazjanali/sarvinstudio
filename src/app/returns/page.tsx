import type { Metadata } from "next";
import { Leaf, RefreshCcw, ShieldCheck, AlertCircle, Clock, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "شرایط تعویض و مرجوعی | پرنا زر",
  description:
    "ضوابط و شرایط تعویض آثار طلا، مهلت ۳ تا ۷ روزه بررسی فنی و استانداردهای مرجوعی کالا در گالری پرنا زر.",
};

export default function ReturnsPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#FAF9F6] pt-36 lg:pt-44 pb-20 px-4 sm:px-6 text-[#1C3324] font-sans">
      <div className="mx-auto max-w-4xl space-y-10">
        
        {/* هدر صفحه */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1C3324]/5 px-4 py-1.5 text-xs font-bold text-[#8B263E]">
            <span>خدمات پس از فروش</span>
            <Leaf size={14} className="text-[#8B263E]" />
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-[#1C3324]">
            شرایط تعویض و مرجوعی کالا
          </h1>
          <p className="text-xs sm:text-sm text-[#3A5A46] max-w-lg mx-auto">
            رضایت شما از اصالت و کیفیت آثار پرنا زر، تعهد قلبی ماست. در این صفحه با قوانین تعویض و بررسی کالا آشنا شوید.
          </p>
        </div>

        {/* محتوای اصلی شرایط */}
        <div className="space-y-6 text-xs sm:text-sm leading-8 text-[#3A5A46]">
          
          {/* مهلت ۳ تا ۷ روزه */}
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-3 text-[#1C3324] font-black text-base sm:text-lg">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
                <Clock size={22} />
              </div>
              <h2>مهلت ۳ تا ۷ روزه بررسی و تعویض</h2>
            </div>
            
            <p className="pr-14 text-justify">
              برای آرامش خاطر شما عزیزان، گالری طلا و جواهر پرنا زر ضمانت بررسی ۳ تا ۷ روزه کالا را فراهم کرده است. اگر پس از دریافت سفارش متوجه مغایرت مشخصات، ایراد ساخت یا مشکل فنی در اثر شدید، حداکثر ظرف مدت ۳ روز می‌توانید مراتب را به تیم پشتیبانی اطلاع دهید.
            </p>
          </div>

          {/* شرایط و ضوابط استرداد و تعویض */}
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-3 text-[#1C3324] font-black text-base sm:text-lg">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
                <RefreshCcw size={22} />
              </div>
              <h2>ضوابط مهم برای تعویض یا بررسی کالا</h2>
            </div>
            
            <div className="pr-14 space-y-3 text-justify">
              <p>جهت حفظ استانداردها و نکات بهداشتی و طلا و جواهر، رعایت موارد زیر برای تعویض الزامی است:</p>
              
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-[#8B263E] shrink-0 mt-1.5" />
                  <span>تگ‌ها و پلمپ فیزیکی کالا نباید به هیچ عنوان جدا یا مخدوش شده باشند.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-[#8B263E] shrink-0 mt-1.5" />
                  <span>کالا باید در شرایط اولیه، بدون هیچ‌گونه خط‌وخش، تغییر فرم یا آثار استفاده‌شدگی به استودیو بازگردد همراه با فاکتور رسمی.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-[#8B263E] shrink-0 mt-1.5" />
                  <span>به دلیل ماهیت نوسانی طلا و سفارشی‌بودن ساخت آثار، امکان مرجوعی نقدی صرفاً به دلیل انصراف سلیقه‌ای پس از ساخت وجود ندارد، اما تعویض مدل در شرایط خاص امکان‌پذیر است.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* هشدارهای مهم */}
          <div className="rounded-3xl border border-[#8B263E]/20 bg-[#FAF9F6] p-6 sm:p-7 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-[#8B263E] font-black text-sm sm:text-base">
              <AlertCircle size={20} />
              <h3>نکته پایانی</h3>
            </div>
            <p className="text-xs sm:text-sm leading-7 text-[#3A5A46] pr-7">
              پیش از ارسال کالا جهت تعویض یا بررسی، حتماً از طریق بخش تماس با ما یا پشتیبانی واتساپ موضوع را با همکاران ما هماهنگ نمایید تا راهنمایی‌های لازم جهت ارسال امن بیمه‌شده انجام شود.
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}