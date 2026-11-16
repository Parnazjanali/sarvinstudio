"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Camera,
  Check,
  Loader2,
  Mail,
  Phone,
  Save,
  User,
  X,
  CreditCard,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { pb } from "@/lib/pocketbase";

interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  nationalId?: string;
  avatar?: string;
  collectionId?: string;
  collectionName?: string;
}

/**
 * الگوریتم استاندارد صحت‌سنجی کد ملی جمهوری اسلامی ایران
 */
export function checkIranianNationalCode(code: string): boolean {
  if (!/^\d{10}$/.test(code)) return false;
  // کدهای تکراری مانند 1111111111 یا 0000000000 نامعتبرند
  if (/^(\d)\1{9}$/.test(code)) return false;

  const check = parseInt(code.charAt(9), 10);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(code.charAt(i), 10) * (10 - i);
  }
  const remainder = sum % 11;
  return (remainder < 2 && check === remainder) || (remainder >= 2 && check === 11 - remainder);
}

// ساختار اعتبارسنجی با Zod
const profileValidationSchema = z.object({
  name: z.string().trim().min(2, { message: "نام و نام خانوادگی باید حداقل ۲ کاراکتر باشد." }),
  phone: z
    .string()
    .trim()
    .refine((val) => val === "" || /^09\d{9}$/.test(val), {
      message: "شماره تماس باید دقیقاً ۱۱ رقم و با ۰۹ شروع شود (مثال: 09123456789).",
    }),
  nationalId: z
    .string()
    .trim()
    .refine((val) => val === "" || checkIranianNationalCode(val), {
      message: "کد ملی وارد شده ۱۰ رقمی معتبر نمی‌باشد (خطای الگوریتم هویت ملی).",
    }),
});

