import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Calendar,
  Clock,
  User,
  ArrowRight,
  Sparkles,
  Eye,
  Tag,
  ChevronLeft,
  BookOpen,
  ShieldCheck,
  Gem,
} from "lucide-react";
import pb from "@/lib/pocketbase";
import BlogShareButtons from "@/components/BlogShareButtons";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
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

async function getPostBySlug(slug: string): Promise<PocketBaseBlogPost | null> {
  const decoded = decodeURIComponent(slug).trim();
  try {
    const records = await pb.collection("blog_posts").getFullList<PocketBaseBlogPost>({
      filter: `slug = "${decoded}" || id = "${decoded}"`,
      requestKey: null,
    });
    if (records.length > 0) return records[0];
  } catch (e) {
    console.error("Error fetching blog post by slug:", e);
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "مقاله یافت نشد | مجله پرنا زر",
      description: "مقاله مورد نظر در مجله تخصصی گالری طلا پرنا زر یافت نشد.",
    };
  }

  const title = `${post.title} | مجله پرنا زر`;
  const desc = post.excerpt || `مقاله تخصصی ${post.title} در مجله طلا پرنا زر.`;
  const img = post.image || "https://parnazar.ir/banner.webp";
  const canonicalUrl = `https://parnazar.ir/blog/${post.slug || post.id}`;

  return {
    title,
    description: desc,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description: desc,
      url: canonicalUrl,
      type: "article",
      publishedTime: post.created,
      modifiedTime: post.updated,
      authors: [post.author || "تحریریه پرنا زر"],
      images: [
        {
          url: img.startsWith("http") ? img : `https://parnazar.ir${img}`,
          width: 1200,
          height: 630,
          alt: `${post.title} - پرنا زر`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [img],
    },
  };
}

