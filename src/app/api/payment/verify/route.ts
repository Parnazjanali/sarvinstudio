import { NextResponse } from "next/server";
import { getAdminPb } from "@/lib/pocketbase";
import { syncOrderToInvoiceAndSettlement } from "@/lib/order-invoice-sync";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, authority, status, zarinpalStatus, installmentNumber } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "شناسه سفارش الزامی است." },
        { status: 400 }
      );
    }

    // ۱. بررسی وضعیت ناموفق بازگشتی از درگاه
    const isFailedStatus =
      status === "failed" ||
      status === "nok" ||
      status === "NOK" ||
      zarinpalStatus === "NOK";

    const adminPb = await getAdminPb();
    const order = await adminPb.collection("orders").getOne(orderId, { requestKey: null });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "سفارش مورد نظر یافت نشد." },
        { status: 404 }
      );
    }

    if (isFailedStatus) {
      // به‌روزرسانی وضعیت سفارش به لغو شده در صورت لزوم
      if (order.paymentStatus === "unpaid") {
        await adminPb.collection("orders").update(
          orderId,
          { paymentStatus: "cancelled" },
          { requestKey: null }
        );
      }
      return NextResponse.json(
        { success: false, message: "تراکنش توسط بانک یا کاربر لغو گردید." },
        { status: 400 }
      );
    }

    // ۲. اعتبارسنجی با درگاه بانکی زرین‌پال
    let isVerified = false;
    let refId = authority || "";

    const merchantId = process.env.ZARINPAL_MERCHANT_ID || "12345678-1234-1234-1234-123456789012";
    const isSandbox = !process.env.ZARINPAL_MERCHANT_ID || process.env.ZARINPAL_MERCHANT_ID.includes("12345678");

    // محاسبه مبلغ قابل پرداخت بر مبنای سفارش یا قسط
    let expectedAmount = Number(order.totalAmount) || 100000;
    if (installmentNumber) {
      const items = Array.isArray(order.items)
        ? order.items
        : typeof order.items === "string"
        ? JSON.parse(order.items)
        : [];
      const instItem = items.find((it: any) => it.isInstallment) || items[0];
      if (instItem) {
        const totalWeight = Number(instItem.weight) || 0;
        const shareWeight = totalWeight > 0 ? totalWeight / 3 : 0;
        // نرخ طلا
        let goldPrice = 26500000;
        try {
          const goldRecord = await adminPb.collection("gold_rates").getFirstListItem('symbol = "IR_GOLD_18K"', { requestKey: null });
          if (goldRecord && Number(goldRecord.price) > 0) {
            goldPrice = Number(goldRecord.price);
          }
        } catch {}
        expectedAmount = Math.round(shareWeight * goldPrice) || expectedAmount;
      }
    }

    // اگر authority مربوط به شبیه‌ساز توسعه محلی باشد
    if (authority && authority.startsWith("MOCK-")) {
      isVerified = true;
      refId = `REF-${authority.replace("MOCK-ZP-", "")}`;
    } else if (authority && (status === "success" || zarinpalStatus === "OK")) {
      // فراخوانی API تایید تراکنش زرین‌پال در سرور
      const verifyUrl = isSandbox
        ? "https://sandbox.zarinpal.com/pg/v4/payment/verify.json"
        : "https://api.zarinpal.com/pg/v4/payment/verify.json";

      try {
        const verifyResponse = await fetch(verifyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            merchant_id: merchantId,
            amount: expectedAmount,
            authority: authority,
          }),
        });

        const verifyData = await verifyResponse.json();

        if (
          verifyData?.data?.code === 100 ||
          verifyData?.data?.code === 101 // تراکنش قبلاً با موفقیت تایید شده
        ) {
          isVerified = true;
          refId = String(verifyData.data.ref_id || authority);
        } else if (isSandbox) {
          // در محیط سندباکس محلی در صورت بروز خطای زرین‌پال، اجازه تست به توسعه‌دهنده داده می‌شود
          isVerified = true;
          refId = `SANDBOX-${authority}`;
        }
      } catch (err) {
        console.error("Zarinpal server verify error:", err);
        if (isSandbox) {
          isVerified = true;
          refId = `FALLBACK-${authority}`;
        }
      }
    }

    if (!isVerified) {
      return NextResponse.json(
        { success: false, message: "اعتبارسنجی تراکنش با درگاه پرداخت ناموفق بود." },
        { status: 400 }
      );
    }

    // ۳. اعمال تغییرات سفارش با دسترسی امن سرور (adminPb)
    if (installmentNumber) {
      const currentInst = Number(installmentNumber);
      const items = Array.isArray(order.items)
        ? order.items
        : typeof order.items === "string"
        ? JSON.parse(order.items)
        : [];

      const updatedItems = items.map((it: any) => {
        if (it.isInstallment) {
          return {
            ...it,
            installmentNumber: currentInst,
          };
        }
        return it;
      });

      const isAllPaid = currentInst >= 3;
      await adminPb.collection("orders").update(
        orderId,
        {
          items: updatedItems,
          paymentStatus: "paid",
          status: isAllPaid ? "processing" : "processing",
        },
        { requestKey: null }
      );

      return NextResponse.json({
        success: true,
        refId,
        isInstallment: true,
        installmentNumber: currentInst,
        message: `قسط ${currentInst} با موفقیت تایید و ثبت گردید.`,
      });
    }

    // حالت تسویه سفارش کامل عادی
    await adminPb.collection("orders").update(
      orderId,
      {
        paymentStatus: "paid",
        status: "processing",
      },
      { requestKey: null }
    );

    // صدور خودکار فاکتور و ایجاد سند تسویه از طریق adminPb
    try {
      await syncOrderToInvoiceAndSettlement(
        orderId,
        {
          paymentMethod: "online",
          trackingCode: refId,
        },
        adminPb
      );
    } catch (syncErr) {
      console.error("Server auto invoice/settlement sync error:", syncErr);
    }

    return NextResponse.json({
      success: true,
      refId,
      message: "پرداخت با موفقیت تایید شد و فاکتور صادر گردید.",
    });
  } catch (error: any) {
    console.error("Payment verification server error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "خطای سرور در تایید پرداخت." },
      { status: 500 }
    );
  }
}
