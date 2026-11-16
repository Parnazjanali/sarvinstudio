"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Clock,
  Calendar,
  User,
  ArrowLeft,
  Sparkles,
  BookOpen,
  Eye,
  Tag,
  ChevronLeft,
} from "lucide-react";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  category: string;
  author?: string;
  date: string;
  readTime: string;
  imageUrl: string;
  featured?: boolean;
  views?: number;
  tags?: string;
}

interface BlogListProps {
  posts: BlogPost[];
}

export default function BlogList({ posts }: BlogListProps) {
  const [activeCategory, setActiveCategory] = useState("همه مقالات");
  const [searchQuery, setSearchQuery] = useState("");

  // استخراج دسته‌بندی‌های یکتا
  const categories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => {
      if (p.category) set.add(p.category.trim());
    });
    return ["همه مقالات", ...Array.from(set)];
  }, [posts]);

  // فیلتر مقالات براساس جستجو و دسته‌بندی
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchCat =
        activeCategory === "همه مقالات" || post.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        (post.tags && post.tags.toLowerCase().includes(q));

      return matchCat && matchSearch;
    });
  }, [posts, activeCategory, searchQuery]);

  // پیدا کردن مقاله ویژه
  const featuredPost = useMemo(() => {
    return posts.find((p) => p.featured) || posts[0];
  }, [posts]);

  // مقالات معمولی (بدون تکرار مقاله ویژه اگر در فیلتر "همه" باشد و جستجو خالی باشد)
  const regularPosts = useMemo(() => {
    if (activeCategory === "همه مقالات" && !searchQuery.trim() && featuredPost) {
      return filteredPosts.filter((p) => p.id !== featuredPost.id);
    }
    return filteredPosts;
  }, [filteredPosts, activeCategory, searchQuery, featuredPost]);

  return (
    <div className="space-y-10">
      
      {/* نوار جستجو و فیلتر دسته‌بندی‌ها */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-2 border-b border-[#DFB76C]/20">
        
        {/* دکمه‌های فیلتر دسته‌بندی */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            const count =
              cat === "همه مقالات"
                ? posts.length
                : posts.filter((p) => p.category === cat).length;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? "bg-[#3B0B14] text-[#DFB76C] dark:bg-[#DFB76C] dark:text-[#140508] shadow-md border border-[#DFB76C]/60 font-black scale-102"
                    : "bg-white/80 dark:bg-[#1C080E] text-[#6E3A44] dark:text-zinc-300 hover:text-[#3B0B14] hover:bg-white border border-[#DFB76C]/20"
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? "bg-[#DFB76C]/20 text-[#DFB76C] dark:bg-black/20 dark:text-[#140508]"
                      : "bg-[#FAF8F5] dark:bg-white/5 text-[#8B142D] dark:text-[#DFB76C]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* فیلد جستجوی سریع */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search
            size={16}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6E3A44] dark:text-zinc-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در مقالات و ترندها..."
            className="w-full pr-10 pl-4 py-2 text-xs rounded-full bg-white dark:bg-[#1C080E] border border-[#DFB76C]/30 focus:border-[#DFB76C] focus:ring-1 focus:ring-[#DFB76C] text-[#3B0B14] dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              پاک کردن
            </button>
          )}
        </div>

      </div>

      {/* مقاله ویژه (Featured Post Spotlight) */}
      {featuredPost && activeCategory === "همه مقالات" && !searchQuery.trim() && (
        <section className="relative">
          <div className="group relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-[#2E050D] via-[#200409] to-[#140206] text-white border border-[#DFB76C]/40 shadow-[0_20px_50px_rgba(59,11,20,0.18)] hover:border-[#DFB76C]/70 transition-all duration-500 grid md:grid-cols-12">
            
            {/* تصویر کاور مقاله ویژه */}
            <div className="md:col-span-6 relative h-64 md:h-auto overflow-hidden">
              <img
                src={featuredPost.imageUrl}
                alt={`مقاله تخصصی: ${featuredPost.title} - گالری پرنا زر`}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-106"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-l from-[#200409] via-transparent to-transparent opacity-80" />
              
              {/* نشان ویژه */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-[#DFB76C] text-[#140508] text-[11px] font-black px-3 py-1 shadow-md">
                  <Sparkles size={13} />
                  <span>برگزیده تحریریه</span>
                </span>
                <span className="rounded-full bg-[#3B0B14]/90 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 border border-white/10">
                  {featuredPost.category}
                </span>
              </div>
            </div>

            {/* محتوا و مشخصات مقاله ویژه */}
            <div className="md:col-span-6 p-6 sm:p-10 flex flex-col justify-between text-right">
              <div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-300 mb-4 pb-3 border-b border-white/10">
                  {featuredPost.author && (
                    <span className="flex items-center gap-1.5 text-[#DFB76C] font-bold">
                      <User size={14} />
                      <span>{featuredPost.author}</span>
                    </span>
                  )}
                  <span className="opacity-40">•</span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-[#DFB76C]" />
                    <span>{featuredPost.date}</span>
                  </span>
                  <span className="opacity-40">•</span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-[#DFB76C]" />
                    <span>مطالعه در {featuredPost.readTime}</span>
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white group-hover:text-[#DFB76C] transition-colors font-heading leading-tight mb-4">
                  <Link href={`/blog/${featuredPost.slug || featuredPost.id}`}>
                    {featuredPost.title}
                  </Link>
                </h2>

                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed line-clamp-3 mb-6">
                  {featuredPost.excerpt}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                {featuredPost.views !== undefined && (
                  <span className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                    <Eye size={14} className="text-[#DFB76C]" />
                    <span>{featuredPost.views.toLocaleString("fa-IR")} بازدید</span>
                  </span>
                )}

                <Link
                  href={`/blog/${featuredPost.slug || featuredPost.id}`}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#DFB76C] hover:bg-white text-[#140508] text-xs font-black transition-all shadow-md group/btn"
                >
                  <span>ادامه مطالعه مقاله</span>
                  <ArrowLeft size={14} className="group-hover/btn:-translate-x-1 transition-transform" />
                </Link>
              </div>

            </div>

          </div>
        </section>
      )}

      {/* گرید مقالات */}
      <section>
        {filteredPosts.length === 0 ? (
          <div className="py-20 text-center rounded-3xl border border-dashed border-[#DFB76C]/30 bg-white/50 dark:bg-[#1C080E]/50 p-8 space-y-3">
            <BookOpen size={40} className="mx-auto text-[#8B142D] dark:text-[#DFB76C] opacity-40" />
            <h3 className="text-base font-bold text-[#3B0B14] dark:text-white">
              مقاله‌ای یافت نشد
            </h3>
            <p className="text-xs text-[#6E3A44] dark:text-zinc-400">
              هیچ مطلبی مطابق با عبارت «{searchQuery}» در دسته‌بندی «{activeCategory}» پیدا نشد.
            </p>
            <button
              onClick={() => {
                setActiveCategory("همه مقالات");
                setSearchQuery("");
              }}
              className="mt-2 text-xs font-bold text-[#8B142D] dark:text-[#DFB76C] hover:underline cursor-pointer"
            >
              مشاهده تمامی مقالات ←
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {regularPosts.map((post) => (
              <article
                key={post.id}
                className="group flex flex-col justify-between rounded-3xl overflow-hidden bg-white dark:bg-[#1C080E] border border-[#DFB76C]/25 hover:border-[#DFB76C] transition-all duration-400 shadow-[0_4px_20px_rgba(59,11,20,0.04)] hover:shadow-[0_16px_36px_rgba(59,11,20,0.12)] p-4 sm:p-5"
              >
                <div>
                  {/* تصویر کاور با ترنزیشن زوم */}
                  <Link
                    href={`/blog/${post.slug || post.id}`}
                    className="block relative aspect-[16/10] overflow-hidden rounded-2xl bg-[#FBF7F0] dark:bg-black/30 mb-4 border border-[#DFB76C]/15"
                  >
                    <img
                      src={post.imageUrl}
                      alt={`مقاله: ${post.title} - گالری پرنا زر`}
                      className="h-full w-full object-cover group-hover:scale-106 transition-transform duration-500 ease-out"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                    {/* بج دسته‌بندی روی عکس */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="text-[10.5px] font-black px-2.5 py-1 bg-[#3B0B14]/90 dark:bg-black/90 text-[#DFB76C] backdrop-blur-md rounded-full shadow-xs border border-[#DFB76C]/30">
                        {post.category}
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 left-3 z-10 flex items-center gap-1 text-[10.5px] font-bold text-white bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md">
                      <Clock size={11} className="text-[#DFB76C]" />
                      <span>{post.readTime}</span>
                    </div>
                  </Link>

                  {/* اطلاعات متا و عنوان */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-[#6E3A44] dark:text-zinc-400 mb-2 font-medium">
                      <span>{post.date}</span>
                      {post.author && <span className="line-clamp-1">{post.author}</span>}
                    </div>

                    <h3 className="text-sm sm:text-base font-extrabold text-[#3B0B14] dark:text-zinc-100 group-hover:text-[#8B142D] dark:group-hover:text-[#DFB76C] transition-colors line-clamp-2 leading-snug font-heading mb-2.5">
                      <Link href={`/blog/${post.slug || post.id}`}>
                        {post.title}
                      </Link>
                    </h3>

                    <p className="text-xs text-[#6E3A44] dark:text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                      {post.excerpt}
                    </p>
                  </div>
                </div>

                {/* فوتر کارت مقاله */}
                <div className="pt-3 border-t border-[#DFB76C]/15 flex items-center justify-between">
                  {post.views !== undefined ? (
                    <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                      <Eye size={12} className="text-[#DFB76C]" />
                      <span>{post.views.toLocaleString("fa-IR")}</span>
                    </span>
                  ) : (
                    <span />
                  )}

                  <Link
                    href={`/blog/${post.slug || post.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#8B142D] dark:text-[#DFB76C] group-hover:underline"
                  >
                    <span>مطالعه مقاله</span>
                    <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