export default async function BlogPostDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // افزایش آرام بازدیدها در پس‌زمینه
  try {
    pb.collection("blog_posts")
      .update(post.id, {
        views: (post.views || 0) + 1,
      })
      .catch(() => {});
  } catch {}

  // دریافت مقالات مرتبط از همان دسته‌بندی
  let relatedPosts: PocketBaseBlogPost[] = [];
  try {
    const list = await pb.collection("blog_posts").getList<PocketBaseBlogPost>(1, 3, {
      filter: `published = true && id != "${post.id}"`,
      sort: "-sort_order",
      requestKey: null,
    });
    relatedPosts = list.items;
  } catch {}

  const postDate = formatPersianDate(post.created);
  const shareUrl = `https://parnazar.ir/blog/${post.slug || post.id}`;

  const tagsList = post.tags
    ? post.tags
        .split(/[,،]/)
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  // داده‌های ساختاریافته (Schema.org) برای مقاله
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${shareUrl}#article`,
        headline: post.title,
        description: post.excerpt,
        image: post.image || "https://parnazar.ir/banner.webp",
        datePublished: post.created,
        dateModified: post.updated,
        author: {
          "@type": "Person",
          name: post.author || "تحریریه گالری پرنا زر",
        },
        publisher: {
          "@type": "Organization",
          name: "گالری طلا پرنا زر",
          url: "https://parnazar.ir",
          logo: {
            "@type": "ImageObject",
            url: "https://parnazar.ir/banner.webp",
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": shareUrl,
        },
        keywords: post.tags,
        articleSection: post.category,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${shareUrl}#breadcrumb`,
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
            name: "مجله تخصصی",
            item: "https://parnazar.ir/blog",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: shareUrl,
          },
        ],
      },
    ],
  };

  // رندر متن مقاله با پاراگراف‌ها و هدینگ‌های فرمت‌یافته
  const renderContent = (content?: string) => {
    if (!content) return null;

    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let currentParagraph: string[] = [];

    const flushParagraph = (idx: number) => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(" ");
        elements.push(
          <p key={`p-${idx}`} className="text-sm sm:text-base leading-[2.1] text-zinc-700 dark:text-zinc-300 font-normal mb-5">
            {text}
          </p>
        );
        currentParagraph = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("### ")) {
        flushParagraph(idx);
        elements.push(
          <h3 key={`h3-${idx}`} className="text-base sm:text-lg font-black text-[#3B0B14] dark:text-[#DFB76C] font-heading mt-8 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-[#DFB76C]" />
            <span>{trimmed.replace("### ", "")}</span>
          </h3>
        );
      } else if (trimmed.startsWith("## ")) {
        flushParagraph(idx);
        elements.push(
          <h2 key={`h2-${idx}`} className="text-lg sm:text-xl md:text-2xl font-black text-[#3B0B14] dark:text-white font-heading mt-10 mb-4 pb-2 border-b border-[#DFB76C]/20">
            {trimmed.replace("## ", "")}
          </h2>
        );
      } else if (trimmed.startsWith("> ")) {
        flushParagraph(idx);
        elements.push(
          <blockquote key={`bq-${idx}`} className="my-6 p-4 sm:p-5 rounded-2xl bg-[#DFB76C]/10 border-r-4 border-[#DFB76C] text-xs sm:text-sm text-[#3B0B14] dark:text-zinc-200 leading-relaxed font-medium">
            {trimmed.replace("> ", "")}
          </blockquote>
        );
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        flushParagraph(idx);
        elements.push(
          <li key={`li-${idx}`} className="mr-5 text-sm sm:text-base leading-relaxed text-zinc-700 dark:text-zinc-300 mb-2 list-disc list-inside">
            {trimmed.replace(/^[-*]\s+/, "")}
          </li>
        );
      } else if (trimmed === "") {
        flushParagraph(idx);
      } else {
        currentParagraph.push(trimmed);
      }
    });

    flushParagraph(lines.length);
    return elements;
  };

  return (
    <article
      dir="rtl"
      className="min-h-screen bg-[#FAF8F5] dark:bg-[#120306] text-[#3B0B14] dark:text-zinc-100 font-sans pb-28 pt-36 sm:pt-44 lg:pt-48 transition-colors duration-300"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* نوار ناوبری بالا و خرده نان */}
        <nav aria-label="Breadcrumb" className="flex items-center justify-between gap-3 text-xs text-[#6E3A44] dark:text-zinc-400 mb-8 pb-4 border-b border-[#DFB76C]/20">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <Link href="/" className="hover:text-[#8B142D] dark:hover:text-[#DFB76C] transition-colors shrink-0">
              صفحه اصلی
            </Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-[#8B142D] dark:hover:text-[#DFB76C] transition-colors shrink-0">
              مجله تخصصی
            </Link>
            <span>/</span>
            <span className="text-[#3B0B14] dark:text-zinc-200 font-bold truncate">
              {post.title}
            </span>
          </div>

          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#8B142D] dark:text-[#DFB76C] hover:underline shrink-0"
          >
            <span>بازگشت به مقالات</span>
            <ArrowRight size={14} />
          </Link>
        </nav>

        {/* سربرگ اصلی مقاله */}
        <header className="space-y-4 mb-8">
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-black px-3 py-1 bg-[#3B0B14] text-[#DFB76C] dark:bg-[#DFB76C] dark:text-[#140508] rounded-full shadow-xs">
              {post.category || "دانستنی‌های طلا"}
            </span>
            {post.featured && (
              <span className="flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 bg-[#DFB76C]/20 text-[#8B142D] dark:text-[#DFB76C] rounded-full border border-[#DFB76C]/40">
                <Sparkles size={12} />
                <span>مقاله برگزیده</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#3B0B14] dark:text-white font-heading leading-tight tracking-tight">
            {post.title}
          </h1>

          {/* نوار متای اطلاعات نویسنده، زمان و تاریخ */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 pb-4 border-y border-[#DFB76C]/20 text-xs text-[#6E3A44] dark:text-zinc-300">
            <div className="flex flex-wrap items-center gap-4">
              {post.author && (
                <span className="flex items-center gap-1.5 font-bold text-[#3B0B14] dark:text-white">
                  <User size={14} className="text-[#DFB76C]" />
                  <span>{post.author}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-[#DFB76C]" />
                <span>{postDate}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-[#DFB76C]" />
                <span>مطالعه در {post.read_time || "۵ دقیقه"}</span>
              </span>
              {post.views !== undefined && (
                <span className="flex items-center gap-1.5 font-mono">
                  <Eye size={14} className="text-[#DFB76C]" />
                  <span>{post.views.toLocaleString("fa-IR")} بازدید</span>
                </span>
              )}
            </div>

            <BlogShareButtons title={post.title} url={shareUrl} />
          </div>

        </header>

        {/* تصویر شاخص اصلی مقاله */}
        {post.image && (
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[2rem] bg-[#FBF7F0] dark:bg-black/30 border border-[#DFB76C]/30 shadow-[0_12px_40px_rgba(59,11,20,0.08)] mb-10">
            <img
              src={post.image}
              alt={post.title}
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
        )}

        {/* چکیده و خلاصه مقاله در کادر متمایز */}
        {post.excerpt && (
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#1C080E] border-r-4 border-[#DFB76C] border-t border-b border-l border-[#DFB76C]/20 shadow-xs mb-8">
            <p className="text-sm sm:text-base leading-relaxed text-[#3B0B14] dark:text-zinc-200 font-bold">
              {post.excerpt}
            </p>
          </div>
        )}

        {/* بدنه و متن کامل مقاله */}
        <div className="prose prose-stone dark:prose-invert max-w-none mb-12">
          {renderContent(post.content)}
        </div>

        {/* برچسب‌های مقاله */}
        {tagsList.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-6 pb-6 border-t border-[#DFB76C]/20 mb-10">
            <span className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400 flex items-center gap-1.5">
              <Tag size={14} className="text-[#DFB76C]" />
              <span>برچسب‌ها:</span>
            </span>
            {tagsList.map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1 rounded-full bg-white dark:bg-[#1C080E] text-[#8B142D] dark:text-[#DFB76C] border border-[#DFB76C]/30 font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* باکس معرفی گالری پرنا زر در انتهای مقاله */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#2E050D] via-[#200409] to-[#140206] text-white border border-[#DFB76C]/40 shadow-xl mb-14 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-right">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#DFB76C]">
              <Sparkles size={14} />
              <span>گالری طلا پرنا زر</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black font-heading text-white">
              «مثل زر بدرخش» — خرید آنلاین و اقساطی طلای ۱۸ عیار
            </h3>
            <p className="text-xs text-zinc-300 max-w-xl leading-relaxed">
              طرح ویژه خرید در ۳ قسط ماهانه بدون سود و کارمزد به نرخ روز طلا همراه با فاکتور رسمی معتبر اتحادیه.
            </p>
          </div>

          <Link
            href="/products"
            className="px-6 py-3 rounded-full bg-[#DFB76C] hover:bg-white text-[#140508] text-xs font-black transition-all shrink-0 shadow-md"
          >
            مشاهده ویترین طلا ←
          </Link>
        </div>

        {/* مقالات مرتبط */}
        {relatedPosts.length > 0 && (
          <section className="pt-8 border-t border-[#DFB76C]/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg sm:text-xl font-black text-[#3B0B14] dark:text-white font-heading">
                سایر مطالب مجله پرنا زر
              </h3>
              <Link
                href="/blog"
                className="text-xs font-bold text-[#8B142D] dark:text-[#DFB76C] hover:underline"
              >
                مشاهده همه مقالات ←
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {relatedPosts.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/blog/${rel.slug || rel.id}`}
                  className="group block p-4 rounded-2xl bg-white dark:bg-[#1C080E] border border-[#DFB76C]/20 hover:border-[#DFB76C] transition-all shadow-2xs"
                >
                  <div className="aspect-[16/10] overflow-hidden rounded-xl bg-[#FAF8F5] mb-3">
                    <img
                      src={rel.image || "/banner.webp"}
                      alt={rel.title}
                      className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-300"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-[#8B142D] dark:text-[#DFB76C] block mb-1">
                    {rel.category || "دانستنی‌ها"}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-[#3B0B14] dark:text-zinc-100 group-hover:text-[#8B142D] dark:group-hover:text-[#DFB76C] transition-colors line-clamp-2 leading-snug">
                    {rel.title}
                  </h4>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </article>
  );
}
