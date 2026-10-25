import pb from "@/lib/pocketbase";
import { getGoldGramPrice } from "@/lib/product-detail";
import { recordAuditLogClient } from "@/lib/audit-client";

export interface SyncOptions {
  forceStatus?: "pending" | "paid" | "processing" | "delivered" | "cancelled";
  forcePaymentStatus?: "unpaid" | "paid" | "failed" | "refunded";
  paymentMethod?: "online" | "card_to_card" | "installment" | "cash" | string;
  trackingCode?: string;
  settledAmount?: number;
  notes?: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  order?: string;
  user?: string;
  paidAmount?: number;
  totalAmount?: number;
  paymentStatus?: "unpaid" | "partial" | "paid" | "refunded";
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  goldRate?: number;
  items?: any;
  notes?: string;
  sellerName?: string;
  created?: string;
  updated?: string;
}

export interface SettlementRecord {
  id: string;
  invoice?: string;
  order?: string;
  amount?: number;
  paymentMethod?: string;
  trackingCode?: string;
  status?: string;
  settledAt?: string;
  notes?: string;
  created?: string;
  updated?: string;
}

/**
 * دریافت فاکتور متصل به یک سفارش (در صورت وجود)
 */
export async function getInvoiceForOrder(orderId: string): Promise<InvoiceRecord | null> {
  if (!orderId) return null;
  try {
    const record = await pb.collection("invoices").getFirstListItem<InvoiceRecord>(
      `order = "${orderId}"`,
      { requestKey: null }
    );
    return record;
  } catch {
    return null;
  }
}

/**
 * دریافت رکورد تسویه متصل به یک فاکتور یا سفارش
 */
export async function getSettlementForInvoice(invoiceId: string): Promise<SettlementRecord | null> {
  if (!invoiceId) return null;
  try {
    const record = await pb.collection("settlements").getFirstListItem<SettlementRecord>(
      `invoice = "${invoiceId}"`,
      { requestKey: null }
    );
    return record;
  } catch {
    return null;
  }
}

/**
 * موتور تریگر و ثبت خودکار فاکتور و تسویه سفارش بر اساس وضعیت پرداخت و سفارش
 * Trigger / Event: وقتی وضعیت order.status == 'confirmed'/'processing' یا 'paid' شد:
 * - ایجاد رکورد در کالکشن invoices با کپی اقلام سفارش
 * - اگر پرداخت آنلاین/موفق بوده، ایجاد خودکار رکورد در settlements و پیوند دادن آن به invoice_id
 * - اگر آفلاین/شرایطی بوده، وضعیت فاکتور «در انتظار پرداخت» مانده تا تایید واریز ثبت گردد
 */
