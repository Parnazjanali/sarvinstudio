"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowRight, Home, Lock } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center bg-[#FDF8F9] p-4 text-[#3B0B14] font-sans"
    >
      <div className="w-full max-w-md rounded-3xl border border-[#3B0B14]/15 bg-white p-8 text-center shadow-xs">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#8B142D]/10 text-[#8B142D]">
          <ShieldAlert className="h-10 w-10" />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <Lock className="h-4 w-4 text-[#8B142D]" />
          <span className="text-xs font-bold text-[#8B142D]">
            خطای دسترسی ۴۰۳
          </span>
        </div>

        <h1 className="mt-2 text-2xl font-black text-[#3B0B14]">
          دسترسی محدود شده است
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#6E3A44]">
          این بخش فقط مخصوص مدیران ارشد پرنا زر است. حساب کاربری شما اجازه ورود به پنل مدیریت را ندارد.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#3B0B14] px-5 py-3.5 text-xs font-black text-white shadow-sm transition hover:bg-[#8B142D]"
          >
            <Home className="h-4 w-4" />
            <span>بازگشت به صفحه اصلی فروشگاه</span>
          </Link>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 rounded-2xl border border-[#3B0B14]/15 bg-[#FDF8F9] px-5 py-3.5 text-xs font-bold text-[#3B0B14] transition hover:bg-[#3B0B14]/5"
          >
            <ArrowRight className="h-4 w-4" />
            <span>ورود با حساب مدیر</span>
          </Link>
        </div>

        <div className="mt-6 border-t border-[#3B0B14]/10 pt-4 text-[11px] text-[#6E3A44]">
          در صورت بروز مشکل با پشتیبانی فنی استودیو تماس بگیرید.
        </div>
      </div>
    </main>
  );
}