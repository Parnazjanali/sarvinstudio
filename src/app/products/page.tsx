import ProductsPageClient from "@/components/ProductsPageClient";

import {
  mapPocketBaseProduct,
  type PocketBaseProductRecord,
} from "@/lib/products";

import pb from "@/lib/pocketbase";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  try {
    const records =
      await pb
        .collection("products")
        .getFullList<PocketBaseProductRecord>({
          sort: "-created",
          requestKey: null,
        });

    console.log(
      "POCKETBASE PRODUCT RECORDS:",
      JSON.stringify(records, null, 2),
    );

    const products = records.map(mapPocketBaseProduct);

    console.log(
      "MAPPED PRODUCTS:",
      JSON.stringify(products, null, 2),
    );

    return (
      <ProductsPageClient
        initialProducts={products}
      />
    );
  } catch (error) {
    console.error(
      "ERROR FETCHING PRODUCTS FROM POCKETBASE:",
      error,
    );

    return (
      <ProductsPageClient
        initialProducts={[]}
      />
    );
  }
}