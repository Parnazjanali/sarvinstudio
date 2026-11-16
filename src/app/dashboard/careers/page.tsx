"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Clock3,
  XCircle,
  FileText,
  Download,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Building,
  Coins,
  RefreshCw,
  Eye,
  Save,
  X,
  AlertCircle,
  Sparkles,
  Award,
  Layers,
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

export interface JobPosition {
  id: string;
  title: string;
  department?: string;
  employment_type?: string;
  location?: string;
  salary_range?: string;
  experience_level?: string;
  description?: string;
  requirements?: string;
  benefits?: string;
  is_active: boolean;
  sort_order?: number;
  created?: string;
  updated?: string;
}

export type ApplicationStatus = "new" | "reviewed" | "interview" | "hired" | "rejected";

export interface JobApplication {
  id: string;
  job_id?: string;
  job_title: string;
  full_name: string;
  phone: string;
  email?: string;
  experience_years?: string;
  status: ApplicationStatus;
  resume?: string;
  message?: string;
  portfolio_link?: string;
  admin_notes?: string;
  created: string;
  updated: string;
}

const statusConfig: Record<
  ApplicationStatus,
  { label: string; badgeVariant: "secondary" | "gold" | "crimson" | "success" | "outline" | "default"; bgClass: string; textClass: string }
> = {
  new: {
    label: "جدید / بررسی نشده",
    badgeVariant: "secondary",
    bgClass: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900",
    textClass: "text-blue-700 dark:text-blue-300",
  },
  reviewed: {
    label: "بررسی اولیه شده",
    badgeVariant: "outline",
    bgClass: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900",
    textClass: "text-purple-700 dark:text-purple-300",
  },
  interview: {
    label: "دعوت به مصاحبه",
    badgeVariant: "gold",
    bgClass: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900",
    textClass: "text-amber-800 dark:text-[#DFB76C]",
  },
  hired: {
    label: "استخدام و تأیید نهایی",
    badgeVariant: "success",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900",
    textClass: "text-emerald-700 dark:text-emerald-300",
  },
  rejected: {
    label: "عدم پذیرش / رد شده",
    badgeVariant: "crimson",
    bgClass: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900",
    textClass: "text-rose-700 dark:text-rose-300",
  },
};

