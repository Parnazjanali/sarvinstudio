import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import PocketBase from "pocketbase";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // بررسی مسیرهای حساس داشبورد مدیریت
  if (pathname.startsWith("/dashboard")) {
    const rawPbAuth = request.cookies.get("pb_auth")?.value;

    let isValidAdmin = false;

    if (rawPbAuth) {
      try {
        const pb = new PocketBase();
        const cookieHeader = rawPbAuth.startsWith("pb_auth=")
          ? rawPbAuth
          : `pb_auth=${rawPbAuth}`;

        pb.authStore.loadFromCookie(cookieHeader);

        // توکن باید معتبر، امضا شده و تاریخ انقضا نگذشته باشد
        if (pb.authStore.isValid && pb.authStore.token) {
          const model = pb.authStore.model as Record<string, unknown> | null;

          if (model) {
            const role = typeof model.role === "string" ? model.role.toLowerCase() : "";
            const isSuperuser = model.collectionName === "_superusers";
            const isAdminFlag = model.isAdmin === true;

            if (role === "admin" || role === "superadmin" || isSuperuser || isAdminFlag) {
              isValidAdmin = true;
            }
          }
        }
      } catch (error) {
        console.error("Middleware PB auth validation error:", error);
      }
    }

    // در صورت عدم احراز هویت ادمین، هدایت به صفحه لاگین
    if (!isValidAdmin) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
