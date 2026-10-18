import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, description, callbackUrl, mobile, email, orderId } = body;

    const zarinpalPayload = {
      merchant_id: "12345678-1234-1234-1234-123456789012", // مرچنت سندباکس تستی
      amount: amount || 100000,
      callback_url: callbackUrl || `${request.headers.get("origin")}/checkout/verify?orderId=${orderId}`,
      description: description || "خرید تستی از پرضا گلد",
      metadata: { mobile, email },
    };

    const response = await fetch("https://sandbox.zarinpal.com/pg/v4/payment/request.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(zarinpalPayload),
    });

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Zarinpal proxy error:", error);
    return NextResponse.json({ errors: { message: error.message || "خطای سرور" } }, { status: 500 });
  }
}