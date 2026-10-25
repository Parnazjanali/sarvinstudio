import { Suspense } from "react";
import ProductsPageClient from "@/components/ProductsPageClient";

import {
  mapPocketBaseProduct,
  type PocketBaseProductRecord,
} from "@/lib/products";

import pb from "@/lib/pocketbase";

export const dynamic = "force-dynamic";

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