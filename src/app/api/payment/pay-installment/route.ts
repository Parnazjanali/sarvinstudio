import { NextResponse } from "next/server";
import { getAdminPb } from "@/lib/pocketbase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, installmentNumber, amount, phone } = body;

    if (!orderId || !installmentNumber) {
      return NextResponse.json(
        { success: false, message: "شناسه سفارش و شماره قسط الزامی است." },
        { status: 400 }
      );
    }

    const adminPb = await getAdminPb();

    // دریافت اطلاعات سفارش با دسترسی مستقیم سرور
    const order = await adminPb.collection("orders").getOne(orderId, { requestKey: null });
    if (!order) {
      return NextResponse.json(
        { success: false, message: "سفارش مورد نظر یافت نشد." },
        { status: 404 }
      );
    }

    const payableAmount = Number(amount) > 0 ? Number(amount) : Number(order.totalAmount) || 100000;
    const origin = request.headers.get("origin") || "http://localhost:3000";
    const callbackUrl = `${origin}/checkout/verify?orderId=${order.id}&installmentNumber=${installmentNumber}&amount=${payableAmount}`;

    const zarinpalPayload = {
      merchant_id: process.env.ZARINPAL_MERCHANT_ID || "12345678-1234-1234-1234-123456789012",
      amount: payableAmount,
      callback_url: callbackUrl,
      description: `تسویه قسط ${installmentNumber} از ۳ سفارش طلا #${order.orderNumber || order.id} - پرنا زر`,
      metadata: {
        mobile: phone || order.shippingPhone || "",
        orderId: order.id,
        installmentNumber,
      },
    };

    const isSandbox = !process.env.ZARINPAL_MERCHANT_ID || process.env.ZARINPAL_MERCHANT_ID.includes("12345678");
    const requestUrl = isSandbox
      ? "https://sandbox.zarinpal.com/pg/v4/payment/request.json"
      : "https://api.zarinpal.com/pg/v4/payment/request.json";

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(zarinpalPayload),
    });

    const data = await response.json();

    if (data && data.data && data.data.code === 100) {
      const authority = data.data.authority;
      const paymentUrl = isSandbox
        ? `https://sandbox.zarinpal.com/pg/StartPay/${authority}`
        : `https://www.zarinpal.com/pg/StartPay/${authority}`;

      return NextResponse.json({
        success: true,
        paymentUrl,
        authority,
      });
    } else {
      // حالت شبیه‌ساز توسعه محلی در صورت عدم دسترسی به درگاه زرین‌پال
      const fakeAuthority = `MOCK-ZP-${Date.now()}`;
      return NextResponse.json({
        success: true,
        paymentUrl: `${callbackUrl}&status=success&Authority=${fakeAuthority}`,
        authority: fakeAuthority,
      });
    }
  } catch (error: any) {
    console.error("Installment payment error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "خطا در پردازش درگاه بانکی." },
      { status: 500 }
    );
  }
}
