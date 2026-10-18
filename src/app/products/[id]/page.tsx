import { notFound } from "next/navigation";

import ProductBreadcrumb from "./ProductBreadCrumb";
import ProductDetailView from "./ProductDetailView";

import {
  getGoldGramPrice,
  getProductById,
  getProductTitle,
} from "@/lib/product-detail";

type ProductDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { id } = await params;

  const product = await getProductById(id);

  if (product === null) {
    notFound();
  }

  const goldGramPrice =
    await getGoldGramPrice();

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-32 lg:pt-38">
      <ProductBreadcrumb
        productTitle={getProductTitle(product)}
      />

      <ProductDetailView
        product={product}
        goldGramPrice={goldGramPrice}
      />
    </main>
  );
}