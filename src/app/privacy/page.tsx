import type { Metadata } from "next";
import { Leaf, ShieldCheck, Lock, UserCheck, Database, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "سیاست حریم خصوصی | سروین استودیو",
  description:
    "اطلاعات شخصی شما در سروین استودیو چگونه جمع‌آوری، استفاده و محافظت می‌شود. تعهد ما به حفظ حریم خصوصی کاربران.",
};

export default function PrivacyPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#FAF9F6] pt-36 lg:pt-44 pb-20 px-4 sm:px-6 text-[#1C3324] font-sans">
      <div className="mx-auto max-w-4xl space-y-10">
        
        {/* هدر صفحه */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1C3324]/5 px-4 py-1.5 text-xs font-bold text-[#8B263E]">
            <span>امنیت اطلاعات</span>
            <Leaf size={14} className="text-[#8B263E]" />
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-[#1C3324]">
            سیاست حریم خصوصی کاربران
          </h1>
          <p className="text-xs sm:text-sm text-[#3A5A46] max-w-lg mx-auto">
            در سروین استودیو، حفظ امنیت و حریم خصوصی اطلاعات شما بالاترین اولویت ماست. در این صفحه با نحوه نگهداری داده‌ها آشنا می‌شوید.
          </p>
        </div>

        {/* محتوای حریم خصوصی */}
        <div className="space-y-6 text-xs sm:text-sm leading-8 text-[#3A5A46]">
          
          {/* بند ۱: جمع‌آوری اطلاعات */}
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-8 shadow-xs space-y-3">
            <div className="flex items-center gap-3 text-[#1C3324] font-black text-base sm:text-lg">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
                <Database size={20} />
              </div>
              <h2>۱. چه اطلاعاتی از شما جمع‌آوری می‌کنیم؟</h2>
            </div>
            <p className="pr-13 text-justify">
              برای ثبت سفارش، صدور فاکتور رسمی طلا و ارسال امن مرسولات، به اطلاعاتی نظیر نام و نام خانوادگی، شماره تماس، آدرس دقیق پستی، کد پستی و ایمیل نیاز داریم. همچنین اطلاعات تراکنش‌های مالی شما در بستر امن درگاه‌های بانکی پردازش می‌شوند.
            </p>
          </div>

          {/* بند ۲: نحوه استفاده از اطلاعات */}
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-8 shadow-xs space-y-3">
            <div className="flex items-center gap-3 text-[#1C3324] font-black text-base sm:text-lg">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
                <UserCheck size={20} />
              </div>
              <h2>۲. از اطلاعات شما چگونه استفاده می‌شود؟</h2>
            </div>
            <p className="pr-13 text-justify">
              اطلاعات ثبت‌شده صرفاً جهت پردازش سفارش‌ها، صدور فاکتور قانونی طلا، هماهنگی‌های ارسال پستی و ارتباط با شما جهت اطلاع‌رسانی وضعیت سفارش استفاده می‌شود. همچنین با رضایت شما ممکن است برای ارسال پیامک‌های اطلاع‌رسانی درباره کلکسیون‌های جدید یا تخفیف‌های ویژه استفاده شود که در هر زمان قابل لغو است.
            </p>
          </div>

          {/* بند ۳: امنیت اطلاعات و نگهداری */}
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-8 shadow-xs space-y-3">
            <div className="flex items-center gap-3 text-[#1C3324] font-black text-base sm:text-lg">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
                <Lock size={20} />
              </div>
              <h2>۳. امنیت و حفاظت از داده‌ها</h2>
            </div>
            <p className="pr-13 text-justify">
              سروین استودیو متعهد می‌شود که از حریم خصوصی شما به عنوان یک دارایی ارزشمند محافظت کرده و از ابزارها و پروتکل‌های امنیتی روز برای جلوگیری از دسترسی‌های غیرمجاز استفاده کند. اطلاعات شما به هیچ عنوان به اشخاص ثالث یا شرکت‌های تبلیغاتی فروخته یا واگذار نخواهد شد.
            </p>
          </div>

          {/* بند ۴: کوکی‌ها و ارتباط با ما */}
          <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-8 shadow-xs space-y-3">
            <div className="flex items-center gap-3 text-[#1C3324] font-black text-base sm:text-lg">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FAF9F6] text-[#8B263E] border border-[#1C3324]/10">
                <ShieldCheck size={20} />
              </div>
              <h2>۴. کوکی‌ها و حقوق کاربران</h2>
            </div>
            <p className="pr-13 text-justify">
              وب‌سایت ما ممکن است از کوکی‌ها برای بهبود تجربه مرور شما و ذخیره اقلام سبد خرید استفاده کند. شما در هر زمان می‌توانید تنظیمات مرورگر خود را برای مدیریت کوکی‌ها تغییر دهید. در صورت داشتن هرگونه سوال یا ابهام درباره سیاست حریم خصوصی، می‌توانید از طریق صفحه تماس با ما با ما در ارتباط باشید.
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}