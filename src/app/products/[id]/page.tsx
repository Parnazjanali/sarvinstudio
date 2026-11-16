import { notFound } from "next/navigation";
import type { Metadata } from "next";

import ProductBreadcrumb from "./ProductBreadCrumb";
import ProductDetailView from "./ProductDetailView";

import {
  getGoldGramPrice,
  getProductById,
  getProductTitle,
  calcProductPrice,
} from "@/lib/product-detail";
import { getPbFileUrl } from "@/lib/format";

type ProductDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    return {
      title: "اثر یافت نشد | گالری طلا پرنا زر",
      description: "اثر مورد نظر در گالری طلا پرنا زر یافت نشد.",
    };
  }

  const title = getProductTitle(product);
  const weightStr = product.weight ? ` به وزن ${product.weight} گرم` : "";
  const karatStr = product.karat ? ` با عیار استاندارد ${product.karat}` : " ۱۸ عیار";
  const desc =
    product.short_detail ||
    product.description ||
    `خرید آنلاین ${title} دست‌ساز طلای${karatStr}${weightStr} با فاکتور رسمی معتبر و امکان پرداخت در ۳ قسط به نرخ روز طلا بدون کارمزد در گالری پرنا زر.`;

  let imageUrl = "https://parnazar.ir/banner.webp";
  if (product.images && product.images.length > 0) {
    const firstImg = product.images[0];
    if (firstImg.startsWith("http")) {
      imageUrl = firstImg;
    } else {
      imageUrl = getPbFileUrl("products", product.id, firstImg);
    }
  }

  return {
    title: `${title} | گالری طلا پرنا زر`,
    description: desc,
    alternates: {
      canonical: `/products/${id}`,
    },
    openGraph: {
      title: `${title} | گالری طلا پرنا زر`,
      description: desc,
      url: `https://parnazar.ir/products/${id}`,
      type: "article",
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 800,
          alt: `${title} - گالری طلا پرنا زر`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | پرنا زر`,
      description: desc,
      images: [imageUrl],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { id } = await params;

  const product = await getProductById(id);

  if (product === null) {
    notFound();
  }

  const goldGramPrice = await getGoldGramPrice();
  const title = getProductTitle(product);

  let imageUrl = "https://parnazar.ir/banner.webp";
  if (product.images && product.images.length > 0) {
    const firstImg = product.images[0];
    if (firstImg.startsWith("http")) {
      imageUrl = firstImg;
    } else {
      imageUrl = getPbFileUrl("products", product.id, firstImg);
    }
  }

  const priceCalc = calcProductPrice(product, goldGramPrice);
  const finalPrice = priceCalc?.total || product.price || 0;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `https://parnazar.ir/products/${id}#product`,
        name: title,
        description: product.short_detail || product.description || `خرید ${title} طلای ۱۸ عیار پرنا زر`,
        image: [imageUrl],
        sku: product.sku || id,
        category: "طلا و زیورآلات",
        brand: {
          "@type": "Brand",
          name: "پرنا زر",
        },
        offers: {
          "@type": "Offer",
          url: `https://parnazar.ir/products/${id}`,
          priceCurrency: "IRR",
          price: finalPrice > 0 ? finalPrice * 10 : 0, // تبدیل تومان به ریال برای استاندارد اسکیما
          availability:
            product.stock !== null && product.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/PreOrder",
          itemCondition: "https://schema.org/NewCondition",
          seller: {
            "@type": "Organization",
            name: "گالری طلا پرنا زر",
          },
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `https://parnazar.ir/products/${id}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "صفحه اصلی",
            item: "https://parnazar.ir",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "ویترین طلا",
            item: "https://parnazar.ir/products",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: title,
            item: `https://parnazar.ir/products/${id}`,
          },
        ],
      },
    ],
  };

  return (
    <div className="relative min-h-screen bg-[#FAF8F5] dark:bg-[#120306] transition-colors duration-300 overflow-x-hidden">
      {/* گرادیانت لوکس ملایم در بالای صفحه برای اتصال هماهنگ هدر تیره به محتوای محصول */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-[#1E050A] via-[#3B0B14]/15 to-transparent dark:from-[#0D0204] dark:via-[#1A0307] dark:to-transparent" />
      <div className="pointer-events-none absolute top-20 right-1/4 h-80 w-80 rounded-full bg-[#DFB76C]/10 blur-[100px]" />
      <div className="pointer-events-none absolute top-40 left-1/4 h-72 w-72 rounded-full bg-[#8B142D]/8 blur-[90px]" />

      <main className="relative mx-auto max-w-7xl px-3.5 sm:px-6 lg:px-8 pb-24 pt-28 sm:pt-36 lg:pt-42">
        {/* اسکیما نشانه گذاری محصول و خرده نان (Breadcrumb) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />

        <ProductBreadcrumb productTitle={title} />

        <ProductDetailView product={product} goldGramPrice={goldGramPrice} />
      </main>
    </div>
  );
}
