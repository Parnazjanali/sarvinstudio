"use client";

import {
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  Plus,
  Search,
  XCircle,
  Coins,
  Receipt,
  Wallet,
  Edit3,
  X,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import pb from "@/lib/pocketbase";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import { Button } from "@/components/ui/button";

type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";
type PaymentStatusFilter = "all" | PaymentStatus;

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
}

interface InvoiceItemBrief {
  title?: string;
  weight?: number;
}

interface InvoiceRecord {
  id: string;
  invoiceNumber?: string;
  order?: string;
  user?: string;
  paidAmount?: number;
  totalAmount?: number;
  product?: string;
  paymentStatus?: PaymentStatus;
  discount?: number;
  customerName?: string;
  customerPhone?: string;
  customerNationalId?: string;
  customerAddress?: string;
  totalWeight?: number;
  items?: InvoiceItemBrief[];
  notes?: string;
  created: string;
  updated: string;

  expand?: {
    user?: UserRecord;
    product?: ProductRecord;
  };
}

function getPaymentStatusData(status: PaymentStatus) {
  switch (status) {
    case "paid":
      return {
        title: "پرداخت‌شده",
        className:
          "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50",
        icon: CheckCircle2,
      };

    case "partial":
      return {
        title: "پرداخت ناقص",
        className:
          "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50",
        icon: Clock3,
      };

    case "refunded":
      return {
        title: "مستردشده",
        className:
          "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/50",
        icon: XCircle,
      };

    case "unpaid":
    default:
      return {
        title: "در انتظار پرداخت",
        className:
          "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50",
        icon: Clock3,
      };
  }
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString("fa-IR")} تومان`;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getCustomerName(invoice: InvoiceRecord) {
  const user = invoice.expand?.user;

  return (
    invoice.customerName ||
    user?.name ||
    user?.email ||
    user?.phone ||
    (invoice.user ? "مشتری ثبت‌شده" : "مشتری حضوری")
  );
}

function getCustomerPhone(invoice: InvoiceRecord) {
  return invoice.customerPhone || invoice.expand?.user?.phone || "";
}

function getCustomerNationalId(invoice: InvoiceRecord) {
  return invoice.customerNationalId || invoice.expand?.user?.national_id || "";
}

function getCustomerAddress(invoice: InvoiceRecord) {
  return invoice.customerAddress || invoice.expand?.user?.address || "";
}

function getProductName(invoice: InvoiceRecord) {
  if (Array.isArray(invoice.items) && invoice.items.length > 0) {
    if (invoice.items.length === 1) {
      return invoice.items[0].title || "قطعه طلا";
    }
    return `${invoice.items[0].title || "قطعه طلا"} (+${invoice.items.length - 1} قلم دیگر)`;
  }

  const product = invoice.expand?.product;

  return product?.name || product?.title || "محصول سفارشی طلا";
}

function getProductWeight(invoice: InvoiceRecord) {
  if (invoice.totalWeight && Number(invoice.totalWeight) > 0) {
    return `${Number(invoice.totalWeight).toFixed(3)} گرم`;
  }

  if (Array.isArray(invoice.items) && invoice.items.length > 0) {
    const sumWeight = invoice.items.reduce((sum, it) => sum + (Number(it.weight) || 0), 0);
    if (sumWeight > 0) {
      return `${sumWeight.toFixed(3)} گرم`;
    }
  }

  const weight = invoice.expand?.product?.weight;

  if (typeof weight !== "number") {
    return "—";
  }

  return `${weight.toLocaleString("fa-IR")} گرم`;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>("all");

  // وضعیت‌های مربوط به ویرایش فاکتور
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerNationalId: "",
    customerAddress: "",
    paymentStatus: "paid" as PaymentStatus,
    paidAmount: 0,
    discount: 0,
    notes: "",
  });

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError("");

      const records = await pb.collection("invoices").getFullList<InvoiceRecord>({
        sort: "-created",
        expand: "user,product",
        requestKey: null,
      });

      setInvoices(records);
    } catch (err) {
      console.error("خطا در دریافت فاکتورها از پاکت‌بیس:", err);
      setError("دریافت فاکتورها با خطا مواجه شد.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const openEditModal = (invoice: InvoiceRecord) => {
    setEditingInvoice(invoice);
    setEditFormData({
      customerName: getCustomerName(invoice),
      customerPhone: getCustomerPhone(invoice),
      customerNationalId: getCustomerNationalId(invoice),
      customerAddress: getCustomerAddress(invoice),
      paymentStatus: invoice.paymentStatus || "unpaid",
      paidAmount: Number(invoice.paidAmount) || 0,
      discount: Number(invoice.discount) || 0,
      notes: invoice.notes || "",
    });
  };

  const handleSaveInvoiceEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    try {
      setSavingEdit(true);
      await pb.collection("invoices").update(editingInvoice.id, {
        customerName: editFormData.customerName,
        customerPhone: editFormData.customerPhone,
        customerNationalId: editFormData.customerNationalId,
        customerAddress: editFormData.customerAddress,
        paymentStatus: editFormData.paymentStatus,
        paidAmount: Number(editFormData.paidAmount),
        discount: Number(editFormData.discount),
        notes: editFormData.notes,
      });

      toast.success("اطلاعات فاکتور با موفقیت به‌روزرسانی شد.");
      setEditingInvoice(null);
      await fetchInvoices();
    } catch (err) {
      console.error("Failed to update invoice:", err);
      toast.error("خطا در ثبت ویرایش فاکتور.");
    } finally {
      setSavingEdit(false);
    }
  };

  const stats = useMemo(() => {
    const total = invoices.length;
    const paid = invoices.filter((inv) => inv.paymentStatus === "paid").length;
    const unpaid = invoices.filter((inv) => inv.paymentStatus === "unpaid").length;
    const partial = invoices.filter((inv) => inv.paymentStatus === "partial").length;

    const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0);

    return { total, paid, unpaid, partial, totalSales, totalPaid };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLocaleLowerCase("fa");

    return invoices.filter((invoice) => {
      const customer = getCustomerName(invoice);
      const phone = getCustomerPhone(invoice);
      const product = getProductName(invoice);

      const searchableText = [
        invoice.invoiceNumber || invoice.id,
        customer,
        phone,
        product,
        invoice.order || "",
        invoice.totalAmount || "",
        invoice.paidAmount || "",
      ]
        .join(" ")
        .toLocaleLowerCase("fa");

      const matchesSearch =
        normalizedSearch.length === 0 || searchableText.includes(normalizedSearch);

      const matchesStatus = statusFilter === "all" || invoice.paymentStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchValue, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-[#3B0B14]/12 bg-white/80 p-5 shadow-xs backdrop-blur-md transition-colors sm:p-6 md:flex-row md:items-center dark:border-white/10 dark:bg-[#1C080E]/80">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#6E3A44] dark:text-[#DFB76C]">
            <FileText className="h-4 w-4 text-[#8B142D] dark:text-[#DFB76C]" />
            <span>مدیریت مالی و حسابداری</span>
          </div>

          <h1 className="text-xl font-black text-[#3B0B14] dark:text-zinc-100">
            فاکتورهای رسمی فروش
          </h1>

          <p className="mt-1 text-xs font-medium text-[#6E3A44] dark:text-zinc-400">
            صدور، پیگیری، چاپ و مدیریت فاکتورهای مشتریان پرنا زر
          </p>
        </div>

        <Link
          href="/dashboard/invoices/new"
          className="flex w-fit items-center gap-2 rounded-2xl bg-[#3B0B14] px-5 py-3 text-xs font-black text-white shadow-xs transition hover:bg-[#8B142D] dark:bg-[#8B142D] dark:hover:bg-[#580F1F]"
        >
          <Plus className="h-4 w-4" />
          صدور فاکتور جدید
        </Link>
      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          title="کل فاکتورها"
          value={stats.total.toLocaleString("fa-IR")}
          unit="فاکتور"
          icon={Receipt}
          accent="default"
          isLoading={loading}
          description="ثبت‌شده در سیستم مرکزی"
        />

        <DashboardStatCard
          title="فاکتورهای پرداخت‌شده"
          value={stats.paid.toLocaleString("fa-IR")}
          unit="فاکتور"
          icon={CheckCircle2}
          accent="emerald"
          isLoading={loading}
          trend={stats.total > 0 ? `${((stats.paid / stats.total) * 100).toFixed(1)}٪ تسویه کامل` : "۰٪"}
          trendType="positive"
        />

        <DashboardStatCard
          title="در انتظار پرداخت"
          value={stats.unpaid.toLocaleString("fa-IR")}
          unit="فاکتور"
          icon={Clock3}
          accent="gold"
          isLoading={loading}
          description={
            stats.partial > 0
              ? `${stats.partial.toLocaleString("fa-IR")} پرداخت ناقص`
              : "نیازمند پیگیری مالی"
          }
        />

        <DashboardStatCard
          title="مجموع فروش فاکتورها"
          value={Math.round(stats.totalSales).toLocaleString("fa-IR")}
          unit="تومان"
          icon={Wallet}
          accent="crimson"
          isLoading={loading}
          secondaryInfo={{
            label: "وصول شده",
            value: `${Math.round(stats.totalPaid).toLocaleString("fa-IR")} ت`,
            highlight: true,
          }}
        />
      </section>

      {/* Invoice List */}
      <section className="rounded-3xl border border-[#3B0B14]/12 bg-white/80 p-5 shadow-xs backdrop-blur-md sm:p-6 dark:border-white/10 dark:bg-[#1C080E]/80">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-black text-[#3B0B14] dark:text-zinc-100">
              فهرست فاکتورها
            </h2>

            <p className="mt-1 text-xs font-medium text-[#6E3A44] dark:text-zinc-400">
              {filteredInvoices.length.toLocaleString("fa-IR")} فاکتور مطابق با فیلترها نمایش داده می‌شود
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block">
              <span className="sr-only">جست‌وجوی فاکتورها</span>

              <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E3A44] dark:text-zinc-400" />

              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="جست‌وجوی شماره یا مشتری..."
                className="h-11 w-full rounded-2xl border border-[#3B0B14]/15 bg-white pl-4 pr-11 text-xs font-bold text-[#3B0B14] outline-none transition placeholder:text-[#6E3A44]/50 focus:border-[#3B0B14] sm:w-64 dark:border-white/10 dark:bg-[#140508] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[#DFB76C]"
              />
            </label>

            <label>
              <span className="sr-only">فیلتر وضعیت فاکتور</span>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as PaymentStatusFilter)}
                className="h-11 w-full rounded-2xl border border-[#3B0B14]/15 bg-white px-4 text-xs font-black text-[#3B0B14] outline-none transition focus:border-[#3B0B14] cursor-pointer sm:w-auto dark:border-white/10 dark:bg-[#140508] dark:text-zinc-100 dark:focus:border-[#DFB76C]"
              >
                <option value="all" className="dark:bg-[#140508]">همه وضعیت‌ها</option>
                <option value="paid" className="dark:bg-[#140508]">پرداخت‌شده</option>
                <option value="partial" className="dark:bg-[#140508]">پرداخت ناقص</option>
                <option value="unpaid" className="dark:bg-[#140508]">در انتظار پرداخت</option>
                <option value="refunded" className="dark:bg-[#140508]">مستردشده</option>
              </select>
            </label>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex items-center gap-3 text-xs font-bold text-[#6E3A44] dark:text-zinc-400">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#8B142D] border-t-transparent dark:border-[#DFB76C]" />
              در حال دریافت فاکتورها...
            </div>
          </div>
        ) : error ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <XCircle className="h-10 w-10 text-rose-500" />

            <p className="mt-4 text-xs font-bold text-rose-600 dark:text-rose-400">
              {error}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-[#3B0B14] px-4 py-2 text-xs font-bold text-white hover:bg-[#8B142D] dark:bg-[#8B142D] dark:hover:bg-[#580F1F] cursor-pointer"
            >
              تلاش مجدد
            </button>
          </div>
        ) : filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-right text-xs">
              <thead>
                <tr className="border-b border-[#3B0B14]/10 font-black text-[#3B0B14] dark:border-white/10 dark:text-zinc-200">
                  <th className="pb-4">شماره فاکتور</th>
                  <th className="pb-4">مشتری</th>
                  <th className="pb-4">محصول</th>
                  <th className="pb-4">مبلغ کل</th>
                  <th className="pb-4">پرداخت‌شده</th>
                  <th className="pb-4">وضعیت</th>
                  <th className="pb-4">تاریخ صدور</th>
                  <th className="pb-4">عملیات</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#3B0B14]/5 dark:divide-white/5">
                {filteredInvoices.map((invoice) => {
                  const status = invoice.paymentStatus || "unpaid";
                  const statusData = getPaymentStatusData(status);
                  const StatusIcon = statusData.icon;

                  const totalAmount = Number(invoice.totalAmount || 0);
                  const paidAmount = Number(invoice.paidAmount || 0);
                  const remainingAmount = Math.max(totalAmount - paidAmount, 0);

                  return (
                    <tr
                      key={invoice.id}
                      className="transition hover:bg-neutral-50 dark:hover:bg-white/[0.03]"
                    >
                      {/* Invoice Number */}
                      <td className="py-4 font-mono font-black text-[#3B0B14] dark:text-zinc-100">
                        {invoice.invoiceNumber || invoice.id}
                      </td>

                      {/* Customer */}
                      <td className="py-4">
                        <div className="font-bold text-[#3B0B14] dark:text-zinc-200">
                          {getCustomerName(invoice)}
                        </div>

                        {getCustomerPhone(invoice) && (
                          <div className="mt-1 font-mono text-[11px] text-[#6E3A44] dark:text-zinc-400">
                            {getCustomerPhone(invoice)}
                          </div>
                        )}
                      </td>

                      {/* Product */}
                      <td className="py-4">
                        <div className="font-bold text-[#3B0B14] dark:text-zinc-200">
                          {getProductName(invoice)}
                        </div>

                        <div className="mt-1 text-[11px] text-[#6E3A44] dark:text-zinc-400">
                          وزن: {getProductWeight(invoice)}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-4">
                        <div className="font-black text-[#3B0B14] dark:text-zinc-100">
                          {formatMoney(totalAmount)}
                        </div>

                        {invoice.discount && invoice.discount > 0 ? (
                          <div className="mt-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            تخفیف: {formatMoney(Number(invoice.discount))}
                          </div>
                        ) : null}
                      </td>

                      {/* Payment */}
                      <td className="py-4">
                        <div className="font-bold text-emerald-700 dark:text-emerald-400">
                          {formatMoney(paidAmount)}
                        </div>

                        {remainingAmount > 0 && (
                          <div className="mt-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                            مانده: {formatMoney(remainingAmount)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold ${statusData.className}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusData.title}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 font-medium text-[#6E3A44] dark:text-zinc-400">
                        {formatDate(invoice.created)}
                      </td>

                      {/* Actions */}
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          {/* مشاهده جزئیات فاکتور */}
                          <Link
                            href={`/dashboard/invoices/${invoice.id}`}
                            title="مشاهده فاکتور"
                            aria-label={`مشاهده فاکتور ${invoice.invoiceNumber || invoice.id}`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#3B0B14]/15 text-[#3B0B14] transition hover:border-[#8B142D] hover:bg-[#8B142D]/5 hover:text-[#8B142D] dark:border-white/10 dark:text-zinc-300 dark:hover:border-[#DFB76C] dark:hover:bg-white/5 dark:hover:text-[#DFB76C]"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          {/* ویرایش کامل فاکتور */}
                          <Link
                            href={`/dashboard/invoices/${invoice.id}/edit`}
                            title="ویرایش کامل فاکتور (اقلام، اجرت، سود و اقساط)"
                            aria-label={`ویرایش فاکتور ${invoice.invoiceNumber || invoice.id}`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#3B0B14]/15 text-[#3B0B14] transition hover:border-[#8B142D] hover:bg-[#8B142D]/5 hover:text-[#8B142D] dark:border-white/10 dark:text-zinc-300 dark:hover:border-[#DFB76C] dark:hover:bg-white/5 dark:hover:text-[#DFB76C]"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Link>

                          {/* چاپ مستقیم */}
                          <button
                            type="button"
                            title="دانلود / چاپ فاکتور"
                            aria-label={`دانلود فاکتور ${invoice.invoiceNumber || invoice.id}`}
                            onClick={() => window.open(`/dashboard/invoices/${invoice.id}`, '_blank')}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#3B0B14]/15 text-[#3B0B14] transition hover:border-[#8B142D] hover:bg-[#8B142D]/5 hover:text-[#8B142D] dark:border-white/10 dark:text-zinc-300 dark:hover:border-[#DFB76C] dark:hover:bg-white/5 dark:hover:text-[#DFB76C] cursor-pointer"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#3B0B14]/20 bg-white/50 py-12 text-center dark:border-white/10 dark:bg-zinc-900/40">
            <FileText className="h-10 w-10 text-[#8B142D] dark:text-[#DFB76C]" />

            <p className="mt-4 text-xs font-bold text-[#3B0B14] dark:text-zinc-200">
              فاکتوری با این مشخصات پیدا نشد.
            </p>

            {(searchValue || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue("");
                  setStatusFilter("all");
                }}
                className="mt-3 text-xs font-bold text-[#8B142D] underline underline-offset-4 cursor-pointer dark:text-[#DFB76C]"
              >
                پاک‌کردن فیلترها
              </button>
            )}
          </div>
        )}
      </section>

      {/* =========================================================
          مودال ویرایش فاکتور
      ========================================================= */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl border border-[#3B0B14]/20 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1C080E] text-right font-sans">
            <div className="flex items-center justify-between border-b border-[#3B0B14]/10 pb-4 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-[#8B142D] dark:text-[#DFB76C]" />
                <div>
                  <h3 className="text-base font-black text-[#3B0B14] dark:text-zinc-100">
                    ویرایش فاکتور {editingInvoice.invoiceNumber || editingInvoice.id}
                  </h3>
                  <p className="text-[11px] text-[#6E3A44] dark:text-zinc-400 mt-0.5">
                    تغییر مشخصات مشتری، مبالغ و وضعیت تسویه
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                className="rounded-xl p-1.5 text-zinc-400 hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/5 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveInvoiceEdit} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 font-bold text-[#6E3A44] dark:text-zinc-300">
                    نام و نام‌خانوادگی:
                  </label>
                  <input
                    type="text"
                    value={editFormData.customerName}
                    onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })}
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
                    value={editFormData.customerPhone}
                    onChange={(e) => setEditFormData({ ...editFormData, customerPhone: e.target.value })}
                    className="w-full rounded-xl border border-[#3B0B14]/20 p-2.5 outline-none focus:border-[#8B142D] dark:bg-[#140508] dark:border-white/15 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 font-bold text-[#6E3A44] dark:text-zinc-300">
                    کد ملی:
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={editFormData.customerNationalId}
                    onChange={(e) => setEditFormData({ ...editFormData, customerNationalId: e.target.value })}
                    className="w-full rounded-xl border border-[#3B0B14]/20 p-2.5 outline-none focus:border-[#8B142D] dark:bg-[#140508] dark:border-white/15 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 font-bold text-[#6E3A44] dark:text-zinc-300">
                    وضعیت تسویه فاکتور:
                  </label>
                  <select
                    value={editFormData.paymentStatus}
                    onChange={(e) => setEditFormData({ ...editFormData, paymentStatus: e.target.value as PaymentStatus })}
                    className="w-full rounded-xl border border-[#3B0B14]/20 p-2.5 outline-none focus:border-[#8B142D] dark:bg-[#140508] dark:border-white/15 dark:text-white cursor-pointer font-bold"
                  >
                    <option value="paid">پرداخت‌شده (تسویه کامل)</option>
                    <option value="partial">پرداخت ناقص (بیعانه)</option>
                    <option value="unpaid">در انتظار پرداخت</option>
                    <option value="refunded">مستردشده</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1.5 font-bold text-[#6E3A44] dark:text-zinc-300">
                  نشانی خریدار:
                </label>
                <input
                  type="text"
                  value={editFormData.customerAddress}
                  onChange={(e) => setEditFormData({ ...editFormData, customerAddress: e.target.value })}
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
                    value={editFormData.paidAmount}
                    onChange={(e) => setEditFormData({ ...editFormData, paidAmount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-[#3B0B14]/20 p-2.5 outline-none focus:border-[#8B142D] dark:bg-[#140508] dark:border-white/15 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 font-bold text-[#6E3A44] dark:text-zinc-300">
                    مبلغ تخفیف (تومان):
                  </label>
                  <input
                    type="number"
                    value={editFormData.discount}
                    onChange={(e) => setEditFormData({ ...editFormData, discount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-[#3B0B14]/20 p-2.5 outline-none focus:border-[#8B142D] dark:bg-[#140508] dark:border-white/15 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 font-bold text-[#6E3A44] dark:text-zinc-300">
                  یادداشت و شرایط فاکتور:
                </label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full rounded-xl border border-[#3B0B14]/20 p-2.5 outline-none focus:border-[#8B142D] dark:bg-[#140508] dark:border-white/15 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#3B0B14]/10 dark:border-white/10">
                <Link
                  href={`/dashboard/invoices/${editingInvoice.id}/edit`}
                  className="text-xs font-bold text-[#8B142D] hover:underline dark:text-[#DFB76C]"
                >
                  ویرایش پیشرفته (اقلام، اجرت ساخت، سود، مالیات و اقساط طلا) ←
                </Link>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingInvoice(null)}
                    disabled={savingEdit}
                    className="cursor-pointer"
                  >
                    انصراف
                  </Button>
                  <Button
                    type="submit"
                    disabled={savingEdit}
                    className="gap-2 bg-[#3B0B14] hover:bg-[#8B142D] text-white dark:bg-[#8B142D] cursor-pointer"
                  >
                    <Save size={16} />
                    <span>{savingEdit ? "در حال ذخیره..." : "ذخیره تغییرات"}</span>
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}