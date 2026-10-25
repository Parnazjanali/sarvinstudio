"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  FileText,
  Loader2,
  Percent,
  Save,
  Settings as SettingsIcon,
  ShoppingCart,
  Store,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import TypographySettingsTab from "@/components/dashboard/TypographySettingsTab";
import { CustomFont, applyTypography } from "@/components/DynamicTypography";

type Tab =
  | "pricing"
  | "store"
  | "invoice"
  | "orders"
  | "system"
  | "fonts";

type Settings = {
  id: string;

  profitMargin: number;
  vatPercent: number;
  defaultWagePercent: number;
  defaultRawGoldFeePercent: number;
  defaultStoneFeePercent: number;
  installmentFeePercent: number;
  roundingUnit: number;

  storeName: string;
  storePhone: string;
  storeMobile: string;
  storeEmail: string;
  storeAddress: string;
  storeInstagram: string;
  storeTelegram: string;
  storeBale: string;

  invoicePrefix: string;
  invoiceFooter: string;
  invoiceTerms: string;
  invoiceWarrantyText: string;

  allowInstallment: boolean;
  installmentMonths: number;
  minInstallmentAmount: number;
  stockReservationHours: number;
  allowOutOfStockOrder: boolean;
  requireCustomerPhone: boolean;
  requireCustomerAddress: boolean;

  maintenanceMode: boolean;
  allowNewOrders: boolean;
  allowUserRegistration: boolean;
  requireEmailVerification: boolean;
  sessionTimeout: number;
  defaultPageSize: number;

  fontHeading: string;
  fontBody: string;
  fontPrint: string;
  fontHeadingSize: number;
  fontBodySize: number;
  fontPrintSize: number;
  customFonts: CustomFont[];
};

const defaultSettings: Settings = {
  id: "",

  profitMargin: 7,
  vatPercent: 9,
  defaultWagePercent: 0,
  defaultRawGoldFeePercent: 5,
  defaultStoneFeePercent: 0,
  installmentFeePercent: 0,
  roundingUnit: 1000,

  storeName: "پرنا زر",
  storePhone: "",
  storeMobile: "",
  storeEmail: "",
  storeAddress: "",
  storeInstagram: "",
  storeTelegram: "",
  storeBale: "",

  invoicePrefix: "",
  invoiceFooter: "",
  invoiceTerms: "",
  invoiceWarrantyText: "",

  allowInstallment: true,
  installmentMonths: 3,
  minInstallmentAmount: 0,
  stockReservationHours: 24,
  allowOutOfStockOrder: false,
  requireCustomerPhone: true,
  requireCustomerAddress: false,

  maintenanceMode: false,
  allowNewOrders: true,
  allowUserRegistration: true,
  requireEmailVerification: false,
  sessionTimeout: 120,
  defaultPageSize: 20,

  fontHeading: "Doran",
  fontBody: "IRANSans",
  fontPrint: "IRANSans",
  fontHeadingSize: 100,
  fontBodySize: 14,
  fontPrintSize: 11,
  customFonts: [],
};

