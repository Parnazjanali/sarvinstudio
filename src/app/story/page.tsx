import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "روایت پرنا زر | مثل زر بدرخش",
  description:
    "روایت گالری طلا و جواهر پرنا زر؛ مثل زر بدرخش. اصالت، زیبایی و درخشش دست‌سازه‌های طلای ۱۸ عیار.",
};

export default function StoryPage() {
  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#1C3324] font-sans">
      {/* Hero (با پدینگ کافی جهت قرارگیری صحیح پایین هدر شناور) */}
      <section className="relative overflow-hidden px-6 pb-20 pt-40 lg:pt-48 md:pb-28 border-b border-[#1C3324]/10">
        <div className="mx-auto max-w-5xl text-center">
          <span className="mb-5 inline-block text-xs font-bold tracking-[0.3em] text-[#8B263E] uppercase bg-[#F4F6F4] px-4 py-2 rounded-full border border-[#8B263E]/20">
            PARNA ZAR NARRATIVE
          </span>

          <h1 className="text-4xl font-extrabold leading-tight md:text-6xl text-[#1C3324] font-heading">
            روایت <span className="text-[#8B263E]">پرنا زر</span>
          </h1>

          <div className="mx-auto mt-6 h-px w-20 bg-[#8B263E]" />

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-9 text-[#3A5A46] md:text-xl font-medium">
            مثل زر بدرخش؛
            داستان خلق آثاری که قرار است 
            بخشی از ریشه‌ها، درخشش و خاطرات ماندگار شما باشند.
          </p>
        </div>
      </section>

      {/* Story Content */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-right leading-9 text-[#3A5A46]">
          <p className="mb-8 text-base md:text-lg">
            هر چیزی که اصالت دارد، تنها به خاطر جنس و بهای مادی‌اش ماندگار نمی‌شود؛ آنچه به یک اثر جان می‌بخشد، فلسفه و داستانی است که از دل آن جوشیده است. در <strong className="text-[#1C3324]">پرنا زر</strong>، طلا تنها یک فلز نیست؛ بوم نقاشیِ ما برای روایت عشق، هنر، درخشش و پیوندهاست.
          </p>

          <h2 className="mb-4 mt-16 text-2xl font-bold text-[#1C3324] md:text-3xl flex items-center gap-3 font-heading">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B263E]" />
            ۱. اصالتِ بی‌بدیل طلا
          </h2>
          <p className="mb-8 text-base md:text-lg">
            طلا در فرهنگ و هنر اصیل ایرانی، نماد جاودانگی، خلوص و ارزشی ماندگار است. آثار ما در پرنا زر با استفاده از طلای خالص ۱۸ عیار استاندارد و بدون ناخالصی، با دست ساخته می‌شوند تا تجسم همین اصالت و شکوه در زندگی روزمره‌ی شما باشند.
          </p>

          <h2 className="mb-4 mt-16 text-2xl font-bold text-[#1C3324] md:text-3xl flex items-center gap-3 font-heading">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B263E]" />
            ۲. امنیت، آرامش و اعتماد
          </h2>
          <p className="mb-8 text-base md:text-lg">
            ما باور داریم خرید طلا و انتخاب یک هدیه برای عزیزان، باید تجربه‌ای توأم با آرامش و اعتماد کامل باشد. ضمانت عیار، شناسنامه اصالت آثار و ارائه طرح‌های پرداخت اقساطی ۳ مرحله‌ای، همان همراهی امن و شایسته‌ی شماست.
          </p>

          <h2 className="mb-4 mt-16 text-2xl font-bold text-[#1C3324] md:text-3xl flex items-center gap-3 font-heading">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B263E]" />
            ۳. ستایشِ درخشش و هنر دست
          </h2>
          <p className="mb-8 text-base md:text-lg">
            زیبایی در نگاه پرنا زر، پیچیدگی‌های بی‌مورد نیست؛ بلکه خلوصِ خطوط مینیمال و ظرافتِ هنر دست است. هر قطعه‌ای که از کارگاه ما بیرون می‌آید، دعوتی است به درخشیدن؛ همان‌گونه که شایسته‌ی شماست: مثل زر بدرخش.
          </p>

          <blockquote className="my-12 border-r-4 border-[#8B263E] pr-6 py-3 bg-[#F4F6F4] rounded-l-2xl text-xl font-bold leading-10 text-[#1C3324]">
            «طلا برای هر قصه‌ای؛ از شروع یک زندگی مشترک، تا یادآوری این حقیقت که: من نیز ارزشمندم و باید مثل زر بدرخشم.»
          </blockquote>

          <h2 className="mb-4 mt-16 text-2xl font-bold text-[#1C3324] md:text-3xl font-heading">
            قصه‌ای که با حضور شما کامل می‌شود
          </h2>

          <p className="mb-8 text-base md:text-lg">
            پرنا زر تنها یک گالری نیست؛ فضایی است برای خلق خاطراتی که سال‌ها بعد، وقتی به آن‌ها نگاه می‌کنید، لبخند اصالت و غرور بر لبانتان بنشیند. ما در کنار شما هستیم تا بهترین انتخاب را برای ثبت لحظه‌های ناب زندگی‌تان داشته باشید.
          </p>

          <div className="mt-20 border-t border-[#1C3324]/10 pt-12 text-center">
            <p className="text-xl font-bold leading-9 text-[#1C3324]">
              این روایتِ اصالت، زیبایی و هنر دست است.
              <br />
              <span className="text-[#8B263E]">مثل زر بدرخش؛ قصه‌ی اصلی را شما با انتخاب‌هایتان می‌نویسید.</span>
            </p>

            <p className="mt-6 text-sm text-[#3A5A46] font-medium">
              گالری طلا و جواهر پرنا زر؛ مثل زر بدرخش.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}