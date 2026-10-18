import PocketBase from "pocketbase";

const POCKETBASE_URL =
  process.env.POCKETBASE_URL || "http://127.0.0.1:8090";

export type AuditLogInput = {
  logCode: string;

  category:
    | "price"
    | "order"
    | "stock"
    | "auth"
    | "settings";

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
      process.env.POCKETBASE_ADMIN_EMAIL || "";

    const password =
      process.env.POCKETBASE_ADMIN_PASSWORD || "";

    const pb = new PocketBase(POCKETBASE_URL);

    /*
     * اگر توکن کاربر داریم، اول همان را استفاده می‌کنیم.
     * در غیر این صورت برای ثبت لاگ سیستمی از Superuser
     * استفاده می‌کنیم.
     */
    if (options?.token) {
      pb.authStore.save(options.token, null);

      try {
        await pb.collection("users").authRefresh();
      } catch {
        // اگر توکن کاربر معتبر نبود، پایین‌تر Superuser را امتحان می‌کنیم.
      }
    }

    /*
     * اگر احراز هویت انجام نشده، با Superuser وارد شو.
     */
    if (!pb.authStore.isValid) {
      if (!email || !password) {
        console.error(
          "Audit log: PocketBase admin credentials are missing.",
        );

        return null;
      }

      await pb.admins.authWithPassword(
        email,
        password,
      );
    }

    let operator = input.operator || "سیستم";
    let operatorId = input.operatorId || "";

    /*
     * اگر کاربر لاگین‌شده داشته باشیم، نام او را پیدا می‌کنیم.
     */
    if (
      pb.authStore.isValid &&
      pb.authStore.record
    ) {
      const record =
        pb.authStore.record as PBAuthRecord;

      operator =
        input.operator ||
        record.name ||
        record.email ||
        operator;

      operatorId =
        input.operatorId ||
        record.id ||
        operatorId;
    }

    const data = {
      logCode: input.logCode,

      category: input.category,

      title: input.title,

      description:
        input.description || "",

      operator,

      operatorId,

      ipAddress:
        input.ipAddress || "server",

      level:
        input.level || "info",

      targetId:
        input.targetId || "",

      targetType:
        input.targetType || "",

      metadata:
        input.metadata || {},
    };

    const record =
      await pb
        .collection("audit_logs")
        .create(data, {
          requestKey: null,
        });

    return record;
  } catch (error) {
    /*
     * خطای ثبت لاگ نباید باعث خراب شدن عملیات اصلی شود.
     */
    console.error(
      "Audit log creation failed:",
      error,
    );

    return null;
  }
}