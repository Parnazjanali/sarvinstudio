import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { trackingCode } = await request.json();

    if (!trackingCode) {
      return NextResponse.json(
        { success: false, message: "بارکد پستی وارد نشده است." },
        { status: 400 }
      );
    }

    // اینجا در آینده اگر سرویس API رسمی از پست یا شرکت‌های لجستیکی داشته باشید، فچ می‌کنید.
    // فعلاً به عنوان نمونه یک پاسخ استاندارد برمی‌گردانیم تا لینک مستقیم استفاده شود.
    
    return NextResponse.json({
      success: true,
      trackingUrl: `https://tracking.post.ir/?id=${encodeURIComponent(trackingCode)}`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "خطا در برقراری ارتباط با سامانه پستی." },
      { status: 500 }
    );
  }
}