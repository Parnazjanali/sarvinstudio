"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { pb } from "@/lib/pocketbase";
import { recordAuditLogClient } from "@/lib/audit-client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import { Loader2, Eye, EyeOff, ArrowRight, ShieldCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const loginSchema = z.object({
  identifier: z.string().min(3, { message: "لطفاً ایمیل یا شماره تلفن معتبر وارد کنید" }),
  password: z.string().optional(),
  otpCode: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

/* المان گرافیکی درخت سرو */
const SarvIcon = () => (
  <svg width="28" height="32" viewBox="0 0 24 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#8B263E]">
    <path d="M12 1L3 9C3 14 7 19 12 24C17 19 21 14 21 9L12 1Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M12 7V22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M9 24H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // مدیریت مراحل: مرحله ۱ (وارد کردن ایمیل/تلفن)، مرحله ۲ (رمز عبور)، مرحله ۳ (کد OTP)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userIdentifier, setUserIdentifier] = useState("");

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // رفتن به مرحله بعد پس از وارد کردن ایمیل/تلفن
  const handleNextStep = (data: LoginFormData) => {
    const identifier = data.identifier?.trim();
    if (!identifier) return;
    setUserIdentifier(identifier);
    setServerError("");
    setStep(2); // ورود به مرحله رمز عبور
  };

  // ارسال کد OTP
  const handleRequestOtp = async () => {
    setIsLoading(true);
    setServerError("");
    try {
      // TODO: اتصال به سرویس ارسال SMS یا ایمیل کد تایید
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStep(3); // ورود به صفحه وارد کردن کد تایید
      toast.success("کد تایید یک‌بار مصرف ارسال شد.");
    } catch (err) {
      setServerError("خطا در ارسال کد تایید. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsLoading(false);
    }
  };

  // تایید نهایی ورود
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setServerError("");

    const identifier = userIdentifier || data.identifier?.trim();

    try {
      let authData;
      let isAdmin = false;

      if (step === 2) {
        // حالت ورود با رمز عبور
        const password = data.password;
        if (!password) {
          setServerError("لطفاً رمز عبور را وارد کنید.");
          setIsLoading(false);
          return;
        }

        try {
          let targetEmail = identifier;
          if (!identifier.includes("@")) {
            const records = await pb.collection("users").getList(1, 1, {
              filter: `phone = "${identifier}"`,
            });
            if (records.items.length > 0) {
              targetEmail = records.items[0].email;
            } else {
              throw new Error("کاربری با این مشخصات یافت نشد.");
            }
          }

          authData = await pb.collection("users").authWithPassword(targetEmail, password);
          const role = (authData.record as any)?.role;
          const directIsAdmin = (authData.record as any)?.isAdmin;
          if (role === "admin" || role === "Admin" || role === "superadmin" || directIsAdmin) {
            isAdmin = true;
          }
        } catch (userLoginErr) {
          try {
            authData = await pb.collection("_superusers").authWithPassword(identifier, password);
            isAdmin = true;
          } catch {
            throw userLoginErr;
          }
        }
      } else if (step === 3) {
        // حالت ورود با کد OTP
        const otp = data.otpCode;
        if (!otp || otp.length < 4) {
          setServerError("لطفاً کد تایید معتبر وارد کنید.");
          setIsLoading(false);
          return;
        }
        // TODO: بررسی صحت کد OTP در سرور و دریافت دسترسی کاربر
        toast.success("ورود موفقیت‌آمیز!");
      }

      const cookieString = pb.authStore.exportToCookie({ httpOnly: false });
      Cookies.set("pb_auth", cookieString, { expires: 7, path: "/" });

      // ثبت خودکار لاگ ورود
      void recordAuditLogClient({
        category: "auth",
        title: isAdmin ? "ورود مدیر به سامانه" : "ورود کاربر به سیستم",
        description: `کاربر با شناسه/ایمیل ${identifier} با موفقیت وارد سیستم شد.`,
        level: "info",
        targetId: (authData?.record as any)?.id,
        targetType: "user",
      });

      const redirectUrl = searchParams.get("redirect");
      if (redirectUrl && redirectUrl.startsWith("/") && !redirectUrl.startsWith("//")) {
        router.replace(redirectUrl);
      } else if (isAdmin) {
        router.replace("/dashboard");
      } else {
        router.replace("/");
      }
      router.refresh();
    } catch (error: unknown) {
      console.error("خطای ورود:", error);
      setServerError("اطلاعات ورودی اشتباه است.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF9F6] font-sans" dir="rtl">
      <div className="max-w-md w-full p-8 md:p-10 rounded-[2.5rem] border-2 border-[#1C3324] bg-white shadow-[0_20px_50px_rgba(28,51,36,0.08)] relative overflow-hidden">
        
        {/* المان تزئینی پس‌زمینه کارت */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#8B263E]/5 rounded-full blur-2xl pointer-events-none" />

        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-[#FAF9F6] border border-[#1C3324]/20 flex items-center justify-center mb-4 shadow-xs">
            <SarvIcon />
          </div>
          <h2 className="text-2xl font-extrabold text-center text-[#1C3324] font-heading">ورود به پرنا زر</h2>
          <p className="text-xs mt-1.5 text-[#8B263E] font-bold">مثل زر بدرخش ✨</p>
        </div>

        {serverError && (
          <div className="bg-red-50 text-red-600 p-3.5 rounded-2xl mb-5 text-xs text-center border border-red-100 font-bold shadow-xs">
            {serverError}
          </div>
        )}

        {/* مرحله ۱: ورود ایمیل یا شماره تلفن */}
        {step === 1 && (
          <form onSubmit={handleSubmit(handleNextStep)} className="space-y-5 relative z-10">
            <div>
              <label className="block text-xs font-bold mb-2 text-[#1C3324]">ایمیل یا شماره تلفن همراه</label>
              <input 
                {...register("identifier")} 
                type="text" 
                className="w-full p-3.5 border border-[#1C3324]/20 bg-[#FAF9F6] text-[#1C3324] rounded-2xl focus:border-[#8B263E] outline-none transition text-left text-sm font-medium" 
                placeholder="09123456789 یا email@example.com" 
                dir="ltr" 
              />
              {errors.identifier && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.identifier.message}</p>}
            </div>

            <button
              type="submit"
              className="w-full text-white font-bold py-4 flex justify-center items-center gap-2 rounded-2xl transition-all shadow-md bg-[#1C3324] hover:bg-[#8B263E] text-sm cursor-pointer"
            >
              مرحله بعد <ArrowLeft size={16} />
            </button>
          </form>
        )}

        {/* مرحله ۲: وارد کردن رمز عبور یا انتخاب ورود با OTP */}
        {step === 2 && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 relative z-10">
            <div className="bg-[#FAF9F6] p-3.5 rounded-2xl border border-[#1C3324]/10 flex items-center justify-between">
              <span className="text-xs text-[#3A5A46] font-medium" dir="ltr">{userIdentifier}</span>
              <button 
                type="button" 
                onClick={() => setStep(1)} 
                className="text-[11px] font-bold text-[#8B263E] hover:underline cursor-pointer"
              >
                تغییر
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold mb-2 text-[#1C3324]">رمز عبور</label>
              <div className="relative">
                <input 
                  {...register("password")} 
                  type={showPassword ? "text" : "password"} 
                  className="w-full p-3.5 pl-11 border border-[#1C3324]/20 bg-[#FAF9F6] text-[#1C3324] rounded-2xl focus:border-[#8B263E] outline-none transition text-left text-sm font-medium" 
                  dir="ltr" 
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3A5A46] hover:text-[#1C3324] transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.password.message}</p>}
            </div>

            <div className="text-left">
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={isLoading}
                className="text-xs font-bold text-[#8B263E] hover:underline cursor-pointer"
              >
                ورود با رمز یک‌بار مصرف (OTP)
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-white font-bold py-4 flex justify-center items-center gap-2 rounded-2xl transition-all shadow-md bg-[#1C3324] hover:bg-[#8B263E] disabled:opacity-70 text-sm cursor-pointer"
            >
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              {isLoading ? "در حال ورود..." : "ورود به حساب کاربری"}
            </button>
          </form>
        )}

        {/* مرحله ۳: وارد کردن کد تایید OTP */}
        {step === 3 && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative z-10">
            <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#1C3324]/10 text-center">
              <p className="text-xs text-[#3A5A46] font-medium">کد تایید ارسال شد به:</p>
              <p className="text-sm font-extrabold text-[#1C3324] mt-1" dir="ltr">{userIdentifier}</p>
              <button 
                type="button" 
                onClick={() => setStep(2)} 
                className="text-[11px] font-bold text-[#8B263E] underline mt-2 cursor-pointer"
              >
                بازگشت به رمز عبور
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold mb-2 text-[#1C3324]">کد تایید ۵ رقمی</label>
              <input 
                {...register("otpCode")} 
                type="text" 
                maxLength={5}
                placeholder="-----"
                className="w-full p-4 border border-[#1C3324]/20 bg-[#FAF9F6] text-[#1C3324] rounded-2xl focus:border-[#8B263E] outline-none transition text-center text-xl tracking-[1em] font-bold" 
                dir="ltr" 
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-white font-bold py-4 flex justify-center items-center gap-2 rounded-2xl transition-all shadow-md bg-[#1C3324] hover:bg-[#8B263E] disabled:opacity-70 text-sm cursor-pointer"
            >
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              {isLoading ? "در حال تایید..." : "تایید و ورود"}
            </button>
          </form>
        )}

        <p className="text-center text-xs mt-6 text-[#3A5A46] relative z-10 font-medium">
          هنوز به جمع ما نپیوسته‌اید؟{" "}
          <Link href="/register" className="font-bold text-[#8B263E] hover:text-[#1C3324] transition-colors underline underline-offset-4">
            ثبت‌نام در پرنا زر
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center"><Loader2 className="animate-spin text-[#1C3324]" size={32} /></div>}>
      <LoginFormContent />
    </Suspense>
  );
}