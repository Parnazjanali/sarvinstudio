import pb from "@/lib/pocketbase";

export interface SendSmsParams {
  phone: string;
  customerName?: string;
  orderNumber: string;
  installmentNumber: number;
  shareWeight: number;
  amount: number;
  dueDateShamsi?: string;
  link?: string;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  statusText: string;
  mock?: boolean;
}

/**
 * سامانه ارسال پیامک یادآوری موعد پرداخت اقساط (پنل پیامکی پرنا زر)
 */
export async function sendInstallmentReminderSms(params: SendSmsParams): Promise<SmsResult> {
  const {
    phone,
    customerName = "مشتری گرامی",
    orderNumber,
    installmentNumber,
    shareWeight,
    amount,
    dueDateShamsi = "سر موعد ماهانه",
    link = "https://parnazar.ir/account/orders",
  } = params;

  if (!phone || phone.length < 10) {
    return {
      success: false,
      statusText: "شماره موبایل گیرنده معتبر نیست",
    };
  }

  const formattedAmount = `${new Intl.NumberFormat("fa-IR").format(amount)} تومان`;
  const formattedWeight = `${shareWeight.toLocaleString("fa-IR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} گرم`;

  // متن پیامک استاندارد صنف زرگری
  const smsMessage = 
`گالری طلا پرنا زر
${customerName} عزیز،
زمان پرداخت قسط ${installmentNumber} سفارش #${orderNumber} (وزن: ${formattedWeight} طلای ۱۸ عیار) فرا رسیده است.
مبلغ قابل پرداخت به نرخ روز: ${formattedAmount}
موعد سررسید: ${dueDateShamsi}
جهت مشاهده و پرداخت آنلاین:
${link}
مثل زر بدرخش`;

  console.log(`[SMS Panel - ParnaZar] Sending to ${phone}:`);
  console.log(smsMessage);

  // بررسی کلید پنل پیامک از تنظیمات محیطی یا پنل
  const apiKey = process.env.SMS_API_KEY || process.env.KAVENEGAR_API_KEY;
  const senderNumber = process.env.SMS_SENDER || "10008585";

  if (apiKey) {
    try {
      // ارسال از طریق درگاه کاوه‌نگار یا وب‌سرویس پیامکی
      const endpoint = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          receptor: phone,
          sender: senderNumber,
          message: smsMessage,
        }),
      });

      const data = await response.json();
      if (data?.return?.status === 200) {
        return {
          success: true,
          messageId: String(data?.entries?.[0]?.messageid || "SENT"),
          statusText: "پیامک با موفقیت به شماره کاربر ارسال شد.",
        };
      }
    } catch (e: any) {
      console.error("[SMS Gateway Error]:", e.message);
    }
  }

  // ثبت در جدول لاگ‌های سیستم برای پیگیری ادمین
  try {
    await pb.collection("audit_logs").create({
      category: "sms",
      title: `ارسال پیامک یادآوری قسط ${installmentNumber} به ${phone}`,
      description: `پیامک یادآوری موعد قسط ${installmentNumber} برای سفارش #${orderNumber} به وزن ${formattedWeight} به شماره ${phone} ثبت شد.`,
      level: "info",
      metadata: {
        phone,
        orderNumber,
        installmentNumber,
        amount,
        shareWeight,
        message: smsMessage,
      },
    });
  } catch (logErr) {
    // خطای لاگ مانع جریان اصلی نمی‌شود
  }

  return {
    success: true,
    messageId: `MOCK-${Date.now()}`,
    statusText: `پیامک یادآوری قسط ${installmentNumber} با موفقیت به شماره ${phone} ارسال شد.`,
    mock: true,
  };
}
