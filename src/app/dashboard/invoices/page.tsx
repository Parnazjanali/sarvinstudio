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
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import pb from "@/lib/pocketbase";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import { Card } from "@/components/ui/card";

type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";
type PaymentStatusFilter = "all" | PaymentStatus;

interface UserRecord {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
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
  totalWeight?: number;
  items?: InvoiceItemBrief[];
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
  const [statusFilter, setStatusFilter] =
    useState<PaymentStatusFilter>("all");

  useEffect(() => {
    let active = true;

    async function fetchInvoices() {
      try {
        setLoading(true);
        setError("");

        const records = await pb.collection("invoices").getFullList<InvoiceRecord>({
          sort: "-created",
          expand: "user,product",
          requestKey: null,
        });

        if (active) {
          setInvoices(records);
        }
      } catch (err) {
        console.error("خطا در دریافت فاکتورها از پاکت‌بیس:", err);

        if (active) {
          setError("دریافت فاکتورها با خطا مواجه شد.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchInvoices();

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const total = invoices.length;

    const paid = invoices.filter(
      (invoice) => invoice.paymentStatus === "paid"
    ).length;

    const unpaid = invoices.filter(
      (invoice) => invoice.paymentStatus === "unpaid"
    ).length;

    const partial = invoices.filter(
      (invoice) => invoice.paymentStatus === "partial"
    ).length;

    const totalSales = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.totalAmount || 0),
      0
    );

    const totalPaid = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.paidAmount || 0),
      0
    );

    return {
      total,
      paid,
      unpaid,
      partial,
      totalSales,
      totalPaid,
    };
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
        normalizedSearch.length === 0 ||
        searchableText.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        invoice.paymentStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchValue, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-[#1C3324]/12 bg-white/80 p-5 shadow-xs backdrop-blur-md transition-colors sm:p-6 md:flex-row md:items-center dark:border-white/10 dark:bg-[#15221B]/80">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#3A5A46] dark:text-[#D8B65C]">
            <FileText className="h-4 w-4 text-[#8B263E] dark:text-[#D8B65C]" />
            <span>مدیریت مالی و حسابداری</span>
          </div>

          <h1 className="text-xl font-black text-[#1C3324] dark:text-zinc-100">
            فاکتورهای رسمی فروش
          </h1>

          <p className="mt-1 text-xs font-medium text-[#3A5A46] dark:text-zinc-400">
            صدور، پیگیری، چاپ و مدیریت فاکتورهای مشتریان پرنا زر
          </p>
        </div>

        <Link
          href="/dashboard/invoices/new"
          className="flex w-fit items-center gap-2 rounded-2xl bg-[#1C3324] px-5 py-3 text-xs font-black text-white shadow-xs transition hover:bg-[#8B263E] dark:bg-emerald-900/80 dark:hover:bg-emerald-800"
        >
          <Plus className="h-4 w-4" />
          صدور فاکتور جدید
        </Link>
      </header>

      {/* Stats Cards (Unified with DashboardStatCard) */}
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
          trend={
            stats.total > 0
              ? `${((stats.paid / stats.total) * 100).toFixed(1)}٪ تسویه کامل`
              : "۰٪"
          }
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
      <section className="rounded-3xl border border-[#1C3324]/12 bg-white/80 p-5 shadow-xs backdrop-blur-md sm:p-6 dark:border-white/10 dark:bg-[#15221B]/80">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
              فهرست فاکتورها
            </h2>

            <p className="mt-1 text-xs font-medium text-[#3A5A46] dark:text-zinc-400">
              {filteredInvoices.length.toLocaleString("fa-IR")} فاکتور مطابق با فیلترها نمایش داده می‌شود
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block">
              <span className="sr-only">جست‌وجوی فاکتورها</span>

              <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3A5A46] dark:text-zinc-400" />

              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="جست‌وجوی شماره یا مشتری..."
                className="h-11 w-full rounded-2xl border border-[#1C3324]/15 bg-white pl-4 pr-11 text-xs font-bold text-[#1C3324] outline-none transition placeholder:text-[#3A5A46]/50 focus:border-[#1C3324] sm:w-64 dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[#D8B65C]"
              />
            </label>

            <label>
              <span className="sr-only">فیلتر وضعیت فاکتور</span>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as PaymentStatusFilter
                  )
                }
                className="h-11 w-full rounded-2xl border border-[#1C3324]/15 bg-white px-4 text-xs font-black text-[#1C3324] outline-none transition focus:border-[#1C3324] cursor-pointer sm:w-auto dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100 dark:focus:border-[#D8B65C]"
              >
                <option value="all" className="dark:bg-[#101813]">همه وضعیت‌ها</option>
                <option value="paid" className="dark:bg-[#101813]">پرداخت‌شده</option>
                <option value="partial" className="dark:bg-[#101813]">پرداخت ناقص</option>
                <option value="unpaid" className="dark:bg-[#101813]">در انتظار پرداخت</option>
                <option value="refunded" className="dark:bg-[#101813]">مستردشده</option>
              </select>
            </label>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex items-center gap-3 text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#8B263E] border-t-transparent dark:border-[#D8B65C]" />
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
              className="mt-4 rounded-xl bg-[#1C3324] px-4 py-2 text-xs font-bold text-white hover:bg-[#8B263E] dark:bg-emerald-900/80 dark:hover:bg-emerald-800 cursor-pointer"
            >
              تلاش مجدد
            </button>
          </div>
        ) : filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-right text-xs">
              <thead>
                <tr className="border-b border-[#1C3324]/10 font-black text-[#1C3324] dark:border-white/10 dark:text-zinc-200">
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

              <tbody className="divide-y divide-[#1C3324]/5 dark:divide-white/5">
                {filteredInvoices.map((invoice) => {
                  const status =
                    invoice.paymentStatus || "unpaid";

                  const statusData =
                    getPaymentStatusData(status);

                  const StatusIcon = statusData.icon;

                  const totalAmount =
                    Number(invoice.totalAmount || 0);

                  const paidAmount =
                    Number(invoice.paidAmount || 0);

                  const remainingAmount = Math.max(
                    totalAmount - paidAmount,
                    0
                  );

                  return (
                    <tr
                      key={invoice.id}
                      className="transition hover:bg-neutral-50 dark:hover:bg-white/[0.03]"
                    >
                      {/* Invoice Number */}
                      <td className="py-4 font-mono font-black text-[#1C3324] dark:text-zinc-100">
                        {invoice.invoiceNumber || invoice.id}
                      </td>

                      {/* Customer */}
                      <td className="py-4">
                        <div className="font-bold text-[#1C3324] dark:text-zinc-200">
                          {getCustomerName(invoice)}
                        </div>

                        {getCustomerPhone(invoice) && (
                          <div className="mt-1 font-mono text-[11px] text-[#3A5A46] dark:text-zinc-400">
                            {getCustomerPhone(invoice)}
                          </div>
                        )}
                      </td>

                      {/* Product */}
                      <td className="py-4">
                        <div className="font-bold text-[#1C3324] dark:text-zinc-200">
                          {getProductName(invoice)}
                        </div>

                        <div className="mt-1 text-[11px] text-[#3A5A46] dark:text-zinc-400">
                          وزن: {getProductWeight(invoice)}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-4">
                        <div className="font-black text-[#1C3324] dark:text-zinc-100">
                          {formatMoney(totalAmount)}
                        </div>

                        {invoice.discount &&
                        invoice.discount > 0 ? (
                          <div className="mt-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            تخفیف:{" "}
                            {formatMoney(
                              Number(invoice.discount)
                            )}
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
                      <td className="py-4 font-medium text-[#3A5A46] dark:text-zinc-400">
                        {formatDate(invoice.created)}
                      </td>

                      {/* Actions */}
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/invoices/${invoice.id}`}
                            title="مشاهده فاکتور"
                            aria-label={`مشاهده فاکتور ${
                              invoice.invoiceNumber || invoice.id
                            }`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1C3324]/15 text-[#1C3324] transition hover:border-[#8B263E] hover:bg-[#8B263E]/5 hover:text-[#8B263E] dark:border-white/10 dark:text-zinc-300 dark:hover:border-[#D8B65C] dark:hover:bg-white/5 dark:hover:text-[#D8B65C]"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          <button
                            type="button"
                            title="دانلود / چاپ فاکتور"
                            aria-label={`دانلود فاکتور ${invoice.invoiceNumber || invoice.id}`}
                            onClick={() => window.open(`/dashboard/invoices/${invoice.id}`, '_blank')}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1C3324]/15 text-[#1C3324] transition hover:border-[#8B263E] hover:bg-[#8B263E]/5 hover:text-[#8B263E] dark:border-white/10 dark:text-zinc-300 dark:hover:border-[#D8B65C] dark:hover:bg-white/5 dark:hover:text-[#D8B65C] cursor-pointer"
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
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#1C3324]/20 bg-white/50 py-12 text-center dark:border-white/10 dark:bg-zinc-900/40">
            <FileText className="h-10 w-10 text-[#8B263E] dark:text-[#D8B65C]" />

            <p className="mt-4 text-xs font-bold text-[#1C3324] dark:text-zinc-200">
              فاکتوری با این مشخصات پیدا نشد.
            </p>

            {(searchValue || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue("");
                  setStatusFilter("all");
                }}
                className="mt-3 text-xs font-bold text-[#8B263E] underline underline-offset-4 cursor-pointer dark:text-[#D8B65C]"
              >
                پاک‌کردن فیلترها
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}