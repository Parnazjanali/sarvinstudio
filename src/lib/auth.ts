import { cookies } from "next/headers";
import PocketBase from "pocketbase";
import { AuthUserData, UserRecord } from "@/types/user";

export async function getServerUser(): Promise<AuthUserData> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("pb_auth");

  if (!authCookie) {
    return null;
  }

  const pbUrl =
    process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";
  const pb = new PocketBase(pbUrl);

  try {
    pb.authStore.loadFromCookie(authCookie.value);

    if (!pb.authStore.isValid || !pb.authStore.model) {
      return null;
    }

    const model = pb.authStore.model as unknown as UserRecord;

    return {
      id: model.id,
      name: model.name || model.username || "کاربر گرامی",
      phone: model.phone || null,
      email: model.email || null,
      role: (model.role as "admin" | "user") || "user",
      avatar: model.avatar || null,
    };
  } catch {
    return null;
  }
}
