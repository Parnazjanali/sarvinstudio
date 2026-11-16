import Link from "next/link";
import { Gem } from "lucide-react";

export default function ProductNotFound() {
  return (
    <main
      dir="rtl"
      className="flex min-h-[70vh] items-center justify-center bg-[#FDF8F9] px-4 py-16"
    >
      <div className="w-full max-w-md rounded-3xl border border-[#3B0B14]/15 bg-white p-8 text-center shadow-xs">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#3B0B14]/5 text-[#8B142D]">
          <Gem size={28} />
        </div>

        <h1 className="mb-2 text-2xl font-black text-[#3B0B14]">
          محصول پیدا نشد
        </h1>

        <p className="mb-6 text-sm leading-7 text-[#6E3A44]">
          محصول موردنظر شما وجود ندارد.
        </p>

        <Link
          href="/products"
          className="inline-flex w-full items-center justify-center rounded-2xl bg-[#3B0B14] px-5 py-3.5 text-xs font-black text-white shadow-sm transition hover:bg-[#8B142D]"
        >
          مشاهده همه آثار پرنا زر
        </Link>
      </div>
    </main>
  );
}