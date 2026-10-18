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
      className="min-h-screen bg-white text-zinc-900 transition-colors duration-300 dark:bg-[#12100D] dark:text-zinc-100"
    >
      <div className="flex min-h-screen">
        {/* سایدبار دسکتاپ (فیکس شده در سمت راست) */}
        <aside className="fixed inset-y-0 right-0 z-40 hidden w-72 lg:block">
          <DashboardSidebar />
        </aside>

        {/* سایدبار موبایل به همراه Overlay */}
        {mobileSidebarOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="بستن منوی کناری"
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            />

            <div className="absolute inset-y-0 right-0 w-[320px] max-w-[85vw] bg-white shadow-2xl transition-transform dark:bg-[#1A1815]">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                aria-label="بستن منو"
                className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-md transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>

              <DashboardSidebar
                mobile
                onNavigate={() => setMobileSidebarOpen(false)}
              />
            </div>
          </div>
        ) : null}

        {/* محتوای اصلی و تاپ‌بار با فاصله مناسب از سایدبار در دسکتاپ */}
        <div className="flex min-w-0 flex-1 flex-col lg:mr-72">
          <DashboardTopbar
            onOpenSidebar={() => setMobileSidebarOpen(true)}
          />

          <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6 lg:p-8 bg-white">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}