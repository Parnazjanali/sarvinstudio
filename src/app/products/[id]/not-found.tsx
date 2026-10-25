import Link from "next/link";
import { Gem } from "lucide-react";

export default function ProductNotFound() {
  return (
    <main
      dir="rtl"
      className="flex min-h-[70vh] items-center justify-center bg-[#FAF9F6] px-4 py-16"
    >
      <div className="w-full max-w-md rounded-3xl border border-[#1C3324]/15 bg-white p-8 text-center shadow-xs">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1C3324]/5 text-[#8B263E]">
          <Gem size={28} />
        </div>

        <h1 className="mb-2 text-2xl font-black text-[#1C3324]">
          محصول پیدا نشد
        </h1>

        <p className="mb-6 text-sm leading-7 text-[#3A5A46]">
          محصول موردنظر شما وجود ندارد.
        </p>

        <Link
          href="/products"
          className="inline-flex w-full items-center justify-center rounded-2xl bg-[#1C3324] px-5 py-3.5 text-xs font-black text-white shadow-sm transition hover:bg-[#8B263E]"
        >
          مشاهده همه آثار پرنا زر
        </Link>
      </div>
    </main>
  );
}