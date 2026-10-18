import { NextRequest, NextResponse } from "next/server";
import PocketBase from "pocketbase";

const PB_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";

async function getAdminUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return null;
  }

  const pb = new PocketBase(PB_URL);
  pb.authStore.save(token, null);

  try {
    const user = await pb.collection("users").authRefresh();

    if (String(user.record.role ?? "") !== "admin") {
      return null;
    }

    return {
      pb,
      user: user.record,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAdminUser(request);

    if (!auth) {
      return NextResponse.json(
        { error: "دسترسی غیرمجاز" },
        { status: 401 }
      );
    }

    const { pb } = auth;

  const records = await pb.collection("settings").getList(1, 1);

    if (!records.items.length) {
      return NextResponse.json(
        { error: "تنظیمات پیدا نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: records.items[0],
    });
  } catch (error) {
    console.error("GET /api/admin/settings error:", error);

    return NextResponse.json(
      { error: "خطا در دریافت تنظیمات" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAdminUser(request);

    if (!auth) {
      return NextResponse.json(
        { error: "دسترسی غیرمجاز" },
        { status: 401 }
      );
    }

    const { pb, user } = auth;

    const body = await request.json();

  const records = await pb.collection("settings").getList(1, 1);

    if (!records.items.length) {
      return NextResponse.json(
        { error: "رکورد تنظیمات پیدا نشد" },
        { status: 404 }
      );
    }

    const settings = records.items[0];

    const allowedFields = [
      "profitMargin",
      "vatPercent",
      "defaultWagePercent",
      "defaultRawGoldFeePercent",
      "defaultStoneFeePercent",
      "installmentFeePercent",
      "roundingUnit",

      "storeName",
      "storePhone",
      "storeMobile",
      "storeEmail",
      "storeAddress",
      "storeInstagram",
      "storeTelegram",
      "storeBale",

      "invoicePrefix",
      "invoiceFooter",
      "invoiceTerms",
      "invoiceWarrantyText",

      "allowInstallment",
      "installmentMonths",
      "minInstallmentAmount",
      "stockReservationHours",
      "allowOutOfStockOrder",
      "requireCustomerPhone",
      "requireCustomerAddress",

      "maintenanceMode",
      "allowNewOrders",
      "allowUserRegistration",
      "requireEmailVerification",
      "sessionTimeout",
      "defaultPageSize",
    ];

    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updateData[field] = body[field];
      }
    }

    const updated = await pb
      .collection("settings")
      .update(settings.id, updateData);

    // Audit log
    try {
      await pb.collection("audit_logs").create({
        logCode: "SETTINGS_UPDATED",
        category: "settings",
        title: "تنظیمات فروشگاه بروزرسانی شد",
        operator: String(user.name || user.email || "admin"),
        level: "info",
        operatorId: user.id,
        targetId: updated.id,
        targetType: "settings",
        description: "تنظیمات داشبورد توسط مدیر بروزرسانی شد",
      });
    } catch (logError) {
      console.error("Audit log error:", logError);
    }

    return NextResponse.json({
      success: true,
      message: "تنظیمات با موفقیت ذخیره شد",
      data: updated,
    });
  } catch (error) {
    console.error("PUT /api/admin/settings error:", error);

    return NextResponse.json(
      { error: "خطا در ذخیره تنظیمات" },
      { status: 500 }
    );
  }
}