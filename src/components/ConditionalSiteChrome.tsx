"use client";

import React from "react";
import { usePathname } from "next/navigation";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

type UserData = {
  name: string;
  phone: string | null;
  email: string | null;
} | null;

type ConditionalSiteChromeProps = {
  user: UserData;
  children: React.ReactNode;
};

export default function ConditionalSiteChrome({
  user,
  children,
}: ConditionalSiteChromeProps) {
  const pathname = usePathname();

  const isDashboardRoute =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  if (isDashboardRoute) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
