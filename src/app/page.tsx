import pb from "@/lib/pocketbase";
import LandingUI from "@/components/LandingUI";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let products = [];

  try {
    // گرفتن لیست محصولات از کالکشن products در PocketBase
    // با تنظیم requestKey به null، قابلیت auto-cancellation غیرفعال میشه
    const records = await pb.collection("products").getFullList({
      sort: "-created",
      requestKey: null, 
    });
    
    // تبدیل آبجکت‌های پاکت‌بیس به فرمت استاندارد جاوااسکریپت برای پاس دادن به کامپوننت کلاینت
    products = JSON.parse(JSON.stringify(records));
  } catch (error) {
    console.error("Error fetching products from PocketBase:", error);
  }

  return (
    <LandingUI initialProducts={products} />
  );
}
