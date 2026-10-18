import type { Metadata } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import "./globals.css";
import pb from "@/lib/pocketbase";
import { AuthUpdater } from "@/components/AuthUpdater";
import { CartProvider } from "@/context/CartContext";
import ConditionalSiteChrome from "@/components/ConditionalSiteChrome";

export const metadata: Metadata = {
  title: "طلا و جواهرات سروین | SarvinJewelry",
  description: "طلا و جواهرات سروین، خرید و فروش مطمئن و آنلاین طلا",
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

          <ConditionalSiteChrome user={userData}>
            {children}
          </ConditionalSiteChrome>
        </CartProvider>
      </body>
    </html>
  );
}
