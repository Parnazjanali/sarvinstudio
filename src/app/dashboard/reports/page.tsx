"use client";

import React, { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  Scale,
  ArrowUpRight,
  Filter,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

export default function DashboardReportsPage() {
  const [timeRange, setTimeRange] = useState("month");
  const [isExporting, setIsExporting] = useState(false);

  // تابع خروجی اکسل (Excel)
  const handleExcelExport = () => {
    try {
      const reportData = [
        { شاخص: "بازه زمانی گزارش", مقدار: timeRange },
        { شاخص: "سود ناخالص واقعی", مقدار: "۰ تومان" },
        { شاخص: "مجموع فروش کل", مقدار: "۰ تومان" },
        { شاخص: "وزن کل طلای معامله‌شده", مقدار: "۰.۰۰ گرم" },
        { شاخص: "فاکتورهای ثبت‌شده", مقدار: "۰ سفارش" },
      ];

      const worksheet = XLSX.utils.json_to_sheet(reportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "گزارش مالی سروین");

      XLSX.writeFile(workbook, `sarvin-financial-report-${timeRange}.xlsx`);
    } catch (error) {
      console.error("Excel export error:", error);
      alert("خطا در ایجاد فایل اکسل رخ داد.");
    }
  };

  // تابع خروجی PDF ایمن و بدون خطای رنگ
  const handlePDFExport = () => {
    try {
      setIsExporting(true);
      const pdf = new jsPDF("p", "mm", "a4");

      // تنظیمات ظاهر و متون سند PDF
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text("Sarvin Studio - Financial Report", 105, 20, { align: "center" });

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Time Range: ${timeRange}`, 20, 35);
      pdf.text(`Generation Date: ${new Date().toLocaleDateString()}`, 20, 45);

      pdf.text("------------------------------------------------------------------------------------------------", 20, 52);
      
      pdf.setFont("helvetica", "bold");
      pdf.text("Performance Summary:", 20, 62);
      
      pdf.setFont("helvetica", "normal");
      pdf.text("• Gross Profit: 0 Tomans", 25, 72);
      pdf.text("• Total Sales: 0 Tomans", 25, 82);
      pdf.text("• Total Gold Weight Traded: 0.00 grams", 25, 92);
      pdf.text("• Registered Invoices: 0 orders", 25, 102);

      pdf.text("------------------------------------------------------------------------------------------------", 20, 112);
      pdf.text("Material Analysis (Gold Colors):", 20, 122);
      pdf.text("• Yellow Gold: 0%", 25, 132);
      pdf.text("• White Gold: 0%", 25, 142);
      pdf.text("• Rose Gold: 0%", 25, 152);
      pdf.text("• Mixed / Two-Tone: 0%", 25, 162);

      pdf.save(`sarvin-financial-report-${timeRange}.pdf`);
    } catch (error) {
      console.error("PDF export error:", error);
      alert("خطا در ایجاد فایل PDF رخ داد.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main 
      dir="rtl" 
      className="min-h-screen bg-white px-4 py-6 font-sans text-[#1C3324] sm:px-6 lg:px-8 space-y-6"
    >
      
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1C3324] text-white shadow-xs">
              <BarChart3 className="h-5 w-5" />
            </div>

            <h1 className="text-xl font-black text-[#1C3324]">
              گزارش‌ها و تحلیل سود گالری
            </h1>
          </div>

          <p className="mt-2 text-xs font-medium text-[#3A5A46]">
            گزارش جامع مالی، تحلیل سود ناخالص، وزن طلای معامله‌شده و عملکرد فروش سروین استودیو.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* فیلتر بازه زمانی */}
          <div className="flex items-center gap-2 rounded-2xl border border-[#1C3324]/15 bg-white px-3 py-2 shadow-xs">
            <Filter className="h-3.5 w-3.5 text-[#8B263E]" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#1C3324] outline-none cursor-pointer"
            >
              <option value="today">امروز</option>
              <option value="week">این هفته</option>
              <option value="month">این ماه</option>
              <option value="year">سال جاری</option>
            </select>
          </div>

          {/* دکمه‌های خروجی اکسل و پی دی اف */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExcelExport}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#1C3324] px-4 py-3 text-xs font-black text-white shadow-sm transition hover:bg-[#8B263E] cursor-pointer"
              title="خروجی فایل اکسل"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">اکسل</span>
            </button>

            <button
              type="button"
              onClick={handlePDFExport}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-3 text-xs font-black text-[#1C3324] shadow-sm transition hover:border-[#8B263E] hover:text-[#8B263E] disabled:opacity-50 cursor-pointer"
              title="خروجی فایل PDF"
            >
              <FileText className="h-4 w-4 text-[#8B263E]" />
              <span className="hidden sm:inline">{isExporting ? "در حال ساخت..." : "PDF"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards (تخصصی طلا و جواهر) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* سود ناخالص واقعی */}
        <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#3A5A46]">سود ناخالص واقعی</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E]">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1C3324]">۰ تومان</div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>محاسبه شده از اجرت و سود گالری</span>
          </div>
        </div>

        {/* فروش کل */}
        <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#3A5A46]">مجموع فروش کل</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E]">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1C3324]">۰ تومان</div>
          <p className="mt-2 text-[11px] font-medium text-[#3A5A46]">بر اساس فاکتورهای صادرشده</p>
        </div>

        {/* وزن کل طلای فروخته شده */}
        <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#3A5A46]">وزن کل طلای معامله‌شده</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E]">
              <Scale className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1C3324]">۰.۰۰ گرم</div>
          <p className="mt-2 text-[11px] font-medium text-[#3A5A46]">مجموع وزن خالص کارهای فروخته شده</p>
        </div>

        {/* تعداد سفارش‌های تکمیل‌شده */}
        <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#3A5A46]">فاکتورهای ثبت‌شده</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E]">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1C3324]">۰ سفارش</div>
          <p className="mt-2 text-[11px] font-medium text-[#3A5A46]">میانگین ارزش هر فاکتور: —</p>
        </div>

      </div>

      {/* تفکیک تحلیل متریال و دسته‌بندی‌ها */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* تحلیل فروش بر اساس رنگ متریال */}
        <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-base font-black text-[#1C3324]">تحلیل فروش بر اساس رنگ متریال</h3>
          <p className="text-xs text-[#3A5A46]">سهم هر کدام از رنگ‌های طلا در میزان فروش گالری</p>
          
          <div className="space-y-3 pt-2">
            {[
              { label: "طلای زرد", percent: "۰٪", color: "bg-amber-500" },
              { label: "طلای سفید", percent: "۰٪", color: "bg-slate-300" },
              { label: "رزگلد", percent: "۰٪", color: "bg-rose-400" },
              { label: "دو رنگ / ترکیبی", percent: "۰٪", color: "bg-[#1C3324]" },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#1C3324]">{item.label}</span>
                  <span className="text-[#3A5A46]">{item.percent}</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-zinc-100 border border-[#1C3324]/10 overflow-hidden">
                  <div className={`h-full ${item.color} w-0 transition-all duration-500`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* وضعیت سفارشات و تحویل */}
        <div className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-base font-black text-[#1C3324]">وضعیت تحویل و آماده‌سازی</h3>
          <p className="text-xs text-[#3A5A46]">نسبت سفارش‌های «ارسال فوری» به «ساخت سفارشی»</p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="rounded-2xl border border-[#1C3324]/10 bg-white p-4 text-center shadow-xs">
              <span className="text-xs font-bold text-[#3A5A46]">ارسال فوری</span>
              <div className="mt-2 text-xl font-black text-[#1C3324]">۰٪</div>
            </div>
            <div className="rounded-2xl border border-[#1C3324]/10 bg-white p-4 text-center shadow-xs">
              <span className="text-xs font-bold text-[#3A5A46]">ساخت سفارشی</span>
              <div className="mt-2 text-xl font-black text-[#1C3324]">۰٪</div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-800">
            میانگین زمان تحویل سفارش‌های سفارشی: ۳ روز کاری.
          </div>
        </div>

      </div>

    </main>
  );
}