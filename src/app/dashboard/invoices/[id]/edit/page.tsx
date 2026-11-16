"use client";

import React, { useState, useEffect, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Plus,
  Trash2,
  Save,
  ArrowRight,
  Gem,
  Calculator,
  User,
  ShoppingBag,
  Coins,
  RefreshCw,
  Scale,
  Receipt,
  Percent,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Sparkles,
  CreditCard,
  Calendar,
  Building2,
  Phone,
  MapPin,
  BadgePercent,
} from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import { recordAuditLogClient } from "@/lib/audit-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { numberToWordsPersian } from "@/lib/format";
import { roundGoldWeight, formatGoldWeight } from "@/lib/installment-utils";
import { cn } from "@/lib/utils";

/* =========================================================
   Types
========================================================= */

interface CatalogProduct {
  id: string;
  title?: string;
  name?: string;
  weight?: number | string;
  karat?: number | string;
  wage_percent?: number | string;
  profit_percent?: number | string;
  tax_percent?: number | string;
}

interface CustomerRecord {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  national_id?: string;
  address?: string;
}

export interface GoldInvoiceItem {
  id: string;
  productId?: string;
  title: string;
  weight: number; // گرم طلا با ۲ رقم اعشار
  karat: number; // عیار (پیش‌فرض ۱۸ عیار / ۷۵۰)
  wagePercent: number; // درصد اجرت ساخت
  profitPercent: number; // درصد سود گالری
  taxPercent: number; // درصد مالیات بر ارزش افزوده
}

function createDefaultItem(): GoldInvoiceItem {
  return {
    id: "item-" + Math.random().toString(36).substring(2, 9),
    title: "",
    weight: 1,
    karat: 18,
    wagePercent: 18,
    profitPercent: 7,
    taxPercent: 9,
  };
}

