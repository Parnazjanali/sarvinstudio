"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowRight, Home, Lock } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center bg-[#FAF9F6] p-4 text-[#1C3324] font-sans"
    >
      <div className="w-full max-w-md rounded-3xl border border-[#1C3324]/15 bg-white p-8 text-center shadow-xs">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#8B263E]/10 text-[#8B263E]">
          <ShieldAlert className="h-10 w-10" />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <Lock className="h-4 w-4 text-[#8B263E]" />
          <span className="text-xs font-bold text-[#8B263E]">
            خطای دسترسی ۴۰۳
          </span>
        </div>

        <h1 className="mt-2 text-2xl font-black text-[#1C3324]">
          دسترسی محدود شده است
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#3A5A46]">
          این بخش فقط مخصوص مدیران ارشد پرنا زر است. حساب کاربری شما اجازه ورود به پنل مدیریت را ندارد.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#1C3324] px-5 py-3.5 text-xs font-black text-white shadow-sm transition hover:bg-[#8B263E]"
          >
            <Home className="h-4 w-4" />
            <span>بازگشت به صفحه اصلی فروشگاه</span>
          </Link>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-5 py-3.5 text-xs font-bold text-[#1C3324] transition hover:bg-[#1C3324]/5"
          >
            <ArrowRight className="h-4 w-4" />
            <span>ورود با حساب مدیر</span>
          </Link>
        </div>

        <div className="mt-6 border-t border-[#1C3324]/10 pt-4 text-[11px] text-[#3A5A46]">
          در صورت بروز مشکل با پشتیبانی فنی استودیو تماس بگیرید.
        </div>
      </div>
    </main>
  );
}