export default function EditAccountPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [isNationalIdLocked, setIsNationalIdLocked] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = () => {
    try {
      setLoading(true);

      if (!pb.authStore.isValid || !pb.authStore.model) {
        router.replace("/login");
        return;
      }

      const record = pb.authStore.model as UserProfile;
      setUser(record);

      setName(record.name || "");
      setPhone(record.phone || "");

      const cleanSavedNationalId = (record.nationalId || "").trim();
      setNationalId(cleanSavedNationalId);

      // در صورتی که کد ملی قبلاً ثبت شده باشد، قفل می‌شود و کاربر دیگر نمی‌تواند آن را تغییر دهد
      if (cleanSavedNationalId && checkIranianNationalCode(cleanSavedNationalId)) {
        setIsNationalIdLocked(true);
      } else {
        setIsNationalIdLocked(false);
      }

      if (record.avatar && record.collectionId) {
        setAvatarPreview(
          pb.files.getURL(record as never, record.avatar, {
            thumb: "300x300",
          })
        );
      } else {
        setAvatarPreview("");
      }
    } catch (error) {
      console.error("Load profile error:", error);
      toast.error("دریافت اطلاعات حساب با خطا مواجه شد.");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم تصویر نباید بیشتر از ۵ مگابایت باشد.");
      event.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("لطفاً یک فایل تصویری انتخاب کنید.");
      event.target.value = "";
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const removeSelectedAvatar = () => {
    setAvatarFile(null);

    if (user?.avatar && user.collectionId) {
      setAvatarPreview(
        pb.files.getURL(user as never, user.avatar, {
          thumb: "300x300",
        })
      );
    } else {
      setAvatarPreview("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || !pb.authStore.model) {
      toast.error("اطلاعات کاربر پیدا نشد.");
      router.replace("/login");
      return;
    }

    // مقدار نهایی کد ملی: اگر قبلاً قفل شده، مقدار ثبت‌شده قبلی؛ در غیر این صورت مقدار واردشده جدید
    const effectiveNationalId = isNationalIdLocked ? (user.nationalId || "") : nationalId.trim();

    // اعتبارسنجی دقیق فرم با کتابخانه Zod
    const validationResult = profileValidationSchema.safeParse({
      name: name.trim(),
      phone: phone.trim(),
      nationalId: effectiveNationalId,
    });

    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      toast.error(firstIssue?.message || "اطلاعات وارد شده نامعتبر است.");
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("phone", phone.trim());

      // فقط در صورتی که کد ملی تغییر نکرده باشد یا برای اولین بار با Zod تایید شده ثبت شود
      if (!isNationalIdLocked && effectiveNationalId) {
        formData.append("nationalId", effectiveNationalId);
      }

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const userId = pb.authStore.model.id;

      const updatedUser = await pb
        .collection("users")
        .update<UserProfile>(userId, formData, {
          requestKey: null,
        });

      setUser(updatedUser);
      setAvatarFile(null);

      if (updatedUser.avatar && updatedUser.collectionId) {
        setAvatarPreview(
          pb.files.getURL(updatedUser as never, updatedUser.avatar, {
            thumb: "300x300",
          })
        );
      }

      try {
        await pb.collection("users").authRefresh();
      } catch (refreshError) {
        console.warn("Auth refresh failed:", refreshError);
      }

      toast.success("اطلاعات حساب با موفقیت ذخیره شد.");
      router.push("/account");
    } catch (error: unknown) {
      console.error("Update profile error:", error);
      let message = "ذخیره اطلاعات با خطا مواجه شد.";

      if (typeof error === "object" && error !== null && "response" in error) {
        const pbError = error as {
          response?: { message?: string; data?: Record<string, { message?: string }> };
        };
        const firstErr = Object.values(pbError.response?.data || {}).find(
          (f) => f?.message
        );
        if (firstErr?.message) message = firstErr.message;
        else if (pbError.response?.message) message = pbError.response.message;
      }

      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen flex items-center justify-center pt-36 bg-[#FDF8F9]"
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={34} className="animate-spin text-[#3B0B14]" />
          <p className="text-sm font-bold text-[#6E3A44]">
            در حال دریافت اطلاعات حساب...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen pb-24 pt-36 lg:pt-42 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDF8F9] text-[#3B0B14]"
    >
      <div className="mx-auto w-full max-w-4xl">
        
        {/* هدر صفحه */}
        <div className="mb-7">
          <Link
            href="/account"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#8B142D] transition hover:opacity-75"
          >
            <ArrowRight size={16} />
            بازگشت به حساب کاربری
          </Link>

          <h1 className="text-2xl md:text-3xl font-black text-[#3B0B14]">
            ویرایش اطلاعات شخصی
          </h1>

          <p className="mt-1.5 text-xs sm:text-sm text-[#6E3A44]">
            مشخصات فردی و اطلاعات حساب کاربری خود را در پرنا زر مدیریت کنید.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-[260px_1fr]">
            
            {/* بخش آواتار */}
            <section className="h-fit rounded-3xl border border-[#DFB76C]/30 bg-white p-6 shadow-xs">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-[#FDF8F9] border border-[#DFB76C]/30 shadow-inner">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="تصویر پروفایل"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={52} strokeWidth={1.5} className="text-[#3B0B14]" />
                    )}
                  </div>

                  <label
                    htmlFor="avatar"
                    className="absolute bottom-0 left-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#8B142D] text-white shadow-md transition-transform hover:scale-105"
                  >
                    <Camera size={18} />
                    <input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>

                <h2 className="mt-5 text-base font-bold text-[#3B0B14]">
                  تصویر پروفایل
                </h2>

                <p className="mt-1 text-center text-xs text-[#6E3A44]">
                  حداکثر حجم: ۵ مگابایت
                </p>

                {avatarFile && (
                  <div className="mt-4 flex w-full items-center justify-between rounded-2xl bg-[#FDF8F9] border border-[#DFB76C]/30 px-3.5 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Check size={16} className="text-emerald-600" />
                      <span className="truncate text-xs text-[#3B0B14] font-semibold">
                        تصویر جدید انتخاب شد
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={removeSelectedAvatar}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-black/5 text-[#6E3A44] cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* فرم اطلاعات فردی */}
            <section className="rounded-3xl border border-[#DFB76C]/30 bg-white p-6 md:p-8 shadow-xs">
              <div className="mb-6">
                <h2 className="text-lg font-black text-[#3B0B14]">
                  مشخصات هویتی
                </h2>
                <p className="mt-1 text-xs text-[#6E3A44]">
                  اطلاعات شناسایی و ارتباطی شما
                </p>
              </div>

              <div className="space-y-4">
                {/* نام و نام خانوادگی */}
                <div>
                  <label htmlFor="name" className="mb-2 block text-xs font-bold text-[#3B0B14]">
                    نام و نام خانوادگی <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B142D]" />
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثلاً پرناز جلالی"
                      className="w-full rounded-2xl border border-[#3B0B14]/15 bg-[#FDF8F9] py-3 pl-4 pr-12 text-sm text-[#3B0B14] outline-none transition focus:border-[#8B142D] font-medium"
                    />
                  </div>
                </div>

                {/* ایمیل (غیرقابل تغییر) */}
                <div>
                  <label htmlFor="email" className="mb-2 block text-xs font-bold text-[#3B0B14]">
                    ایمیل (شناسه کاربری)
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6E3A44]" />
                    <input
                      id="email"
                      type="email"
                      value={user.email || ""}
                      readOnly
                      disabled
                      className="w-full cursor-not-allowed rounded-2xl border border-[#3B0B14]/10 bg-[#FDF8F9]/50 py-3 pl-4 pr-12 text-sm text-[#6E3A44] outline-none font-medium"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-[#6E3A44]/70">
                    امکان تغییر ایمیل حساب کاربری وجود ندارد.
                  </p>
                </div>

                {/* شماره موبایل - محدود شده به دقیقاً حداکثر ۱۱ رقم */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="phone" className="block text-xs font-bold text-[#3B0B14]">
                      شماره موبایل
                    </label>
                    <span className="text-[10px] text-[#6E3A44] font-mono">
                      {phone.length}/۱۱ رقم
                    </span>
                  </div>
                  <div className="relative">
                    <Phone size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B142D]" />
                    <input
                      id="phone"
                      type="tel"
                      maxLength={11}
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      placeholder="09120000000"
                      dir="ltr"
                      className="w-full rounded-2xl border border-[#3B0B14]/15 bg-[#FDF8F9] py-3 pl-4 pr-12 text-right text-sm text-[#3B0B14] outline-none transition focus:border-[#8B142D] font-medium font-mono"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-[#6E3A44]/70">
                    شماره موبایل جهت هماهنگی ارسال سفارش‌ها و یادآور اقساط (۱۱ رقم با پیش‌شماره ۰۹).
                  </p>
                </div>

                {/* کد ملی با اعتبارسنجی Zod و امکان قفل شدن */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="nationalId" className="block text-xs font-bold text-[#3B0B14]">
                      کد ملی
                    </label>
                    {isNationalIdLocked && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <ShieldCheck size={12} />
                        احراز هویت شده (قفل)
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    {isNationalIdLocked ? (
                      <Lock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-700" />
                    ) : (
                      <CreditCard size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B142D]" />
                    )}
                    <input
                      id="nationalId"
                      type="text"
                      maxLength={10}
                      inputMode="numeric"
                      disabled={isNationalIdLocked}
                      readOnly={isNationalIdLocked}
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="۱۰ رقم بدون خط تیره"
                      dir="ltr"
                      className={`w-full rounded-2xl border py-3 pl-4 pr-12 text-right text-sm outline-none transition font-medium font-mono ${
                        isNationalIdLocked
                          ? "cursor-not-allowed border-emerald-200 bg-emerald-50/40 text-emerald-900"
                          : "border-[#3B0B14]/15 bg-[#FDF8F9] text-[#3B0B14] focus:border-[#8B142D]"
                      }`}
                    />
                  </div>
                  {isNationalIdLocked ? (
                    <p className="mt-1 text-[11px] text-emerald-800 font-medium">
                      کد ملی شما با موفقیت تایید و احراز شده و جهت رعایت الزامات قانونی اتحادیه طلا غیرقابل تغییر است.
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-[#6E3A44]/70">
                      کد ملی جهت صدور فاکتور رسمی اتحادیه طلا الزامی است و با الگوریتم ملی صحت‌سنجی می‌شود. پس از ثبت، قفل خواهد شد.
                    </p>
                  )}
                </div>
              </div>

              {/* دکمه‌های عملیاتی */}
              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row pt-4 border-t border-[#3B0B14]/10">
                <Link
                  href="/account"
                  className="flex-1 flex items-center justify-center rounded-2xl border border-[#3B0B14]/15 bg-[#FDF8F9] px-5 py-3 text-xs font-bold text-[#3B0B14] transition hover:bg-[#3B0B14]/5"
                >
                  انصراف
                </Link>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#3B0B14] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#8B142D] disabled:cursor-not-allowed disabled:opacity-60 shadow-xs cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      در حال ذخیره...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      ذخیره تغییرات
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>
        </form>
      </div>
    </main>
  );
}
