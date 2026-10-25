import PocketBase from "pocketbase";

const POCKETBASE_URL =
  process.env.POCKETBASE_URL ||
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  "http://127.0.0.1:8090";

export type AuditLogInput = {
  logCode?: string;

  category:
    | "price"
    | "order"
    | "stock"
    | "auth"
    | "settings"
    | "invoice";

  title: string;
  description?: string;

  operator?: string;
  operatorId?: string;

  ipAddress?: string;

  level?: "info" | "warning" | "error";

  targetId?: string;
  targetType?: string;

  metadata?: Record<string, unknown>;
};

type PBAuthRecord = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

export async function createAuditLog(
  input: AuditLogInput,
  options?: {
    token?: string;
  },
) {
  try {
    const email =
      process.env.POCKETBASE_ADMIN_EMAIL ||
      process.env.PB_SUPERUSER_EMAIL ||
      "";

    const password =
      process.env.POCKETBASE_ADMIN_PASSWORD ||
      process.env.PB_SUPERUSER_PASSWORD ||
      "";

    const pb = new PocketBase(POCKETBASE_URL);

    /*
     * اگر توکن کاربر داریم، اول همان را استفاده می‌کنیم.
     */
    if (options?.token) {
      pb.authStore.save(options.token, null);

      try {
        await pb.collection("users").authRefresh();
      } catch {
        // در صورت نامعتبر بودن توکن کاربر، پایین‌تر Superuser را امتحان می‌کنیم.
      }
    }

    /*
     * اگر احراز هویت انجام نشده، با Superuser وارد شو.
     */
    if (!pb.authStore.isValid) {
      if (!email || !password) {
        console.error(
          "Audit log: PocketBase superuser credentials are missing.",
        );
        return null;
      }

      try {
        await pb.collection("_superusers").authWithPassword(email, password);
      } catch {
        // در نگارش‌های قدیمی‌تر PocketBase
        await pb.admins.authWithPassword(email, password);
      }
    }

    let operator = input.operator || "سیستم خودکار";
    let operatorId = input.operatorId || "";

    /*
     * اگر کاربر لاگین‌شده داشته باشیم، نام او را پیدا می‌کنیم.
     */
    if (pb.authStore.isValid && pb.authStore.record) {
      const record = pb.authStore.record as PBAuthRecord;
      operator = input.operator || record.name || record.email || operator;
      operatorId = input.operatorId || record.id || operatorId;
    }

    // تولید کد خودکار لاگ در صورت نبودن
    let logCode = input.logCode;
    if (!logCode) {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      logCode = `LOG-${randNum}`;
    }

    const data = {
      logCode,
      category: input.category,
      title: input.title,
      description: input.description || "",
      operator,
      operatorId,
      ipAddress: input.ipAddress || "server",
      level: input.level || "info",
      targetId: input.targetId || "",
      targetType: input.targetType || "",
      metadata: input.metadata || {},
    };

    const record = await pb.collection("audit_logs").create(data, {
      requestKey: null,
    });

    return record;
  } catch (error) {
    /*
     * خطای ثبت لاگ نباید باعث خراب شدن عملیات اصلی شود.
     */
    console.error("Audit log creation failed:", error);
    return null;
  }
}