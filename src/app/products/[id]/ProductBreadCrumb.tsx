import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type ProductBreadcrumbProps = {
  productTitle: string;
};

export default function ProductBreadcrumb({
  productTitle,
}: ProductBreadcrumbProps) {
  return (
    <nav
      aria-label="breadcrumb"
      className="mb-6 rounded-2xl border border-[#DFB76C]/30 bg-white/85 dark:bg-[#1C080E]/85 backdrop-blur-md px-4 py-2.5 shadow-[0_4px_20px_rgba(59,11,20,0.03)] dark:border-white/10 transition-colors"
    >
      <ol className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#6E3A44] dark:text-zinc-400">
        <li>
          <Link
            href="/"
            className="transition-colors hover:text-[#8B142D] dark:hover:text-[#DFB76C] font-semibold"
          >
            خانه
          </Link>
        </li>

        <li aria-hidden="true">
          <ChevronLeft
            size={14}
            className="text-[#DFB76C] dark:text-zinc-600"
          />
        </li>

        <li>
          <Link
            href="/products"
            className="transition-colors hover:text-[#8B142D] dark:hover:text-[#DFB76C] font-semibold"
          >
            محصولات
          </Link>
        </li>

        <li aria-hidden="true">
          <ChevronLeft
            size={14}
            className="text-[#DFB76C] dark:text-zinc-600"
          />
        </li>

        <li
          aria-current="page"
          title={productTitle}
          className="max-w-[190px] sm:max-w-[340px] truncate font-black text-[#3B0B14] dark:text-[#E6CA7A]"
        >
          {productTitle}
        </li>
      </ol>
    </nav>
  );
}
