import Link from "next/link";
import { Sparkles, Phone, MapPin, MessageCircle } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="bg-gradient-to-b from-[#24040A] via-[#1A0307] to-[#120205] text-[#FAF7F2] border-t border-[#DFB76C]/25 font-sans relative overflow-hidden">
      {/* هاله‌های نوری ظریف زرین و یاقوتی جهت هارمونی لوکس */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#DFB76C]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#8B142D]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 sm:px-8 pt-16 sm:pt-20 pb-10">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12 mb-14 sm:mb-16">
          
          {/* ستون اول: درباره برند (پرنا زر) */}
          <div className="lg:col-span-4 pr-0 md:pr-4">
            <div className="mb-4 flex flex-col items-start gap-1">
              <div className="text-2xl sm:text-3xl font-black tracking-wide text-white font-heading flex items-center gap-2">
                <span>پرنا زر</span>
                <Sparkles size={18} className="text-[#DFB76C]" />
              </div>
              <span className="text-xs font-bold text-[#DFB76C] tracking-wide font-sans">
                مثل زر بدرخش
              </span>
            </div>
            <p className="text-sm md:text-[14.5px] leading-loose text-zinc-300 max-w-sm font-medium">
              جلوه‌ای از اصالت، ظرافت و درخشش جاودان. در پرنا زر هر اثر طلا داستانی از زیبایی و پیوندی ماندگار است که با عشق و هنر زرگری برای شما خلق شده است.
            </p>
          </div>

          {/* ستون‌های لینک‌ها (چهار ستون منظم برای دسترسی کامل) */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            
            {/* دسترسی سریع */}
            <div>
              <h4 className="mb-4 font-black text-sm text-[#DFB76C] font-heading">دسترسی سریع</h4>
              <ul className="space-y-3 text-xs sm:text-[13.5px] text-zinc-300 font-medium">
                <li><Link href="/" className="hover:text-[#DFB76C] transition-colors">صفحه اصلی</Link></li>
                <li><Link href="/products" className="hover:text-[#DFB76C] transition-colors">تمامی آثار</Link></li>
                <li><Link href="/collections" className="hover:text-[#DFB76C] transition-colors">کالکشن‌های اختصاصی</Link></li>
                <li><Link href="/story" className="hover:text-[#DFB76C] transition-colors">سرای زر (درباره ما)</Link></li>
                <li><Link href="/blog" className="hover:text-[#DFB76C] transition-colors">مجله و دانستنی‌ها</Link></li>
              </ul>
            </div>

            {/* خدمات مشتریان */}
            <div>
              <h4 className="mb-4 font-black text-sm text-[#DFB76C] font-heading">خدمات مشتریان</h4>
              <ul className="space-y-3 text-xs sm:text-[13.5px] text-zinc-300 font-medium">
                <li><Link href="/guide" className="hover:text-[#DFB76C] transition-colors">راهنمای سایز طلا</Link></li>
                <li><Link href="/faq" className="hover:text-[#DFB76C] transition-colors">شرایط طرح ۳ قسط</Link></li>
                <li><Link href="/tracking" className="hover:text-[#DFB76C] transition-colors">رهگیری سفارشات</Link></li>
                <li><Link href="/returns" className="hover:text-[#DFB76C] transition-colors">ضمانت اصالت و تعویض</Link></li>
              </ul>
            </div>

            {/* قوانین و امنیت */}
            <div>
              <h4 className="mb-4 font-black text-sm text-[#DFB76C] font-heading">قوانین و امنیت</h4>
              <ul className="space-y-3 text-xs sm:text-[13.5px] text-zinc-300 font-medium">
                <li><Link href="/terms" className="hover:text-[#DFB76C] transition-colors">قوانین صدور فاکتور</Link></li>
                <li><Link href="/privacy" className="hover:text-[#DFB76C] transition-colors">سیاست حریم خصوصی</Link></li>
                <li><Link href="/careers" className="hover:text-[#DFB76C] transition-colors">فرصت‌های شغلی و استخدام</Link></li>
                <li><Link href="/contact" className="hover:text-[#DFB76C] transition-colors">ارتباط با مدیریت</Link></li>
              </ul>
            </div>

            {/* ارتباط با استودیو */}
            <div>
              <h4 className="mb-4 font-black text-sm text-[#DFB76C] font-heading">ارتباط با ما</h4>
              <ul className="space-y-3 text-xs sm:text-[13.5px] text-zinc-300 font-medium">
                <li dir="ltr" className="text-right font-black text-[#DFB76C] flex items-center justify-end gap-1.5 font-mono">
                  <span>0938 308 0950</span>
                  <Phone size={13} className="text-[#DFB76C]" />
                </li>
                <li className="leading-relaxed text-[11.5px] text-zinc-300 flex items-start gap-1.5">
                  <MapPin size={14} className="text-[#DFB76C] shrink-0 mt-0.5" />
                  <span>تهران، بازار بزرگ، پاساژ تکیه دولت</span>
                </li>
                <li className="pt-2 flex gap-2.5">
                  <a 
                    href="https://instagram.com/parnazar.gold" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-9 h-9 rounded-full border border-[#DFB76C]/30 bg-white/5 flex items-center justify-center hover:border-[#DFB76C] hover:bg-[#DFB76C]/20 hover:text-[#DFB76C] transition-all text-zinc-200" 
                    aria-label="Instagram"
                  >
                    <svg className="w-4 h-4 fill-none stroke-currentColor stroke-2" viewBox="0 0 24 24">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                  </a>
                  <a 
                    href="https://wa.me/989383080950" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-9 h-9 rounded-full border border-[#DFB76C]/30 bg-white/5 flex items-center justify-center hover:border-[#DFB76C] hover:bg-[#DFB76C]/20 hover:text-[#DFB76C] transition-all text-zinc-200" 
                    aria-label="WhatsApp"
                  >
                    <MessageCircle size={16} />
                  </a>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* کپی‌رایت مینیمال در انتها با حاشیه زرین */}
        <div className="border-t border-[#DFB76C]/15 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-400 font-medium">
          <div>© ۱۴۰۵ گالری طلا پرنا زر (Parna Zar) — مثل زر بدرخش. تمامی حقوق محفوظ است.</div>
          <div className="tracking-widest uppercase text-[11px] text-[#DFB76C] font-black">
            Handcrafted with care
          </div>
        </div>
      </div>
    </footer>
  );
}
