import { NextResponse } from "next/server";
import PocketBase from "pocketbase";

const PB_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";

export async function GET() {
  try {
    const pb = new PocketBase(PB_URL);
    const records = await pb.collection("settings").getList(1, 1);

    if (!records.items.length) {
      return NextResponse.json({
        success: true,
        data: {
          fontHeading: "Doran",
          fontBody: "IRANSans",
          fontPrint: "IRANSans",
          customFonts: [],
          storeName: "پرنا زر",
        },
      });
    }

    const s = records.items[0];

    let customFonts = [];
    try {
      if (Array.isArray(s.customFonts)) {
        customFonts = s.customFonts;
      } else if (typeof s.customFonts === "string" && s.customFonts) {
        customFonts = JSON.parse(s.customFonts);
      }
    } catch {
      customFonts = [];
    }

    return NextResponse.json({
      success: true,
      data: {
        id: s.id,
        storeName: s.storeName || "پرنا زر",
        storePhone: s.storePhone || "",
        storeMobile: s.storeMobile || "",
        storeEmail: s.storeEmail || "",
        storeAddress: s.storeAddress || "",
        storeInstagram: s.storeInstagram || "",
        storeTelegram: s.storeTelegram || "",
        storeBale: s.storeBale || "",
        allowInstallment: Boolean(s.allowInstallment),
        installmentMonths: Number(s.installmentMonths || 3),
        minInstallmentAmount: Number(s.minInstallmentAmount || 0),
        vatPercent: Number(s.vatPercent || 9),
        profitMargin: Number(s.profitMargin || 7),
        roundingUnit: Number(s.roundingUnit || 1000),
        fontHeading: s.fontHeading || "Doran",
        fontBody: s.fontBody || "IRANSans",
        fontPrint: s.fontPrint || "IRANSans",
        fontHeadingSize: Number(s.fontHeadingSize || 100),
        fontBodySize: Number(s.fontBodySize || 14),
        fontPrintSize: Number(s.fontPrintSize || 11),
        customFonts: customFonts,
      },
    });
  } catch (error) {
    console.error("GET /api/settings/public error:", error);
    return NextResponse.json(
      {
        success: true,
        data: {
          fontHeading: "Doran",
          fontBody: "IRANSans",
          fontPrint: "IRANSans",
          fontHeadingSize: 100,
          fontBodySize: 14,
          fontPrintSize: 11,
          customFonts: [],
          storeName: "پرنا زر",
        },
      },
      { status: 200 }
    );
  }
}
