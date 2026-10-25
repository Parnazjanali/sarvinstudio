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
} from "lucide-react";
import { toast } from "sonner";
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

export default function EditAccountPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");

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
      setNationalId(record.nationalId || "");

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

  const validateForm = () => {
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanNationalId = nationalId.trim();

    if (!cleanName || cleanName.length < 2) {
      toast.error("نام باید حداقل ۲ کاراکتر باشد.");
      return false;
    }

    if (cleanPhone) {
      const normalizedPhone = cleanPhone.replace(/\s+/g, "");
      const iranPhoneRegex = /^(?:\+98|0098|0)?9\d{9}$/;

      if (!iranPhoneRegex.test(normalizedPhone)) {
        toast.error("شماره موبایل واردشده معتبر نیست.");
        return false;
      }
    }

    if (cleanNationalId && !/^\d{10}$/.test(cleanNationalId)) {
      toast.error("کد ملی باید دقیقاً ۱۰ رقم باشد.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || !pb.authStore.model) {
      toast.error("اطلاعات کاربر پیدا نشد.");
      router.replace("/login");
      return;
    }

    if (!validateForm()) return;

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("phone", phone.trim());
      formData.append("nationalId", nationalId.trim());

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
        className="min-h-screen flex items-center justify-center pt-36 bg-[#FAF9F6]"
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={34} className="animate-spin text-[#1C3324]" />
          <p className="text-sm font-bold text-[#3A5A46]">
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
      className="min-h-screen pb-24 pt-36 lg:pt-42 px-4 sm:px-6 lg:px-8 font-sans bg-[#FAF9F6] text-[#1C3324]"
    >
      <div className="mx-auto w-full max-w-4xl">
        
        {/* هدر صفحه */}
        <div className="mb-7">
          <Link
            href="/account"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#8B263E] transition hover:opacity-75"
          >
            <ArrowRight size={16} />
            بازگشت به حساب کاربری
          </Link>

          <h1 className="text-2xl md:text-3xl font-black text-[#1C3324]">
            ویرایش اطلاعات شخصی
          </h1>

          <p className="mt-1.5 text-xs sm:text-sm text-[#3A5A46]">
            مشخصات فردی و اطلاعات حساب کاربری خود را در پرنا زر مدیریت کنید.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-[260px_1fr]">
            
            {/* بخش آواتار */}
            <section className="h-fit rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-[#FAF9F6] border border-[#1C3324]/15 shadow-inner">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="تصویر پروفایل"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={52} strokeWidth={1.5} className="text-[#1C3324]" />
                    )}
                  </div>

                  <label
                    htmlFor="avatar"
                    className="absolute bottom-0 left-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#8B263E] text-white shadow-md transition-transform hover:scale-105"
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

                <h2 className="mt-5 text-base font-bold text-[#1C3324]">
                  تصویر پروفایل
                </h2>

                <p className="mt-1 text-center text-xs text-[#3A5A46]">
                  حداکثر حجم: ۵ مگابایت
                </p>

                {avatarFile && (
                  <div className="mt-4 flex w-full items-center justify-between rounded-2xl bg-[#FAF9F6] border border-[#1C3324]/15 px-3.5 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Check size={16} className="text-emerald-600" />
                      <span className="truncate text-xs text-[#1C3324] font-semibold">
                        تصویر جدید انتخاب شد
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={removeSelectedAvatar}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-black/5 text-[#3A5A46] cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* فرم اطلاعات فردی */}
            <section className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 md:p-8 shadow-xs">
              <div className="mb-6">
                <h2 className="text-lg font-black text-[#1C3324]">
                  مشخصات هویتی
                </h2>
                <p className="mt-1 text-xs text-[#3A5A46]">
                  اطلاعات شناسایی و ارتباطی شما
                </p>
              </div>

              <div className="space-y-4">
                {/* نام و نام خانوادگی */}
                <div>
                  <label htmlFor="name" className="mb-2 block text-xs font-bold text-[#1C3324]">
                    نام و نام خانوادگی
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B263E]" />
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثلاً پرناز جلالی"
                      className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] py-3 pl-4 pr-12 text-sm text-[#1C3324] outline-none transition focus:border-[#8B263E] font-medium"
                    />
                  </div>
                </div>

                {/* ایمیل (غیرقابل تغییر) */}
                <div>
                  <label htmlFor="email" className="mb-2 block text-xs font-bold text-[#1C3324]">
                    ایمیل (شناسه کاربری)
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3A5A46]" />
                    <input
                      id="email"
                      type="email"
                      value={user.email || ""}
                      readOnly
                      disabled
                      className="w-full cursor-not-allowed rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6]/50 py-3 pl-4 pr-12 text-sm text-[#3A5A46] outline-none font-medium"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-[#3A5A46]/70">
                    امکان تغییر ایمیل وجود ندارد.
                  </p>
                </div>

                {/* شماره موبایل */}
                <div>
                  <label htmlFor="phone" className="mb-2 block text-xs font-bold text-[#1C3324]">
                    شماره موبایل
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B263E]" />
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09120000000"
                      dir="ltr"
                      className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] py-3 pl-4 pr-12 text-right text-sm text-[#1C3324] outline-none transition focus:border-[#8B263E] font-medium"
                    />
                  </div>
                </div>

                {/* کد ملی */}
                <div>
                  <label htmlFor="nationalId" className="mb-2 block text-xs font-bold text-[#1C3324]">
                    کد ملی
                  </label>
                  <div className="relative">
                    <CreditCard size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B263E]" />
                    <input
                      id="nationalId"
                      type="text"
                      maxLength={10}
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="۱۰ رقم بدون خط تیره"
                      dir="ltr"
                      className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] py-3 pl-4 pr-12 text-right text-sm text-[#1C3324] outline-none transition focus:border-[#8B263E] font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* دکمه‌های عملیاتی */}
              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row pt-4 border-t border-[#1C3324]/10">
                <Link
                  href="/account"
                  className="flex-1 flex items-center justify-center rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-5 py-3 text-xs font-bold text-[#1C3324] transition hover:bg-[#1C3324]/5"
                >
                  انصراف
                </Link>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#1C3324] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#8B263E] disabled:cursor-not-allowed disabled:opacity-60 shadow-xs cursor-pointer"
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