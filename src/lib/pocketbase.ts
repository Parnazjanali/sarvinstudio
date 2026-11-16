import PocketBase from "pocketbase";


const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return (
    process.env.POCKETBASE_URL ||
    process.env.NEXT_PUBLIC_POCKETBASE_URL ||
    "http://127.0.0.1:8090"
  );
};

const pocketBaseUrl = getBaseUrl();

const pb = new PocketBase(pocketBaseUrl);

export async function getAdminPb(): Promise<PocketBase> {
  const adminPb = new PocketBase(
    process.env.POCKETBASE_URL || "http://127.0.0.1:8090"
  );
  const email = process.env.POCKETBASE_ADMIN_EMAIL || "janaliparnaz@gmail.com";
  const password = process.env.POCKETBASE_ADMIN_PASSWORD || "";

  if (!password) {
    console.warn("⚠️ هشدار امنیتی: POCKETBASE_ADMIN_PASSWORD در متغیرهای محیطی تعریف نشده است.");
  }

  try {
    await adminPb.collection("_superusers").authWithPassword(email, password);
  } catch {
    try {
      // سازگاری با نگارش‌های قبل از PocketBase v0.23
      await (adminPb as any).admins.authWithPassword(email, password);
    } catch (e: any) {
      console.error("Admin PB login error:", e?.message);
    }
  }

  return adminPb;
}

export { pb };
export default pb;