export default function DashboardCareersPage() {
  const [activeTab, setActiveTab] = useState<"positions" | "applications">("positions");
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);

  // فیلترهای رزومه‌ها
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("all");

  // وضعیت مودال موقعیت شغلی (افزودن / ویرایش)
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<JobPosition | null>(null);
  const [savingPosition, setSavingPosition] = useState(false);
  const [positionForm, setPositionForm] = useState({
    title: "",
    department: "",
    employment_type: "تمام‌وقت",
    location: "تهران، شعبه مرکزی",
    salary_range: "توافقی",
    experience_level: "حداقل ۱ سال",
    description: "",
    requirements: "",
    benefits: "بیمه، پاداش، ناهار",
    is_active: true,
    sort_order: 1,
  });

  // وضعیت مودال جزئیات رزومه و یادداشت مصاحبه
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [appAdminNotes, setAppAdminNotes] = useState("");
  const [appCurrentStatus, setAppCurrentStatus] = useState<ApplicationStatus>("new");
  const [savingAppNote, setSavingAppNote] = useState(false);

  // واکشی داده‌ها
  const fetchData = async () => {
    try {
      setLoading(true);

      // ۱. دریافت موقعیت‌های شغلی با سورت بر اساس sort_order
      try {
        const posList = await pb.collection("job_positions").getFullList<JobPosition>({
          sort: "-sort_order",
          requestKey: null,
        });
        console.log("✅ Positions loaded:", posList);
        setPositions(posList);
      } catch (posErr: any) {
        console.error("❌ Error fetching job_positions:", posErr);
        toast.error("خطا در دریافت فرصت‌های شغلی: " + (posErr?.message || ""));
      }

      // ۲. دریافت رزومه‌ها به صورت مجزا تا خطای آن مانع نمایش شغل‌ها نشود
      try {
        const appList = await pb.collection("job_applications").getFullList<JobApplication>({
          requestKey: null,
        });
        console.log("✅ Applications loaded:", appList);
        setApplications(appList);
      } catch (appErr: any) {
        console.warn("⚠️ job_applications not loaded yet or empty:", appErr?.message);
        setApplications([]);
      }

    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void fetchData();
  }, []);

  // باز کردن فرم ساخت موقعیت شغلی جدید
  const openNewPositionModal = () => {
    setEditingPosition(null);
    setPositionForm({
      title: "",
      department: "فروشگاه و خدمات مشتریان",
      employment_type: "تمام‌وقت",
      location: "تهران، شعبه مرکزی",
      salary_range: "توافقی",
      experience_level: "حداقل ۱ سال سابقه کار",
      description: "",
      requirements: "",
      benefits: "بیمه تأمین اجتماعی، پاداش عملکرد، محیط کاری حرفه‌ای",
      is_active: true,
      sort_order: (positions.length + 1),
    });
    setIsPositionModalOpen(true);
  };

  // باز کردن فرم ویرایش موقعیت شغلی
  const openEditPositionModal = (pos: JobPosition) => {
    setEditingPosition(pos);
    setPositionForm({
      title: pos.title,
      department: pos.department || "",
      employment_type: pos.employment_type || "تمام‌وقت",
      location: pos.location || "تهران، شعبه مرکزی",
      salary_range: pos.salary_range || "توافقی",
      experience_level: pos.experience_level || "",
      description: pos.description || "",
      requirements: pos.requirements || "",
      benefits: pos.benefits || "",
      is_active: pos.is_active ?? true,
      sort_order: pos.sort_order || 1,
    });
    setIsPositionModalOpen(true);
  };

  // ذخیره موقعیت شغلی (ایجاد یا ویرایش)
  const handleSavePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!positionForm.title.trim()) {
      toast.error("لطفاً عنوان موقعیت شغلی را وارد فرمایید.");
      return;
    }

    try {
      setSavingPosition(true);
      if (editingPosition) {
        // به‌روزرسانی
        await pb.collection("job_positions").update(editingPosition.id, positionForm);
        toast.success(`موقعیت شغلی «${positionForm.title}» با موفقیت ویرایش شد.`);

        void recordAuditLogClient({
          category: "settings",
          title: `ویرایش موقعیت شغلی: ${positionForm.title}`,
          description: `اطلاعات آگهی شغلی ${positionForm.title} به‌روزرسانی شد.`,
          level: "info",
          targetId: editingPosition.id,
          targetType: "job_position",
        });
      } else {
        // ایجاد جدید
        const created = await pb.collection("job_positions").create(positionForm);
        toast.success(`موقعیت شغلی «${positionForm.title}» با موفقیت افزوده شد.`);

        void recordAuditLogClient({
          category: "settings",
          title: `افزودن موقعیت شغلی جدید: ${positionForm.title}`,
          description: `موقعیت شغلی ${positionForm.title} در دپارتمان ${positionForm.department} ایجاد شد.`,
          level: "info",
          targetId: created.id,
          targetType: "job_position",
        });
      }

      setIsPositionModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error("Save job position error:", err);
      toast.error("خطا در ذخیره موقعیت شغلی رخ داد.");
    } finally {
      setSavingPosition(false);
    }
  };

  // تغییر وضعیت فعال / غیرفعال آگهی شغلی
  const handleTogglePositionActive = async (pos: JobPosition) => {
    try {
      const newStatus = !pos.is_active;
      await pb.collection("job_positions").update(pos.id, { is_active: newStatus });
      setPositions((prev) =>
        prev.map((p) => (p.id === pos.id ? { ...p, is_active: newStatus } : p))
      );
      toast.success(
        newStatus
          ? `آگهی «${pos.title}» فعال شد.`
          : `آگهی «${pos.title}» به وضعیت غیرفعال درآمد.`
      );
    } catch {
      toast.error("خطا در تغییر وضعیت موقعیت شغلی");
    }
  };

  // حذف موقعیت شغلی
  const handleDeletePosition = async (pos: JobPosition) => {
    const confirmed = window.confirm(
      `آیا از حذف موقعیت شغلی «${pos.title}» اطمینان دارید؟`
    );
    if (!confirmed) return;

    try {
      await pb.collection("job_positions").delete(pos.id);
      setPositions((prev) => prev.filter((p) => p.id !== pos.id));
      toast.success(`موقعیت شغلی «${pos.title}» حذف شد.`);

      void recordAuditLogClient({
        category: "settings",
        title: `حذف موقعیت شغلی: ${pos.title}`,
        description: `آگهی استخدام ${pos.title} از سیستم حذف شد.`,
        level: "warning",
        targetId: pos.id,
        targetType: "job_position",
      });
    } catch {
      toast.error("خطا در حذف موقعیت شغلی");
    }
  };

  // باز کردن جزئیات رزومه متقاضی
  const openAppDetails = (app: JobApplication) => {
    setSelectedApp(app);
    setAppAdminNotes(app.admin_notes || "");
    setAppCurrentStatus(app.status || "new");
  };

  // ذخیره یادداشت مصاحبه و وضعیت رزومه
  const handleSaveAppDetails = async () => {
    if (!selectedApp) return;

    try {
      setSavingAppNote(true);
      await pb.collection("job_applications").update(selectedApp.id, {
        status: appCurrentStatus,
        admin_notes: appAdminNotes,
      });

      setApplications((prev) =>
        prev.map((a) =>
          a.id === selectedApp.id
            ? { ...a, status: appCurrentStatus, admin_notes: appAdminNotes }
            : a
        )
      );

      toast.success("وضعیت و یادداشت مصاحبه کارجو ذخیره شد.");
      setSelectedApp(null);
    } catch {
      toast.error("خطا در به‌روزرسانی اطلاعات رزومه");
    } finally {
      setSavingAppNote(false);
    }
  };

  // تغییر سریع وضعیت یک رزومه در جدول
  const handleQuickStatusChange = async (appId: string, newStatus: ApplicationStatus) => {
    try {
      await pb.collection("job_applications").update(appId, { status: newStatus });
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      );
      toast.success("وضعیت رزومه تغییر یافت.");
    } catch {
      toast.error("خطا در تغییر وضعیت رزومه");
    }
  };

  // حذف رزومه
  const handleDeleteApplication = async (app: JobApplication) => {
    const confirmed = window.confirm(
      `آیا از حذف درخواست همکاری «${app.full_name}» اطمینان دارید؟`
    );
    if (!confirmed) return;

    try {
      await pb.collection("job_applications").delete(app.id);
      setApplications((prev) => prev.filter((a) => a.id !== app.id));
      toast.success("درخواست همکاری با موفقیت حذف شد.");
    } catch {
      toast.error("خطا در حذف درخواست همکاری");
    }
  };

  // فیلتر کردن لیست رزومه‌ها
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // فیلتر بر اساس عنوان شغل
      if (selectedJobFilter !== "all") {
        if (app.job_id !== selectedJobFilter && app.job_title !== selectedJobFilter) {
          return false;
        }
      }

      // فیلتر بر اساس وضعیت
      if (statusFilter !== "all" && app.status !== statusFilter) {
        return false;
      }

      // فیلتر متنی جستجو
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = app.full_name?.toLowerCase().includes(q);
        const matchesPhone = app.phone?.toLowerCase().includes(q);
        const matchesEmail = app.email?.toLowerCase().includes(q);
        const matchesJob = app.job_title?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesJob) {
          return false;
        }
      }

      return true;
    });
  }, [applications, selectedJobFilter, statusFilter, searchQuery]);

  // آمار کلی
  const stats = useMemo(() => {
    const totalPositions = positions.length;
    const activePositions = positions.filter((p) => p.is_active).length;
    const totalApps = applications.length;
    const newApps = applications.filter((a) => a.status === "new" || !a.status).length;
    const interviewApps = applications.filter((a) => a.status === "interview").length;
    const hiredApps = applications.filter((a) => a.status === "hired").length;

    return {
      totalPositions,
      activePositions,
      totalApps,
      newApps,
      interviewApps,
      hiredApps,
    };
  }, [positions, applications]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 font-sans text-[#3B0B14] dark:text-zinc-100" dir="rtl">
      {/* هدر صفحه */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#3B0B14]/12 bg-white/80 p-5 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#1C080E]/80 sm:p-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3B0B14] text-[#DFB76C] dark:bg-[#8B142D] dark:text-white shadow-xs">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#8B142D] dark:text-[#DFB76C]">
                جذب سرمایه انسانی و استخدام
              </span>
              <Badge variant="gold" className="text-[10px] py-0 px-2 font-mono">
                پرنا زر
              </Badge>
            </div>
            <h1 className="mt-1 text-xl font-black text-[#3B0B14] sm:text-2xl dark:text-zinc-100">
              فرصت‌های شغلی و درخواست‌های همکاری
            </h1>
            <p className="mt-0.5 text-xs text-[#6E3A44] dark:text-zinc-400">
              تعریف موقعیت‌های شغلی گالری، بررسی رزومه‌های ارسالی کارجویان و فرآیند مصاحبه
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            type="button"
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="gap-2 text-xs cursor-pointer border-[#3B0B14]/20 dark:border-white/15"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-[#8B142D]")} />
            <span>بروزرسانی</span>
          </Button>

          <Button
            type="button"
            onClick={openNewPositionModal}
            className="gap-2 text-xs font-black bg-[#3B0B14] hover:bg-[#8B142D] text-white dark:bg-[#8B142D] cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>افزودن موقعیت شغلی</span>
          </Button>
        </div>
      </div>

      {/* کارت‌های خلاصه آمار */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-[#3B0B14]/12 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C080E]/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400">آگهی‌های فعال</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-black text-[#3B0B14] dark:text-white">
              {stats.activePositions}
            </span>
            <span className="text-xs text-[#6E3A44] dark:text-zinc-400">از {stats.totalPositions} موقعیت</span>
          </div>
        </Card>

        <Card className="border-[#3B0B14]/12 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C080E]/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400">کل رزومه‌های دریافتی</span>
            <div className="p-2 rounded-xl bg-[#8B142D]/10 text-[#8B142D] dark:bg-[#8B142D]/20 dark:text-[#DFB76C]">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-black text-[#3B0B14] dark:text-white">
              {stats.totalApps}
            </span>
            <span className="text-xs text-[#6E3A44] dark:text-zinc-400">متقاضی</span>
          </div>
        </Card>

        <Card className="border-[#3B0B14]/12 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C080E]/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400">رزومه‌های جدید</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
              <Clock3 size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-black text-blue-600 dark:text-blue-400">
              {stats.newApps}
            </span>
            <span className="text-xs text-[#6E3A44] dark:text-zinc-400">نیاز به بررسی</span>
          </div>
        </Card>

        <Card className="border-[#3B0B14]/12 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C080E]/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400">دعوت به مصاحبه</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-black text-[#8B142D] dark:text-[#DFB76C]">
              {stats.interviewApps}
            </span>
            <span className="text-xs text-[#6E3A44] dark:text-zinc-400">کارجو در فرآیند</span>
          </div>
        </Card>
      </div>

      {/* تب‌های اصلی: موقعیت‌های شغلی / رزومه‌ها */}
      <div className="flex border-b border-[#3B0B14]/15 dark:border-white/10 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("positions")}
          className={cn(
            "flex items-center gap-2 pb-3 px-2 text-xs font-black transition cursor-pointer border-b-2 -mb-px",
            activeTab === "positions"
              ? "border-[#8B142D] text-[#8B142D] dark:border-[#DFB76C] dark:text-[#DFB76C]"
              : "border-transparent text-[#6E3A44] hover:text-[#3B0B14] dark:text-zinc-400 dark:hover:text-zinc-200"
          )}
        >
          <Layers size={16} />
          <span>موقعیت‌های شغلی و آگهی‌ها ({positions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("applications")}
          className={cn(
            "flex items-center gap-2 pb-3 px-2 text-xs font-black transition cursor-pointer border-b-2 -mb-px",
            activeTab === "applications"
              ? "border-[#8B142D] text-[#8B142D] dark:border-[#DFB76C] dark:text-[#DFB76C]"
              : "border-transparent text-[#6E3A44] hover:text-[#3B0B14] dark:text-zinc-400 dark:hover:text-zinc-200"
          )}
        >
          <Users size={16} />
          <span>درخواست‌ها و رزومه‌ها ({applications.length})</span>
          {stats.newApps > 0 && (
            <Badge variant="crimson" className="text-[10px] py-0 px-1.5 font-mono">
              {stats.newApps} جدید
            </Badge>
          )}
        </button>
      </div>

      {/* =========================================================
          تب ۱: لیست موقعیت‌های شغلی (Job Positions)
      ========================================================= */}
      {activeTab === "positions" && (
        <div className="space-y-4">
          {positions.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-[#3B0B14]/20 bg-white/70 dark:border-white/10 dark:bg-[#1C080E]/70">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#DFB76C]/20 text-[#8B142D] dark:text-[#DFB76C]">
                <Briefcase size={28} />
              </div>
              <h3 className="mt-4 text-sm font-black text-[#3B0B14] dark:text-zinc-100">
                هنوز موقعیت شغلی ثبت نشده است
              </h3>
              <p className="mt-1 text-xs text-[#6E3A44] dark:text-zinc-400 max-w-sm mx-auto">
                با ایجاد اولین موقعیت شغلی، کارجویان می‌توانند از طریق وب‌سایت رزومه و اطلاعات خود را ارسال کنند.
              </p>
              <Button
                onClick={openNewPositionModal}
                className="mt-5 text-xs font-black bg-[#3B0B14] hover:bg-[#8B142D] text-white dark:bg-[#8B142D]"
              >
                <Plus size={15} className="ml-1.5" />
                تعریف اولین فرصت شغلی
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {positions.map((pos) => {
                const appCount = applications.filter(
                  (a) => a.job_id === pos.id || a.job_title === pos.title
                ).length;

                return (
                  <Card
                    key={pos.id}
                    className={cn(
                      "p-5 transition-all border shadow-xs backdrop-blur-md",
                      pos.is_active
                        ? "border-[#3B0B14]/15 bg-white/95 dark:border-white/10 dark:bg-[#1C080E]/95"
                        : "border-zinc-200 bg-zinc-50/80 opacity-75 dark:border-white/5 dark:bg-zinc-900/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-black text-[#3B0B14] dark:text-zinc-100">
                            {pos.title}
                          </h3>
                          <Badge
                            variant={pos.is_active ? "success" : "outline"}
                            className="text-[10px]"
                          >
                            {pos.is_active ? "فعال و در حال جذب" : "غیرفعال"}
                          </Badge>
                        </div>

                        {pos.department && (
                          <div className="mt-1 text-xs font-bold text-[#8B142D] dark:text-[#DFB76C]">
                            دپارتمان: {pos.department}
                          </div>
                        )}
                      </div>

                      {/* دکمه‌های عملیات سریع */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditPositionModal(pos)}
                          title="ویرایش موقعیت شغلی"
                          className="p-2 rounded-xl text-[#3B0B14] hover:bg-[#3B0B14]/5 transition dark:text-zinc-300 dark:hover:bg-white/5 cursor-pointer"
                        >
                          <Edit3 size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePosition(pos)}
                          title="حذف موقعیت شغلی"
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition dark:hover:bg-rose-950/40 cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* مشخصات موقعیت شغلی */}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-[#6E3A44] dark:text-zinc-300 pt-3 border-t border-[#3B0B14]/10 dark:border-white/10">
                      <div className="flex items-center gap-1.5">
                        <Building size={13} className="text-[#8B142D] dark:text-[#DFB76C]" />
                        <span>نوع همکاری: <strong>{pos.employment_type || "تمام‌وقت"}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-[#8B142D] dark:text-[#DFB76C]" />
                        <span>محل کار: <strong>{pos.location || "تهران"}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Coins size={13} className="text-[#8B142D] dark:text-[#DFB76C]" />
                        <span>حقوق: <strong>{pos.salary_range || "توافقی"}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Award size={13} className="text-[#8B142D] dark:text-[#DFB76C]" />
                        <span>سابقه: <strong>{pos.experience_level || "مهم نیست"}</strong></span>
                      </div>
                    </div>

                    {pos.description && (
                      <p className="mt-3 text-xs text-[#6E3A44] dark:text-zinc-400 line-clamp-2 leading-5">
                        {pos.description}
                      </p>
                    )}

                    {/* فوتر کارت با تعداد رزومه و سوییچ فعال/غیرفعال */}
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#3B0B14]/10 dark:border-white/10 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedJobFilter(pos.id);
                          setActiveTab("applications");
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#8B142D] hover:underline dark:text-[#DFB76C] cursor-pointer"
                      >
                        <Users size={14} />
                        <span>{appCount} رزومه دریافت شده</span>
                        <span className="text-[10px] text-zinc-400">← مشاهده</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-[11px] font-bold text-[#6E3A44] dark:text-zinc-400 cursor-pointer">
                          <span>{pos.is_active ? "آگهی فعال" : "غیرفعال"}</span>
                          <input
                            type="checkbox"
                            checked={pos.is_active}
                            onChange={() => handleTogglePositionActive(pos)}
                            className="rounded accent-[#8B142D] h-4 w-4 cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          تب ۲: رزومه‌ها و متقاضیان استخدام (Job Applications)
      ========================================================= */}
      {activeTab === "applications" && (
        <div className="space-y-4">
          {/* نوار فیلتر و جستجو */}
          <Card className="p-4 border-[#3B0B14]/12 bg-white/90 dark:border-white/10 dark:bg-[#1C080E]/90">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* جستجو */}
              <div className="relative">
                <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="جستجوی نام کارجو، شماره یا ایمیل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 text-xs"
                />
              </div>

              {/* فیلتر وضعیت */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-9 rounded-2xl border border-[#3B0B14]/15 bg-white px-3 text-xs font-bold outline-none dark:border-white/10 dark:bg-[#140508] dark:text-zinc-100"
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="new">جدید / بررسی نشده</option>
                  <option value="reviewed">بررسی اولیه شده</option>
                  <option value="interview">دعوت به مصاحبه</option>
                  <option value="hired">استخدام و تأیید نهایی</option>
                  <option value="rejected">رد شده</option>
                </select>
              </div>

              {/* فیلتر موقعیت شغلی */}
              <div>
                <select
                  value={selectedJobFilter}
                  onChange={(e) => setSelectedJobFilter(e.target.value)}
                  className="w-full h-9 rounded-2xl border border-[#3B0B14]/15 bg-white px-3 text-xs font-bold outline-none dark:border-white/10 dark:bg-[#140508] dark:text-zinc-100"
                >
                  <option value="all">همه موقعیت‌های شغلی</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* جدول رزومه‌ها */}
          {filteredApplications.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-[#3B0B14]/20 bg-white/70 dark:border-white/10 dark:bg-[#1C080E]/70">
              <Users size={28} className="mx-auto text-zinc-400" />
              <h3 className="mt-3 text-sm font-black text-[#3B0B14] dark:text-zinc-100">
                هیچ درخواستی با این مشخصات یافت نشد
              </h3>
              <p className="mt-1 text-xs text-[#6E3A44] dark:text-zinc-400">
                می‌توانید فیلترها را ریست کنید یا منتظر ارسال رزومه از سمت کارجویان باشید.
              </p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-[#3B0B14]/15 bg-white shadow-xs dark:border-white/10 dark:bg-[#1C080E]">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-[#3B0B14]/10 bg-[#FDF8F9] text-[11px] font-black text-[#6E3A44] dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300">
                    <th className="p-3.5">نام متقاضی</th>
                    <th className="p-3.5">موقعیت شغلی درخواستی</th>
                    <th className="p-3.5">شماره تماس / ایمیل</th>
                    <th className="p-3.5">سابقه کار</th>
                    <th className="p-3.5">وضعیت</th>
                    <th className="p-3.5 text-center">فایل رزومه</th>
                    <th className="p-3.5 text-center">عملیات</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#3B0B14]/10 dark:divide-white/10">
                  {filteredApplications.map((app) => {
                    const currentCfg = statusConfig[app.status || "new"] || statusConfig.new;
                    const resumeUrl = app.resume ? pb.files.getUrl(app, app.resume) : null;

                    return (
                      <tr
                        key={app.id}
                        className="transition hover:bg-[#FDF8F9] dark:hover:bg-white/5"
                      >
                        <td className="p-3.5">
                          <div className="font-black text-[#3B0B14] dark:text-zinc-100">
                            {app.full_name}
                          </div>
                          <div className="text-[10px] text-[#6E3A44] dark:text-zinc-400 font-mono mt-0.5">
                            {new Intl.DateTimeFormat("fa-IR", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            }).format(new Date(app.created))}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <Badge variant="outline" className="text-[11px] font-bold">
                            {app.job_title}
                          </Badge>
                        </td>

                        <td className="p-3.5">
                          <div className="font-mono font-bold text-[#3B0B14] dark:text-zinc-200">
                            {app.phone}
                          </div>
                          {app.email && (
                            <div className="text-[10.5px] font-mono text-[#6E3A44] dark:text-zinc-400">
                              {app.email}
                            </div>
                          )}
                        </td>

                        <td className="p-3.5">
                          <span className="text-xs font-bold text-[#6E3A44] dark:text-zinc-300">
                            {app.experience_years || "—"}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <select
                            value={app.status || "new"}
                            onChange={(e) =>
                              handleQuickStatusChange(app.id, e.target.value as ApplicationStatus)
                            }
                            className={cn(
                              "rounded-xl border px-2.5 py-1 text-xs font-black outline-none cursor-pointer",
                              currentCfg.bgClass,
                              currentCfg.textClass
                            )}
                          >
                            <option value="new">جدید</option>
                            <option value="reviewed">بررسی شده</option>
                            <option value="interview">دعوت به مصاحبه</option>
                            <option value="hired">استخدام شده</option>
                            <option value="rejected">رد شده</option>
                          </select>
                        </td>

                        <td className="p-3.5 text-center">
                          {resumeUrl ? (
                            <a
                              href={resumeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#DFB76C]/15 border border-[#DFB76C]/40 text-[#8B142D] dark:text-[#DFB76C] text-xs font-bold hover:bg-[#DFB76C]/25 transition"
                              title="دانلود رزومه"
                            >
                              <Download size={13} />
                              <span>دانلود فایل</span>
                            </a>
                          ) : app.portfolio_link ? (
                            <a
                              href={app.portfolio_link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold hover:bg-sky-100 transition"
                            >
                              <ExternalLink size={13} />
                              <span>لینک نمونه‌کار</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-zinc-400">بدون فایل</span>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openAppDetails(app)}
                              title="مشاهده جزئیات و یادداشت مصاحبه"
                              className="p-1.5 rounded-xl border border-[#3B0B14]/15 text-[#3B0B14] hover:bg-[#8B142D] hover:text-white transition dark:border-white/10 dark:text-zinc-300 dark:hover:bg-[#DFB76C] dark:hover:text-[#140508] cursor-pointer"
                            >
                              <Eye size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteApplication(app)}
                              title="حذف درخواست"
                              className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition dark:border-rose-900/50 dark:hover:bg-rose-950/40 cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          مودال افزودن / ویرایش موقعیت شغلی
      ========================================================= */}
      {isPositionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl border border-[#3B0B14]/20 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1C080E] text-right font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#3B0B14]/10 pb-4 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-[#8B142D] dark:text-[#DFB76C]" />
                <h3 className="text-base font-black text-[#3B0B14] dark:text-zinc-100">
                  {editingPosition ? "ویرایش موقعیت شغلی" : "تعریف موقعیت شغلی جدید"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPositionModalOpen(false)}
                className="rounded-xl p-1.5 text-zinc-400 hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/5 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePosition} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#6E3A44] dark:text-zinc-300">
                    عنوان موقعیت شغلی *:
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="مثال: طراح طلا و جواهرات، فروشنده حضوری..."
                    value={positionForm.title}
                    onChange={(e) => setPositionForm({ ...positionForm, title: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#6E3A44] dark:text-zinc-300">دپارتمان / بخش:</label>
                  <Input
                    type="text"
                    placeholder="مثال: طراحی و تولید، فروش، مارکتینگ..."
                    value={positionForm.department}
                    onChange={(e) => setPositionForm({ ...positionForm, department: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#6E3A44] dark:text-zinc-300">نوع همکاری:</label>
                  <select
                    value={positionForm.employment_type}
                    onChange={(e) => setPositionForm({ ...positionForm, employment_type: e.target.value })}
                    className="w-full h-10 rounded-2xl border border-[#3B0B14]/15 bg-white px-3 text-xs font-bold outline-none dark:border-white/10 dark:bg-[#140508] dark:text-zinc-100"
                  >
                    <option value="تمام‌وقت">تمام‌وقت</option>
                    <option value="پاره‌وقت">پاره‌وقت</option>
                    <option value="دورکاری">دورکاری</option>
                    <option value="پروژه‌ای">پروژه‌ای / قراردادی</option>
                    <option value="کارآموزی">کارآموزی</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#6E3A44] dark:text-zinc-300">محل کار / شعبه:</label>
                  <Input
                    type="text"
                    value={positionForm.location}
                    onChange={(e) => setPositionForm({ ...positionForm, location: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#6E3A44] dark:text-zinc-300">بازه حقوق پیشنهادی:</label>
                  <Input
                    type="text"
                    placeholder="توافقی، ۲۰ تا ۳۰ میلیون تومان..."
                    value={positionForm.salary_range}
                    onChange={(e) => setPositionForm({ ...positionForm, salary_range: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#6E3A44] dark:text-zinc-300">سابقه کار مورد نیاز:</label>
                  <Input
                    type="text"
                    placeholder="مثال: حداقل ۲ سال سابقه مرتبط..."
                    value={positionForm.experience_level}
                    onChange={(e) => setPositionForm({ ...positionForm, experience_level: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#6E3A44] dark:text-zinc-300">ترتیب نمایش (اولویت):</label>
                  <Input
                    type="number"
                    value={positionForm.sort_order}
                    onChange={(e) => setPositionForm({ ...positionForm, sort_order: Number(e.target.value) })}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#6E3A44] dark:text-zinc-300">شرح وظایف و موقعیت شغلی:</label>
                <textarea
                  rows={3}
                  placeholder="توضیحاتی در مورد نقش، وظایف روزمره و مسئولیت‌های کارجو..."
                  value={positionForm.description}
                  onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                  className="w-full rounded-2xl border border-[#3B0B14]/15 bg-white p-3 text-xs font-bold outline-none dark:border-white/10 dark:bg-[#140508] dark:text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#6E3A44] dark:text-zinc-300">شرایط احراز و مهارت‌های مورد نیاز:</label>
                <textarea
                  rows={2}
                  placeholder="مهارت‌های فنی، نرم‌افزارهای مورد نیاز، توانمندی‌های فردی..."
                  value={positionForm.requirements}
                  onChange={(e) => setPositionForm({ ...positionForm, requirements: e.target.value })}
                  className="w-full rounded-2xl border border-[#3B0B14]/15 bg-white p-3 text-xs font-bold outline-none dark:border-white/10 dark:bg-[#140508] dark:text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#6E3A44] dark:text-zinc-300">مزایا و تسهیلات رفاهی:</label>
                <Input
                  type="text"
                  placeholder="بیمه، پاداش، ناهار، وام، هدایای مناسبتی..."
                  value={positionForm.benefits}
                  onChange={(e) => setPositionForm({ ...positionForm, benefits: e.target.value })}
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#3B0B14] dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={positionForm.is_active}
                    onChange={(e) => setPositionForm({ ...positionForm, is_active: e.target.checked })}
                    className="rounded accent-[#8B142D] h-4 w-4 cursor-pointer"
                  />
                  <span>این موقعیت شغلی فعال باشد و در وب‌سایت نمایش داده شود.</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#3B0B14]/10 dark:border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPositionModalOpen(false)}
                  disabled={savingPosition}
                  className="cursor-pointer"
                >
                  انصراف
                </Button>

                <Button
                  type="submit"
                  disabled={savingPosition}
                  className="gap-2 bg-[#3B0B14] hover:bg-[#8B142D] text-white dark:bg-[#8B142D] cursor-pointer"
                >
                  <Save size={16} />
                  <span>{savingPosition ? "در حال ثبت..." : "ذخیره موقعیت شغلی"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          مودال جزئیات رزومه کارجو و ثبت یادداشت مصاحبه
      ========================================================= */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl border border-[#3B0B14]/20 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1C080E] text-right font-sans max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-[#3B0B14]/10 pb-4 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#8B142D] dark:text-[#DFB76C]" />
                <h3 className="text-base font-black text-[#3B0B14] dark:text-zinc-100">
                  پرونده کارجو: {selectedApp.full_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="rounded-xl p-1.5 text-zinc-400 hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/5 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* مشخصات هویتی و تماسی */}
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#FDF8F9] p-4 text-xs dark:bg-zinc-900/60 border border-[#3B0B14]/10 dark:border-white/10">
              <div>
                <span className="text-[#6E3A44] dark:text-zinc-400">موقعیت درخواستی: </span>
                <span className="font-black text-[#8B142D] dark:text-[#DFB76C]">{selectedApp.job_title}</span>
              </div>

              <div>
                <span className="text-[#6E3A44] dark:text-zinc-400">سابقه کار: </span>
                <span className="font-bold text-[#3B0B14] dark:text-zinc-100">{selectedApp.experience_years || "ذکر نشده"}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Phone size={13} className="text-[#8B142D]" />
                <span className="font-mono font-bold text-[#3B0B14] dark:text-zinc-100" dir="ltr">{selectedApp.phone}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Mail size={13} className="text-[#8B142D]" />
                <span className="font-mono text-[#3B0B14] dark:text-zinc-100">{selectedApp.email || "—"}</span>
              </div>
            </div>

            {/* انگیزه نامه و متن پیام کارجو */}
            {selectedApp.message && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#6E3A44] dark:text-zinc-300">متن پیام و معرفی کارجو:</label>
                <div className="p-3.5 rounded-2xl border border-[#3B0B14]/10 bg-white dark:bg-[#140508] dark:border-white/10 text-xs leading-6 text-[#3B0B14] dark:text-zinc-200">
                  {selectedApp.message}
                </div>
              </div>
            )}

            {/* لینک پورتفولیو / نمونه‌کار */}
            {selectedApp.portfolio_link && (
              <div className="flex items-center justify-between p-3 rounded-2xl border border-sky-200 bg-sky-50/70 dark:bg-sky-950/30 dark:border-sky-900/50 text-xs">
                <span className="font-bold text-sky-900 dark:text-sky-200">لینک نمونه‌کار / گیت‌هاب / پورتفولیو:</span>
                <a
                  href={selectedApp.portfolio_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sky-700 hover:underline font-mono text-[11px]"
                >
                  <ExternalLink size={13} />
                  <span>مشاهده لینک</span>
                </a>
              </div>
            )}

            {/* دانلود فایل رزومه */}
            {selectedApp.resume && (
              <div className="flex items-center justify-between p-3 rounded-2xl border border-[#DFB76C]/40 bg-[#DFB76C]/10 text-xs">
                <div className="flex items-center gap-2 font-bold text-[#3B0B14] dark:text-zinc-100">
                  <FileText size={16} className="text-[#8B142D] dark:text-[#DFB76C]" />
                  <span>فایل رزومه ضمیمه‌شده</span>
                </div>
                <a
                  href={pb.files.getUrl(selectedApp, selectedApp.resume)}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3B0B14] text-white hover:bg-[#8B142D] text-xs font-bold transition shadow-2xs"
                >
                  <Download size={14} />
                  <span>دریافت فایل رزومه</span>
                </a>
              </div>
            )}

            {/* تغییر وضعیت رزومه */}
            <div className="space-y-1.5 pt-2 border-t border-[#3B0B14]/10 dark:border-white/10">
              <label className="text-xs font-bold text-[#6E3A44] dark:text-zinc-300">وضعیت فرآیند استخدام:</label>
              <select
                value={appCurrentStatus}
                onChange={(e) => setAppCurrentStatus(e.target.value as ApplicationStatus)}
                className="w-full h-10 rounded-2xl border border-[#3B0B14]/15 bg-white px-3 text-xs font-bold outline-none dark:border-white/10 dark:bg-[#140508] dark:text-zinc-100"
              >
                <option value="new">جدید / بررسی نشده</option>
                <option value="reviewed">بررسی اولیه شده</option>
                <option value="interview">دعوت به مصاحبه حضوری یا آنلاین</option>
                <option value="hired">استخدام و تأیید نهایی</option>
                <option value="rejected">عدم پذیرش / رد شده</option>
              </select>
            </div>

            {/* یادداشت‌های محرمانه مصاحبه‌کننده */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#6E3A44] dark:text-zinc-300">
                یادداشت‌های داخلی مصاحبه‌کننده (محرمانه):
              </label>
              <textarea
                rows={3}
                placeholder="ثبت تاریخ مصاحبه، نتیجه مصاحبه فنی یا مدیریت، بازخورد و ارزیابی نهایی..."
                value={appAdminNotes}
                onChange={(e) => setAppAdminNotes(e.target.value)}
                className="w-full rounded-2xl border border-[#3B0B14]/15 bg-white p-3 text-xs font-bold outline-none dark:border-white/10 dark:bg-[#140508] dark:text-zinc-100 leading-5"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#3B0B14]/10 dark:border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedApp(null)}
                disabled={savingAppNote}
                className="cursor-pointer"
              >
                بستن
              </Button>
              <Button
                type="button"
                onClick={handleSaveAppDetails}
                disabled={savingAppNote}
                className="gap-2 bg-[#3B0B14] hover:bg-[#8B142D] text-white dark:bg-[#8B142D] cursor-pointer"
              >
                <Save size={16} />
                <span>{savingAppNote ? "در حال ذخیره..." : "ذخیره وضعیت و یادداشت"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
