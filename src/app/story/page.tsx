import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "سرای سرو | روایت سروین استودیو",
  description:
    "روایت سروین استودیو؛ استواریِ سرو، امنیتِ سایه، و ستایشِ زیبایی و هنر دست‌ساز.",
};

export default function StoryPage() {
  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#1C3324] font-sans">
      {/* Hero (با پدینگ کافی جهت قرارگیری صحیح پایین هدر شناور) */}
      <section className="relative overflow-hidden px-6 pb-20 pt-40 lg:pt-48 md:pb-28 border-b border-[#1C3324]/10">
        <div className="mx-auto max-w-5xl text-center">
          <span className="mb-5 inline-block text-xs font-bold tracking-[0.3em] text-[#8B263E] uppercase bg-[#F4F6F4] px-4 py-2 rounded-full border border-[#8B263E]/20">
            Sarvin Studio Narrative
          </span>

          <h1 className="text-4xl font-extrabold leading-tight md:text-6xl text-[#1C3324]">
            روایت <span className="text-[#8B263E]">سروین</span>
          </h1>

          <div className="mx-auto mt-6 h-px w-20 bg-[#8B263E]" />

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-9 text-[#3A5A46] md:text-xl font-medium">
            استواریِ سرو، امنیتِ سایه، و ستایشِ زیبایی؛
            داستان خلق آثاری که قرار است 
            بخشی از ریشه‌ها و خاطرات ماندگار شما باشند.
          </p>
        </div>
      </section>

      {/* Story Content */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-right leading-9 text-[#3A5A46]">
          <p className="mb-8 text-base md:text-lg">
            هر چیزی که اصالت دارد، تنها به خاطر جنس و بهای مادی‌اش ماندگار نمی‌شود؛ آنچه به یک اثر جان می‌بخشد، فلسفه و داستانی است که از دل آن جوشیده است. در <strong className="text-[#1C3324]">سروین استودیو</strong>، طلا تنها یک فلز نیست؛ بوم نقاشیِ ما برای روایت عشق، هنر و پیوندهاست.
          </p>

          <h2 className="mb-4 mt-16 text-2xl font-bold text-[#1C3324] md:text-3xl flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B263E]" />
            ۱. استواریِ سرو
          </h2>
          <p className="mb-8 text-base md:text-lg">
            سرو در فرهنگ و هنر اصیل ایرانی، نماد ایستادگی، سرسبزیِ جاودانه و ریشه‌های محکمی است که در برابر ملایمات و سختی‌ها خم به ابرو نمی‌آورد. آثار ما در سروین با استفاده از طلای خالص ۱۸ عیار و بدون ناخالصی، با دست ساخته می‌شوند تا تجسم همین استواری و اصالت در زندگی روزمره‌ی شما باشند.
          </p>

          <h2 className="mb-4 mt-16 text-2xl font-bold text-[#1C3324] md:text-3xl flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B263E]" />
            ۲. امنیتِ سایه
          </h2>
          <p className="mb-8 text-base md:text-lg">
            سایه، پناهی است امن در روزهای گرم زندگی؛ نشانه‌ی همراهی، مراقبت و آرامشِ خاطر. ما باور داریم خرید طلا و انتخاب یک هدیه برای عزیزان، باید تجربه‌ای توأم با آرامش و اعتماد کامل باشد. ضمانت عیار، اصالت آثار و همراهی صمیمی ما با شما، همان «سایه» امنِ پیوند ماست.
          </p>

          <h2 className="mb-4 mt-16 text-2xl font-bold text-[#1C3324] md:text-3xl flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B263E]" />
            ۳. ستایشِ زیبایی و هنر
          </h2>
          <p className="mb-8 text-base md:text-lg">
            زیبایی در نگاه سروین، پیچیدگی‌های بی‌مورد نیست؛ بلکه خلوصِ خطوط مینیمال و ظرافتِ هنر دست است. هر قطعه‌ای که از کارگاه ما بیرون می‌آید، تقدیر از هنر دست‌ساز و ستایشِ حضورِ انسان‌هایی است که زیبایی را در سادگی جستجو می‌کنند.
          </p>

          <blockquote className="my-12 border-r-4 border-[#8B263E] pr-6 py-3 bg-[#F4F6F4] rounded-l-2xl text-xl font-bold leading-10 text-[#1C3324]">
            «طلا برای هر قصه‌ای؛ از شروع یک زندگی مشترک، تا یادآوری این حقیقت که: من نیز ارزشمندم.»
          </blockquote>

          <h2 className="mb-4 mt-16 text-2xl font-bold text-[#1C3324] md:text-3xl">
            قصه‌ای که با حضور شما کامل می‌شود
          </h2>

          <p className="mb-8 text-base md:text-lg">
            سروین استودیو تنها یک گالری نیست؛ فضایی است برای خلق خاطراتی که سال‌ها بعد، وقتی به آن‌ها نگاه می‌کنید، لبخند اصالت بر لبانتان بنشیند. ما در کنار شما هستیم تا بهترین انتخاب را برای ثبت لحظه‌های ناب زندگی‌تان داشته باشید.
          </p>

          <div className="mt-20 border-t border-[#1C3324]/10 pt-12 text-center">
            <p className="text-xl font-bold leading-9 text-[#1C3324]">
              این روایتِ سرو، سایه و ستایش است.
              <br />
              <span className="text-[#8B263E]">اما قصه‌ی اصلی را شما با انتخاب‌هایتان می‌نویسید.</span>
            </p>

            <p className="mt-6 text-sm text-[#3A5A46] font-medium">
              استودیو سروین؛ اصالتِ ماندگار در هر قطعه طلا.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}