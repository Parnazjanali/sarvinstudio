"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  MapPin,
  Clock,
  Coins,
  Send,
  UploadCloud,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Award,
  HeartHandshake,
  FileCheck,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface JobPosition {
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
  is_active?: boolean;
}

export default function CareersPage() {
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>("همه");

  // وضعیت مودال ارسال رزومه
  const [selectedJob, setSelectedJob] = useState<JobPosition | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    experience_years: "",
    portfolio_link: "",
    message: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  useEffect(() => {
    async function loadPositions() {
      try {
        setLoading(true);
        // فراخوانی امن بدون ایجاد خطای 400 فیلتر سروری
        const records = await pb.collection("job_positions").getFullList<JobPosition>({
          requestKey: null,
        });

        const activeOnly = records.filter(
          (item) => item.is_active === undefined || item.is_active === true
        );
        setPositions(activeOnly);
      } catch (err: any) {
        console.error("Error loading careers:", err);
        console.error("PocketBase Response Data:", err?.data);
        toast.error("خطا در بارگذاری فهرست موقعیت‌های شغلی.");
      } finally {
        setLoading(false);
      }
    }
    void loadPositions();
  }, []);

  // جلوگیری از اسکرول صفحه هنگام باز بودن مودال
  useEffect(() => {
    if (selectedJob) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedJob]);

  const departments = [
    "همه",
    ...(Array.from(new Set(positions.map((p) => p.department).filter(Boolean))) as string[]),
  ];

  const filteredPositions =
    selectedDept === "همه"
      ? positions
      : positions.filter((p) => p.department === selectedDept);

  const openApplyModal = (job: JobPosition) => {
    setSelectedJob(job);
    setSubmittedSuccess(false);
    setForm({
      full_name: "",
      phone: "",
      email: "",
      experience_years: "",
      portfolio_link: "",
      message: "",
    });
    setResumeFile(null);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    if (!form.full_name.trim() || !form.phone.trim()) {
      toast.error("لطفاً نام و شماره همراه را تکمیل فرمایید.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("job_id", selectedJob.id);
      formData.append("job_title", selectedJob.title);
      formData.append("full_name", form.full_name.trim());
      formData.append("phone", form.phone.trim());
      formData.append("email", form.email.trim());
      formData.append("experience_years", form.experience_years.trim());
      formData.append("portfolio_link", form.portfolio_link.trim());
      formData.append("message", form.message.trim());
      formData.append("status", "new");

      if (resumeFile) {
        formData.append("resume", resumeFile);
      }

      await pb.collection("job_applications").create(formData);
      setSubmittedSuccess(true);
      toast.success("درخواست شما با موفقیت ثبت شد.");
    } catch (err: any) {
      console.error("Error submitting job application:", err);
      console.error("PocketBase Response Data:", err?.data);
      toast.error("خطا در ارسال اطلاعات. لطفاً مجدداً تلاش نمایید.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCF8F9] text-[#2B0810] dark:bg-[#0F0407] dark:text-zinc-100 font-sans pb-24" dir="rtl">
      {/* هدر بنر - پدینگ بالا و پایین به اندازه کافی تنظیم شده است */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#2E070F] via-[#480B18] to-[#1F0409] pt-36 pb-32 sm:pb-36 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#E2B872_1px,transparent_1px)] [background-size:28px_28px]" />
        
        <div className="container relative mx-auto max-w-4xl px-4 text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#E2B872]/20 text-[#F5D59A] border border-[#E2B872]/30">
            <Sparkles size={13} />
            فرصت‌های شغلی و همکاری
          </span>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            مسیر درخشش حرفه‌ای شما
          </h1>

          <p className="mx-auto max-w-xl text-xs sm:text-sm text-zinc-300 leading-relaxed">
            به جمع تیمی مشتاق و نوآور در زمینه طراحی، تولید، فروش و توسعه فناوری بپیوندید و با تکیه‌بر هنر و تخصص همراه ما رشد کنید.
          </p>

          <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-zinc-200 backdrop-blur-xs">
              <Award size={16} className="text-[#E2B872]" />
              <span>پاداش عملکرد و پورسانت عالی</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-zinc-200 backdrop-blur-xs">
              <Sparkles size={16} className="text-[#E2B872]" />
              <span>فضای رشد و ارتقای شغلی</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-zinc-200 backdrop-blur-xs">
              <HeartHandshake size={16} className="text-[#E2B872]" />
              <span>بیمه و تسهیلات رفاهی</span>
            </div>
          </div>
        </div>
      </section>

      {/* کانتینر سفید با relative و z-10 که به درستی روی لبه بنر تیره قرار می‌گیرد */}
      <main className="relative z-10 container mx-auto max-w-4xl px-4 -mt-14 sm:-mt-16 space-y-6">
        <div className="rounded-3xl border border-[#2B0810]/10 bg-white p-5 sm:p-8 shadow-2xl dark:border-white/10 dark:bg-[#18060B]">
          {/* نوار سربرگ فهرست */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#2B0810]/10 dark:border-white/10">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">
                فرصت‌های شغلی فعال ({filteredPositions.length})
              </h2>
              <p className="text-xs text-[#7B4652] dark:text-zinc-400 mt-1">
                جایگاه مورد نظر خود را بررسی کرده و رزومه خود را ارسال فرمایید.
              </p>
            </div>
            <Link
              href="/"
              className="text-xs font-semibold text-[#8C142B] hover:text-[#B22234] dark:text-[#E2B872] transition"
            >
              بازگشت به فروشگاه ←
            </Link>
          </div>

          {/* فیلتر دسته‌بندی دپارتمان‌ها */}
          {departments.length > 2 && (
            <div className="flex items-center gap-2 pt-4 overflow-x-auto no-scrollbar pb-1">
              {departments.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  className={`text-xs px-3.5 py-1.5 rounded-xl font-medium transition shrink-0 cursor-pointer ${
                    selectedDept === dept
                      ? "bg-[#2E070F] text-white dark:bg-[#E2B872] dark:text-[#2E070F]"
                      : "bg-[#2E070F]/5 text-[#7B4652] hover:bg-[#2E070F]/10 dark:bg-white/5 dark:text-zinc-300"
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          )}

          {/* محتوای لیست موقعیت‌ها */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-xs text-[#7B4652]">
              <Loader2 className="animate-spin text-[#8C142B]" size={24} />
              <span>در حال بارگذاری فرصت‌های همکاری...</span>
            </div>
          ) : filteredPositions.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <Briefcase size={36} className="mx-auto text-zinc-300 dark:text-zinc-600" />
              <p className="text-xs font-semibold text-zinc-500">
                در حال حاضر موقعیت شغلی متناسبی در این بخش ثبت نشده است.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {filteredPositions.map((pos) => {
                const isExpanded = expandedId === pos.id;
                return (
                  <div
                    key={pos.id}
                    className="rounded-2xl border border-[#2B0810]/10 bg-[#FCF8F9] transition hover:border-[#8C142B]/30 dark:border-white/10 dark:bg-zinc-900/40 overflow-hidden"
                  >
                    <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-[#2E070F] dark:text-white">
                            {pos.title}
                          </h3>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#E2B872]/20 text-[#8C142B] dark:text-[#F5D59A]">
                            {pos.employment_type || "تمام‌وقت"}
                          </span>
                          {pos.department && (
                            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                              • {pos.department}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-[#7B4652] dark:text-zinc-300">
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={13} className="text-[#8C142B]" />
                            {pos.location || "تهران"}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Coins size={13} className="text-[#8C142B]" />
                            {pos.salary_range || "حقوق توافقی"}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock size={13} className="text-[#8C142B]" />
                            {pos.experience_level || "سابقه کار مرتبط"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {(pos.description || pos.requirements || pos.benefits) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedId(isExpanded ? null : pos.id)}
                            className="text-xs h-9 gap-1 text-[#7B4652] dark:text-zinc-300"
                          >
                            <span>جزئیات</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => openApplyModal(pos)}
                          className="h-9 text-xs font-semibold gap-1.5 bg-[#2E070F] hover:bg-[#8C142B] text-white dark:bg-[#8C142B] dark:hover:bg-[#A31833] cursor-pointer"
                        >
                          <Send size={13} />
                          <span>ارسال رزومه</span>
                        </Button>
                      </div>
                    </div>

                    {/* جزئیات بازشونده */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 sm:px-6 sm:pb-6 border-t border-[#2B0810]/5 dark:border-white/5 space-y-3 text-xs leading-relaxed text-[#5F353E] dark:text-zinc-300">
                        {pos.description && (
                          <div>
                            <span className="font-bold text-[#2E070F] dark:text-white block mb-0.5">
                              شرح وظایف و نقش:
                            </span>
                            <p>{pos.description}</p>
                          </div>
                        )}
                        {pos.requirements && (
                          <div>
                            <span className="font-bold text-[#2E070F] dark:text-white block mb-0.5">
                              شرایط احراز و مهارت‌ها:
                            </span>
                            <p>{pos.requirements}</p>
                          </div>
                        )}
                        {pos.benefits && (
                          <div>
                            <span className="font-bold text-[#2E070F] dark:text-white block mb-0.5">
                              مزایا و امکانات:
                            </span>
                            <p>{pos.benefits}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* مودال ثبت درخواست همکاری */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-[#2B0810]/15 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#18060B] text-right font-sans max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-[#2B0810]/10 pb-3 dark:border-white/10">
              <div>
                <h3 className="text-base font-bold text-[#2E070F] dark:text-zinc-100">
                  ارسال رزومه: {selectedJob.title}
                </h3>
                <span className="text-[11px] text-[#7B4652] dark:text-zinc-400">
                  فرم همکاری شغلی
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="rounded-xl p-1.5 text-zinc-400 hover:bg-black/5 hover:text-zinc-800 dark:hover:bg-white/5 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {submittedSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                  <CheckCircle2 size={30} />
                </div>
                <h4 className="text-base font-bold text-[#2E070F] dark:text-white">
                  رزومه شما با موفقیت دریافت شد
                </h4>
                <p className="text-xs text-[#7B4652] dark:text-zinc-300 leading-relaxed max-w-xs mx-auto">
                  تیم منابع انسانی رزومه شما را بررسی کرده و در صورت هماهنگی اولیه، با شما تماس خواهد گرفت.
                </p>
                <Button
                  onClick={() => setSelectedJob(null)}
                  className="mt-3 text-xs font-semibold"
                >
                  متوجه شدم
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmitApplication} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-[#5F353E] dark:text-zinc-300 block mb-1">
                    نام و نام خانوادگی <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="مثال: سارا محمدی"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[#5F353E] dark:text-zinc-300 block mb-1">
                      شماره تماس همراه <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      type="tel"
                      dir="ltr"
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#5F353E] dark:text-zinc-300 block mb-1">
                      آدرس ایمیل
                    </label>
                    <Input
                      type="email"
                      dir="ltr"
                      placeholder="name@domain.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[#5F353E] dark:text-zinc-300 block mb-1">
                      سابقه کار مرتبط
                    </label>
                    <Input
                      placeholder="مثال: ۳ سال"
                      value={form.experience_years}
                      onChange={(e) => setForm({ ...form, experience_years: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#5F353E] dark:text-zinc-300 block mb-1">
                      لینک نمونه‌کار / گیت‌هاب / رزومه آنلاین
                    </label>
                    <Input
                      dir="ltr"
                      placeholder="https://..."
                      value={form.portfolio_link}
                      onChange={(e) => setForm({ ...form, portfolio_link: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-[#5F353E] dark:text-zinc-300 block mb-1">
                    فایل رزومه (PDF یا Word)
                  </label>
                  <label className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2B0810]/20 bg-[#FCF8F9] p-4 text-center cursor-pointer hover:border-[#8C142B] transition dark:border-white/10 dark:bg-zinc-900/50">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    {resumeFile ? (
                      <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs">
                        <FileCheck size={18} />
                        <span>{resumeFile.name}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-zinc-500">
                        <UploadCloud size={20} className="text-[#8C142B]" />
                        <span className="text-[11px]">برای انتخاب فایل کلیک کنید یا فایل را اینجا رها نمایید</span>
                      </div>
                    )}
                  </label>
                </div>

                <div>
                  <label className="font-semibold text-[#5F353E] dark:text-zinc-300 block mb-1">
                    توضیحات یا پیام شما
                  </label>
                  <textarea
                    rows={3}
                    placeholder="مختصری درباره مهارت‌ها و علاقه‌مندی‌های خود بنویسید..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-xs outline-none focus:border-[#8C142B] dark:border-white/10 dark:bg-[#100306] dark:text-zinc-100"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2B0810]/10 dark:border-white/10">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedJob(null)}
                    disabled={submitting}
                  >
                    انصراف
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="gap-1.5 bg-[#2E070F] hover:bg-[#8C142B] text-white dark:bg-[#8C142B]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>در حال ارسال...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>ارسال نهایی رزومه</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}