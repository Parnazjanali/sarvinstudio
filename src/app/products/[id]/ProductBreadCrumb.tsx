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
      className="mb-8 rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-3 shadow-xs"
    >
      <ol className="flex flex-wrap items-center gap-2 text-sm text-[#3A5A46]">
        <li>
          <Link
            href="/"
            className="transition-colors hover:text-[#8B263E] font-medium"
          >
            خانه
          </Link>
        </li>

        <li aria-hidden="true">
          <ChevronLeft
            size={16}
            className="text-[#1C3324]/40"
          />
        </li>

        <li>
          <Link
            href="/products"
            className="transition-colors hover:text-[#8B263E] font-medium"
          >
            محصولات
          </Link>
        </li>

        <li aria-hidden="true">
          <ChevronLeft
            size={16}
            className="text-[#1C3324]/40"
          />
        </li>

        <li
          aria-current="page"
          title={productTitle}
          className="max-w-[220px] truncate font-black text-[#1C3324] sm:max-w-[320px]"
        >
          {productTitle}
        </li>
      </ol>
    </nav>
  );
}