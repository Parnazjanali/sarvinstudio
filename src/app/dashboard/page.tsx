"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Eye,
  FileSpreadsheet,
  PackageCheck,
  PackageOpen,
  RefreshCw,
  Scale,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  UserPlus,
  X,
  Zap,
  ScrollText,
  Settings2,
  ChevronLeft,
  Activity,
  Layers,
} from "lucide-react";

import { pb } from "@/lib/pocketbase";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* =========================================================
   Types
========================================================= */

interface GoldRateRecord {
  id: string;
  symbol: string;
  name?: string;
  price?: number;
  change_value?: number;
  change_percent?: number;
  unit?: string;
  sign?: string;
  source?: string;
  market_date?: string;
  market_time?: string;
  time_unix?: number;
  created?: string;
  updated?: string;
}

interface GoldRateItem {
  id: string;
  symbol: string;
  title: string;
  price: string;
  rawPrice: number;
  change: string;
  changeType: "up" | "down" | "neutral";
  changeValue: string;
  unit: string;
}

interface ProductRecord {
  id: string;
  name: string;
  category?: string;
  weight?: number;
  price?: number;
  wage?: number;
  stock?: number;
  image?: string;
  collectionId?: string;
  created?: string;
  updated?: string;
}

interface OrderRecord {
  id: string;
  invoice_number?: string;
  customer_name?: string;
  customer_phone?: string;
  title?: string;
  weight?: number;
  karat?: number;
  total_price?: number;
  wage_price?: number;
  status?: string;
  created: string;
  updated?: string;
  payment_status?: string;
  receipt_status?: string;
  tracking_code?: string;
  expand?: {
    user?: {
      id?: string;
      name?: string;
      phone?: string;
    };
    product?: {
      id?: string;
      name?: string;
    };
  };
}

interface AuditLog {
  id: string;
  logCode?: string;
  category?: string;
  title?: string;
  description?: string;
  operator?: string;
  level?: "info" | "warning" | "error";
  created?: string;
  timestamp?: string;
}

interface SettingsRecord {
  id: string;
  allowInstallment?: boolean;
  allowNewOrders?: boolean;
  allowOutOfStockOrder?: boolean;
  allowUserRegistration?: boolean;
  defaultPageSize?: number;
  defaultRawGoldFeePercent?: number;
  defaultStoneFeePercent?: number;
  defaultWagePercent?: number;
  installmentFeePercent?: number;
  installmentMonths?: number;
  invoiceFooter?: string;
  invoiceLogo?: string;
  invoicePrefix?: string;
  invoiceTerms?: string;
  invoiceWarrantyText?: string;
  maintenanceMode?: boolean;
  minInstallmentAmount?: number;
  profitMargin?: number;
  requireCustomerAddress?: boolean;
  requireCustomerPhone?: boolean;
  requireEmailVerification?: boolean;
  roundingUnit?: number;
  sessionTimeout?: number;
  stockReservationHours?: number;
  storeAddress?: string;
  storeBale?: string;
  storeEmail?: string;
  storeInstagram?: string;
  storeMobile?: string;
  storeName?: string;
  storePhone?: string;
  storeTelegram?: string;
  vatPercent?: number;
}

interface SystemAlert {
  id: string;
  title: string;
  message: string;
  type: "danger" | "warning" | "info";
  time: string;
  actionHref?: string;
  actionText?: string;
  isReceiptModalTrigger?: boolean;
}

interface PendingReceiptItem {
  id: string;
  orderId: string;
  invoiceNumber: string;
  customerName: string;
  phone: string;
  amount: string;
  bankName: string;
  trackingCode: string;
  dateTime: string;
}

interface SalesTrendPoint {
  day: string;
  rialHeight: string;
  gramHeight: string;
  displayRial: string;
  displayGram: string;
}

interface DashboardStats {
  todaySales: number;
  monthlySales: number;
  totalSales: number;
  todayWeight: number;
  monthlyWeight: number;
  totalGoldWeight: number;
  productCount: number;
  lowStockCount: number;
  activeOrders: number;
  todayOrders: number;
  monthlyOrders: number;
}

/* =========================================================
   Constants
========================================================= */

const GOLD_SYMBOLS = [
  "IR_GOLD_18K",
  "IR_GOLD_24K",
  "IR_GOLD_MELTED",
  "XAUUSD",
  "IR_COIN_EMAMI",
  "IR_COIN_BAHAR",
  "IR_COIN_HALF",
  "IR_COIN_QUARTER",
  "IR_COIN_1G",
];

