"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  Scale,
  ArrowUpRight,
  Filter,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Coins,
  ShieldCheck,
  Receipt,
  Gem,
  Sparkles,
  PieChart,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Layers,
  Percent,
  CalendarDays,
  CalendarRange,
  Flame,
  Award,
  AlertTriangle,
  TrendingDown,
  XCircle,
  HelpCircle,
  CreditCard,
  Wallet,
  Banknote,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import { Card } from "@/components/ui/card";
import { pb } from "@/lib/pocketbase";

interface OrderItem {
  productTitle?: string;
  weight?: number;
  colour?: string;
  totalPrice?: number;
  goldPricePerGram?: number;
  isInstallment?: boolean;
  installmentNumber?: number;
  installmentTotalCount?: number;
}

interface OrderRecord {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  shippingFullName?: string;
  items?: OrderItem[];
  discount?: string | number;
  created: string;
}

interface InvoiceItem {
  title?: string;
  weight?: number;
  wagePercent?: number;
  wageToman?: number;
  profitPercent?: number;
  profitToman?: number;
  taxToman?: number;
  stonePrice?: number;
  totalPrice?: number;
}

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  totalWeight: number;
  goldRate: number;
  wageAmount: number;
  profitAmount: number;
  taxAmount: number;
  discount: number;
  paymentStatus: string;
  customerName?: string;
  items?: InvoiceItem[];
  created: string;
}

interface GoldRateRecord {
  symbol: string;
  price: number;
}

const formatNumber = (num: number): string => {
  return Math.round(num).toLocaleString("fa-IR");
};

