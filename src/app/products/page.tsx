import { Suspense } from "react";
import type { Metadata } from "next";
import ProductsPageClient from "@/components/ProductsPageClient";

import {
  mapPocketBaseProduct,
  type PocketBaseProductRecord,
} from "@/lib/products";

import pb from "@/lib/pocketbase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ویترین طلای ۱۸ عیار | گالری طلا پرنا زر",
  description: "مشاهده و خرید آنلاین تمامی دست‌ساخته‌های طلای ۱۸ عیار پرنا زر، شامل انگشتر، گردنبند، دستبند، النگو و گوشواره با امکان خرید در ۳ قسط ماهانه به قیمت روز طلا بدون سود و کارمزد.",
  alternates: {
    canonical: "/products",
  },
  openGraph: {
    title: "ویترین طلای ۱۸ عیار | گالری طلا پرنا زر",
    description: "خرید آنلاین انواع دست‌ساخته‌های طلا با طرح ویژه ۳ قسط به نرخ روز بدون سود و کارمزد.",
    url: "https://parnazar.ir/products",
    images: [{ url: "/banner.webp", width: 1200, height: 630, alt: "ویترین گالری طلا پرنا زر" }],
  },
};

export default async function ProductsPage() {
  try {
    const [records, categories] = await Promise.all([
      pb.collection("products").getFullList<PocketBaseProductRecord>({
        sort: "-created",
        expand: "category",
        requestKey: null,
      }),
      pb
        .collection("categories")
        .getFullList<{ id: string; name: string; slug: string; icon?: string }>({
          sort: "slug",
          requestKey: null,
        })
        .catch(() => []),
    ]);

    const products = records.map(mapPocketBaseProduct);

    return (
      <Suspense fallback={<div className="min-h-screen pt-44 text-center">در حال بارگذاری آثار...</div>}>
        <ProductsPageClient
          initialProducts={products}
          availableCategories={categories}
        />
      </Suspense>
    );
  } catch (error) {
    console.error(
      "ERROR FETCHING PRODUCTS FROM POCKETBASE:",
      error,
    );

    return (
      <Suspense fallback={<div className="min-h-screen pt-44 text-center">در حال بارگذاری آثار...</div>}>
        <ProductsPageClient
          initialProducts={[]}
          availableCategories={[]}
        />
      </Suspense>
    );
  }
}