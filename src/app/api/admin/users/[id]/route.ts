import { NextRequest, NextResponse } from "next/server";
import PocketBase from "pocketbase";

const pocketBaseUrl =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  process.env.POCKETBASE_URL ||
  "http://127.0.0.1:8090";

type UserRole = "user" | "admin";

type UpdateUserPayload = {
  name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  nationalId?: string;
  verified?: boolean;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "شناسه کاربر ارسال نشده است." },
        { status: 400 },
      );
    }

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "توکن احراز هویت ارسال نشده است." },
        { status: 401 },
      );
    }

    const token = authorization.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json(
        { success: false, message: "توکن معتبر نیست." },
        { status: 401 },
      );
    }

    let body: UpdateUserPayload;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "بدنه درخواست معتبر نیست." },
        { status: 400 },
      );
    }

    const superadminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const superadminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!superadminEmail || !superadminPassword) {
      console.error("PocketBase admin environment variables are missing.");
      return NextResponse.json(
        { success: false, message: "تنظیمات ادمین سرور PocketBase کامل نیست." },
        { status: 500 },
      );
    }

    // اتصال با Superuser برای دسترسی کامل و امن
    const adminPb = new PocketBase(pocketBaseUrl);

    try {
      await adminPb.collection("_superusers").authWithPassword(
        superadminEmail,
        superadminPassword,
      );
    } catch (error: any) {
      console.error("PocketBase superuser login error:", error);
      return NextResponse.json(
        { success: false, message: "ورود ادمین به PocketBase ناموفق بود." },
        { status: 500 },
      );
    }

    // بررسی توکن فرستنده با مدیریت خطای 404 (کاربر حذف‌شده یا دیتابیس ریست‌شده)
    let currentUser: any = null;
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const parsedToken = JSON.parse(jsonPayload);

      if (parsedToken && parsedToken.id) {
        try {
          currentUser = await adminPb.collection("users").getOne(parsedToken.id);
        } catch {
          // اگر کاربر در دیتابیس پیدا نشد (مثلاً دیتابیس ریست شده)
          currentUser = null;
        }
      }
    } catch (err) {
      console.error("Token parse error:", err);
    }

    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "نشست شما منقضی شده است. لطفاً مجدداً وارد شوید." },
        { status: 401 },
      );
    }

    // آماده‌سازی فیلدهای آپدیت
    const updateData: Record<string, unknown> = {};

    if (typeof body.name === "string") updateData.name = body.name.trim();
    if (typeof body.email === "string") {
      const email = body.email.trim();
      if (!email) {
        return NextResponse.json({ success: false, message: "ایمیل نمی‌تواند خالی باشد." }, { status: 400 });
      }
      updateData.email = email;
    }
    if (typeof body.phone === "string") updateData.phone = body.phone.trim();
    if (body.role !== undefined) {
      if (body.role !== "user" && body.role !== "admin") {
        return NextResponse.json({ success: false, message: "نقش کاربر معتبر نیست." }, { status: 400 });
      }
      updateData.role = body.role;
    }
    if (typeof body.nationalId === "string") updateData.nationalId = body.nationalId.trim();
    if (typeof body.verified === "boolean") updateData.verified = body.verified;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: "هیچ اطلاعاتی برای ویرایش ارسال نشده است." },
        { status: 400 },
      );
    }

    let updatedUser;

    try {
      updatedUser = await adminPb.collection("users").update(id, updateData);
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          message: error?.response?.message || "ویرایش کاربر در PocketBase انجام نشد.",
          details: error?.response?.data || null,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "اطلاعات کاربر با موفقیت بروزرسانی شد.",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Admin users API error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "خطای نامشخص در ویرایش کاربر." },
      { status: 500 },
    );
  }
}