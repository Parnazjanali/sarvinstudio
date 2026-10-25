"use client";

import { useState } from "react";
import { ChevronLeft, Leaf } from "lucide-react";

type FaqItem = {
  question: string;
  answer: string;
};

const faqData: FaqItem[] = [
  {
    question: "قیمت کالا در پرنا زر چگونه محاسبه می‌شود؟",
    answer:
      "قیمت تمامی محصولات بر اساس نرخ لحظه‌ای طلا و با فرمول رسمی صنف طلا و جواهر محاسبه می‌شود: (قیمت طلا خام + اجرت ساخت) × وزن طلا + متعلقات و سنگ (در صورت وجود) + ۷٪ سود فروشنده + ۹٪ مالیات ارزش افزوده.",
  },
  {
    question: "طرح اقساط طلایی پرنا زر (۳ قسط بدون چک و ضامن) به چه صورت است؟",
    answer:
      "شما می‌توانید مبلغ کل سفارش خود را در ۳ مرحله پرداخت کنید. قسط اول (یک‌سوم مبلغ کل) در زمان ثبت سفارش پرداخت شده و به سبد خرید اضافه می‌شود. اقساط دوم و سوم در ماه‌های بعد بر اساس قیمت روز طلا در زمان سررسید تسویه می‌گردند.",
  },
  {
    question: "محصولات پرنا زر دارای چه عیار و ضمانتی هستند؟",
    answer:
      "تمامی آثار پرنا زر با طلای استاندارد ۱۸ عیار ساخته شده و همراه با فاکتور رسمی، معتبر و قابل استعلام گالری ارائه می‌شوند. اصالت تمامی کارها به صورت صددرصدی تضمین می‌گردد.",
  },
  {
    question: "سفارش‌ها چقدر زمان می‌برد تا به دستم برسد؟",
    answer:
      "محصولاتی که برچسب «موجود در انبار» دارند، طی ۱ تا ۲ روز کاری ارسال می‌شوند. محصولات ساخت سفارشی نیز به طور میانگین به ۷ روز کاری زمان نیاز دارند تا با بالاترین دقت در استودیو ساخته و ارسال شوند.",
  },
  {
    question: "چگونه می‌توانم سایز دقیق انگشتر خود را پیدا کنم؟",
    answer:
      "شما می‌توانید با کلیک روی دکمه «راهنمای انتخاب سایز انگشتر» در صفحه هر محصول، از روش اندازه‌گیری محیط انگشت با نخ و خط‌کش استفاده کنید. همچنین تیم پشتیبانی واتساپ ما آماده راهنمایی شماست.",
  },
  {
    question: "آیا امکان تعویض یا مرجوعی کالا وجود دارد؟",
    answer:
      "بله، مطابق قوانین فروشگاه و در صورت داشتن شرایط تعویض (عدم استفاده از کالا و حفظ بسته‌بندی اصلی و فاکتور)، تا ۱۰ روز پس از تحویل امکان پیگیری وجود دارد.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#FAF9F6] pt-36 lg:pt-44 pb-20 px-4 sm:px-6">
      <section className="mx-auto max-w-4xl">
        <div className="text-center space-y-3 mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1C3324]/5 px-4 py-1.5 text-xs font-bold text-[#8B263E]">
            <span>پاسخ به پرسش‌های شما</span>
            <Leaf size={14} className="text-[#8B263E]" />
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-[#1C3324]">
            سوالات متداول
          </h1>
          <p className="text-xs sm:text-sm text-[#3A5A46] max-w-lg mx-auto">
            هرآنچه درباره خرید آنلاین، محاسبه قیمت، طرح اقساط و ارسال محصولات پرنا زر باید بدانید.
          </p>
        </div>

        <div className="space-y-4">
          {faqData.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className="rounded-3xl border border-[#1C3324]/15 bg-white transition-all duration-200 overflow-hidden shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-right font-black text-sm sm:text-base text-[#1C3324] hover:text-[#8B263E] transition cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FAF9F6] text-xs font-bold text-[#8B263E] border border-[#1C3324]/10">
                      {index + 1}
                    </span>
                    {item.question}
                  </span>
                  <ChevronLeft
                    size={18}
                    className={`shrink-0 text-[#1C3324]/60 transition-transform duration-300 ${
                      isOpen ? "-rotate-90 text-[#8B263E]" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-0 text-xs sm:text-sm leading-8 text-[#3A5A46] border-t border-[#1C3324]/5 pt-4 mx-6">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}