/**
 * ابزارها و محاسبات استاندارد طرح اقساط طلایی پرنا زر
 * 
 * قوانین تجاری:
 * ۱. گرد کردن وزن اقساط تا دقیقاً ۲ رقم اعشار (استاندارد صنف طلا).
 * ۲. جلوگیری از باگ تقسیم مکرر وزن قسطی شده بر ۳.
 * ۳. سررسید ماهانه ۳۰ روزه (سر هر برج) برای قسط دوم و سوم.
 * ۴. محاسبه قیمت روز قسط بر پایه مظنه لحظه‌ای طلا.
 */

/**
 * گرد کردن وزن طلا تا دو رقم اعشار
 */
export function roundGoldWeight(weight: number | string | undefined | null): number {
  const num = Number(weight);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100) / 100;
}

/**
 * فرمت‌بندی وزن طلا برای نمایش در UI (مثلاً "۲.۲۷ گرم")
 */
export function formatGoldWeight(weight: number | string | undefined | null): string {
  const rounded = roundGoldWeight(weight);
  return `${rounded.toLocaleString("fa-IR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} گرم`;
}

/**
 * استخراج و تفکیک وزن کل و وزن سهمی هر قسط از آیتم سفارش
 * این تابع باگ تقسیم مکرر وزن قسطی شده بر ۳ را به طور کامل حل می‌کند
 */
export function resolveOrderInstallmentWeights(item: any): {
  totalWeight: number;
  shareWeight: number;
  installmentCount: number;
  currentInstallmentNum: number;
  isInstallment: boolean;
} {
  const isInstallment = Boolean(item?.isInstallment);
  const installmentCount = Number(item?.installmentTotalCount) || 3;
  const currentInstallmentNum = Number(item?.installmentNumber) || 1;

  if (!item) {
    return {
      totalWeight: 0,
      shareWeight: 0,
      installmentCount: 3,
      currentInstallmentNum: 1,
      isInstallment: false,
    };
  }

  // ۱. اگر totalWeight مستقیماً در سفارش ثبت شده بود
  if (item.totalWeight && Number(item.totalWeight) > 0) {
    const totalWeight = roundGoldWeight(item.totalWeight);
    const shareWeight = item.installmentWeight
      ? roundGoldWeight(item.installmentWeight)
      : roundGoldWeight(totalWeight / installmentCount);
    return { totalWeight, shareWeight, installmentCount, currentInstallmentNum, isInstallment };
  }

  // ۲. اگر installmentWeight ثبت شده بود
  if (item.installmentWeight && Number(item.installmentWeight) > 0) {
    const shareWeight = roundGoldWeight(item.installmentWeight);
    const totalWeight = roundGoldWeight(shareWeight * installmentCount);
    return { totalWeight, shareWeight, installmentCount, currentInstallmentNum, isInstallment };
  }

  // ۳. در رکوردهای قبلی که فقط فیلد weight ذخیره شده بود
  const rawW = Number(item.weight) || 0;
  if (isInstallment) {
    // بررسی عنوان برای یافتن وزن سهمی ذخیره شده در متن (مثلاً "وزن سهمی: 2.267 گرم")
    const titleMatch = typeof item.productTitle === "string"
      ? item.productTitle.match(/وزن سهمی:\s*([\d.]+)/)
      : null;

    if (titleMatch && Number(titleMatch[1]) > 0) {
      const shareWeight = roundGoldWeight(titleMatch[1]);
      const totalWeight = roundGoldWeight(shareWeight * installmentCount);
      return { totalWeight, shareWeight, installmentCount, currentInstallmentNum, isInstallment: true };
    }

    // اگر عنوان عبارت نداشت، در سیستم سفارش قبلی weight همان سهم قسط اول ذخیره شده بود
    const shareWeight = roundGoldWeight(rawW);
    const totalWeight = roundGoldWeight(shareWeight * installmentCount);
    return { totalWeight, shareWeight, installmentCount, currentInstallmentNum, isInstallment: true };
  }

  // برای سفارشات نقدی
  const totalWeight = roundGoldWeight(rawW);
  const shareWeight = roundGoldWeight(totalWeight / installmentCount);
  return { totalWeight, shareWeight, installmentCount, currentInstallmentNum, isInstallment: false };
}

/**
 * محاسبه تاریخ سررسید قسط بر اساس تاریخ ثبت سفارش (۳۰ روزه / سر هر برج)
 */
export function getInstallmentDueDate(orderCreatedAt: string | Date, installmentNumber: number): Date {
  const d = new Date(orderCreatedAt);
  if (Number.isNaN(d.getTime())) return new Date();

  // قسط ۱: روز ثبت سفارش (روز صفر)
  // قسط ۲: بعد از ۱ ماه (۳۰ روز)
  // قسط ۳: بعد از ۲ ماه (۶۰ روز)
  const offsetDays = Math.max(0, (installmentNumber - 1) * 30);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

/**
 * فرمت‌بندی تاریخ شمسی برای نمایش در جداول و پیامک‌ها
 */
export function formatShamsiDate(date: Date | string): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  } catch {
    return "-";
  }
}

/**
 * بررسی اینکه آیا زمان پرداخت قسط فرا رسیده است یا خیر (سر برج / سررسید)
 * اگر ۳ روز مانده به سررسید یا سررسید گذشته باشد، true برمی‌گرداند
 */
export function isInstallmentDue(
  orderCreatedAt: string | Date,
  currentPaidCount: number
): {
  isDue: boolean;
  nextInstallmentNumber: number;
  dueDate: Date;
  dueDateShamsi: string;
  daysRemaining: number;
  isOverdue: boolean;
} {
  const nextInstallmentNumber = currentPaidCount + 1;
  if (nextInstallmentNumber > 3) {
    return {
      isDue: false,
      nextInstallmentNumber: 3,
      dueDate: new Date(),
      dueDateShamsi: "-",
      daysRemaining: 0,
      isOverdue: false,
    };
  }

  const dueDate = getInstallmentDueDate(orderCreatedAt, nextInstallmentNumber);
  const now = new Date();

  // اختلاف بر حسب روز
  const diffTime = dueDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // موعد فرا رسیده است اگر سررسید رسیده یا کمتر از ۳ روز مانده باشد
  const isDue = daysRemaining <= 3;
  const isOverdue = daysRemaining < 0;

  return {
    isDue,
    nextInstallmentNumber,
    dueDate,
    dueDateShamsi: formatShamsiDate(dueDate),
    daysRemaining,
    isOverdue,
  };
}
