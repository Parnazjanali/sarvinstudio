import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import PocketBase from "pocketbase";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ابتدا بررسی می‌کنیم که آیا مسیر درخواستی از نوع داشبورد است یا خیر.
  if (pathname.startsWith("/dashboard")) {
    const rawPbAuth = request.cookies.get("pb_auth")?.value;
    const directRoleCookie = request.cookies.get("user_role")?.value;
    const directToken = request.cookies.get("token")?.value;

    let authToken: string | undefined = directToken;
    let userRole: string | undefined = directRoleCookie;

    // تلاش برای بازیابی اطلاعات احراز هویت از کوکی پاکت‌بیس
    if (rawPbAuth) {
      try {
        const pb = new PocketBase();
        const cookieHeader = rawPbAuth.startsWith("pb_auth=")
          ? rawPbAuth
          : `pb_auth=${rawPbAuth}`;

        pb.authStore.loadFromCookie(cookieHeader);

        if (pb.authStore.isValid) {
          authToken = pb.authStore.token;
          const model = pb.authStore.model as Record<string, unknown> | null;

          if (model) {
            // تعیین نقش کاربر بر اساس اطلاعات مدل
            if (typeof model.role === "string") {
              userRole = model.role;
            } else if (model.isAdmin === true) {
              userRole = "admin";
            } else if (model.collectionName === "_superusers") {
              userRole = "admin";
            }
          }
        }
      } catch (error) {
        console.error("خطا در بازخوانی کوکی پاکت‌بیس:", error);
        // در صورت بروز خطا، تلاش برای پارس دستی (فال‌بک)
        try {
          let cleanStr = decodeURIComponent(rawPbAuth);
          if (cleanStr.includes("pb_auth=")) {
            cleanStr = cleanStr.substring(cleanStr.indexOf("pb_auth=") + 8);
          }
          if (cleanStr.includes(";")) {
            cleanStr = cleanStr.split(";")[0];
          }
          const parsed = JSON.parse(cleanStr);
          if (parsed?.token) {
            authToken = parsed.token;
          }
          if (parsed?.model?.role) {
            userRole = parsed.model.role;
          } else if (parsed?.model?.isAdmin === true || parsed?.model?.collectionName === "_superusers") {
            userRole = "admin";
          }
        } catch (fallbackError) {
          console.error("خطا در پارس دستی کوکی پاکت‌بیس:", fallbackError);
        }
      }
    }

    // اگر توکن معتبر وجود نداشت، کاربر به صفحه لاگین هدایت می‌شود.
    if (!authToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname); // مسیر فعلی را برای بازگشت ذخیره می‌کنیم
      return NextResponse.redirect(loginUrl);
    }

    // بررسی می‌کنیم که آیا کاربر ادمین است یا خیر.
    const isAdmin =
      userRole === "admin" ||
      userRole === "Admin" ||
      userRole === "superadmin";

    // اگر کاربر ادمین نباشد، به صفحه unauthorized هدایت می‌شود.
    if (!isAdmin) {
      const unauthorizedUrl = new URL("/unauthorized", request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }

    // اگر کاربر ادمین بود و توکن معتبر داشت، اجازه عبور داده می‌شود.
    // این خط مهمترین تغییر است: اگر همه چیز درست بود، اجازه بده مسیر اجرا شود.
    return NextResponse.next();
  }

  // برای تمام مسیرهای دیگر (خارج از /dashboard)، اجازه عبور عادی داده می‌شود.
  return NextResponse.next();
}

export const config = {
  // این matcher فقط روی مسیرهایی که با dashboard شروع می‌شوند اعمال می‌شود.
  matcher: ["/dashboard/:path*"],
};
