import type { Metadata } from "next";
import { Leaf, ShieldCheck, Scale, RefreshCcw, Truck, Gem, Lock, FileText, MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "قوانین و مقررات | پرنا زر",
  description:
    "قوانین و مقررات استفاده از سایت، شرایط ثبت سفارش، محاسبه قیمت طلا، ارسال مرسولات و حریم خصوصی در پرنا زر.",
};

export default function TermsPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#FAF9F6] pt-36 lg:pt-44 pb-20 px-4 sm:px-6 text-[#1C3324] font-sans">
      <div className="mx-auto max-w-4xl space-y-10">
        
        {/* هدر صفحه */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1C3324]/5 px-4 py-1.5 text-xs font-bold text-[#8B263E]">
            <span>قوانین و ضوابط گالری</span>
            <Leaf size={14} className="text-[#8B263E]" />
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-[#1C3324]">
            قوانین و مقررات پرنا زر
          </h1>
          <p className="text-xs sm:text-sm text-[#3A5A46] max-w-lg mx-auto">
            ورود شما به سایت پرنا زر و استفاده از خدمات یا ثبت سفارش به معنای آگاه بودن و پذیرش کامل تمامی شرایط و قوانین زیر است.
          </p>
        </div>

        {/* محتوای قوانین */}
        <div className="space-y-6 text-xs sm:text-sm leading-8 text-[#3A5A46]">
          
          {/* مقدمه و قوانین عمومی */}
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-8 shadow-xs space-y-3">
            <div className="flex items-center gap-3 text-[#1C3324] font-black text-base sm:text-lg">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
                <FileText size={20} />
              </div>
              <h2>قوانین و مقررات عمومی</h2>
            </div>
            <p className="pr-13 text-justify">
              رعایت قوانین جمهوری اسلامی ایران، قانون تجارت الکترونیک و قانون حمایت از حقوق مصرف‌کننده اساس رویه پرنا زر می‌باشد. در صورت تغییر در قوانین مندرج، مراتب متعاقباً در همین صفحه منتشر و به‌روزرسانی خواهد شد. پرنا زر مجاز است بدون اطلاع قبلی نسبت به توقف سفارش‌گیری جدید یا توقف فروش بخش یا کل محصولات اقدام کند؛ بدیهی است سفارش‌های ثبت‌شده پیش از آن، طبق روال پردازش و ارسال خواهند شد.
            </p>
          </div>

          {/* خرید الکترونیکی و ثبت سفارش */}
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-8 shadow-xs space-y-3">
            <div className="flex items-center gap-3 text-[#1C3324] font-black text-base sm:text-lg">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
                <Gem size={20} />
              </div>
              <h2>خرید الکترونیکی و ثبت سفارش</h2>
            </div>
            <p className="pr-13 text-justify">
              خرید الکترونیکی به منزله عقد قرارداد بین خریدار و فروشنده در بستر دیجیتال است. ثبت سفارش به معنی تایید کالای درخواستی از سوی کاربر می‌باشد. ثبت‌نام در سایت علاوه بر تسهیل خرید، امکان اطلاع از جشنواره‌ها و فروش‌های ویژه را فراهم می‌کند. از کاربران گرامی تقاضا می‌شود اطلاعات خود را با دقت وارد کنند تا از بروز هرگونه خطا جلوگیری شود.
            </p>
            <p className="pr-13 text-justify mt-2">
              <strong>نکته درباره محصولات سفارشی:</strong> وزن و قیمت محصولاتی که آماده ارسال نباشند به صورت حدودی ثبت شده و پس از ساخت، وزن و قیمت دقیق اعلام می‌گردد (احتمال تغییر وزن تا ۱ گرم متغیر است). در صورت اختلاف قیمت، مابه‌التفاوت عودت داده شده یا دریافت می‌گردد و قیمت نهایی بر اساس نرخ روز طلای ثبت سفارش محاسبه می‌شود.
            </p>
          </div>

          {/* نحوه محاسبه قیمت */}
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-8 shadow-xs space-y-3">
            <div className="flex items-center gap-3 text-[#1C3324] font-black text-base sm:text-lg">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
                <Scale size={20} />
              </div>
              <h2>نحوه محاسبه قیمت و طرح اقساط</h2>
            </div>
            <p className="pr-13 text-justify">
              فرمول محاسبه قیمت شامل: (قیمت طلا خام + اجرت ساخت) × وزن خالص + متعلقات/سنگ + ۷٪ سود قانونی + ۹٪ مالیات ارزش افزوده است. همچنین در طرح اقساط طلایی پرنا زر (۳ مرحله‌ای بدون چک)، قسط اول در زمان ثبت سفارش پرداخت شده و اقساط بعدی در ماه‌های متوالی بر اساس نرخ روز طلا در زمان سررسید تسویه می‌گردند.
            </p>
          </div>

          {/* دریافت و روش‌های ارسال */}
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-8 shadow-xs space-y-3">
            <div className="flex items-center gap-3 text-[#1C3324] font-black text-base sm:text-lg">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
                <Truck size={20} />
              </div>
              <h2>دریافت و روش‌های ارسال سفارشات</h2>
            </div>
            <p className="pr-13 text-justify">
              تمامی کالاها پیش از ارسال توسط واحد کنترل کیفیت بررسی و در بسته‌بندی‌های استاندارد و امن قرار می‌گیرند. در تهران ارسال توسط پیک گالری و برای سایر شهرها توسط پست پیشتاز (بیمه‌شده) انجام می‌شود. مشتریان موظفند هنگام تحویل، سلامت بسته‌بندی را بررسی کرده و در صورت مشاهده پارگی یا آسیب، از تحویل گرفتن بسته خودداری نمایند.
            </p>
          </div>

          {/* ضمانت تعویض و استرداد */}
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-8 shadow-xs space-y-3">
            <div className="flex items-center gap-3 text-[#1C3324] font-black text-base sm:text-lg">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
                <RefreshCcw size={20} />
              </div>
              <h2>ضمانت تعویض و ضوابط استرداد کالا</h2>
            </div>
            <p className="pr-13 text-justify">
              پرنا زر امکان تعویض کالا را تا ۳ الی ۷ روز در صورت وجود ایراد فنی یا عدم تطابق فراهم کرده است. شرایط استرداد مستلزم عدم جدا شدن تگ‌ها، حفظ حالت آکبند و اولیه کالا و عدم استفاده از آن می‌باشد. در صورت بروز هرگونه خطا در درج قیمت در سایت، گالری مجاز به لغو سفارش و عودت وجه طی ۷ تا ۱۰ روز کاری می‌باشد.
            </p>
          </div>

          {/* نظرات کاربران و حریم خصوصی */}
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-8 shadow-xs space-y-3">
            <div className="flex items-center gap-3 text-[#1C3324] font-black text-base sm:text-lg">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
                <MessageSquare size={20} />
              </div>
              <h2>نظرات کاربران و حفظ حریم خصوصی</h2>
            </div>
            <p className="pr-13 text-justify">
              کاربران می‌توانند در بخش نظرات به تبادل نظر بپردازند؛ رعایت اصول اخلاقی و قانونی در این بخش الزامی بوده و مسئولیت محتوای نظرات بر عهده کاربر است. پرنا زر اطلاعات شخصی شما (نام، آدرس، تلفن) را محترم شمرده و با نهایت دقت در بستری امن نگهداری می‌کند تا تجربه‌ای امن و خاطره‌انگیز داشته باشید.
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}