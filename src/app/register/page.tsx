"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { pb } from "@/lib/pocketbase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const registerSchema = z.object({
  name: z.string().trim().min(2, { message: "نام و نام خانوادگی باید حداقل ۲ حرف باشد" }),
  email: z.string().trim().email({ message: "ایمیل وارد شده نامعتبر است" }),
  phone: z.string().trim().regex(/^09\d{9}$/, { message: "شماره موبایل باید ۱۱ رقم بوده و با ۰۹ آغاز شود (مثال: 09123456789)" }),
  password: z.string().min(8, { message: "رمز عبور باید حداقل ۸ کاراکتر باشد" }),
  passwordConfirm: z.string().min(1, { message: "تکرار رمز عبور الزامی است" }),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "تکرار رمز عبور با رمز اصلی همخوانی ندارد",
  path: ["passwordConfirm"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

/* المان گرافیکی درخت سرو */
const SarvIcon = () => (
  <svg width="28" height="32" viewBox="0 0 24 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#8B142D]">
    <path d="M12 1L3 9C3 14 7 19 12 24C17 19 21 14 21 9L12 1Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M12 7V22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M9 24H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setServerError("");

    try {
      const email = data.email.trim().toLowerCase();
      const phone = data.phone.trim().replace(/\s/g, "");

      // ۱. ساخت کاربر در پاکت‌بیس
      await pb.collection("users").create({
        email,
        password: data.password,
        passwordConfirm: data.passwordConfirm,
        name: data.name.trim(),
        phone,
        role: "user",
      });

      // ۲. ورود خودکار پس از ثبت‌نام
      await pb.collection("users").authWithPassword(email, data.password);

      // ذخیره کوکی احراز هویت
      const cookieString = pb.authStore.exportToCookie({ httpOnly: false });
      Cookies.set("pb_auth", cookieString, { expires: 7, path: "/" });

      // ۳. انتقال به صفحه اصلی
      router.push("/");
      router.refresh();
    } catch (error: any) {
      console.error("Register error:", error);
      const data = error?.response?.data;
      const errorList: string[] = [];

      if (data && typeof data === "object") {
        if (data.password?.message) {
          errorList.push("رمز عبور باید حداقل ۸ کاراکتر باشد.");
        }
        if (data.passwordConfirm?.message) {
          errorList.push("تکرار رمز عبور با رمز اصلی همخوانی ندارد.");
        }
        if (data.email?.message) {
          errorList.push("این نشانی ایمیل قبلاً در سامانه ثبت‌نام کرده است.");
        }
        if (data.phone?.message) {
          errorList.push("این شماره موبایل قبلاً ثبت شده یا نامعتبر است.");
        }
        if (data.name?.message) {
          errorList.push("نام و نام خانوادگی نامعتبر است.");
        }
      }

      let errorMsg = "";
      if (errorList.length > 0) {
        errorMsg = errorList.join(" | ");
      } else if (error?.status === 403) {
        errorMsg = "دسترسی ایجاد کاربر در حال حاضر مجاز نیست.";
      } else if (error?.message?.toLowerCase().includes("email")) {
        errorMsg = "این ایمیل قبلاً در سیستم ثبت شده است.";
      } else {
        errorMsg = error?.response?.message || error?.message || "خطا در ثبت‌نام. لطفاً صحت اطلاعات را بررسی کنید.";
      }

      setServerError(errorMsg);
      toast.error(errorList[0] || errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-40 pb-12 px-4 bg-[#FDF8F9] text-[#3B0B14] font-sans" dir="rtl">
      <div className="max-w-md w-full p-8 md:p-10 rounded-[2.5rem] border-2 border-[#3B0B14] bg-white shadow-[0_20px_50px_rgba(59, 11, 20,0.08)] relative overflow-hidden">
        
        {/* المان تزئینی پس‌زمینه کارت */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#8B142D]/5 rounded-full blur-2xl pointer-events-none" />

        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-[#FDF8F9] border border-[#3B0B14]/20 flex items-center justify-center mb-4 shadow-xs">
            <SarvIcon />
          </div>
          <h2 className="text-2xl font-extrabold text-center text-[#3B0B14] font-heading">ثبت‌نام در پرنا زر</h2>
          <p className="text-xs mt-1.5 text-[#8B142D] font-bold">مثل زر بدرخش ✨</p>
        </div>

        {/* Error Box */}
        {serverError && (
          <div className="p-3.5 rounded-2xl mb-5 text-xs text-center border font-bold bg-red-50 text-red-600 border-red-100 shadow-xs relative z-10">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-bold mb-1.5 text-[#3B0B14]">نام و نام خانوادگی</label>
            <input 
              {...register("name")} 
              type="text" 
              className="w-full p-3.5 border border-[#3B0B14]/20 bg-[#FDF8F9] text-[#3B0B14] rounded-2xl focus:border-[#8B142D] outline-none transition text-sm font-medium" 
              placeholder="مثال: اکبر احمدی" 
            />
            {errors.name && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-[#3B0B14]">ایمیل</label>
            <input 
              {...register("email")} 
              type="email" 
              className="w-full p-3.5 border border-[#3B0B14]/20 bg-[#FDF8F9] text-[#3B0B14] rounded-2xl focus:border-[#8B142D] outline-none transition text-left text-sm font-medium" 
              placeholder="yourmail@example.com" 
              dir="ltr" 
            />
            {errors.email && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-[#3B0B14]">شماره موبایل</label>
            <input 
              {...register("phone")} 
              type="tel" 
              className="w-full p-3.5 border border-[#3B0B14]/20 bg-[#FDF8F9] text-[#3B0B14] rounded-2xl focus:border-[#8B142D] outline-none transition text-left text-sm font-medium" 
              placeholder="09123456789" 
              dir="ltr" 
            />
            {errors.phone && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-[#3B0B14]">رمز عبور</label>
            <div className="relative">
              <input 
                {...register("password")} 
                type={showPassword ? "text" : "password"} 
                className="w-full p-3.5 pl-11 border border-[#3B0B14]/20 bg-[#FDF8F9] text-[#3B0B14] rounded-2xl focus:border-[#8B142D] outline-none transition text-left text-sm font-medium" 
                dir="ltr" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E3A44] hover:text-[#3B0B14] transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-[#3B0B14]">تکرار رمز عبور</label>
            <div className="relative">
              <input 
                {...register("passwordConfirm")} 
                type={showPasswordConfirm ? "text" : "password"} 
                className="w-full p-3.5 pl-11 border border-[#3B0B14]/20 bg-[#FDF8F9] text-[#3B0B14] rounded-2xl focus:border-[#8B142D] outline-none transition text-left text-sm font-medium" 
                dir="ltr" 
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E3A44] hover:text-[#3B0B14] transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.passwordConfirm && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.passwordConfirm.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full text-white font-bold py-4 rounded-2xl flex justify-center items-center gap-2 transition-all shadow-md bg-[#3B0B14] hover:bg-[#8B142D] disabled:opacity-70 disabled:cursor-not-allowed text-sm mt-3 cursor-pointer"
          >
            {isLoading && <Loader2 size={18} className="animate-spin" />}
            {isLoading ? "در حال ثبت اطلاعات..." : "ثبت‌نام و عضویت در پرنا زر"}
          </button>
        </form>

        <p className="text-center text-xs mt-6 text-[#6E3A44] relative z-10 font-medium">
          قبلاً ثبت‌نام کرده‌اید؟{" "}
          <Link href="/login" className="font-bold text-[#8B142D] hover:text-[#3B0B14] transition-colors underline underline-offset-4">
            وارد شوید
          </Link>
        </p>
      </div>
    </div>
  );
}