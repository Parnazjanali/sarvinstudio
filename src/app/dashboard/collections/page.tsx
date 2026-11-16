"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Search,
  ExternalLink,
  RefreshCw,
  Gem,
  CheckCircle2,
  XCircle,
  Eye,
  Save,
  X,
  AlertCircle,
  Layers,
  ArrowUpDown,
  Image as ImageIcon,
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

export interface ExclusiveCollectionItem {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description?: string;
  story?: string;
  image?: string;
  featured?: boolean;
  sort_order?: number;
  created?: string;
  updated?: string;
}

const PRESET_IMAGES = [
  { label: "بنر کالکشن نسیما", url: "/banner.webp" },
  { label: "انگشتر و الماس هدر", url: "/header.webp" },
  { label: "گردنبند طلای دلبر", url: "/gold.webp" },
  { label: "طلای زرین آرونا", url: "/candle.webp" },
  { label: "تصویر پس‌زمینه سرو", url: "/back.webp" },
];

export default function DashboardCollectionsPage() {
  const [collections, setCollections] = useState<ExclusiveCollectionItem[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "featured" | "standard">("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<ExclusiveCollectionItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    subtitle: "",
    description: "",
    story: "",
    image: "/banner.webp",
    featured: true,
    sort_order: 1,
  });

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<ExclusiveCollectionItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* =========================================================
     Fetch Data
  ========================================================= */
  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [colList, prods] = await Promise.all([
        pb.collection("exclusive_collections").getFullList<ExclusiveCollectionItem>({
          sort: "sort_order",
          requestKey: null,
        }),
        pb.collection("products").getFullList<{ id: string; collection_slug?: string }>({
          requestKey: null,
        }).catch(() => []),
      ]);

      setCollections(colList);

      const counts: Record<string, number> = {};
      for (const p of prods) {
        if (p.collection_slug) {
          counts[p.collection_slug] = (counts[p.collection_slug] || 0) + 1;
        }
      }
      setProductCounts(counts);
    } catch (err: any) {
      console.error("Error fetching collections:", err);
      toast.error("خطا در بارگذاری لیست کالکشن‌ها");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates
    try {
      pb.collection("exclusive_collections").subscribe("*", (e) => {
        if (e.action === "create" || e.action === "update" || e.action === "delete") {
          fetchData();
        }
      });
      return () => {
        pb.collection("exclusive_collections").unsubscribe("*");
      };
    } catch {
      // fallback
    }
  }, []);

  /* =========================================================
     Open Add / Edit Modal
  ========================================================= */
  const handleOpenAddModal = () => {
    setEditingCollection(null);
    setFormData({
      title: "",
      slug: "",
      subtitle: "",
      description: "",
      story: "",
      image: "/banner.webp",
      featured: true,
      sort_order: collections.length + 1,
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (col: ExclusiveCollectionItem) => {
    setEditingCollection(col);
    setFormData({
      title: col.title || "",
      slug: col.slug || "",
      subtitle: col.subtitle || "",
      description: col.description || "",
      story: col.story || "",
      image: col.image || "/banner.webp",
      featured: col.featured ?? true,
      sort_order: col.sort_order ?? 1,
    });
    setModalOpen(true);
  };

  /* =========================================================
     Save (Create or Update)
  ========================================================= */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("نام کالکشن الزامی است.");
      return;
    }

    if (!formData.slug.trim()) {
      toast.error("نامک انگلیسی (Slug) الزامی است.");
      return;
    }

    // نرمال‌سازی اسلاگ به حروف کوچک و بدون فاصله
    const normalizedSlug = formData.slug.trim().toLowerCase().replace(/\s+/g, "-");

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        slug: normalizedSlug,
        subtitle: formData.subtitle.trim(),
        description: formData.description.trim(),
        story: formData.story.trim(),
        image: formData.image.trim(),
        featured: Boolean(formData.featured),
        sort_order: Number(formData.sort_order) || 1,
      };

      if (editingCollection) {
        await pb.collection("exclusive_collections").update(editingCollection.id, payload);
        toast.success(`کالکشن «${payload.title}» با موفقیت ویرایش شد.`);
        recordAuditLogClient({
          category: "settings",
          title: `ویرایش کالکشن اختصاصی ${payload.title}`,
          description: `ویرایش کالکشن با نامک ${payload.slug}`,
          targetId: editingCollection.id,
          targetType: "exclusive_collections",
        });
      } else {
        await pb.collection("exclusive_collections").create(payload);
        toast.success(`کالکشن «${payload.title}» با موفقیت افزوده شد.`);
        recordAuditLogClient({
          category: "settings",
          title: `ایجاد کالکشن اختصاصی جدید ${payload.title}`,
          description: `افزودن کالکشن جدید با نامک ${payload.slug}`,
          targetType: "exclusive_collections",
        });
      }

      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err?.message || "خطا در ذخیره کالکشن در پاکت‌بیس");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     Delete
  ========================================================= */
  const handleConfirmDelete = async () => {
    if (!collectionToDelete) return;
    setDeleting(true);
    try {
      await pb.collection("exclusive_collections").delete(collectionToDelete.id);
      toast.success(`کالکشن «${collectionToDelete.title}» با موفقیت حذف شد.`);
      recordAuditLogClient({
        category: "settings",
        title: `حذف کالکشن اختصاصی ${collectionToDelete.title}`,
        description: `حذف کالکشن با نامک ${collectionToDelete.slug}`,
        targetId: collectionToDelete.id,
        targetType: "exclusive_collections",
      });
      setDeleteModalOpen(false);
      setCollectionToDelete(null);
      fetchData();
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err?.message || "خطا در حذف کالکشن");
    } finally {
      setDeleting(false);
    }
  };

  /* =========================================================
     Filter & Search
  ========================================================= */
  const filteredCollections = useMemo(() => {
    return collections.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.title?.toLowerCase().includes(q) ||
        c.slug?.toLowerCase().includes(q) ||
        c.subtitle?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q);

      const matchFeatured =
        featuredFilter === "all"
          ? true
          : featuredFilter === "featured"
          ? c.featured === true
          : c.featured !== true;

      return matchSearch && matchFeatured;
    });
  }, [collections, searchQuery, featuredFilter]);

  const totalProductsAssigned = Object.values(productCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8" dir="rtl">
      
      {/* هدر بخش مدیریت کالکشن‌ها */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#3B0B14]/10 pb-6 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B0B14] to-[#8B142D] text-white shadow-sm dark:from-[#DFB76C] dark:to-[#C5A059] dark:text-[#140508]">
              <Sparkles size={18} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#3B0B14] dark:text-white font-heading">
              مدیریت کالکشن‌های اختصاصی
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#6E3A44] dark:text-zinc-400">
            تعریف و ویرایش مجموعه‌های انحصاری پرنا زر در پاکت‌بیس (جدول exclusive_collections) و اتصال به آثار ویترین.
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
            <span>افزودن کالکشن جدید</span>
          </Button>
        </div>
      </div>

      {/* کارت‌های خلاصه وضعیت */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-[#3B0B14]/10 bg-white/70 backdrop-blur-sm dark:border-white/10 dark:bg-[#1C080E]/70 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400">تعداد کل کالکشن‌ها</CardDescription>
            <CardTitle className="text-2xl font-black text-[#3B0B14] dark:text-white font-mono flex items-center justify-between">
              <span>{collections.length}</span>
              <Layers size={22} className="text-[#8B142D] dark:text-[#DFB76C] opacity-80" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="rounded-2xl border-[#3B0B14]/10 bg-white/70 backdrop-blur-sm dark:border-white/10 dark:bg-[#1C080E]/70 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400">کالکشن‌های ویژه صفحه اصلی</CardDescription>
            <CardTitle className="text-2xl font-black text-[#3B0B14] dark:text-white font-mono flex items-center justify-between">
              <span>{collections.filter((c) => c.featured).length}</span>
              <Sparkles size={22} className="text-amber-500 opacity-90" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="rounded-2xl border-[#3B0B14]/10 bg-white/70 backdrop-blur-sm dark:border-white/10 dark:bg-[#1C080E]/70 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400">کل محصولات پیوند یافته</CardDescription>
            <CardTitle className="text-2xl font-black text-[#3B0B14] dark:text-white font-mono flex items-center justify-between">
              <span>{totalProductsAssigned} اثر</span>
              <Gem size={22} className="text-[#8B142D] dark:text-[#DFB76C] opacity-80" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* فیلتر و جستجو */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-[#1C080E] p-4 rounded-2xl border border-[#3B0B14]/10 dark:border-white/10 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6E3A44] dark:text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در عنوان، نامک یا توضیحات..."
            className="pr-10 rounded-xl text-xs bg-[#FAF8F5] dark:bg-black/20 border-[#3B0B14]/10"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400 shrink-0">فیلتر وضعیت:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <Button
              size="sm"
              variant={featuredFilter === "all" ? "default" : "outline"}
              onClick={() => setFeaturedFilter("all")}
              className={cn(
                "rounded-xl text-xs h-8 px-3",
                featuredFilter === "all" && "bg-[#3B0B14] text-white dark:bg-[#DFB76C] dark:text-[#140508]"
              )}
            >
              همه ({collections.length})
            </Button>
            <Button
              size="sm"
              variant={featuredFilter === "featured" ? "default" : "outline"}
              onClick={() => setFeaturedFilter("featured")}
              className={cn(
                "rounded-xl text-xs h-8 px-3",
                featuredFilter === "featured" && "bg-[#3B0B14] text-white dark:bg-[#DFB76C] dark:text-[#140508]"
              )}
            >
              ویژه صفحه اصلی
            </Button>
            <Button
              size="sm"
              variant={featuredFilter === "standard" ? "default" : "outline"}
              onClick={() => setFeaturedFilter("standard")}
              className={cn(
                "rounded-xl text-xs h-8 px-3",
                featuredFilter === "standard" && "bg-[#3B0B14] text-white dark:bg-[#DFB76C] dark:text-[#140508]"
              )}
            >
              عادی
            </Button>
          </div>
        </div>
      </div>

      {/* لیست کالکشن‌ها به صورت کارت‌های مدرن */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[#6E3A44] dark:text-zinc-400 font-bold">
          در حال بارگذاری کالکشن‌ها از پاکت‌بیس...
        </div>
      ) : filteredCollections.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-[#3B0B14]/20 bg-white/50 dark:bg-black/20 p-8 space-y-3">
          <Gem size={36} className="mx-auto text-[#8B142D] dark:text-[#DFB76C] opacity-50" />
          <p className="text-sm font-bold text-[#3B0B14] dark:text-white">کالکشنی یافت نشد.</p>
          <p className="text-xs text-[#6E3A44] dark:text-zinc-400">می‌توانید اولین کالکشن اختصاصی را با دکمه بالا ثبت کنید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCollections.map((col) => {
            const count = productCounts[col.slug] || 0;

            return (
              <div
                key={col.id}
                className="group relative flex flex-col justify-between rounded-3xl border border-[#3B0B14]/12 bg-white dark:bg-[#1C080E] p-5 shadow-xs transition-all duration-300 hover:border-[#8B142D]/40 dark:hover:border-[#DFB76C]/40 hover:shadow-lg"
              >
                <div>
                  {/* پیش‌نمایش تصویر و نشان‌ها */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-[#FBF7F0] dark:bg-black/40 border border-[#3B0B14]/10 mb-4">
                    <img
                      src={col.image || "/banner.webp"}
                      alt={col.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/banner.webp";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <Badge className="bg-[#3B0B14]/90 text-white font-mono text-[10.5px] border-none backdrop-blur-xs">
                        {count} اثر پیوند خورده
                      </Badge>
                      {col.featured && (
                        <Badge className="bg-[#DFB76C] text-[#140508] font-black text-[10px] border-none">
                          ویژه
                        </Badge>
                      )}
                    </div>

                    <div className="absolute top-3 left-3">
                      <span className="text-[11px] font-mono font-bold bg-white/90 dark:bg-black/80 text-[#3B0B14] dark:text-zinc-200 px-2 py-0.5 rounded-md backdrop-blur-xs">
                        ترتیب: {col.sort_order ?? 1}
                      </span>
                    </div>

                    <div className="absolute bottom-3 right-3 left-3 text-right">
                      <h2 className="text-lg font-black text-white font-heading drop-shadow-sm">
                        {col.title}
                      </h2>
                      <p className="text-[11px] font-mono text-[#DFB76C] drop-shadow-xs">
                        /{col.slug}
                      </p>
                    </div>
                  </div>

                  {/* عنوان فرعی و توضیحات */}
                  <div className="space-y-1.5 mb-4">
                    {col.subtitle && (
                      <p className="text-xs font-bold text-[#8B142D] dark:text-[#DFB76C] line-clamp-1">
                        {col.subtitle}
                      </p>
                    )}
                    <p className="text-xs text-[#6E3A44] dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {col.description || "بدون شرح خلاصه"}
                    </p>
                  </div>
                </div>

                {/* دکمه‌های عملیات */}
                <div className="border-t border-[#3B0B14]/10 dark:border-white/10 pt-3.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditModal(col)}
                      className="rounded-xl h-8 px-2.5 text-xs font-bold border-[#3B0B14]/20 hover:border-[#8B142D] hover:bg-[#8B142D]/10"
                    >
                      <Edit3 size={13} className="ml-1 text-[#8B142D] dark:text-[#DFB76C]" />
                      ویرایش
                    </Button>

                    <Link
                      href={`/collections/${col.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-xl border border-dashed border-[#3B0B14]/20 text-[11.5px] font-bold text-[#6E3A44] dark:text-zinc-300 hover:text-[#3B0B14] hover:border-[#3B0B14]/50 transition"
                    >
                      <ExternalLink size={12} />
                      نمایش
                    </Link>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setCollectionToDelete(col);
                      setDeleteModalOpen(true);
                    }}
                    className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================
         مودال افزودن / ویرایش کالکشن
      ========================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#140508] rounded-3xl border border-[#3B0B14]/15 dark:border-white/15 p-6 sm:p-8 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-[#3B0B14]/10 dark:border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B142D]/15 text-[#8B142D] dark:bg-[#DFB76C]/15 dark:text-[#DFB76C]">
                  {editingCollection ? <Edit3 size={18} /> : <Plus size={18} />}
                </span>
                <h2 className="text-lg font-black text-[#3B0B14] dark:text-white font-heading">
                  {editingCollection ? `ویرایش «${editingCollection.title}»` : "افزودن کالکشن اختصاصی جدید"}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* نام فارسی کالکشن */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200">
                    نام کالکشن <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثلاً: کالکشن نسیما"
                    className="rounded-xl text-xs"
                  />
                </div>

                {/* نامک انگلیسی یکتا برای URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200">
                    نامک انگلیسی (Slug) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    dir="ltr"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g. nasima"
                    className="rounded-xl text-xs font-mono text-left"
                  />
                  <span className="text-[10px] text-[#6E3A44] dark:text-zinc-400">
                    آدرس صفحه: /collections/{formData.slug || "slug"}
                  </span>
                </div>

              </div>

              {/* عنوان فرعی / شعار */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200">
                  شعار یا عنوان فرعی (Subtitle)
                </label>
                <Input
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="مثلاً: لطافت باد ملایم و انحناهای طلایی"
                  className="rounded-xl text-xs"
                />
              </div>

              {/* توضیحات خلاصه */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200">
                  شرح مختصر (کارت‌ها و متادیتا)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="شرح کوتاه کالکشن برای نمایش در ویترین و سئو..."
                  className="w-full p-3 rounded-xl border border-input bg-transparent text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* داستان و فلسفه آفرینش */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200">
                  روایت و داستان آفرینش (Story)
                </label>
                <textarea
                  rows={4}
                  value={formData.story}
                  onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                  placeholder="روایت کامل هنری، منبع الهام و فلسفه آفرینش این کالکشن..."
                  className="w-full p-3 rounded-xl border border-input bg-transparent text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* انتخاب و آدرس تصویر */}
              <div className="space-y-2 border border-[#3B0B14]/10 dark:border-white/10 p-3.5 rounded-2xl bg-[#FAF8F5]/60 dark:bg-black/20">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200 flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-[#8B142D] dark:text-[#DFB76C]" />
                    <span>آدرس تصویر کاور کالکشن</span>
                  </label>
                  <span className="text-[10.5px] text-[#6E3A44] dark:text-zinc-400">پیش‌فرض‌های سریع زیر:</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PRESET_IMAGES.map((img) => (
                    <button
                      key={img.url}
                      type="button"
                      onClick={() => setFormData({ ...formData, image: img.url })}
                      className={cn(
                        "text-[10.5px] px-2.5 py-1 rounded-lg border transition font-bold cursor-pointer",
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
                  placeholder="/banner.webp یا آدرس اینترنتی تصویر"
                  className="rounded-xl text-xs font-mono text-left"
                />
              </div>

              {/* تنظیمات نمایش و اولویت */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200 flex items-center gap-1">
                    <ArrowUpDown size={13} />
                    <span>ترتیب نمایش (Sort Order)</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) || 1 })}
                    className="rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <label className="relative flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-[#3B0B14] focus:ring-[#8B142D] accent-[#3B0B14] dark:accent-[#DFB76C]"
                    />
                    <span className="text-xs font-bold text-[#3B0B14] dark:text-zinc-200">
                      نمایش به عنوان کالکشن ویژه در صفحه اصلی
                    </span>
                  </label>
                </div>

              </div>

              {/* دکمه‌های فرم */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#3B0B14]/10 dark:border-white/10">
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
                  <span>{saving ? "در حال ذخیره..." : editingCollection ? "ذخیره تغییرات" : "ثبت کالکشن"}</span>
                </Button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* =========================================================
         مودال تایید حذف کالکشن
      ========================================================= */}
      {deleteModalOpen && collectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#140508] rounded-3xl border border-[#3B0B14]/15 dark:border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40">
                <AlertCircle size={22} />
              </span>
              <div>
                <h3 className="text-base font-black font-heading text-[#3B0B14] dark:text-white">
                  حذف کالکشن
                </h3>
                <p className="text-xs text-[#6E3A44] dark:text-zinc-400">این عملیات قابل بازگشت نیست.</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#3B0B14] dark:text-zinc-200 leading-relaxed">
              آیا از حذف کالکشن «<strong className="font-bold text-rose-600">{collectionToDelete.title}</strong>» با نامک <span className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{collectionToDelete.slug}</span> اطمینان دارید؟
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setCollectionToDelete(null);
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