const tabs: {
  id: Tab;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "pricing",
    label: "قیمت‌گذاری",
    icon: <Percent className="w-4 h-4" />,
  },
  {
    id: "store",
    label: "فروشگاه",
    icon: <Store className="w-4 h-4" />,
  },
  {
    id: "invoice",
    label: "فاکتور",
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: "orders",
    label: "سفارش‌ها",
    icon: <ShoppingCart className="w-4 h-4" />,
  },
  {
    id: "system",
    label: "سیستم",
    icon: <SettingsIcon className="w-4 h-4" />,
  },
  {
    id: "fonts",
    label: "تایپوگرافی و فونت‌ها",
    icon: <Type className="w-4 h-4" />,
  },
];

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  suffix,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-[#1C3324] dark:text-zinc-200">
        {label}
      </label>

      <div className="relative">
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-3.5 text-xs font-bold text-[#1C3324] outline-none transition placeholder:text-[#3A5A46]/50 focus:border-[#1C3324] dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[#D8B65C] ${
            suffix ? "pl-14" : ""
          }`}
        />

        {suffix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-[#1C3324] dark:text-zinc-200">
        {label}
      </label>

      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full resize-none rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-3.5 text-xs font-bold text-[#1C3324] outline-none transition placeholder:text-[#3A5A46]/50 focus:border-[#1C3324] dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[#D8B65C]"
      />
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-4 shadow-xs dark:border-white/10 dark:bg-zinc-900/80">
      <div>
        <div className="text-xs font-black text-[#1C3324] dark:text-zinc-100">
          {label}
        </div>

        {description && (
          <div className="mt-1 text-[11px] leading-5 text-[#3A5A46] dark:text-zinc-400">
            {description}
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
          checked ? "bg-[#1C3324] dark:bg-emerald-700" : "bg-neutral-300 dark:bg-zinc-700"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
            checked ? "right-1" : "right-6"
          }`}
        />
      </button>
    </div>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-[#1C3324]/12 bg-white/80 shadow-xs backdrop-blur-md overflow-hidden dark:border-white/10 dark:bg-[#15221B]/80">
      <div className="border-b border-[#1C3324]/10 px-6 py-5 bg-white/90 dark:border-white/10 dark:bg-[#15221B]">
        <h2 className="text-sm font-black text-[#1C3324] dark:text-zinc-100">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>

      <div className="p-6">{children}</div>
    </div>
  );
}

