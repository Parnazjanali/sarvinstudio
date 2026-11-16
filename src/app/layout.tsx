import type { Metadata } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import "./globals.css";
import pb from "@/lib/pocketbase";
import { AuthUpdater } from "@/components/AuthUpdater";
import { CartProvider } from "@/context/CartContext";
import ConditionalSiteChrome from "@/components/ConditionalSiteChrome";
import DynamicTypography from "@/components/DynamicTypography";
import DueInstallmentModal from "@/components/DueInstallmentModal";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://parnazar.ir"),
  title: {
    default: "گالری طلا پرنا زر | مثل زر بدرخش",
    template: "%s | پرنا زر",
  },
  description: "گالری طلا پرنا زر؛ خرید مطمئن و آنلاین طلای ۱۸ عیار استاندارد ۷۵۰ با امکان پرداخت در ۳ قسط ماهانه بدون سود و کارمزد، همراه با فاکتور رسمی معتبر و شناسنامه طلا. مثل زر بدرخش.",
  keywords: [
    "طلا آنلاین", 
    "خرید آنلاین طلا",
    "طلای ۱۸ عیار",
    "اقساط طلا",
    "خرید قسطی طلا",
    "پرنا زر",
    "مثل زر بدرخش",
    "سفارش ساخت طلا",
    "دستبند طلا",
    "انگشتر طلا",
    "گردنبند طلا",
    "طلای بدون سود",
    "طلا بدون چک",
    "کالکشن طلا",
    "طلا با فاکتور رسمی",
  ],
  authors: [{ name: "گالری طلا پرنا زر", url: "https://parnazar.ir" }],
  creator: "پرنا زر (Parna Zar)",
  publisher: "پرنا زر",
  formatDetection: {
    telephone: false,
    date: false,
    email: false,
    address: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "https://parnazar.ir",
    siteName: "پرنا زر",
    title: "گالری طلا پرنا زر | مثل زر بدرخش",
    description: "خرید آنلاین دست‌ساخته‌های طلای ۱۸ عیار با طرح ویژه ۳ قسط ماهانه بدون سود و کارمزد به قیمت روز طلا با فاکتور رسمی.",
    images: [
      {
        url: "/banner.webp",
        width: 1200,
        height: 630,
        alt: "گالری طلا پرنا زر - مثل زر بدرخش",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "گالری طلا پرنا زر | مثل زر بدرخش",
    description: "خرید آنلاین طلای ۱۸ عیار با طرح خرید در ۳ قسط ماهانه بدون سود.",
    images: ["/banner.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLdOrgAndStore = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["JewelryStore", "Store", "Organization"],
      "@id": "https://parnazar.ir/#store",
      name: "گالری طلا پرنا زر",
      alternateName: ["پرنا زر", "Parna Zar Gold"],
      slogan: "مثل زر بدرخش",
      url: "https://parnazar.ir",
      logo: "https://parnazar.ir/banner.webp",
      image: "https://parnazar.ir/header.webp",
      description: "گالری طلا پرنا زر؛ ساخت و عرضه تخصصی دست‌ساخته‌های طلای ۱۸ عیار استاندارد ۷۵۰ با طرح ویژه ۳ قسط ماهانه به قیمت روز طلا بدون سود و کارمزد، همراه با شناسنامه معتبر و فاکتور رسمی.",
      telephone: "+989383080950",
      priceRange: "$$$",
      currenciesAccepted: "IRR",
      paymentAccepted: "نقد، کارت به کارت، پرداخت آنلاین شتاب، اقساط طلایی ۳ ماهه",
      address: {
        "@type": "PostalAddress",
        streetAddress: "بازار بزرگ، پاساژ تکیه دولت",
        addressLocality: "تهران",
        addressRegion: "تهران",
        addressCountry: "IR",
      },
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
        opens: "10:00",
        closes: "19:00",
      },
      sameAs: [
        "https://instagram.com/parnazar.gold",
        "https://wa.me/989383080950",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://parnazar.ir/#website",
      url: "https://parnazar.ir",
      name: "گالری طلا پرنا زر",
      alternateName: "پرنا زر",
      description: "خرید آنلاین طلای ۱۸ عیار با اقساط ماهانه بدون سود - مثل زر بدرخش",
      inLanguage: "fa-IR",
      publisher: {
        "@id": "https://parnazar.ir/#store",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://parnazar.ir/products?search={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrgAndStore) }}
        />
      </head>
      <body className="min-h-screen bg-[#FAF8F5] text-[#3B0B14] antialiased transition-colors duration-300 dark:bg-[#140508] dark:text-[#FDF8F9]">
        <CartProvider>
          <AuthUpdater />
          <DynamicTypography />
          <DueInstallmentModal />

          <ConditionalSiteChrome user={userData}>
            {children}
          </ConditionalSiteChrome>
        </CartProvider>
      </body>
    </html>
  );
}
