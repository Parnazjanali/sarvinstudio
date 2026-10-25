"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Printer,
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
} from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import { recordAuditLogClient } from "@/lib/audit-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { numberToWordsPersian } from "@/lib/format";
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
  weight: number; // گرم
  karat: number; // عیار (پیش‌فرض 18)
  wagePercent: number; // درصد اجرت
  profitPercent: number; // درصد سود (پیش‌فرض 7%)
  taxPercent: number; // درصد مالیات بر ارزش افزوده (پیش‌فرض 9%)
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

/* =========================================================
   Component
========================================================= */

export default function NewInvoicePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);

  // انتخاب نوع مشتری (ثبت شده یا حضوری)
  const [customerMode, setCustomerMode] = useState<"registered" | "guest">("guest");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNationalId, setCustomerNationalId] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // مظنه روز طلای 18 عیار
  const [goldPricePerGram, setGoldPricePerGram] = useState<number>(0);

  // اقلام طلا
  const [items, setItems] = useState<GoldInvoiceItem[]>([createDefaultItem()]);

  // تخفیف و پرداخت
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partial" | "unpaid">("paid");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("پوز بانکی / کارتخوان");
  const [notes, setNotes] = useState(
    "اصالت و عیار ۷۵۰ (۱۸ عیار) کلیه مصنوعات طلا تضمین می‌گردد. شرایط بازخرید بر اساس نرخ روز طلای خام اتحادیه می‌باشد."
  );

  // واکشی اولیه محصولات، مشتریان و نرخ زنده طلا
  useEffect(() => {
    async function fetchData() {
      try {
        const prodRecords = await pb.collection("products").getFullList<CatalogProduct>({
          sort: "title",
          requestKey: null,
        });
        setProducts(prodRecords);

        const userRecords = await pb.collection("users").getFullList<CustomerRecord>({
          sort: "name",
          requestKey: null,
        });
        setCustomers(userRecords);

        // واکشی نرخ طلای 18 عیار
        await fetchLiveGoldRate();
      } catch (err) {
        console.error("Failed to load initial data for invoice:", err);
      }
    }
    void fetchData();
  }, []);

  // واکشی نرخ روز طلا
  const fetchLiveGoldRate = async () => {
    try {
      setFetchingRates(true);
      const rateRecord = await pb
        .collection("gold_rates")
        .getFirstListItem('symbol="IR_GOLD_18K"', { requestKey: null })
        .catch(() => null);

      if (rateRecord && rateRecord.price) {
        setGoldPricePerGram(Number(rateRecord.price));
      }
    } catch {
      // Ignore
    } finally {
      setFetchingRates(false);
    }
  };

  // همگام‌سازی انتخاب مشتری ثبت‌شده
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const found = customers.find((c) => c.id === customerId);
    if (found) {
      setCustomerName(found.name || "");
      setCustomerPhone(found.phone || "");
      setCustomerNationalId(found.national_id || "");
      setCustomerAddress(found.address || "");
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
          [field]: value,
        };
      })
    );
  };

  // انتخاب محصول از کاتالوگ برای یک ردیف
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
          weight: Number(product.weight) || item.weight,
          karat: Number(product.karat) || 18,
          wagePercent: Number(product.wage_percent) || item.wagePercent,
          profitPercent: Number(product.profit_percent) || 7,
          taxPercent: Number(product.tax_percent) || 9,
        };
      })
    );
  };

  // محاسبات تفکیکی و تجمیعی طلا
  const calculations = useMemo(() => {
    const computedItems = items.map((item) => {
      const weight = Number(item.weight) || 0;
      const karat = Number(item.karat) || 18;
      const rawGoldValue = weight * goldPricePerGram * (karat / 18);

      const wagePercent = Number(item.wagePercent) || 0;
      const wageAmount = (rawGoldValue * wagePercent) / 100;

      const profitPercent = Number(item.profitPercent) || 0;
      const profitAmount = ((rawGoldValue + wageAmount) * profitPercent) / 100;

      const taxPercent = Number(item.taxPercent) || 0;
      const taxAmount = ((wageAmount + profitAmount) * taxPercent) / 100;

      const totalPrice = Math.round(
        rawGoldValue + wageAmount + profitAmount + taxAmount
      );

      return {
        ...item,
        rawGoldValue,
        wageAmount,
        profitAmount,
        taxAmount,
        totalPrice,
      };
    });

    const totalWeight = computedItems.reduce((acc, it) => acc + (Number(it.weight) || 0), 0);
    const totalRawGold = computedItems.reduce((acc, it) => acc + it.rawGoldValue, 0);
    const totalWage = computedItems.reduce((acc, it) => acc + it.wageAmount, 0);
    const totalProfit = computedItems.reduce((acc, it) => acc + it.profitAmount, 0);
    const totalTax = computedItems.reduce((acc, it) => acc + it.taxAmount, 0);
    const subtotal = computedItems.reduce((acc, it) => acc + it.totalPrice, 0);
    const finalTotal = Math.max(0, subtotal - (Number(discountAmount) || 0));

    return {
      computedItems,
      totalWeight,
      totalRawGold,
      totalWage,
      totalProfit,
      totalTax,
      subtotal,
      finalTotal,
    };
  }, [items, goldPricePerGram, discountAmount]);

  // ثبت و صدور نهایی فاکتور
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("لطفاً نام خریدار را وارد کنید.");
      return;
    }

    if (items.some((i) => !i.title.trim())) {
      toast.error("لطفاً عنوان و شرح کلیه اقلام فاکتور را وارد کنید.");
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

      const invoiceNumber = "SRV-" + Math.floor(100000 + Math.random() * 900000);

      const payload = {
        invoiceNumber,
        user: selectedCustomerId || null,
        product: items[0]?.productId || null,
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
        paidAmount:
          paymentStatus === "paid"
            ? calculations.finalTotal
            : paymentStatus === "unpaid"
            ? 0
            : Number(paidAmount) || 0,
        paymentStatus,
        discount: Number(discountAmount) || 0,
        items: calculations.computedItems,
        notes: notes.trim(),
        sellerName: "پرنا زر",
      };

      const record = await pb.collection("invoices").create(payload);

      // ثبت خودکار لاگ رویداد
      void recordAuditLogClient({
        category: "invoice",
        title: `صدور فاکتور رسمی طلا ${invoiceNumber}`,
        description: `فاکتور جدید به مبلغ ${calculations.finalTotal.toLocaleString("fa-IR")} تومان و وزن ${calculations.totalWeight.toFixed(2)} گرم برای مشتری «${customerName || "مشتری حضوری"}» ثبت شد.`,
        level: "info",
        targetId: record.id,
        targetType: "invoice",
        metadata: {
          invoiceNumber,
          totalAmount: calculations.finalTotal,
          totalWeight: calculations.totalWeight,
          itemsCount: calculations.computedItems.length,
          paymentStatus,
        },
      });

      toast.success(`فاکتور ${invoiceNumber} با موفقیت صادر و ثبت شد.`);
      router.push(`/dashboard/invoices/${record.id}`);
    } catch (err) {
      console.error("Create invoice error:", err);
      toast.error("خطا در ثبت فاکتور رخ داد. لطفاً فیلدها را مجدداً بررسی فرمایید.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 font-sans text-[#1C3324] dark:text-zinc-100" dir="rtl">
      {/* Top Header Card */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#1C3324]/12 bg-white/80 p-5 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80 sm:p-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/invoices"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#1C3324]/15 bg-white text-[#3A5A46] transition hover:border-[#8B263E] hover:text-[#8B263E] dark:border-white/10 dark:bg-[#101813] dark:text-zinc-400 dark:hover:text-[#D8B65C]"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#8B263E] dark:text-[#D8B65C]">
                سیستم صدور فاکتور صنف طلا و جواهرات
              </span>
              <Badge variant="gold" className="text-[10px] py-0 px-2 font-mono">
                فرمول اتحادیه
              </Badge>
            </div>
            <h1 className="mt-1 text-xl font-black text-[#1C3324] sm:text-2xl dark:text-zinc-100">
              صدور فاکتور رسمی فروش طلا
            </h1>
            <p className="mt-0.5 text-xs text-[#3A5A46] dark:text-zinc-400">
              تفکیک قانونی ارزش طلای خام، اجرت ساخت، سود فروشنده و مالیات بر ارزش افزوده
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            type="button"
            variant="outline"
            onClick={fetchLiveGoldRate}
            disabled={fetchingRates}
            className="gap-2 text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", fetchingRates && "animate-spin text-[#8B263E]")} />
            <span>بروزرسانی مظنه طلا</span>
          </Button>
        </div>
      </div>

      <form onSubmit={handleSaveInvoice} className="space-y-6">
        {/* بخش ۱: اطلاعات پایه و خریدار */}
        <Card className="border-[#1C3324]/12 bg-white/90 p-6 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/90">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1C3324]/10 pb-4 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E] dark:bg-[#8B263E]/20 dark:text-rose-300">
                <User className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-black">مشخصات خریدار و نرخ روز بازار</CardTitle>
                <CardDescription className="text-xs">اطلاعات هویتی مشتری جهت درج در فاکتور رسمی</CardDescription>
              </div>
            </div>

            {/* Toggle Guest / Registered */}
            <div className="flex items-center rounded-2xl border border-[#1C3324]/12 bg-[#FAF9F6] p-1 text-xs font-bold dark:border-white/10 dark:bg-zinc-900/60">
              <button
                type="button"
                onClick={() => setCustomerMode("guest")}
                className={cn(
                  "rounded-xl px-3 py-1.5 transition cursor-pointer",
                  customerMode === "guest"
                    ? "bg-[#1C3324] text-white shadow-2xs dark:bg-emerald-800"
                    : "text-[#3A5A46] dark:text-zinc-400"
                )}
              >
                مشتری حضوری / مهمان
              </button>
              <button
                type="button"
                onClick={() => setCustomerMode("registered")}
                className={cn(
                  "rounded-xl px-3 py-1.5 transition cursor-pointer",
                  customerMode === "registered"
                    ? "bg-[#1C3324] text-white shadow-2xs dark:bg-emerald-800"
                    : "text-[#3A5A46] dark:text-zinc-400"
                )}
              >
                مشتریان سامانه
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* If registered customer mode */}
            {customerMode === "registered" && (
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                <label className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-300">
                  انتخاب حساب کاربری مشتری:
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="w-full rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-3 text-xs font-bold text-[#1C3324] outline-none transition focus:border-[#1C3324] cursor-pointer dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100"
                >
                  <option value="">انتخاب کاربر از دیتابیس...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || "بدون نام"} ({c.phone || c.email || c.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Customer Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-300">
                نام و نام خانوادگی خریدار <span className="text-rose-500">*</span>:
              </label>
              <Input
                type="text"
                placeholder="مثال: مریم کریمی"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>

            {/* Customer Phone */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-300">
                شماره تلفن همراه:
              </label>
              <Input
                type="text"
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="font-mono text-left"
              />
            </div>

            {/* National ID */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-300">
                کد ملی خریدار:
              </label>
              <Input
                type="text"
                placeholder="۰۰۱۲۳۴۵۶۷۸"
                value={customerNationalId}
                onChange={(e) => setCustomerNationalId(e.target.value)}
                className="font-mono text-left"
              />
            </div>

            {/* Benchmark Gold Rate */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-300 flex items-center justify-between">
                <span>مظنه طلای ۱۸ عیار (تومان/گرم):</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">نرخ روز</span>
              </label>
              <Input
                type="number"
                value={goldPricePerGram}
                onChange={(e) => setGoldPricePerGram(Math.max(0, Number(e.target.value)))}
                className="font-mono font-black text-left text-[#8B263E] dark:text-[#D8B65C]"
                required
              />
            </div>

            {/* Customer Address */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
              <label className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-300">
                نشانی یا شهر محل سکونت خریدار (اختیاری):
              </label>
              <Input
                type="text"
                placeholder="تهران، خیابان ولیعصر..."
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* بخش ۲: اقلام فاکتور طلا (جدول چند قلمی) */}
        <Card className="border-[#1C3324]/12 bg-white/90 p-6 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/90 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1C3324]/10 pb-4 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#B4901E]/10 text-[#B4901E] dark:bg-[#D8B65C]/20 dark:text-[#D8B65C]">
                <Gem className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-black">اقلام طلا و زیورآلات فاکتور</CardTitle>
                <CardDescription className="text-xs">
                  امکان افزودن چندین قطعه طلا با وزن، اجرت و عیار مستقل
                </CardDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="gap-1.5 text-xs font-bold"
            >
              <Plus className="h-4 w-4" />
              <span>افزودن قطعه طلای دیگر</span>
            </Button>
          </div>

          {/* Items List */}
          <div className="space-y-4">
            {calculations.computedItems.map((item, idx) => (
              <div
                key={item.id}
                className="group relative rounded-2xl border border-[#1C3324]/12 bg-[#FAF9F6]/80 p-4 transition-all dark:border-white/10 dark:bg-zinc-900/60"
              >
                <div className="flex items-center justify-between border-b border-[#1C3324]/8 pb-3 dark:border-white/8">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#1C3324] text-[11px] font-mono font-bold text-white dark:bg-emerald-800">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-black text-[#1C3324] dark:text-zinc-100">
                      ردیف {idx + 1}: {item.title || "قطعه طلای جدید"}
                    </span>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>حذف ردیف</span>
                    </button>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  {/* Select from catalog (optional) */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
                      انتخاب سریع از کاتالوگ فروشگاه:
                    </label>
                    <select
                      value={item.productId || ""}
                      onChange={(e) => handleSelectCatalogProduct(item.id, e.target.value)}
                      className="w-full rounded-xl border border-[#1C3324]/12 bg-white px-3 py-2 text-xs font-bold text-[#1C3324] outline-none cursor-pointer dark:border-white/10 dark:bg-[#101813] dark:text-zinc-200"
                    >
                      <option value="">انتخاب از ویترین (اختیاری)...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title || p.name} ({p.weight} گرم)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title / Description */}
                  <div className="space-y-1 sm:col-span-2 lg:col-span-4">
                    <label className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
                      شرح و عنوان قطعه طلا <span className="text-rose-500">*</span>:
                    </label>
                    <Input
                      type="text"
                      placeholder="مثال: النگو طلا طرح تراش کارتیه، انگشتر سولیتر و..."
                      value={item.title}
                      onChange={(e) => handleUpdateItem(item.id, "title", e.target.value)}
                      required
                    />
                  </div>

                  {/* Weight */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
                      وزن (گرم):
                    </label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={item.weight}
                      onChange={(e) => handleUpdateItem(item.id, "weight", Number(e.target.value) || 0)}
                      className="font-mono font-bold text-left"
                      required
                    />
                  </div>

                  {/* Karat */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
                      عیار:
                    </label>
                    <select
                      value={item.karat}
                      onChange={(e) => handleUpdateItem(item.id, "karat", Number(e.target.value))}
                      className="w-full rounded-xl border border-[#1C3324]/12 bg-white px-3 py-2 text-xs font-bold text-[#1C3324] outline-none cursor-pointer dark:border-white/10 dark:bg-[#101813] dark:text-zinc-200"
                    >
                      <option value="18">۱۸ عیار (۷۵۰)</option>
                      <option value="24">۲۴ عیار (خالص)</option>
                      <option value="21">۲۱ عیار (۸۷۵)</option>
                      <option value="14">۱۴ عیار (۵۸۵)</option>
                    </select>
                  </div>

                  {/* Wage % */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
                      اجرت ساخت (%):
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={item.wagePercent}
                      onChange={(e) => handleUpdateItem(item.id, "wagePercent", Number(e.target.value) || 0)}
                      className="font-mono font-bold text-left"
                    />
                  </div>

                  {/* Profit % */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
                      سود گالری (%):
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={item.profitPercent}
                      onChange={(e) => handleUpdateItem(item.id, "profitPercent", Number(e.target.value) || 0)}
                      className="font-mono font-bold text-left"
                    />
                  </div>

                  {/* Tax % */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
                      مالیات (%):
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={item.taxPercent}
                      onChange={(e) => handleUpdateItem(item.id, "taxPercent", Number(e.target.value) || 0)}
                      className="font-mono font-bold text-left"
                    />
                  </div>

                  {/* Item Total */}
                  <div className="space-y-1 flex flex-col justify-end">
                    <span className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
                      جمع ردیف:
                    </span>
                    <div className="rounded-xl bg-[#1C3324]/5 px-3 py-2 text-left font-mono text-xs font-black text-[#1C3324] dark:bg-white/10 dark:text-[#D8B65C]">
                      {item.totalPrice.toLocaleString("fa-IR")} ت
                    </div>
                  </div>
                </div>

                {/* Sub-breakdown bar */}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#1C3324]/5 pt-2 text-[10px] text-[#3A5A46] dark:border-white/5 dark:text-zinc-400">
                  <div>
                    طلای خام: <span className="font-mono font-bold text-[#1C3324] dark:text-zinc-200">{Math.round(item.rawGoldValue).toLocaleString("fa-IR")} تومان</span>
                  </div>
                  <div>
                    اجرت: <span className="font-mono font-bold text-[#1C3324] dark:text-zinc-200">{Math.round(item.wageAmount).toLocaleString("fa-IR")} تومان</span>
                  </div>
                  <div>
                    سود: <span className="font-mono font-bold text-[#1C3324] dark:text-zinc-200">{Math.round(item.profitAmount).toLocaleString("fa-IR")} تومان</span>
                  </div>
                  <div>
                    مالیات: <span className="font-mono font-bold text-[#1C3324] dark:text-zinc-200">{Math.round(item.taxAmount).toLocaleString("fa-IR")} تومان</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* بخش ۳: خلاصه محاسبات مالی استاندارد طلا */}
        <Card className="border-[#1C3324]/12 bg-white/90 p-6 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/90 space-y-5">
          <div className="flex items-center gap-3 border-b border-[#1C3324]/10 pb-4 dark:border-white/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1C3324] text-white dark:bg-emerald-800">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-black">تفکیک مالی و نهایی فاکتور</CardTitle>
              <CardDescription className="text-xs">
                جمع مقادیر طبق ماده ۲۶ قانون مالیات بر ارزش افزوده طلا و جواهر
              </CardDescription>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 text-xs">
            <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-3 dark:border-white/10 dark:bg-zinc-900/60">
              <span className="text-[11px] text-[#3A5A46] dark:text-zinc-400">مجموع وزن طلا:</span>
              <p className="mt-1 font-mono font-black text-sm text-[#1C3324] dark:text-zinc-100">
                {calculations.totalWeight.toFixed(3)} گرم
              </p>
            </div>

            <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-3 dark:border-white/10 dark:bg-zinc-900/60">
              <span className="text-[11px] text-[#3A5A46] dark:text-zinc-400">مجموع طلای خام:</span>
              <p className="mt-1 font-mono font-black text-sm text-[#1C3324] dark:text-zinc-100">
                {Math.round(calculations.totalRawGold).toLocaleString("fa-IR")} ت
              </p>
            </div>

            <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-3 dark:border-white/10 dark:bg-zinc-900/60">
              <span className="text-[11px] text-[#3A5A46] dark:text-zinc-400">مجموع اجرت ساخت:</span>
              <p className="mt-1 font-mono font-black text-sm text-[#1C3324] dark:text-zinc-100">
                {Math.round(calculations.totalWage).toLocaleString("fa-IR")} ت
              </p>
            </div>

            <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-3 dark:border-white/10 dark:bg-zinc-900/60">
              <span className="text-[11px] text-[#3A5A46] dark:text-zinc-400">مجموع سود گالری:</span>
              <p className="mt-1 font-mono font-black text-sm text-[#1C3324] dark:text-zinc-100">
                {Math.round(calculations.totalProfit).toLocaleString("fa-IR")} ت
              </p>
            </div>

            <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-3 dark:border-white/10 dark:bg-zinc-900/60">
              <span className="text-[11px] text-[#3A5A46] dark:text-zinc-400">مالیات بر ارزش افزوده:</span>
              <p className="mt-1 font-mono font-black text-sm text-[#1C3324] dark:text-zinc-100">
                {Math.round(calculations.totalTax).toLocaleString("fa-IR")} ت
              </p>
            </div>
          </div>

          {/* Discount input */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#1C3324]/10 pt-4 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#3A5A46] dark:text-zinc-300">مبلغ تخفیف نقدی:</span>
              <Input
                type="number"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                className="w-44 font-mono font-bold text-left"
                placeholder="تومان"
              />
            </div>

            <div className="text-left text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
              جمع کل قبل از تخفیف: {calculations.subtotal.toLocaleString("fa-IR")} تومان
            </div>
          </div>

          {/* Big Total Box */}
          <div className="rounded-3xl bg-gradient-to-l from-[#1C3324] to-[#2D4F38] p-5 text-white shadow-md dark:from-[#15221B] dark:to-[#17251D] dark:border dark:border-[#D8B65C]/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-emerald-200 dark:text-zinc-400">
                  مبلغ نهایی و قابل پرداخت فاکتور:
                </span>
                <p className="mt-1 text-sm font-bold text-[#D8B65C]">
                  {numberToWordsPersian(calculations.finalTotal)}
                </p>
              </div>

              <div className="flex items-baseline gap-2 self-end sm:self-center">
                <span className="text-2xl font-black font-mono tracking-tight sm:text-3xl text-white dark:text-[#D8B65C]">
                  {calculations.finalTotal.toLocaleString("fa-IR")}
                </span>
                <span className="text-xs font-bold text-emerald-200 dark:text-zinc-300">تومان</span>
              </div>
            </div>
          </div>
        </Card>

        {/* بخش ۴: وضعیت تسویه، روش پرداخت و شرایط */}
        <Card className="border-[#1C3324]/12 bg-white/90 p-6 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/90 space-y-5">
          <div className="flex items-center gap-3 border-b border-[#1C3324]/10 pb-4 dark:border-white/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-black">وضعیت تسویه فاکتور و ضمانت‌نامه</CardTitle>
              <CardDescription className="text-xs">تعیین شیوه تسویه وجه و متن شرایط گارانتی طلا</CardDescription>
            </div>
          </div>

          {/* Payment status radiogroup */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition",
                paymentStatus === "paid"
                  ? "border-emerald-600 bg-emerald-50/70 font-bold dark:border-emerald-500 dark:bg-emerald-950/40"
                  : "border-[#1C3324]/12 bg-white dark:border-white/10 dark:bg-[#101813]"
              )}
            >
              <input
                type="radio"
                name="paymentStatus"
                checked={paymentStatus === "paid"}
                onChange={() => setPaymentStatus("paid")}
                className="accent-emerald-600"
              />
              <div>
                <span className="text-xs font-black text-[#1C3324] dark:text-zinc-100">تسویه کامل</span>
                <p className="text-[10px] text-[#3A5A46] dark:text-zinc-400">پرداخت تمام وجه در لحظه صدور</p>
              </div>
            </label>

            <label
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition",
                paymentStatus === "partial"
                  ? "border-sky-600 bg-sky-50/70 font-bold dark:border-sky-500 dark:bg-sky-950/40"
                  : "border-[#1C3324]/12 bg-white dark:border-white/10 dark:bg-[#101813]"
              )}
            >
              <input
                type="radio"
                name="paymentStatus"
                checked={paymentStatus === "partial"}
                onChange={() => setPaymentStatus("partial")}
                className="accent-sky-600"
              />
              <div>
                <span className="text-xs font-black text-[#1C3324] dark:text-zinc-100">بیعانه / پرداخت اقساطی</span>
                <p className="text-[10px] text-[#3A5A46] dark:text-zinc-400">پرداخت قسمتی از وجه و باقی‌مانده بدهی</p>
              </div>
            </label>

            <label
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition",
                paymentStatus === "unpaid"
                  ? "border-amber-600 bg-amber-50/70 font-bold dark:border-amber-500 dark:bg-amber-950/40"
                  : "border-[#1C3324]/12 bg-white dark:border-white/10 dark:bg-[#101813]"
              )}
            >
              <input
                type="radio"
                name="paymentStatus"
                checked={paymentStatus === "unpaid"}
                onChange={() => setPaymentStatus("unpaid")}
                className="accent-amber-600"
              />
              <div>
                <span className="text-xs font-black text-[#1C3324] dark:text-zinc-100">در انتظار پرداخت</span>
                <p className="text-[10px] text-[#3A5A46] dark:text-zinc-400">ثبت فاکتور بدون پرداخت اولیه</p>
              </div>
            </label>
          </div>

          {/* Partial payment detail */}
          {paymentStatus === "partial" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-2xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900/40 dark:bg-sky-950/30">
              <div className="space-y-1">
                <label className="text-xs font-bold text-sky-900 dark:text-sky-200">
                  مبلغ بیعانه / پیش‌پرداخت (تومان):
                </label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value)))}
                  className="font-mono font-bold text-left"
                />
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <span className="text-xs font-bold text-sky-900 dark:text-sky-200">مانده حساب مشتری:</span>
                <div className="font-mono font-black text-sm text-[#8B263E] dark:text-rose-400">
                  {Math.max(0, calculations.finalTotal - paidAmount).toLocaleString("fa-IR")} تومان
                </div>
              </div>
            </div>
          )}

          {/* Payment Method & Warranty text */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-300">شیوه پرداخت:</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-3 text-xs font-bold text-[#1C3324] outline-none cursor-pointer dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100"
              >
                <option value="پوز بانکی / کارتخوان">دستگاه کارتخوان (POS)</option>
                <option value="نقدی">پرداخت نقدی</option>
                <option value="کارت به کارت">انتقال کارت به کارت</option>
                <option value="شبا / حواله بانکی">حواله پایا / ساتنا</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-300">
                متن شرایط گارانتی و توضیحات فاکتور:
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-2xl border border-[#1C3324]/15 bg-white p-3.5 text-xs font-bold leading-6 text-[#1C3324] outline-none dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100"
              />
            </div>
          </div>
        </Card>

        {/* Submit Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-[#1C3324]/12 bg-white/90 p-5 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/90">
          <div className="text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
            فاکتور به صورت خودکار با شماره سریال اختصاصی و درج مشخصات کامل طلا ثبت خواهد شد.
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/invoices")}
              className="text-xs"
            >
              انصراف
            </Button>

            <Button
              type="submit"
              variant="default"
              size="default"
              disabled={loading}
              className="gap-2 text-xs font-black px-6 shadow-sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>در حال ثبت فاکتور...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>ثبت و صدور فاکتور طلا</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}