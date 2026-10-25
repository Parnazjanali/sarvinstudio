"use client";

import { useState } from "react";
import { 
  Sparkles, 
  UploadCloud, 
  ArrowLeft, 
  CheckCircle2, 
  Scale, 
  Image as ImageIcon,
  X,
  PhoneCall
} from "lucide-react";
import Link from "next/link";
import pb from "@/lib/pocketbase";
import { toast } from "sonner";

const CATEGORIES = [
  { id: "انگشتر", label: "انگشتر" },
  { id: "گردنبند", label: "گردنبند و آویز" },
  { id: "دستبند", label: "دستبند / النگو" },
  { id: "گوشواره", label: "گوشواره" },
  { id: "نیم‌ست", label: "نیم‌ست یا ست کامل" },
  { id: "سایر", label: "سایر ایده‌ها" },
];

const GOLD_COLORS = [
  { id: "زرد نباتی", label: "زرد نباتی", hex: "#E6CA7A" },
  { id: "سفید", label: "سفید", hex: "#E2E8F0" },
  { id: "رزگلد", label: "رزگلد", hex: "#FBCFE8" },
];

export default function CustomOrderPage() {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form State
  const [category, setCategory] = useState("انگشتر");
  const [goldColor, setGoldColor] = useState("زرد نباتی");
  const [approxWeight, setApproxWeight] = useState<number>(3.5);
  const [description, setDescription] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("لطفاً نام خود را وارد فرمایید.");
      return;
    }
    if (!customerPhone.trim()) {
      toast.error("لطفاً شماره تماس را وارد فرمایید.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("gold_color", goldColor);
      formData.append("estimated_weight", String(approxWeight));
      formData.append("description", description);
      formData.append("customer_name", customerName);
      formData.append("customer_phone", customerPhone);
      formData.append("status", "pending");

      files.forEach((file) => {
        formData.append("reference_images", file);
      });

      await pb.collection("custom_orders").create(formData);
      
      setIsSuccess(true);
      toast.success("پیام شما با موفقیت ارسال شد.");
    } catch (err: any) {
      console.error("PocketBase Submission Error:", err?.data || err);
      toast.error(err?.message || "خطا در ثبت سفارش. لطفاً مقادیر انتخابی را با پنل پاکت‌بیس تطبیق دهید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <main dir="rtl" className="min-h-screen flex items-center justify-center px-5 pt-36 sm:pt-44 pb-24 bg-[#FCFCFA] dark:bg-[#101813] text-[#1C3324] dark:text-zinc-100">
        <div className="max-w-md w-full text-center bg-white dark:bg-[#15221B] p-8 sm:p-10 rounded-3xl border border-[#D8B65C]/40 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          
          <div className="absolute top-0 right-1/2 translate-x-1/2 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle2 size={44} className="stroke-[2.5]" />
          </div>

          <h2 className="relative z-10 text-xl sm:text-2xl font-black mb-3 text-[#1C3324] dark:text-white">
            پیام شما با موفقیت ارسال شد
          </h2>

          <div className="relative z-10 bg-[#FAF9F6] dark:bg-[#101813] p-4 rounded-2xl border border-[#1C3324]/10 dark:border-white/10 mb-6">
            <p className="text-xs sm:text-sm text-[#3A5A46] dark:text-zinc-300 font-bold leading-relaxed flex items-center justify-center gap-2">
              <PhoneCall size={16} className="text-[#8B263E] dark:text-[#D8B65C]" />
              به زودی جهت هماهنگی و مشاوره با شما تماس گرفته می‌شود.
            </p>
          </div>

          <div className="relative z-10 flex flex-col gap-3">
            <Link
              href="/"
              className="w-full py-3.5 bg-[#1C3324] dark:bg-[#D8B65C] text-white dark:text-[#101813] rounded-full text-xs font-black hover:bg-[#8B263E] dark:hover:bg-[#E6CA7A] transition-all flex items-center justify-center gap-2 shadow-md"
            >
              بازگشت به ویترین و صفحه اصلی <ArrowLeft size={14} />
            </Link>
            
            <button
              onClick={() => {
                setIsSuccess(false);
                setStep(1);
                setFiles([]);
                setDescription("");
              }}
              className="text-xs text-zinc-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer py-1"
            >
              ثبت یک سفارش ساخت دیگر
            </button>
          </div>

        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="bg-[#FCFCFA] dark:bg-[#101813] text-[#1C3324] dark:text-zinc-100 min-h-screen pt-36 sm:pt-44 pb-24 px-5 sm:px-8">
      <div className="max-w-3xl mx-auto">

        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#8B263E] dark:text-[#D8B65C] uppercase tracking-wider mb-2">
            <Sparkles size={14} /> آتلیه زرگری و ساخت سفارشی
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C3324] dark:text-white mb-3">
            سفارش طراحی و ساخت اختصاصی طلا
          </h1>
          <p className="text-xs sm:text-sm text-[#3A5A46] dark:text-zinc-300 max-w-lg mx-auto leading-relaxed">
            ایده، تصویر یا طرح ذهنی خود را ثبت کنید؛ ما آن را با طلای ۱۸ عیار استاندارد و شناسنامه معتبر به واقعیت تبدیل می‌کنیم.
          </p>
        </div>

        <div className="flex items-center justify-between mb-8 max-w-xs mx-auto px-4">
          <div className={`flex items-center gap-2 text-xs font-bold transition-all ${step >= 1 ? "text-[#8B263E] dark:text-[#D8B65C]" : "opacity-40"}`}>
            <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-[11px]">۱</span>
            <span>مشخصات اثر</span>
          </div>
          <div className="flex-1 h-px bg-current opacity-20 mx-3" />
          <div className={`flex items-center gap-2 text-xs font-bold transition-all ${step >= 2 ? "text-[#8B263E] dark:text-[#D8B65C]" : "opacity-40"}`}>
            <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-[11px]">۲</span>
            <span>طرح و اطلاعات تماس</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#15221B] rounded-3xl p-6 sm:p-10 border border-[#1C3324]/10 dark:border-white/10 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-8">

            {step === 1 && (
              <div className="space-y-6">

                <div>
                  <label className="block text-xs font-black text-[#1C3324] dark:text-white mb-3">
                    نوع قطعه مورد نظر:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {CATEGORIES.map((cat) => (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          category === cat.id
                            ? "bg-[#1C3324] dark:bg-[#D8B65C] text-white dark:text-[#101813] border-transparent shadow-xs"
                            : "bg-[#FCFCFA] dark:bg-[#101813] text-[#3A5A46] dark:text-zinc-300 border-[#1C3324]/10 dark:border-white/10 hover:border-[#8B263E]"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#1C3324] dark:text-white mb-3">
                    رنگ طلا (۱۸ عیار - ۷۵۰):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {GOLD_COLORS.map((col) => (
                      <button
                        type="button"
                        key={col.id}
                        onClick={() => setGoldColor(col.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          goldColor === col.id
                            ? "border-[#8B263E] dark:border-[#D8B65C] bg-[#FAF9F6] dark:bg-white/5"
                            : "border-[#1C3324]/10 dark:border-white/10"
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: col.hex }} />
                        <span>{col.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black text-[#1C3324] dark:text-white flex items-center gap-1.5">
                      <Scale size={14} className="text-[#8B263E] dark:text-[#D8B65C]" />
                      وزن تقریبی مدنظر (گرم):
                    </label>
                    <span className="text-xs font-mono font-black text-[#8B263E] dark:text-[#D8B65C]">
                      {approxWeight} گرم
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="0.5"
                    value={approxWeight}
                    onChange={(e) => setApproxWeight(Number(e.target.value))}
                    className="w-full accent-[#8B263E] dark:accent-[#D8B65C] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                    <span>۱ گرم (بسیار سبک و ظریف)</span>
                    <span>۸ گرم (متوسط)</span>
                    <span>۱۵+ گرم (درشت و توپر)</span>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-6 py-3 bg-[#1C3324] dark:bg-[#D8B65C] text-white dark:text-[#101813] text-xs font-bold rounded-full hover:bg-[#8B263E] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    مرحله بعد: ثبت طرح و اطلاعات <ArrowLeft size={14} />
                  </button>
                </div>

              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">

                <div>
                  <label className="block text-xs font-black text-[#1C3324] dark:text-white mb-2">
                    تصویر نمونه، عکس ژورنالی یا اتود طرح (اختیاری):
                  </label>
                  <label className="border-2 border-dashed border-[#1C3324]/20 dark:border-white/20 hover:border-[#8B263E] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#FCFCFA] dark:bg-[#101813]">
                    <UploadCloud size={28} className="text-[#8B263E] dark:text-[#D8B65C] mb-2" />
                    <span className="text-xs font-bold text-[#1C3324] dark:text-zinc-200">
                      برای انتخاب عکس کلیک کنید یا فایل را اینجا رها کنید
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-1">JPG, PNG (حداکثر ۱۰ مگابایت)</span>
                    <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>

                  {files.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {files.map((file, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#1C3324]/20 dark:border-white/20 group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt="preview"
                            className="w-full h-full object-cover"
                            onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black text-[#1C3324] dark:text-white mb-2">
                    توضیحات اختصاصی، سایز یا متن حکاکی:
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="مثال: انگشتر با نگین یاقوت کبود اشکی، روی بدنه عبارت خاصی حکاکی شود..."
                    className="w-full text-xs p-3.5 rounded-xl border border-[#1C3324]/10 dark:border-white/10 bg-[#FCFCFA] dark:bg-[#101813] text-[#1C3324] dark:text-white focus:outline-none focus:border-[#8B263E]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold mb-1.5">نام و نام‌خانوادگی:</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="مثال: مریم محمدی"
                      className="w-full text-xs p-3 rounded-xl border border-[#1C3324]/10 dark:border-white/10 bg-[#FCFCFA] dark:bg-[#101813] focus:outline-none focus:border-[#8B263E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5">شماره تماس (جهت هماهنگی):</label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0912..."
                      className="w-full text-xs p-3 rounded-xl border border-[#1C3324]/10 dark:border-white/10 bg-[#FCFCFA] dark:bg-[#101813] focus:outline-none focus:border-[#8B263E] text-right"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#1C3324]/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-zinc-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                  >
                    بازگشت به مرحله قبل
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3.5 bg-[#8B263E] dark:bg-[#D8B65C] text-white dark:text-[#101813] text-xs font-black rounded-full hover:opacity-90 transition-all flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        در حال ارسال به آتلیه...
                      </span>
                    ) : (
                      "تأیید و ارسال به آتلیه طراحی"
                    )}
                  </button>
                </div>

              </div>
            )}

          </form>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> ارائه طرح سه‌بعدی پیش از ریخته‌گری</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> فاکتور رسمی معتبر طلا</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> امکان پرداخت اقساطی هزینه ساخت</span>
        </div>

      </div>
    </main>
  );
}