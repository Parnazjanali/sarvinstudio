import type { Metadata } from "next";
import { Sparkles, BookOpen } from "lucide-react";
import BlogList, { BlogPost } from "@/components/BlogList";
import pb from "@/lib/pocketbase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "مجله تخصصی طلا | گالری طلا پرنا زر",
  description:
    "دانش، ظرافت و درخشش در دنیای طلای ۱۸ عیار. راهنمای خرید طلا، تشخیص اصالت عیار و تحلیل فرمول محاسبه قیمت طلا.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "مجله تخصصی طلا | گالری طلا پرنا زر",
    description:
      "جدیدترین راهنماهای خرید طلا، نکات نگهداری طلا و تحلیل ترندهای زرگری ایران.",
    url: "https://parnazar.ir/blog",
    images: [
      {
        url: "/banner.webp",
        width: 1200,
        height: 630,
        alt: "مجله تخصصی گالری طلا پرنا زر - مثل زر بدرخش",
      },
    ],
  },
};

type PocketBaseBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  category?: string;
  author?: string;
  read_time?: string;
  image?: string;
  featured?: boolean;
  published?: boolean;
  views?: number;
  tags?: string;
  created: string;
  updated: string;
};

function formatPersianDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "اخیراً";
    return d.toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "اخیراً";
  }
}

export default async function BlogPage() {
  let posts: BlogPost[] = [];

  try {
    const records = await pb.collection("blog_posts").getFullList<PocketBaseBlogPost>({
      filter: "published = true",
      sort: "-featured,-sort_order",
      requestKey: null,
    });

    posts = records.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt || "",
      content: r.content || "",
      category: r.category || "دانستنی‌های طلا",
      author: r.author || "تحریریه پرنا زر",
      date: formatPersianDate(r.created),
      readTime: r.read_time || "۵ دقیقه",
      imageUrl: r.image || "/banner.webp",
      featured: Boolean(r.featured),
      views: r.views || 0,
      tags: r.tags || "",
    }));
  } catch (error) {
    console.error("Error fetching blog posts from PocketBase:", error);
  }

  // Schema.org JSON-LD for Blog
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": "https://parnazar.ir/blog#blog",
        name: "مجله تخصصی گالری طلا پرنا زر",
        description:
          "مجموعه مقالات تخصصی، راهنمای خرید طلا و ترندهای طراحی طلا.",
        publisher: {
          "@type": "Organization",
          name: "گالری طلا پرنا زر",
          url: "https://parnazar.ir",
          logo: "https://parnazar.ir/banner.webp",
        },
        inLanguage: "fa-IR",
        blogPost: posts.map((post) => ({
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          url: `https://parnazar.ir/blog/${post.slug || post.id}`,
          image: post.imageUrl,
          author: {
            "@type": "Person",
            name: post.author,
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://parnazar.ir/blog#breadcrumb",
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
            name: "مجله تخصصی طلا",
            item: "https://parnazar.ir/blog",
          },
        ],
      },
    ],
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#FAF8F5] dark:bg-[#120306] text-[#3B0B14] dark:text-zinc-100 font-sans pb-28 pt-36 sm:pt-44 lg:pt-48 transition-colors duration-300"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />

      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* هدر باشکوه بخش وبلاگ */}
        <header className="text-center max-w-3xl mx-auto mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#DFB76C]/15 dark:bg-[#DFB76C]/10 px-4 py-1.5 text-xs font-black text-[#8B142D] dark:text-[#DFB76C] mb-4 border border-[#DFB76C]/35">
            <Sparkles size={14} className="text-[#DFB76C]" />
            <span>مجله و دانستنی‌های پرنا زر</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#3B0B14] dark:text-white tracking-tight font-heading leading-tight mb-4">
            دانش، ظرافت و درخشش در دنیای طلا
          </h1>

          <p className="text-xs sm:text-sm md:text-base leading-relaxed text-[#6E3A44] dark:text-zinc-300 font-medium">
            جدیدترین راهنماهای خرید طلای ۱۸ عیار، شیوه‌های نگهداری سنگ‌های قیمتی، تحلیل فرمول قیمت‌گذاری و ترندهای طراحی طلا را در پرنا زر بخوانید.
          </p>
        </header>

        {/* لیست و فیلتر مقالات */}
        <BlogList posts={posts} />

      </div>
    </main>
  );
}
