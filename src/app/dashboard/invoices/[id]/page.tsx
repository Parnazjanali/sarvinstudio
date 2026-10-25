"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Printer,
  CheckCircle2,
  Clock3,
  XCircle,
  Gem,
  Coins,
  ShieldCheck,
  Building2,
  User,
  Phone,
  CreditCard,
  Download,
  Share2,
  Calendar,
  Scale,
} from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { numberToWordsPersian } from "@/lib/format";
import { cn } from "@/lib/utils";

/* =========================================================
   Types
========================================================= */

interface GoldItem {
  id?: string;
  title: string;
  weight: number;
  karat?: number;
  rawGoldValue?: number;
  wagePercent?: number;
  wageAmount?: number;
  profitPercent?: number;
  profitAmount?: number;
  taxPercent?: number;
  taxAmount?: number;
  totalPrice?: number;
}

interface UserRecord {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  national_id?: string;
  address?: string;
}

interface ProductRecord {
  id: string;
  name?: string;
  title?: string;
  weight?: number;
  karat?: number;
  wage_percent?: number;
  profit_percent?: number;
  tax_percent?: number;
}

interface InvoiceRecord {
  id: string;
  invoiceNumber?: string;
  order?: string;
  user?: string;
  paidAmount?: number;
  totalAmount?: number;
  product?: string;
  paymentStatus?: "unpaid" | "partial" | "paid" | "refunded";
  discount?: number;
  customerName?: string;
  customerPhone?: string;
  customerNationalId?: string;
  customerAddress?: string;
  goldRate?: number;
  totalWeight?: number;
  wageAmount?: number;
  profitAmount?: number;
  taxAmount?: number;
  items?: GoldItem[];
  notes?: string;
  sellerName?: string;
  created: string;
  updated: string;

  expand?: {
    user?: UserRecord;
    product?: ProductRecord;
  };
}

