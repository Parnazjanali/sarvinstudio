import { NextResponse } from "next/server";
import PocketBase from "pocketbase";
import { getAdminPb } from "@/lib/pocketbase";
import { sendInstallmentReminderSms } from "@/lib/sms";
import { resolveOrderInstallmentWeights, isInstallmentDue } from "@/lib/installment-utils";

// نگهداری تاریخچه آخرین ارسال جهت جلوگیری از ارسال تکراری و تخلیه اعتبار پیامک (Cooldown: 3 minutes)
const smsCooldownMap = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, installmentNumber } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "شناسه سفارش الزامی است." },
        { status: 400 }
      );
    }

    // ۱. بررسی احراز هویت کاربر درخواست‌دهنده
    const cookieHeader = request.headers.get("cookie") || "";
    const authHeader = request.headers.get("authorization") || "";

    const userPb = new PocketBase(process.env.POCKETBASE_URL || "http://127.0.0.1:8090");
    if (cookieHeader) {
      userPb.authStore.loadFromCookie(cookieHeader);
    }
    if (!userPb.authStore.isValid && authHeader) {
      userPb.authStore.save(authHeader.replace("Bearer ", ""), null);
    }

    if (!userPb.authStore.isValid) {
      return NextResponse.json(
        { success: false, message: "احراز هویت جهت ارسال پیامک الزامی است." },
        { status: 401 }
      );
    }

    const caller = userPb.authStore.model as any;
    const isAdmin =
      caller?.role === "admin" ||
      caller?.role === "superadmin" ||
      caller?.collectionName === "_superusers";

    const adminPb = await getAdminPb();

    // ۲. دریافت اطلاعات سفارش از دیتابیس با دسترسی کامل سرور
    const order = await adminPb.collection("orders").getOne(orderId, { requestKey: null });
    if (!order) {
      return NextResponse.json(
        { success: false, message: "سفارش مورد نظر یافت نشد." },
        { status: 404 }
      );
    }

    // کنترل دسترسی: فقط ادمین یا صاحب همان سفارش اجازه درخواست یادآور دارند
    if (!isAdmin && caller?.id !== order.user) {
      return NextResponse.json(
        { success: false, message: "شما اجازه ارسال یادآور برای این سفارش را ندارید." },
        { status: 403 }
      );
    }

    // ۳. مکانیزم Cooldown برای جلوگیری از سوءاستفاده و اسپم پیامکی
    const now = Date.now();
    const lastSent = smsCooldownMap.get(orderId) || 0;
    const cooldownDuration = 3 * 60 * 1000; // ۳ دقیقه

    if (now - lastSent < cooldownDuration) {
      const remainingSeconds = Math.ceil((cooldownDuration - (now - lastSent)) / 1000);
      return NextResponse.json(
        {
          success: false,
          message: `پیامک یادآور قبلاً ارسال شده است. لطفاً ${remainingSeconds} ثانیه دیگر مجدداً تلاش کنید.`,
        },
        { status: 429 }
      );
    }

    const items = Array.isArray(order.items)
      ? order.items
      : typeof order.items === "string"
        ? JSON.parse(order.items)
        : [];

    const installmentItem = items.find((it: any) => it.isInstallment) || items[0];
    const { shareWeight, currentInstallmentNum } = resolveOrderInstallmentWeights(installmentItem);
    const targetInstallment = Number(installmentNumber) || currentInstallmentNum + 1;

    const recipientPhone = order.shippingPhone || "";
    const customerName = order.shippingFullName || "کاربر گرامی";

    // دریافت نرخ روز طلا
    let currentGoldRate = 26500000;
    try {
      const goldRecord = await adminPb.collection("gold_rates").getFirstListItem('symbol = "IR_GOLD_18K"', { requestKey: null });
      if (goldRecord && Number(goldRecord.price) > 0) {
        currentGoldRate = Number(goldRecord.price);
      }
    } catch {
      // استفاده از نرخ پیش‌فرض
    }

    const calculatedAmount = Math.round(shareWeight * currentGoldRate);
    const origin = request.headers.get("origin") || "http://localhost:3000";
    const paymentLink = `${origin}/account/orders/${order.id}/installments`;

    const { dueDateShamsi } = isInstallmentDue(order.created, currentInstallmentNum);

    const smsResult = await sendInstallmentReminderSms({
      phone: recipientPhone,
      customerName,
      orderNumber: order.orderNumber || order.id,
      installmentNumber: targetInstallment,
      shareWeight,
      amount: calculatedAmount,
      dueDateShamsi,
      link: paymentLink,
    });

    if (smsResult.success) {
      smsCooldownMap.set(orderId, now);
    }

    return NextResponse.json({
      success: smsResult.success,
      message: smsResult.statusText,
      result: smsResult,
    });
  } catch (error: any) {
    console.error("SMS trigger error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "خطای ناشناخته در ارسال پیامک." },
      { status: 500 }
    );
  }
}