export default function DashboardSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("pricing");

  const [settings, setSettings] =
    useState<Settings>(defaultSettings);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  function update<K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    setDirty(true);
  }

  async function loadSettings() {
    try {
      setLoading(true);

      if (!pb.authStore.isValid) {
        throw new Error("نشست کاربری معتبر نیست");
      }

      const response = await fetch("/api/admin/settings", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${pb.authStore.token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "خطا در دریافت تنظیمات"
        );
      }

      let customFonts: CustomFont[] = [];
      try {
        if (Array.isArray(result.data.customFonts)) {
          customFonts = result.data.customFonts;
        } else if (
          typeof result.data.customFonts === "string" &&
          result.data.customFonts
        ) {
          customFonts = JSON.parse(result.data.customFonts);
        }
      } catch {
        customFonts = [];
      }

      setSettings({
        ...defaultSettings,
        ...result.data,
        customFonts,
        fontHeading: result.data.fontHeading || "Doran",
        fontBody: result.data.fontBody || "IRANSans",
        fontPrint: result.data.fontPrint || "IRANSans",
        fontHeadingSize: Number(result.data.fontHeadingSize || 100),
        fontBodySize: Number(result.data.fontBodySize || 14),
        fontPrintSize: Number(result.data.fontPrintSize || 11),
      });

      setDirty(false);
    } catch (error) {
      console.error("Settings load error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "خطا در دریافت تنظیمات"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);

      if (!pb.authStore.isValid) {
        throw new Error("نشست کاربری معتبر نیست");
      }

      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify({
          profitMargin: Number(settings.profitMargin),
          vatPercent: Number(settings.vatPercent),
          defaultWagePercent: Number(
            settings.defaultWagePercent
          ),
          defaultRawGoldFeePercent: Number(
            settings.defaultRawGoldFeePercent
          ),
          defaultStoneFeePercent: Number(
            settings.defaultStoneFeePercent
          ),
          installmentFeePercent: Number(
            settings.installmentFeePercent
          ),
          roundingUnit: Number(settings.roundingUnit),

          storeName: settings.storeName,
          storePhone: settings.storePhone,
          storeMobile: settings.storeMobile,
          storeEmail: settings.storeEmail,
          storeAddress: settings.storeAddress,
          storeInstagram: settings.storeInstagram,
          storeTelegram: settings.storeTelegram,
          storeBale: settings.storeBale,

          invoicePrefix: settings.invoicePrefix,
          invoiceFooter: settings.invoiceFooter,
          invoiceTerms: settings.invoiceTerms,
          invoiceWarrantyText:
            settings.invoiceWarrantyText,

          allowInstallment: settings.allowInstallment,
          installmentMonths: Number(
            settings.installmentMonths
          ),
          minInstallmentAmount: Number(
            settings.minInstallmentAmount
          ),
          stockReservationHours: Number(
            settings.stockReservationHours
          ),
          allowOutOfStockOrder:
            settings.allowOutOfStockOrder,
          requireCustomerPhone:
            settings.requireCustomerPhone,
          requireCustomerAddress:
            settings.requireCustomerAddress,

          maintenanceMode: settings.maintenanceMode,
          allowNewOrders: settings.allowNewOrders,
          allowUserRegistration:
            settings.allowUserRegistration,
          requireEmailVerification:
            settings.requireEmailVerification,
          sessionTimeout: Number(
            settings.sessionTimeout
          ),
          defaultPageSize: Number(
            settings.defaultPageSize
          ),

          fontHeading: settings.fontHeading || "Doran",
          fontBody: settings.fontBody || "IRANSans",
          fontPrint: settings.fontPrint || "IRANSans",
          fontHeadingSize: Number(settings.fontHeadingSize || 100),
          fontBodySize: Number(settings.fontBodySize || 14),
          fontPrintSize: Number(settings.fontPrintSize || 11),
          customFonts: settings.customFonts || [],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "خطا در ذخیره تنظیمات"
        );
      }

      let savedCustomFonts: CustomFont[] = [];
      try {
        if (Array.isArray(result.data.customFonts)) {
          savedCustomFonts = result.data.customFonts;
        } else if (
          typeof result.data.customFonts === "string" &&
          result.data.customFonts
        ) {
          savedCustomFonts = JSON.parse(result.data.customFonts);
        }
      } catch {
        savedCustomFonts = [];
      }

      setSettings({
        ...defaultSettings,
        ...result.data,
        customFonts: savedCustomFonts,
        fontHeading: result.data.fontHeading || "Doran",
        fontBody: result.data.fontBody || "IRANSans",
        fontPrint: result.data.fontPrint || "IRANSans",
        fontHeadingSize: Number(result.data.fontHeadingSize || 100),
        fontBodySize: Number(result.data.fontBodySize || 14),
        fontPrintSize: Number(result.data.fontPrintSize || 11),
      });

      setDirty(false);

      // Apply typography changes dynamically and broadcast to whole app
      applyTypography({
        fontHeading: settings.fontHeading || "Doran",
        fontBody: settings.fontBody || "IRANSans",
        fontPrint: settings.fontPrint || "IRANSans",
        fontHeadingSize: Number(settings.fontHeadingSize || 100),
        fontBodySize: Number(settings.fontBodySize || 14),
        fontPrintSize: Number(settings.fontPrintSize || 11),
        customFonts: settings.customFonts || [],
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("typography-updated", {
            detail: {
              fontHeading: settings.fontHeading || "Doran",
              fontBody: settings.fontBody || "IRANSans",
              fontPrint: settings.fontPrint || "IRANSans",
              fontHeadingSize: Number(settings.fontHeadingSize || 100),
              fontBodySize: Number(settings.fontBodySize || 14),
              fontPrintSize: Number(settings.fontPrintSize || 11),
              customFonts: settings.customFonts || [],
            },
          })
        );
      }

      toast.success("تنظیمات با موفقیت ذخیره شد");
    } catch (error) {
      console.error("Settings save error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "خطا در ذخیره تنظیمات"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent p-6" dir="rtl">
        <div className="mx-auto max-w-5xl flex min-h-[420px] items-center justify-center rounded-3xl border border-[#1C3324]/12 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#8B263E] dark:text-[#D8B65C]" />

            <p className="text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
              در حال دریافت تنظیمات...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 font-sans text-[#1C3324] dark:text-zinc-100"
      dir="rtl"
    >
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between rounded-3xl border border-[#1C3324]/12 bg-white/80 p-5 shadow-xs backdrop-blur-md sm:p-6 dark:border-white/10 dark:bg-[#15221B]/80">
          <div>
            <h1 className="text-2xl font-black text-[#1C3324] dark:text-zinc-100">
              تنظیمات سیستم
            </h1>

            <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
              مدیریت تنظیمات فروشگاه پرنا زر، قیمت‌گذاری و سفارش‌ها
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            {dirty ? (
              <>
                <span className="h-2 w-2 rounded-full bg-[#8B263E] dark:bg-rose-400" />
                <span className="text-[#8B263E] dark:text-rose-400">
                  تغییرات ذخیره نشده
                </span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[#3A5A46] dark:text-zinc-400">
                  همه تغییرات ذخیره شده
                </span>
              </>
            )}
          </div>
        </div>

        {/* 4 Stat Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardStatCard
            title="نام تجاری و برند فروشگاه"
            value={settings.storeName || "پرنا زر"}
            unit="گالری آنلاین"
            accent="gold"
            icon={Store}
            description="عنوان رسمی در سربرگ فاکتورها و پنل کاربری"
            isLoading={loading}
          />

          <DashboardStatCard
            title="حاشیه سود مصوب فروشگاه"
            value={`${settings.profitMargin}٪`}
            unit="درصد سود"
            accent="emerald"
            icon={Percent}
            description="محاسبه هوشمند بر روی طلای خام و اجرت"
            isLoading={loading}
          />

          <DashboardStatCard
            title="مالیات بر ارزش افزوده (VAT)"
            value={`${settings.vatPercent}٪`}
            unit="مالیات قانونی"
            accent="blue"
            icon={FileText}
            description="محاسبه بر مبنای مجموع سود و اجرت ساخت"
            isLoading={loading}
          />

          <DashboardStatCard
            title="وضعیت سفارش‌گیری و سیستم"
            value={
              settings.maintenanceMode
                ? "حالت تعمیرات"
                : settings.allowNewOrders
                ? "پذیرش فعال"
                : "توقف موقت"
            }
            unit="سیستم"
            accent={settings.maintenanceMode ? "crimson" : "default"}
            icon={SettingsIcon}
            description={
              settings.maintenanceMode
                ? "سایت برای عموم کاربران غیرفعال است"
                : "سبد خرید و درگاه پرداخت آماده ثبت است"
            }
            secondaryInfo={{
              label: "خرید اقساطی",
              value: settings.allowInstallment
                ? `فعال (${settings.installmentMonths} ماهه)`
                : "غیرفعال",
              highlight: !settings.allowInstallment,
            }}
            isLoading={loading}
          />
        </section>

        {/* Tabs */}
        <div className="overflow-x-auto rounded-3xl border border-[#1C3324]/12 bg-white/80 p-2 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80">
          <div className="flex min-w-max gap-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black transition cursor-pointer ${
                    active
                      ? "bg-[#1C3324] text-white shadow-xs dark:bg-emerald-900 dark:text-[#D8B65C]"
                      : "text-[#3A5A46] hover:bg-black/5 hover:text-[#1C3324] dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Pricing */}
          {activeTab === "pricing" && (
            <div className="space-y-6">
              <Card
                title="فرمول قیمت‌گذاری"
                description="مقادیر پیش‌فرض مورد استفاده هنگام محاسبه قیمت محصولات"
              >
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Input
                    label="سود فروشگاه"
                    value={settings.profitMargin}
                    type="number"
                    suffix="%"
                    onChange={(value) =>
                      update(
                        "profitMargin",
                        Number(value)
                      )
                    }
                  />

                  <Input
                    label="مالیات بر ارزش افزوده"
                    value={settings.vatPercent}
                    type="number"
                    suffix="%"
                    onChange={(value) =>
                      update(
                        "vatPercent",
                        Number(value)
                      )
                    }
                  />

                  <Input
                    label="اجرت پیش‌فرض"
                    value={settings.defaultWagePercent}
                    type="number"
                    suffix="%"
                    onChange={(value) =>
                      update(
                        "defaultWagePercent",
                        Number(value)
                      )
                    }
                  />

                  <Input
                    label="کارمزد طلای خام"
                    value={
                      settings.defaultRawGoldFeePercent
                    }
                    type="number"
                    suffix="%"
                    onChange={(value) =>
                      update(
                        "defaultRawGoldFeePercent",
                        Number(value)
                      )
                    }
                  />

                  <Input
                    label="کارمزد سنگ"
                    value={
                      settings.defaultStoneFeePercent
                    }
                    type="number"
                    suffix="%"
                    onChange={(value) =>
                      update(
                        "defaultStoneFeePercent",
                        Number(value)
                      )
                    }
                  />

                  <Input
                    label="کارمزد فروش اقساطی"
                    value={
                      settings.installmentFeePercent
                    }
                    type="number"
                    suffix="%"
                    onChange={(value) =>
                      update(
                        "installmentFeePercent",
                        Number(value)
                      )
                    }
                  />

                  <Input
                    label="واحد گرد کردن قیمت"
                    value={settings.roundingUnit}
                    type="number"
                    onChange={(value) =>
                      update(
                        "roundingUnit",
                        Number(value)
                      )
                    }
                  />
                </div>
              </Card>

              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold leading-6 text-amber-800 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  نرخ لحظه‌ای طلا در بخش «نرخ طلا» مدیریت می‌شود و جزو تنظیمات فروشگاه نیست.
                </span>
              </div>
            </div>
          )}

          {/* Store */}
          {activeTab === "store" && (
            <Card
              title="اطلاعات فروشگاه"
              description="اطلاعاتی که در سایت، فاکتور و ارتباط با مشتری نمایش داده می‌شود"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  label="نام فروشگاه"
                  value={settings.storeName}
                  onChange={(value) =>
                    update("storeName", value)
                  }
                />

                <Input
                  label="شماره موبایل"
                  value={settings.storeMobile}
                  onChange={(value) =>
                    update("storeMobile", value)
                  }
                />

                <Input
                  label="تلفن ثابت"
                  value={settings.storePhone}
                  onChange={(value) =>
                    update("storePhone", value)
                  }
                />

                <Input
                  label="ایمیل"
                  value={settings.storeEmail}
                  type="email"
                  onChange={(value) =>
                    update("storeEmail", value)
                  }
                />

                <Input
                  label="اینستاگرام"
                  value={settings.storeInstagram}
                  placeholder="@parnazar.gold"
                  onChange={(value) =>
                    update(
                      "storeInstagram",
                      value
                    )
                  }
                />

                <Input
                  label="بله"
                  value={settings.storeBale}
                  placeholder="@parnazar"
                  onChange={(value) =>
                    update(
                      "storeBale",
                      value
                    )
                  }
                />

                <Input
                  label="تلگرام"
                  value={settings.storeTelegram}
                  placeholder="@parnazar"
                  onChange={(value) =>
                    update(
                      "storeTelegram",
                      value
                    )
                  }
                />

                <div className="sm:col-span-2">
                  <Textarea
                    label="آدرس فروشگاه"
                    value={settings.storeAddress}
                    placeholder="آدرس کامل فروشگاه..."
                    onChange={(value) =>
                      update(
                        "storeAddress",
                        value
                      )
                    }
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Invoice */}
          {activeTab === "invoice" && (
            <Card
              title="فاکتور"
              description="تنظیمات پیش‌فرض برای صدور و چاپ فاکتور"
            >
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Input
                    label="پیشوند شماره فاکتور"
                    value={settings.invoicePrefix}
                    placeholder="SRV-"
                    onChange={(value) =>
                      update(
                        "invoicePrefix",
                        value
                      )
                    }
                  />
                </div>

                <Textarea
                  label="متن پایین فاکتور"
                  value={settings.invoiceFooter}
                  placeholder="از خرید شما از گالری طلا و جواهر پرنا زر سپاسگزاریم — مثل زر بدرخش"
                  onChange={(value) =>
                    update(
                      "invoiceFooter",
                      value
                    )
                  }
                />

                <Textarea
                  label="شرایط و قوانین"
                  value={settings.invoiceTerms}
                  placeholder="شرایط خرید، مرجوعی و..."
                  onChange={(value) =>
                    update(
                      "invoiceTerms",
                      value
                    )
                  }
                />

                <Textarea
                  label="متن ضمانت"
                  value={
                    settings.invoiceWarrantyText
                  }
                  placeholder="شرایط ضمانت اصالت طلا..."
                  onChange={(value) =>
                    update(
                      "invoiceWarrantyText",
                      value
                    )
                  }
                />
              </div>
            </Card>
          )}

          {/* Orders */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <Card
                title="ثبت سفارش"
                description="کنترل شرایط ثبت و پردازش سفارش‌های مشتریان"
              >
                <div className="space-y-3">
                  <Toggle
                    label="پذیرش سفارش جدید"
                    description="در صورت خاموش بودن، مشتری امکان ثبت سفارش جدید ندارد."
                    checked={
                      settings.allowNewOrders
                    }
                    onChange={(value) =>
                      update(
                        "allowNewOrders",
                        value
                      )
                    }
                  />

                  <Toggle
                    label="خرید اقساطی"
                    description="فعال بودن امکان ثبت سفارش اقساطی"
                    checked={
                      settings.allowInstallment
                    }
                    onChange={(value) =>
                      update(
                        "allowInstallment",
                        value
                      )
                    }
                  />

                  <Toggle
                    label="سفارش محصول ناموجود"
                    description="اجازه ثبت سفارش برای محصولی که موجودی ندارد"
                    checked={
                      settings.allowOutOfStockOrder
                    }
                    onChange={(value) =>
                      update(
                        "allowOutOfStockOrder",
                        value
                      )
                    }
                  />
                </div>
              </Card>

              <Card
                title="جزئیات سفارش"
                description="محدودیت‌ها و اطلاعات مورد نیاز مشتری"
              >
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Input
                    label="تعداد ماه اقساط"
                    value={
                      settings.installmentMonths
                    }
                    type="number"
                    suffix="ماه"
                    onChange={(value) =>
                      update(
                        "installmentMonths",
                        Number(value)
                      )
                    }
                  />

                  <Input
                    label="حداقل مبلغ خرید اقساطی"
                    value={
                      settings.minInstallmentAmount
                    }
                    type="number"
                    suffix="تومان"
                    onChange={(value) =>
                      update(
                        "minInstallmentAmount",
                        Number(value)
                      )
                    }
                  />

                  <Input
                    label="مدت رزرو موجودی"
                    value={
                      settings.stockReservationHours
                    }
                    type="number"
                    suffix="ساعت"
                    onChange={(value) =>
                      update(
                        "stockReservationHours",
                        Number(value)
                      )
                    }
                  />
                </div>

                <div className="mt-5 space-y-3">
                  <Toggle
                    label="الزام شماره موبایل"
                    checked={
                      settings.requireCustomerPhone
                    }
                    onChange={(value) =>
                      update(
                        "requireCustomerPhone",
                        value
                      )
                    }
                  />

                  <Toggle
                    label="الزام آدرس"
                    checked={
                      settings.requireCustomerAddress
                    }
                    onChange={(value) =>
                      update(
                        "requireCustomerAddress",
                        value
                      )
                    }
                  />
                </div>
              </Card>
            </div>
          )}

          {/* System */}
          {activeTab === "system" && (
            <div className="space-y-6">
              <Card
                title="حساب کاربران"
                description="تنظیمات مربوط به ثبت‌نام و ورود کاربران"
              >
                <div className="space-y-3">
                  <Toggle
                    label="ثبت‌نام کاربران جدید"
                    checked={
                      settings.allowUserRegistration
                    }
                    onChange={(value) =>
                      update(
                        "allowUserRegistration",
                        value
                      )
                    }
                  />

                  <Toggle
                    label="تأیید ایمیل"
                    description="کاربر قبل از استفاده باید ایمیل خود را تأیید کند."
                    checked={
                      settings.requireEmailVerification
                    }
                    onChange={(value) =>
                      update(
                        "requireEmailVerification",
                        value
                      )
                    }
                  />
                </div>
              </Card>

              <Card
                title="سیستم"
                description="تنظیمات عمومی عملکرد داشبورد و فروشگاه"
              >
                <div className="space-y-3">
                  <Toggle
                    label="حالت تعمیرات"
                    description="نمایش صفحه تعمیرات برای کاربران عادی"
                    checked={
                      settings.maintenanceMode
                    }
                    onChange={(value) =>
                      update(
                        "maintenanceMode",
                        value
                      )
                    }
                  />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Input
                    label="مدت اعتبار نشست"
                    value={
                      settings.sessionTimeout
                    }
                    type="number"
                    suffix="دقیقه"
                    onChange={(value) =>
                      update(
                        "sessionTimeout",
                        Number(value)
                      )
                    }
                  />

                  <Input
                    label="تعداد آیتم در هر صفحه"
                    value={
                      settings.defaultPageSize
                    }
                    type="number"
                    onChange={(value) =>
                      update(
                        "defaultPageSize",
                        Number(value)
                      )
                    }
                  />
                </div>

                {settings.maintenanceMode && (
                  <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold leading-6 text-rose-700 shadow-xs dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>
                      حالت تعمیرات فعال است. لطفاً از اعمال تغییرات نهایی اطمینان حاصل کنید.
                    </span>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Typography & Fonts */}
          {activeTab === "fonts" && (
            <TypographySettingsTab
              fontHeading={settings.fontHeading || "Doran"}
              fontBody={settings.fontBody || "IRANSans"}
              fontPrint={settings.fontPrint || "IRANSans"}
              fontHeadingSize={settings.fontHeadingSize || 100}
              fontBodySize={settings.fontBodySize || 14}
              fontPrintSize={settings.fontPrintSize || 11}
              customFonts={settings.customFonts || []}
              onHeadingChange={(val) => update("fontHeading", val)}
              onBodyChange={(val) => update("fontBody", val)}
              onPrintChange={(val) => update("fontPrint", val)}
              onHeadingSizeChange={(val) => update("fontHeadingSize", val)}
              onBodySizeChange={(val) => update("fontBodySize", val)}
              onPrintSizeChange={(val) => update("fontPrintSize", val)}
              onCustomFontsChange={(fonts) => update("customFonts", fonts)}
            />
          )}

          {/* Save Bar */}
          <div className="flex items-center justify-between rounded-3xl border border-[#1C3324]/12 bg-white/80 p-4 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80">
            <div className="hidden items-center gap-2 sm:flex px-2">
              {dirty ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-[#8B263E] dark:bg-rose-400" />
                  <span className="text-xs font-bold text-[#8B263E] dark:text-rose-400">
                    تغییرات ذخیره نشده
                  </span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                    ذخیره شده
                  </span>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={saving || !dirty}
              className="mr-auto flex items-center gap-2 rounded-2xl bg-[#1C3324] px-6 py-3 text-xs font-black text-white shadow-sm transition hover:bg-[#8B263E] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer dark:bg-emerald-900/80 dark:hover:bg-emerald-800"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال ذخیره...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  ذخیره تغییرات
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}