export async function syncOrderToInvoiceAndSettlement(
  orderId: string,
  options?: SyncOptions
): Promise<{
  invoice: InvoiceRecord;
  settlement?: SettlementRecord | null;
  createdNewInvoice: boolean;
  createdNewSettlement: boolean;
}> {
  if (!orderId) {
    throw new Error("شناسه سفارش نامعتبر است.");
  }

  // ۱. دریافت سفارش همراه با اطلاعات مشتری و آدرس
  const order = await pb.collection("orders").getOne(orderId, {
    expand: "user,address",
    requestKey: null,
  });

  const orderNumber = order.orderNumber || order.id.slice(0, 8);
  const totalAmount = Number(order.totalAmount) || 0;
  const isPaid =
    options?.forcePaymentStatus === "paid" ||
    order.paymentStatus === "paid" ||
    options?.forceStatus === "paid" ||
    order.status === "paid";

  const customerName =
    order.shippingFullName ||
    order.expand?.user?.name ||
    "مشتری فروشگاه";

  const customerPhone =
    order.shippingPhone ||
    order.expand?.user?.phone ||
    "";

  const customerAddress = [
    order.shippingProvince,
    order.expand?.address?.city,
    order.expand?.address?.fullAddress || order.expand?.address?.street,
  ]
    .filter(Boolean)
    .join(" - ");

  // واکشی اقلام سفارش
  let invoiceItems: any[] = [];
  if (Array.isArray(order.items) && order.items.length > 0) {
    invoiceItems = order.items.map((it: any) => ({
      id: it.id || it.productId || "",
      title: it.name || it.title || "قطعه طلا",
      weight: Number(it.weight) || 0,
      karat: Number(it.karat) || 18,
      rawGoldValue: Number(it.rawGoldValue) || 0,
      wagePercent: Number(it.wage_percent || it.wagePercent) || 0,
      wageAmount: Number(it.wageAmount) || 0,
      profitPercent: Number(it.profit_percent || it.profitPercent) || 7,
      profitAmount: Number(it.profitAmount) || 0,
      taxPercent: Number(it.tax_percent || it.taxPercent) || 9,
      taxAmount: Number(it.taxAmount) || 0,
      totalPrice: Number(it.price || it.totalPrice) || 0,
      quantity: Number(it.quantity) || 1,
    }));
  } else {
    // در صورت خالی بودن آرایه items در سفارش، یک قلم کالا بر مبنای مبلغ کل ایجاد می‌شود
    invoiceItems = [
      {
        id: order.id,
        title: `اقلام سفارش #${orderNumber}`,
        weight: 0,
        karat: 18,
        rawGoldValue: 0,
        wagePercent: 0,
        wageAmount: 0,
        profitPercent: 7,
        profitAmount: 0,
        taxPercent: 9,
        taxAmount: 0,
        totalPrice: totalAmount,
        quantity: 1,
      },
    ];
  }

  const goldRate = await getGoldGramPrice();

  // ۲. بررسی وجود فاکتور قبلی برای این سفارش (Idempotency)
  let existingInvoice = await getInvoiceForOrder(orderId);
  let createdNewInvoice = false;
  let createdNewSettlement = false;
  let settlementRecord: SettlementRecord | null = null;

  if (existingInvoice) {
    // فاکتور از قبل صادر شده است؛ بررسی وضعیت تسویه
    if (isPaid && existingInvoice.paymentStatus !== "paid") {
      existingInvoice = await pb.collection("invoices").update<InvoiceRecord>(
        existingInvoice.id,
        {
          paymentStatus: "paid",
          paidAmount: totalAmount,
        },
        { requestKey: null }
      );
    }
  } else {
    // صدور فاکتور جدید
    const generatedInvoiceNumber = `SRV-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const invoicePayload = {
      invoiceNumber: generatedInvoiceNumber,
      order: order.id,
      user: order.user || undefined,
      customerName,
      customerPhone,
      customerAddress,
      totalAmount,
      paidAmount: isPaid ? totalAmount : 0,
      paymentStatus: isPaid ? "paid" : "unpaid",
      goldRate,
      items: invoiceItems,
      notes: options?.notes || `صدور خودکار از روی سفارش #${orderNumber}`,
      sellerName: "گالری طلا و جواهر پرنا زر",
    };

    existingInvoice = await pb.collection("invoices").create<InvoiceRecord>(invoicePayload, {
      requestKey: null,
    });
    createdNewInvoice = true;

    // ثبت لاگ خودکار صدور فاکتور
    void recordAuditLogClient({
      category: "invoice",
      title: `صدور خودکار فاکتور #${generatedInvoiceNumber}`,
      description: `فاکتور سفارش #${orderNumber} به مبلغ ${totalAmount.toLocaleString(
        "fa-IR"
      )} تومان به صورت خودکار صادر شد. وضعیت پرداخت: ${isPaid ? "تسویه کامل" : "در انتظار پرداخت"}`,
      level: "info",
      targetId: existingInvoice.id,
      targetType: "invoice",
      metadata: {
        orderId: order.id,
        invoiceNumber: generatedInvoiceNumber,
        totalAmount,
        isPaid,
      },
    });
  }

  // ۳. بررسی و ثبت رکورد تسویه (Settlement) در صورت پرداخت آنلاین یا تایید واریز
  if (isPaid && existingInvoice) {
    const existingSettlement = await getSettlementForInvoice(existingInvoice.id);

    if (existingSettlement) {
      settlementRecord = existingSettlement;
    } else {
      try {
        const method = options?.paymentMethod || (order.paymentStatus === "paid" ? "online" : "card_to_card");
        const tracking = options?.trackingCode || `TXN-${orderNumber}-${Math.floor(100 + Math.random() * 900)}`;

        settlementRecord = await pb.collection("settlements").create<SettlementRecord>(
          {
            invoice: existingInvoice.id,
            order: order.id,
            amount: options?.settledAmount ?? totalAmount,
            paymentMethod: method,
            trackingCode: tracking,
            status: "completed",
            settledAt: new Date().toISOString(),
            notes: options?.notes || "تسویه خودکار پس از تایید مالی سفارش",
          },
          { requestKey: null }
        );
        createdNewSettlement = true;

        void recordAuditLogClient({
          category: "order",
          title: `ثبت خودکار سند تسویه فاکتور #${existingInvoice.invoiceNumber}`,
          description: `سند تسویه سفارش #${orderNumber} به مبلغ ${(options?.settledAmount ?? totalAmount).toLocaleString(
            "fa-IR"
          )} تومان از طریق ${method === "online" ? "درگاه پرداخت آنلاین" : "کارت به کارت"} در سامانه ثبت گردید.`,
          level: "info",
          targetId: settlementRecord.id,
          targetType: "order",
          metadata: {
            orderId: order.id,
            invoiceId: existingInvoice.id,
            trackingCode: tracking,
            amount: options?.settledAmount ?? totalAmount,
          },
        });
      } catch (err) {
        console.error("خطا در ایجاد رکورد تسویه در settlements:", err);
      }
    }
  }

  return {
    invoice: existingInvoice,
    settlement: settlementRecord,
    createdNewInvoice,
    createdNewSettlement,
  };
}

/**
 * تایید واریز و ثبت تسویه دستی / شرایطی (کارت‌به‌کارت / اقساطی / امانی) با یک کلیک
 */
export async function confirmOrderDepositAndSettle(
  orderId: string,
  settlementData: {
    paymentMethod: "card_to_card" | "cash" | "installment" | "online" | string;
    trackingCode?: string;
    amount?: number;
    notes?: string;
  }
) {
  // ۱. آپدیت وضعیت پرداخت سفارش در دیتابیس
  await pb.collection("orders").update(
    orderId,
    {
      paymentStatus: "paid",
      status: "processing", // پس از پرداخت، سفارش وارد صف ساخت/آماده‌سازی کارگاه می‌شود
    },
    { requestKey: null }
  );

  // ۲. فراخوانی موتور تسویه و فاکتور
  const result = await syncOrderToInvoiceAndSettlement(orderId, {
    forcePaymentStatus: "paid",
    forceStatus: "processing",
    paymentMethod: settlementData.paymentMethod,
    trackingCode: settlementData.trackingCode,
    settledAmount: settlementData.amount,
    notes: settlementData.notes,
  });

  return result;
}
