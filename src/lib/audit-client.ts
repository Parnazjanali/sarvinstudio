import { pb } from "@/lib/pocketbase";

export type ClientAuditLogInput = {
  logCode?: string;
  category: "price" | "order" | "stock" | "auth" | "settings" | "invoice";
  title: string;
  description?: string;
  operator?: string;
  operatorId?: string;
  level?: "info" | "warning" | "error";
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
};

/**
 * ثبت خودکار لاگ رویداد از سمت کلاینت داشبورد با نشست کاربر احراز هویت شده
 */
export async function recordAuditLogClient(input: ClientAuditLogInput) {
  try {
    const user = pb.authStore.record;
    const operator =
      input.operator ||
      (user ? String(user.name || user.email || "ادمین گالری") : "ادمین گالری");
    const operatorId = input.operatorId || (user ? String(user.id) : "");

    // ایجاد کد لاگ خودکار در صورت عدم ارسال
    let logCode = input.logCode;
    if (!logCode) {
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      logCode = `LOG-${randomSeq}`;
    }

    const payload = {
      logCode,
      category: input.category,
      title: input.title,
      description: input.description || "",
      operator,
      operatorId,
      ipAddress: "داشبورد مدیریت",
      level: input.level || "info",
      targetId: input.targetId || "",
      targetType: input.targetType || "",
      metadata: input.metadata || {},
    };

    // اگر کاربر ادمین لاگین است، مستقیماً رکورد PocketBase را می‌سازیم
    if (pb.authStore.isValid) {
      return await pb.collection("audit_logs").create(payload, { requestKey: null });
    }

    // در غیر این صورت به عنوان fallback به API بفرست
    const response = await fetch("/api/logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      return data.log;
    }
  } catch (error) {
    // خطای لاگ نباید مانع عملیات کاربر شود اما در کنسول جهت دیباگ ثبت می‌شود
    console.warn("Audit log client record error:", error);
  }
  return null;
}
