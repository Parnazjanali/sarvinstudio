"use client";

import { useEffect } from "react";
import { pb } from "@/lib/pocketbase";

export function AuthUpdater() {
  useEffect(() => {
    pb.authStore.onChange((token, model) => {
      if (!token) {
        document.cookie = "pb_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    }, true);
  }, []);

  return null;
}
