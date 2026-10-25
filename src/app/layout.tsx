import type { Metadata } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import "./globals.css";
import pb from "@/lib/pocketbase";
import { AuthUpdater } from "@/components/AuthUpdater";
import { CartProvider } from "@/context/CartContext";
import ConditionalSiteChrome from "@/components/ConditionalSiteChrome";

import DynamicTypography from "@/components/DynamicTypography";

export const metadata: Metadata = {
  title: "پرنا زر | مثل زر بدرخش",
  description: "گالری طلا و جواهر پرنا زر؛ مثل زر بدرخش. خرید و فروش مطمئن و آنلاین طلای ۱۸ عیار با اقساط طلایی و طراحی اختصاصی.",
};

const themeNoFlashScript = `
(function() {
  try {
    var theme = localStorage.getItem("theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (theme === "dark" || (!theme && prefersDark)) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  } catch (e) {}

  try {
    var typo = localStorage.getItem("site_typography");
    if (typo) {
      var p = JSON.parse(typo);
      var fontMap = {
        Doran: "'Doran', Tahoma, sans-serif",
        IRANSans: "'IRANSans', Tahoma, sans-serif",
        IRANYekan: "'IRANYekan', Tahoma, sans-serif",
        Vazirmatn: "'Vazirmatn', Tahoma, sans-serif"
      };
      if (p.fontHeading) {
        var hf = fontMap[p.fontHeading] || ("'" + p.fontHeading + "', Tahoma, sans-serif");
        document.documentElement.style.setProperty("--font-heading", hf);
      }
      if (p.fontBody) {
        var bf = fontMap[p.fontBody] || ("'" + p.fontBody + "', Tahoma, sans-serif");
        document.documentElement.style.setProperty("--font-body", bf);
      }
      if (p.fontPrint) {
        var pf = fontMap[p.fontPrint] || ("'" + p.fontPrint + "', Tahoma, sans-serif");
        document.documentElement.style.setProperty("--font-print", pf);
      }
      if (p.fontHeadingSize) {
        document.documentElement.style.setProperty("--font-heading-scale", (p.fontHeadingSize / 100).toString());
      }
      if (p.fontBodySize) {
        document.documentElement.style.setProperty("--font-body-size", p.fontBodySize + "px");
      }
      if (p.fontPrintSize) {
        document.documentElement.style.setProperty("--font-print-size", p.fontPrintSize + "px");
      }
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("pb_auth");

  pb.authStore.clear();

  if (authCookie?.value) {
    try {
      pb.authStore.loadFromCookie(authCookie.value);
    } catch {
      pb.authStore.clear();
    }
  }

  const userData = pb.authStore.isValid
    ? {
        name:
          pb.authStore.model?.name ||
          pb.authStore.model?.username ||
          "کاربر عزیز",
        phone: pb.authStore.model?.phone || null,
        email: pb.authStore.model?.email || null,
      }
    : null;

  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <Script
          id="theme-no-flash"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeNoFlashScript }}
        />
      </head>
      <body className="min-h-screen bg-[#FBF6EA] text-zinc-900 antialiased transition-colors duration-300 dark:bg-[#12100D] dark:text-zinc-100">
        <CartProvider>
          <AuthUpdater />
          <DynamicTypography />

          <ConditionalSiteChrome user={userData}>
            {children}
          </ConditionalSiteChrome>
        </CartProvider>
      </body>
    </html>
  );
}