export default function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: invoiceId } = use(params);

  const [loading, setLoading] = useState(false);
  const [fetchingInvoice, setFetchingInvoice] = useState(true);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);

  // مشخصات فاکتور
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [createdDate, setCreatedDate] = useState("");

  // مشخصات مشتری
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNationalId, setCustomerNationalId] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // مظنه روز طلای ۱۸ عیار
  const [goldPricePerGram, setGoldPricePerGram] = useState<number>(0);

  // اقلام طلا
  const [items, setItems] = useState<GoldInvoiceItem[]>([createDefaultItem()]);

  // تخفیف و وضعیت پرداخت
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partial" | "unpaid">("paid");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");

  // تنظیمات فروش اقساطی طلایی
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentMode, setInstallmentMode] = useState<"weight_based" | "amount_based">("weight_based");
  const [installmentMonths, setInstallmentMonths] = useState(3);
  const [downPaymentAmount, setDownPaymentAmount] = useState<number>(0);

  // واکشی اولیه اطلاعات فاکتور و کاتالوگ
  useEffect(() => {
    async function init() {
      if (!invoiceId) return;

      try {
        setFetchingInvoice(true);

        // واکشی کاتالوگ و مشتریان
        const [prodRecords, userRecords, invoiceRecord] = await Promise.all([
          pb.collection("products").getFullList<CatalogProduct>({ sort: "title", requestKey: null }).catch(() => []),
          pb.collection("users").getFullList<CustomerRecord>({ sort: "name", requestKey: null }).catch(() => []),
          pb.collection("invoices").getOne(invoiceId, { expand: "user,product", requestKey: null }),
        ]);

        setProducts(prodRecords);
        setCustomers(userRecords);

        // بارگذاری داده‌های فاکتور
        if (invoiceRecord) {
          setInvoiceNumber(invoiceRecord.invoiceNumber || invoiceRecord.id);
          setCreatedDate(invoiceRecord.created);
          setSelectedCustomerId(invoiceRecord.user || "");
          setCustomerName(invoiceRecord.customerName || invoiceRecord.expand?.user?.name || "");
          setCustomerPhone(invoiceRecord.customerPhone || invoiceRecord.expand?.user?.phone || "");
          setCustomerNationalId(invoiceRecord.customerNationalId || invoiceRecord.expand?.user?.national_id || "");
          setCustomerAddress(invoiceRecord.customerAddress || invoiceRecord.expand?.user?.address || "");
          setGoldPricePerGram(Number(invoiceRecord.goldRate) || 0);
          setDiscountAmount(Number(invoiceRecord.discount) || 0);
          setPaymentStatus(invoiceRecord.paymentStatus || "paid");
          setPaidAmount(Number(invoiceRecord.paidAmount) || 0);
          setNotes(invoiceRecord.notes || "");

          // بارگذاری اقلام طلا
          const rawItems = Array.isArray(invoiceRecord.items)
            ? invoiceRecord.items
            : typeof invoiceRecord.items === "string"
              ? JSON.parse(invoiceRecord.items || "[]")
              : [];

          if (rawItems.length > 0) {
            setItems(
              rawItems.map((it: any) => ({
                id: it.id || "item-" + Math.random().toString(36).substring(2, 9),
                productId: it.productId,
                title: it.title || "زیورآلات طلا",
                weight: roundGoldWeight(it.weight || 1),
                karat: Number(it.karat) || 18,
                wagePercent: Number(it.wagePercent) || 18,
                profitPercent: Number(it.profitPercent) || 7,
                taxPercent: Number(it.taxPercent) || 9,
              }))
            );

            // بررسی آیا فاکتور دارای شرایط اقساطی بوده است
            const hasInstallmentItem = rawItems.some((it: any) => it.isInstallment);
            if (hasInstallmentItem || invoiceRecord.notes?.includes("اقساط")) {
              setIsInstallment(true);
              const firstInstItem = rawItems.find((it: any) => it.isInstallment);
              if (firstInstItem?.installmentMode) {
                setInstallmentMode(firstInstItem.installmentMode);
              }
              if (firstInstItem?.installmentMonths) {
                setInstallmentMonths(Number(firstInstItem.installmentMonths) || 3);
              }
              setDownPaymentAmount(Number(invoiceRecord.paidAmount) || 0);
            }
          }

          // اگر نرخ طلا صفر بود، نرخ زنده را دریافت کن
          if (!invoiceRecord.goldRate || invoiceRecord.goldRate <= 0) {
            await fetchLiveGoldRate();
          }
        }
      } catch (err) {
        console.error("Failed to load invoice for editing:", err);
        toast.error("خطا در بارگذاری اطلاعات فاکتور");
      } finally {
        setFetchingInvoice(false);
      }
    }

    void init();
  }, [invoiceId]);

  // واکشی نرخ زنده روز طلای ۱۸ عیار
  const fetchLiveGoldRate = async () => {
    try {
      setFetchingRates(true);
      const res = await fetch("/api/sync-gold");
      const data = await res.json();
      if (data?.success && data?.results) {
        const gold18k = data.results.find((r: any) => r.symbol === "IR_GOLD_18K");
        if (gold18k && Number(gold18k.price) > 0) {
          setGoldPricePerGram(Number(gold18k.price));
          toast.success(`مظنه روز دریافت شد: ${Number(gold18k.price).toLocaleString("fa-IR")} تومان`);
          return;
        }
      }
      // اگر از API نشد از جدول دیتابیس بگیر
      const rateRecord = await pb.collection("gold_rates").getFirstListItem('symbol="IR_GOLD_18K"', { requestKey: null });
      if (rateRecord?.price) {
        setGoldPricePerGram(Number(rateRecord.price));
      }
    } catch {
      toast.error("دریافت نرخ زنده طلا با خطا مواجه شد.");
    } finally {
      setFetchingRates(false);
    }
  };

  // افزودن یا حذف ردیف اقلام
  const handleAddItem = () => {
    setItems((prev) => [...prev, createDefaultItem()]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.error("فاکتور باید حداقل شامل یک قلم کالا باشد.");
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (
    id: string,
    field: keyof GoldInvoiceItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          [field]: field === "weight" ? roundGoldWeight(value) : value,
        };
      })
    );
  };

  // انتخاب محصول از کاتالوگ
  const handleSelectCatalogProduct = (itemId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          productId: product.id,
          title: product.title || product.name || item.title,
          weight: roundGoldWeight(product.weight || item.weight),
          karat: Number(product.karat) || 18,
          wagePercent: Number(product.wage_percent) || item.wagePercent,
          profitPercent: Number(product.profit_percent) || 7,
          taxPercent: Number(product.tax_percent) || 9,
        };
      })
    );
  };

  // محاسبات تجمیعی و اقساطی طلا
  const calculations = useMemo(() => {
    const computedItems = items.map((item) => {
      const weight = roundGoldWeight(item.weight);
      const karat = Number(item.karat) || 18;
      const rawGoldValue = weight * goldPricePerGram * (karat / 18);

      const wagePercent = Number(item.wagePercent) || 0;
      const wageAmount = (rawGoldValue * wagePercent) / 100;

      const profitPercent = Number(item.profitPercent) || 0;
      const profitAmount = ((rawGoldValue + wageAmount) * profitPercent) / 100;

      const taxPercent = Number(item.taxPercent) || 0;
      const taxAmount = ((wageAmount + profitAmount) * taxPercent) / 100;

      const totalPrice = Math.round(rawGoldValue + wageAmount + profitAmount + taxAmount);

      return {
        ...item,
        weight,
        rawGoldValue,
        wageAmount,
        profitAmount,
        taxAmount,
        totalPrice,
      };
    });

    const totalWeight = roundGoldWeight(computedItems.reduce((acc, it) => acc + (Number(it.weight) || 0), 0));
    const totalRawGold = computedItems.reduce((acc, it) => acc + it.rawGoldValue, 0);
    const totalWage = computedItems.reduce((acc, it) => acc + it.wageAmount, 0);
    const totalProfit = computedItems.reduce((acc, it) => acc + it.profitAmount, 0);
    const totalTax = computedItems.reduce((acc, it) => acc + it.taxAmount, 0);
    const subtotal = computedItems.reduce((acc, it) => acc + it.totalPrice, 0);
    const finalTotal = Math.max(0, subtotal - (Number(discountAmount) || 0));

    // محاسبات اقساطی
    const shareWeight = roundGoldWeight(totalWeight / (installmentMonths || 3));
    const firstInstallmentEqual = Math.round(finalTotal / (installmentMonths || 3));
    const remainingCount = Math.max(1, (installmentMonths || 3) - 1);
    const remainingGoldWeight = roundGoldWeight(shareWeight * remainingCount);

    return {
      computedItems,
      totalWeight,
      totalRawGold,
      totalWage,
      totalProfit,
      totalTax,
      subtotal,
      finalTotal,
      shareWeight,
      firstInstallmentEqual,
      remainingCount,
      remainingGoldWeight,
    };
  }, [items, goldPricePerGram, discountAmount, installmentMonths]);

  // ثبت و به‌روزرسانی فاکتور
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("لطفاً نام خریدار را وارد کنید.");
      return;
    }

    if (items.some((i) => !i.title.trim())) {
      toast.error("لطفاً عنوان کلیه اقلام فاکتور را وارد کنید.");
      return;
    }

    if (calculations.totalWeight <= 0) {
      toast.error("مجموع وزن طلا باید بزرگتر از صفر باشد.");
      return;
    }

    if (goldPricePerGram <= 0) {
      toast.error("لطفاً نرخ مظنه طلای ۱۸ عیار را وارد کنید.");
      return;
    }

    try {
      setLoading(true);

      // غنی‌سازی اقلام با اطلاعات اقساطی در صورت فعال بودن
      const enrichedItems = calculations.computedItems.map((item) => ({
        ...item,
        isInstallment,
        installmentMode: isInstallment ? installmentMode : undefined,
        installmentMonths: isInstallment ? installmentMonths : undefined,
        installmentShareWeight: isInstallment ? calculations.shareWeight : undefined,
      }));

      // تعیین وضعیت و مبلغ پرداخت‌شده
      const finalPaid =
        paymentStatus === "paid"
          ? calculations.finalTotal
          : paymentStatus === "unpaid"
          ? 0
          : isInstallment && downPaymentAmount > 0
          ? downPaymentAmount
          : Number(paidAmount) || 0;

      // ساخت متن توضیحات اقساط در صورت نیاز
      let updatedNotes = notes.trim();
      if (isInstallment) {
        const instNote =
          installmentMode === "weight_based"
            ? `\n[طرح اقساط طلایی پرنا زر]: تسویه در ${installmentMonths} قسط طلایی. سهم هر قسط: ${calculations.shareWeight.toFixed(2)} گرم طلا. قسط اول: ${finalPaid.toLocaleString("fa-IR")} تومان، اقساط بعدی بر مبنای وزن طلا به نرخ روز بازار تسویه خواهد شد.`
            : `\n[فروش اقساطی ریالی]: تسویه در ${installmentMonths} قسط ماهانه. پیش‌پرداخت: ${finalPaid.toLocaleString("fa-IR")} تومان، اقساط بعدی هر قسط به مبلغ ثابت ${Math.round((calculations.finalTotal - finalPaid) / (installmentMonths - 1 || 1)).toLocaleString("fa-IR")} تومان.`;

        if (!updatedNotes.includes("طرح اقساط")) {
          updatedNotes = (updatedNotes ? updatedNotes + "\n" : "") + instNote;
        }
      }

      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerNationalId: customerNationalId.trim(),
        customerAddress: customerAddress.trim(),
        goldRate: goldPricePerGram,
        totalWeight: calculations.totalWeight,
        wageAmount: calculations.totalWage,
        profitAmount: calculations.totalProfit,
        taxAmount: calculations.totalTax,
        totalAmount: calculations.finalTotal,
        paidAmount: finalPaid,
        paymentStatus,
        discount: Number(discountAmount) || 0,
        items: enrichedItems,
        notes: updatedNotes,
      };

      await pb.collection("invoices").update(invoiceId, payload);

      // ثبت در لاگ سیستم
      void recordAuditLogClient({
        category: "invoice",
        title: `ویرایش فاکتور رسمی طلا #${invoiceNumber}`,
        description: `فاکتور #${invoiceNumber} با مبلغ ${calculations.finalTotal.toLocaleString("fa-IR")} تومان و وزن ${calculations.totalWeight.toFixed(2)} گرم ویرایش شد.`,
        level: "info",
        targetId: invoiceId,
        targetType: "invoice",
        metadata: {
          invoiceId,
          totalAmount: calculations.finalTotal,
          totalWeight: calculations.totalWeight,
          isInstallment,
          installmentMode,
        },
      });

      toast.success("فاکتور رسمی با موفقیت به‌روزرسانی شد.");
      router.push(`/dashboard/invoices/${invoiceId}`);
      router.refresh();
    } catch (error: any) {
      console.error("Save invoice error:", error);
      toast.error(error.message || "خطا در ذخیره‌سازی تغییرات فاکتور.");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingInvoice) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-sans text-xs font-bold text-[#6E3A44] dark:text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#3B0B14] border-t-transparent dark:border-[#DFB76C] dark:border-t-transparent" />
          <span>در حال بارگذاری ویرایشگر فاکتور رسمی طلا...</span>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6 pb-20 font-sans text-[#3B0B14] dark:text-zinc-100">
      {/* سربرگ و اکشن‌ها */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#6E3A44] dark:text-zinc-400 mb-1">
            <Link href="/dashboard/invoices" className="hover:text-[#8B142D] transition">
              مدیریت فاکتورها
            </Link>
            <span>/</span>
            <Link href={`/dashboard/invoices/${invoiceId}`} className="hover:text-[#8B142D] transition">
              فاکتور #{invoiceNumber}
            </Link>
            <span>/</span>
            <span className="font-bold text-[#3B0B14] dark:text-white">ویرایش فاکتور</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-[#3B0B14] dark:text-white font-heading flex items-center gap-2">
            <Receipt className="text-[#8B142D]" size={24} />
            <span>ویرایش فاکتور رسمی #{invoiceNumber}</span>
          </h1>
          <p className="text-xs text-[#6E3A44] dark:text-zinc-400 mt-1">
            ویرایش اجرت ساخت، سود، مالیات بر ارزش افزوده، وزن، مشخصات خریدار و شرایط اقساطی
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild variant="outline" size="sm" className="gap-1.5 cursor-pointer">
            <Link href={`/dashboard/invoices/${invoiceId}`}>
              <ArrowRight size={14} />
              <span>انصراف و بازگشت</span>
            </Link>
          </Button>

          <Button
            onClick={handleSaveInvoice}
            disabled={loading}
            variant="default"
            size="sm"
            className="gap-2 bg-[#8B142D] hover:bg-[#721f32] text-white cursor-pointer"
          >
            <Save size={14} />
            <span>{loading ? "در حال ذخیره‌سازی..." : "ذخیره تغییرات فاکتور"}</span>
          </Button>
        </div>
      </div>

      <form onSubmit={handleSaveInvoice} className="space-y-6">
        {/* ۱. مشخصات خریدار و نشانی */}
        <Card className="border-[#3B0B14]/12 bg-white/90 p-5 sm:p-6 backdrop-blur-md dark:border-white/10 dark:bg-[#1C080E]/90">
          <CardHeader className="p-0 pb-4 border-b border-[#3B0B14]/10 dark:border-white/10 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <User size={18} className="text-[#8B142D]" />
              <CardTitle className="text-sm font-black">مشخصات خریدار و نشانی تحویل</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px]">
              اطلاعات رسمی جهت ثبت در سامانه مودیان و فاکتور اتحادیه
            </Badge>
          </CardHeader>

          <CardContent className="p-0 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-[#3B0B14] dark:text-zinc-200">
                نام و نام خانوادگی خریدار *
              </label>
              <Input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="مثلاً: سرکار خانم حسینی"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 text-[#3B0B14] dark:text-zinc-200">
                شماره تماس (موبایل خریدار)
              </label>
              <Input
                type="tel"
                dir="ltr"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0912..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 text-[#3B0B14] dark:text-zinc-200">
                کد ملی / شناسه خریدار
              </label>
              <Input
                type="text"
                dir="ltr"
                value={customerNationalId}
                onChange={(e) => setCustomerNationalId(e.target.value)}
                placeholder="کد ۱۰ رقمی ملی"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold mb-1.5 text-[#3B0B14] dark:text-zinc-200">
                نشانی کامل پستی و تحویل
              </label>
              <Input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="استان، شهر، خیابان، پلاک، واحد..."
              />
            </div>
          </CardContent>
        </Card>

        {/* ۲. مظنه روز طلای ۱۸ عیار */}
        <Card className="border-[#DFB76C]/40 bg-linear-to-r from-[#DFB76C]/10 via-white to-white p-5 backdrop-blur-md dark:border-white/10 dark:from-[#1C080E] dark:to-[#140508]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#DFB76C]/25 text-[#9E782F] border border-[#DFB76C]/40">
                <Coins size={22} />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#3B0B14] dark:text-zinc-100 flex items-center gap-2">
                  <span>مظنه مرجع هر گرم طلای ۱۸ عیار (۷۵۰)</span>
                  <Badge variant="gold" className="text-[10px]">مبنای صدور فاکتور</Badge>
                </h3>
                <p className="text-xs text-[#6E3A44] dark:text-zinc-400 mt-0.5">
                  ارزش طلای خام کلیه اقلام این فاکتور با این نرخ ضرب می‌شود.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-60">
                <Input
                  type="number"
                  value={goldPricePerGram || ""}
                  onChange={(e) => setGoldPricePerGram(Number(e.target.value))}
                  className="font-mono text-sm font-black pl-14 text-left"
                  placeholder="نرخ هر گرم (تومان)"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#6E3A44]">
                  تومان
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={fetchLiveGoldRate}
                disabled={fetchingRates}
                className="gap-1.5 shrink-0 cursor-pointer"
                title="دریافت مظنه زنده بازار"
              >
                <RefreshCw size={14} className={fetchingRates ? "animate-spin" : ""} />
                <span className="hidden sm:inline">بروزرسانی زنده</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* ۳. جدول اقلام طلا و ادیت اجرت، سود و مالیات */}
        <Card className="border-[#3B0B14]/12 bg-white/90 p-5 sm:p-6 backdrop-blur-md dark:border-white/10 dark:bg-[#1C080E]/90 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#3B0B14]/10 dark:border-white/10 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Gem size={18} className="text-[#8B142D]" />
              <CardTitle className="text-sm font-black">اقلام مصنوعات طلا و ضرایب اتحادیه</CardTitle>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="gap-1.5 cursor-pointer text-xs font-bold"
            >
              <Plus size={14} />
              <span>افزودن ردیف طلا</span>
            </Button>
          </div>

          <div className="overflow-x-auto border border-[#3B0B14]/10 rounded-2xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FDF8F9] text-[#3B0B14] border-b border-[#3B0B14]/10">
                <tr>
                  <th className="p-3 font-bold w-10 text-center">#</th>
                  <th className="p-3 font-bold min-w-[200px]">شرح مصنوع طلا</th>
                  <th className="p-3 font-bold w-28">وزن (گرم)</th>
                  <th className="p-3 font-bold w-20">عیار</th>
                  <th className="p-3 font-bold w-24">اجرت (%)</th>
                  <th className="p-3 font-bold w-20">سود (%)</th>
                  <th className="p-3 font-bold w-20">مالیات (%)</th>
                  <th className="p-3 font-bold min-w-[130px]">قیمت کل قلم</th>
                  <th className="p-3 font-bold w-12 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3B0B14]/10">
                {calculations.computedItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-[#FDF8F9]/40 transition">
                    <td className="p-3 text-center font-bold text-[#6E3A44]">{index + 1}</td>

                    <td className="p-3 space-y-1.5">
                      <Input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleUpdateItem(item.id, "title", e.target.value)}
                        placeholder="نام اثر طلا (مثلاً دستبند بافته نسیما)"
                        className="h-8 text-xs font-bold"
                        required
                      />

                      {products.length > 0 && (
                        <select
                          className="w-full h-7 rounded-lg border border-[#3B0B14]/15 bg-white px-2 text-[10.5px] text-[#6E3A44] outline-none"
                          value={item.productId || ""}
                          onChange={(e) => handleSelectCatalogProduct(item.id, e.target.value)}
                        >
                          <option value="">انتخاب از ویترین کاتالوگ (اختیاری)...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title || p.name} ({p.weight} گرم)
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    <td className="p-3">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.weight}
                        onChange={(e) => handleUpdateItem(item.id, "weight", parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs font-mono font-bold text-left"
                        required
                      />
                    </td>

                    <td className="p-3">
                      <Input
                        type="number"
                        value={item.karat}
                        onChange={(e) => handleUpdateItem(item.id, "karat", parseInt(e.target.value) || 18)}
                        className="h-8 text-xs font-mono text-center"
                        defaultValue={18}
                      />
                    </td>

                    <td className="p-3">
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          value={item.wagePercent}
                          onChange={(e) => handleUpdateItem(item.id, "wagePercent", parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs font-mono font-bold pl-6 text-left"
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[#6E3A44] font-mono">%</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          value={item.profitPercent}
                          onChange={(e) => handleUpdateItem(item.id, "profitPercent", parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs font-mono pl-6 text-left"
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[#6E3A44] font-mono">%</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          value={item.taxPercent}
                          onChange={(e) => handleUpdateItem(item.id, "taxPercent", parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs font-mono pl-6 text-left"
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[#6E3A44] font-mono">%</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-mono text-xs font-black text-[#8B142D]">
                        {item.totalPrice.toLocaleString("fa-IR")} <span className="font-normal text-[10px]">تومان</span>
                      </div>
                      <div className="text-[10px] text-[#6E3A44] mt-0.5">
                        طلای خام: {Math.round(item.rawGoldValue).toLocaleString("fa-IR")}
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-rose-500 hover:text-rose-700 p-1.5 transition rounded-lg hover:bg-rose-50 cursor-pointer"
                        title="حذف ردیف"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ۴. بخش فروش اقساطی (گرمی و ریالی به قیمت روز طلا) */}
        <Card className="border-[#DFB76C]/50 bg-white/95 p-5 sm:p-6 backdrop-blur-md dark:border-white/10 dark:bg-[#1C080E]/95 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#3B0B14]/10 dark:border-white/10 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <BadgePercent size={20} className="text-[#8B142D]" />
              <CardTitle className="text-sm font-black">طرح فروش اقساطی طلا (گرمی و ریالی به قیمت روز)</CardTitle>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold bg-[#DFB76C]/15 px-3 py-1.5 rounded-xl border border-[#DFB76C]/40">
              <input
                type="checkbox"
                checked={isInstallment}
                onChange={(e) => setIsInstallment(e.target.checked)}
                className="rounded accent-[#8B142D] h-4 w-4 cursor-pointer"
              />
              <span>ثبت این فاکتور به عنوان «فروش اقساطی»</span>
            </label>
          </div>

          {isInstallment ? (
            <div className="space-y-4 pt-1 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* انتخاب نوع تسویه: گرمی یا ریالی */}
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-[#3B0B14] dark:text-zinc-200">
                    شیوه محاسبه و تسویه اقساط *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setInstallmentMode("weight_based")}
                      className={cn(
                        "p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer",
                        installmentMode === "weight_based"
                          ? "bg-[#8B142D] text-white border-[#8B142D] shadow-xs"
                          : "bg-[#FDF8F9] text-[#3B0B14] border-[#3B0B14]/15 hover:bg-black/5"
                      )}
                    >
                      <Scale size={16} />
                      <span>گرمی (نرخ روز طلا)</span>
                      <span className="text-[9.5px] opacity-80">معادل وزن طلا در سررسید</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInstallmentMode("amount_based")}
                      className={cn(
                        "p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer",
                        installmentMode === "amount_based"
                          ? "bg-[#8B142D] text-white border-[#8B142D] shadow-xs"
                          : "bg-[#FDF8F9] text-[#3B0B14] border-[#3B0B14]/15 hover:bg-black/5"
                      )}
                    >
                      <CreditCard size={16} />
                      <span>ریالی (مبلغ ثابت)</span>
                      <span className="text-[9.5px] opacity-80">مبالغ تومانی تقسیط‌شده</span>
                    </button>
                  </div>
                </div>

                {/* تعداد اقساط و پیش‌پرداخت */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-[#3B0B14] dark:text-zinc-200">
                      تعداد اقساط
                    </label>
                    <select
                      value={installmentMonths}
                      onChange={(e) => setInstallmentMonths(parseInt(e.target.value) || 3)}
                      className="w-full h-10 rounded-2xl border border-[#3B0B14]/15 bg-white px-3 text-xs font-bold outline-none"
                    >
                      <option value={2}>۲ قسطه (ماهانه)</option>
                      <option value={3}>۳ قسط طلایی (پیش‌فرض)</option>
                      <option value={4}>۴ قسطه</option>
                      <option value={6}>۶ قسطه</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-[#3B0B14] dark:text-zinc-200">
                      مبلغ پیش‌پرداخت (قسط اول)
                    </label>
                    <Input
                      type="number"
                      value={downPaymentAmount || calculations.firstInstallmentEqual}
                      onChange={(e) => setDownPaymentAmount(Number(e.target.value))}
                      className="font-mono text-xs font-bold"
                      placeholder="تومان"
                    />
                  </div>
                </div>
              </div>

              {/* کادر تشریح محاسبات اقساط */}
              <div className="p-4 rounded-2xl bg-[#FDF8F9] border border-[#DFB76C]/40 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-[#3B0B14]">
                  <span>خلاصه برنامه اقساط:</span>
                  <Badge variant="gold">
                    {installmentMode === "weight_based" ? "طرح طلایی وزنی" : "طرح ریالی ثابت"}
                  </Badge>
                </div>

                {installmentMode === "weight_based" ? (
                  <div className="grid sm:grid-cols-3 gap-2 pt-1 text-[11px] text-[#6E3A44]">
                    <div>
                      • وزن سهمی هر قسط: <strong className="font-mono text-[#3B0B14]">{calculations.shareWeight.toFixed(2)} گرم</strong>
                    </div>
                    <div>
                      • پیش‌پرداخت (قسط ۱): <strong className="font-mono text-[#8B142D]">{(downPaymentAmount || calculations.firstInstallmentEqual).toLocaleString("fa-IR")} ت</strong>
                    </div>
                    <div>
                      • مانده: <strong className="font-mono text-[#3B0B14]">{calculations.remainingCount} قسط</strong> معادل وزن روز در سررسید ماهانه
                    </div>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-2 pt-1 text-[11px] text-[#6E3A44]">
                    <div>
                      • پیش‌پرداخت دریافتی: <strong className="font-mono text-[#8B142D]">{(downPaymentAmount || calculations.firstInstallmentEqual).toLocaleString("fa-IR")} ت</strong>
                    </div>
                    <div>
                      • هر قسط باقیمانده: <strong className="font-mono text-[#3B0B14]">{Math.round((calculations.finalTotal - (downPaymentAmount || calculations.firstInstallmentEqual)) / calculations.remainingCount).toLocaleString("fa-IR")} تومان</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#6E3A44] italic">
              فروش این فاکتور به صورت نقدی در نظر گرفته شده است. برای تقسیط گرمی یا ریالی، چک‌باکس بالا را علامت بزنید.
            </p>
          )}
        </Card>

        {/* ۵. مالی، تخفیف و وضعیت پرداخت */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-[#3B0B14]/12 bg-white/90 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#1C080E]/90 space-y-4">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Percent size={18} className="text-[#8B142D]" />
              <span>تخفیف، وضعیت پرداخت و توضیحات فاکتور</span>
            </CardTitle>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#3B0B14] dark:text-zinc-200">
                  تخفیف نقدی (تومان)
                </label>
                <Input
                  type="number"
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  placeholder="0"
                  className="font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#3B0B14] dark:text-zinc-200">
                  وضعیت تسویه فاکتور
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full h-10 rounded-2xl border border-[#3B0B14]/15 bg-white px-3 text-xs font-bold outline-none"
                >
                  <option value="paid">تسویه کامل (پرداخت‌شده)</option>
                  <option value="partial">پرداخت قسطی / بیعانه</option>
                  <option value="unpaid">در انتظار پرداخت (تسویه نشده)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#3B0B14] dark:text-zinc-200">
                  مبلغ دریافتی تا این لحظه (تومان)
                </label>
                <Input
                  type="number"
                  value={paidAmount || (paymentStatus === "paid" ? calculations.finalTotal : "")}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  placeholder="مبلغ واریز شده"
                  className="font-mono text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 text-[#3B0B14] dark:text-zinc-200">
                توضیحات فاکتور و شرایط ضمانت
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-[#3B0B14]/15 bg-white p-3 text-xs text-[#3B0B14] outline-none leading-relaxed"
                placeholder="توضیحات ضمانت، شناسنامه نگین، شرایط بازخرید و اقساط..."
              />
            </div>
          </Card>

          {/* خلاصه کل مالی فاکتور */}
          <Card className="border-[#3B0B14]/15 bg-[#FDF8F9] p-5 space-y-3.5">
            <CardTitle className="text-sm font-black border-b border-[#3B0B14]/10 pb-3 flex items-center justify-between">
              <span>خلاصه حساب فاکتور طلا</span>
              <Badge variant="gold">
                {calculations.totalWeight.toFixed(2)} گرم طلا
              </Badge>
            </CardTitle>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[#6E3A44]">
                <span>ارزش طلای خام:</span>
                <span className="font-mono font-bold text-[#3B0B14]">
                  {Math.round(calculations.totalRawGold).toLocaleString("fa-IR")} ت
                </span>
              </div>

              <div className="flex justify-between text-[#6E3A44]">
                <span>مجموع اجرت ساخت:</span>
                <span className="font-mono font-bold text-[#3B0B14]">
                  +{Math.round(calculations.totalWage).toLocaleString("fa-IR")} ت
                </span>
              </div>

              <div className="flex justify-between text-[#6E3A44]">
                <span>مجموع سود گالری:</span>
                <span className="font-mono font-bold text-[#3B0B14]">
                  +{Math.round(calculations.totalProfit).toLocaleString("fa-IR")} ت
                </span>
              </div>

              <div className="flex justify-between text-[#6E3A44]">
                <span>مالیات بر ارزش افزوده:</span>
                <span className="font-mono font-bold text-[#3B0B14]">
                  +{Math.round(calculations.totalTax).toLocaleString("fa-IR")} ت
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>تخفیف:</span>
                  <span className="font-mono font-bold">
                    -{Number(discountAmount).toLocaleString("fa-IR")} ت
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-[#3B0B14]/10 flex justify-between items-center text-sm">
                <span className="font-black text-[#3B0B14]">مبلغ کل نهایی:</span>
                <strong className="font-mono font-black text-base text-[#8B142D]">
                  {calculations.finalTotal.toLocaleString("fa-IR")} تومان
                </strong>
              </div>

              <p className="text-[10px] text-[#6E3A44] leading-relaxed pt-1">
                معادل به حروف: {numberToWordsPersian(calculations.finalTotal)} تومان
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-2xl bg-[#8B142D] hover:bg-[#721f32] text-white text-xs font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Save size={16} />
              <span>{loading ? "در حال ذخیره‌سازی..." : "ذخیره تغییرات فاکتور"}</span>
            </Button>
          </Card>
        </div>
      </form>
    </div>
  );
}
