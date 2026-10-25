import { NextRequest, NextResponse } from "next/server";
import PocketBase from "pocketbase";
import fs from "fs/promises";
import path from "path";

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

export async function POST(request: NextRequest) {
  try {
    const auth = await getAdminUser(request);

    if (!auth) {
      return NextResponse.json(
        { error: "دسترسی غیرمجاز. فقط مدیران می‌توانند فونت آپلود کنند." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fontName = (formData.get("name") as string)?.trim() || "";
    const fontFamily = (formData.get("family") as string)?.trim() || "";

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "هیچ فایلی برای آپلود انتخاب نشده است." },
        { status: 400 }
      );
    }

    const originalName = file.name || "font.woff2";
    const ext = path.extname(originalName).toLowerCase();
    const allowedExtensions = [".woff2", ".woff", ".ttf", ".otf"];

    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: `فرمت فایل غیرمجاز است. فرمت‌های مجاز: ${allowedExtensions.join(", ")}` },
        { status: 400 }
      );
    }

    // Determine font family and display name if not explicitly provided
    const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, "_");
    const safeFamily = (fontFamily || baseName).replace(/[^a-zA-Z0-9_\-]/g, "");
    const safeName = fontName || baseName;

    // Generate safe unique filename
    const timestamp = Date.now();
    const fileName = `${safeFamily.toLowerCase() || "custom-font"}-${timestamp}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "fonts", "custom");

    await fs.mkdir(uploadDir, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = path.join(uploadDir, fileName);

    await fs.writeFile(filePath, buffer);

    const publicUrl = `/fonts/custom/${fileName}`;
    const formatName = ext === ".woff2" ? "woff2" : ext === ".woff" ? "woff" : ext === ".otf" ? "opentype" : "truetype";

    const newFont = {
      id: `font_${timestamp}`,
      name: safeName,
      family: safeFamily || `CustomFont_${timestamp}`,
      url: publicUrl,
      format: formatName,
      createdAt: new Date().toISOString(),
    };

    // Update settings in PocketBase with the new custom font
    try {
      const records = await auth.pb.collection("settings").getList(1, 1);
      if (records.items.length) {
        const settingsRecord = records.items[0];
        let existingCustomFonts: Array<{ id: string; name: string; family: string; url: string; format?: string }> = [];
        try {
          if (Array.isArray(settingsRecord.customFonts)) {
            existingCustomFonts = settingsRecord.customFonts;
          } else if (typeof settingsRecord.customFonts === "string" && settingsRecord.customFonts) {
            existingCustomFonts = JSON.parse(settingsRecord.customFonts);
          }
        } catch {
          existingCustomFonts = [];
        }

        const updatedCustomFonts = [...existingCustomFonts, newFont];
        await auth.pb.collection("settings").update(settingsRecord.id, {
          customFonts: updatedCustomFonts,
        });
      }
    } catch (saveError) {
      console.warn("Could not auto-append to settings.customFonts:", saveError);
    }

    return NextResponse.json({
      success: true,
      message: `فونت «${safeName}» با موفقیت آپلود شد`,
      font: newFont,
    });
  } catch (error) {
    console.error("POST /api/admin/fonts/upload error:", error);
    return NextResponse.json(
      { error: "خطا در آپلود فایل فونت" },
      { status: 500 }
    );
  }
}
