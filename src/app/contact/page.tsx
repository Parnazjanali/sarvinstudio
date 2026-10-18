import type { Metadata } from "next";
import {
  AtSign,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";

export const metadata: Metadata = {
  title: "تماس با ما | سروین استودیو",
  description:
    "برای ارتباط با سروین استودیو، دریافت مشاوره و پیگیری سفارش‌ها با ما در تماس باشید.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#1C3324]">
      {/* Hero - با فاصله بیشتر از بالای صفحه برای قرارگیری صحیح زیر هدر */}
      <section className="px-6 pb-16 pt-32 md:pb-20 md:pt-44">
        <div className="mx-auto max-w-5xl text-center">
          <span className="mb-5 inline-block text-xs font-bold tracking-[0.3em] text-[#8B263E]">
            SARVIN STUDIO
          </span>

          <h1 className="text-4xl font-black md:text-6xl text-[#1C3324]">
            با ما در تماس باشید
          </h1>

          <div className="mx-auto mt-6 h-px w-20 bg-[#8B263E]/40" />

          <p className="mx-auto mt-8 max-w-2xl text-base leading-8 md:text-lg text-[#3A5A46]">
            اگر سوالی درباره جواهرات، نرخ روز طلا، ثبت سفارش یا
            نحوه خرید دارید، خوشحال می‌شویم با شما در ارتباط باشیم.
          </p>
        </div>
      </section>

      {/* Contact content */}
      <section className="px-6 pb-24 md:pb-32">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          {/* Contact information */}
          <div className="rounded-3xl bg-white p-7 md:p-9 border border-[#1C3324]/15 shadow-xs">
            <h2 className="text-2xl font-black md:text-3xl text-[#1C3324]">
              راه‌های ارتباطی
            </h2>

            <p className="mt-4 leading-8 text-[#3A5A46]">
              برای دریافت مشاوره یا پیگیری سفارش، می‌توانید
              از طریق راه‌های زیر با ما در ارتباط باشید.
            </p>

            <div className="mt-8 space-y-4">
              {/* Phone */}
              <a
                href="tel:+989383080950"
                className="flex items-center gap-4 rounded-2xl p-4 transition hover:bg-[#FAF9F6]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1C3324]/5 text-[#8B263E]">
                  <Phone size={20} />
                </div>

                <div>
                  <p className="text-xs text-[#3A5A46]">تماس تلفنی</p>
                  <p className="mt-1 font-bold text-[#1C3324]" dir="ltr">
                    0938 308 0950
                  </p>
                </div>
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/989383080950"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 rounded-2xl p-4 transition hover:bg-[#FAF9F6]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1C3324]/5 text-[#25D366]">
                  <MessageCircle size={20} />
                </div>

                <div>
                  <p className="text-xs text-[#3A5A46]">واتساپ</p>
                  <p className="mt-1 font-bold text-[#1C3324]">
                    گفتگو با سروین استودیو
                  </p>
                </div>
              </a>

              {/* Address */}
              <div className="flex items-center gap-4 rounded-2xl p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1C3324]/5 text-[#8B263E]">
                  <MapPin size={20} />
                </div>

                <div>
                  <p className="text-xs text-[#3A5A46]">آدرس گالری</p>
                  <p className="mt-1 font-bold leading-7 text-[#1C3324]">
                    تهران - بازار بزرگ - پاساژ تکیه دولت
                  </p>
                </div>
              </div>

              {/* Working hours */}
              <div className="flex items-center gap-4 rounded-2xl p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1C3324]/5 text-[#8B263E]">
                  <Clock3 size={20} />
                </div>

                <div>
                  <p className="text-xs text-[#3A5A46]">ساعت کاری</p>
                  <p className="mt-1 font-bold text-[#1C3324]">
                    شنبه تا پنجشنبه، ۱۱ تا ۲۰
                  </p>
                </div>
              </div>

              {/* Instagram */}
              <a
                href="https://instagram.com/sarvin.jewels"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-2xl p-4 transition hover:bg-[#FAF9F6]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1C3324]/5 text-[#8B263E]">
                  <AtSign size={20} />
                </div>

                <div>
                  <p className="text-xs text-[#3A5A46]">اینستاگرام</p>
                  <p className="mt-1 font-bold text-[#1C3324]">
                    sarvin.jewels
                  </p>
                </div>
              </a>
            </div>
          </div>

          {/* Contact form */}
          <div className="rounded-3xl bg-white p-7 md:p-9 border border-[#1C3324]/15 shadow-xs">
            <h2 className="text-2xl font-black md:text-3xl text-[#1C3324]">
              برای ما پیام بگذارید
            </h2>

            <p className="mt-4 leading-8 text-[#3A5A46]">
              سوال یا درخواستی دارید؟ فرم زیر را پر کنید
              تا بتوانیم با شما در ارتباط باشیم.
            </p>

            <form className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-xs font-bold text-[#1C3324]"
                >
                  نام و نام خانوادگی
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="نام شما"
                  className="w-full rounded-2xl px-4 py-3.5 text-xs outline-none transition bg-[#FAF9F6] border border-[#1C3324]/15 focus:border-[#1C3324]"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-xs font-bold text-[#1C3324]"
                >
                  شماره تماس
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="۰۹۱۲..."
                  dir="rtl"
                  className="w-full rounded-2xl px-4 py-3.5 text-xs outline-none transition bg-[#FAF9F6] border border-[#1C3324]/15 focus:border-[#1C3324]"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="mb-2 block text-xs font-bold text-[#1C3324]"
                >
                  پیام شما
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  placeholder="پیام خود را بنویسید..."
                  className="w-full resize-none rounded-2xl px-4 py-3.5 text-xs outline-none transition bg-[#FAF9F6] border border-[#1C3324]/15 focus:border-[#1C3324]"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl px-6 py-4 text-xs font-black transition bg-[#1C3324] text-white hover:bg-[#8B263E] cursor-pointer shadow-sm"
              >
                ارسال پیام
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}