import { NextRequest, NextResponse } from "next/server";
import PocketBase from "pocketbase";

const pocketBaseUrl =
  process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";

type LogCategory =
  | "price"
  | "order"
  | "stock"
  | "auth"
  | "settings"
  | "invoice";

type LogLevel = "info" | "warning" | "error";

type CreateLogPayload = {
  category: LogCategory;
  title: string;
  description?: string;
  level?: LogLevel;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
};

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");

  if (realIp) {
    return realIp.trim();
  }

  return "";
}

async function authenticateAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("AUTH_REQUIRED");
  }

  const token = authorization.replace("Bearer ", "").trim();

  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  const userPb = new PocketBase(pocketBaseUrl);

  userPb.authStore.save(token, null);

  try {
    const authResult = await userPb
      .collection("users")
      .authRefresh();

    const user = authResult.record;

    if (!user) {
      throw new Error("AUTH_INVALID");
    }

    if (user.role !== "admin") {
      throw new Error("ADMIN_REQUIRED");
    }

    return user;
  } catch (error) {
    if (
      error instanceof Error &&
      ["AUTH_INVALID", "ADMIN_REQUIRED"].includes(error.message)
    ) {
      throw error;
    }

    throw new Error("AUTH_INVALID");
  }
}

async function getSuperuserPb() {
  const superadminEmail =
    process.env.POCKETBASE_ADMIN_EMAIL || process.env.PB_SUPERUSER_EMAIL;
  const superadminPassword =
    process.env.POCKETBASE_ADMIN_PASSWORD || process.env.PB_SUPERUSER_PASSWORD;

  if (!superadminEmail || !superadminPassword) {
    throw new Error("SUPERUSER_CONFIG_MISSING");
  }

  const adminPb = new PocketBase(pocketBaseUrl);

  try {
    await adminPb
      .collection("_superusers")
      .authWithPassword(
        superadminEmail,
        superadminPassword,
      );
  } catch {
    await adminPb.admins.authWithPassword(
      superadminEmail,
      superadminPassword,
    );
  }

  return adminPb;
}

/**
 * GET /api/admin/logs
 *
 * دریافت لاگ‌ها برای پنل مدیریت
 */
export async function GET(request: NextRequest) {
  try {
    await authenticateAdmin(request);

    const adminPb = await getSuperuserPb();

    const searchParams = request.nextUrl.searchParams;

    const page = Math.max(
      Number(searchParams.get("page") || "1"),
      1,
    );

    const perPage = Math.min(
      Math.max(
        Number(searchParams.get("perPage") || "50"),
        1,
      ),
      100,
    );

    const category = searchParams.get("category") || "";
    const search = searchParams.get("search") || "";

    const filters: string[] = [];

    if (category && category !== "all") {
      filters.push(`category = "${category}"`);
    }

    if (search.trim()) {
      const safeSearch = search
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"');

      filters.push(
        `(title ~ "${safeSearch}" || description ~ "${safeSearch}" || operator ~ "${safeSearch}" || logCode ~ "${safeSearch}")`,
      );
    }

    const result = await adminPb
      .collection("audit_logs")
      .getList(page, perPage, {
        sort: "-created",
        filter:
          filters.length > 0
            ? filters.join(" && ")
            : undefined,
      });

    return NextResponse.json({
      success: true,
      items: result.items,
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error("GET admin logs error:", error);

    if (
      error instanceof Error &&
      error.message === "AUTH_REQUIRED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "توکن احراز هویت ارسال نشده است.",
        },
        { status: 401 },
      );
    }

    if (
      error instanceof Error &&
      error.message === "AUTH_INVALID"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "نشست کاربر معتبر نیست.",
        },
        { status: 401 },
      );
    }

    if (
      error instanceof Error &&
      error.message === "ADMIN_REQUIRED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "دسترسی فقط برای مدیر مجاز است.",
        },
        { status: 403 },
      );
    }

    if (
      error instanceof Error &&
      error.message === "SUPERUSER_CONFIG_MISSING"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "تنظیمات Superuser سرور کامل نیست.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "دریافت لاگ‌ها انجام نشد.",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/logs
 *
 * ثبت لاگ جدید
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await authenticateAdmin(request);

    let body: CreateLogPayload;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "بدنه درخواست معتبر نیست.",
        },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          message: "اطلاعات لاگ معتبر نیست.",
        },
        { status: 400 },
      );
    }

    const validCategories: LogCategory[] = [
      "price",
      "order",
      "stock",
      "auth",
      "settings",
      "invoice",
    ];

    const validLevels: LogLevel[] = [
      "info",
      "warning",
      "error",
    ];

    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        {
          success: false,
          message: "دسته‌بندی لاگ معتبر نیست.",
        },
        { status: 400 },
      );
    }

    if (!body.title?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "عنوان لاگ الزامی است.",
        },
        { status: 400 },
      );
    }

    const level = body.level || "info";

    if (!validLevels.includes(level)) {
      return NextResponse.json(
        {
          success: false,
          message: "سطح لاگ معتبر نیست.",
        },
        { status: 400 },
      );
    }

    const adminPb = await getSuperuserPb();

    const lastLog = await adminPb
      .collection("audit_logs")
      .getList(1, 1, {
        sort: "-created",
      });

    let nextNumber = 1;

    if (lastLog.items.length > 0) {
      const lastCode = String(
        lastLog.items[0].logCode || "",
      );

      const match = lastCode.match(/LOG-(\d+)/);

      if (match) {
        nextNumber = Number(match[1]) + 1;
      }
    }

    const logCode = `LOG-${String(nextNumber).padStart(4, "0")}`;

    const ipAddress = getClientIp(request);

    const record = await adminPb
      .collection("audit_logs")
      .create({
        logCode,
        category: body.category,
        title: body.title.trim(),
        description:
          typeof body.description === "string"
            ? body.description.trim()
            : "",
        operator:
          currentUser.name?.trim() ||
          currentUser.email ||
          "ادمین",
        operatorId: currentUser.id,
        ipAddress,
        level,
        targetId: body.targetId || "",
        targetType: body.targetType || "",
        metadata: body.metadata || {},
      });

    return NextResponse.json(
      {
        success: true,
        message: "لاگ با موفقیت ثبت شد.",
        log: record,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST admin logs error:", error);

    if (
      error instanceof Error &&
      error.message === "AUTH_REQUIRED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "توکن احراز هویت ارسال نشده است.",
        },
        { status: 401 },
      );
    }

    if (
      error instanceof Error &&
      error.message === "AUTH_INVALID"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "نشست کاربر معتبر نیست.",
        },
        { status: 401 },
      );
    }

    if (
      error instanceof Error &&
      error.message === "ADMIN_REQUIRED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "دسترسی فقط برای مدیر مجاز است.",
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "ثبت لاگ انجام نشد.",
      },
      { status: 500 },
    );
  }
}