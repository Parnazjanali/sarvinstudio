import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="bg-[#FAF9F6] border-t border-[#1C3324]/10 text-[#1C3324] font-sans">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 pt-20 pb-10">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12 mb-16">
          
          {/* ستون اول: درباره برند (پرنا زر) */}
          <div className="lg:col-span-4 pr-0 md:pr-4">
            <div className="mb-4 flex flex-col items-start gap-1">
              <div className="text-2xl font-black tracking-wide text-[#1C3324] font-heading">
                پرنا زر
              </div>
              <span className="text-xs font-bold text-[#8B263E] tracking-normal">
                مثل زر بدرخش
              </span>
            </div>
            <p className="text-sm md:text-[15px] leading-loose text-[#3A5A46] max-w-sm font-medium">
              جلوه‌ای از اصالت، ظرافت و درخشش جاودان. در پرنا زر هر اثر طلا داستانی از زیبایی و پیوندی ماندگار است که با عشق و هنر زرگری برای شما خلق شده است.
            </p>
          </div>

          {/* ستون‌های لینک‌ها (چهار ستون منظم برای دسترسی کامل) */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            
            {/* دسترسی سریع */}
            <div>
              <h4 className="mb-5 font-black text-sm text-[#1C3324]">دسترسی سریع</h4>
              <ul className="space-y-3 text-xs sm:text-[13.5px] text-[#3A5A46] font-medium">
                <li><Link href="/" className="hover:text-[#8B263E] transition-colors">صفحه اصلی</Link></li>
                <li><Link href="/products" className="hover:text-[#8B263E] transition-colors">تمامی آثار</Link></li>
                <li><Link href="/story" className="hover:text-[#8B263E] transition-colors">داستان ما (پرنا زر)</Link></li>
                <li><Link href="/blog" className="hover:text-[#8B263E] transition-colors">مجله و بلاگ</Link></li>
              </ul>
            </div>

            {/* خدمات مشتریان */}
            <div>
              <h4 className="mb-5 font-black text-sm text-[#1C3324]">خدمات مشتریان</h4>
              <ul className="space-y-3 text-xs sm:text-[13.5px] text-[#3A5A46] font-medium">
                <li><Link href="/guide" className="hover:text-[#8B263E] transition-colors">راهنمای سایز</Link></li>
                <li><Link href="/faq" className="hover:text-[#8B263E] transition-colors">سوالات متداول</Link></li>
                <li><Link href="/tracking" className="hover:text-[#8B263E] transition-colors">رهگیری مرسولات</Link></li>
                <li><Link href="/returns" className="hover:text-[#8B263E] transition-colors">شرایط تعویض کالا</Link></li>
              </ul>
            </div>

            {/* قوانین و حریم خصوصی */}
            <div>
              <h4 className="mb-5 font-black text-sm text-[#1C3324]">قوانین و امنیت</h4>
              <ul className="space-y-3 text-xs sm:text-[13.5px] text-[#3A5A46] font-medium">
                <li><Link href="/terms" className="hover:text-[#8B263E] transition-colors">قوانین و شرایط خرید</Link></li>
                <li><Link href="/privacy" className="hover:text-[#8B263E] transition-colors">سیاست حریم خصوصی</Link></li>
                <li><Link href="/collaboration" className="hover:text-[#8B263E] transition-colors">همکاری با پرنا زر</Link></li>
                <li><Link href="/contact" className="hover:text-[#8B263E] transition-colors">تماس با پرنا زر</Link></li>
              </ul>
            </div>

            {/* ارتباط با استودیو */}
            <div>
              <h4 className="mb-5 font-black text-sm text-[#1C3324]">ارتباط با ما</h4>
              <ul className="space-y-3 text-xs sm:text-[13.5px] text-[#3A5A46] font-medium">
                <li dir="ltr" className="text-right font-black text-[#1C3324]">0938 308 0950</li>
                <li className="leading-relaxed text-[11px]">تهران، بازار بزرگ، پاساژ تکیه دولت</li>
                <li className="pt-2 flex gap-2.5">
                  <a href="https://instagram.com/parnazar.gold" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full border border-[#1C3324]/15 flex items-center justify-center hover:border-[#8B263E] hover:text-[#8B263E] transition-colors" aria-label="Instagram">In</a>
                  <a href="https://wa.me/989383080950" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full border border-[#1C3324]/15 flex items-center justify-center hover:border-[#8B263E] hover:text-[#8B263E] transition-colors" aria-label="WhatsApp">Wa</a>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* کپی‌رایت مینیمال در انتها */}
        <div className="border-t border-[#1C3324]/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#3A5A46] font-medium">
          <div>© ۱۴۰۵ طلا و جواهر پرنا زر (Parna Zar) — مثل زر بدرخش. تمامی حقوق محفوظ است.</div>
          <div className="tracking-widest uppercase text-[11px] text-[#8B263E] font-black">Handcrafted with care</div>
        </div>
      </div>
    </footer>
  );
}