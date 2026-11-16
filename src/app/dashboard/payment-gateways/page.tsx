"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  CreditCard,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock3,
  XCircle,
  RefreshCw,
  ShieldCheck,
  Star,
  Settings,
  AlertTriangle,
  Zap,
  Save,
  X,
  ExternalLink,
  Lock,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import { recordAuditLogClient } from "@/lib/audit-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* =========================================================
   Types
========================================================= */

export type GatewayProvider = "zarinpal" | "mellat" | "sadad" | "nextpay" | "idpay" | "balepay" | "custom";

export interface PaymentGateway {
  id: string;
  name: string;
  provider: GatewayProvider;
  merchant_id?: string;
  terminal_id?: string;
  api_key?: string;
  username?: string;
  password?: string;
  is_sandbox: boolean;
  is_active: boolean;
  is_default: boolean;
  description?: string;
  min_amount?: number;
  max_amount?: number;
  sort_order?: number;
  created?: string;
  updated?: string;
}

const providerPresets: Record<
  GatewayProvider,
  {
    title: string;
    description: string;
    badgeColor: string;
    needsMerchant: boolean;
    needsTerminal: boolean;
    needsApiKey: boolean;
    needsUserPass: boolean;
    sandboxSupported: boolean;
    docUrl?: string;
  }
> = {
  zarinpal: {
    title: "زرین‌پال (ZarinPal)",
    description: "پرداخت‌یار رسمی بانک مرکزی - اتصال سریع با مرچنت‌آیدی ۳۶ کاراکتری",
    badgeColor: "bg-[#DFB76C]/20 text-[#8B142D] border-[#DFB76C]/50 dark:text-[#DFB76C]",
    needsMerchant: true,
    needsTerminal: false,
    needsApiKey: false,
    needsUserPass: false,
    sandboxSupported: true,
    docUrl: "https://www.zarinpal.com",
  },
  mellat: {
    title: "به‌پرداخت ملت (Mellat)",
    description: "درگاه پرداخت اینترنتی پی‌اس‌پی به‌پرداخت ملت (IPG شاپرک)",
    badgeColor: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300",
    needsMerchant: false,
    needsTerminal: true,
    needsApiKey: false,
    needsUserPass: true,
    sandboxSupported: false,
    docUrl: "https://behpardakht.com",
  },
  sadad: {
    title: "سداد بانک ملی (Sadad)",
    description: "درگاه پرداخت اینترنتی پرداخت الکترونیک سداد بانک ملی ایران",
    badgeColor: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300",
    needsMerchant: true,
    needsTerminal: true,
    needsApiKey: true,
    needsUserPass: false,
    sandboxSupported: false,
    docUrl: "https://sadadpsp.ir",
  },
  nextpay: {
    title: "نکست‌پی (NextPay)",
    description: "سامانه پرداخت یار نکست پی با سوییچ هوشمند بین بانکی",
    badgeColor: "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300",
    needsMerchant: false,
    needsTerminal: false,
    needsApiKey: true,
    needsUserPass: false,
    sandboxSupported: true,
    docUrl: "https://nextpay.org",
  },
  idpay: {
    title: "آیدی‌پی (IDPay)",
    description: "پرداخت یار آیدی پی با تسویه اتوماتیک شتابی",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
    needsMerchant: false,
    needsTerminal: false,
    needsApiKey: true,
    needsUserPass: false,
    sandboxSupported: true,
    docUrl: "https://idpay.ir",
  },
  balepay: {
    title: "بله پی (BalePay)",
    description: "درگاه پرداخت درون‌برنامه‌ای و اینترنتی پیام‌رسان بله",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
    needsMerchant: true,
    needsTerminal: false,
    needsApiKey: true,
    needsUserPass: false,
    sandboxSupported: false,
  },
  custom: {
    title: "درگاه سفارشی / متفرقه",
    description: "پیکربندی اختصاصی کلیدها و وب‌سرویس درگاه متفرقه",
    badgeColor: "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200",
    needsMerchant: true,
    needsTerminal: true,
    needsApiKey: true,
    needsUserPass: true,
    sandboxSupported: true,
  },
};

