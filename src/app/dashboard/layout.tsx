"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#FCFCFA] text-[#1C3324] transition-colors duration-300 dark:bg-[#101813] dark:text-zinc-100 font-sans print:bg-white print:text-black print:min-h-0"
    >
      <div className="flex min-h-screen print:block">
        {/* سایدبار دسکتاپ (ثابت در سمت راست - مخفی در زمان چاپ) */}
        <aside className="fixed inset-y-0 right-0 z-40 hidden w-72 lg:block print:hidden">
          <DashboardSidebar />
        </aside>

        {/* سایدبار موبایل به همراه Overlay (مخفی در زمان چاپ) */}
        {mobileSidebarOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden print:hidden">
            <button
              type="button"
              aria-label="بستن منوی کناری"
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
            />

            <div className="absolute inset-y-0 right-0 w-[300px] max-w-[85vw] bg-white shadow-2xl transition-transform dark:bg-[#121A15] border-l border-[#1C3324]/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                aria-label="بستن منو"
                className="absolute left-3.5 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-xl border border-[#1C3324]/10 bg-white text-[#1C3324] shadow-xs transition-colors hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <DashboardSidebar
                mobile
                onNavigate={() => setMobileSidebarOpen(false)}
              />
            </div>
          </div>
        ) : null}

        {/* بخش اصلی و تاپ‌بار با فاصله مناسب از سایدبار در حالت دسکتاپ */}
        <div className="flex min-w-0 flex-1 flex-col lg:mr-72 print:mr-0 print:w-full print:block">
          <div className="print:hidden">
            <DashboardTopbar
              onOpenSidebar={() => setMobileSidebarOpen(true)}
            />
          </div>

          <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6 lg:p-8 print:p-0 print:m-0 print:max-w-none print:w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}