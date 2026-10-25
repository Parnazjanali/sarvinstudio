import { notFound } from "next/navigation";
import type { Metadata } from "next";

import pb from "@/lib/pocketbase";
import { mapPocketBaseProduct, type PocketBaseProductRecord } from "@/lib/products";
import CollectionDetailClient, { type ExclusiveCollection } from "@/components/collections/CollectionDetailClient";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

const FALLBACK_COLLECTIONS: Record<string, ExclusiveCollection> = {
  nasima: {
    id: "nasima",
    title: "کالکشن نسیما",
    slug: "nasima",
    subtitle: "لطافت باد ملایم و انحناهای طلایی",
    description: "ترکیب انحناهای ارگانیک و درخشش طلای ۱۸ عیار با الهام از نسیم بهاری بر شاخه‌های سرو.",
    story: "در طراحی کالکشن نسیما، از حرکت سیال و رقص باد در میان شاخه‌های سرو الهام گرفته‌ایم. هر قطعه با ظرافتی مثال‌زدنی و پولیش آینه‌ای ساخته شده تا نوری نرم و دلنشین بازتاب دهد و هویتی مدرن و بی‌تکرار به استایل شما ببخشد.",
    image: "/banner.webp",
    featured: true,
  },
  sahra: {
    id: "sahra",
    title: "کالکشن صحرا",
    slug: "sahra",
    subtitle: "گرما، شکوه و وسعت بیکران افق",
    description: "بافت‌های طلایی مات و خطوط مواج الهام‌گرفته از تپه‌های ماسه‌ای کویر.",
    story: "کالکشن صحرا بازتابی از سکوت و عظمت کویر لوت است. بافت‌های شنی و مات‌کاری‌های دستی در کنار تراش‌های براق طلای زرد، حسی از اصالت خاورمیانه‌ای و گرمای بی‌پایان به همراه دارند.",
    image: "/header.webp",
    featured: true,
  },
  delbar: {
    id: "delbar",
    title: "کالکشن دلبر",
    slug: "delbar",
    subtitle: "عناوین ظریف، عاشقانه و مینیمال",
    description: "قطعات سبک، احساسی و مناسب استفاده روزمره و هدیه‌های خاص.",
    story: "دلبر برای کسانی طراحی شده که زیبایی را در سادگی مطلق جستجو می‌کنند. خطوط مینیمال، نگین‌های درخشان و اتصالات دست‌ساز اختصاصی، این مجموعه را انتخابی جاودانه برای هر روز زندگی بدل کرده است.",
    image: "/gold.webp",
    featured: true,
  },
  arona: {
    id: "arona",
    title: "کالکشن آرونا",
    slug: "arona",
    subtitle: "شکوه سنگ‌های اصیل و زرگری کلاسیک",
    description: "هم‌نشینی یاقوت، زمرد و مروارید با طلای ۱۸ عیار و مخراج‌کاری فاخر.",
    story: "آرونا روایت هنر فاخر و سلطنتی است؛ شاهکارهایی با دست‌سازه‌های پرکار و مخراج‌کاری استادانه که پیوندی میان گذشته‌ی پرشکوه ایران و هنر معاصر طلاسازی برقرار می‌سازد.",
    image: "/banner.webp",
    featured: true,
  },
  sarv: {
    id: "sarv",
    title: "کالکشن سرو",
    slug: "sarv",
    subtitle: "نماد استواری، حیات و جاودانگی",
    description: "مجموعه امضا و پرچمدار پرنا زر، با نماد سرو ایرانی.",
    story: "سرو در فرهنگ ایرانی نماد آزادگی، پایداری و جاودانگی است. این کالکشن اختصاصی هویت بصری پرنا زر را در قالب گوشواره‌ها، پلاک‌ها و دستبندهای فاخر به تصویر می‌کشد.",
    image: "/header.webp",
    featured: true,
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).toLowerCase();

  try {
    const records = await pb.collection("exclusive_collections").getFullList<ExclusiveCollection>({
      filter: `slug = "${decodedSlug}" || id = "${decodedSlug}"`,
      requestKey: null,
    });
    if (records.length > 0) {
      return {
        title: `${records[0].title} | پرنا زر - مثل زر بدرخش`,
        description: records[0].description || records[0].subtitle,
      };
    }
  } catch {}

  const fallback = FALLBACK_COLLECTIONS[decodedSlug];
  if (fallback) {
    return {
      title: `${fallback.title} | پرنا زر - مثل زر بدرخش`,
      description: fallback.description || fallback.subtitle,
    };
  }

  return {
    title: "کالکشن اختصاصی | پرنا زر - مثل زر بدرخش",
  };
}

export default async function CollectionDetailPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).toLowerCase();

  let collection: ExclusiveCollection | null = null;
  let allCollections: ExclusiveCollection[] = [];
  let productRecords: PocketBaseProductRecord[] = [];

  try {
    const [cols, prods] = await Promise.all([
      pb.collection("exclusive_collections").getFullList<ExclusiveCollection>({
        sort: "sort_order",
        requestKey: null,
      }).catch(() => []),
      pb.collection("products").getFullList<PocketBaseProductRecord>({
        sort: "-created",
        expand: "category",
        requestKey: null,
      }).catch(() => []),
    ]);

    allCollections = cols;
    collection = cols.find((c) => c.slug === decodedSlug || c.id === decodedSlug) || null;
    productRecords = prods;
  } catch (error) {
    console.error("Error fetching collection detail:", error);
  }

  // اگر هنوز در پایگاه داده نبود، از فال‌بک استفاده کن
  if (!collection) {
    collection = FALLBACK_COLLECTIONS[decodedSlug] || null;
  }

  if (!collection) {
    notFound();
  }

  // فیلتر کردن محصولات متعلق به این کالکشن
  const mappedProducts = productRecords
    .map(mapPocketBaseProduct)
    .filter((p) => {
      const pCol = String(p.collection_slug || "").toLowerCase();
      const pTitle = String(p.title || "").toLowerCase();
      const pDesc = String(p.description || "").toLowerCase();
      const target = collection!.slug.toLowerCase();
      const targetFa = collection!.title.replace("کالکشن", "").trim();

      return (
        pCol === target ||
        pTitle.includes(target) ||
        pDesc.includes(target) ||
        (targetFa && pTitle.includes(targetFa))
      );
    });

  // سایر کالکشن‌ها برای بخش پیشنهادی پایین صفحه
  const otherCollections = (allCollections.length > 0 ? allCollections : Object.values(FALLBACK_COLLECTIONS))
    .filter((c) => c.slug !== collection!.slug)
    .slice(0, 4);

  return (
    <CollectionDetailClient
      collection={collection}
      products={mappedProducts}
      otherCollections={otherCollections}
    />
  );
}
