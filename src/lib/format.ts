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