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
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import pb from "@/lib/pocketbase";

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
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
        icon: CheckCircle2,
      };

    case "partial":
      return {
        title: "پرداخت ناقص",
        className:
          "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
        icon: Clock3,
      };

    case "refunded":
      return {
        title: "مستردشده",
        className:
          "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400",
        icon: XCircle,
      };

    case "unpaid":
    default:
      return {
        title: "در انتظار پرداخت",
        className:
          "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
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
    user?.name ||
    user?.email ||
    user?.phone ||
    (invoice.user ? "مشتری ثبت‌شده" : "مشتری")
  );
}

function getCustomerPhone(invoice: InvoiceRecord) {
  return invoice.expand?.user?.phone || "";
}

function getProductName(invoice: InvoiceRecord) {
  const product = invoice.expand?.product;

  return product?.name || product?.title || "محصول ثبت‌شده";
}

function getProductWeight(invoice: InvoiceRecord) {
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
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-[#E7D7A8]/60 bg-white p-6 shadow-sm transition-colors dark:border-zinc-800 dark:bg-[#1C1914] md:flex-row md:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#AA9471] dark:text-zinc-500">
            <FileText className="h-4 w-4" />
            <span>مدیریت مالی</span>
          </div>

          <h1 className="text-2xl font-black text-[#7C5E14] dark:text-[#E7D7A8]">
            فاکتورها
          </h1>

          <p className="mt-2 text-sm text-[#7A6A58] dark:text-zinc-400">
            مدیریت، جست‌وجو و پیگیری فاکتورهای فروش
          </p>
        </div>

        <Link
          href="/dashboard/invoices/new"
          className="flex w-fit items-center gap-2 rounded-xl bg-[#7C5E14] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#5E450C] dark:bg-[#E7D7A8] dark:text-[#211A0F] dark:hover:bg-[#D5BC78]"
        >
          <Plus className="h-4 w-4" />
          صدور فاکتور جدید
        </Link>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-[#E7D7A8]/60 bg-white p-5 transition-colors dark:border-zinc-800 dark:bg-[#1C1914]">
          <div className="text-xs font-bold text-[#7A6A58] dark:text-zinc-400">
            کل فاکتورها
          </div>

          <div className="mt-3 text-2xl font-black text-zinc-900 dark:text-white">
            {stats.total.toLocaleString("fa-IR")}
          </div>

          <div className="mt-2 text-xs font-bold text-[#7C5E14] dark:text-[#E7D7A8]">
            ثبت‌شده در سیستم
          </div>
        </article>

        <article className="rounded-3xl border border-[#E7D7A8]/60 bg-white p-5 transition-colors dark:border-zinc-800 dark:bg-[#1C1914]">
          <div className="text-xs font-bold text-[#7A6A58] dark:text-zinc-400">
            فاکتورهای پرداخت‌شده
          </div>

          <div className="mt-3 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.paid.toLocaleString("fa-IR")}
          </div>

          <div className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {stats.total > 0
              ? `${((stats.paid / stats.total) * 100).toFixed(1)}٪ از کل`
              : "۰٪ از کل"}
          </div>
        </article>

        <article className="rounded-3xl border border-[#E7D7A8]/60 bg-white p-5 transition-colors dark:border-zinc-800 dark:bg-[#1C1914]">
          <div className="text-xs font-bold text-[#7A6A58] dark:text-zinc-400">
            در انتظار پرداخت
          </div>

          <div className="mt-3 text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats.unpaid.toLocaleString("fa-IR")}
          </div>

          <div className="mt-2 text-xs font-bold text-amber-600 dark:text-amber-400">
            {stats.partial > 0
              ? `${stats.partial.toLocaleString("fa-IR")} فاکتور پرداخت ناقص`
              : "نیازمند پیگیری"}
          </div>
        </article>

        <article className="rounded-3xl border border-[#E7D7A8]/60 bg-white p-5 transition-colors dark:border-zinc-800 dark:bg-[#1C1914]">
          <div className="text-xs font-bold text-[#7A6A58] dark:text-zinc-400">
            مجموع فروش
          </div>

          <div className="mt-3 text-2xl font-black text-[#7C5E14] dark:text-[#E7D7A8]">
            {stats.totalSales.toLocaleString("fa-IR")}
          </div>

          <div className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            پرداخت‌شده: {stats.totalPaid.toLocaleString("fa-IR")} تومان
          </div>
        </article>
      </section>

      {/* Invoice List */}
      <section className="rounded-3xl border border-[#E7D7A8]/60 bg-white p-6 shadow-sm transition-colors dark:border-zinc-800 dark:bg-[#1C1914]">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-black text-[#7C5E14] dark:text-[#E7D7A8]">
              فهرست فاکتورها
            </h2>

            <p className="mt-1 text-xs text-[#7A6A58] dark:text-zinc-400">
              {filteredInvoices.length.toLocaleString("fa-IR")} فاکتور نمایش
              داده می‌شود
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block">
              <span className="sr-only">جست‌وجوی فاکتورها</span>

              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="جست‌وجوی شماره یا مشتری..."
                className="h-10 w-full rounded-xl border border-[#E7D7A8]/70 bg-[#FBF6EA] pl-3 pr-9 text-xs font-bold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7C5E14] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#E7D7A8] sm:w-64"
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
                className="h-10 w-full rounded-xl border border-[#E7D7A8]/70 bg-[#FBF6EA] px-3 text-xs font-bold text-[#7C5E14] outline-none transition focus:border-[#7C5E14] dark:border-zinc-700 dark:bg-zinc-900 dark:text-[#E7D7A8] sm:w-auto"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="paid">پرداخت‌شده</option>
                <option value="partial">پرداخت ناقص</option>
                <option value="unpaid">در انتظار پرداخت</option>
                <option value="refunded">مستردشده</option>
              </select>
            </label>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm font-bold text-[#7A6A58] dark:text-zinc-400">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#E7D7A8] border-t-[#7C5E14]" />
              در حال دریافت فاکتورها...
            </div>
          </div>
        ) : error ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <XCircle className="h-10 w-10 text-rose-400" />

            <p className="mt-4 text-sm font-bold text-rose-600 dark:text-rose-400">
              {error}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-[#7C5E14] px-4 py-2 text-xs font-bold text-white hover:bg-[#5E450C]"
            >
              تلاش مجدد
            </button>
          </div>
        ) : filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-right">
              <thead>
                <tr className="border-b border-zinc-200 text-xs text-[#AA9471] dark:border-zinc-800 dark:text-zinc-500">
                  <th className="pb-4 font-bold">شماره فاکتور</th>
                  <th className="pb-4 font-bold">مشتری</th>
                  <th className="pb-4 font-bold">محصول</th>
                  <th className="pb-4 font-bold">مبلغ</th>
                  <th className="pb-4 font-bold">پرداخت</th>
                  <th className="pb-4 font-bold">وضعیت</th>
                  <th className="pb-4 font-bold">تاریخ</th>
                  <th className="pb-4 font-bold">عملیات</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
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
                      className="text-xs transition hover:bg-[#FBF6EA]/70 dark:hover:bg-zinc-900/70"
                    >
                      {/* Invoice Number */}
                      <td className="py-4 font-mono font-black text-[#7C5E14] dark:text-[#E7D7A8]">
                        {invoice.invoiceNumber || invoice.id}
                      </td>

                      {/* Customer */}
                      <td className="py-4">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">
                          {getCustomerName(invoice)}
                        </div>

                        {getCustomerPhone(invoice) && (
                          <div className="mt-1 text-[11px] text-[#7A6A58] dark:text-zinc-400">
                            {getCustomerPhone(invoice)}
                          </div>
                        )}
                      </td>

                      {/* Product */}
                      <td className="py-4">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">
                          {getProductName(invoice)}
                        </div>

                        <div className="mt-1 text-[11px] text-[#7A6A58] dark:text-zinc-400">
                          وزن: {getProductWeight(invoice)}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-4">
                        <div className="font-black text-zinc-900 dark:text-white">
                          {formatMoney(totalAmount)}
                        </div>

                        {invoice.discount &&
                        invoice.discount > 0 ? (
                          <div className="mt-1 text-[11px] font-bold text-rose-500">
                            تخفیف:{" "}
                            {formatMoney(
                              Number(invoice.discount)
                            )}
                          </div>
                        ) : null}
                      </td>

                      {/* Payment */}
                      <td className="py-4">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(paidAmount)}
                        </div>

                        {remainingAmount > 0 && (
                          <div className="mt-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            مانده: {formatMoney(remainingAmount)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-bold ${statusData.className}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusData.title}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 text-[#7A6A58] dark:text-zinc-400">
                        {formatDate(invoice.created)}
                      </td>

                      {/* Actions */}
                      <td className="py-4">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/dashboard/invoices/${invoice.id}`}
                            title="مشاهده فاکتور"
                            aria-label={`مشاهده فاکتور ${
                              invoice.invoiceNumber || invoice.id
                            }`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E7D7A8]/60 text-[#7C5E14] transition hover:bg-[#F7EFD9] dark:border-zinc-700 dark:text-[#E7D7A8] dark:hover:bg-zinc-800"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          <button
                            type="button"
                            title="دانلود فاکتور"
                            aria-label={`دانلود فاکتور ${
                              invoice.invoiceNumber || invoice.id
                            }`}
                            onClick={() => {
                              console.log(
                                "Download invoice:",
                                invoice.id
                              );
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E7D7A8]/60 text-[#7C5E14] transition hover:bg-[#F7EFD9] dark:border-zinc-700 dark:text-[#E7D7A8] dark:hover:bg-zinc-800"
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
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E7D7A8] bg-[#FBF6EA]/60 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
            <FileText className="h-10 w-10 text-[#AA9471] dark:text-zinc-600" />

            <p className="mt-4 text-sm font-bold text-zinc-600 dark:text-zinc-400">
              فاکتوری با این مشخصات پیدا نشد.
            </p>

            {(searchValue || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue("");
                  setStatusFilter("all");
                }}
                className="mt-3 text-xs font-bold text-[#7C5E14] hover:underline dark:text-[#E7D7A8]"
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