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
  Edit3,
  X,
  Save,
} from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { numberToWordsPersian } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = typeof params?.id === "string" ? params.id : "";

  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // وضعیت‌های مربوط به مودال ویرایش
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    customerName: "",
    customerPhone: "",
    customerNationalId: "",
    customerAddress: "",
    paymentStatus: "paid" as "unpaid" | "partial" | "paid" | "refunded",
    paidAmount: 0,
    discount: 0,
    notes: "",
  });

  const loadInvoice = async () => {
    if (!invoiceId) return;
    try {
      setLoading(true);
      const record = await pb.collection("invoices").getOne<InvoiceRecord>(invoiceId, {
        expand: "user,product",
        requestKey: null,
      });
      setInvoice(record);
      // مقداردهی فرم ویرایش
      setEditForm({
        customerName: record.customerName || record.expand?.user?.name || "",
        customerPhone: record.customerPhone || record.expand?.user?.phone || "",
        customerNationalId: record.customerNationalId || record.expand?.user?.national_id || "",
        customerAddress: record.customerAddress || record.expand?.user?.address || "",
        paymentStatus: record.paymentStatus || "paid",
        paidAmount: Number(record.paidAmount) || 0,
        discount: Number(record.discount) || 0,
        notes: record.notes || "",
      });
    } catch (err) {
      console.error("Failed to load invoice details:", err);
      toast.error("خطا در بارگذاری اطلاعات فاکتور");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInvoice();
  }, [invoiceId]);

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId) return;

    try {
      setSaving(true);
      await pb.collection("invoices").update(invoiceId, {
        customerName: editForm.customerName,
        customerPhone: editForm.customerPhone,
        customerNationalId: editForm.customerNationalId,
        customerAddress: editForm.customerAddress,
        paymentStatus: editForm.paymentStatus,
        paidAmount: Number(editForm.paidAmount),
        discount: Number(editForm.discount),
        notes: editForm.notes,
      });

      toast.success("اطلاعات فاکتور با موفقیت به‌روزرسانی شد.");
      setIsEditOpen(false);
      await loadInvoice();
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error("خطا در ثبت ویرایش فاکتور.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-sans text-xs font-bold text-[#6E3A44] dark:text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#3B0B14] border-t-transparent dark:border-[#DFB76C] dark:border-t-transparent" />
          <span>در حال بارگذاری جزئیات فاکتور رسمی طلا...</span>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center font-sans text-center">
        <h2 className="text-base font-black text-[#3B0B14] dark:text-zinc-100">فاکتور مورد نظر یافت نشد.</h2>
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

  const paymentStatus = invoice.paymentStatus || "paid";

  // بررسی وضعیت فروش اقساطی
  const installmentItem = invoiceItems.find((it: any) => it.isInstallment);
  const isInstallmentInvoice = Boolean(installmentItem) || Boolean(invoice.notes?.includes("طرح اقساط") || invoice.notes?.includes("فروش اقساطی"));
  const installmentMode = (installmentItem as any)?.installmentMode || (invoice.notes?.includes("گرمی") ? "weight_based" : "amount_based");
  const installmentMonths = Number((installmentItem as any)?.installmentMonths) || 3;
  const installmentShareWeight = Number((installmentItem as any)?.installmentShareWeight) || (Number(invoice.totalWeight || 0) / installmentMonths);

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-[#3B0B14] dark:text-zinc-100 print:max-w-none print:m-0 print:p-0" dir="rtl">
      
      {/* دکمه‌های کنترل بالا */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#3B0B14]/12 bg-white/80 p-4 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#1C080E]/80 print:hidden">
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
          {/* دکمه ویرایش فاکتور */}
          <Button
            asChild
            variant="outline"
            size="default"
            className="gap-2 text-xs font-bold border-[#3B0B14]/20 hover:bg-[#3B0B14]/5 text-[#3B0B14] dark:text-[#DFB76C] dark:border-white/20 cursor-pointer"
          >
            <Link href={`/dashboard/invoices/${invoice.id}/edit`}>
              <Edit3 className="h-4 w-4 text-[#8B142D] dark:text-[#DFB76C]" />
              <span>ویرایش فاکتور (اقلام، اجرت و اقساط)</span>
            </Link>
          </Button>

          <Button
            onClick={() => window.print()}
            variant="default"
            size="default"
            className="gap-2 text-xs font-black shadow-xs cursor-pointer bg-[#3B0B14] hover:bg-[#8B142D] text-white dark:bg-[#8B142D]"
          >
            <Printer className="h-4 w-4" />
            <span>چاپ و دانلود (PDF)</span>
          </Button>
        </div>
      </div>

      {/* قالب فاکتور */}
      <div
        id="printable-invoice"
        className="rounded-3xl border border-[#3B0B14]/15 bg-white p-6 sm:p-10 shadow-md transition-colors dark:border-white/10 dark:bg-[#1C080E] print:rounded-none print:border-none print:shadow-none print:p-0 print:bg-white print:text-black print:min-h-0"
      >
        {/* سربرگ رسمی گالری طلا */}
        <div className="border-b-2 border-[#3B0B14] pb-6 dark:border-[#DFB76C] print:border-black">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            
            {/* مشخصات فروشگاه / گالری */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3B0B14] text-[#DFB76C] dark:bg-[#DFB76C] dark:text-[#140508] print:bg-black print:text-white">
                  <Gem size={22} />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#3B0B14] dark:text-zinc-100 print:text-black">
                    {invoice.sellerName || "پرنا زر"}
                  </h1>
                  <span className="text-[11px] font-bold text-[#8B142D] dark:text-[#DFB76C] print:text-zinc-700">
                    گالری طلا و زیورآلات دست‌ساز
                  </span>
                </div>
              </div>

              <p className="pt-2 text-[11px] text-[#6E3A44] dark:text-zinc-400 print:text-zinc-600 leading-5">
                فروشگاه مرکزی: تهران، بازار طلا • تلفن: ۰۲۱-۸۸۴۵۰۰۰۰ • شماره پروانه کسب: ۱۸۳۰۴۹۲
              </p>
            </div>

            {/* کادر شماره فاکتور و تاریخ */}
            <div className="rounded-2xl border border-[#3B0B14]/15 bg-[#FDF8F9] p-4 text-xs dark:border-white/10 dark:bg-[#140508] print:border-zinc-400 print:bg-white sm:min-w-[220px]">
              <div className="flex items-center justify-between border-b border-[#3B0B14]/10 pb-2 dark:border-white/10 print:border-zinc-300">
                <span className="text-[11px] font-bold text-[#6E3A44] dark:text-zinc-400 print:text-zinc-600">
                  شماره فاکتور:
                </span>
                <span className="font-mono font-black text-sm text-[#8B142D] dark:text-[#DFB76C] print:text-black">
                  {invoice.invoiceNumber || invoice.id}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 text-[11px]">
                <span className="text-[#6E3A44] dark:text-zinc-400 print:text-zinc-600">تاریخ صدور:</span>
                <span className="font-mono font-bold text-[#3B0B14] dark:text-zinc-200 print:text-black">
                  {issueDate}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px]">
                <span className="text-[#6E3A44] dark:text-zinc-400 print:text-zinc-600">ساعت صدور:</span>
                <span className="font-mono font-bold text-[#3B0B14] dark:text-zinc-200 print:text-black">
                  {issueTime}
                </span>
              </div>

              {invoice.goldRate && invoice.goldRate > 0 ? (
                <div className="mt-2 flex items-center justify-between border-t border-[#3B0B14]/10 pt-2 text-[10px] dark:border-white/10 print:border-zinc-300">
                  <span className="text-[#6E3A44] dark:text-zinc-400 print:text-zinc-600">مظنه ۱۸ عیار:</span>
                  <span className="font-mono font-bold text-[#3B0B14] dark:text-zinc-200 print:text-black">
                    {Number(invoice.goldRate).toLocaleString("fa-IR")} ت
                  </span>
                </div>
              ) : null}
            </div>

          </div>
        </div>

        {/* کادر مشخصات خریدار */}
        <div className="mt-6 rounded-2xl border border-[#3B0B14]/15 bg-[#FDF8F9]/80 p-4 text-xs dark:border-white/10 dark:bg-zinc-900/60 print:border-zinc-300 print:bg-white">
          <div className="mb-2 flex items-center gap-2 font-black text-xs text-[#3B0B14] dark:text-zinc-100 print:text-black">
            <User size={15} className="text-[#8B142D] dark:text-[#DFB76C] print:text-black" />
            <span>مشخصات خریدار (مشتری):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
            <div>
              <span className="text-[#6E3A44] dark:text-zinc-400 print:text-zinc-600">نام و نام خانوادگی: </span>
              <span className="font-bold text-[#3B0B14] dark:text-zinc-100 print:text-black">{customerName}</span>
            </div>

            <div>
              <span className="text-[#6E3A44] dark:text-zinc-400 print:text-zinc-600">کد ملی خریدار: </span>
              <span className="font-mono font-bold text-[#3B0B14] dark:text-zinc-100 print:text-black">{customerNationalId}</span>
            </div>

            <div>
              <span className="text-[#6E3A44] dark:text-zinc-400 print:text-zinc-600">شماره تلفن: </span>
              <span className="font-mono font-bold text-[#3B0B14] dark:text-zinc-100 print:text-black">{customerPhone}</span>
            </div>

            <div>
              <span className="text-[#6E3A44] dark:text-zinc-400 print:text-zinc-600">نشانی / شهر: </span>
              <span className="font-medium text-[#3B0B14] dark:text-zinc-200 print:text-black">{customerAddress}</span>
            </div>
          </div>
        </div>

        {/* جدول اقلام */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="border-y-2 border-[#3B0B14] bg-[#FDF8F9] text-[11px] font-black text-[#3B0B14] dark:border-[#DFB76C] dark:bg-zinc-900/80 dark:text-zinc-100 print:border-black print:bg-zinc-100 print:text-black">
                <th className="py-3 px-3 text-center w-12">ردیف</th>
                <th className="py-3 px-3 min-w-[200px]">شرح مصنوعات طلا</th>
                <th className="py-3 px-3 text-center">عیار</th>
                <th className="py-3 px-3 text-center">وزن (گرم)</th>
                <th className="py-3 px-3 text-left">طلای خام (تومان)</th>
                <th className="py-3 px-3 text-center">اجرت</th>
                <th className="py-3 px-3 text-center">سود</th>
                <th className="py-3 px-3 text-center">مالیات</th>
                <th className="py-3 px-3 text-left">قیمت کل (تومان)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#3B0B14]/10 dark:divide-white/10 print:divide-zinc-300">
              {invoiceItems.map((item, idx) => (
                <tr key={idx} className="transition hover:bg-[#FDF8F9] dark:hover:bg-white/5 print:hover:bg-transparent">
                  <td className="py-3.5 px-3 text-center font-mono font-bold text-[#6E3A44] dark:text-zinc-400 print:text-black">
                    {idx + 1}
                  </td>

                  <td className="py-3.5 px-3">
                    <div className="font-black text-[#3B0B14] dark:text-zinc-100 print:text-black">
                      {item.title}
                    </div>
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono font-bold text-[#6E3A44] dark:text-zinc-300 print:text-black">
                    {item.karat ? `${item.karat}k` : "۱۸ عیار"}
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono font-black text-[#3B0B14] dark:text-zinc-100 print:text-black">
                    {Number(item.weight || 0).toFixed(3)}
                  </td>

                  <td className="py-3.5 px-3 text-left font-mono font-bold text-[#6E3A44] dark:text-zinc-300 print:text-black">
                    {item.rawGoldValue ? Math.round(item.rawGoldValue).toLocaleString("fa-IR") : "—"}
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono text-[11px] text-[#6E3A44] dark:text-zinc-400 print:text-black">
                    {item.wagePercent ? `${item.wagePercent}٪` : "—"}
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono text-[11px] text-[#6E3A44] dark:text-zinc-400 print:text-black">
                    {item.profitPercent ? `${item.profitPercent}٪` : "۷٪"}
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono text-[11px] text-[#6E3A44] dark:text-zinc-400 print:text-black">
                    {item.taxPercent ? `${item.taxPercent}٪` : "۹٪"}
                  </td>

                  <td className="py-3.5 px-3 text-left font-mono font-black text-[#3B0B14] dark:text-zinc-100 print:text-black">
                    {Number(item.totalPrice || totalAmount).toLocaleString("fa-IR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* خلاصه محاسبات */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-[#3B0B14]/15 pt-6 dark:border-white/10 print:border-zinc-300">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-[#3B0B14] dark:text-zinc-100 print:text-black">
              <ShieldCheck size={16} className="text-[#8B142D] dark:text-[#DFB76C] print:text-black" />
              <span>ضمانت اصالت و شرایط معامله طلا:</span>
            </div>

            <p className="text-[11px] text-[#6E3A44] dark:text-zinc-400 print:text-zinc-700 leading-6">
              {invoice.notes ||
                "اصالت و عیار ۷۵۰ (۱۸ عیار) کلیه مصنوعات طلا تضمین می‌گردد. شرایط بازخرید بر اساس نرخ روز طلای خام اتحادیه طلا و کسر اجرت انجام می‌پذیرد."}
            </p>

            <div className="rounded-xl border border-[#3B0B14]/10 bg-[#FDF8F9] p-3 text-xs dark:border-white/10 dark:bg-zinc-900/60 print:border-zinc-200 print:bg-white">
              <span className="text-[#6E3A44] dark:text-zinc-400 print:text-zinc-600">وضعیت پرداخت: </span>
              <span className="font-black text-[#3B0B14] dark:text-zinc-100 print:text-black">
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

          <div className="rounded-2xl border border-[#3B0B14]/15 bg-[#FDF8F9] p-5 text-xs space-y-2.5 dark:border-white/10 dark:bg-zinc-900/60 print:border-zinc-300 print:bg-white">
            <div className="flex justify-between text-[#6E3A44] dark:text-zinc-400 print:text-zinc-700">
              <span>مجموع وزن طلا:</span>
              <span className="font-mono font-black text-[#3B0B14] dark:text-zinc-100 print:text-black">
                {invoice.totalWeight ? Number(invoice.totalWeight).toFixed(3) : invoiceItems.reduce((acc, it) => acc + (Number(it.weight) || 0), 0).toFixed(3)} گرم
              </span>
            </div>

            {invoice.wageAmount && Number(invoice.wageAmount) > 0 ? (
              <div className="flex justify-between text-[#6E3A44] dark:text-zinc-400 print:text-zinc-700">
                <span>مجموع اجرت ساخت:</span>
                <span className="font-mono font-bold text-[#3B0B14] dark:text-zinc-100 print:text-black">
                  {Math.round(Number(invoice.wageAmount)).toLocaleString("fa-IR")} تومان
                </span>
              </div>
            ) : null}

            {invoice.profitAmount && Number(invoice.profitAmount) > 0 ? (
              <div className="flex justify-between text-[#6E3A44] dark:text-zinc-400 print:text-zinc-700">
                <span>مجموع سود مصوب گالری:</span>
                <span className="font-mono font-bold text-[#3B0B14] dark:text-zinc-100 print:text-black">
                  {Math.round(Number(invoice.profitAmount)).toLocaleString("fa-IR")} تومان
                </span>
              </div>
            ) : null}

            {invoice.taxAmount && Number(invoice.taxAmount) > 0 ? (
              <div className="flex justify-between text-[#6E3A44] dark:text-zinc-400 print:text-zinc-700">
                <span>مالیات بر ارزش افزوده (VAT):</span>
                <span className="font-mono font-bold text-[#3B0B14] dark:text-zinc-100 print:text-black">
                  {Math.round(Number(invoice.taxAmount)).toLocaleString("fa-IR")} تومان
                </span>
              </div>
            ) : null}

            {discount > 0 && (
              <div className="flex justify-between text-rose-600 font-bold border-t border-[#3B0B14]/10 pt-2 dark:border-white/10 print:border-zinc-200">
                <span>مبلغ تخفیف:</span>
                <span className="font-mono">-{discount.toLocaleString("fa-IR")} تومان</span>
              </div>
            )}

            <div className="flex justify-between items-baseline border-t-2 border-[#3B0B14] pt-3 text-sm font-black dark:border-[#DFB76C] print:border-black">
              <span className="text-[#3B0B14] dark:text-zinc-100 print:text-black">مبلغ نهایی قابل پرداخت:</span>
              <span className="text-lg font-mono text-[#8B142D] dark:text-[#DFB76C] print:text-black">
                {totalAmount.toLocaleString("fa-IR")} تومان
              </span>
            </div>

            <div className="pt-1 text-[11px] font-bold text-[#8B142D] dark:text-[#DFB76C] print:text-black leading-5">
              مبلغ به حروف: {numberToWordsPersian(totalAmount)}
            </div>
          </div>
        </div>

        {/* در صورت وجود شرایط فروش اقساطی */}
        {isInstallmentInvoice && (
          <div className="mt-6 rounded-2xl border border-[#DFB76C]/60 bg-[#FDF8F9] p-4 text-xs dark:bg-zinc-900/80 dark:border-[#DFB76C]/40 print:border-zinc-400 print:bg-zinc-50">
            <div className="flex items-center justify-between pb-2 border-b border-[#DFB76C]/30 mb-2.5">
              <div className="flex items-center gap-2 font-black text-[#8B142D] dark:text-[#DFB76C] print:text-black">
                <Scale size={16} />
                <span>طرح فروش اقساطی طلا ({installmentMode === "weight_based" ? "گرمی به نرخ روز" : "ریالی با مبلغ ثابت"})</span>
              </div>
              <Badge variant="gold" className="text-[10px]">
                {installmentMonths} قسطه
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div>
                <span className="text-[#6E3A44] dark:text-zinc-400 print:text-zinc-600">شیوه تسویه: </span>
                <span className="font-bold text-[#3B0B14] dark:text-zinc-100 print:text-black">
                  {installmentMode === "weight_based" ? "گرمی (معادل وزن طلا به نرخ روز اتحادیه)" : "ریالی (مبلغ تومانی ثابت)"}
                </span>
              </div>

              {installmentMode === "weight_based" && (
                <div>
                  <span className="text-[#6E3A44] dark:text-zinc-400 print:text-zinc-600">وزن سهم هر قسط: </span>
                  <span className="font-mono font-bold text-[#3B0B14] dark:text-zinc-100 print:text-black">
                    {installmentShareWeight.toFixed(2)} گرم طلا
                  </span>
                </div>
              )}

              <div>
                <span className="text-[#6E3A44] dark:text-zinc-400 print:text-zinc-600">پیش‌پرداخت (قسط اول): </span>
                <span className="font-mono font-bold text-[#8B142D] dark:text-[#DFB76C] print:text-black">
                  {paidAmount.toLocaleString("fa-IR")} تومان
                </span>
              </div>
            </div>

            <p className="mt-2 text-[10.5px] text-[#6E3A44] dark:text-zinc-400 print:text-zinc-700 leading-5">
              {installmentMode === "weight_based"
                ? `اقساط باقیمانده بر مبنای وزن ${installmentShareWeight.toFixed(2)} گرم در سررسیدهای ماهانه با مظنه روز طلای ۱۸ عیار اتحادیه تسویه خواهد شد.`
                : `اقساط باقیمانده هر ماه به مبلغ ثابت تعیین‌شده پرداخت خواهد شد.`}
            </p>
          </div>
        )}

        {/* امضاها */}
        <div className="mt-12 border-t-2 border-[#3B0B14]/20 pt-6 text-xs dark:border-white/20 print:border-zinc-300">
          <div className="grid grid-cols-2 gap-8 text-center">
            <div className="space-y-16">
              <p className="font-black text-[#3B0B14] dark:text-zinc-200 print:text-black">
                محل امضا و اثر انگشت خریدار
              </p>
              <div className="text-[10px] text-[#6E3A44] dark:text-zinc-500 print:text-zinc-500">
                کالای فوق صحیح و سالم تحویل گردید
              </div>
            </div>

            <div className="space-y-16">
              <p className="font-black text-[#3B0B14] dark:text-zinc-200 print:text-black">
                مهر و امضای رسمی گالری طلا پرنا زر
              </p>
              <div className="text-[10px] text-[#6E3A44] dark:text-zinc-500 print:text-zinc-500">
                تأیید اصالت و عیار مصنوعات
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* =========================================================
          مودال ویرایش فاکتور
      ========================================================= */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-[#3B0B14]/20 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1C080E] text-right font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#3B0B14]/10 pb-4 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-[#8B142D] dark:text-[#DFB76C]" />
                <h3 className="text-base font-black text-[#3B0B14] dark:text-zinc-100">
                  ویرایش اطلاعات فاکتور
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-xl p-1.5 text-zinc-400 hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/5 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateInvoice} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 font-bold text-[#6E3A44] dark:text-zinc-300">
                    نام و نام‌خانوادگی خریدار:
                  </label>
                  <input
                    type="text"
                    value={editForm.customerName}
                    onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                    className="w-full rounded-xl border border-[#3B0B14]/20 p-2.5 outline-none focus:border-[#8B142D] dark:bg-[#140508] dark:border-white/15 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 font-bold text-[#6E3A44] dark:text-zinc-300">
                    شماره تماس:
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={editForm.customerPhone}
                    onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                    className="w-full rounded-xl border border-[#3B0B14]/20 p-2.5 outline-none focus:border-[#8B142D] dark:bg-[#140508] dark:border-white/15 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 font-bold text-[#6E3A44] dark:text-zinc-300">
                    کد ملی خریدار:
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={editForm.customerNationalId}
                    onChange={(e) => setEditForm({ ...editForm, customerNationalId: e.target.value })}
                    className="w-full rounded-xl border border-[#3B0B14]/20 p-2.5 outline-none focus:border-[#8B142D] dark:bg-[#140508] dark:border-white/15 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 font-bold text-[#6E3A44] dark:text-zinc-300">
                    وضعیت پرداخت:
                  </label>
                  <select
                    value={editForm.paymentStatus}
                    onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value as any })}
                    className="w-full rounded-xl border border-[#3B0B14]/20 p-2.5 outline-none focus:border-[#8B142D] dark:bg-[#140508] dark:border-white/15 dark:text-white cursor-pointer"
                  >
                    <option value="paid">تسویه کامل (پرداخت‌شده)</option>
                    <option value="partial">پرداخت ناقص (بیعانه)</option>
                    <option value="unpaid">در انتظار پرداخت</option>
                    <option value="refunded">مستردشده</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1.5 font-bold text-[#6E3A44] dark:text-zinc-300">
                  نشانی / آدرس خریدار:
                </label>
                <input
                  type="text"
                  value={editForm.customerAddress}
                  onChange={(e) => setEditForm({ ...editForm, customerAddress: e.target.value })}
                  className="w-full rounded-xl border border-[#3B0B14]/20 p-2.5 outline-none focus:border-[#8B142D] dark:bg-[#140508] dark:border-white/15 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 font-bold text-[#6E3A44] dark:text-zinc-300">
                    مبلغ پرداخت شده (تومان):
                  </label>
                  <input
                    type="number"
                    value={editForm.paidAmount}
                    onChange={(e) => setEditForm({ ...editForm, paidAmount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-[#3B0B14]/20 p-2.5 outline-none focus:border-[#8B142D] dark:bg-[#140508] dark:border-white/15 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 font-bold text-[#6E3A44] dark:text-zinc-300">
                    مبلغ تخفیف (تومان):
                  </label>
                  <input
                    type="number"
                    value={editForm.discount}
                    onChange={(e) => setEditForm({ ...editForm, discount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-[#3B0B14]/20 p-2.5 outline-none focus:border-[#8B142D] dark:bg-[#140508] dark:border-white/15 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 font-bold text-[#6E3A44] dark:text-zinc-300">
                  توضیحات و یادداشت فاکتور:
                </label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-[#3B0B14]/20 p-2.5 outline-none focus:border-[#8B142D] dark:bg-[#140508] dark:border-white/15 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#3B0B14]/10 dark:border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  disabled={saving}
                  className="cursor-pointer"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="gap-2 bg-[#3B0B14] hover:bg-[#8B142D] text-white dark:bg-[#8B142D] cursor-pointer"
                >
                  <Save size={16} />
                  <span>{saving ? "در حال ذخیره..." : "ثبت تغییرات"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}