/* =========================================================
   Component
========================================================= */

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = typeof params?.id === "string" ? params.id : "";

  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInvoice() {
      if (!invoiceId) return;
      try {
        setLoading(true);
        const record = await pb.collection("invoices").getOne<InvoiceRecord>(invoiceId, {
          expand: "user,product",
          requestKey: null,
        });
        setInvoice(record);
      } catch (err) {
        console.error("Failed to load invoice details:", err);
      } finally {
        setLoading(false);
      }
    }
    void loadInvoice();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-sans text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#1C3324] border-t-transparent dark:border-[#D8B65C] dark:border-t-transparent" />
          <span>در حال بارگذاری جزئیات فاکتور رسمی طلا...</span>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center font-sans text-center">
        <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">فاکتور مورد نظر یافت نشد.</h2>
        <Button
          onClick={() => router.push("/dashboard/invoices")}
          variant="default"
          className="mt-4 text-xs font-bold"
        >
          بازگشت به لیست فاکتورها
        </Button>
      </div>
    );
  }

  // داده‌های خریدار
  const customerUser = invoice.expand?.user;
  const customerName = invoice.customerName || customerUser?.name || customerUser?.email || "خریدار محترم";
  const customerPhone = invoice.customerPhone || customerUser?.phone || "—";
  const customerNationalId = invoice.customerNationalId || customerUser?.national_id || "—";
  const customerAddress = invoice.customerAddress || customerUser?.address || "—";

  // تاریخ و ساعت صدور
  const issueDate = new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(invoice.created));

  const issueTime = new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(invoice.created));

  // استخراج اقلام طلا
  let invoiceItems: GoldItem[] = [];
  if (Array.isArray(invoice.items) && invoice.items.length > 0) {
    invoiceItems = invoice.items;
  } else if (invoice.expand?.product) {
    const p = invoice.expand.product;
    const weight = Number(p.weight) || 1;
    const karat = Number(p.karat) || 18;
    const goldRate = Number(invoice.goldRate) || 0;
    const rawVal = weight * goldRate * (karat / 18);
    invoiceItems = [
      {
        title: p.title || p.name || "قطعه طلا",
        weight,
        karat,
        rawGoldValue: rawVal,
        wagePercent: Number(p.wage_percent) || 0,
        profitPercent: Number(p.profit_percent) || 7,
        taxPercent: Number(p.tax_percent) || 9,
        totalPrice: Number(invoice.totalAmount) || 0,
      },
    ];
  } else {
    invoiceItems = [
      {
        title: "مصنوعات و سفارش طلا",
        weight: Number(invoice.totalWeight) || 0,
        karat: 18,
        totalPrice: Number(invoice.totalAmount) || 0,
      },
    ];
  }

  const totalAmount = Number(invoice.totalAmount) || 0;
  const paidAmount = Number(invoice.paidAmount) || 0;
  const discount = Number(invoice.discount) || 0;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  // وضعیت پرداخت
  const paymentStatus = invoice.paymentStatus || "paid";

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-[#1C3324] dark:text-zinc-100 print:max-w-none print:m-0 print:p-0" dir="rtl">
      
      {/* دکمه‌های کنترل بالا (در زمان چاپ کاملاً مخفی می‌شوند) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#1C3324]/12 bg-white/80 p-4 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80 print:hidden">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/invoices" className="gap-2 text-xs font-bold">
              <ArrowRight className="h-4 w-4" />
              <span>بازگشت به لیست</span>
            </Link>
          </Button>

          <Badge
            variant={
              paymentStatus === "paid"
                ? "success"
                : paymentStatus === "partial"
                ? "secondary"
                : "warning"
            }
            className="text-xs font-bold px-3 py-1"
          >
            {paymentStatus === "paid"
              ? "تسویه کامل"
              : paymentStatus === "partial"
              ? "بیعانه (پرداخت ناقص)"
              : "در انتظار پرداخت"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.print()}
            variant="default"
            size="default"
            className="gap-2 text-xs font-black shadow-xs cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>چاپ و دانلود فاکتور رسمی (PDF)</span>
          </Button>
        </div>
      </div>

      {/* =========================================================
          قالب رسمی فاکتور طلا و جواهر (Invoice Paper Output)
          جهت مشاهده فوق‌العاده در داشبورد و چاپ بدون هدر و فوتر
      ========================================================= */}
      <div
        id="printable-invoice"
        className="rounded-3xl border border-[#1C3324]/15 bg-white p-6 sm:p-10 shadow-md transition-colors dark:border-white/10 dark:bg-[#15221B] print:rounded-none print:border-none print:shadow-none print:p-0 print:bg-white print:text-black print:min-h-0"
      >
        {/* سربرگ رسمی گالری طلا */}
        <div className="border-b-2 border-[#1C3324] pb-6 dark:border-[#D8B65C] print:border-black">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            
            {/* مشخصات فروشگاه / گالری */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1C3324] text-[#D8B65C] dark:bg-[#D8B65C] dark:text-[#101813] print:bg-black print:text-white">
                  <Gem size={22} />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1C3324] dark:text-zinc-100 print:text-black">
                    {invoice.sellerName || "پرنا زر"}
                  </h1>
                  <span className="text-[11px] font-bold text-[#8B263E] dark:text-[#D8B65C] print:text-zinc-700">
                    گالری طلا، جواهرات و زیورآلات دست‌ساز
                  </span>
                </div>
              </div>

              <p className="pt-2 text-[11px] text-[#3A5A46] dark:text-zinc-400 print:text-zinc-600 leading-5">
                فروشگاه مرکزی: تهران، بازار طلا و جواهر • تلفن: ۰۲۱-۸۸۴۵۰۰۰۰ • شماره پروانه کسب: ۱۸۳۰۴۹۲
              </p>
            </div>

            {/* کادر شماره فاکتور و تاریخ */}
            <div className="rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] p-4 text-xs dark:border-white/10 dark:bg-[#101813] print:border-zinc-400 print:bg-white sm:min-w-[220px]">
              <div className="flex items-center justify-between border-b border-[#1C3324]/10 pb-2 dark:border-white/10 print:border-zinc-300">
                <span className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-400 print:text-zinc-600">
                  شماره فاکتور:
                </span>
                <span className="font-mono font-black text-sm text-[#8B263E] dark:text-[#D8B65C] print:text-black">
                  {invoice.invoiceNumber || invoice.id}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 text-[11px]">
                <span className="text-[#3A5A46] dark:text-zinc-400 print:text-zinc-600">تاریخ صدور:</span>
                <span className="font-mono font-bold text-[#1C3324] dark:text-zinc-200 print:text-black">
                  {issueDate}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px]">
                <span className="text-[#3A5A46] dark:text-zinc-400 print:text-zinc-600">ساعت صدور:</span>
                <span className="font-mono font-bold text-[#1C3324] dark:text-zinc-200 print:text-black">
                  {issueTime}
                </span>
              </div>

              {invoice.goldRate && invoice.goldRate > 0 ? (
                <div className="mt-2 flex items-center justify-between border-t border-[#1C3324]/10 pt-2 text-[10px] dark:border-white/10 print:border-zinc-300">
                  <span className="text-[#3A5A46] dark:text-zinc-400 print:text-zinc-600">مظنه ۱۸ عیار:</span>
                  <span className="font-mono font-bold text-[#1C3324] dark:text-zinc-200 print:text-black">
                    {Number(invoice.goldRate).toLocaleString("fa-IR")} ت
                  </span>
                </div>
              ) : null}
            </div>

          </div>
        </div>

        {/* کادر مشخصات خریدار */}
        <div className="mt-6 rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6]/80 p-4 text-xs dark:border-white/10 dark:bg-zinc-900/60 print:border-zinc-300 print:bg-white">
          <div className="mb-2 flex items-center gap-2 font-black text-xs text-[#1C3324] dark:text-zinc-100 print:text-black">
            <User size={15} className="text-[#8B263E] dark:text-[#D8B65C] print:text-black" />
            <span>مشخصات خریدار (مشتری):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
            <div>
              <span className="text-[#3A5A46] dark:text-zinc-400 print:text-zinc-600">نام و نام خانوادگی: </span>
              <span className="font-bold text-[#1C3324] dark:text-zinc-100 print:text-black">{customerName}</span>
            </div>

            <div>
              <span className="text-[#3A5A46] dark:text-zinc-400 print:text-zinc-600">کد ملی خریدار: </span>
              <span className="font-mono font-bold text-[#1C3324] dark:text-zinc-100 print:text-black">{customerNationalId}</span>
            </div>

            <div>
              <span className="text-[#3A5A46] dark:text-zinc-400 print:text-zinc-600">شماره تلفن: </span>
              <span className="font-mono font-bold text-[#1C3324] dark:text-zinc-100 print:text-black">{customerPhone}</span>
            </div>

            <div>
              <span className="text-[#3A5A46] dark:text-zinc-400 print:text-zinc-600">نشانی / شهر: </span>
              <span className="font-medium text-[#1C3324] dark:text-zinc-200 print:text-black">{customerAddress}</span>
            </div>
          </div>
        </div>

        {/* جدول تخصصی اقلام طلا و جواهر */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="border-y-2 border-[#1C3324] bg-[#FAF9F6] text-[11px] font-black text-[#1C3324] dark:border-[#D8B65C] dark:bg-zinc-900/80 dark:text-zinc-100 print:border-black print:bg-zinc-100 print:text-black">
                <th className="py-3 px-3 text-center w-12">ردیف</th>
                <th className="py-3 px-3 min-w-[200px]">شرح مصنوعات طلا و جواهر</th>
                <th className="py-3 px-3 text-center">عیار</th>
                <th className="py-3 px-3 text-center">وزن (گرم)</th>
                <th className="py-3 px-3 text-left">طلای خام (تومان)</th>
                <th className="py-3 px-3 text-center">اجرت</th>
                <th className="py-3 px-3 text-center">سود</th>
                <th className="py-3 px-3 text-center">مالیات</th>
                <th className="py-3 px-3 text-left">قیمت کل (تومان)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#1C3324]/10 dark:divide-white/10 print:divide-zinc-300">
              {invoiceItems.map((item, idx) => (
                <tr key={idx} className="transition hover:bg-[#FAF9F6] dark:hover:bg-white/5 print:hover:bg-transparent">
                  <td className="py-3.5 px-3 text-center font-mono font-bold text-[#3A5A46] dark:text-zinc-400 print:text-black">
                    {idx + 1}
                  </td>

                  <td className="py-3.5 px-3">
                    <div className="font-black text-[#1C3324] dark:text-zinc-100 print:text-black">
                      {item.title}
                    </div>
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono font-bold text-[#3A5A46] dark:text-zinc-300 print:text-black">
                    {item.karat ? `${item.karat}k` : "۱۸ عیار"}
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono font-black text-[#1C3324] dark:text-zinc-100 print:text-black">
                    {Number(item.weight || 0).toFixed(3)}
                  </td>

                  <td className="py-3.5 px-3 text-left font-mono font-bold text-[#3A5A46] dark:text-zinc-300 print:text-black">
                    {item.rawGoldValue ? Math.round(item.rawGoldValue).toLocaleString("fa-IR") : "—"}
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono text-[11px] text-[#3A5A46] dark:text-zinc-400 print:text-black">
                    {item.wagePercent ? `${item.wagePercent}٪` : "—"}
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono text-[11px] text-[#3A5A46] dark:text-zinc-400 print:text-black">
                    {item.profitPercent ? `${item.profitPercent}٪` : "۷٪"}
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono text-[11px] text-[#3A5A46] dark:text-zinc-400 print:text-black">
                    {item.taxPercent ? `${item.taxPercent}٪` : "۹٪"}
                  </td>

                  <td className="py-3.5 px-3 text-left font-mono font-black text-[#1C3324] dark:text-zinc-100 print:text-black">
                    {Number(item.totalPrice || totalAmount).toLocaleString("fa-IR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* خلاصه محاسبات مالیات و مبالغ */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-[#1C3324]/15 pt-6 dark:border-white/10 print:border-zinc-300">
          
          {/* توضیحات و شرایط بازخرید */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-[#1C3324] dark:text-zinc-100 print:text-black">
              <ShieldCheck size={16} className="text-[#8B263E] dark:text-[#D8B65C] print:text-black" />
              <span>ضمانت اصالت و شرایط معامله طلا:</span>
            </div>

            <p className="text-[11px] text-[#3A5A46] dark:text-zinc-400 print:text-zinc-700 leading-6">
              {invoice.notes ||
                "اصالت و عیار ۷۵۰ (۱۸ عیار) کلیه مصنوعات طلا تضمین می‌گردد. شرایط بازخرید بر اساس نرخ روز طلای خام اتحادیه طلا و جواهر و کسر اجرت انجام می‌پذیرد."}
            </p>

            {/* شیوه پرداخت */}
            <div className="rounded-xl border border-[#1C3324]/10 bg-[#FAF9F6] p-3 text-xs dark:border-white/10 dark:bg-zinc-900/60 print:border-zinc-200 print:bg-white">
              <span className="text-[#3A5A46] dark:text-zinc-400 print:text-zinc-600">وضعیت پرداخت: </span>
              <span className="font-black text-[#1C3324] dark:text-zinc-100 print:text-black">
                {paymentStatus === "paid" ? "تسویه کامل نقدی / پوز" : paymentStatus === "partial" ? "پرداخت بیعانه" : "در انتظار پرداخت"}
              </span>
              {paymentStatus === "partial" && (
                <div className="mt-1 text-[11px] font-mono">
                  <span>بیعانه: {paidAmount.toLocaleString("fa-IR")} ت | </span>
                  <span className="text-rose-600 font-black">مانده: {remainingAmount.toLocaleString("fa-IR")} ت</span>
                </div>
              )}
            </div>
          </div>

          {/* جدول جمع کل و مبالغ */}
          <div className="rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] p-5 text-xs space-y-2.5 dark:border-white/10 dark:bg-zinc-900/60 print:border-zinc-300 print:bg-white">
            <div className="flex justify-between text-[#3A5A46] dark:text-zinc-400 print:text-zinc-700">
              <span>مجموع وزن طلا:</span>
              <span className="font-mono font-black text-[#1C3324] dark:text-zinc-100 print:text-black">
                {invoice.totalWeight ? Number(invoice.totalWeight).toFixed(3) : invoiceItems.reduce((acc, it) => acc + (Number(it.weight) || 0), 0).toFixed(3)} گرم
              </span>
            </div>

            {invoice.wageAmount && Number(invoice.wageAmount) > 0 ? (
              <div className="flex justify-between text-[#3A5A46] dark:text-zinc-400 print:text-zinc-700">
                <span>مجموع اجرت ساخت:</span>
                <span className="font-mono font-bold text-[#1C3324] dark:text-zinc-100 print:text-black">
                  {Math.round(Number(invoice.wageAmount)).toLocaleString("fa-IR")} تومان
                </span>
              </div>
            ) : null}

            {invoice.profitAmount && Number(invoice.profitAmount) > 0 ? (
              <div className="flex justify-between text-[#3A5A46] dark:text-zinc-400 print:text-zinc-700">
                <span>مجموع سود مصوب گالری:</span>
                <span className="font-mono font-bold text-[#1C3324] dark:text-zinc-100 print:text-black">
                  {Math.round(Number(invoice.profitAmount)).toLocaleString("fa-IR")} تومان
                </span>
              </div>
            ) : null}

            {invoice.taxAmount && Number(invoice.taxAmount) > 0 ? (
              <div className="flex justify-between text-[#3A5A46] dark:text-zinc-400 print:text-zinc-700">
                <span>مالیات بر ارزش افزوده (VAT):</span>
                <span className="font-mono font-bold text-[#1C3324] dark:text-zinc-100 print:text-black">
                  {Math.round(Number(invoice.taxAmount)).toLocaleString("fa-IR")} تومان
                </span>
              </div>
            ) : null}

            {discount > 0 && (
              <div className="flex justify-between text-rose-600 font-bold border-t border-[#1C3324]/10 pt-2 dark:border-white/10 print:border-zinc-200">
                <span>مبلغ تخفیف:</span>
                <span className="font-mono">-{discount.toLocaleString("fa-IR")} تومان</span>
              </div>
            )}

            <div className="flex justify-between items-baseline border-t-2 border-[#1C3324] pt-3 text-sm font-black dark:border-[#D8B65C] print:border-black">
              <span className="text-[#1C3324] dark:text-zinc-100 print:text-black">مبلغ نهایی قابل پرداخت:</span>
              <span className="text-lg font-mono text-[#8B263E] dark:text-[#D8B65C] print:text-black">
                {totalAmount.toLocaleString("fa-IR")} تومان
              </span>
            </div>

            <div className="pt-1 text-[11px] font-bold text-[#8B263E] dark:text-[#D8B65C] print:text-black leading-5">
              مبلغ به حروف: {numberToWordsPersian(totalAmount)}
            </div>
          </div>
        </div>

        {/* امضاها و تأییدیه رسمی */}
        <div className="mt-12 border-t-2 border-[#1C3324]/20 pt-6 text-xs dark:border-white/20 print:border-zinc-300">
          <div className="grid grid-cols-2 gap-8 text-center">
            <div className="space-y-16">
              <p className="font-black text-[#1C3324] dark:text-zinc-200 print:text-black">
                محل امضا و اثر انگشت خریدار
              </p>
              <div className="text-[10px] text-[#3A5A46] dark:text-zinc-500 print:text-zinc-500">
                کالای فوق صحیح و سالم تحویل گردید
              </div>
            </div>

            <div className="space-y-16">
              <p className="font-black text-[#1C3324] dark:text-zinc-200 print:text-black">
                مهر و امضای رسمی گالری طلا و جواهرات پرنا زر
              </p>
              <div className="text-[10px] text-[#3A5A46] dark:text-zinc-500 print:text-zinc-500">
                تأیید اصالت و عیار مصنوعات
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}