const actionItems = [
  {
    href: "/dashboard/products/new",
    title: "افزودن محصول جدید",
    subtitle: "ثبت در ویترین طلا",
    icon: PackageCheck,
    iconBg: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  {
    href: "/dashboard/orders/new",
    title: "ثبت سفارش دستی",
    subtitle: "سفارش حضوری / تلفنی",
    icon: ShoppingCart,
    iconBg: "bg-[#8B263E]/10 text-[#8B263E] dark:bg-[#8B263E]/20 dark:text-rose-300",
  },
  {
    href: "/dashboard/gold-rate",
    title: "تنظیم مظنه طلا",
    subtitle: "بروزرسانی نرخ پایه",
    icon: Coins,
    iconBg: "bg-[#B4901E]/10 text-[#B4901E] dark:bg-[#D8B65C]/20 dark:text-[#D8B65C]",
  },
  {
    href: "/dashboard/invoices/new",
    title: "صدور فاکتور رسمی",
    subtitle: "محاسبه مالیات و اجرت",
    icon: FileSpreadsheet,
    iconBg: "bg-sky-500/10 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  },
  {
    href: "/dashboard/gold-operations/new",
    title: "خرید طلای متفرقه",
    subtitle: "سنجش عیار و تسویه",
    icon: Scale,
    iconBg: "bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  },
  {
    href: "/dashboard/users/new",
    title: "ثبت مشتری جدید",
    subtitle: "ایجاد پرونده خریدار",
    icon: UserPlus,
    iconBg: "bg-[#1C3324]/10 text-[#1C3324] dark:bg-white/10 dark:text-zinc-200",
  },
];

/* =========================================================
   Helpers
========================================================= */

const formatNumber = (value: number, maximumFractionDigits = 0) => {
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits,
  }).format(value);
};

const formatMoney = (value: number) => {
  return `${formatNumber(Math.round(value))} تومان`;
};

const formatWeight = (value: number) => {
  return `${formatNumber(value, 2)} گرم`;
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fa-IR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const isSameDay = (value: string, date: Date) => {
  const itemDate = new Date(value);
  return (
    itemDate.getFullYear() === date.getFullYear() &&
    itemDate.getMonth() === date.getMonth() &&
    itemDate.getDate() === date.getDate()
  );
};

const isSameMonth = (value: string, date: Date) => {
  const itemDate = new Date(value);
  return (
    itemDate.getFullYear() === date.getFullYear() &&
    itemDate.getMonth() === date.getMonth()
  );
};

const isCompletedOrder = (order: OrderRecord) => {
  const status = String(order.status || "").trim();
  return (
    status === "تحویل شده" ||
    status === "تحویل‌شده" ||
    status === "تکمیل شده" ||
    status === "تکمیل‌شده" ||
    status === "completed" ||
    status === "delivered"
  );
};

const isCancelledOrder = (order: OrderRecord) => {
  const status = String(order.status || "").trim();
  return (
    status === "لغو شده" ||
    status === "لغوشده" ||
    status === "لغو‌شده" ||
    status === "cancelled" ||
    status === "canceled"
  );
};

const isActiveOrder = (order: OrderRecord) => {
  return !isCompletedOrder(order) && !isCancelledOrder(order);
};

const isReceiptPending = (order: OrderRecord) => {
  const status = String(order.status || "").trim();
  const paymentStatus = String(order.payment_status || "").trim();
  const receiptStatus = String(order.receipt_status || "").trim();

  return (
    status === "در انتظار تایید فیش" ||
    status === "در انتظار تأیید فیش" ||
    paymentStatus === "pending_receipt" ||
    paymentStatus === "در انتظار تایید فیش" ||
    paymentStatus === "در انتظار تأیید فیش" ||
    receiptStatus === "pending" ||
    receiptStatus === "در انتظار تایید"
  );
};

const getGoldTitle = (symbol: string) => {
  switch (symbol) {
    case "IR_GOLD_18K":
      return "طلای ۱۸ عیار (۷۵۰)";
    case "IR_GOLD_24K":
      return "طلای ۲۴ عیار";
    case "IR_GOLD_MELTED":
      return "طلای آب‌شده نقدی";
    case "XAUUSD":
      return "انس جهانی طلا";
    case "IR_COIN_EMAMI":
      return "سکه امامی";
    case "IR_COIN_BAHAR":
      return "سکه بهار آزادی";
    case "IR_COIN_HALF":
      return "نیم سکه";
    case "IR_COIN_QUARTER":
      return "ربع سکه";
    case "IR_COIN_1G":
      return "سکه یک گرمی";
    default:
      return symbol;
  }
};

const getGoldDisplayUnit = (record: GoldRateRecord) => {
  if (record.unit) return record.unit;
  if (record.symbol === "XAUUSD") return "دلار / اونس";
  if (record.symbol.startsWith("IR_COIN_")) return "تومان";
  return "تومان / گرم";
};

const toGoldRateItem = (record: GoldRateRecord): GoldRateItem => {
  const rawPrice = Number(record.price) || 0;
  const changePercent = Number(record.change_percent) || 0;
  const changeValue = Number(record.change_value) || 0;

  const changeType =
    changePercent > 0 ? "up" : changePercent < 0 ? "down" : "neutral";

  let changeSign = "";
  if (changePercent > 0) changeSign = "+";
  else if (changePercent < 0) changeSign = "-";

  const changeText =
    changePercent === 0
      ? "۰٪"
      : `${changeSign}${formatNumber(Math.abs(changePercent), 2)}٪`;

  let changeValueText = "بدون تغییر";
  if (changeValue !== 0) {
    const valueSign = changeValue > 0 ? "+" : "-";
    changeValueText = `${valueSign}${formatNumber(
      Math.abs(changeValue)
    )} ${record.unit === "دلار" ? "$" : "ت"}`;
  }

  return {
    id: record.id,
    symbol: record.symbol,
    title: getGoldTitle(record.symbol),
    price: formatNumber(rawPrice, 2),
    rawPrice,
    change: changeText,
    changeType,
    changeValue: changeValueText,
    unit: getGoldDisplayUnit(record),
  };
};

const getDayLabel = (date: Date) => {
  return new Intl.DateTimeFormat("fa-IR", {
    weekday: "long",
  }).format(date);
};

const getLastSevenDays = () => {
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    days.push(date);
  }
  return days;
};

/* =========================================================
   Component
========================================================= */

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  const [goldRates, setGoldRates] = useState<GoldRateItem[]>([]);
  const [isLoadingGoldRates, setIsLoadingGoldRates] = useState(true);
  const [isRefreshingRate, setIsRefreshingRate] = useState(false);

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [allOrders, setAllOrders] = useState<OrderRecord[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SettingsRecord | null>(null);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptsList, setReceiptsList] = useState<PendingReceiptItem[]>([]);

  /* ---------------------------------------------------------------------- */
  /* Clock & Date                                                           */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("fa-IR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setCurrentDate(
        now.toLocaleDateString("fa-IR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    };

    updateDateTime();
    const intervalId = window.setInterval(updateDateTime, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Data Loaders                                                           */
  /* ---------------------------------------------------------------------- */

  const loadGoldRates = useCallback(async () => {
    try {
      setIsLoadingGoldRates(true);
      const records = await pb
        .collection("gold_rates")
        .getFullList<GoldRateRecord>({ requestKey: null });

      const validRecords = records.filter((record) =>
        GOLD_SYMBOLS.includes(record.symbol)
      );

      const sortedRecords = [...validRecords].sort((a, b) => {
        return (
          GOLD_SYMBOLS.indexOf(a.symbol) - GOLD_SYMBOLS.indexOf(b.symbol)
        );
      });

      setGoldRates(sortedRecords.map(toGoldRateItem));
    } catch (error) {
      console.error("خطا در دریافت نرخ طلا:", error);
      setGoldRates([]);
    } finally {
      setIsLoadingGoldRates(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const records = await pb
        .collection("products")
        .getFullList<ProductRecord>({
          sort: "-created",
          requestKey: null,
        });
      setProducts(records);
    } catch (error) {
      console.error("خطا در دریافت محصولات:", error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const records = await pb.collection("orders").getFullList<OrderRecord>({
        sort: "-created",
        expand: "user,product",
        requestKey: null,
      });

      setAllOrders(records);
      setOrders(records.slice(0, 8));
    } catch (error) {
      console.error("خطا در دریافت سفارش‌ها:", error);
      setAllOrders([]);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      setLoadingSettings(true);
      const records = await pb
        .collection("settings")
        .getFullList<SettingsRecord>({ requestKey: null });

      if (records.length > 0) {
        const sorted = [...records].sort((a, b) =>
          String(b.id).localeCompare(String(a.id))
        );
        setSettings(sorted[0]);
      } else {
        setSettings(null);
      }
    } catch (error) {
      console.error("خطا در دریافت تنظیمات:", error);
      setSettings(null);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      const token = pb.authStore.token;
      if (!token) {
        setLogs([]);
        return;
      }

      const response = await fetch("/api/admin/logs?page=1&perPage=6", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data?.success && Array.isArray(data.items)) {
        setLogs(data.items);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error("خطا در دریافت لاگ‌ها:", error);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setDashboardError("");
    await Promise.allSettled([
      loadGoldRates(),
      loadProducts(),
      loadOrders(),
      loadSettings(),
      loadLogs(),
    ]);
  }, [loadGoldRates, loadProducts, loadOrders, loadSettings, loadLogs]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* ---------------------------------------------------------------------- */
  /* Refresh Gold                                                           */
  /* ---------------------------------------------------------------------- */

  const handleRefreshGoldRates = async () => {
    if (isRefreshingRate) return;

    try {
      setIsRefreshingRate(true);
      setDashboardError("");

      const response = await fetch("/api/sync-gold", {
        method: "GET",
        cache: "no-store",
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        throw new Error("پاسخ نامعتبر از سرور دریافت شد.");
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "بروزرسانی نرخ طلا انجام نشد.");
      }

      await loadGoldRates();
      await loadLogs();
    } catch (error) {
      console.error("خطا در بروزرسانی نرخ طلا:", error);
      setDashboardError(
        error instanceof Error
          ? error.message
          : "بروزرسانی نرخ طلا انجام نشد."
      );
    } finally {
      setIsRefreshingRate(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Calculations                                                           */
  /* ---------------------------------------------------------------------- */

  const stats = useMemo<DashboardStats>(() => {
    const now = new Date();

    const todayOrders = allOrders.filter((order) =>
      isSameDay(order.created, now)
    );

    const monthlyOrders = allOrders.filter((order) =>
      isSameMonth(order.created, now)
    );

    const validSalesOrders = allOrders.filter(
      (order) => !isCancelledOrder(order)
    );

    const todaySales = todayOrders
      .filter((order) => !isCancelledOrder(order))
      .reduce((sum, order) => sum + (Number(order.total_price) || 0), 0);

    const monthlySales = monthlyOrders
      .filter((order) => !isCancelledOrder(order))
      .reduce((sum, order) => sum + (Number(order.total_price) || 0), 0);

    const totalSales = validSalesOrders.reduce(
      (sum, order) => sum + (Number(order.total_price) || 0),
      0
    );

    const todayWeight = todayOrders
      .filter((order) => !isCancelledOrder(order))
      .reduce((sum, order) => sum + (Number(order.weight) || 0), 0);

    const monthlyWeight = monthlyOrders
      .filter((order) => !isCancelledOrder(order))
      .reduce((sum, order) => sum + (Number(order.weight) || 0), 0);

    const totalGoldWeight = products.reduce((sum, product) => {
      const weight = Number(product.weight) || 0;
      const stock = Number(product.stock) || 0;
      return sum + weight * Math.max(stock, 0);
    }, 0);

    const lowStockCount = products.filter((product) => {
      const stock = Number(product.stock) || 0;
      return stock <= 2;
    }).length;

    const activeOrders = allOrders.filter(isActiveOrder).length;

    return {
      todaySales,
      monthlySales,
      totalSales,
      todayWeight,
      monthlyWeight,
      totalGoldWeight,
      productCount: products.length,
      lowStockCount,
      activeOrders,
      todayOrders: todayOrders.length,
      monthlyOrders: monthlyOrders.length,
    };
  }, [allOrders, products]);

  const pendingReceiptOrders = useMemo(() => {
    return allOrders.filter(isReceiptPending);
  }, [allOrders]);

  useEffect(() => {
    const mapped = pendingReceiptOrders.map((order) => ({
      id: order.id,
      orderId: order.id,
      invoiceNumber: order.invoice_number || `#${order.id.slice(0, 7)}`,
      customerName:
        order.customer_name || order.expand?.user?.name || "مشتری مهمان",
      phone: order.customer_phone || order.expand?.user?.phone || "—",
      amount: formatMoney(Number(order.total_price) || 0),
      bankName: "ثبت‌شده در سفارش",
      trackingCode: order.tracking_code || "—",
      dateTime: formatDateTime(order.created),
    }));

    setReceiptsList(mapped);
  }, [pendingReceiptOrders]);

  /* ---------------------------------------------------------------------- */
  /* Smart Alerts                                                           */
  /* ---------------------------------------------------------------------- */

  const alerts = useMemo<SystemAlert[]>(() => {
    const result: SystemAlert[] = [];

    if (settings?.maintenanceMode) {
      result.push({
        id: "maintenance",
        title: "حالت تعمیرات فعال است",
        message:
          "فروشگاه در وضعیت بهینه‌سازی قرار دارد؛ ثبت سفارش موقتاً محدود است.",
        type: "danger",
        time: "اکنون",
        actionHref: "/dashboard/settings",
        actionText: "مشاهده تنظیمات",
      });
    }

    if (settings && settings.allowNewOrders === false) {
      result.push({
        id: "orders-disabled",
        title: "ثبت سفارشات غیرفعال است",
        message: "در تنظیمات اصلی سیستم، ثبت سفارش موقتاً متوقف گردیده است.",
        type: "warning",
        time: "اکنون",
        actionHref: "/dashboard/settings",
        actionText: "تنظیمات سفارش",
      });
    }

    if (stats.lowStockCount > 0) {
      result.push({
        id: "low-stock",
        title: "کالاهای نیازمند شارژ موجودی",
        message: `${formatNumber(
          stats.lowStockCount
        )} کالا در ویترین موجودی صفر یا زیر ۲ عدد دارند.`,
        type: "warning",
        time: "اکنون",
        actionHref: "/dashboard/products",
        actionText: "بررسی موجودی",
      });
    }

    if (pendingReceiptOrders.length > 0) {
      const receiptTotal = pendingReceiptOrders.reduce(
        (sum, order) => sum + (Number(order.total_price) || 0),
        0
      );

      result.push({
        id: "pending-receipts",
        title: "فیش‌های واریزی در انتظار تأیید",
        message: `${formatNumber(
          pendingReceiptOrders.length
        )} سفارش به ارزش ${formatMoney(
          receiptTotal
        )} منتظر بررسی کارشناس مالی هستند.`,
        type: "info",
        time: "اکنون",
        actionText: "بررسی و صدور فاکتور",
        isReceiptModalTrigger: true,
      });
    }

    return result;
  }, [settings, stats, pendingReceiptOrders]);

  /* ---------------------------------------------------------------------- */
  /* Sales Trend Chart                                                      */
  /* ---------------------------------------------------------------------- */

  const salesTrendData = useMemo<SalesTrendPoint[]>(() => {
    const days = getLastSevenDays();

    const values = days.map((day) => {
      const dayOrders = allOrders.filter(
        (order) =>
          isSameDay(order.created, day) && !isCancelledOrder(order)
      );

      const rial = dayOrders.reduce(
        (sum, order) => sum + (Number(order.total_price) || 0),
        0
      );

      const gram = dayOrders.reduce(
        (sum, order) => sum + (Number(order.weight) || 0),
        0
      );

      return { day: getDayLabel(day), rial, gram };
    });

    const maxRial = Math.max(...values.map((item) => item.rial), 1);
    const maxGram = Math.max(...values.map((item) => item.gram), 1);

    return values.map((item) => ({
      day: item.day,
      rialHeight: `${Math.max(6, (item.rial / maxRial) * 100)}%`,
      gramHeight: `${Math.max(6, (item.gram / maxGram) * 100)}%`,
      displayRial:
        item.rial > 0
          ? `${formatNumber(item.rial / 1_000_000, 1)} م`
          : "۰ م",
      displayGram:
        item.gram > 0
          ? `${formatNumber(item.gram, 1)} گرم`
          : "۰ گرم",
    }));
  }, [allOrders]);

  const weeklyTotals = useMemo(() => {
    const days = getLastSevenDays();
    let rial = 0;
    let gram = 0;

    for (const day of days) {
      const dayOrders = allOrders.filter(
        (order) =>
          isSameDay(order.created, day) && !isCancelledOrder(order)
      );
      rial += dayOrders.reduce(
        (sum, order) => sum + (Number(order.total_price) || 0),
        0
      );
      gram += dayOrders.reduce(
        (sum, order) => sum + (Number(order.weight) || 0),
        0
      );
    }

    return { rial, gram };
  }, [allOrders]);

  const visibleProducts = useMemo(() => {
    return products
      .slice()
      .sort((a, b) =>
        String(b.created || "").localeCompare(String(a.created || ""))
      )
      .slice(0, 4);
  }, [products]);

  const getOrderStatusBadge = (status?: string) => {
    switch (status) {
      case "در انتظار تایید فیش":
      case "در انتظار تأیید فیش":
        return <Badge variant="crimson">{status}</Badge>;
      case "در حال ساخت/آماده‌سازی":
        return <Badge variant="warning">{status}</Badge>;
      case "آماده ارسال":
      case "ارسال‌شده":
      case "ارسال شده":
        return <Badge variant="gold">{status}</Badge>;
      case "تحویل شده":
      case "تحویل‌شده":
      case "تکمیل شده":
      case "تکمیل‌شده":
        return <Badge variant="success">{status}</Badge>;
      case "لغو شده":
      case "لغو‌شده":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="outline">{status || "ثبت اولیه"}</Badge>;
    }
  };

  const handleApproveReceipt = (receiptId: string) => {
    setReceiptsList((prev) => prev.filter((item) => item.id !== receiptId));
  };

  const handleDeclineReceipt = (receiptId: string) => {
    setReceiptsList((prev) => prev.filter((item) => item.id !== receiptId));
  };

  const getLogIcon = (level?: AuditLog["level"]) => {
    switch (level) {
      case "error":
        return <X className="h-3.5 w-3.5 text-rose-500" />;
      case "warning":
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      default:
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8" dir="rtl">
      {/* ===================================================
          Dashboard Hero Header
      =================================================== */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-[#1C3324]/12 bg-white/80 p-5 shadow-xs backdrop-blur-md transition-colors lg:flex-row lg:items-center lg:p-6 dark:border-white/10 dark:bg-[#15221B]/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-black text-[#8B263E] dark:text-[#D8B65C]">
              پیشخوان مرکزی پرنا زر · مثل زر بدرخش ✨
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-black text-[#1C3324] sm:text-3xl dark:text-zinc-100">
            داشبورد مدیریت و رصد بازار
          </h1>
          <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
            نمای یکپارچه فروش، موجودی طلا، مظنه لحظه‌ای و تراکنش‌های روزانه
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-3 rounded-2xl border border-[#1C3324]/12 bg-[#FAF9F6] px-3.5 py-2 text-xs font-bold text-[#3A5A46] dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[#8B263E] dark:text-[#D8B65C]" />
              <span>{currentDate || "در حال دریافت تاریخ..."}</span>
            </div>

            <div className="h-3 w-px bg-[#1C3324]/15 dark:bg-white/15" />

            <div className="flex items-center gap-1.5 font-mono text-xs">
              <Clock className="h-4 w-4 text-[#8B263E] dark:text-[#D8B65C]" />
              <span>{currentTime || "۰۰:۰۰:۰۰"}</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboard}
            className="gap-1.5"
            title="بروزرسانی داده‌های پیشخوان"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>بروزرسانی پیشخوان</span>
          </Button>
        </div>
      </div>

      {/* ===================================================
          Dashboard Error Notification
      =================================================== */}
      {dashboardError && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-bold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="flex-1">
            <div className="font-black">خطا در دریافت یا همگام‌سازی اطلاعات</div>
            <div className="mt-1 font-medium">{dashboardError}</div>
          </div>
          <button
            type="button"
            onClick={() => setDashboardError("")}
            className="text-rose-500 hover:text-rose-700"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ===================================================
          Smart Alerts Banner
      =================================================== */}
      {alerts.length > 0 && (
        <div className="space-y-2.5">
          {alerts.map((alert) => {
            const isDanger = alert.type === "danger";
            const isWarning = alert.type === "warning";

            return (
              <div
                key={alert.id}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border p-4 shadow-xs backdrop-blur-xs transition sm:flex-row sm:items-center sm:justify-between",
                  isDanger
                    ? "border-rose-200 bg-rose-50/80 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100"
                    : isWarning
                    ? "border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
                    : "border-sky-200 bg-sky-50/80 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100"
                )}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      isDanger
                        ? "bg-rose-200/80 text-rose-800 dark:bg-rose-900 dark:text-rose-200"
                        : isWarning
                        ? "bg-amber-200/80 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                        : "bg-sky-200/80 text-sky-800 dark:bg-sky-900 dark:text-sky-200"
                    )}
                  >
                    {isDanger ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : isWarning ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black">{alert.title}</span>
                      <span className="rounded-full bg-black/10 px-2 py-0.5 text-[9px] font-bold dark:bg-white/10">
                        {alert.time}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 opacity-90">
                      {alert.message}
                    </p>
                  </div>
                </div>

                <div className="self-end sm:self-center">
                  {alert.isReceiptModalTrigger ? (
                    <Button
                      variant={isDanger ? "destructive" : "crimson"}
                      size="sm"
                      onClick={() => setReceiptModalOpen(true)}
                    >
                      {alert.actionText}
                    </Button>
                  ) : alert.actionHref ? (
                    <Button
                      asChild
                      variant={isDanger ? "destructive" : "default"}
                      size="sm"
                    >
                      <Link href={alert.actionHref}>{alert.actionText}</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================
          Live Gold Rates Section
      =================================================== */}
      <Card className="border-[#1C3324]/12 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80">
        <CardHeader className="flex flex-col justify-between gap-3 pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#B4901E]/10 text-[#B4901E] dark:bg-[#D8B65C]/20 dark:text-[#D8B65C]">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-extrabold">
                مظنه لحظه‌ای بازار طلا و مسکوکات
              </CardTitle>
              <CardDescription className="text-[11px]">
                استعلام و مقایسه آخرین قیمت‌های بازار طلا و مسکوکات
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshGoldRates}
              disabled={isRefreshingRate}
              className="gap-1.5"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isRefreshingRate && "animate-spin")}
              />
              <span>
                {isRefreshingRate ? "در حال دریافت نرخ..." : "بروزرسانی نرخ طلا"}
              </span>
            </Button>

            <Button asChild variant="gold" size="sm" className="gap-1">
              <Link href="/dashboard/gold-rate">
                <span>تنظیم نرخ پایه فروشگاه</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoadingGoldRates ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-[#1C3324]/10 bg-zinc-100 dark:border-white/10 dark:bg-zinc-900"
                />
              ))}
            </div>
          ) : goldRates.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6 text-center text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <Coins className="mx-auto mb-2 h-6 w-6" />
              <div className="font-bold">هنوز نرخ واقعی در سیستم ثبت نشده است.</div>
              <div className="mt-1">
                لطفاً جهت واکشی مظنه، دکمه «بروزرسانی نرخ طلا» را کلیک فرمایید.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {goldRates
                .filter((rate) =>
                  [
                    "IR_GOLD_18K",
                    "IR_GOLD_24K",
                    "IR_GOLD_MELTED",
                    "XAUUSD",
                  ].includes(rate.symbol)
                )
                .map((rate) => {
                  const isUp = rate.changeType === "up";
                  const isNeutral = rate.changeType === "neutral";

                  return (
                    <Link
                      key={rate.id}
                      href="/dashboard/gold-rate"
                      className="group relative block overflow-hidden rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4 transition-all duration-200 hover:-translate-y-1 hover:border-[#8B263E] hover:shadow-xs dark:border-white/10 dark:bg-zinc-900/60 dark:hover:border-[#D8B65C]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#3A5A46] dark:text-zinc-300">
                          {rate.title}
                        </span>

                        <Badge
                          variant={
                            isNeutral
                              ? "secondary"
                              : isUp
                              ? "success"
                              : "destructive"
                          }
                          className="px-1.5 py-0.5 text-[10px] font-black"
                        >
                          {!isNeutral &&
                            (isUp ? (
                              <ArrowUpRight className="h-3 w-3 inline ml-0.5" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 inline ml-0.5" />
                            ))}
                          <span>{rate.change}</span>
                        </Badge>
                      </div>

                      <div className="mt-2.5 flex items-baseline justify-between gap-2">
                        <span className="text-xl font-black text-[#1C3324] dark:text-zinc-100">
                          {rate.price}
                        </span>
                        <span className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
                          {rate.unit}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between border-t border-[#1C3324]/8 pt-2 text-[11px] text-[#3A5A46] dark:border-white/8 dark:text-zinc-400">
                        <span>نوسان روزانه:</span>
                        <span
                          className={cn(
                            "font-mono text-[10px] font-bold",
                            isNeutral
                              ? "text-zinc-500"
                              : isUp
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {rate.changeValue}
                        </span>
                      </div>
                    </Link>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===================================================
          Main Dashboard Stat Cards (Upgraded Shadcn Cards)
      =================================================== */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          title="فروش کل امروز"
          value={formatNumber(stats.todaySales)}
          unit="تومان"
          accent="crimson"
          icon={ShoppingBag}
          description="بر اساس سفارشات تایید شده امروز"
          secondaryInfo={{
            label: "سفارش‌های امروز",
            value: `${formatNumber(stats.todayOrders)} فاکتور`,
            highlight: true,
          }}
          href="/dashboard/invoices"
          actionText="مشاهده فاکتورها"
          isLoading={loadingOrders}
        />

        <DashboardStatCard
          title="فروش ماه جاری"
          value={formatNumber(stats.monthlySales)}
          unit="تومان"
          accent="emerald"
          icon={Banknote}
          trend={stats.monthlySales > 0 ? "فعال" : undefined}
          trendType="positive"
          description="مجموع وصولی‌های قطعی این ماه"
          secondaryInfo={{
            label: "وزن طلای فروش رفته",
            value: `${formatNumber(stats.monthlyWeight, 2)} گرم`,
          }}
          href="/dashboard/invoices"
          actionText="گزارش جامع"
          isLoading={loadingOrders}
        />

        <DashboardStatCard
          title="موجودی کل ویترین و انبار"
          value={formatNumber(stats.totalGoldWeight, 2)}
          unit="گرم طلا"
          accent="gold"
          icon={Scale}
          description={`تعداد کل اقلام ثبت‌شده: ${formatNumber(stats.productCount)} قلم`}
          secondaryInfo={{
            label: "کالاهای کم‌موجودی",
            value: `${formatNumber(stats.lowStockCount)} کالا`,
            highlight: stats.lowStockCount > 0,
          }}
          href="/dashboard/products"
          actionText="مدیریت ویترین"
          isLoading={loadingProducts}
        />

        <DashboardStatCard
          title="سفارش‌های در جریان"
          value={formatNumber(stats.activeOrders)}
          unit="سفارش باز"
          accent="blue"
          icon={PackageOpen}
          description="سفارش‌های نیازمند اقدام، آماده‌سازی و ارسال"
          secondaryInfo={{
            label: "کل سفارش‌ها در سیستم",
            value: `${formatNumber(allOrders.length)} رکورد`,
          }}
          href="/dashboard/orders"
          actionText="پردازش سفارشات"
          isLoading={loadingOrders}
        />
      </section>

      {/* ===================================================
          Quick Actions Grid
      =================================================== */}
      <Card className="border-[#1C3324]/12 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#8B263E]/10 text-[#8B263E] dark:bg-[#8B263E]/20 dark:text-rose-300">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-extrabold">
                دسترسی‌های سریع و عملیات پرکاربرد
              </CardTitle>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">
            میانبرها
          </Badge>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {actionItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4 text-center transition-all duration-200 hover:-translate-y-1 hover:border-[#8B263E] hover:shadow-xs dark:border-white/10 dark:bg-zinc-900/60 dark:hover:border-[#D8B65C]"
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl shadow-xs transition-transform duration-200 group-hover:scale-110",
                      item.iconBg
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </div>

                  <div>
                    <span className="block text-xs font-black text-[#1C3324] dark:text-zinc-100">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-[#3A5A46] dark:text-zinc-400">
                      {item.subtitle}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ===================================================
          Weekly Sales Trend + Online Showcase
      =================================================== */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Weekly Chart */}
        <Card className="border-[#1C3324]/12 bg-white/80 p-6 lg:col-span-7 dark:border-white/10 dark:bg-[#15221B]/80">
          <div className="flex flex-col justify-between gap-3 border-b border-[#1C3324]/10 pb-4 sm:flex-row sm:items-center dark:border-white/10">
            <div>
              <CardTitle className="text-base font-extrabold">
                روند هفتگی فروش ریالی و وزنی
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                نمودار تجمیعی سفارش‌های تایید شده در ۷ روز گذشته
              </CardDescription>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-[#1C3324] dark:bg-[#D8B65C]" />
                <span className="text-[#3A5A46] dark:text-zinc-300">
                  ارزش ریالی
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-[#8B263E]" />
                <span className="text-[#3A5A46] dark:text-zinc-300">وزن کل</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Bars */}
          <div className="mt-6 flex h-60 items-end justify-between gap-2 px-2 sm:gap-4">
            {salesTrendData.map((item, index) => (
              <div
                key={`${item.day}-${index}`}
                className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
              >
                <div className="flex h-full w-full items-end justify-center gap-1 sm:gap-1.5">
                  <div
                    title={`فروش ریالی: ${item.displayRial}`}
                    className="w-full max-w-[14px] rounded-t-lg bg-[#1C3324] transition-all duration-300 group-hover:brightness-125 dark:bg-[#D8B65C]"
                    style={{ height: item.rialHeight }}
                  />

                  <div
                    title={`فروش وزنی: ${item.displayGram}`}
                    className="w-full max-w-[14px] rounded-t-lg bg-[#8B263E] transition-all duration-300 group-hover:brightness-125"
                    style={{ height: item.gramHeight }}
                  />
                </div>

                <span className="max-w-full truncate text-[10px] font-bold text-[#3A5A46] sm:text-[11px] dark:text-zinc-400">
                  {item.day}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col items-start justify-between gap-2 rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-3 text-xs dark:border-white/10 dark:bg-zinc-900/60 sm:flex-row sm:items-center">
            <span className="text-[#3A5A46] dark:text-zinc-400">
              مجموع فروش ۷ روز گذشته:
            </span>
            <div className="flex flex-wrap items-center gap-3 font-bold">
              <span className="text-[#1C3324] dark:text-zinc-100">
                {formatMoney(weeklyTotals.rial)}
              </span>
              <span className="text-[#8B263E] dark:text-[#D8B65C]">
                {formatWeight(weeklyTotals.gram)}
              </span>
            </div>
          </div>
        </Card>

        {/* Recent Products (Showcase) */}
        <Card className="border-[#1C3324]/12 bg-white/80 p-6 lg:col-span-5 dark:border-white/10 dark:bg-[#15221B]/80">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-extrabold">
                ویترین آنلاین محصولات
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                جدیدترین زیورآلات و طلاهای ثبت‌شده
              </CardDescription>
            </div>

            <Button asChild variant="link" size="sm" className="p-0">
              <Link href="/dashboard/products">مدیریت ویترین</Link>
            </Button>
          </div>

          <div className="space-y-3">
            {loadingProducts ? (
              <div className="py-12 text-center text-xs text-[#3A5A46] dark:text-zinc-400">
                در حال بارگذاری اقلام ویترین...
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#3A5A46] dark:text-zinc-400">
                محصولی در پایگاه داده ثبت نشده است.
              </div>
            ) : (
              visibleProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-3.5 dark:border-white/10 dark:bg-zinc-900/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1C3324] to-[#2D4F38] text-white shadow-2xs dark:from-[#D8B65C] dark:to-[#B4901E] dark:text-[#101813]">
                      <Sparkles className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h4 className="truncate text-xs font-black text-[#1C3324] dark:text-zinc-100">
                        {product.name}
                      </h4>

                      <div className="mt-1 flex items-center gap-2 text-[10px] text-[#3A5A46] dark:text-zinc-400">
                        <span>
                          وزن:{" "}
                          <span className="font-mono font-bold text-[#8B263E] dark:text-rose-300">
                            {product.weight ?? "—"}
                          </span>{" "}
                          گرم
                        </span>
                        <span>•</span>
                        <span>
                          اجرت:{" "}
                          <span className="font-mono font-bold">
                            {product.wage ?? 0}٪
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Badge
                      variant={
                        Number(product.stock) > 0 ? "success" : "destructive"
                      }
                      className="text-[10px] font-black"
                    >
                      {Number(product.stock) > 0
                        ? `${formatNumber(Number(product.stock))} در انبار`
                        : "اتمام موجودی"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      {/* ===================================================
          Recent Orders Table (Shadcn Table)
      =================================================== */}
      <Card className="border-[#1C3324]/12 bg-white/80 p-6 dark:border-white/10 dark:bg-[#15221B]/80">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="text-base font-extrabold">
              آخرین سفارش‌های ثبت‌شده
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              لیست سفارش‌ها، وضعیت پرداخت و پردازش نهایی در سیستم
            </CardDescription>
          </div>

          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link href="/dashboard/orders">
              <span>مشاهده تمام سفارش‌ها</span>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">شماره فاکتور</TableHead>
              <TableHead>مشتری</TableHead>
              <TableHead>شرح سفارش</TableHead>
              <TableHead>وزن طلا</TableHead>
              <TableHead>مبلغ کل</TableHead>
              <TableHead>وضعیت سفارش</TableHead>
              <TableHead className="text-left">عملیات</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loadingOrders ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-[#3A5A46] dark:text-zinc-400">
                  در حال دریافت اطلاعات سفارش‌ها...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-[#3A5A46] dark:text-zinc-400">
                  هنوز سفارشی در سیستم ثبت نشده است.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-bold text-[#8B263E] dark:text-rose-300">
                    {order.invoice_number || `#${order.id.slice(0, 7)}`}
                  </TableCell>

                  <TableCell>
                    <div className="font-bold text-[#1C3324] dark:text-zinc-100">
                      {order.customer_name ||
                        order.expand?.user?.name ||
                        "مشتری مهمان"}
                    </div>
                    <div className="font-mono text-[10px] text-[#3A5A46] dark:text-zinc-400">
                      {order.customer_phone ||
                        order.expand?.user?.phone ||
                        "—"}
                    </div>
                  </TableCell>

                  <TableCell className="text-[#1C3324] dark:text-zinc-200">
                    {order.title || order.expand?.product?.name || "خرید طلا"}
                  </TableCell>

                  <TableCell className="font-mono font-bold text-[#8B263E] dark:text-[#D8B65C]">
                    {order.weight
                      ? `${formatNumber(Number(order.weight), 2)} گرم`
                      : "—"}
                  </TableCell>

                  <TableCell className="font-bold text-[#1C3324] dark:text-zinc-100">
                    {order.total_price
                      ? formatMoney(Number(order.total_price))
                      : "۰ تومان"}
                  </TableCell>

                  <TableCell>{getOrderStatusBadge(order.status)}</TableCell>

                  <TableCell className="text-left">
                    <Button asChild variant="ghost" size="sm" className="h-7 px-2.5">
                      <Link href={`/dashboard/orders/${order.id}`} className="gap-1 text-xs">
                        <Eye className="h-3.5 w-3.5" />
                        <span>بررسی</span>
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ===================================================
          Recent Audit Logs + System Status
      =================================================== */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Audit Logs */}
        <Card className="border-[#1C3324]/12 bg-white/80 p-6 lg:col-span-7 dark:border-white/10 dark:bg-[#15221B]/80">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-extrabold">
                رویدادها و لاگ‌های امنیتی سیستم
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                ثبت خودکار رویدادهای سیستمی و تغییرات مدیریتی
              </CardDescription>
            </div>

            <Button asChild variant="link" size="sm" className="p-0">
              <Link href="/dashboard/logs" className="gap-1">
                <span>مشاهده همه</span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {loadingLogs ? (
            <div className="py-10 text-center text-xs text-[#3A5A46] dark:text-zinc-400">
              در حال دریافت لاگ‌ها...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ScrollText className="mb-2 h-8 w-8 text-[#1C3324]/30 dark:text-white/20" />
              <span className="text-xs text-[#3A5A46] dark:text-zinc-400">
                هنوز فعالیتی در لاگ سیستم ثبت نشده است.
              </span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {logs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] px-3.5 py-3 dark:border-white/10 dark:bg-zinc-900/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white border border-[#1C3324]/10 dark:bg-zinc-800 dark:border-white/10">
                      {getLogIcon(log.level)}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-xs font-black text-[#1C3324] dark:text-zinc-100">
                        {log.title || log.logCode || "رویداد سیستم"}
                      </div>
                      <div className="mt-0.5 truncate text-[10px] text-[#3A5A46] dark:text-zinc-400">
                        {log.description || log.operator || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-left">
                    <div className="font-mono text-[9px] font-bold text-[#8B263E] dark:text-[#D8B65C]">
                      {log.logCode || "LOG"}
                    </div>
                    <div className="mt-0.5 text-[9px] text-[#3A5A46] dark:text-zinc-400">
                      {formatDateTime(log.created || log.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* System Services Status */}
        <Card className="border-[#1C3324]/12 bg-white/80 p-6 lg:col-span-5 dark:border-white/10 dark:bg-[#15221B]/80">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-extrabold">
                وضعیت سرویس‌های اصلی
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                پایش لحظه‌ای درگاه‌ها و ماژول‌های فعال
              </CardDescription>
            </div>
            <Settings2 className="h-5 w-5 text-[#8B263E] dark:text-[#D8B65C]" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-3.5 dark:border-white/10 dark:bg-zinc-900/60">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    goldRates.length > 0 ? "bg-emerald-500" : "bg-rose-500"
                  )}
                />
                <span className="text-xs font-bold text-[#1C3324] dark:text-zinc-200">
                  سرویس نرخ لحظه‌ای طلا
                </span>
              </div>
              <Badge
                variant={goldRates.length > 0 ? "success" : "destructive"}
                className="text-[10px]"
              >
                {goldRates.length > 0 ? "فعال و متصل" : "نیازمند بروزرسانی"}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-3.5 dark:border-white/10 dark:bg-zinc-900/60">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    settings?.allowNewOrders !== false
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                  )}
                />
                <span className="text-xs font-bold text-[#1C3324] dark:text-zinc-200">
                  درگاه ثبت سفارش مشتریان
                </span>
              </div>
              <Badge
                variant={
                  settings?.allowNewOrders !== false ? "success" : "destructive"
                }
                className="text-[10px]"
              >
                {settings?.allowNewOrders !== false ? "پذیرش سفارش" : "غیرفعال"}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-3.5 dark:border-white/10 dark:bg-zinc-900/60">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    settings?.allowUserRegistration !== false
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                  )}
                />
                <span className="text-xs font-bold text-[#1C3324] dark:text-zinc-200">
                  ثبت‌نام و عضویت اعضا
                </span>
              </div>
              <Badge
                variant={
                  settings?.allowUserRegistration !== false
                    ? "success"
                    : "destructive"
                }
                className="text-[10px]"
              >
                {settings?.allowUserRegistration !== false ? "فعال" : "غیرفعال"}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-3.5 dark:border-white/10 dark:bg-zinc-900/60">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    settings?.maintenanceMode
                      ? "bg-rose-500"
                      : "bg-emerald-500"
                  )}
                />
                <span className="text-xs font-bold text-[#1C3324] dark:text-zinc-200">
                  وضعیت نگهداری و تعمیرات
                </span>
              </div>
              <Badge
                variant={settings?.maintenanceMode ? "destructive" : "success"}
                className="text-[10px]"
              >
                {settings?.maintenanceMode ? "تعمیرات فعال" : "وضعیت عادی"}
              </Badge>
            </div>

            {/* Profit & Fee Summary */}
            <div className="mt-4 rounded-2xl border border-[#1C3324]/15 bg-white p-3.5 dark:border-white/10 dark:bg-zinc-900/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-400">
                  حاشیه سود مصوب فروشگاه:
                </span>
                <span className="font-mono text-sm font-black text-[#8B263E] dark:text-[#D8B65C]">
                  {formatNumber(Number(settings?.profitMargin || 0), 2)}٪
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-[#1C3324]/8 pt-2 dark:border-white/8">
                <span className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-400">
                  اجرت ساخت پایه سیستم:
                </span>
                <span className="font-mono text-xs font-bold text-[#1C3324] dark:text-zinc-200">
                  {formatNumber(Number(settings?.defaultWagePercent || 0), 2)}٪
                </span>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* ===================================================
          Pending Receipts Dialog (Shadcn Dialog)
      =================================================== */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black">
                  فیش‌های بانکی منتظر تأیید و تسویه
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs">
                  {receiptsList.length} فیش واریزی در صف بررسی و صدور فاکتور رسمی
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-3 max-h-96 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
            {receiptsList.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#3A5A46] dark:text-zinc-400">
                هیچ فیشی در صف انتظار تأیید نیست.
              </div>
            ) : (
              receiptsList.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4 text-xs dark:border-white/10 dark:bg-zinc-900/60"
                >
                  <div className="flex items-center justify-between border-b border-[#1C3324]/10 pb-2.5 dark:border-white/10">
                    <span className="font-black text-[#1C3324] dark:text-zinc-100">
                      {rec.customerName}
                    </span>
                    <span className="font-mono font-bold text-[#8B263E] dark:text-[#D8B65C]">
                      {rec.invoiceNumber}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#3A5A46] dark:text-zinc-300">
                    <div>
                      مبلغ واریزی:{" "}
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        {rec.amount}
                      </span>
                    </div>

                    <div>
                      شماره تماس:{" "}
                      <span className="font-mono font-bold">{rec.phone}</span>
                    </div>

                    <div>
                      بانک مقصد: <span className="font-bold">{rec.bankName}</span>
                    </div>

                    <div>
                      زمان تراکنش:{" "}
                      <span className="font-bold">{rec.dateTime}</span>
                    </div>

                    <div className="col-span-2">
                      کد پیگیری بانکی:{" "}
                      <span className="font-mono font-bold text-[#1C3324] dark:text-zinc-100">
                        {rec.trackingCode}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApproveReceipt(rec.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      تأیید و صدور نهایی فاکتور
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeclineReceipt(rec.id)}
                      className="flex-1"
                    >
                      رد فیش واریزی
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReceiptModalOpen(false)}
            >
              بستن پنجره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}