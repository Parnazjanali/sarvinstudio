import { NextRequest, NextResponse } from "next/server";
import PocketBase from "pocketbase";

const PB_URL =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  process.env.POCKETBASE_URL;

const getPocketBase = () => {
  if (!PB_URL) {
    throw new Error(
      "PocketBase URL در environment variables تنظیم نشده است.",
    );
  }

  return new PocketBase(PB_URL);
};

const jsonResponse = (
  data: unknown,
  status = 200,
) => {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
};

export async function GET(request: NextRequest) {
  try {
    /*
     * -----------------------------------------
     * 1. دریافت Authorization
     * -----------------------------------------
     */

    const authorization =
      request.headers.get("authorization");

    if (!authorization) {
      return jsonResponse(
        {
          success: false,
          message:
            "هدر Authorization ارسال نشده است.",
        },
        401,
      );
    }

    const [scheme, token] =
      authorization.split(" ");

    if (
      scheme !== "Bearer" ||
      !token
    ) {
      return jsonResponse(
        {
          success: false,
          message:
            "توکن احراز هویت نامعتبر است.",
        },
        401,
      );
    }

    /*
     * -----------------------------------------
     * 2. اتصال به PocketBase
     * -----------------------------------------
     */

    const pb = getPocketBase();

    /*
     * -----------------------------------------
     * 3. اعتبارسنجی Token
     * -----------------------------------------
     */

    pb.authStore.save(token, null);

    try {
      await pb.collection("users").authRefresh();
    } catch (authError) {
      console.error(
        "Audit logs auth error:",
        authError,
      );

      pb.authStore.clear();

      return jsonResponse(
        {
          success: false,
          message:
            "نشست کاربری معتبر نیست. لطفاً دوباره وارد شوید.",
        },
        401,
      );
    }

    /*
     * -----------------------------------------
     * 4. بررسی Admin
     * -----------------------------------------
     */

    const currentUser =
      pb.authStore.record;

    if (!currentUser) {
      pb.authStore.clear();

      return jsonResponse(
        {
          success: false,
          message:
            "کاربر احراز هویت‌شده پیدا نشد.",
        },
        401,
      );
    }

    /*
     * PocketBase RecordModel در نسخه فعلی
     * متد get() ندارد؛ بنابراین مستقیم
     * به property دسترسی پیدا می‌کنیم.
     */

    const role =
      String(currentUser.role ?? "");

    if (role !== "admin") {
      return jsonResponse(
        {
          success: false,
          message:
            "شما دسترسی مشاهده لاگ‌های سیستم را ندارید.",
        },
        403,
      );
    }

    /*
     * -----------------------------------------
     * 5. Query Parameters
     * -----------------------------------------
     */

    const { searchParams } =
      new URL(request.url);

    const pageParam = Number(
      searchParams.get("page") || "1",
    );

    const perPageParam = Number(
      searchParams.get("perPage") || "100",
    );

    const category = (
      searchParams.get("category") ||
      "all"
    ).trim();

    const search = (
      searchParams.get("search") || ""
    ).trim();

    /*
     * -----------------------------------------
     * 6. اعتبارسنجی Pagination
     * -----------------------------------------
     */

    const page =
      Number.isFinite(pageParam) &&
      pageParam > 0
        ? Math.floor(pageParam)
        : 1;

    const perPage =
      Number.isFinite(perPageParam) &&
      perPageParam > 0
        ? Math.min(
            Math.floor(perPageParam),
            200,
          )
        : 100;

    /*
     * -----------------------------------------
     * 7. ساخت Filter
     * -----------------------------------------
     */

    const filters: string[] = [];

    const validCategories = [
      "price",
      "order",
      "stock",
      "auth",
      "settings",
      "invoice",
    ];

    /*
     * Category filter
     */

    if (
      category !== "all" &&
      validCategories.includes(category)
    ) {
      filters.push(
        `category = "${category}"`,
      );
    }

    /*
     * Search filter
     */

    if (search) {
      const escapedSearch =
        search
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"');

      filters.push(
        [
          `logCode ~ "${escapedSearch}"`,
          `title ~ "${escapedSearch}"`,
          `description ~ "${escapedSearch}"`,
          `operator ~ "${escapedSearch}"`,
          `ipAddress ~ "${escapedSearch}"`,
        ].join(" || "),
      );
    }

    const filter =
      filters.length > 0
        ? filters.join(" && ")
        : "";

    /*
     * -----------------------------------------
     * 8. دریافت لاگ‌ها
     * -----------------------------------------
     */

    const result =
      await pb
        .collection("audit_logs")
        .getList(
          page,
          perPage,
          {
            filter,
            sort: "-created",
          },
        );

    /*
     * -----------------------------------------
     * 9. تبدیل Recordها
     * -----------------------------------------
     */

    const items =
      result.items.map((record) => {
        return {
          id: record.id,

          collectionId:
            record.collectionId,

          collectionName:
            record.collectionName,

          created:
            record.created,

          updated:
            record.updated,

          logCode: String(
            record.logCode ?? "",
          ),

          category: String(
            record.category ??
              "settings",
          ),

          title: String(
            record.title ?? "",
          ),

          description: String(
            record.description ?? "",
          ),

          operator: String(
            record.operator ?? "",
          ),

          operatorId: String(
            record.operatorId ?? "",
          ),

          ipAddress: String(
            record.ipAddress ?? "",
          ),

          timestamp: String(
            record.timestamp ??
              record.created ??
              "",
          ),

          level: String(
            record.level ?? "info",
          ),

          targetId: String(
            record.targetId ?? "",
          ),

          targetType: String(
            record.targetType ?? "",
          ),

          metadata:
            record.metadata &&
            typeof record.metadata ===
              "object"
              ? record.metadata
              : {},
        };
      });

    /*
     * -----------------------------------------
     * 10. Response
     * -----------------------------------------
     */

    return jsonResponse({
      success: true,

      items,

      page: result.page,

      perPage:
        result.perPage,

      totalItems:
        result.totalItems,

      totalPages:
        result.totalPages,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/logs error:",
      error,
    );

    let message =
      "خطا در دریافت لاگ‌های سیستم.";

    if (error instanceof Error) {
      message =
        error.message ||
        message;
    }

    return jsonResponse(
      {
        success: false,
        message,
      },
      500,
    );
  }
}