// ماه‌های استاندارد تقویم شمسی
const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export default function DashboardReportsPage() {
  // تب نمای گزارش: کلی | روزانه | ماهیانه | سالیانه
  const [reportView, setReportView] = useState<"overview" | "daily" | "monthly" | "yearly">("overview");
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month" | "year" | "all">("month");

  // فیلتر وضعیت سود و زیان معاملات: همه | دارای سود | دارای زیان (فروش زیر قیمت)
  const [profitFilter, setProfitFilter] = useState<"all" | "profit" | "loss">("all");

  // فیلتر روش فروش: همه روش‌ها | فروش نقدی | فروش اقساطی
  const [saleTypeFilter, setSaleTypeFilter] = useState<"all" | "cash" | "installment">("all");

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [goldRate18K, setGoldRate18K] = useState<number>(25658600);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showLossDetails, setShowLossDetails] = useState(false);

  // دریافت داده‌ها از پاکت‌بیس
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const [orderRes, invoiceRes, ratesRes] = await Promise.all([
        pb.collection("orders").getFullList<OrderRecord>({
          sort: "-created",
          requestKey: null,
        }),
        pb.collection("invoices").getFullList<InvoiceRecord>({
          sort: "-created",
          requestKey: null,
        }),
        pb.collection("gold_rates").getFullList<GoldRateRecord>({
          requestKey: null,
        }),
      ]);

      setOrders(orderRes);
      setInvoices(invoiceRes);

      const rate18 = ratesRes.find((r) => r.symbol === "IR_GOLD_18K");
      if (rate18 && Number(rate18.price) > 0) {
        setGoldRate18K(Number(rate18.price));
      }
    } catch (error) {
      console.error("Error loading reports data:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  /**
   * تابع تخصصی محاسبه سود و زیان (P&L) سفارشات:
   * بهای تمام‌شده پایه = ارزش طلای خام + اجرت ساخت کارگاه
   * اگر مبلغ دریافتی کمتر از بهای تمام‌شده یا دارای تخفیف مازاد باشد -> ضرر (زیان) ثبت می‌شود.
   */
  const computeOrderFinances = useCallback(
    (order: OrderRecord) => {
      const amount = Number(order.totalAmount) || 0;
      const discount = Number(order.discount) || 0;
      if (amount <= 0) {
        return {
          rawGold: 0,
          wage: 0,
          profit: 0,
          tax: 0,
          weight: 0,
          costBasis: 0,
          isLoss: false,
          lossAmount: 0,
        };
      }

      let totalWeight = 0;
      let itemsProfit = 0;
      let itemsWage = 0;
      let itemsRaw = 0;
      let itemsTax = 0;
      let hasValidItems = false;

      if (Array.isArray(order.items) && order.items.length > 0) {
        for (const item of order.items) {
          const w = Number(item.weight) || 0;
          const rate = Number(item.goldPricePerGram) || goldRate18K;
          const itemPrice = Number(item.totalPrice) || 0;
          totalWeight += w;

          if (w > 0 && rate > 0 && itemPrice > 0) {
            hasValidItems = true;
            const raw = w * rate;
            if (itemPrice > raw) {
              const markup = itemPrice - raw;
              const wage = Math.max(((markup / 1.09) - 0.07 * raw) / 1.07, 0);
              const profit = (raw + wage) * 0.07;
              const tax = (wage + profit) * 0.09;
              itemsRaw += raw;
              itemsWage += wage;
              itemsProfit += profit;
              itemsTax += tax;
            } else {
              // در صورت فروش زیر قیمت طلای خام
              const raw = w * rate;
              const wage = raw * 0.095;
              const costBasis = raw + wage;
              const loss = itemPrice - costBasis; // منفی
              itemsRaw += raw;
              itemsWage += wage;
              itemsProfit += loss; // ضرر
              itemsTax += 0;
            }
          }
        }
      }

      if (hasValidItems) {
        let netProfit = itemsProfit - discount;
        const costBasis = itemsRaw + itemsWage;
        if (amount < costBasis) {
          netProfit = amount - costBasis; // ضرر قطعی
        }
        const isLoss = netProfit < 0;

        return {
          rawGold: Math.round(itemsRaw),
          wage: Math.round(itemsWage),
          profit: Math.round(netProfit),
          tax: Math.round(itemsTax),
          weight: totalWeight,
          costBasis: Math.round(costBasis),
          isLoss,
          lossAmount: isLoss ? Math.abs(Math.round(netProfit)) : 0,
        };
      }

      // در صورت نبود اقلام جزئی، بر مبنای استاندارد صنف محاسبه کن
      const rawFraction = amount / 1.18;
      const wage = rawFraction * 0.095;
      const nominalProfit = (rawFraction + wage) * 0.07;
      let netProfit = nominalProfit - discount;
      const costBasis = rawFraction + wage;

      if (amount < costBasis) {
        netProfit = amount - costBasis;
      }
      const isLoss = netProfit < 0;

      return {
        rawGold: Math.round(rawFraction),
        wage: Math.round(wage),
        profit: Math.round(netProfit),
        tax: Math.round((wage + nominalProfit) * 0.09),
        weight: totalWeight,
        costBasis: Math.round(costBasis),
        isLoss,
        lossAmount: isLoss ? Math.abs(Math.round(netProfit)) : 0,
      };
    },
    [goldRate18K]
  );

  /**
   * تابع تخصصی محاسبه سود و زیان (P&L) فاکتورهای رسمی:
   * کسر تخفیف‌ها از سود و شناسایی موارد فروش زیر بهای تمام‌شده
   */
  const computeInvoiceFinances = useCallback(
    (inv: InvoiceRecord) => {
      const amount = Number(inv.totalAmount) || Number(inv.paidAmount) || 0;
      const weight = Number(inv.totalWeight) || 0;
      const discount = Number(inv.discount) || 0;

      const savedProfit = Number(inv.profitAmount) || 0;
      const savedWage = Number(inv.wageAmount) || 0;
      const savedTax = Number(inv.taxAmount) || 0;

      const rate = Number(inv.goldRate) || goldRate18K;
      const rawGold = weight > 0 ? weight * rate : amount / 1.18;
      const wage = savedWage > 0 ? savedWage : rawGold * 0.095;
      const costBasis = rawGold + wage;

      let netProfit = 0;
      if (savedProfit > 0) {
        netProfit = savedProfit - discount;
      } else {
        const nominalProfit = costBasis * 0.07;
        netProfit = nominalProfit - discount;
      }

      // اگر مبلغ فاکتور کمتر از بهای تمام‌شده طلا و اجرت باشد
      if (amount > 0 && amount < costBasis) {
        netProfit = amount - costBasis; // ضرر مستقیم
      }

      const isLoss = netProfit < 0;

      return {
        rawGold: Math.round(rawGold),
        wage: Math.round(wage),
        profit: Math.round(netProfit),
        tax: Math.round(savedTax > 0 ? savedTax : (wage + Math.max(netProfit, 0)) * 0.09),
        weight,
        costBasis: Math.round(costBasis),
        isLoss,
        lossAmount: isLoss ? Math.abs(Math.round(netProfit)) : 0,
      };
    },
    [goldRate18K]
  );

  // فیلتر کردن زمانی برای حالت نمای کلی (Overview)
  const filteredData = useMemo(() => {
    const now = new Date();
    let cutoff: Date | null = null;

    if (timeRange === "today") {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeRange === "week") {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === "month") {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeRange === "year") {
      cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    const isAfterCutoff = (dateStr?: string) => {
      if (!cutoff) return true;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return !isNaN(d.getTime()) && d >= cutoff;
    };

    const validOrders = orders.filter((o) => isAfterCutoff(o.created));
    const validInvoices = invoices.filter((i) => isAfterCutoff(i.created));

    return { orders: validOrders, invoices: validInvoices };
  }, [orders, invoices, timeRange]);

  // محاسبات تجمیعی دوره‌ای با پشتیبانی از تفکیک سود و ضرر
  const periodicAggregations = useMemo(() => {
    const dailyMap: Record<
      string,
      {
        dayKey: string;
        dayFa: string;
        weekday: string;
        sales: number;
        profit: number;
        grossProfits: number;
        losses: number;
        lossCount: number;
        wage: number;
        tax: number;
        rawGold: number;
        weight: number;
        count: number;
      }
    > = {};

    const monthlyMap: Record<
      string,
      {
        monthKey: string;
        monthName: string;
        yearFa: string;
        sales: number;
        profit: number;
        grossProfits: number;
        losses: number;
        lossCount: number;
        wage: number;
        tax: number;
        rawGold: number;
        weight: number;
        count: number;
      }
    > = {};

    const yearlyMap: Record<
      string,
      {
        yearKey: string;
        yearFa: string;
        sales: number;
        profit: number;
        grossProfits: number;
        losses: number;
        lossCount: number;
        wage: number;
        tax: number;
        rawGold: number;
        weight: number;
        count: number;
        monthlyMap: Record<string, { sales: number; profit: number; weight: number; isLoss: boolean }>;
      }
    > = {};

    const addItemToMaps = (
      dateStr: string,
      amount: number,
      finances: {
        rawGold: number;
        wage: number;
        profit: number;
        tax: number;
        weight: number;
        isLoss: boolean;
        lossAmount: number;
      }
    ) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;

      const dayKey = d.toISOString().split("T")[0];
      const dayFa = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(d);
      const weekday = new Intl.DateTimeFormat("fa-IR", { weekday: "long" }).format(d);
      const monthName = new Intl.DateTimeFormat("fa-IR", { month: "long" }).format(d);
      const yearFa = new Intl.DateTimeFormat("fa-IR", { year: "numeric" }).format(d);

      const monthKey = `${monthName} ${yearFa}`;
      const yearKey = `سال ${yearFa}`;

      const posProfit = finances.profit > 0 ? finances.profit : 0;
      const lossAmt = finances.isLoss ? finances.lossAmount : 0;

      // ۱. تجمیع روزانه
      if (!dailyMap[dayKey]) {
        dailyMap[dayKey] = {
          dayKey,
          dayFa,
          weekday,
          sales: 0,
          profit: 0,
          grossProfits: 0,
          losses: 0,
          lossCount: 0,
          wage: 0,
          tax: 0,
          rawGold: 0,
          weight: 0,
          count: 0,
        };
      }
      dailyMap[dayKey].sales += amount;
      dailyMap[dayKey].profit += finances.profit;
      dailyMap[dayKey].grossProfits += posProfit;
      dailyMap[dayKey].losses += lossAmt;
      if (finances.isLoss) dailyMap[dayKey].lossCount += 1;
      dailyMap[dayKey].wage += finances.wage;
      dailyMap[dayKey].tax += finances.tax;
      dailyMap[dayKey].rawGold += finances.rawGold;
      dailyMap[dayKey].weight += finances.weight;
      dailyMap[dayKey].count += 1;

      // ۲. تجمیع ماهیانه
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          monthKey,
          monthName,
          yearFa,
          sales: 0,
          profit: 0,
          grossProfits: 0,
          losses: 0,
          lossCount: 0,
          wage: 0,
          tax: 0,
          rawGold: 0,
          weight: 0,
          count: 0,
        };
      }
      monthlyMap[monthKey].sales += amount;
      monthlyMap[monthKey].profit += finances.profit;
      monthlyMap[monthKey].grossProfits += posProfit;
      monthlyMap[monthKey].losses += lossAmt;
      if (finances.isLoss) monthlyMap[monthKey].lossCount += 1;
      monthlyMap[monthKey].wage += finances.wage;
      monthlyMap[monthKey].tax += finances.tax;
      monthlyMap[monthKey].rawGold += finances.rawGold;
      monthlyMap[monthKey].weight += finances.weight;
      monthlyMap[monthKey].count += 1;

      // ۳. تجمیع سالیانه
      if (!yearlyMap[yearKey]) {
        yearlyMap[yearKey] = {
          yearKey,
          yearFa,
          sales: 0,
          profit: 0,
          grossProfits: 0,
          losses: 0,
          lossCount: 0,
          wage: 0,
          tax: 0,
          rawGold: 0,
          weight: 0,
          count: 0,
          monthlyMap: {},
        };
      }
      yearlyMap[yearKey].sales += amount;
      yearlyMap[yearKey].profit += finances.profit;
      yearlyMap[yearKey].grossProfits += posProfit;
      yearlyMap[yearKey].losses += lossAmt;
      if (finances.isLoss) yearlyMap[yearKey].lossCount += 1;
      yearlyMap[yearKey].wage += finances.wage;
      yearlyMap[yearKey].tax += finances.tax;
      yearlyMap[yearKey].rawGold += finances.rawGold;
      yearlyMap[yearKey].weight += finances.weight;
      yearlyMap[yearKey].count += 1;

      if (!yearlyMap[yearKey].monthlyMap[monthName]) {
        yearlyMap[yearKey].monthlyMap[monthName] = { sales: 0, profit: 0, weight: 0, isLoss: false };
      }
      yearlyMap[yearKey].monthlyMap[monthName].sales += amount;
      yearlyMap[yearKey].monthlyMap[monthName].profit += finances.profit;
      yearlyMap[yearKey].monthlyMap[monthName].weight += finances.weight;
      if (finances.isLoss) yearlyMap[yearKey].monthlyMap[monthName].isLoss = true;
    };

    // پردازش تمام فاکتورها
    for (const inv of invoices) {
      if (inv.paymentStatus === "paid" || Number(inv.paidAmount) > 0) {
        const amount = Number(inv.totalAmount) || Number(inv.paidAmount) || 0;
        const finances = computeInvoiceFinances(inv);
        addItemToMaps(inv.created, amount, finances);
      }
    }

    // پردازش تمام سفارشات
    for (const ord of orders) {
      if (ord.paymentStatus === "paid" || ord.status === "delivered") {
        const amount = Number(ord.totalAmount) || 0;
        const finances = computeOrderFinances(ord);
        addItemToMaps(ord.created, amount, finances);
      }
    }

    const dailyList = Object.values(dailyMap).sort(
      (a, b) => new Date(b.dayKey).getTime() - new Date(a.dayKey).getTime()
    );

    const monthlyList = Object.values(monthlyMap);
    const yearlyList = Object.values(yearlyMap);

    const todayKey = new Date().toISOString().split("T")[0];
    const todayStats = dailyMap[todayKey] || {
      dayKey: todayKey,
      dayFa: "امروز",
      weekday: new Intl.DateTimeFormat("fa-IR", { weekday: "long" }).format(new Date()),
      sales: 0,
      profit: 0,
      grossProfits: 0,
      losses: 0,
      lossCount: 0,
      wage: 0,
      tax: 0,
      rawGold: 0,
      weight: 0,
      count: 0,
    };

    const peakDay =
      dailyList.length > 0 ? [...dailyList].sort((a, b) => b.sales - a.sales)[0] : null;

    const currentMonthName = new Intl.DateTimeFormat("fa-IR", { month: "long" }).format(new Date());
    const currentYearFa = new Intl.DateTimeFormat("fa-IR", { year: "numeric" }).format(new Date());
    const currentMonthKey = `${currentMonthName} ${currentYearFa}`;
    const currentMonthStats = monthlyMap[currentMonthKey] || {
      monthKey: currentMonthKey,
      monthName: currentMonthName,
      yearFa: currentYearFa,
      sales: 0,
      profit: 0,
      grossProfits: 0,
      losses: 0,
      lossCount: 0,
      wage: 0,
      tax: 0,
      rawGold: 0,
      weight: 0,
      count: 0,
    };

    return {
      dailyList,
      monthlyList,
      yearlyList,
      todayStats,
      peakDay,
      currentMonthStats,
    };
  }, [orders, invoices, computeOrderFinances, computeInvoiceFinances]);

  // محاسبات مالی نمای کلی (Overview) با تفکیک سود و ضرر و فروش اقساطی
  const metrics = useMemo(() => {
    let totalGrossSales = 0;
    let totalGoldWeight = 0;
    let totalGalleryNetProfit = 0;
    let totalGrossProfitsOnly = 0;
    let totalLossesOnly = 0;
    let lossCount = 0;
    let profitableCount = 0;
    let breakEvenCount = 0;

    let totalWorkshopWages = 0;
    let totalVatTax = 0;
    let totalRawGold = 0;
    let totalDiscounts = 0;
    let successfulTransactionsCount = 0;

    // شاخص‌های تفکیکی فروش نقدی و اقساطی
    let installmentSales = 0;
    let installmentWeight = 0;
    let installmentProfit = 0;
    let installmentCount = 0;
    let installmentCommitment = 0;

    let cashSales = 0;
    let cashWeight = 0;
    let cashProfit = 0;
    let cashCount = 0;

    const colorsCount = {
      yellow: 0,
      white: 0,
      rose: 0,
      twotone: 0,
    };

    let deliveredCount = 0;
    let customMakingCount = 0;

    const transactionsList: Array<{
      id: string;
      code: string;
      type: "order" | "invoice";
      customer: string;
      weight: number;
      amount: number;
      profit: number;
      isLoss: boolean;
      lossAmount: number;
      tax: number;
      wage: number;
      costBasis: number;
      date: string;
      status: string;
      isInstallment: boolean;
      installmentLabel: string;
    }> = [];

    const productSalesMap: Record<
      string,
      { title: string; count: number; weight: number; revenue: number }
    > = {};

    // فاکتورهای رسمی در بازه فیلترشده
    for (const inv of filteredData.invoices) {
      if (inv.paymentStatus === "paid" || Number(inv.paidAmount) > 0) {
        successfulTransactionsCount++;
        const amount = Number(inv.totalAmount) || Number(inv.paidAmount) || 0;
        const finances = computeInvoiceFinances(inv);

        totalGrossSales += amount;
        totalGoldWeight += finances.weight;
        totalGalleryNetProfit += finances.profit;
        if (finances.isLoss) {
          totalLossesOnly += finances.lossAmount;
          lossCount++;
        } else if (finances.profit > 0) {
          totalGrossProfitsOnly += finances.profit;
          profitableCount++;
        } else {
          breakEvenCount++;
        }

        totalWorkshopWages += finances.wage;
        totalVatTax += finances.tax;
        totalRawGold += finances.rawGold;
        totalDiscounts += Number(inv.discount) || 0;

        const isInvoiceInstallment = inv.paymentStatus === "partial";
        if (isInvoiceInstallment) {
          installmentSales += amount;
          installmentWeight += finances.weight;
          installmentProfit += finances.profit;
          installmentCount++;
          const remaining = Math.max((Number(inv.totalAmount) || 0) - (Number(inv.paidAmount) || amount), 0);
          installmentCommitment += remaining;
        } else {
          cashSales += amount;
          cashWeight += finances.weight;
          cashProfit += finances.profit;
          cashCount++;
        }

        if (Array.isArray(inv.items)) {
          for (const item of inv.items) {
            const itemWeight = Number(item.weight) || 0;
            const title = item.title || "طلای سفارشی";
            if (!productSalesMap[title]) {
              productSalesMap[title] = { title, count: 0, weight: 0, revenue: 0 };
            }
            productSalesMap[title].count += 1;
            productSalesMap[title].weight += itemWeight;
            productSalesMap[title].revenue += Number(item.totalPrice) || 0;

            if (title.includes("زرد") || title.includes("Yellow")) colorsCount.yellow += itemWeight;
            else if (title.includes("سفید") || title.includes("White")) colorsCount.white += itemWeight;
            else if (title.includes("رز") || title.includes("Rose")) colorsCount.rose += itemWeight;
            else colorsCount.twotone += itemWeight;
          }
        }

        transactionsList.push({
          id: inv.id,
          code: inv.invoiceNumber || `INV-${inv.id.slice(0, 6)}`,
          type: "invoice",
          customer: inv.customerName || "مشتری فاکتور",
          weight: finances.weight,
          amount,
          profit: finances.profit,
          isLoss: finances.isLoss,
          lossAmount: finances.lossAmount,
          wage: finances.wage,
          tax: finances.tax,
          costBasis: finances.costBasis,
          date: inv.created,
          status: isInvoiceInstallment ? "بیعانه / اقساطی" : "پرداخت‌شده",
          isInstallment: isInvoiceInstallment,
          installmentLabel: isInvoiceInstallment ? "اقساطی (بیعانه)" : "نقدی",
        });
      }
    }

    // سفارشات آنلاین در بازه فیلترشده
    for (const ord of filteredData.orders) {
      if (ord.paymentStatus === "paid" || ord.status === "delivered") {
        successfulTransactionsCount++;
        const amount = Number(ord.totalAmount) || 0;
        const finances = computeOrderFinances(ord);

        totalGrossSales += amount;
        totalGoldWeight += finances.weight;
        totalGalleryNetProfit += finances.profit;
        if (finances.isLoss) {
          totalLossesOnly += finances.lossAmount;
          lossCount++;
        } else if (finances.profit > 0) {
          totalGrossProfitsOnly += finances.profit;
          profitableCount++;
        } else {
          breakEvenCount++;
        }

        totalWorkshopWages += finances.wage;
        totalVatTax += finances.tax;
        totalRawGold += finances.rawGold;
        totalDiscounts += Number(ord.discount) || 0;

        if (ord.status === "delivered") deliveredCount++;
        else customMakingCount++;

        const isOrderInstallment = Boolean(
          Array.isArray(ord.items) && ord.items.some((it) => it.isInstallment === true)
        );
        const installmentItem = ord.items?.find((it) => it.isInstallment);
        const installmentNumber = installmentItem?.installmentNumber || 1;
        const installmentTotalCount = installmentItem?.installmentTotalCount || 3;

        if (isOrderInstallment) {
          installmentSales += amount;
          installmentWeight += finances.weight;
          installmentProfit += finances.profit;
          installmentCount++;
          const remainingParts = Math.max(installmentTotalCount - installmentNumber, 0);
          installmentCommitment += amount * remainingParts;
        } else {
          cashSales += amount;
          cashWeight += finances.weight;
          cashProfit += finances.profit;
          cashCount++;
        }

        if (Array.isArray(ord.items)) {
          for (const item of ord.items) {
            const w = Number(item.weight) || 0;
            const title = item.productTitle || "کارتیه و زیورآلات";
            if (!productSalesMap[title]) {
              productSalesMap[title] = { title, count: 0, weight: 0, revenue: 0 };
            }
            productSalesMap[title].count += 1;
            productSalesMap[title].weight += w;
            productSalesMap[title].revenue += Number(item.totalPrice) || amount;

            const c = (item.colour || "").trim();
            if (c.includes("زرد") || c.includes("طلایی") || c.includes("Yellow")) {
              colorsCount.yellow += w;
            } else if (c.includes("سفید") || c.includes("White")) {
              colorsCount.white += w;
            } else if (c.includes("رز") || c.includes("Rose")) {
              colorsCount.rose += w;
            } else {
              colorsCount.twotone += w;
            }
          }
        }

        transactionsList.push({
          id: ord.id,
          code: ord.orderNumber || `ORD-${ord.id.slice(0, 6)}`,
          type: "order",
          customer: ord.shippingFullName || "خریدار آنلاین",
          weight: finances.weight,
          amount,
          profit: finances.profit,
          isLoss: finances.isLoss,
          lossAmount: finances.lossAmount,
          wage: finances.wage,
          tax: finances.tax,
          costBasis: finances.costBasis,
          date: ord.created,
          status: ord.status === "delivered" ? "تحویل مشتری" : "آماده‌سازی",
          isInstallment: isOrderInstallment,
          installmentLabel: isOrderInstallment
            ? `اقساطی (قسط ${installmentNumber} از ${installmentTotalCount})`
            : "نقدی",
        });
      }
    }

    const totalColorWeight =
      colorsCount.yellow + colorsCount.white + colorsCount.rose + colorsCount.twotone || 1;
    const colorPercentages = {
      yellow: Math.round((colorsCount.yellow / totalColorWeight) * 100),
      white: Math.round((colorsCount.white / totalColorWeight) * 100),
      rose: Math.round((colorsCount.rose / totalColorWeight) * 100),
      twotone: Math.round((colorsCount.twotone / totalColorWeight) * 100),
    };

    const totalFulfillment = deliveredCount + customMakingCount || 1;
    const deliveredPercent = Math.round((deliveredCount / totalFulfillment) * 100);
    const customPercent = Math.round((customMakingCount / totalFulfillment) * 100);

    const averageOrderValue =
      successfulTransactionsCount > 0
        ? Math.round(totalGrossSales / successfulTransactionsCount)
        : 0;

    const profitMarginPercent =
      totalGrossSales > 0 ? ((totalGalleryNetProfit / totalGrossSales) * 100).toFixed(1) : "۰.۰";

    const profitPerGram =
      totalGoldWeight > 0 ? Math.round(totalGalleryNetProfit / totalGoldWeight) : 0;

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // فیلتر کردن معاملات اخیر بر مبنای profitFilter و saleTypeFilter
    const filteredTransactions = transactionsList
      .filter((tx) => {
        // فیلتر روش فروش: همه | نقدی | اقساطی
        if (saleTypeFilter === "cash" && tx.isInstallment) return false;
        if (saleTypeFilter === "installment" && !tx.isInstallment) return false;

        // فیلتر وضعیت سود و زیان: همه | دارای سود | دارای زیان
        if (profitFilter === "profit") return tx.profit > 0;
        if (profitFilter === "loss") return tx.isLoss;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      totalGrossSales,
      totalGoldWeight,
      totalGalleryNetProfit,
      totalGrossProfitsOnly,
      totalLossesOnly,
      lossCount,
      profitableCount,
      breakEvenCount,
      totalWorkshopWages,
      totalVatTax,
      totalRawGold,
      totalDiscounts,
      successfulTransactionsCount,
      averageOrderValue,
      profitMarginPercent,
      profitPerGram,
      colorPercentages,
      colorsCount,
      deliveredPercent,
      customPercent,
      topProducts,
      installmentSales,
      installmentWeight,
      installmentProfit,
      installmentCount,
      installmentCommitment,
      cashSales,
      cashWeight,
      cashProfit,
      cashCount,
      installmentSharePercent:
        totalGrossSales > 0 ? ((installmentSales / totalGrossSales) * 100).toFixed(1) : "۰.۰",
      cashSharePercent:
        totalGrossSales > 0 ? ((cashSales / totalGrossSales) * 100).toFixed(1) : "۰.۰",
      recentTransactions: filteredTransactions,
      allTransactionsList: transactionsList,
    };
  }, [filteredData, profitFilter, saleTypeFilter, computeInvoiceFinances, computeOrderFinances]);

  // لیست اختصاصی معاملات دارای زیان جهت نمایش آنی در پنل هشدار
  const lossTransactions = useMemo(() => {
    return metrics.allTransactionsList.filter((tx) => tx.isLoss);
  }, [metrics.allTransactionsList]);

  // خروجی اکسل چند تب با جزئیات کامل سود و ضرر
  const handleExcelExport = () => {
    try {
      const wb = XLSX.utils.book_new();

      // شیت ۱: شاخص‌های کلیدی
      const summaryData = [
        { شاخص: "نمای گزارش", مقدار: reportView === "daily" ? "روزانه" : reportView === "monthly" ? "ماهیانه" : reportView === "yearly" ? "سالیانه" : "نمای کلی" },
        { شاخص: "سود/زیان خالص نهایی گالری", مقدار: `${formatNumber(metrics.totalGalleryNetProfit)} تومان` },
        { شاخص: "مجموع سود معاملات مثبت", مقدار: `+${formatNumber(metrics.totalGrossProfitsOnly)} تومان` },
        { شاخص: "مجموع زیان معاملات منفی (ضرر)", مقدار: `−${formatNumber(metrics.totalLossesOnly)} تومان` },
        { شاخص: "تعداد معاملات دارای زیان (فروش زیر قیمت/تخفیف مازاد)", مقدار: `${metrics.lossCount} معامله` },
        { شاخص: "تعداد معاملات دارای سود", مقدار: `${metrics.profitableCount} معامله` },
        { شاخص: "مجموع فروش کل ناخالص", مقدار: `${formatNumber(metrics.totalGrossSales)} تومان` },
        { شاخص: "مجموع فروش نقدی طلا", مقدار: `${formatNumber(metrics.cashSales)} تومان (${metrics.cashSharePercent}٪)` },
        { شاخص: "مجموع وصولی فروش اقساطی", مقدار: `${formatNumber(metrics.installmentSales)} تومان (${metrics.installmentSharePercent}٪)` },
        { شاخص: "سود گالری از فروش اقساطی", مقدار: `+${formatNumber(metrics.installmentProfit)} تومان` },
        { شاخص: "وزن طلای فروش اقساطی", مقدار: `${metrics.installmentWeight.toFixed(2)} گرم` },
        { شاخص: "مانده تعهدات آتی و طلب اقساط", مقدار: `${formatNumber(metrics.installmentCommitment)} تومان` },
        { شاخص: "تعداد تراکنش‌های اقساطی", مقدار: `${metrics.installmentCount} مورد` },
        { شاخص: "تعداد تراکنش‌های نقدی", مقدار: `${metrics.cashCount} مورد` },
        { شاخص: "ارزش اصل طلای خام (سرمایه)", مقدار: `${formatNumber(metrics.totalRawGold)} تومان` },
        { شاخص: "مجموع اجرت ساخت کارگاه", مقدار: `${formatNumber(metrics.totalWorkshopWages)} تومان` },
        { شاخص: "مالیات بر ارزش افزوده طلا (ماده ۲۶)", مقدار: `${formatNumber(metrics.totalVatTax)} تومان` },
        { شاخص: "وزن کل طلای معامله‌شده", مقدار: `${metrics.totalGoldWeight.toFixed(2)} گرم` },
        { شاخص: "سود به ازای هر گرم طلا", مقدار: `${formatNumber(metrics.profitPerGram)} تومان/گرم` },
        { شاخص: "حاشیه سود خالص", مقدار: `${metrics.profitMarginPercent}٪` },
        { شاخص: "نرخ روز طلای ۱۸ عیار", مقدار: `${formatNumber(goldRate18K)} تومان` },
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "خلاصه سود و زیان (P&L)");

      // شیت ۲: ریز معاملات همراه وضعیت سود/ضرر و شیوه تسویه
      const txSheetData = metrics.allTransactionsList.map((tx) => ({
        "کد معامله": tx.code,
        "نوع": tx.type === "invoice" ? "فاکتور طلا" : "سفارش آنلاین",
        "شیوه تسویه": tx.installmentLabel,
        "خریدار": tx.customer,
        "مبلغ فروش": tx.amount,
        "بهای تمام‌شده (طلا+اجرت)": tx.costBasis,
        "سود / زیان (تومان)": tx.profit,
        "وضعیت سود و زیان": tx.isLoss ? "زیان (ضرر)" : tx.profit > 0 ? "سود" : "سربه‌سر",
        "وزن طلا (گرم)": tx.weight.toFixed(2),
        "تاریخ": new Date(tx.date).toLocaleDateString("fa-IR"),
      }));
      if (txSheetData.length > 0) {
        const wsTx = XLSX.utils.json_to_sheet(txSheetData);
        XLSX.utils.book_append_sheet(wb, wsTx, "ریز معاملات و سود و زیان");
      }

      // شیت ۳: گزارش روزشمار
      const dailySheetData = periodicAggregations.dailyList.map((d) => ({
        "تاریخ": d.dayFa,
        "روز هفته": d.weekday,
        "فروش ناخالص (تومان)": d.sales,
        "سود/زیان خالص (تومان)": d.profit,
        "سود معاملات مثبت": d.grossProfits,
        "زیان معاملات منفی (ضرر)": d.losses,
        "تعداد معاملات دارای زیان": d.lossCount,
        "وزن طلا (گرم)": d.weight.toFixed(2),
        "تعداد معاملات": d.count,
      }));
      if (dailySheetData.length > 0) {
        const wsDaily = XLSX.utils.json_to_sheet(dailySheetData);
        XLSX.utils.book_append_sheet(wb, wsDaily, "گزارش روزشمار");
      }

      XLSX.writeFile(wb, `parnazar-financial-pnl-${reportView}.xlsx`);
    } catch (error) {
      console.error("Excel export error:", error);
      alert("خطا در ایجاد فایل اکسل رخ داد.");
    }
  };

  // خروجی PDF رسمی حسابداری طلا به زبان فارسی
  const handlePDFExport = async () => {
    try {
      setIsExporting(true);
      const reportElement = document.getElementById("persian-pnl-pdf-report");
      if (!reportElement) {
        window.print();
        return;
      }

      // نمایش موقت عنصر جهت تولید بوم با کیفیت و وضوح بالا
      reportElement.style.display = "block";
      reportElement.style.position = "fixed";
      reportElement.style.left = "0px";
      reportElement.style.top = "0px";
      reportElement.style.zIndex = "99999";

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // مخفی‌سازی مجدد پس از ضبط بوم
      reportElement.style.display = "none";
      reportElement.style.position = "static";

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const dateStr = new Intl.DateTimeFormat("fa-IR", { dateStyle: "short" })
        .format(new Date())
        .replace(/\//g, "-");
      pdf.save(`صورت-حسابرسی-سود-و-زیان-پرنا-زر-${dateStr}.pdf`);
    } catch (error) {
      console.error("PDF export error:", error);
      // در صورت بروز هرگونه محدودیت، پرینت مرورگر فعال می‌شود
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* هدر اصلی همراه تب‌های تفکیک گزارش (روزانه / ماهیانه / سالیانه / کلی) */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-[#1C3324]/12 bg-white/80 p-5 shadow-xs backdrop-blur-md transition-colors lg:flex-row lg:items-center lg:p-6 dark:border-white/10 dark:bg-[#15221B]/80">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1C3324] text-white shadow-xs dark:bg-emerald-950/60 dark:text-[#D8B65C] dark:border dark:border-[#D8B65C]/30">
              <BarChart3 className="h-5 w-5" />
            </div>

            <h1 className="text-xl font-black text-[#1C3324] dark:text-zinc-100">
              گزارش‌های فروش و تحلیل سود و زیان طلا (P&L)
            </h1>
          </div>

          <p className="mt-2 text-xs font-medium text-[#3A5A46] dark:text-zinc-400">
            محاسبه دوطرفه سود و زیان (ضررهای ناشی از فروش زیر قیمت یا تخفیف مازاد)، گزارش‌های روزانه، ماهیانه و سالیانه پرنا زر.
          </p>
        </div>

        {/* دکمه‌های ناوبری تب‌های گزارش */}
        <div className="flex flex-wrap items-center gap-2">
          {/* تب‌های اصلی: کلی، روزانه، ماهیانه، سالیانه */}
          <div className="flex items-center rounded-2xl border border-[#1C3324]/12 bg-[#FAF9F6] p-1 shadow-xs dark:border-white/10 dark:bg-[#101813]">
            <button
              type="button"
              onClick={() => setReportView("overview")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition cursor-pointer ${
                reportView === "overview"
                  ? "bg-[#1C3324] text-white shadow-xs dark:bg-[#D8B65C] dark:text-[#101813]"
                  : "text-[#3A5A46] hover:text-[#1C3324] dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <PieChart className="h-3.5 w-3.5" />
              <span>نمای کلی</span>
            </button>

            <button
              type="button"
              onClick={() => setReportView("daily")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition cursor-pointer ${
                reportView === "daily"
                  ? "bg-[#1C3324] text-white shadow-xs dark:bg-[#D8B65C] dark:text-[#101813]"
                  : "text-[#3A5A46] hover:text-[#1C3324] dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>گزارش روزانه</span>
            </button>

            <button
              type="button"
              onClick={() => setReportView("monthly")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition cursor-pointer ${
                reportView === "monthly"
                  ? "bg-[#1C3324] text-white shadow-xs dark:bg-[#D8B65C] dark:text-[#101813]"
                  : "text-[#3A5A46] hover:text-[#1C3324] dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>گزارش ماهیانه</span>
            </button>

            <button
              type="button"
              onClick={() => setReportView("yearly")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition cursor-pointer ${
                reportView === "yearly"
                  ? "bg-[#1C3324] text-white shadow-xs dark:bg-[#D8B65C] dark:text-[#101813]"
                  : "text-[#3A5A46] hover:text-[#1C3324] dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              <span>گزارش سالیانه</span>
            </button>
          </div>

          {/* فیلتر دوره (فقط در نمای کلی) */}
          {reportView === "overview" && (
            <div className="flex items-center gap-2 rounded-2xl border border-[#1C3324]/15 bg-white px-3 py-2 shadow-xs dark:border-white/10 dark:bg-[#101813]">
              <Filter className="h-3.5 w-3.5 text-[#8B263E] dark:text-[#D8B65C]" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-[#1C3324] outline-none cursor-pointer dark:text-zinc-100"
              >
                <option value="today" className="dark:bg-[#101813]">امروز</option>
                <option value="week" className="dark:bg-[#101813]">۷ روز اخیر</option>
                <option value="month" className="dark:bg-[#101813]">۳۰ روز اخیر</option>
                <option value="year" className="dark:bg-[#101813]">سال جاری</option>
                <option value="all" className="dark:bg-[#101813]">همه دوره‌ها</option>
              </select>
            </div>
          )}

          {/* دکمه رفرش */}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#1C3324]/15 bg-white text-[#1C3324] shadow-xs transition hover:border-[#8B263E] hover:text-[#8B263E] cursor-pointer dark:border-white/10 dark:bg-[#101813] dark:text-zinc-300 dark:hover:text-[#D8B65C]"
            title="بروزرسانی داده‌ها"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-[#8B263E] dark:text-[#D8B65C]" : ""}`} />
          </button>

          {/* دکمه‌های خروجی */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExcelExport}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#1C3324] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#8B263E] cursor-pointer dark:bg-emerald-900/80 dark:hover:bg-emerald-800"
              title="خروجی فایل اکسل"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>اکسل</span>
            </button>

            <button
              type="button"
              onClick={handlePDFExport}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-2.5 text-xs font-black text-[#1C3324] shadow-sm transition hover:border-[#8B263E] hover:text-[#8B263E] disabled:opacity-50 cursor-pointer dark:border-white/10 dark:bg-[#101813] dark:text-zinc-200 dark:hover:border-[#D8B65C] dark:hover:text-[#D8B65C]"
              title="خروجی فایل PDF"
            >
              <FileText className="h-4 w-4 text-[#8B263E] dark:text-[#D8B65C]" />
              <span>{isExporting ? "در حال ساخت..." : "PDF"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* هشدار هوشمند ضرر و زیان در صورت وجود معاملات دارای زیان */}
      {metrics.lossCount > 0 && (
        <div id="loss-alert-box" className="rounded-3xl border border-rose-300 bg-rose-50/90 p-5 text-xs font-bold text-rose-900 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-rose-200 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <span className="font-black text-sm">هشدار حسابداری زیان (فروش زیر قیمت پایه طلا یا تخفیف مازاد):</span>{" "}
                <p className="mt-1 font-medium text-rose-800 dark:text-rose-300">
                  در این دوره، تعداد <span className="font-black font-mono underline text-rose-950 dark:text-rose-100">{metrics.lossCount} معامله دارای زیان</span> شناسایی شد (مجموع زیان تحمیل‌شده: <span className="font-black font-mono text-rose-950 dark:text-rose-100">{formatNumber(metrics.totalLossesOnly)} تومان</span>).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const nextState = !showLossDetails;
                  setShowLossDetails(nextState);
                  setReportView("overview");
                  setProfitFilter("loss");
                  setSaleTypeFilter("all");
                  setTimeRange("all");
                  if (nextState) {
                    setTimeout(() => {
                      document.getElementById("loss-items-panel")?.scrollIntoView({ behavior: "smooth" });
                    }, 50);
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-black text-white hover:bg-rose-700 transition cursor-pointer dark:bg-rose-800 dark:hover:bg-rose-700 shadow-xs"
              >
                <span>{showLossDetails ? "بستن لیست ریز اقلام زیان" : "مشاهده اقلام دارای زیان"}</span>
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-mono">
                  {metrics.lossCount}
                </span>
              </button>
            </div>
          </div>

          {/* پنل فوری و کامل نمایش تمام اقلام دارای زیان */}
          {showLossDetails && (
            <div id="loss-items-panel" className="mt-4 rounded-2xl border border-rose-200 bg-white p-4 shadow-md dark:border-rose-900/50 dark:bg-[#121c15] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-100 pb-3 dark:border-rose-900/40">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span className="font-black text-xs text-[#1C3324] dark:text-zinc-100">
                    ریز مشخصات معاملات دارای زیان ({lossTransactions.length} معامله ثبت‌شده):
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById("transactions-table")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="text-[11px] font-bold text-rose-700 hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-100 cursor-pointer underline"
                  >
                    انتقال به جدول انتهای صفحه ↓
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-rose-50/80 text-[11px] font-black text-rose-900 dark:bg-rose-950/60 dark:text-rose-200 border-b border-rose-100 dark:border-rose-900/40">
                    <tr>
                      <th className="px-3 py-2.5">شماره سفارش / کد</th>
                      <th className="px-3 py-2.5">نام مشتری</th>
                      <th className="px-3 py-2.5 text-center">وزن طلا</th>
                      <th className="px-3 py-2.5 text-left">مبلغ دریافتی (فروش)</th>
                      <th className="px-3 py-2.5 text-left">بهای تمام‌شده (طلا+اجرت)</th>
                      <th className="px-3 py-2.5 text-left">میزان ضرر تحمیل‌شده</th>
                      <th className="px-3 py-2.5 text-center">علت حسابداری</th>
                      <th className="px-3 py-2.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100 dark:divide-rose-950/40 font-medium">
                    {lossTransactions.map((tx) => (
                      <tr key={tx.code} className="hover:bg-rose-50/40 dark:hover:bg-rose-950/20">
                        <td className="px-3 py-3 font-mono font-bold text-[#1C3324] dark:text-zinc-100">
                          {tx.code}
                        </td>
                        <td className="px-3 py-3 font-bold text-[#1C3324] dark:text-zinc-200">
                          {tx.customer}
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-amber-700 dark:text-[#D8B65C]">
                          {tx.weight > 0 ? `${tx.weight.toFixed(2)} گرم` : "—"}
                        </td>
                        <td className="px-3 py-3 text-left font-mono font-black text-[#1C3324] dark:text-zinc-100">
                          {formatNumber(tx.amount)} تومان
                        </td>
                        <td className="px-3 py-3 text-left font-mono text-[#3A5A46] dark:text-zinc-400">
                          {formatNumber(tx.costBasis)} تومان
                        </td>
                        <td className="px-3 py-3 text-left font-mono font-black text-rose-600 dark:text-rose-400">
                          −{formatNumber(tx.lossAmount)} تومان
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-900/50 dark:text-rose-200">
                            فروش با نرخ کمتر از بهای طلا
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {tx.type === "order" ? (
                            <Link
                              href={`/dashboard/orders/${tx.id}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-rose-700 transition"
                            >
                              مشاهده سفارش
                            </Link>
                          ) : (
                            <Link
                              href={`/dashboard/invoices/${tx.id}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-rose-700 transition"
                            >
                              مشاهده فاکتور
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          نمای ۱: گزارش روزانه (Daily View)
      ========================================================= */}
      {reportView === "daily" && (
        <div className="space-y-6">
          {/* کارت‌های شاخص روزانه */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardStatCard
              title="فروش امروز (۲۴ ساعت)"
              value={formatNumber(periodicAggregations.todayStats.sales)}
              unit="تومان"
              icon={TrendingUp}
              accent="gold"
              description={`${periodicAggregations.todayStats.count} معامله در تاریخ امروز`}
              isLoading={loading}
            />

            <DashboardStatCard
              title={periodicAggregations.todayStats.profit >= 0 ? "سود خالص امروز" : "زیان خالص امروز (ضرر)"}
              value={formatNumber(Math.abs(periodicAggregations.todayStats.profit))}
              unit="تومان"
              icon={periodicAggregations.todayStats.profit >= 0 ? DollarSign : TrendingDown}
              accent={periodicAggregations.todayStats.profit >= 0 ? "emerald" : "crimson"}
              trendType={periodicAggregations.todayStats.profit >= 0 ? "positive" : "negative"}
              trend={periodicAggregations.todayStats.profit >= 0 ? "دارای سود" : "دارای زیان"}
              description="سود/زیان نهایی معاملات امروز"
              isLoading={loading}
            />

            <DashboardStatCard
              title="وزن طلای فروخته‌شده امروز"
              value={periodicAggregations.todayStats.weight.toFixed(2)}
              unit="گرم"
              icon={Scale}
              accent="crimson"
              description="مجموع طلای ۱۸ عیار تسویه‌شده امروز"
              isLoading={loading}
            />

            <DashboardStatCard
              title="پرفروش‌ترین روز معاملاتی"
              value={periodicAggregations.peakDay ? formatNumber(periodicAggregations.peakDay.sales) : "۰"}
              unit="تومان"
              icon={Flame}
              accent="blue"
              secondaryInfo={{
                label: "تاریخ رکورد",
                value: periodicAggregations.peakDay ? periodicAggregations.peakDay.dayFa : "—",
              }}
              isLoading={loading}
            />
          </div>

          {/* جدول تفکیک روزشمار معاملات و سود و ضرر */}
          <Card className="rounded-3xl border border-[#1C3324]/12 bg-white/80 p-6 shadow-xs backdrop-blur-md space-y-4 dark:border-white/10 dark:bg-[#15221B]/80">
            <div className="flex flex-col justify-between gap-2 border-b border-[#1C3324]/10 pb-4 sm:flex-row sm:items-center dark:border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-[#8B263E] dark:text-[#D8B65C]" />
                  <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                    جدول کارنامه روزشمار فروش، سود و زیان طلا
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
                  تفکیک تمام روزهای فعال به همراه فروش کل، سود یا ضرر خالص سهم گالری، اجرت ساخت، مالیات و وزن طلا
                </p>
              </div>

              <div className="text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                {periodicAggregations.dailyList.length.toLocaleString("fa-IR")} روز معاملاتی ثبت‌شده
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b border-[#1C3324]/10 bg-[#FAF9F6] font-black text-[#1C3324] dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300">
                  <tr>
                    <th className="px-4 py-3">تاریخ روز</th>
                    <th className="px-4 py-3">روز هفته</th>
                    <th className="px-4 py-3 text-center">تعداد معاملات</th>
                    <th className="px-4 py-3 text-center">وزن طلا (گرم)</th>
                    <th className="px-4 py-3 text-left">فروش ناخالص</th>
                    <th className="px-4 py-3 text-left">سود یا زیان خالص</th>
                    <th className="px-4 py-3 text-center">وضعیت روز</th>
                    <th className="px-4 py-3 text-left">سود/زیان هر گرم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C3324]/5 dark:divide-white/5 font-medium">
                  {periodicAggregations.dailyList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-[#3A5A46] dark:text-zinc-400">
                        هنوز معامله‌ای در دیتابیس ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    periodicAggregations.dailyList.map((d) => {
                      const isDayLoss = d.profit < 0;
                      const profitPerG = d.weight > 0 ? Math.round(d.profit / d.weight) : 0;
                      return (
                        <tr key={d.dayKey} className="hover:bg-[#FAF9F6] dark:hover:bg-white/[0.02]">
                          <td className="px-4 py-3.5 font-bold text-[#1C3324] dark:text-zinc-100">
                            {d.dayFa}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex rounded-lg bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-[#3A5A46] dark:bg-zinc-800 dark:text-zinc-300">
                              {d.weekday}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center font-mono">
                            {d.count} معامله
                          </td>
                          <td className="px-4 py-3.5 text-center font-mono font-bold text-amber-700 dark:text-[#D8B65C]">
                            {d.weight > 0 ? `${d.weight.toFixed(2)} گرم` : "—"}
                          </td>
                          <td className="px-4 py-3.5 text-left font-mono font-black text-[#1C3324] dark:text-zinc-100">
                            {formatNumber(d.sales)} تومان
                          </td>
                          <td className="px-4 py-3.5 text-left font-mono font-bold">
                            {isDayLoss ? (
                              <span className="text-rose-600 dark:text-rose-400">
                                −{formatNumber(Math.abs(d.profit))} تومان (زیان)
                              </span>
                            ) : (
                              <span className="text-emerald-700 dark:text-emerald-400">
                                +{formatNumber(d.profit)} تومان
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {isDayLoss ? (
                              <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                                زیان
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                سود
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-left font-mono text-[11px] font-bold">
                            {profitPerG !== 0 ? (
                              <span className={profitPerG < 0 ? "text-rose-600 dark:text-rose-400" : "text-[#8B263E] dark:text-[#D8B65C]"}>
                                {profitPerG < 0 ? "−" : ""}{formatNumber(Math.abs(profitPerG))} ت/گرم
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================
          نمای ۲: گزارش ماهیانه (Monthly View)
      ========================================================= */}
      {reportView === "monthly" && (
        <div className="space-y-6">
          {/* کارت‌های شاخص ماهانه */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardStatCard
              title={`فروش ماه جاری (${periodicAggregations.currentMonthStats.monthName})`}
              value={formatNumber(periodicAggregations.currentMonthStats.sales)}
              unit="تومان"
              icon={TrendingUp}
              accent="gold"
              description={`${periodicAggregations.currentMonthStats.count} معامله در این ماه`}
              isLoading={loading}
            />

            <DashboardStatCard
              title={periodicAggregations.currentMonthStats.profit >= 0 ? "سود خالص ماه جاری" : "زیان خالص ماه جاری"}
              value={formatNumber(Math.abs(periodicAggregations.currentMonthStats.profit))}
              unit="تومان"
              icon={periodicAggregations.currentMonthStats.profit >= 0 ? DollarSign : TrendingDown}
              accent={periodicAggregations.currentMonthStats.profit >= 0 ? "emerald" : "crimson"}
              description="سود/زیان نهایی ماه جاری"
              isLoading={loading}
            />

            <DashboardStatCard
              title="وزن طلای ماه جاری"
              value={periodicAggregations.currentMonthStats.weight.toFixed(2)}
              unit="گرم"
              icon={Scale}
              accent="crimson"
              description="مجموع طلای ۱۸ عیار تحویل داده شده"
              isLoading={loading}
            />

            <DashboardStatCard
              title="تعداد ماه‌های فعال"
              value={periodicAggregations.monthlyList.length.toLocaleString("fa-IR")}
              unit="ماه"
              icon={Calendar}
              accent="blue"
              secondaryInfo={{
                label: "سال جاری",
                value: periodicAggregations.currentMonthStats.yearFa,
              }}
              isLoading={loading}
            />
          </div>

          {/* جدول مقایسه ماه به ماه */}
          <Card className="rounded-3xl border border-[#1C3324]/12 bg-white/80 p-6 shadow-xs backdrop-blur-md space-y-4 dark:border-white/10 dark:bg-[#15221B]/80">
            <div className="flex flex-col justify-between gap-2 border-b border-[#1C3324]/10 pb-4 sm:flex-row sm:items-center dark:border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#8B263E] dark:text-[#D8B65C]" />
                  <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                    جدول مقایسه عملکرد ماه به ماه طلا
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
                  روند تغییرات فروش ناخالص، سود یا زیان خالص گالری، و معاملات دارای زیان به تفکیک ماه‌های سال
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b border-[#1C3324]/10 bg-[#FAF9F6] font-black text-[#1C3324] dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300">
                  <tr>
                    <th className="px-4 py-3">نام ماه و سال</th>
                    <th className="px-4 py-3 text-center">تعداد معاملات</th>
                    <th className="px-4 py-3 text-center">وزن طلا (گرم)</th>
                    <th className="px-4 py-3 text-left">فروش کل ناخالص</th>
                    <th className="px-4 py-3 text-left">سود یا زیان خالص</th>
                    <th className="px-4 py-3 text-center">معاملات دارای زیان</th>
                    <th className="px-4 py-3 text-center">حاشیه سود/زیان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C3324]/5 dark:divide-white/5 font-medium">
                  {periodicAggregations.monthlyList.map((m) => {
                    const isMonthLoss = m.profit < 0;
                    const margin = m.sales > 0 ? ((m.profit / m.sales) * 100).toFixed(1) : "۰.۰";
                    return (
                      <tr key={m.monthKey} className="hover:bg-[#FAF9F6] dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-4 font-bold text-[#1C3324] dark:text-zinc-100">
                          <span className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${isMonthLoss ? "bg-rose-500" : "bg-[#D8B65C]"}`} />
                            {m.monthKey}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center font-mono">
                          {m.count} معامله
                        </td>
                        <td className="px-4 py-4 text-center font-mono font-bold text-amber-700 dark:text-[#D8B65C]">
                          {m.weight > 0 ? `${m.weight.toFixed(2)} گرم` : "—"}
                        </td>
                        <td className="px-4 py-4 text-left font-mono font-black text-[#1C3324] dark:text-zinc-100">
                          {formatNumber(m.sales)} تومان
                        </td>
                        <td className="px-4 py-4 text-left font-mono font-bold">
                          {isMonthLoss ? (
                            <span className="text-rose-600 dark:text-rose-400">
                              −{formatNumber(Math.abs(m.profit))} تومان (زیان)
                            </span>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400">
                              +{formatNumber(m.profit)} تومان
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center font-mono">
                          {m.lossCount > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                              {m.lossCount} مورد زیان
                            </span>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                              صفر (تماماً دارای سود)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center font-mono font-bold">
                          <span className={isMonthLoss ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-300"}>
                            {margin}٪
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================
          نمای ۳: گزارش سالیانه (Yearly View)
      ========================================================= */}
      {reportView === "yearly" && (
        <div className="space-y-6">
          {/* کارت‌های شاخص سالانه */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardStatCard
              title="کل فروش سال جاری"
              value={formatNumber(metrics.totalGrossSales)}
              unit="تومان"
              icon={TrendingUp}
              accent="gold"
              description="مجموع ناخالص فاکتورها و سفارشات سال"
              isLoading={loading}
            />

            <DashboardStatCard
              title={metrics.totalGalleryNetProfit >= 0 ? "سود خالص سالانه گالری" : "زیان خالص سالانه گالری"}
              value={formatNumber(Math.abs(metrics.totalGalleryNetProfit))}
              unit="تومان"
              icon={metrics.totalGalleryNetProfit >= 0 ? DollarSign : TrendingDown}
              accent={metrics.totalGalleryNetProfit >= 0 ? "emerald" : "crimson"}
              description="سود/زیان قطعی نهایی سال جاری"
              isLoading={loading}
            />

            <DashboardStatCard
              title="وزن کل طلای سال جاری"
              value={metrics.totalGoldWeight.toFixed(2)}
              unit="گرم"
              icon={Scale}
              accent="crimson"
              description="مجموع وزن طلای ۱۸ عیار معامله‌شده سال"
              isLoading={loading}
            />

            <DashboardStatCard
              title="تراکنش‌های موفق سال"
              value={metrics.successfulTransactionsCount.toLocaleString("fa-IR")}
              unit="معامله"
              icon={Award}
              accent="blue"
              secondaryInfo={{
                label: "معاملات دارای زیان",
                value: `${metrics.lossCount} مورد`,
                highlight: metrics.lossCount > 0,
              }}
              isLoading={loading}
            />
          </div>

          {/* جدول جامع ۱۲ ماهه سال */}
          <Card className="rounded-3xl border border-[#1C3324]/12 bg-white/80 p-6 shadow-xs backdrop-blur-md space-y-4 dark:border-white/10 dark:bg-[#15221B]/80">
            <div className="flex flex-col justify-between gap-2 border-b border-[#1C3324]/10 pb-4 sm:flex-row sm:items-center dark:border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-5 w-5 text-[#8B263E] dark:text-[#D8B65C]" />
                  <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                    کارنامه جامع مالی ۱۲ ماهه سال (تقویم خورشیدی)
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
                  تفکیک و پایش مبالغ فروش، سود خالص گالری، و سهم درصد هر ماه از درآمد سال
                </p>
              </div>

              <div className="rounded-xl bg-[#FAF9F6] px-3 py-1.5 text-xs font-bold text-[#1C3324] dark:bg-[#101813] dark:text-zinc-300">
                سال مالی: ۱۴۰۵
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b border-[#1C3324]/10 bg-[#FAF9F6] font-black text-[#1C3324] dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300">
                  <tr>
                    <th className="px-4 py-3">ماه خورشیدی</th>
                    <th className="px-4 py-3 text-center">وضعیت فعالیت</th>
                    <th className="px-4 py-3 text-center">وزن طلا</th>
                    <th className="px-4 py-3 text-left">فروش ناخالص</th>
                    <th className="px-4 py-3 text-left">سود یا زیان خالص</th>
                    <th className="px-4 py-3 text-center">سهم از کل سال</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C3324]/5 dark:divide-white/5 font-medium">
                  {PERSIAN_MONTHS.map((mName, idx) => {
                    const matched = periodicAggregations.monthlyList.find(
                      (m) => m.monthName === mName
                    );
                    const sales = matched ? matched.sales : 0;
                    const profit = matched ? matched.profit : 0;
                    const weight = matched ? matched.weight : 0;
                    const isMonthLoss = profit < 0;
                    const share =
                      metrics.totalGrossSales > 0
                        ? Math.round((sales / metrics.totalGrossSales) * 100)
                        : 0;

                    return (
                      <tr key={mName} className="hover:bg-[#FAF9F6] dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-bold text-[#1C3324] dark:text-zinc-100">
                          <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1C3324]/10 text-[10px] font-black dark:bg-white/10">
                            {idx + 1}
                          </span>
                          {mName}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {sales > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" />
                              فعال
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                              بدون تراکنش
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {weight > 0 ? `${weight.toFixed(2)} گرم` : "—"}
                        </td>
                        <td className="px-4 py-3 text-left font-mono font-bold text-[#1C3324] dark:text-zinc-100">
                          {sales > 0 ? `${formatNumber(sales)} تومان` : "—"}
                        </td>
                        <td className="px-4 py-3 text-left font-mono font-bold">
                          {sales > 0 ? (
                            isMonthLoss ? (
                              <span className="text-rose-600 dark:text-rose-400">
                                −{formatNumber(Math.abs(profit))} تومان
                              </span>
                            ) : (
                              <span className="text-emerald-700 dark:text-emerald-400">
                                +{formatNumber(profit)} تومان
                              </span>
                            )
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {share > 0 ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                <div
                                  style={{ width: `${share}%` }}
                                  className="h-full bg-[#D8B65C]"
                                />
                              </div>
                              <span className="text-[11px] font-bold text-[#1C3324] dark:text-zinc-200">
                                {share}٪
                              </span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================
          نمای ۴: نمای کلی (Overview)
      ========================================================= */}
      {reportView === "overview" && (
        <div className="space-y-6">
          {/* KPI Cards (تخصصی طلا و جواهر با DashboardStatCard) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardStatCard
              title={metrics.totalGalleryNetProfit >= 0 ? "سود خالص گالری" : "زیان خالص دوره (ضرر)"}
              value={formatNumber(Math.abs(metrics.totalGalleryNetProfit))}
              unit="تومان"
              icon={metrics.totalGalleryNetProfit >= 0 ? DollarSign : TrendingDown}
              accent={metrics.totalGalleryNetProfit >= 0 ? "emerald" : "crimson"}
              trend={`مارجین ${metrics.profitMarginPercent}٪`}
              trendType={metrics.totalGalleryNetProfit >= 0 ? "positive" : "negative"}
              description="سود خالص قطعی سهم گالری پرنا زر"
              secondaryInfo={{
                label: "تفکیک سود/زیان",
                value: `سود: +${formatNumber(metrics.totalGrossProfitsOnly)} | زیان: −${formatNumber(metrics.totalLossesOnly)}`,
              }}
              isLoading={loading}
            />

            <DashboardStatCard
              title="مجموع فروش ناخالص"
              value={formatNumber(metrics.totalGrossSales)}
              unit="تومان"
              icon={TrendingUp}
              accent="gold"
              trend={`${metrics.successfulTransactionsCount} معامله قطعی`}
              trendType="neutral"
              description="بر اساس فاکتورها و سفارشات پرداخت‌شده"
              isLoading={loading}
            />

            <DashboardStatCard
              title="وزن کل طلای معامله‌شده"
              value={metrics.totalGoldWeight.toFixed(2)}
              unit="گرم"
              icon={Scale}
              accent="crimson"
              description="مجموع وزن طلای ۱۸ عیار تحویل داده شده"
              isLoading={loading}
            />

            <DashboardStatCard
              title="وضعیت سود و زیان تراکنش‌ها"
              value={`${metrics.profitableCount} معامله دارای سود`}
              unit={metrics.lossCount > 0 ? `| ${metrics.lossCount} زیان` : ""}
              icon={Package}
              accent={metrics.lossCount > 0 ? "crimson" : "blue"}
              secondaryInfo={{
                label: "معاملات دارای زیان",
                value: metrics.lossCount > 0 ? `${metrics.lossCount} مورد فروش زیر قیمت` : "صفر (۱۰۰٪ سود)",
                highlight: metrics.lossCount > 0,
              }}
              isLoading={loading}
            />
          </div>

          {/* کارت گزارش تخصصی فروش اقساطی طلا و تعهدات مشتریان */}
          <Card className="rounded-3xl border border-[#1C3324]/12 bg-white/80 p-6 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80">
            <div className="flex flex-col justify-between gap-3 border-b border-[#1C3324]/10 pb-4 sm:flex-row sm:items-center dark:border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#8B263E] dark:text-[#D8B65C]" />
                  <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                    گزارش جامع فروش اقساطی طلا و تعهدات وصولی
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
                  رصد میزان طلای فروخته‌شده به صورت اقساطی، سود حاصله، اقساط وصول‌شده و مانده تعهدات مشتریان گالری پرنا زر
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{metrics.installmentCount} قرارداد اقساطی</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                  <Banknote className="h-3.5 w-3.5" />
                  <span>{metrics.cashCount} فروش نقدی</span>
                </span>
              </div>
            </div>

            {/* کارت‌های ۴ گانه شاخص‌های اقساط */}
            <div className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* مجموع وصولی اقساط */}
              <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-4 dark:border-indigo-500/20 dark:bg-indigo-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">مجموع وصولی اقساط</span>
                  <Wallet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="mt-2 text-lg font-black text-[#1C3324] dark:text-zinc-100">
                  {formatNumber(metrics.installmentSales)} <span className="text-xs font-normal">تومان</span>
                </div>
                <span className="mt-1 block text-[11px] font-medium text-[#3A5A46] dark:text-zinc-400">
                  سهم {metrics.installmentSharePercent}٪ از کل فروش ناخالص
                </span>
              </div>

              {/* تعهدات و طلب‌های وصول‌نشده اقساط */}
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-500/20 dark:bg-amber-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300">مانده تعهدات آتی اقساط</span>
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="mt-2 text-lg font-black text-amber-800 dark:text-amber-300">
                  {formatNumber(metrics.installmentCommitment)} <span className="text-xs font-normal">تومان</span>
                </div>
                <span className="mt-1 block text-[11px] font-medium text-[#3A5A46] dark:text-zinc-400">
                  اقساط سررسید نشده در دست مشتریان
                </span>
              </div>

              {/* سود خالص از اقساط */}
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-500/20 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">سود گالری از اقساط</span>
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="mt-2 text-lg font-black text-emerald-800 dark:text-emerald-300">
                  +{formatNumber(metrics.installmentProfit)} <span className="text-xs font-normal">تومان</span>
                </div>
                <span className="mt-1 block text-[11px] font-medium text-[#3A5A46] dark:text-zinc-400">
                  سود قطعی محقق‌شده از اقساط وصولی
                </span>
              </div>

              {/* وزن طلای واگذارشده اقساطی */}
              <div className="rounded-2xl border border-[#1C3324]/12 bg-[#FAF9F6] p-4 dark:border-white/10 dark:bg-zinc-900/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1C3324] dark:text-zinc-300">وزن طلای فروش اقساطی</span>
                  <Scale className="h-4 w-4 text-[#D8B65C]" />
                </div>
                <div className="mt-2 text-lg font-black text-[#1C3324] dark:text-zinc-100">
                  {metrics.installmentWeight.toFixed(2)} <span className="text-xs font-normal">گرم</span>
                </div>
                <span className="mt-1 block text-[11px] font-medium text-[#3A5A46] dark:text-zinc-400">
                  {metrics.totalGoldWeight > 0 ? ((metrics.installmentWeight / metrics.totalGoldWeight) * 100).toFixed(1) : 0}٪ از کل طلای واگذارشده
                </span>
              </div>
            </div>

            {/* نوار مقایسه فروش نقدی و فروش اقساطی */}
            <div className="mt-6 rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4 dark:border-white/10 dark:bg-[#101813] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span className="text-[#1C3324] dark:text-zinc-200">سهم شیوه‌های فروش:</span>
                  <span className="text-emerald-700 dark:text-emerald-400">فروش نقدی ({metrics.cashSharePercent}٪)</span>
                  <span className="text-zinc-400">|</span>
                  <span className="text-indigo-700 dark:text-indigo-400">فروش اقساطی ({metrics.installmentSharePercent}٪)</span>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-[#3A5A46] dark:text-zinc-400 font-mono">
                  <span>نقدی: {formatNumber(metrics.cashSales)} ت ({metrics.cashWeight.toFixed(2)} گرم)</span>
                  <span>اقساطی: {formatNumber(metrics.installmentSales)} ت ({metrics.installmentWeight.toFixed(2)} گرم)</span>
                </div>
              </div>

              <div className="flex h-3 w-full overflow-hidden rounded-full border border-[#1C3324]/10 bg-zinc-200 dark:border-white/10 dark:bg-zinc-800">
                <div
                  style={{ width: `${Number(metrics.cashSharePercent) || 50}%` }}
                  className="bg-emerald-600 transition-all duration-500"
                  title={`نقدی: ${metrics.cashSharePercent}٪`}
                />
                <div
                  style={{ width: `${Number(metrics.installmentSharePercent) || 50}%` }}
                  className="bg-indigo-600 transition-all duration-500"
                  title={`اقساطی: ${metrics.installmentSharePercent}٪`}
                />
              </div>
            </div>
          </Card>

          {/* تفکیک حسابداری طلا (Decomposition according to Article 26 Gold Tax Law) */}
          <Card className="rounded-3xl border border-[#1C3324]/12 bg-white/80 p-6 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80">
            <div className="flex flex-col justify-between gap-2 border-b border-[#1C3324]/10 pb-4 sm:flex-row sm:items-center dark:border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-[#8B263E] dark:text-[#D8B65C]" />
                  <h2 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                    تفکیک حسابداری فروش و مالیات طلا (ماده ۲۶ قانون پایانه‌های فروشگاهی)
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
                  اصل طلای خام از مالیات معاف بوده و مالیات ارزش افزوده (۹٪) صرفاً بر مجموع «اجرت ساخت + سود گالری» اعمال می‌شود.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-[#FAF9F6] px-3 py-1.5 text-xs font-bold text-[#1C3324] dark:bg-[#101813] dark:text-zinc-300">
                <Coins className="h-4 w-4 text-[#D8B65C]" />
                <span>مظنه روز هر گرم: {formatNumber(goldRate18K)} تومان</span>
              </div>
            </div>

            {/* ۴ بخش تفکیک ارزش طلا */}
            <div className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* ارزش طلای خام */}
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-500/20 dark:bg-amber-950/20">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300">ارزش طلای خام (سرمایه)</span>
                <div className="mt-2 text-lg font-black text-[#1C3324] dark:text-zinc-100">
                  {formatNumber(metrics.totalRawGold)} <span className="text-xs font-normal">تومان</span>
                </div>
                <span className="mt-1 block text-[11px] text-[#3A5A46] dark:text-zinc-400">
                  بهای تمام‌شده و اصل شمش طلا
                </span>
              </div>

              {/* اجرت ساخت */}
              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-4 dark:border-blue-500/20 dark:bg-blue-950/20">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300">مجموع اجرت ساخت کارگاه</span>
                <div className="mt-2 text-lg font-black text-[#1C3324] dark:text-zinc-100">
                  {formatNumber(metrics.totalWorkshopWages)} <span className="text-xs font-normal">تومان</span>
                </div>
                <span className="mt-1 block text-[11px] text-[#3A5A46] dark:text-zinc-400">
                  سهم پرداخت‌شده به کارگاه‌های طلاسازی
                </span>
              </div>

              {/* سود خالص گالری */}
              <div className={`rounded-2xl border p-4 ${metrics.totalGalleryNetProfit >= 0 ? "border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-950/20" : "border-rose-200/80 bg-rose-50/50 dark:border-rose-500/20 dark:bg-rose-950/20"}`}>
                <span className={`text-xs font-bold ${metrics.totalGalleryNetProfit >= 0 ? "text-emerald-900 dark:text-emerald-300" : "text-rose-900 dark:text-rose-300"}`}>
                  {metrics.totalGalleryNetProfit >= 0 ? "سود خالص گالری" : "زیان خالص (ضرر)"}
                </span>
                <div className={`mt-2 text-lg font-black ${metrics.totalGalleryNetProfit >= 0 ? "text-emerald-800 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                  {metrics.totalGalleryNetProfit < 0 ? "−" : ""}{formatNumber(Math.abs(metrics.totalGalleryNetProfit))} <span className="text-xs font-normal">تومان</span>
                </div>
                <span className="mt-1 block text-[11px] text-[#3A5A46] dark:text-zinc-400">
                  درآمد نهایی پس از کسر تخفیف‌ها و زیان‌ها
                </span>
              </div>

              {/* مالیات بر ارزش افزوده */}
              <div className="rounded-2xl border border-purple-200/80 bg-purple-50/50 p-4 dark:border-purple-500/20 dark:bg-purple-950/20">
                <span className="text-xs font-bold text-purple-900 dark:text-purple-300">مالیات ارزش افزوده (۹٪)</span>
                <div className="mt-2 text-lg font-black text-[#1C3324] dark:text-zinc-100">
                  {formatNumber(metrics.totalVatTax)} <span className="text-xs font-normal">تومان</span>
                </div>
                <span className="mt-1 block text-[11px] text-[#3A5A46] dark:text-zinc-400">
                  سهم امور مالیاتی از (اجرت + سود)
                </span>
              </div>
            </div>

            {/* نوار تجسمی نسبت‌های مالی */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                <span>ترکیب ارزش مالی فروش</span>
                <span>۱۰۰٪ از کل فروش</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full border border-[#1C3324]/10 bg-zinc-100 dark:border-white/10 dark:bg-zinc-800">
                <div
                  style={{
                    width: `${metrics.totalGrossSales > 0 ? (metrics.totalRawGold / metrics.totalGrossSales) * 100 : 80}%`,
                  }}
                  className="bg-amber-400"
                  title="طلای خام"
                />
                <div
                  style={{
                    width: `${metrics.totalGrossSales > 0 ? (metrics.totalWorkshopWages / metrics.totalGrossSales) * 100 : 10}%`,
                  }}
                  className="bg-blue-500"
                  title="اجرت ساخت"
                />
                <div
                  style={{
                    width: `${metrics.totalGrossSales > 0 ? Math.max((metrics.totalGalleryNetProfit / metrics.totalGrossSales) * 100, 2) : 7}%`,
                  }}
                  className={metrics.totalGalleryNetProfit >= 0 ? "bg-emerald-500" : "bg-rose-500"}
                  title={metrics.totalGalleryNetProfit >= 0 ? "سود گالری" : "زیان گالری"}
                />
                <div
                  style={{
                    width: `${metrics.totalGrossSales > 0 ? (metrics.totalVatTax / metrics.totalGrossSales) * 100 : 3}%`,
                  }}
                  className="bg-purple-500"
                  title="مالیات"
                />
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] font-bold">
                <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  طلای خام ({metrics.totalGrossSales > 0 ? Math.round((metrics.totalRawGold / metrics.totalGrossSales) * 100) : 80}٪)
                </span>
                <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  اجرت ساخت ({metrics.totalGrossSales > 0 ? Math.round((metrics.totalWorkshopWages / metrics.totalGrossSales) * 100) : 10}٪)
                </span>
                <span className={`flex items-center gap-1.5 ${metrics.totalGalleryNetProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${metrics.totalGalleryNetProfit >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
                  {metrics.totalGalleryNetProfit >= 0 ? "سود گالری" : "زیان گالری"} ({metrics.profitMarginPercent}٪)
                </span>
                <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                  مالیات ارزش افزوده ({metrics.totalGrossSales > 0 ? Math.round((metrics.totalVatTax / metrics.totalGrossSales) * 100) : 3}٪)
                </span>
              </div>
            </div>
          </Card>

          {/* تفکیک تحلیل متریال و وضعیت تحویل */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* تحلیل فروش بر اساس رنگ متریال طلا */}
            <Card className="rounded-3xl border border-[#1C3324]/12 bg-white/80 p-6 shadow-xs backdrop-blur-md space-y-4 dark:border-white/10 dark:bg-[#15221B]/80">
              <div>
                <div className="flex items-center gap-2">
                  <Gem className="h-4 w-4 text-[#8B263E] dark:text-[#D8B65C]" />
                  <h3 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                    سهم فروش بر اساس رنگ متریال طلا
                  </h3>
                </div>
                <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
                  توزیع تقاضای مشتریان بر مبنای رنگ‌های طلای ۱۸ عیار پرنا زر
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {[
                  {
                    label: "طلای زرد (Yellow Gold)",
                    percent: metrics.colorPercentages.yellow,
                    weight: metrics.colorsCount.yellow,
                    color: "bg-amber-500",
                  },
                  {
                    label: "طلای سفید (White Gold)",
                    percent: metrics.colorPercentages.white,
                    weight: metrics.colorsCount.white,
                    color: "bg-slate-300 dark:bg-slate-400",
                  },
                  {
                    label: "رزگلد (Rose Gold)",
                    percent: metrics.colorPercentages.rose,
                    weight: metrics.colorsCount.rose,
                    color: "bg-rose-400",
                  },
                  {
                    label: "دورنگ / ترکیبی لوکس",
                    percent: metrics.colorPercentages.twotone,
                    weight: metrics.colorsCount.twotone,
                    color: "bg-[#1C3324] dark:bg-[#D8B65C]",
                  },
                ].map((item) => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#1C3324] dark:text-zinc-200">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#3A5A46] dark:text-zinc-400">
                          {item.weight.toFixed(2)} گرم
                        </span>
                        <span className="font-mono font-black text-[#1C3324] dark:text-zinc-100">
                          {item.percent}٪
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-zinc-100 border border-[#1C3324]/10 overflow-hidden dark:bg-zinc-800 dark:border-white/10">
                      <div
                        style={{ width: `${item.percent}%` }}
                        className={`h-full ${item.color} transition-all duration-700`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* وضعیت سفارشات و تحویل */}
            <Card className="rounded-3xl border border-[#1C3324]/12 bg-white/80 p-6 shadow-xs backdrop-blur-md space-y-4 dark:border-white/10 dark:bg-[#15221B]/80">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#8B263E] dark:text-[#D8B65C]" />
                  <h3 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                    وضعیت تحویل و آماده‌سازی سفارشات
                  </h3>
                </div>
                <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
                  نسبت سفارش‌های «موجود و تحویل‌شده» به «ساخت سفارشی کارگاه»
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 text-center shadow-xs dark:border-emerald-500/20 dark:bg-emerald-950/20">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    ارسال فوری / تحویل قطعی
                  </span>
                  <div className="mt-2 text-2xl font-black text-[#1C3324] dark:text-zinc-100">
                    {metrics.deliveredPercent}٪
                  </div>
                  <span className="text-[11px] text-[#3A5A46] dark:text-zinc-400">تحویل با بسته بندی لوکس</span>
                </div>

                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 text-center shadow-xs dark:border-amber-500/20 dark:bg-amber-950/20">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    ساخت سفارشی کارگاه
                  </span>
                  <div className="mt-2 text-2xl font-black text-[#1C3324] dark:text-zinc-100">
                    {metrics.customPercent}٪
                  </div>
                  <span className="text-[11px] text-[#3A5A46] dark:text-zinc-400">تولید اختصاصی و ریخته‌گری</span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#1C3324]/10 bg-[#FAF9F6] p-4 text-xs font-bold text-[#1C3324] dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#8B263E] dark:text-[#D8B65C]" />
                  میانگین زمان تحویل سفارش‌های سفارشی:
                </span>
                <span className="font-black text-[#8B263E] dark:text-[#D8B65C]">۳ الی ۵ روز کاری</span>
              </div>
            </Card>
          </div>

          {/* جدول معاملات با تفکیک سود و ضرر، شیوه فروش و فیلترهای اختصاصی */}
          <Card id="transactions-table" className="rounded-3xl border border-[#1C3324]/12 bg-white/80 p-6 shadow-xs backdrop-blur-md space-y-4 dark:border-white/10 dark:bg-[#15221B]/80">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#1C3324]/10 pb-4 dark:border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-base font-black text-[#1C3324] dark:text-zinc-100">
                    ریز معاملات تسویه‌شده و سود و زیان هر اثر
                  </h3>
                </div>
                <p className="mt-1 text-xs text-[#3A5A46] dark:text-zinc-400">
                  امکان فیلتر و رصد معاملات بر مبنای شیوه تسویه (نقدی یا اقساطی) و سود و زیان (دارای سود یا زیان)
                </p>
              </div>

              {/* فیلترهای دوگانه: روش فروش و وضعیت سود و زیان */}
              <div className="flex flex-wrap items-center gap-2">
                {/* فیلتر روش فروش: نقدی / اقساطی */}
                <div className="flex items-center rounded-2xl border border-[#1C3324]/12 bg-[#FAF9F6] p-1 shadow-xs dark:border-white/10 dark:bg-[#101813]">
                  <button
                    type="button"
                    onClick={() => setSaleTypeFilter("all")}
                    className={`rounded-xl px-2.5 py-1.5 text-[11px] font-black transition cursor-pointer ${
                      saleTypeFilter === "all"
                        ? "bg-[#1C3324] text-white shadow-xs dark:bg-[#D8B65C] dark:text-[#101813]"
                        : "text-[#3A5A46] hover:text-[#1C3324] dark:text-zinc-400"
                    }`}
                  >
                    همه روش‌ها
                  </button>

                  <button
                    type="button"
                    onClick={() => setSaleTypeFilter("cash")}
                    className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-black transition cursor-pointer ${
                      saleTypeFilter === "cash"
                        ? "bg-emerald-700 text-white shadow-xs dark:bg-emerald-600 dark:text-white"
                        : "text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
                    }`}
                  >
                    <Banknote className="h-3 w-3" />
                    <span>نقدی ({metrics.cashCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSaleTypeFilter("installment")}
                    className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-black transition cursor-pointer ${
                      saleTypeFilter === "installment"
                        ? "bg-indigo-700 text-white shadow-xs dark:bg-indigo-600 dark:text-white"
                        : "text-indigo-700 hover:text-indigo-800 dark:text-indigo-400"
                    }`}
                  >
                    <CreditCard className="h-3 w-3" />
                    <span>اقساطی ({metrics.installmentCount})</span>
                  </button>
                </div>

                {/* فیلتر وضعیت سود و زیان */}
                <div className="flex items-center rounded-2xl border border-[#1C3324]/12 bg-[#FAF9F6] p-1 shadow-xs dark:border-white/10 dark:bg-[#101813]">
                  <button
                    type="button"
                    onClick={() => setProfitFilter("all")}
                    className={`rounded-xl px-2.5 py-1.5 text-[11px] font-black transition cursor-pointer ${
                      profitFilter === "all"
                        ? "bg-[#1C3324] text-white shadow-xs dark:bg-[#D8B65C] dark:text-[#101813]"
                        : "text-[#3A5A46] hover:text-[#1C3324] dark:text-zinc-400"
                    }`}
                  >
                    همه سود/زیان
                  </button>

                  <button
                    type="button"
                    onClick={() => setProfitFilter("profit")}
                    className={`rounded-xl px-2.5 py-1.5 text-[11px] font-black transition cursor-pointer ${
                      profitFilter === "profit"
                        ? "bg-emerald-700 text-white shadow-xs dark:bg-emerald-600 dark:text-white"
                        : "text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
                    }`}
                  >
                    دارای سود ({metrics.profitableCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setProfitFilter("loss")}
                    className={`rounded-xl px-2.5 py-1.5 text-[11px] font-black transition cursor-pointer ${
                      profitFilter === "loss"
                        ? "bg-rose-700 text-white shadow-xs dark:bg-rose-600 dark:text-white"
                        : "text-rose-700 hover:text-rose-800 dark:text-rose-400"
                    }`}
                  >
                    زیان / ضرر ({metrics.lossCount})
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b border-[#1C3324]/10 bg-[#FAF9F6] font-black text-[#1C3324] dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300">
                  <tr>
                    <th className="px-4 py-3">کد / شماره</th>
                    <th className="px-4 py-3">نوع معامله</th>
                    <th className="px-4 py-3 text-center">شیوه تسویه</th>
                    <th className="px-4 py-3">خریدار</th>
                    <th className="px-4 py-3 text-center">وزن طلا</th>
                    <th className="px-4 py-3 text-left">مبلغ پرداختی</th>
                    <th className="px-4 py-3 text-left">بهای تمام‌شده</th>
                    <th className="px-4 py-3 text-left">سود یا زیان (ضرر)</th>
                    <th className="px-4 py-3 text-center">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C3324]/5 dark:divide-white/5 font-medium">
                  {metrics.recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-xs text-[#3A5A46] dark:text-zinc-400">
                        {profitFilter === "loss"
                          ? "هیچ معامله دارای زیانی در این دوره وجود ندارد."
                          : saleTypeFilter === "installment"
                          ? "هیچ تراکنش اقساطی در این فیلتر یافت نشد."
                          : "معامله‌ای یافت نشد."}
                      </td>
                    </tr>
                  ) : (
                    metrics.recentTransactions.map((tx) => (
                      <tr key={tx.code} className="hover:bg-[#FAF9F6] dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-mono font-bold text-[#1C3324] dark:text-zinc-200">
                          {tx.code}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-lg bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-[#1C3324] dark:bg-zinc-800 dark:text-zinc-300">
                            {tx.type === "invoice" ? "فاکتور رسمی" : "سفارش آنلاین"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {tx.isInstallment ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-black text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                              <CreditCard className="h-3 w-3" />
                              {tx.installmentLabel}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                              <Banknote className="h-3 w-3" />
                              نقدی
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-[#1C3324] dark:text-zinc-200">
                          {tx.customer}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {tx.weight > 0 ? `${tx.weight.toFixed(2)} گرم` : "—"}
                        </td>
                        <td className="px-4 py-3 text-left font-mono font-black text-[#1C3324] dark:text-zinc-100">
                          {formatNumber(tx.amount)} تومان
                        </td>
                        <td className="px-4 py-3 text-left font-mono text-[#3A5A46] dark:text-zinc-400">
                          {formatNumber(tx.costBasis)} تومان
                        </td>
                        <td className="px-4 py-3 text-left font-mono font-bold">
                          {tx.isLoss ? (
                            <span className="text-rose-600 dark:text-rose-400 font-black">
                              −{formatNumber(tx.lossAmount)} تومان (ضرر)
                            </span>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400">
                              +{formatNumber(tx.profit)} تومان
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {tx.isLoss ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                              <XCircle className="h-3 w-3" />
                              زیان
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" />
                              سود
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================
          قالب رسمی چاپ و صدور فایل PDF به زبان فارسی
          (PARNA ZAR GOLD STUDIO OFFICIAL CERTIFIED AUDIT REPORT)
      ========================================================= */}
      <div
        id="persian-pnl-pdf-report"
        className="hidden print:block"
        style={{
          width: "794px",
          backgroundColor: "#ffffff",
          color: "#1C3324",
          padding: "36px 40px",
          direction: "rtl",
          fontFamily: "var(--font-print, var(--font-body)), Tahoma, Arial, sans-serif",
          boxSizing: "border-box",
        }}
      >
        {/* سربرگ رسمی با مهر و نشان گالری */}
        <div style={{ borderBottom: "3px double #1C3324", paddingBottom: "16px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#1C3324", letterSpacing: "-0.5px" }}>
                گالری طلا و جواهرات پرنا زر — مثل زر بدرخش
              </div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#8B263E", marginTop: "4px" }}>
                PARNA ZAR GOLD &amp; JEWELRY GALLERY — OFFICIAL AUDIT STATEMENT
              </div>
              <div style={{ fontSize: "10px", color: "#3A5A46", marginTop: "2px" }}>
                سامانه پایانه‌های فروشگاهی و گزارشات رسمی حسابرسی صنف طلا و جواهر (ماده ۲۶ قانون م.ا.ا)
              </div>
            </div>

            <div style={{ textAlign: "left", fontSize: "10px", lineHeight: "1.6", color: "#1C3324" }}>
              <div><strong>شماره سند:</strong> <span style={{ fontFamily: "monospace" }}>SRV-PNL-{new Date().getFullYear()}</span></div>
              <div><strong>تاریخ گزارش:</strong> {new Intl.DateTimeFormat("fa-IR", { dateStyle: "full" }).format(new Date())}</div>
              <div><strong>دوره مالی:</strong> {reportView === "daily" ? "کارنامه روزانه" : reportView === "monthly" ? "کارنامه ماهانه" : reportView === "yearly" ? "گزارش سالیانه" : "نمای جامع"}</div>
              <div><strong>مظنه هر گرم طلای ۱۸:</strong> {formatNumber(goldRate18K)} تومان</div>
            </div>
          </div>
        </div>

        {/* عنوان سند */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "15px", fontWeight: 900, color: "#1C3324" }}>
            صورت جامع حسابرسی مالی، سود و زیان (P&amp;L) و فروش اقساطی طلا
          </div>
          <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>
            تاییدیه وضعیت درآمدها، ضررهای ناشی از فروش زیر بهای تمام‌شده و تعهدات اقساطی
          </div>
        </div>

        {/* جدول ۴ ستونه شاخص‌های کلیدی حسابداری طلا */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "11px" }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #ddd", padding: "10px", backgroundColor: "#fbfaf8", width: "25%" }}>
                <div style={{ color: "#666", fontSize: "9px" }}>مجموع فروش کل ناخالص</div>
                <div style={{ fontSize: "13px", fontWeight: 900, color: "#1C3324", marginTop: "4px" }}>
                  {formatNumber(metrics.totalGrossSales)} <span style={{ fontSize: "9px" }}>تومان</span>
                </div>
                <div style={{ fontSize: "9px", color: "#888", marginTop: "2px" }}>{metrics.successfulTransactionsCount} معامله تسویه‌شده</div>
              </td>
              <td style={{ border: "1px solid #ddd", padding: "10px", backgroundColor: metrics.totalGalleryNetProfit >= 0 ? "#f0fdf4" : "#fef2f2", width: "25%" }}>
                <div style={{ color: metrics.totalGalleryNetProfit >= 0 ? "#166534" : "#991b1b", fontSize: "9px" }}>
                  {metrics.totalGalleryNetProfit >= 0 ? "سود خالص نهایی گالری" : "زیان خالص قطعی (ضرر)"}
                </div>
                <div style={{ fontSize: "13px", fontWeight: 900, color: metrics.totalGalleryNetProfit >= 0 ? "#15803d" : "#b91c1c", marginTop: "4px" }}>
                  {metrics.totalGalleryNetProfit < 0 ? "−" : "+"}{formatNumber(Math.abs(metrics.totalGalleryNetProfit))} <span style={{ fontSize: "9px" }}>تومان</span>
                </div>
                <div style={{ fontSize: "9px", color: "#666", marginTop: "2px" }}>مارجین سود خالص: {metrics.profitMarginPercent}٪</div>
              </td>
              <td style={{ border: "1px solid #ddd", padding: "10px", backgroundColor: "#fbfaf8", width: "25%" }}>
                <div style={{ color: "#666", fontSize: "9px" }}>وزن کل طلای واگذارشده</div>
                <div style={{ fontSize: "13px", fontWeight: 900, color: "#1C3324", marginTop: "4px" }}>
                  {metrics.totalGoldWeight.toFixed(2)} <span style={{ fontSize: "9px" }}>گرم</span>
                </div>
                <div style={{ fontSize: "9px", color: "#888", marginTop: "2px" }}>طلای استاندارد ۱۸ عیار</div>
              </td>
              <td style={{ border: "1px solid #ddd", padding: "10px", backgroundColor: "#fbfaf8", width: "25%" }}>
                <div style={{ color: "#666", fontSize: "9px" }}>سود به ازای هر گرم طلا</div>
                <div style={{ fontSize: "13px", fontWeight: 900, color: "#8B263E", marginTop: "4px" }}>
                  {metrics.profitPerGram < 0 ? "−" : ""}{formatNumber(Math.abs(metrics.profitPerGram))} <span style={{ fontSize: "9px" }}>ت/گرم</span>
                </div>
                <div style={{ fontSize: "9px", color: "#888", marginTop: "2px" }}>میانگین عایدی هر گرم</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* تفکیک ارزش طلا طبق ماده ۲۶ قانون پایانه‌های فروشگاهی */}
        <div style={{ marginBottom: "16px", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", backgroundColor: "#faf9f6" }}>
          <div style={{ fontSize: "11px", fontWeight: 900, color: "#1C3324", marginBottom: "8px" }}>
            تفکیک حسابداری طلا و مالیات ارزش افزوده (ماده ۲۶):
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", lineHeight: "1.8" }}>
            <div>• ارزش اصل طلای خام (سرمایه معاف از مالیات): <strong>{formatNumber(metrics.totalRawGold)} تومان</strong></div>
            <div>• اجرت ساخت پرداختی به کارگاه‌ها: <strong>{formatNumber(metrics.totalWorkshopWages)} تومان</strong></div>
            <div>• مالیات ارزش افزوده (۹٪ از سود و اجرت): <strong>{formatNumber(metrics.totalVatTax)} تومان</strong></div>
          </div>
        </div>

        {/* بخش گزارش فروش اقساطی طلا و تعهدات */}
        <div style={{ marginBottom: "16px", padding: "12px", border: "1px solid #c7d2fe", borderRadius: "8px", backgroundColor: "#eef2ff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 900, color: "#312e81" }}>
              کارنامه فروش اقساطی طلا و وضعیت تعهدات مشتریان:
            </span>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#4338ca" }}>
              {metrics.installmentCount} قرارداد اقساطی ثبت‌شده
            </span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <tbody>
              <tr>
                <td style={{ padding: "4px 8px" }}>مجموع وصولی اقساط: <strong>{formatNumber(metrics.installmentSales)} تومان</strong> ({metrics.installmentSharePercent}٪ کل فروش)</td>
                <td style={{ padding: "4px 8px" }}>مانده تعهدات آتی اقساط: <strong>{formatNumber(metrics.installmentCommitment)} تومان</strong></td>
              </tr>
              <tr>
                <td style={{ padding: "4px 8px" }}>سود محقق‌شده از اقساط: <strong style={{ color: "#15803d" }}>+{formatNumber(metrics.installmentProfit)} تومان</strong></td>
                <td style={{ padding: "4px 8px" }}>وزن طلای فروش اقساطی: <strong>{metrics.installmentWeight.toFixed(2)} گرم</strong></td>
              </tr>
              <tr>
                <td style={{ padding: "4px 8px" }}>فروش نقدی طلا: <strong>{formatNumber(metrics.cashSales)} تومان</strong> ({metrics.cashSharePercent}٪)</td>
                <td style={{ padding: "4px 8px" }}>وزن طلای نقدی: <strong>{metrics.cashWeight.toFixed(2)} گرم</strong> ({metrics.cashCount} معامله)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* خلاصه تفکیک سود و زیان معاملات */}
        <div style={{ marginBottom: "16px", padding: "12px", border: "1px solid #ddd", borderRadius: "8px" }}>
          <div style={{ fontSize: "11px", fontWeight: 900, color: "#1C3324", marginBottom: "8px" }}>
            وضعیت تفکیک سود و زیان معاملات گالری:
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", lineHeight: "1.8" }}>
            <div style={{ color: "#15803d" }}>• معاملات دارای سود: <strong>{metrics.profitableCount} معامله</strong> (مجموع سود: +{formatNumber(metrics.totalGrossProfitsOnly)} تومان)</div>
            <div style={{ color: metrics.lossCount > 0 ? "#b91c1c" : "#666" }}>• معاملات دارای زیان (فروش زیر قیمت): <strong>{metrics.lossCount} معامله</strong> (مجموع ضرر: −{formatNumber(metrics.totalLossesOnly)} تومان)</div>
          </div>
        </div>

        {/* جدول معاملات دارای زیان (در صورت وجود) */}
        {metrics.lossCount > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 900, color: "#991b1b", marginBottom: "6px" }}>
              فهرست معاملات دارای زیان (فروش زیر بهای تمام‌شده طلا و اجرت):
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px", textAlign: "right" }}>
              <thead>
                <tr style={{ backgroundColor: "#fee2e2", color: "#991b1b", fontWeight: 900 }}>
                  <th style={{ border: "1px solid #fca5a5", padding: "6px" }}>کد معامله</th>
                  <th style={{ border: "1px solid #fca5a5", padding: "6px" }}>خریدار</th>
                  <th style={{ border: "1px solid #fca5a5", padding: "6px", textAlign: "center" }}>وزن طلا</th>
                  <th style={{ border: "1px solid #fca5a5", padding: "6px", textAlign: "left" }}>مبلغ دریافتی</th>
                  <th style={{ border: "1px solid #fca5a5", padding: "6px", textAlign: "left" }}>بهای تمام‌شده</th>
                  <th style={{ border: "1px solid #fca5a5", padding: "6px", textAlign: "left" }}>میزان ضرر (زیان)</th>
                  <th style={{ border: "1px solid #fca5a5", padding: "6px", textAlign: "center" }}>تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {lossTransactions.map((tx) => (
                  <tr key={tx.code}>
                    <td style={{ border: "1px solid #fecaca", padding: "6px", fontFamily: "monospace" }}>{tx.code}</td>
                    <td style={{ border: "1px solid #fecaca", padding: "6px" }}>{tx.customer}</td>
                    <td style={{ border: "1px solid #fecaca", padding: "6px", textAlign: "center" }}>{tx.weight.toFixed(2)} گرم</td>
                    <td style={{ border: "1px solid #fecaca", padding: "6px", textAlign: "left" }}>{formatNumber(tx.amount)} تومان</td>
                    <td style={{ border: "1px solid #fecaca", padding: "6px", textAlign: "left" }}>{formatNumber(tx.costBasis)} تومان</td>
                    <td style={{ border: "1px solid #fecaca", padding: "6px", textAlign: "left", color: "#b91c1c", fontWeight: 900 }}>
                      −{formatNumber(tx.lossAmount)} تومان
                    </td>
                    <td style={{ border: "1px solid #fecaca", padding: "6px", textAlign: "center" }}>
                      {new Date(tx.date).toLocaleDateString("fa-IR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* جدول ریز آخرین معاملات */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 900, color: "#1C3324", marginBottom: "6px" }}>
            ریز معاملات اخیر دوره:
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px", textAlign: "right" }}>
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6", color: "#1C3324", fontWeight: 900 }}>
                <th style={{ border: "1px solid #e5e7eb", padding: "6px" }}>کد معامله</th>
                <th style={{ border: "1px solid #e5e7eb", padding: "6px" }}>نوع</th>
                <th style={{ border: "1px solid #e5e7eb", padding: "6px", textAlign: "center" }}>شیوه تسویه</th>
                <th style={{ border: "1px solid #e5e7eb", padding: "6px" }}>خریدار</th>
                <th style={{ border: "1px solid #e5e7eb", padding: "6px", textAlign: "center" }}>وزن</th>
                <th style={{ border: "1px solid #e5e7eb", padding: "6px", textAlign: "left" }}>مبلغ فروش</th>
                <th style={{ border: "1px solid #e5e7eb", padding: "6px", textAlign: "left" }}>سود یا زیان</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recentTransactions.slice(0, 10).map((tx) => (
                <tr key={tx.code}>
                  <td style={{ border: "1px solid #f3f4f6", padding: "5px", fontFamily: "monospace" }}>{tx.code}</td>
                  <td style={{ border: "1px solid #f3f4f6", padding: "5px" }}>{tx.type === "invoice" ? "فاکتور" : "سفارش"}</td>
                  <td style={{ border: "1px solid #f3f4f6", padding: "5px", textAlign: "center" }}>{tx.installmentLabel}</td>
                  <td style={{ border: "1px solid #f3f4f6", padding: "5px" }}>{tx.customer}</td>
                  <td style={{ border: "1px solid #f3f4f6", padding: "5px", textAlign: "center" }}>{tx.weight > 0 ? `${tx.weight.toFixed(2)} گرم` : "—"}</td>
                  <td style={{ border: "1px solid #f3f4f6", padding: "5px", textAlign: "left" }}>{formatNumber(tx.amount)} ت</td>
                  <td style={{ border: "1px solid #f3f4f6", padding: "5px", textAlign: "left", color: tx.isLoss ? "#b91c1c" : "#15803d", fontWeight: 700 }}>
                    {tx.isLoss ? `−${formatNumber(tx.lossAmount)}` : `+${formatNumber(tx.profit)}`} ت
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* فوتر سند رسمی و امضاها */}
        <div style={{ marginTop: "30px", borderTop: "1px dashed #bbb", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: "10px" }}>
          <div>
            <div>این صورت حسابرسی مالی توسط موتور خودکار حسابداری پرنا زر استخراج و تصدیق شده است.</div>
            <div style={{ color: "#888", marginTop: "2px" }}>گالری طلا و جواهرات پرنا زر — مثل زر بدرخش | نسخه سامانه ابری معتبر</div>
          </div>
          <div style={{ textAlign: "center", minWidth: "160px" }}>
            <div style={{ fontWeight: 700, color: "#1C3324", marginBottom: "30px" }}>امضا و مهر رسمی مدیریت مالی</div>
            <div style={{ borderBottom: "1px dotted #888" }} />
          </div>
        </div>
      </div>
    </div>
  );
}