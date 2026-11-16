"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  Search,
  ExternalLink,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  XCircle,
  Eye,
  Save,
  X,
  AlertCircle,
  Clock,
  Calendar,
  User,
  Image as ImageIcon,
  ArrowUpDown,
  Tag,
  Check,
  FileText,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import { recordAuditLogClient } from "@/lib/audit-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* =========================================================
   Types
========================================================= */

export interface BlogPostItem {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  category?: string;
  author?: string;
  read_time?: string;
  image?: string;
  tags?: string;
  featured?: boolean;
  published?: boolean;
  views?: number;
  sort_order?: number;
  created?: string;
  updated?: string;
}

const CATEGORY_PRESETS = [
  "راهنمای خرید",
  "نگهداری و مراقبت",
  "ترندها و استایل",
  "سرمایه‌گذاری طلا",
  "طراحی اختصاصی",
  "اخبار و دانستنی‌ها",
];

const PRESET_IMAGES = [
  { label: "جواهرات و دستبند", url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=80" },
  { label: "الماس و برلیان", url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1200&q=80" },
  { label: "دستبندهای مینیمال", url: "https://images.unsplash.com/photo-1611591475102-470e91da394e?auto=format&fit=crop&w=1200&q=80" },
  { label: "سرمایه‌گذاری و شمش", url: "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=1200&q=80" },
  { label: "بنر گالری پرنا زر", url: "/banner.webp" },
  { label: "طلای ۱۸ عیار", url: "/gold.webp" },
];

export default function DashboardBlogPage() {
  const [posts, setPosts] = useState<BlogPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "featured">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPostItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("edit");

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "راهنمای خرید",
    author: "تیم تحریریه پرنا زر",
    read_time: "۵ دقیقه",
    image: "/banner.webp",
    tags: "",
    featured: false,
    published: true,
    sort_order: 1,
  });

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<BlogPostItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* =========================================================
     Fetch Data
  ========================================================= */
  const fetchData = async () => {
    try {
      setRefreshing(true);
      const list = await pb.collection("blog_posts").getFullList<BlogPostItem>({
        sort: "-featured,-sort_order",
        requestKey: null,
      });
      setPosts(list);
    } catch (err: any) {
      console.error("Error fetching blog posts:", err);
      toast.error("خطا در بارگذاری مقالات وبلاگ");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates
    try {
      pb.collection("blog_posts").subscribe("*", (e) => {
        if (e.action === "create" || e.action === "update" || e.action === "delete") {
          fetchData();
        }
      });
      return () => {
        pb.collection("blog_posts").unsubscribe("*");
      };
    } catch {}
  }, []);

  /* =========================================================
     Open Add / Edit Modal
  ========================================================= */
  const handleOpenAddModal = () => {
    setEditingPost(null);
    setPreviewTab("edit");
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      category: "راهنمای خرید",
      author: "تیم تحریریه پرنا زر",
      read_time: "۵ دقیقه",
      image: "/banner.webp",
      tags: "طلا, جواهر, ۱۸ عیار",
      featured: false,
      published: true,
      sort_order: posts.length + 1,
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (p: BlogPostItem) => {
    setEditingPost(p);
    setPreviewTab("edit");
    setFormData({
      title: p.title || "",
      slug: p.slug || "",
      excerpt: p.excerpt || "",
      content: p.content || "",
      category: p.category || "راهنمای خرید",
      author: p.author || "تیم تحریریه پرنا زر",
      read_time: p.read_time || "۵ دقیقه",
      image: p.image || "/banner.webp",
      tags: p.tags || "",
      featured: Boolean(p.featured),
      published: p.published ?? true,
      sort_order: p.sort_order ?? 1,
    });
    setModalOpen(true);
  };

  // ساخت نامک خودکار از روی عنوان
  const handleGenerateSlug = () => {
    if (!formData.title.trim()) return;
    const clean = formData.title
      .trim()
      .toLowerCase()
      .replace(/[^\w\u0600-\u06FF\s-]/g, "")
      .replace(/[\s_]+/g, "-");
    setFormData((prev) => ({ ...prev, slug: clean }));
  };

  /* =========================================================
     Save (Create or Update)
  ========================================================= */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("عنوان مقاله الزامی است.");
      return;
    }

    if (!formData.slug.trim()) {
      toast.error("نامک (Slug) مقاله الزامی است.");
      return;
    }

    const normalizedSlug = formData.slug.trim().toLowerCase().replace(/\s+/g, "-");

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        slug: normalizedSlug,
        excerpt: formData.excerpt.trim(),
        content: formData.content.trim(),
        category: formData.category.trim(),
        author: formData.author.trim(),
        read_time: formData.read_time.trim(),
        image: formData.image.trim(),
        tags: formData.tags.trim(),
        featured: Boolean(formData.featured),
        published: Boolean(formData.published),
        sort_order: Number(formData.sort_order) || 1,
      };

      if (editingPost) {
        await pb.collection("blog_posts").update(editingPost.id, payload);
        toast.success(`مقاله «${payload.title}» با موفقیت ویرایش شد.`);
        recordAuditLogClient({
          category: "settings",
          title: `ویرایش مقاله ${payload.title}`,
          description: `ویرایش مقاله با نامک ${payload.slug}`,
          targetId: editingPost.id,
          targetType: "blog_posts",
        });
      } else {
        await pb.collection("blog_posts").create({
          ...payload,
          views: 0,
        });
        toast.success(`مقاله جدید «${payload.title}» با موفقیت ثبت شد.`);
        recordAuditLogClient({
          category: "settings",
          title: `ثبت مقاله جدید ${payload.title}`,
          description: `ایجاد مقاله با نامک ${payload.slug}`,
          targetType: "blog_posts",
        });
      }

      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err?.message || "خطا در ذخیره مقاله در پاکت‌بیس");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     Toggle Published Quick Action
  ========================================================= */
  const handleTogglePublished = async (post: BlogPostItem) => {
    try {
      const newStatus = !post.published;
      await pb.collection("blog_posts").update(post.id, { published: newStatus });
      toast.success(
        newStatus
          ? `مقاله «${post.title}» منتشر شد.`
          : `مقاله «${post.title}» به حالت پیش‌نویس درآمد.`
      );
      fetchData();
    } catch (err: any) {
      toast.error("خطا در تغییر وضعیت انتشار");
    }
  };

  /* =========================================================
     Delete
  ========================================================= */
  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    setDeleting(true);
    try {
      await pb.collection("blog_posts").delete(postToDelete.id);
      toast.success(`مقاله «${postToDelete.title}» با موفقیت حذف شد.`);
      recordAuditLogClient({
        category: "settings",
        title: `حذف مقاله ${postToDelete.title}`,
        description: `حذف مقاله با شناسه ${postToDelete.id}`,
        targetId: postToDelete.id,
        targetType: "blog_posts",
      });
      setDeleteModalOpen(false);
      setPostToDelete(null);
      fetchData();
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err?.message || "خطا در حذف مقاله");
    } finally {
      setDeleting(false);
    }
  };

  /* =========================================================
     Filters & Search
  ========================================================= */
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.excerpt && p.excerpt.toLowerCase().includes(q)) ||
        (p.tags && p.tags.toLowerCase().includes(q));

      const matchCategory =
        selectedCategory === "all" || p.category === selectedCategory;

      let matchStatus = true;
      if (statusFilter === "published") matchStatus = p.published === true;
      else if (statusFilter === "draft") matchStatus = p.published === false;
      else if (statusFilter === "featured") matchStatus = p.featured === true;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [posts, searchQuery, selectedCategory, statusFilter]);

  const totalViews = useMemo(() => {
    return posts.reduce((sum, p) => sum + (p.views || 0), 0);
  }, [posts]);

  return (
    <div className="space-y-8" dir="rtl">
      
      {/* هدر بخش مدیریت وبلاگ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#3B0B14]/10 pb-6 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3B0B14] to-[#8B142D] text-white shadow-sm dark:from-[#DFB76C] dark:to-[#C5A059] dark:text-[#140508]">
              <BookOpen size={20} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#3B0B14] dark:text-white font-heading">
              مدیریت مجله و مقالات وبلاگ
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#6E3A44] dark:text-zinc-400">
            ایجاد، ویرایش، مدیریت وضعیت انتشار و حذف مقالات در جدول blog_posts پاکت‌بیس.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={refreshing}
            className="rounded-xl border-[#3B0B14]/20 hover:border-[#8B142D] gap-2 text-xs"
          >
            <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
            <span>بروزرسانی</span>
          </Button>

          <Button
            onClick={handleOpenAddModal}
            className="rounded-xl bg-[#3B0B14] hover:bg-[#8B142D] text-white dark:bg-[#DFB76C] dark:text-[#140508] dark:hover:bg-[#EAD9A0] gap-2 text-xs font-bold shadow-md"
          >
            <Plus size={16} />
            <span>نوشتن مقاله جدید</span>
          </Button>
        </div>
      </div>

      {/* کارت‌های آماری */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <Card className="rounded-2xl border-[#3B0B14]/10 bg-white/70 backdrop-blur-sm dark:border-white/10 dark:bg-[#1C080E]/70 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400">تعداد کل مقالات</CardDescription>
            <CardTitle className="text-2xl font-black text-[#3B0B14] dark:text-white font-mono flex items-center justify-between">
              <span>{posts.length}</span>
              <FileText size={20} className="text-[#8B142D] dark:text-[#DFB76C] opacity-80" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="rounded-2xl border-[#3B0B14]/10 bg-white/70 backdrop-blur-sm dark:border-white/10 dark:bg-[#1C080E]/70 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400">منتشر شده در سایت</CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono flex items-center justify-between">
              <span>{posts.filter((p) => p.published).length}</span>
              <CheckCircle2 size={20} className="opacity-80" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="rounded-2xl border-[#3B0B14]/10 bg-white/70 backdrop-blur-sm dark:border-white/10 dark:bg-[#1C080E]/70 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400">برگزیده تحریریه</CardDescription>
            <CardTitle className="text-2xl font-black text-amber-600 dark:text-[#DFB76C] font-mono flex items-center justify-between">
              <span>{posts.filter((p) => p.featured).length}</span>
              <Sparkles size={20} className="opacity-90" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="rounded-2xl border-[#3B0B14]/10 bg-white/70 backdrop-blur-sm dark:border-white/10 dark:bg-[#1C080E]/70 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400">مجموع بازدید مقالات</CardDescription>
            <CardTitle className="text-2xl font-black text-[#3B0B14] dark:text-white font-mono flex items-center justify-between">
              <span>{totalViews.toLocaleString("fa-IR")}</span>
              <Eye size={20} className="text-[#8B142D] dark:text-[#DFB76C] opacity-80" />
            </CardTitle>
          </CardHeader>
        </Card>

      </div>

      {/* فیلترها و نوار جستجو */}
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between bg-white dark:bg-[#1C080E] p-4 rounded-2xl border border-[#3B0B14]/10 dark:border-white/10 shadow-xs">
        
        <div className="relative w-full lg:w-80">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6E3A44] dark:text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در عنوان، نامک یا برچسب..."
            className="pr-10 rounded-xl text-xs bg-[#FAF8F5] dark:bg-black/20 border-[#3B0B14]/10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          
          {/* فیلتر دسته‌بندی */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-8 rounded-xl border border-[#3B0B14]/15 bg-[#FAF8F5] dark:bg-black/20 px-3 text-xs text-[#3B0B14] dark:text-zinc-200 focus:outline-none cursor-pointer"
          >
            <option value="all">همه دسته‌ها</option>
            {CATEGORY_PRESETS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* فیلتر وضعیت */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={statusFilter === "all" ? "default" : "outline"}
              onClick={() => setStatusFilter("all")}
              className={cn(
                "rounded-xl text-xs h-8 px-2.5",
                statusFilter === "all" && "bg-[#3B0B14] text-white dark:bg-[#DFB76C] dark:text-[#140508]"
              )}
            >
              همه ({posts.length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "published" ? "default" : "outline"}
              onClick={() => setStatusFilter("published")}
              className={cn(
                "rounded-xl text-xs h-8 px-2.5",
                statusFilter === "published" && "bg-[#3B0B14] text-white dark:bg-[#DFB76C] dark:text-[#140508]"
              )}
            >
              منتشر شده
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "draft" ? "default" : "outline"}
              onClick={() => setStatusFilter("draft")}
              className={cn(
                "rounded-xl text-xs h-8 px-2.5",
                statusFilter === "draft" && "bg-[#3B0B14] text-white dark:bg-[#DFB76C] dark:text-[#140508]"
              )}
            >
              پیش‌نویس
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "featured" ? "default" : "outline"}
              onClick={() => setStatusFilter("featured")}
              className={cn(
                "rounded-xl text-xs h-8 px-2.5",
                statusFilter === "featured" && "bg-[#3B0B14] text-white dark:bg-[#DFB76C] dark:text-[#140508]"
              )}
            >
              ویژه
            </Button>
          </div>

        </div>

      </div>

      {/* لیست مقالات در قالب جدول/کارت */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[#6E3A44] dark:text-zinc-400 font-bold">
          در حال بارگذاری مقالات وبلاگ از پاکت‌بیس...
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-[#3B0B14]/20 bg-white/50 dark:bg-black/20 p-8 space-y-3">
          <BookOpen size={36} className="mx-auto text-[#8B142D] dark:text-[#DFB76C] opacity-50" />
          <p className="text-sm font-bold text-[#3B0B14] dark:text-white">مقاله‌ای یافت نشد.</p>
          <p className="text-xs text-[#6E3A44] dark:text-zinc-400">می‌توانید مقاله جدیدی با دکمه بالا بنویسید.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1C080E] rounded-3xl border border-[#3B0B14]/10 dark:border-white/10 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF8F5] dark:bg-black/30 border-b border-[#3B0B14]/10 dark:border-white/10 text-[#6E3A44] dark:text-zinc-400 font-bold">
                <tr>
                  <th className="py-3.5 px-4">کاور و عنوان مقاله</th>
                  <th className="py-3.5 px-4">دسته‌بندی</th>
                  <th className="py-3.5 px-4">نویسنده و زمان</th>
                  <th className="py-3.5 px-4">وضعیت انتشار</th>
                  <th className="py-3.5 px-4">بازدید</th>
                  <th className="py-3.5 px-4 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3B0B14]/5 dark:divide-white/5">
                {filteredPosts.map((post) => (
                  <tr
                    key={post.id}
                    className="hover:bg-[#FAF8F5]/60 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    
                    {/* کاور و عنوان */}
                    <td className="py-4 px-4 max-w-xs">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100 border border-[#3B0B14]/10">
                          <img
                            src={post.image || "/banner.webp"}
                            alt={post.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/banner.webp";
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-[#3B0B14] dark:text-white line-clamp-1 text-xs">
                            {post.title}
                          </h4>
                          <p className="font-mono text-[10.5px] text-[#8B142D] dark:text-[#DFB76C] truncate">
                            /{post.slug}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* دسته‌بندی */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[11px] font-bold border-[#DFB76C]/40 bg-[#DFB76C]/10 text-[#8B142D] dark:text-[#DFB76C]">
                          {post.category || "عمومی"}
                        </Badge>
                        {post.featured && (
                          <Badge className="bg-[#DFB76C] text-[#140508] text-[9.5px] font-black border-none">
                            ویژه
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* نویسنده و زمان */}
                    <td className="py-4 px-4 text-[#6E3A44] dark:text-zinc-400">
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#3B0B14] dark:text-zinc-200 block text-[11.5px]">
                          {post.author || "تحریریه"}
                        </span>
                        <span className="text-[10.5px] flex items-center gap-1">
                          <Clock size={11} className="text-[#DFB76C]" />
                          <span>{post.read_time || "۵ دقیقه"}</span>
                        </span>
                      </div>
                    </td>

                    {/* وضعیت انتشار */}
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleTogglePublished(post)}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer",
                          post.published
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                        )}
                        title="برای تغییر وضعیت کلیک کنید"
                      >
                        {post.published ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>منتشر شده</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={12} />
                            <span>پیش‌نویس</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* بازدید */}
                    <td className="py-4 px-4 font-mono text-[#6E3A44] dark:text-zinc-400 text-xs">
                      <span className="flex items-center gap-1">
                        <Eye size={13} className="text-[#DFB76C]" />
                        <span>{(post.views || 0).toLocaleString("fa-IR")}</span>
                      </span>
                    </td>

                    {/* دکمه‌های عملیات */}
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditModal(post)}
                          className="h-8 px-2.5 rounded-xl border-[#3B0B14]/20 hover:border-[#8B142D] hover:bg-[#8B142D]/10 text-xs font-bold"
                          title="ویرایش مقاله"
                        >
                          <Edit3 size={13} className="ml-1 text-[#8B142D] dark:text-[#DFB76C]" />
                          <span>ویرایش</span>
                        </Button>

                        <Link
                          href={`/blog/${post.slug || post.id}`}
                          target="_blank"
                          className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-dashed border-[#3B0B14]/20 text-[#6E3A44] hover:text-[#3B0B14] hover:border-[#3B0B14]/50 transition"
                          title="مشاهده در سایت"
                        >
                          <ExternalLink size={13} />
                        </Link>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setPostToDelete(post);
                            setDeleteModalOpen(true);
                          }}
                          className="h-8 w-8 p-0 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="حذف مقاله"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
         مودال افزودن / ویرایش مقاله
      ========================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#140508] rounded-3xl border border-[#3B0B14]/15 dark:border-white/15 p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* سربرگ مودال */}
            <div className="flex items-center justify-between border-b border-[#3B0B14]/10 dark:border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B142D]/15 text-[#8B142D] dark:bg-[#DFB76C]/15 dark:text-[#DFB76C]">
                  {editingPost ? <Edit3 size={18} /> : <Plus size={18} />}
                </span>
                <h2 className="text-lg font-black text-[#3B0B14] dark:text-white font-heading">
                  {editingPost ? `ویرایش «${editingPost.title}»` : "نگارش مقاله جدید در مجله پرنا زر"}
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-black/5"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              
              {/* عنوان و نامک */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200">
                    عنوان مقاله <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    onBlur={() => {
                      if (!formData.slug.trim()) handleGenerateSlug();
                    }}
                    placeholder="مثلاً: راهنمای جامع تشخیص طلای اصل..."
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200">
                      نامک انگلیسی (Slug) <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateSlug}
                      className="text-[10px] text-[#8B142D] dark:text-[#DFB76C] font-bold hover:underline cursor-pointer"
                    >
                      ساخت خودکار از عنوان
                    </button>
                  </div>
                  <Input
                    required
                    dir="ltr"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g. how-to-identify-real-gold"
                    className="rounded-xl text-xs font-mono text-left"
                  />
                </div>

              </div>

              {/* دسته‌بندی و نویسنده و زمان مطالعه */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200">
                    دسته‌بندی موضوعی
                  </label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="راهنمای خرید، ترندها، ..."
                    className="rounded-xl text-xs"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {CATEGORY_PRESETS.slice(0, 3).map((cp) => (
                      <button
                        key={cp}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cp })}
                        className="text-[9.5px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-[#8B142D]"
                      >
                        {cp}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200">
                    نام نویسنده
                  </label>
                  <Input
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="تیم تحریریه پرنا زر"
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200">
                    زمان تخمینی مطالعه
                  </label>
                  <Input
                    value={formData.read_time}
                    onChange={(e) => setFormData({ ...formData, read_time: e.target.value })}
                    placeholder="مثلاً: ۵ دقیقه"
                    className="rounded-xl text-xs"
                  />
                </div>

              </div>

              {/* تصویر کاور مقاله */}
              <div className="space-y-2 border border-[#3B0B14]/10 dark:border-white/10 p-3.5 rounded-2xl bg-[#FAF8F5]/60 dark:bg-black/20">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200 flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-[#8B142D] dark:text-[#DFB76C]" />
                    <span>آدرس تصویر کاور مقاله</span>
                  </label>
                  <span className="text-[10px] text-[#6E3A44] dark:text-zinc-400">پیش‌فرض‌های سریع زیر:</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PRESET_IMAGES.map((img) => (
                    <button
                      key={img.label}
                      type="button"
                      onClick={() => setFormData({ ...formData, image: img.url })}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-md border transition font-bold cursor-pointer",
                        formData.image === img.url
                          ? "bg-[#3B0B14] text-white border-[#3B0B14] dark:bg-[#DFB76C] dark:text-[#140508]"
                          : "bg-white dark:bg-zinc-800 text-[#3B0B14] dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:border-[#8B142D]"
                      )}
                    >
                      {img.label}
                    </button>
                  ))}
                </div>

                <Input
                  dir="ltr"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://... یا /banner.webp"
                  className="rounded-xl text-xs font-mono text-left"
                />
              </div>

              {/* چکیده و خلاصه */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200">
                  چکیده و خلاصه (برای کارت‌ها و توضیحات سئو گوگل)
                </label>
                <textarea
                  rows={2}
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="خلاصه‌ای دو تا سه خطی از محتوای مقاله..."
                  className="w-full p-3 rounded-xl border border-input bg-transparent text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* متن کامل مقاله همراه با تب پیش‌نمایش */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200">
                    متن کامل مقاله (پشتیبانی از سرفصل‌های ## و ### و نقل قول &gt;)
                  </label>
                  <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[10.5px]">
                    <button
                      type="button"
                      onClick={() => setPreviewTab("edit")}
                      className={cn(
                        "px-2.5 py-0.5 rounded-md font-bold transition",
                        previewTab === "edit"
                          ? "bg-white dark:bg-[#140508] text-[#3B0B14] dark:text-white shadow-2xs"
                          : "text-zinc-500 hover:text-zinc-800"
                      )}
                    >
                      ویرایشگر
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab("preview")}
                      className={cn(
                        "px-2.5 py-0.5 rounded-md font-bold transition",
                        previewTab === "preview"
                          ? "bg-white dark:bg-[#140508] text-[#3B0B14] dark:text-white shadow-2xs"
                          : "text-zinc-500 hover:text-zinc-800"
                      )}
                    >
                      پیش‌نمایش زنده
                    </button>
                  </div>
                </div>

                {previewTab === "edit" ? (
                  <textarea
                    rows={8}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="متن کامل مقاله خود را اینجا وارد کنید..."
                    className="w-full p-3 rounded-xl border border-input bg-transparent text-xs leading-loose focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-sans"
                  />
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-[#DFB76C]/40 bg-[#FAF8F5]/60 dark:bg-black/30 min-h-[160px] text-xs leading-relaxed space-y-2">
                    {formData.content ? (
                      formData.content.split("\n").map((para, i) => (
                        <p key={i}>{para}</p>
                      ))
                    ) : (
                      <span className="text-zinc-400">متنی برای پیش‌نمایش وجود ندارد.</span>
                    )}
                  </div>
                )}
              </div>

              {/* برچسب‌ها و تنظیمات انتشار */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200 flex items-center gap-1">
                    <Tag size={13} className="text-[#DFB76C]" />
                    <span>برچسب‌ها (با ویرگول جدا کنید)</span>
                  </label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="طلا, عیار ۱۸, راهنمای خرید"
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200 flex items-center gap-1">
                    <ArrowUpDown size={13} />
                    <span>ترتیب نمایش</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) || 1 })}
                    className="rounded-xl text-xs font-mono"
                  />
                </div>

              </div>

              {/* سوئیچ‌های چک‌باکس */}
              <div className="flex flex-wrap items-center gap-6 pt-2 pb-2 border-y border-[#3B0B14]/10 dark:border-white/10">
                <label className="relative flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-[#3B0B14] focus:ring-[#8B142D] accent-[#3B0B14] dark:accent-[#DFB76C]"
                  />
                  <span className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200">
                    انتشار عمومی در سایت (Published)
                  </span>
                </label>

                <label className="relative flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-[#3B0B14] focus:ring-[#8B142D] accent-[#3B0B14] dark:accent-[#DFB76C]"
                  />
                  <span className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200 flex items-center gap-1">
                    <Sparkles size={13} className="text-amber-500" />
                    <span>مقاله ویژه و برگزیده بالای وبلاگ</span>
                  </span>
                </label>
              </div>

              {/* دکمه‌های فرم */}
              <div className="flex items-center justify-end gap-2.5 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#3B0B14] hover:bg-[#8B142D] text-white dark:bg-[#DFB76C] dark:text-[#140508] dark:hover:bg-[#EAD9A0] text-xs font-bold gap-1.5 shadow-md"
                >
                  <Save size={15} />
                  <span>{saving ? "در حال ذخیره..." : editingPost ? "ذخیره تغییرات مقاله" : "انتشار مقاله جدید"}</span>
                </Button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* =========================================================
         مودال تایید حذف مقاله
      ========================================================= */}
      {deleteModalOpen && postToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#140508] rounded-3xl border border-[#3B0B14]/15 dark:border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40">
                <AlertCircle size={22} />
              </span>
              <div>
                <h3 className="text-base font-black font-heading text-[#3B0B14] dark:text-white">
                  حذف مقاله
                </h3>
                <p className="text-xs text-[#6E3A44] dark:text-zinc-400">این عملیات قابل بازگشت نیست.</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#3B0B14] dark:text-zinc-200 leading-relaxed">
              آیا از حذف مقاله «<strong className="font-bold text-rose-600">{postToDelete.title}</strong>» اطمینان دارید؟
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setPostToDelete(null);
                }}
                className="rounded-xl text-xs"
              >
                انصراف
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 gap-1.5"
              >
                <Trash2 size={14} />
                <span>{deleting ? "در حال حذف..." : "بله، حذف شود"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
