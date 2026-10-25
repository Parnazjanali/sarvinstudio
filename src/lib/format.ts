export function getPbFileUrl(
  collectionId: string,
  recordId: string,
  filename: string,
): string {
  const base =
    process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";
  return `${base}/api/files/${collectionId}/${recordId}/${filename}`;
}


export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}


export function roundPrice(price: number): number {
  if (!price || isNaN(price)) return 0;
 
  return Math.round(price / 1000) * 1000;
}

export function formatPrice(price: number): string {
  // اول رند می‌کنیم، بعد کاما می‌گذاریم
  return roundPrice(price).toLocaleString("fa-IR");
}

export function numberToWordsPersian(num: number): string {
  if (num === 0) return "صفر تومان";
  if (!Number.isFinite(num)) return "";

  const units = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
  const teens = [
    "ده",
    "یازده",
    "دوازده",
    "سیزده",
    "چهارده",
    "پانزده",
    "شانزده",
    "هفده",
    "هجده",
    "نوزده",
  ];
  const tens = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
  const hundreds = [
    "",
    "یکصد",
    "دویست",
    "سیصد",
    "چهارصد",
    "پانصد",
    "ششصد",
    "هفتصد",
    "هشتصد",
    "نهصد",
  ];
  const thousands = ["", "هزار", "میلیون", "میلیارد", "تریلیون"];

  function convertSection(n: number): string {
    const parts: string[] = [];
    const c = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (c > 0) parts.push(hundreds[c]);

    if (t === 1) {
      parts.push(teens[u]);
    } else {
      if (t > 1) parts.push(tens[t]);
      if (u > 0) parts.push(units[u]);
    }

    return parts.join(" و ");
  }

  let n = Math.abs(Math.round(num));
  const groups: string[] = [];
  let groupIndex = 0;

  while (n > 0) {
    const chunk = n % 1000;
    if (chunk > 0) {
      const chunkStr = convertSection(chunk);
      const suffix = thousands[groupIndex];
      groups.unshift(suffix ? `${chunkStr} ${suffix}` : chunkStr);
    }
    n = Math.floor(n / 1000);
    groupIndex++;
  }

  return (groups.length > 0 ? groups.join(" و ") : "صفر") + " تومان";
}