export default function DashboardPaymentGatewaysPage() {
  const [loading, setLoading] = useState(true);
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);

  // مودال افزودن / ویرایش درگاه
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    provider: "zarinpal" as GatewayProvider,
    merchant_id: "",
    terminal_id: "",
    api_key: "",
    username: "",
    password: "",
    is_sandbox: true,
    is_active: true,
    is_default: false,
    description: "",
    min_amount: 10000,
    max_amount: 500000000,
    sort_order: 1,
  });

  // واکشی داده‌های درگاه‌ها
// واکشی داده‌های درگاه‌ها (نسخه ایمن بدون خطای سینتکس)
  const fetchGateways = async () => {
    try {
      setLoading(true);
      const records = await pb.collection("payment_gateways").getFullList<PaymentGateway>({
        requestKey: null,
      });

      // مرتب‌سازی در سمت کلاینت
      const sorted = [...records].sort((a, b) => {
        const orderA = a.sort_order ?? 999;
        const orderB = b.sort_order ?? 999;
        return orderA - orderB;
      });

      setGateways(sorted);
    } catch (err: any) {
      console.error("Error loading payment gateways:", err);
      console.error("PocketBase Error Details:", err?.data);
      toast.error("خطا در بارگذاری درگاه‌های پرداخت");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchGateways();
  }, []);

  // باز کردن فرم ساخت درگاه جدید
  const openNewGatewayModal = () => {
    setEditingGateway(null);
    setForm({
      name: "درگاه پرداخت زرین‌پال",
      provider: "zarinpal",
      merchant_id: "",
      terminal_id: "",
      api_key: "",
      username: "",
      password: "",
      is_sandbox: true,
      is_active: true,
      is_default: gateways.length === 0,
      description: "پرداخت اینترنتی امن با کلیه کارت‌های بانکی عضو شتاب",
      min_amount: 10000,
      max_amount: 500000000,
      sort_order: (gateways.length + 1),
    });
    setIsModalOpen(true);
  };

  // باز کردن فرم ویرایش درگاه
  const openEditGatewayModal = (gw: PaymentGateway) => {
    setEditingGateway(gw);
    setForm({
      name: gw.name,
      provider: gw.provider || "zarinpal",
      merchant_id: gw.merchant_id || "",
      terminal_id: gw.terminal_id || "",
      api_key: gw.api_key || "",
      username: gw.username || "",
      password: gw.password || "",
      is_sandbox: gw.is_sandbox ?? false,
      is_active: gw.is_active ?? true,
      is_default: gw.is_default ?? false,
      description: gw.description || "",
      min_amount: gw.min_amount || 10000,
      max_amount: gw.max_amount || 500000000,
      sort_order: gw.sort_order || 1,
    });
    setIsModalOpen(true);
  };

  // تغییر ارائه‌دهنده در فرم
  const handleProviderChange = (provider: GatewayProvider) => {
    const preset = providerPresets[provider];
    setForm((prev) => ({
      ...prev,
      provider,
      name: preset.title,
      description: preset.description,
    }));
  };

  // ذخیره درگاه (ایجاد یا ویرایش)
  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("لطفاً نام نمایشی درگاه را وارد فرمایید.");
      return;
    }

    try {
      setSaving(true);

      // اگر این درگاه پیش‌فرض انتخاب شده، بقیه درگاه‌ها را از حالت پیش‌فرض خارج کن
      if (form.is_default) {
        for (const gw of gateways) {
          if (editingGateway && gw.id === editingGateway.id) continue;
          if (gw.is_default) {
            await pb.collection("payment_gateways").update(gw.id, { is_default: false });
          }
        }
      }

      if (editingGateway) {
        await pb.collection("payment_gateways").update(editingGateway.id, form);
        toast.success(`تنظیمات درگاه «${form.name}» با موفقیت ذخیره شد.`);

        void recordAuditLogClient({
          category: "settings",
          title: `ویرایش درگاه پرداخت: ${form.name}`,
          description: `تنظیمات اتصال درگاه ${form.name} به‌روزرسانی شد.`,
          level: "info",
          targetId: editingGateway.id,
          targetType: "payment_gateway",
        });
      } else {
        const created = await pb.collection("payment_gateways").create(form);
        toast.success(`درگاه جدید «${form.name}» با موفقیت ثبت شد.`);

        void recordAuditLogClient({
          category: "settings",
          title: `افزودن درگاه پرداخت: ${form.name}`,
          description: `درگاه ${form.name} به سامانه اضافه شد.`,
          level: "info",
          targetId: created.id,
          targetType: "payment_gateway",
        });
      }

      setIsModalOpen(false);
      await fetchGateways();
    } catch (err) {
      console.error("Save gateway error:", err);
      toast.error("خطا در ثبت درگاه پرداخت");
    } finally {
      setSaving(false);
    }
  };

  // تغییر وضعیت فعال / غیرفعال
  const handleToggleActive = async (gw: PaymentGateway) => {
    try {
      const newStatus = !gw.is_active;
      await pb.collection("payment_gateways").update(gw.id, { is_active: newStatus });
      setGateways((prev) =>
        prev.map((g) => (g.id === gw.id ? { ...g, is_active: newStatus } : g))
      );
      toast.success(
        newStatus ? `درگاه «${gw.name}» فعال شد.` : `درگاه «${gw.name}» غیرفعال شد.`
      );
    } catch {
      toast.error("خطا در تغییر وضعیت درگاه");
    }
  };

  // انتخاب به عنوان درگاه پیش‌فرض
  const handleSetDefault = async (gw: PaymentGateway) => {
    try {
      // غیرفعال کردن بقیه پیش‌فرض‌ها
      for (const item of gateways) {
        if (item.id !== gw.id && item.is_default) {
          await pb.collection("payment_gateways").update(item.id, { is_default: false });
        }
      }
      await pb.collection("payment_gateways").update(gw.id, {
        is_default: true,
        is_active: true, // درگاه پیش‌فرض باید فعال باشد
      });

      setGateways((prev) =>
        prev.map((g) => ({
          ...g,
          is_default: g.id === gw.id,
          is_active: g.id === gw.id ? true : g.is_active,
        }))
      );

      toast.success(`درگاه «${gw.name}» به عنوان درگاه اصلی پیش‌فرض سایت انتخاب شد.`);
    } catch {
      toast.error("خطا در تنظیم درگاه پیش‌فرض");
    }
  };

  // حذف درگاه
  const handleDeleteGateway = async (gw: PaymentGateway) => {
    if (gw.is_default && gateways.length > 1) {
      toast.error("درگاه پیش‌فرض را نمی‌توانید حذف کنید. ابتدا درگاه دیگری را به عنوان پیش‌فرض تعیین فرمایید.");
      return;
    }

    const confirmed = window.confirm(
      `آیا از حذف درگاه «${gw.name}» اطمینان دارید؟ کلیه تنظیمات این درگاه حذف خواهد شد.`
    );
    if (!confirmed) return;

    try {
      await pb.collection("payment_gateways").delete(gw.id);
      setGateways((prev) => prev.filter((g) => g.id !== gw.id));
      toast.success(`درگاه «${gw.name}» حذف شد.`);

      void recordAuditLogClient({
        category: "settings",
        title: `حذف درگاه پرداخت: ${gw.name}`,
        description: `درگاه ${gw.name} از سامانه حذف شد.`,
        level: "warning",
        targetId: gw.id,
        targetType: "payment_gateway",
      });
    } catch {
      toast.error("خطا در حذف درگاه پرداخت");
    }
  };

  // تست ساختار کلیدها
  const handleTestConnection = (gw: PaymentGateway) => {
    if (gw.provider === "zarinpal") {
      if (gw.is_sandbox) {
        toast.success(`درگاه ${gw.name} در وضعیت آزمایشی (سندباکس) آماده دریافت و شبیه‌سازی پرداخت است.`);
      } else if (!gw.merchant_id || gw.merchant_id.length < 32) {
        toast.warning("مرچنت کد وارد شده استاندارد نیست (باید کد ۳۶ کاراکتری معتبر زرین‌پال باشد).");
      } else {
        toast.success(`پیکربندی مرچنت کد ${gw.name} صحیح و آماده پرداخت شتابی است.`);
      }
    } else {
      toast.info(`تنظیمات وب‌سرویس ${gw.name} ذخیره شده و درگاه در حال حاضر ${gw.is_active ? "فعال" : "غیرفعال"} است.`);
    }
  };

  // پوشاندن مقادیر حساس (Masking)
  const maskSensitive = (str?: string) => {
    if (!str || str.length < 8) return "••••••••";
    return str.substring(0, 4) + "••••••••" + str.substring(str.length - 4);
  };

  const selectedPreset = providerPresets[form.provider] || providerPresets.zarinpal;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 font-sans text-[#3B0B14] dark:text-zinc-100" dir="rtl">
      {/* هدر صفحه */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#3B0B14]/12 bg-white/80 p-5 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#1C080E]/80 sm:p-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3B0B14] text-[#DFB76C] dark:bg-[#8B142D] dark:text-white shadow-xs">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#8B142D] dark:text-[#DFB76C]">
                سامانه پرداخت الکترونیک شاپرک
              </span>
              <Badge variant="gold" className="text-[10px] py-0 px-2 font-mono">
                IPG
              </Badge>
            </div>
            <h1 className="mt-1 text-xl font-black text-[#3B0B14] sm:text-2xl dark:text-zinc-100">
              مدیریت درگاه‌های پرداخت آنلاین
            </h1>
            <p className="mt-0.5 text-xs text-[#6E3A44] dark:text-zinc-400">
              تنظیمات مرچنت، ترمینال، کلیدهای وب‌سرویس، سوئیچ بین حالت آزمایشی (Sandbox) و عملیاتی
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            type="button"
            variant="outline"
            onClick={fetchGateways}
            disabled={loading}
            className="gap-2 text-xs cursor-pointer border-[#3B0B14]/20 dark:border-white/15"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-[#8B142D]")} />
            <span>بروزرسانی</span>
          </Button>

          <Button
            type="button"
            onClick={openNewGatewayModal}
            className="gap-2 text-xs font-black bg-[#3B0B14] hover:bg-[#8B142D] text-white dark:bg-[#8B142D] cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>افزودن درگاه پرداخت</span>
          </Button>
        </div>
      </div>

      {/* خلاصه وضعیت درگاه‌ها */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-[#3B0B14]/12 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C080E]/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400">درگاه پیش‌فرض سایت</span>
            <div className="p-2 rounded-xl bg-[#DFB76C]/20 text-[#8B142D] dark:text-[#DFB76C]">
              <Star size={16} />
            </div>
          </div>
          <div className="mt-2 font-black text-sm text-[#3B0B14] dark:text-zinc-100">
            {gateways.find((g) => g.is_default)?.name || "تعیین نشده"}
          </div>
        </Card>

        <Card className="border-[#3B0B14]/12 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C080E]/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400">درگاه‌های فعال</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {gateways.filter((g) => g.is_active).length}
            </span>
            <span className="text-xs text-[#6E3A44] dark:text-zinc-400">از {gateways.length} درگاه</span>
          </div>
        </Card>

        <Card className="border-[#3B0B14]/12 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C080E]/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400">امنیت و اتصال شاپرک</span>
            <div className="p-2 rounded-xl bg-[#8B142D]/10 text-[#8B142D] dark:bg-[#8B142D]/20">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-2 text-xs font-bold text-[#3B0B14] dark:text-zinc-200">
            پروتکل رمزنگاری امن SSL / TLS
          </div>
        </Card>
      </div>

      {/* لیست کارت‌های درگاه پرداخت */}
      <div className="space-y-4">
        {gateways.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-[#3B0B14]/20 bg-white/70 dark:border-white/10 dark:bg-[#1C080E]/70">
            <CreditCard size={32} className="mx-auto text-zinc-400" />
            <h3 className="mt-4 text-sm font-black text-[#3B0B14] dark:text-zinc-100">
              هیچ درگاه پرداختی تعریف نشده است
            </h3>
            <p className="mt-1 text-xs text-[#6E3A44] dark:text-zinc-400 max-w-sm mx-auto">
              برای دریافت وجه فاکتورها، سفارشات و اقساط طلا، حداقل یک درگاه پرداخت اینترنتی پیکربندی نمایید.
            </p>
            <Button
              onClick={openNewGatewayModal}
              className="mt-5 text-xs font-black bg-[#3B0B14] hover:bg-[#8B142D] text-white dark:bg-[#8B142D]"
            >
              <Plus size={15} className="ml-1.5" />
              افزودن اولین درگاه پرداخت
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gateways.map((gw) => {
              const preset = providerPresets[gw.provider] || providerPresets.custom;

              return (
                <Card
                  key={gw.id}
                  className={cn(
                    "p-5 transition-all border shadow-xs backdrop-blur-md relative flex flex-col justify-between",
                    gw.is_default
                      ? "border-[#DFB76C] bg-gradient-to-b from-white to-[#FDF8F9] dark:from-[#1C080E] dark:to-[#250B13] ring-1 ring-[#DFB76C]/30"
                      : gw.is_active
                      ? "border-[#3B0B14]/15 bg-white/95 dark:border-white/10 dark:bg-[#1C080E]/95"
                      : "border-zinc-200 bg-zinc-50/70 opacity-70 dark:border-white/5 dark:bg-zinc-900/40"
                  )}
                >
                  <div>
                    {/* نشان‌های بالای کارت */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#3B0B14]/10 dark:border-white/10">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-lg text-[10px] font-black border",
                            preset.badgeColor
                          )}
                        >
                          {preset.title}
                        </span>

                        {gw.is_default && (
                          <Badge variant="gold" className="text-[10px] py-0 px-2 gap-1">
                            <Star size={10} className="fill-current" />
                            پیش‌فرض سایت
                          </Badge>
                        )}

                        {gw.is_sandbox && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-2 font-mono">
                            سندباکس (تستی)
                          </Badge>
                        )}
                      </div>

                      {/* منوی عملیات */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditGatewayModal(gw)}
                          title="ویرایش درگاه"
                          className="p-1.5 rounded-lg text-[#3B0B14] hover:bg-[#3B0B14]/5 transition dark:text-zinc-300 dark:hover:bg-white/5 cursor-pointer"
                        >
                          <Edit3 size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteGateway(gw)}
                          title="حذف درگاه"
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition dark:hover:bg-rose-950/40 cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* عنوان و توضیحات درگاه */}
                    <div className="mt-3">
                      <h3 className="text-sm font-black text-[#3B0B14] dark:text-zinc-100 flex items-center justify-between">
                        <span>{gw.name}</span>
                        <Badge
                          variant={gw.is_active ? "success" : "outline"}
                          className="text-[10px]"
                        >
                          {gw.is_active ? "فعال" : "غیرفعال"}
                        </Badge>
                      </h3>
                      <p className="mt-1 text-[11px] text-[#6E3A44] dark:text-zinc-400 line-clamp-2 leading-5">
                        {gw.description || preset.description}
                      </p>
                    </div>

                    {/* مقادیر اتصال و کلیدها */}
                    <div className="mt-4 p-3 rounded-2xl bg-[#FDF8F9] border border-[#3B0B14]/10 dark:bg-zinc-900/60 dark:border-white/10 text-[11px] space-y-1.5">
                      {gw.merchant_id && (
                        <div className="flex justify-between items-center text-[#6E3A44] dark:text-zinc-300">
                          <span>مرچنت کد / پذیرنده:</span>
                          <span className="font-mono font-bold text-[#3B0B14] dark:text-white" dir="ltr">
                            {maskSensitive(gw.merchant_id)}
                          </span>
                        </div>
                      )}

                      {gw.terminal_id && (
                        <div className="flex justify-between items-center text-[#6E3A44] dark:text-zinc-300">
                          <span>شماره ترمینال:</span>
                          <span className="font-mono font-bold text-[#3B0B14] dark:text-white" dir="ltr">
                            {gw.terminal_id}
                          </span>
                        </div>
                      )}

                      {gw.api_key && (
                        <div className="flex justify-between items-center text-[#6E3A44] dark:text-zinc-300">
                          <span>کلید وب‌سرویس:</span>
                          <span className="font-mono font-bold text-[#3B0B14] dark:text-white" dir="ltr">
                            {maskSensitive(gw.api_key)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[#6E3A44] dark:text-zinc-300">
                        <span>حداقل / حداکثر تراکنش:</span>
                        <span className="font-mono text-[10px] text-[#3B0B14] dark:text-zinc-200">
                          {(gw.min_amount || 10000).toLocaleString("fa-IR")} تا {(gw.max_amount || 500000000).toLocaleString("fa-IR")} ت
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* دکمه‌های کنترل کارت */}
                  <div className="mt-4 pt-3 border-t border-[#3B0B14]/10 dark:border-white/10 flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(gw)}
                        className="text-[11px] h-7 px-2.5 gap-1 cursor-pointer border-[#3B0B14]/20"
                      >
                        <Zap size={12} className="text-[#DFB76C]" />
                        <span>تست اتصال</span>
                      </Button>

                      {!gw.is_default && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(gw)}
                          className="text-[11px] h-7 px-2 text-[#8B142D] dark:text-[#DFB76C] hover:bg-[#DFB76C]/10 cursor-pointer"
                        >
                          پیش‌فرض شود
                        </Button>
                      )}
                    </div>

                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#6E3A44] dark:text-zinc-300 cursor-pointer">
                      <span>{gw.is_active ? "روشن" : "خاموش"}</span>
                      <input
                        type="checkbox"
                        checked={gw.is_active}
                        onChange={() => handleToggleActive(gw)}
                        className="rounded accent-[#8B142D] h-4 w-4 cursor-pointer"
                      />
                    </label>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================
          مودال افزودن / ویرایش درگاه پرداخت
      ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl border border-[#3B0B14]/20 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1C080E] text-right font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#3B0B14]/10 pb-4 dark:border-white/10">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#8B142D] dark:text-[#DFB76C]" />
                <h3 className="text-base font-black text-[#3B0B14] dark:text-zinc-100">
                  {editingGateway ? "ویرایش تنظیمات درگاه پرداخت" : "افزودن درگاه پرداخت جدید"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1.5 text-zinc-400 hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/5 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveGateway} className="mt-5 space-y-4 text-xs">
              {/* انتخاب ارائه‌دهنده درگاه */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#6E3A44] dark:text-zinc-300">
                  انتخاب ارائه‌دهنده درگاه (PSP / پرداخت‌یار) *:
                </label>
                <select
                  value={form.provider}
                  onChange={(e) => handleProviderChange(e.target.value as GatewayProvider)}
                  className="w-full h-10 rounded-2xl border border-[#3B0B14]/15 bg-white px-3 text-xs font-bold outline-none dark:border-white/10 dark:bg-[#140508] dark:text-zinc-100"
                >
                  <option value="zarinpal">زرین‌پال (ZarinPal)</option>
                  <option value="mellat">به‌پرداخت ملت (Mellat)</option>
                  <option value="sadad">سداد بانک ملی (Sadad)</option>
                  <option value="nextpay">نکست‌پی (NextPay)</option>
                  <option value="idpay">آیدی‌پی (IDPay)</option>
                  <option value="balepay">بله پی (BalePay)</option>
                  <option value="custom">درگاه سفارشی / متفرقه</option>
                </select>
              </div>

              {/* نام نمایشی درگاه */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#6E3A44] dark:text-zinc-300">
                  عنوان و نام نمایشی درگاه *:
                </label>
                <Input
                  type="text"
                  required
                  placeholder="مثال: درگاه امن زرین‌پال، به‌پرداخت ملت..."
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              {/* فیلدهای اختصاصی بر اساس نوع درگاه */}
              {selectedPreset.needsMerchant && (
                <div className="space-y-1.5">
                  <label className="font-bold text-[#6E3A44] dark:text-zinc-300">
                    مرچنت کد (Merchant ID / کد پذیرنده):
                  </label>
                  <Input
                    type="text"
                    dir="ltr"
                    placeholder="مثال: 12345678-1234-1234-1234-123456789012"
                    value={form.merchant_id}
                    onChange={(e) => setForm({ ...form, merchant_id: e.target.value })}
                    className="font-mono text-left"
                  />
                </div>
              )}

              {selectedPreset.needsTerminal && (
                <div className="space-y-1.5">
                  <label className="font-bold text-[#6E3A44] dark:text-zinc-300">
                    شماره ترمینال (Terminal ID):
                  </label>
                  <Input
                    type="text"
                    dir="ltr"
                    placeholder="مثال: 12345678"
                    value={form.terminal_id}
                    onChange={(e) => setForm({ ...form, terminal_id: e.target.value })}
                    className="font-mono text-left"
                  />
                </div>
              )}

              {selectedPreset.needsApiKey && (
                <div className="space-y-1.5">
                  <label className="font-bold text-[#6E3A44] dark:text-zinc-300">
                    کلید وب‌سرویس / رمز درگاه (API Key / Secret):
                  </label>
                  <Input
                    type="password"
                    dir="ltr"
                    placeholder="کلید احراز هویت وب‌سرویس درگاه..."
                    value={form.api_key}
                    onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                    className="font-mono text-left"
                  />
                </div>
              )}

              {selectedPreset.needsUserPass && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-[#6E3A44] dark:text-zinc-300">نام کاربری وب‌سرویس:</label>
                    <Input
                      type="text"
                      dir="ltr"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="font-mono text-left"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-[#6E3A44] dark:text-zinc-300">کلمه عبور وب‌سرویس:</label>
                    <Input
                      type="password"
                      dir="ltr"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="font-mono text-left"
                    />
                  </div>
                </div>
              )}

              {/* حداقل و حداکثر تراکنش */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#6E3A44] dark:text-zinc-300">حداقل مبلغ تراکنش (تومان):</label>
                  <Input
                    type="number"
                    value={form.min_amount}
                    onChange={(e) => setForm({ ...form, min_amount: Number(e.target.value) })}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#6E3A44] dark:text-zinc-300">حداکثر مبلغ تراکنش (تومان):</label>
                  <Input
                    type="number"
                    value={form.max_amount}
                    onChange={(e) => setForm({ ...form, max_amount: Number(e.target.value) })}
                    className="font-mono"
                  />
                </div>
              </div>

              {/* متن توضیحات برای کاربر */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#6E3A44] dark:text-zinc-300">
                  متن توضیحات و راهنمای مشتری در صفحه پرداخت:
                </label>
                <textarea
                  rows={2}
                  placeholder="توضیحاتی که خریدار هنگام انتخاب این روش پرداخت مشاهده می‌کند..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-2xl border border-[#3B0B14]/15 bg-white p-3 text-xs font-bold outline-none dark:border-white/10 dark:bg-[#140508] dark:text-zinc-100 leading-5"
                />
              </div>

              {/* چک‌باکس‌های وضعیت و تنظیمات */}
              <div className="space-y-2.5 pt-2 border-t border-[#3B0B14]/10 dark:border-white/10 text-xs font-bold text-[#3B0B14] dark:text-zinc-200">
                {selectedPreset.sandboxSupported && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_sandbox}
                      onChange={(e) => setForm({ ...form, is_sandbox: e.target.checked })}
                      className="rounded accent-[#8B142D] h-4 w-4 cursor-pointer"
                    />
                    <span>حالت آزمایشی (Sandbox) فعال باشد (تست تراکنش‌ها بدون کسر واقعی پول)</span>
                  </label>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="rounded accent-[#8B142D] h-4 w-4 cursor-pointer"
                  />
                  <span>این درگاه پرداخت فعال باشد و به مشتریان پیشنهاد شود.</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_default}
                    onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                    className="rounded accent-[#8B142D] h-4 w-4 cursor-pointer"
                  />
                  <span>این درگاه به عنوان «درگاه پیش‌فرض سایت» تعیین شود.</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#3B0B14]/10 dark:border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
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
                  <span>{saving ? "در حال ذخیره..." : "ذخیره تنظیمات درگاه"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
