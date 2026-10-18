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
} from "lucide-react";

import { pb } from "@/lib/pocketbase";

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

const panelClass =
  "rounded-3xl border border-[#1C3324]/15 bg-white shadow-xs transition-all duration-300";

const actionItems = [
  {
    href: "/dashboard/products/new",
    title: "افزودن محصول",
    icon: PackageCheck,
    color:
      "border-[#1C3324]/15 bg-white hover:bg-[#1C3324]/5",
    iconColor: "bg-[#1C3324]",
  },
  {
    href: "/dashboard/orders/new",
    title: "ثبت سفارش دستی",
    icon: ShoppingCart,
    color:
      "border-[#1C3324]/15 bg-white hover:bg-[#1C3324]/5",
    iconColor: "bg-[#8B263E]",
  },
  {
    href: "/dashboard/gold-rate",
    title: "تغییر نرخ طلا",
    icon: Coins,
    color:
      "border-[#1C3324]/15 bg-white hover:bg-[#1C3324]/5",
    iconColor: "bg-[#1C3324]",
  },
  {
    href: "/dashboard/invoices/new",
    title: "صدور فاکتور رسمی",
    icon: FileSpreadsheet,
    color:
      "border-[#1C3324]/15 bg-white hover:bg-[#1C3324]/5",
    iconColor: "bg-[#8B263E]",
  },
  {
    href: "/dashboard/gold-operations/new",
    title: "خرید طلای متفرقه",
    icon: Scale,
    color:
      "border-[#1C3324]/15 bg-white hover:bg-[#1C3324]/5",
    iconColor: "bg-[#1C3324]",
  },
  {
    href: "/dashboard/users/new",
    title: "ثبت مشتری جدید",
    icon: UserPlus,
    color:
      "border-[#1C3324]/15 bg-white hover:bg-[#1C3324]/5",
    iconColor: "bg-[#8B263E]",
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

  if (Number.isNaN(date.getTime())) {
    return value;
  }

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
  const paymentStatus = String(
    order.payment_status || "",
  ).trim();
  const receiptStatus = String(
    order.receipt_status || "",
  ).trim();

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

const getGoldDisplayUnit = (
  record: GoldRateRecord,
) => {
  if (record.unit) {
    return record.unit;
  }

  if (record.symbol === "XAUUSD") {
    return "دلار / اونس";
  }

  if (
    record.symbol.startsWith("IR_COIN_")
  ) {
    return "تومان";
  }

  return "تومان / گرم";
};

const toGoldRateItem = (
  record: GoldRateRecord,
): GoldRateItem => {
  const rawPrice = Number(record.price) || 0;
  const changePercent =
    Number(record.change_percent) || 0;

  const changeValue =
    Number(record.change_value) || 0;

  const changeType =
    changePercent > 0
      ? "up"
      : changePercent < 0
      ? "down"
      : "neutral";

  let changeSign = "";

  if (changePercent > 0) {
    changeSign = "+";
  } else if (changePercent < 0) {
    changeSign = "-";
  }

  const changeText =
    changePercent === 0
      ? "۰٪"
      : `${changeSign}${formatNumber(
          Math.abs(changePercent),
          2,
        )}٪`;

  let changeValueText = "بدون تغییر";

  if (changeValue !== 0) {
    const valueSign =
      changeValue > 0 ? "+" : "-";

    changeValueText = `${valueSign}${formatNumber(
      Math.abs(changeValue),
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
  const [isLoadingGoldRates, setIsLoadingGoldRates] =
    useState(true);
  const [isRefreshingRate, setIsRefreshingRate] =
    useState(false);

  const [products, setProducts] = useState<
    ProductRecord[]
  >([]);

  const [orders, setOrders] = useState<
    OrderRecord[]
  >([]);

  const [allOrders, setAllOrders] = useState<
    OrderRecord[]
  >([]);

  const [logs, setLogs] = useState<AuditLog[]>([]);

  const [settings, setSettings] =
    useState<SettingsRecord | null>(null);

  const [loadingProducts, setLoadingProducts] =
    useState(true);

  const [loadingOrders, setLoadingOrders] =
    useState(true);

  const [loadingLogs, setLoadingLogs] =
    useState(true);

  const [loadingSettings, setLoadingSettings] =
    useState(true);

  const [dashboardError, setDashboardError] =
    useState("");

  const [receiptModalOpen, setReceiptModalOpen] =
    useState(false);

  const [receiptsList, setReceiptsList] =
    useState<PendingReceiptItem[]>([]);

  /* =======================================================
     Date / Time
  ======================================================= */

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();

      setCurrentTime(
        now.toLocaleTimeString("fa-IR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );

      setCurrentDate(
        now.toLocaleDateString("fa-IR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      );
    };

    updateDateTime();

    const intervalId =
      window.setInterval(
        updateDateTime,
        1000,
      );

    return () =>
      window.clearInterval(intervalId);
  }, []);

  /* =======================================================
     Load Gold Rates
  ======================================================= */

  const loadGoldRates = useCallback(
    async () => {
      try {
        setIsLoadingGoldRates(true);

        const records =
          await pb
            .collection("gold_rates")
            .getFullList<GoldRateRecord>({
              requestKey: null,
            });

        const validRecords =
          records.filter((record) =>
            GOLD_SYMBOLS.includes(
              record.symbol,
            ),
          );

        const sortedRecords =
          [...validRecords].sort(
            (a, b) => {
              return (
                GOLD_SYMBOLS.indexOf(
                  a.symbol,
                ) -
                GOLD_SYMBOLS.indexOf(
                  b.symbol,
                )
              );
            },
          );

        setGoldRates(
          sortedRecords.map(
            toGoldRateItem,
          ),
        );
      } catch (error) {
        console.error(
          "خطا در دریافت نرخ طلا:",
          error,
        );

        setGoldRates([]);
      } finally {
        setIsLoadingGoldRates(false);
      }
    },
    [],
  );

  /* =======================================================
     Load Products
  ======================================================= */

  const loadProducts =
    useCallback(async () => {
      try {
        setLoadingProducts(true);

        const records =
          await pb
            .collection("products")
            .getFullList<ProductRecord>({
              sort: "-created",
              requestKey: null,
            });

        setProducts(records);
      } catch (error) {
        console.error(
          "خطا در دریافت محصولات:",
          error,
        );

        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    }, []);

  /* =======================================================
     Load Orders
  ======================================================= */

  const loadOrders =
    useCallback(async () => {
      try {
        setLoadingOrders(true);

        const records =
          await pb
            .collection("orders")
            .getFullList<OrderRecord>({
              sort: "-created",
              expand: "user,product",
              requestKey: null,
            });

        setAllOrders(records);

        setOrders(
          records.slice(0, 10),
        );
      } catch (error) {
        console.error(
          "خطا در دریافت سفارش‌ها:",
          error,
        );

        setAllOrders([]);
        setOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    }, []);

  /* =======================================================
     Load Settings
  ======================================================= */

  const loadSettings =
    useCallback(async () => {
      try {
        setLoadingSettings(true);

        const records =
          await pb
            .collection("settings")
            .getFullList<SettingsRecord>({
              requestKey: null,
            });

        if (records.length > 0) {
          const sorted =
            [...records].sort(
              (a, b) =>
                String(b.id).localeCompare(
                  String(a.id),
                ),
            );

          setSettings(sorted[0]);
        } else {
          setSettings(null);
        }
      } catch (error) {
        console.error(
          "خطا در دریافت تنظیمات:",
          error,
        );

        setSettings(null);
      } finally {
        setLoadingSettings(false);
      }
    }, []);

  /* =======================================================
     Load Logs
  ======================================================= */

  const loadLogs =
    useCallback(async () => {
      try {
        setLoadingLogs(true);

        const token =
          pb.authStore.token;

        if (!token) {
          setLogs([]);
          return;
        }

        const response =
          await fetch(
            "/api/admin/logs?page=1&perPage=8",
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              cache: "no-store",
            },
          );

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`,
          );
        }

        const data =
          await response.json();

        if (
          data?.success &&
          Array.isArray(
            data.items,
          )
        ) {
          setLogs(data.items);
        } else {
          setLogs([]);
        }
      } catch (error) {
        console.error(
          "خطا در دریافت لاگ‌ها:",
          error,
        );

        setLogs([]);
      } finally {
        setLoadingLogs(false);
      }
    }, []);

  /* =======================================================
     Initial Load
  ======================================================= */

  const loadDashboard =
    useCallback(async () => {
      setDashboardError("");

      await Promise.allSettled([
        loadGoldRates(),
        loadProducts(),
        loadOrders(),
        loadSettings(),
        loadLogs(),
      ]);
    }, [
      loadGoldRates,
      loadProducts,
      loadOrders,
      loadSettings,
      loadLogs,
    ]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* =======================================================
     Refresh Gold
  ======================================================= */

  const handleRefreshGoldRates =
    async () => {
      if (isRefreshingRate) return;

      try {
        setIsRefreshingRate(true);
        setDashboardError("");

        const response =
          await fetch(
            "/api/sync-gold",
            {
              method: "GET",
              cache: "no-store",
            },
          );

        let data: any = null;

        try {
          data =
            await response.json();
        } catch {
          throw new Error(
            "پاسخ نامعتبر از سرور دریافت شد.",
          );
        }

        if (
          !response.ok ||
          !data?.success
        ) {
          throw new Error(
            data?.error ||
              "بروزرسانی نرخ طلا انجام نشد.",
          );
        }

        await loadGoldRates();
        await loadLogs();
      } catch (error) {
        console.error(
          "خطا در بروزرسانی نرخ طلا:",
          error,
        );

        setDashboardError(
          error instanceof Error
            ? error.message
            : "بروزرسانی نرخ طلا انجام نشد.",
        );
      } finally {
        setIsRefreshingRate(false);
      }
    };

  /* =======================================================
     Calculated Stats
  ======================================================= */

  const stats = useMemo<DashboardStats>(() => {
    const now = new Date();

    const todayOrders =
      allOrders.filter((order) =>
        isSameDay(
          order.created,
          now,
        ),
      );

    const monthlyOrders =
      allOrders.filter((order) =>
        isSameMonth(
          order.created,
          now,
        ),
      );

    const validSalesOrders =
      allOrders.filter(
        (order) =>
          !isCancelledOrder(
            order,
          ),
      );

    const todaySales =
      todayOrders
        .filter(
          (order) =>
            !isCancelledOrder(
              order,
            ),
        )
        .reduce(
          (sum, order) =>
            sum +
            (Number(
              order.total_price,
            ) || 0),
          0,
        );

    const monthlySales =
      monthlyOrders
        .filter(
          (order) =>
            !isCancelledOrder(
              order,
            ),
        )
        .reduce(
          (sum, order) =>
            sum +
            (Number(
              order.total_price,
            ) || 0),
          0,
        );

    const totalSales =
      validSalesOrders.reduce(
        (sum, order) =>
          sum +
          (Number(
            order.total_price,
          ) || 0),
        0,
      );

    const todayWeight =
      todayOrders
        .filter(
          (order) =>
            !isCancelledOrder(
              order,
            ),
        )
        .reduce(
          (sum, order) =>
            sum +
            (Number(
              order.weight,
            ) || 0),
          0,
        );

    const monthlyWeight =
      monthlyOrders
        .filter(
          (order) =>
            !isCancelledOrder(
              order,
            ),
        )
        .reduce(
          (sum, order) =>
            sum +
            (Number(
              order.weight,
            ) || 0),
          0,
        );

    const totalGoldWeight =
      products.reduce(
        (sum, product) => {
          const weight =
            Number(
              product.weight,
            ) || 0;

          const stock =
            Number(
              product.stock,
            ) || 0;

          return (
            sum +
            weight *
              Math.max(
                stock,
                0,
              )
          );
        },
        0,
      );

    const lowStockCount =
      products.filter(
        (product) => {
          const stock =
            Number(
              product.stock,
            ) || 0;

          return stock <= 2;
        },
      ).length;

    const activeOrders =
      allOrders.filter(
        isActiveOrder,
      ).length;

    return {
      todaySales,
      monthlySales,
      totalSales,
      todayWeight,
      monthlyWeight,
      totalGoldWeight,
      productCount:
        products.length,
      lowStockCount,
      activeOrders,
      todayOrders:
        todayOrders.length,
      monthlyOrders:
        monthlyOrders.length,
    };
  }, [
    allOrders,
    products,
  ]);

  /* =======================================================
     Pending Receipts
  ======================================================= */

  const pendingReceiptOrders =
    useMemo(() => {
      return allOrders.filter(
        isReceiptPending,
      );
    }, [allOrders]);

  useEffect(() => {
    const mapped =
      pendingReceiptOrders.map(
        (order) => ({
          id: order.id,
          orderId: order.id,
          invoiceNumber:
            order.invoice_number ||
            `#${order.id.slice(
              0,
              7,
            )}`,
          customerName:
            order.customer_name ||
            order.expand?.user
              ?.name ||
            "مشتری مهمان",
          phone:
            order.customer_phone ||
            order.expand?.user
              ?.phone ||
            "—",
          amount: formatMoney(
            Number(
              order.total_price,
            ) || 0,
          ),
          bankName:
            "ثبت‌شده در سفارش",
          trackingCode:
            order.tracking_code ||
            "—",
          dateTime:
            formatDateTime(
              order.created,
            ),
        }),
      );

    setReceiptsList(mapped);
  }, [pendingReceiptOrders]);

  /* =======================================================
     Alerts
  ======================================================= */

  const alerts = useMemo<SystemAlert[]>(() => {
    const result: SystemAlert[] = [];

    if (
      settings?.maintenanceMode
    ) {
      result.push({
        id: "maintenance",
        title:
          "حالت تعمیرات فعال است",
        message:
          "فروشگاه در حالت تعمیرات قرار دارد و ممکن است ثبت سفارش برای کاربران غیرفعال باشد.",
        type: "danger",
        time: "اکنون",
        actionHref:
          "/dashboard/settings",
        actionText:
          "مشاهده تنظیمات",
      });
    }

    if (
      settings &&
      settings.allowNewOrders ===
        false
    ) {
      result.push({
        id: "orders-disabled",
        title:
          "ثبت سفارش غیرفعال است",
        message:
          "در تنظیمات سیستم، ثبت سفارش جدید غیرفعال شده است.",
        type: "warning",
        time: "اکنون",
        actionHref:
          "/dashboard/settings",
        actionText:
          "تنظیمات سفارش",
      });
    }

    if (
      stats.lowStockCount >
      0
    ) {
      result.push({
        id: "low-stock",
        title:
          "موجودی بعضی کالاها کم است",
        message: `${formatNumber(
          stats.lowStockCount,
        )} کالا موجودی صفر، یک یا دو عدد دارد و نیازمند بررسی است.`,
        type: "warning",
        time: "اکنون",
        actionHref:
          "/dashboard/products",
        actionText:
          "بررسی موجودی",
      });
    }

    if (
      pendingReceiptOrders.length >
      0
    ) {
      const receiptTotal =
        pendingReceiptOrders.reduce(
          (sum, order) =>
            sum +
            (Number(
              order.total_price,
            ) || 0),
          0,
        );

      result.push({
        id: "pending-receipts",
        title:
          "سفارش نیازمند تایید فیش بانکی",
        message: `${formatNumber(
          pendingReceiptOrders.length,
        )} سفارش با مجموع ${formatMoney(
          receiptTotal,
        )} در انتظار بررسی هستند.`,
        type: "info",
        time: "اکنون",
        actionText:
          "بررسی و تایید فیش",
        isReceiptModalTrigger:
          true,
      });
    }

    if (
      stats.lowStockCount ===
        0 &&
      pendingReceiptOrders.length ===
        0 &&
      !settings?.maintenanceMode &&
      settings?.allowNewOrders !==
        false
    ) {
      result.push({
        id: "system-ok",
        title:
          "وضعیت سیستم عادی است",
        message:
          "مورد فوری برای اقدام در داشبورد شناسایی نشده است.",
        type: "info",
        time: "اکنون",
      });
    }

    return result;
  }, [
    settings,
    stats,
    pendingReceiptOrders,
  ]);

  /* =======================================================
     Weekly Sales
  ======================================================= */

  const salesTrendData =
    useMemo<SalesTrendPoint[]>(() => {
      const days =
        getLastSevenDays();

      const values =
        days.map((day) => {
          const dayOrders =
            allOrders.filter(
              (order) =>
                isSameDay(
                  order.created,
                  day,
                ) &&
                !isCancelledOrder(
                  order,
                ),
            );

          const rial =
            dayOrders.reduce(
              (sum, order) =>
                sum +
                (Number(
                  order.total_price,
                ) || 0),
              0,
            );

          const gram =
            dayOrders.reduce(
              (sum, order) =>
                sum +
                (Number(
                  order.weight,
                ) || 0),
              0,
            );

          return {
            day:
              getDayLabel(day),
            rial,
            gram,
          };
        });

      const maxRial =
        Math.max(
          ...values.map(
            (item) => item.rial,
          ),
          1,
        );

      const maxGram =
        Math.max(
          ...values.map(
            (item) => item.gram,
          ),
          1,
        );

      return values.map(
        (item) => ({
          day: item.day,
          rialHeight: `${Math.max(
            4,
            (item.rial /
              maxRial) *
              100,
          )}%`,
          gramHeight: `${Math.max(
            4,
            (item.gram /
              maxGram) *
              100,
          )}%`,
          displayRial:
            item.rial > 0
              ? `${formatNumber(
                  item.rial /
                    1_000_000,
                  1,
                )} م`
              : "۰ م",
          displayGram:
            item.gram > 0
              ? `${formatNumber(
                  item.gram,
                  1,
                )} گرم`
              : "۰ گرم",
        }),
      );
    }, [allOrders]);

  const weeklyTotals =
    useMemo(() => {
      const days =
        getLastSevenDays();

      let rial = 0;
      let gram = 0;

      for (const day of days) {
        const dayOrders =
          allOrders.filter(
            (order) =>
              isSameDay(
                order.created,
                day,
              ) &&
              !isCancelledOrder(
                order,
              ),
          );

        rial +=
          dayOrders.reduce(
            (sum, order) =>
              sum +
              (Number(
                order.total_price,
              ) || 0),
            0,
          );

        gram +=
          dayOrders.reduce(
            (sum, order) =>
              sum +
              (Number(
                order.weight,
              ) || 0),
            0,
          );
      }

      return {
        rial,
        gram,
      };
    }, [allOrders]);

  /* =======================================================
     Recent Products
  ======================================================= */

  const visibleProducts =
    useMemo(() => {
      return products
        .slice()
        .sort((a, b) =>
          String(
            b.created || "",
          ).localeCompare(
            String(
              a.created || "",
            ),
          ),
        )
        .slice(0, 4);
    }, [products]);

  /* =======================================================
     Order Status
  ======================================================= */

  const getOrderStatusStyle = (
    status?: string,
  ) => {
    switch (status) {
      case "در انتظار تایید فیش":
      case "در انتظار تأیید فیش":
        return "border-rose-200 bg-rose-50 text-rose-700";

      case "در حال ساخت/آماده‌سازی":
        return "border-amber-200 bg-amber-50 text-amber-700";

      case "آماده ارسال":
      case "ارسال‌شده":
      case "ارسال شده":
        return "border-blue-200 bg-blue-50 text-blue-700";

      case "تحویل شده":
      case "تحویل‌شده":
      case "تکمیل شده":
      case "تکمیل‌شده":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";

      case "لغو شده":
      case "لغو‌شده":
        return "border-rose-200 bg-rose-50 text-rose-700";

      default:
        return "border-[#1C3324]/15 bg-white text-[#3A5A46]";
    }
  };

  /* =======================================================
     Receipt Actions
  ======================================================= */

  const handleApproveReceipt =
    (receiptId: string) => {
      setReceiptsList((prev) =>
        prev.filter(
          (item) =>
            item.id !==
            receiptId,
        ),
      );
    };

  const handleDeclineReceipt =
    (receiptId: string) => {
      setReceiptsList((prev) =>
        prev.filter(
          (item) =>
            item.id !==
            receiptId,
        ),
      );
    };

  /* =======================================================
     Log Helpers
  ======================================================= */

  const getLogIcon = (
    level?: AuditLog["level"],
  ) => {
    switch (level) {
      case "error":
        return (
          <X className="h-3.5 w-3.5 text-rose-500" />
        );

      case "warning":
        return (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        );

      default:
        return (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        );
    }
  };

  /* =======================================================
     Render
  ======================================================= */

  return (
    <main
      dir="rtl"
      className="min-h-screen space-y-7 bg-white p-4 text-[#1C3324] font-sans sm:p-6 md:p-8"
    >
      {/* ===================================================
          Header
      =================================================== */}

      <header
        className={`${panelClass} flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-center lg:p-6`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />

            <span className="text-xs font-bold text-[#8B263E]">
              پنل جامع معاملات و ویترین طلا · سروین استودیو
            </span>
          </div>

          <h1 className="mt-1.5 text-2xl font-black text-[#1C3324] sm:text-3xl">
            پیشخوان مرکزی مدیریت
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-[#1C3324]/15 bg-white px-3.5 py-2 text-xs font-bold text-[#3A5A46]">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[#8B263E]" />

              <span>
                {currentDate ||
                  "در حال دریافت..."}
              </span>
            </div>

            <div className="h-3 w-px bg-[#1C3324]/15" />

            <div className="flex items-center gap-1.5 font-mono text-sm">
              <Clock className="h-4 w-4 text-[#8B263E]" />

              <span>
                {currentTime ||
                  "۰۰:۰۰:۰۰"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ===================================================
          Dashboard Error
      =================================================== */}

      {dashboardError && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

          <div>
            <div className="font-black">
              خطا در بروزرسانی
            </div>

            <div className="mt-1 font-medium">
              {dashboardError}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          Live Gold Rates
      =================================================== */}

      <section
        className={`${panelClass} p-5`}
      >
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#8B263E]/10 text-[#8B263E]">
              <Coins className="h-4 w-4" />
            </div>

            <div>
              <h2 className="text-sm font-extrabold text-[#1C3324]">
                مظنه لحظه‌ای بازار طلا و سکه
              </h2>

              <p className="text-[11px] text-[#3A5A46]">
                نرخ‌های واقعی دریافت‌شده از BRS API
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={
                handleRefreshGoldRates
              }
              disabled={
                isRefreshingRate
              }
              className={`flex items-center gap-1.5 rounded-xl border border-[#1C3324]/15 bg-white px-3 py-1.5 text-xs font-bold text-[#1C3324] transition hover:bg-[#1C3324]/5 disabled:cursor-not-allowed ${
                isRefreshingRate
                  ? "animate-pulse opacity-70"
                  : ""
              }`}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  isRefreshingRate
                    ? "animate-spin"
                    : ""
                }`}
              />

              <span>
                {isRefreshingRate
                  ? "بروزرسانی..."
                  : "بروزرسانی نرخ"}
              </span>
            </button>

            <Link
              href="/dashboard/gold-rate"
              className="flex items-center gap-1 rounded-xl bg-[#1C3324] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#8B263E]"
            >
              <span>
                تنظیم نرخ پایه سایت
              </span>

              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {isLoadingGoldRates ? (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-2xl border border-[#1C3324]/10 bg-white"
              />
            ))}
          </div>
        ) : goldRates.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-xs text-amber-800">
            <Coins className="mx-auto mb-2 h-6 w-6" />

            <div className="font-bold">
              هنوز نرخ واقعی در سیستم ثبت نشده است.
            </div>

            <div className="mt-1">
              دکمه «بروزرسانی نرخ» را بزنید.
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
                ].includes(
                  rate.symbol,
                ),
              )
              .map((rate) => {
                const isUp =
                  rate.changeType ===
                  "up";

                const isNeutral =
                  rate.changeType ===
                  "neutral";

                const changeColor =
                  isNeutral
                    ? "bg-zinc-100 text-zinc-600"
                    : isUp
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700";

                const valueColor =
                  isNeutral
                    ? "text-zinc-600"
                    : isUp
                    ? "text-emerald-600"
                    : "text-rose-600";

                return (
                  <Link
                    key={
                      rate.id
                    }
                    href="/dashboard/gold-rate"
                    className="group relative block overflow-hidden rounded-2xl border border-[#1C3324]/15 bg-white p-4 transition hover:-translate-y-1 hover:border-[#8B263E] hover:bg-white hover:shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#3A5A46]">
                        {rate.title}
                      </span>

                      <div
                        className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${changeColor}`}
                      >
                        {isNeutral ? null : isUp ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}

                        <span>
                          {rate.change}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-baseline justify-between gap-2">
                      <span className="text-lg font-black text-[#1C3324]">
                        {rate.price}
                      </span>

                      <span className="text-[10px] font-medium text-[#3A5A46]">
                        {rate.unit}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-[#3A5A46]">
                      <span>
                        تغییر روزانه:
                      </span>

                      <span
                        className={`font-mono text-[10px] font-bold ${valueColor}`}
                      >
                        {rate.changeValue}
                      </span>
                    </div>
                  </Link>
                );
              })}
          </div>
        )}
      </section>

      {/* ===================================================
          Smart Alerts
      =================================================== */}

      {alerts.length > 0 && (
        <section className="space-y-2.5">
          {alerts.map(
            (alert) => {
              const isDanger =
                alert.type ===
                "danger";

              const isWarning =
                alert.type ===
                "warning";

              const alertClass =
                isDanger
                  ? "border-rose-300 bg-rose-50/80 text-rose-900"
                  : isWarning
                  ? "border-amber-300 bg-amber-50/80 text-amber-900"
                  : "border-blue-300 bg-blue-50/80 text-blue-900";

              const iconClass =
                isDanger
                  ? "bg-rose-100 text-rose-700"
                  : isWarning
                  ? "bg-amber-100 text-amber-700"
                  : "bg-blue-100 text-blue-700";

              const actionClass =
                isDanger
                  ? "bg-rose-600 hover:bg-rose-700"
                  : isWarning
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-blue-600 hover:bg-blue-700";

              return (
                <div
                  key={
                    alert.id
                  }
                  className={`flex flex-col gap-4 rounded-2xl border p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between ${alertClass}`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black">
                          {
                            alert.title
                          }
                        </span>

                        <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold">
                          {
                            alert.time
                          }
                        </span>
                      </div>

                      <p className="mt-1 text-xs leading-5 opacity-90">
                        {
                          alert.message
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {alert.isReceiptModalTrigger ? (
                      <button
                        type="button"
                        onClick={() =>
                          setReceiptModalOpen(
                            true,
                          )
                        }
                        className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-black text-white transition ${actionClass}`}
                      >
                        {
                          alert.actionText
                        }
                      </button>
                    ) : alert.actionHref ? (
                      <Link
                        href={
                          alert.actionHref
                        }
                        className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-black text-white transition ${actionClass}`}
                      >
                        {
                          alert.actionText
                        }
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            },
          )}
        </section>
      )}

      {/* ===================================================
          Main Stats
      =================================================== */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Sales */}

        <Link
          href="/dashboard/invoices"
          className={`${panelClass} group flex flex-col justify-between p-5 hover:-translate-y-1 hover:border-[#8B263E] hover:shadow-xs`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#3A5A46]">
              فروش امروز
            </span>

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E] transition group-hover:scale-110">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-xl font-black text-[#1C3324] sm:text-2xl">
              {formatNumber(
                stats.todaySales,
              )}{" "}
              <span className="text-xs font-bold text-[#3A5A46]">
                تومان
              </span>
            </div>

            <div className="mt-1.5 flex items-center justify-between border-t border-[#1C3324]/10 pt-2 text-xs">
              <span className="text-[#3A5A46]">
                {formatNumber(
                  stats.todayOrders,
                )}{" "}
                سفارش امروز
              </span>

              <span className="flex items-center font-bold text-[#8B263E]">
                گزارش فروش
                <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </Link>

        {/* Monthly Sales */}

        <Link
          href="/dashboard/invoices"
          className={`${panelClass} group flex flex-col justify-between p-5 hover:-translate-y-1 hover:border-[#8B263E] hover:shadow-xs`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#3A5A46]">
              فروش ماه جاری
            </span>

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 transition group-hover:scale-110">
              <Banknote className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-xl font-black text-emerald-700 sm:text-2xl">
              {formatNumber(
                stats.monthlySales,
              )}{" "}
              <span className="text-xs font-bold text-[#3A5A46]">
                تومان
              </span>
            </div>

            <div className="mt-1.5 flex items-center justify-between border-t border-[#1C3324]/10 pt-2 text-xs">
              <span className="text-[#3A5A46]">
                {formatNumber(
                  stats.monthlyWeight,
                  2,
                )}{" "}
                گرم فروش
              </span>

              <span className="font-bold text-emerald-700">
                {formatNumber(
                  stats.monthlyOrders,
                )}{" "}
                سفارش
              </span>
            </div>
          </div>
        </Link>

        {/* Inventory */}

        <Link
          href="/dashboard/products"
          className={`${panelClass} group flex flex-col justify-between p-5 hover:-translate-y-1 hover:border-[#8B263E] hover:shadow-xs`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#3A5A46]">
              موجودی کل انبار و ویترین
            </span>

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1C3324]/10 text-[#1C3324] transition group-hover:scale-110">
              <Scale className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-xl font-black text-[#1C3324] sm:text-2xl">
              {formatNumber(
                stats.totalGoldWeight,
                2,
              )}{" "}
              <span className="text-xs font-bold text-[#3A5A46]">
                گرم طلا
              </span>
            </div>

            <div className="mt-1.5 flex items-center justify-between border-t border-[#1C3324]/10 pt-2 text-xs">
              <span className="text-[#3A5A46]">
                {formatNumber(
                  stats.productCount,
                )}{" "}
                کالا
              </span>

              <span className="font-bold text-[#8B263E]">
                {formatNumber(
                  stats.lowStockCount,
                )}{" "}
                کم‌موجودی
              </span>
            </div>
          </div>
        </Link>

        {/* Active Orders */}

        <Link
          href="/dashboard/orders"
          className={`${panelClass} group flex flex-col justify-between p-5 hover:-translate-y-1 hover:border-[#8B263E] hover:shadow-xs`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#3A5A46]">
              سفارش‌های باز و در جریان
            </span>

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8B263E]/10 text-[#8B263E] transition group-hover:scale-110">
              <PackageOpen className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-xl font-black text-[#1C3324] sm:text-2xl">
              {formatNumber(
                stats.activeOrders,
              )}{" "}
              <span className="text-xs font-bold text-[#8B263E]">
                سفارش فعال
              </span>
            </div>

            <div className="mt-1.5 flex items-center justify-between border-t border-[#1C3324]/10 pt-2 text-xs">
              <span className="text-[#3A5A46]">
                نیازمند اقدام
              </span>

              <span className="flex items-center font-bold text-[#8B263E]">
                مدیریت سفارش‌ها
                <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* ===================================================
          Quick Actions
      =================================================== */}

      <section
        className={`${panelClass} p-5`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#8B263E]" />

            <h2 className="text-sm font-extrabold text-[#1C3324]">
              عملیات و دسترسی‌های سریع
            </h2>
          </div>

          <span className="text-xs text-[#3A5A46]">
            میانبرهای پرکاربرد
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {actionItems.map(
            (item) => {
              const Icon =
                item.icon;

              return (
                <Link
                  key={
                    item.href
                  }
                  href={
                    item.href
                  }
                  className={`group flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition hover:-translate-y-0.5 ${item.color}`}
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-xs transition group-hover:scale-105 ${item.iconColor}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <span className="text-xs font-black text-[#1C3324]">
                    {
                      item.title
                    }
                  </span>
                </Link>
              );
            },
          )}
        </div>
      </section>

      {/* ===================================================
          Weekly Chart + Products
      =================================================== */}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Weekly Sales */}

        <div
          className={`${panelClass} p-6 lg:col-span-7`}
        >
          <div className="flex flex-col justify-between gap-3 border-b border-[#1C3324]/10 pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-extrabold text-[#1C3324]">
                روند هفتگی فروش ریالی و گرمی
              </h2>

              <p className="mt-0.5 text-xs text-[#3A5A46]">
                بر اساس سفارش‌های واقعی ثبت‌شده در سیستم
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-[#1C3324]" />

                <span className="text-[#3A5A46]">
                  ارزش ریالی
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-[#8B263E]" />

                <span className="text-[#3A5A46]">
                  وزن کل
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex h-64 items-end justify-between gap-2 px-2 sm:gap-4">
            {salesTrendData.map(
              (item, index) => (
                <div
                  key={`${item.day}-${index}`}
                  className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                >
                  <div className="flex h-full w-full items-end justify-center gap-1 sm:gap-1.5">
                    <div
                      title={`فروش ریالی: ${item.displayRial}`}
                      className="w-full max-w-[16px] rounded-t-lg bg-[#1C3324] transition-all duration-300 group-hover:brightness-110"
                      style={{
                        height:
                          item.rialHeight,
                      }}
                    />

                    <div
                      title={`فروش وزنی: ${item.displayGram}`}
                      className="w-full max-w-[16px] rounded-t-lg bg-[#8B263E] transition-all duration-300 group-hover:brightness-110"
                      style={{
                        height:
                          item.gramHeight,
                      }}
                    />
                  </div>

                  <span className="max-w-full truncate text-[10px] font-bold text-[#3A5A46] sm:text-[11px]">
                    {item.day}
                  </span>
                </div>
              ),
            )}
          </div>

          <div className="mt-4 flex flex-col items-start justify-between gap-2 rounded-2xl bg-white p-3 text-xs border border-[#1C3324]/10 sm:flex-row sm:items-center">
            <span className="text-[#3A5A46]">
              مجموع فروش ۷ روز اخیر:
            </span>

            <div className="flex flex-wrap items-center gap-3 font-bold text-[#1C3324]">
              <span>
                {formatMoney(
                  weeklyTotals.rial,
                )}
              </span>

              <span className="text-[#8B263E]">
                {formatWeight(
                  weeklyTotals.gram,
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Products */}

        <div
          className={`${panelClass} p-6 lg:col-span-5`}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-[#1C3324]">
                ویترین آنلاین طلا
              </h2>

              <p className="mt-0.5 text-xs text-[#3A5A46]">
                آخرین محصولات ثبت‌شده در پایگاه داده
              </p>
            </div>

            <Link
              href="/dashboard/products"
              className="text-xs font-bold text-[#8B263E] hover:underline"
            >
              مدیریت ویترین
            </Link>
          </div>

          <div className="space-y-3">
            {loadingProducts ? (
              <div className="py-12 text-center text-xs text-[#3A5A46]">
                در حال بارگذاری اقلام ویترین از پاکت‌بیس...
              </div>
            ) : visibleProducts.length ===
              0 ? (
              <div className="py-12 text-center text-xs text-[#3A5A46]">
                هنوز محصولی در پاکت‌بیس ثبت نشده است.
              </div>
            ) : (
              visibleProducts.map(
                (product) => (
                  <div
                    key={
                      product.id
                    }
                    className="flex items-center justify-between rounded-2xl border border-[#1C3324]/10 bg-white p-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1C3324] text-white shadow-xs">
                        <Sparkles className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-xs font-bold text-[#1C3324]">
                          {
                            product.name
                          }
                        </h3>

                        <span className="text-[10px] text-[#3A5A46]">
                          وزن:{" "}
                          <span className="font-mono font-bold text-[#8B263E]">
                            {product.weight ??
                              "—"}
                          </span>{" "}
                          گرم | اجرت:{" "}
                          <span className="font-mono font-bold">
                            {product.wage ??
                              0}
                            ٪
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-left">
                      <span
                        className={`inline-block rounded-lg px-2 py-0.5 text-[10px] font-extrabold ${
                          Number(
                            product.stock,
                          ) > 0
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {Number(
                          product.stock,
                        ) > 0
                          ? `${formatNumber(
                              Number(
                                product.stock,
                              ),
                            )} در انبار`
                          : "اتمام موجودی"}
                      </span>
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        </div>
      </section>

      {/* ===================================================
          Recent Orders
      =================================================== */}

      <section
        className={`${panelClass} p-6`}
      >
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-extrabold text-[#1C3324]">
              آخرین سفارش‌های ثبت‌شده
            </h2>

            <p className="mt-0.5 text-xs text-[#3A5A46]">
              واکشی زنده فاکتورها، مبالغ و وضعیت پردازش سفارشات از پاکت‌بیس
            </p>
          </div>

          <Link
            href="/dashboard/orders"
            className="flex items-center gap-1 text-xs font-bold text-[#8B263E] hover:underline"
          >
            <span>
              مشاهده تمام سفارش‌ها
            </span>

            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-right text-xs">
            <thead>
              <tr className="border-b border-[#1C3324]/10 text-[#3A5A46]">
                <th className="pb-3 pr-2 font-bold">
                  شماره فاکتور
                </th>

                <th className="pb-3 font-bold">
                  مشتری
                </th>

                <th className="pb-3 font-bold">
                  شرح سفارش
                </th>

                <th className="pb-3 font-bold">
                  وزن طلا
                </th>

                <th className="pb-3 font-bold">
                  مبلغ کل
                </th>

                <th className="pb-3 font-bold">
                  وضعیت
                </th>

                <th className="pb-3 pl-2 text-left font-bold">
                  عملیات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#1C3324]/5">
              {loadingOrders ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-[#3A5A46]"
                  >
                    در حال واکشی سفارش‌ها از دیتابیس...
                  </td>
                </tr>
              ) : orders.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-[#3A5A46]"
                  >
                    هنوز سفارشی در سیستم ثبت نشده است.
                  </td>
                </tr>
              ) : (
                orders.map(
                  (order) => (
                    <tr
                      key={
                        order.id
                      }
                      className="transition hover:bg-zinc-50"
                    >
                      <td className="py-3.5 pr-2 font-mono font-bold text-[#8B263E]">
                        {order.invoice_number ||
                          `#${order.id.slice(
                            0,
                            7,
                          )}`}
                      </td>

                      <td className="py-3.5">
                        <div className="font-bold text-[#1C3324]">
                          {order.customer_name ||
                            order.expand
                              ?.user
                              ?.name ||
                            "مشتری مهمان"}
                        </div>

                        <div className="font-mono text-[10px] text-[#3A5A46]">
                          {order.customer_phone ||
                            order.expand
                              ?.user
                              ?.phone ||
                            "—"}
                        </div>
                      </td>

                      <td className="py-3.5 text-[#1C3324]">
                        {order.title ||
                          order.expand
                            ?.product
                            ?.name ||
                          "خرید طلا"}
                      </td>

                      <td className="py-3.5">
                        <span className="font-mono font-bold text-[#8B263E]">
                          {order.weight
                            ? `${formatNumber(
                                Number(
                                  order.weight,
                                ),
                                2,
                              )} گرم`
                            : "—"}
                        </span>
                      </td>

                      <td className="py-3.5 font-bold text-[#1C3324]">
                        {order.total_price
                          ? formatMoney(
                              Number(
                                order.total_price,
                              ),
                            )
                          : "۰ تومان"}
                      </td>

                      <td className="py-3.5">
                        <span
                          className={`inline-block rounded-lg border px-2.5 py-1 text-[10px] font-extrabold ${getOrderStatusStyle(
                            order.status,
                          )}`}
                        >
                          {order.status ||
                            "ثبت اولیه"}
                        </span>
                      </td>

                      <td className="py-3.5 pl-2 text-left">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#1C3324]/15 bg-white px-2.5 py-1 text-[11px] font-bold text-[#1C3324] transition hover:bg-[#1C3324]/5"
                        >
                          <Eye className="h-3 w-3" />

                          <span>
                            بررسی
                          </span>
                        </Link>
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===================================================
          Recent Logs + System Status
      =================================================== */}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Logs */}

        <div
          className={`${panelClass} p-6 lg:col-span-7`}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-[#1C3324]">
                آخرین فعالیت‌های سیستم
              </h2>

              <p className="mt-0.5 text-xs text-[#3A5A46]">
                فعالیت‌های ثبت‌شده در Audit Log
              </p>
            </div>

            <Link
              href="/dashboard/logs"
              className="flex items-center gap-1 text-xs font-bold text-[#8B263E] hover:underline"
            >
              مشاهده همه
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loadingLogs ? (
            <div className="py-10 text-center text-xs text-[#3A5A46]">
              در حال دریافت فعالیت‌ها...
            </div>
          ) : logs.length ===
            0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ScrollText className="mb-2 h-8 w-8 text-[#1C3324]/40" />

              <span className="text-xs text-[#3A5A46]">
                هنوز فعالیتی در لاگ سیستم ثبت نشده است.
              </span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {logs
                .slice(0, 6)
                .map((log) => (
                  <div
                    key={
                      log.id
                    }
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[#1C3324]/10 bg-white px-3.5 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white border border-[#1C3324]/10">
                        {getLogIcon(
                          log.level,
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-[#1C3324]">
                          {log.title ||
                            log.logCode ||
                            "رویداد سیستم"}
                        </div>

                        <div className="mt-0.5 truncate text-[10px] text-[#3A5A46]">
                          {log.description ||
                            log.operator ||
                            "—"}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-left">
                      <div className="font-mono text-[9px] font-bold text-[#8B263E]">
                        {log.logCode ||
                          "LOG"}
                      </div>

                      <div className="mt-0.5 text-[9px] text-[#3A5A46]">
                        {formatDateTime(
                          log.created ||
                            log.timestamp,
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* System Status */}

        <div
          className={`${panelClass} p-6 lg:col-span-5`}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-[#1C3324]">
                وضعیت سیستم
              </h2>

              <p className="mt-0.5 text-xs text-[#3A5A46]">
                وضعیت سرویس‌های اصلی فروشگاه
              </p>
            </div>

            <Settings2 className="h-5 w-5 text-[#8B263E]" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-[#1C3324]/10 bg-white p-3.5">
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    goldRates.length >
                    0
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                  }`}
                />

                <span className="text-xs font-bold text-[#1C3324]">
                  نرخ بازار طلا
                </span>
              </div>

              <span
                className={`text-[10px] font-black ${
                  goldRates.length >
                  0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {goldRates.length >
                0
                  ? "فعال"
                  : "نیازمند بروزرسانی"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[#1C3324]/10 bg-white p-3.5">
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    settings
                      ?.allowNewOrders !==
                    false
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                  }`}
                />

                <span className="text-xs font-bold text-[#1C3324]">
                  ثبت سفارش
                </span>
              </div>

              <span
                className={`text-[10px] font-black ${
                  settings
                    ?.allowNewOrders !==
                  false
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {settings
                  ?.allowNewOrders !==
                false
                  ? "فعال"
                  : "غیرفعال"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[#1C3324]/10 bg-white p-3.5">
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    settings
                      ?.allowUserRegistration !==
                    false
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                  }`}
                />

                <span className="text-xs font-bold text-[#1C3324]">
                  ثبت‌نام کاربران
                </span>
              </div>

              <span
                className={`text-[10px] font-black ${
                  settings
                    ?.allowUserRegistration !==
                  false
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {settings
                  ?.allowUserRegistration !==
                false
                  ? "فعال"
                  : "غیرفعال"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[#1C3324]/10 bg-white p-3.5">
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    settings
                      ?.maintenanceMode
                      ? "bg-rose-500"
                      : "bg-emerald-500"
                  }`}
                />

                <span className="text-xs font-bold text-[#1C3324]">
                  حالت تعمیرات
                </span>
              </div>

              <span
                className={`text-[10px] font-black ${
                  settings
                    ?.maintenanceMode
                    ? "text-rose-600"
                    : "text-emerald-600"
                }`}
              >
                {settings
                  ?.maintenanceMode
                  ? "فعال"
                  : "خاموش"}
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-[#1C3324]/15 bg-white p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#3A5A46]">
                  حاشیه سود پیش‌فرض
                </span>

                <span className="font-mono text-sm font-black text-[#8B263E]">
                  {formatNumber(
                    Number(
                      settings?.profitMargin ||
                        0,
                    ),
                    2,
                  )}
                  ٪
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#3A5A46]">
                  اجرت پیش‌فرض
                </span>

                <span className="font-mono text-xs font-bold text-[#1C3324]">
                  {formatNumber(
                    Number(
                      settings?.defaultWagePercent ||
                        0,
                    ),
                    2,
                  )}
                  ٪
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          Receipt Modal
      =================================================== */}

      {receiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-[#1C3324]/20 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1C3324]/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <CheckCircle2 className="h-4 w-4" />
                </div>

                <div>
                  <h3 className="text-sm font-black text-[#1C3324]">
                    فیش‌های بانکی منتظر تایید
                  </h3>

                  <p className="text-[10px] text-[#3A5A46]">
                    {
                      receiptsList.length
                    }{" "}
                    فیش واریزی در صف بررسی
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setReceiptModalOpen(
                    false,
                  )
                }
                className="rounded-lg p-1 text-[#3A5A46] hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
              {receiptsList.length ===
              0 ? (
                <div className="py-8 text-center text-xs text-[#3A5A46]">
                  هیچ فیشی در انتظار تایید نیست.
                </div>
              ) : (
                receiptsList.map(
                  (rec) => (
                    <div
                      key={
                        rec.id
                      }
                      className="rounded-2xl border border-[#1C3324]/10 bg-white p-4 text-xs shadow-xs"
                    >
                      <div className="flex items-center justify-between border-b border-[#1C3324]/10 pb-2">
                        <span className="font-bold text-[#1C3324]">
                          {
                            rec.customerName
                          }
                        </span>

                        <span className="font-mono font-bold text-[#8B263E]">
                          {
                            rec.invoiceNumber
                          }
                        </span>
                      </div>

                      <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] text-[#3A5A46]">
                        <div>
                          مبلغ:{" "}
                          <span className="font-bold text-emerald-600">
                            {
                              rec.amount
                            }
                          </span>
                        </div>

                        <div>
                          تلفن:{" "}
                          <span className="font-mono font-bold">
                            {
                              rec.phone
                            }
                          </span>
                        </div>

                        <div>
                          بانک:{" "}
                          <span className="font-bold">
                            {
                              rec.bankName
                            }
                          </span>
                        </div>

                        <div>
                          زمان:{" "}
                          <span className="font-bold">
                            {
                              rec.dateTime
                            }
                          </span>
                        </div>

                        <div className="col-span-2">
                          کد پیگیری:{" "}
                          <span className="font-mono font-bold text-[#1C3324]">
                            {
                              rec.trackingCode
                            }
                          </span>
                        </div>
                      </div>

                      <div className="mt-3.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleApproveReceipt(
                              rec.id,
                            )
                          }
                          className="flex-1 rounded-xl bg-emerald-600 py-1.5 text-xs font-black text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
                        >
                          تایید و ثبت فاکتور
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeclineReceipt(
                              rec.id,
                            )
                          }
                          className="flex-1 rounded-xl border border-rose-200 bg-rose-50 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100 cursor-pointer"
                        >
                          رد فیش
                        </button>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}