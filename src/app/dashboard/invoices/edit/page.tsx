"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function EditInvoiceRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  useEffect(() => {
    if (id) {
      router.replace(`/dashboard/invoices/${id}/edit`);
    } else {
      router.replace("/dashboard/invoices");
    }
  }, [id, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center font-sans text-xs text-[#6E3A44] dark:text-zinc-400">
      <span>در حال انتقال به صفحه ویرایش فاکتور...</span>
    </div>
  );
}
