"use client";

import { useEffect } from "react";

export type CustomFont = {
  id: string;
  name: string;
  family: string;
  url: string;
  format?: string;
};

export type TypographyConfig = {
  fontHeading: string;
  fontBody: string;
  fontPrint: string;
  fontHeadingSize?: number; // scale percent e.g. 100 (range 85 - 135)
  fontBodySize?: number;    // base px size e.g. 14 (range 12 - 20)
  fontPrintSize?: number;   // print px size e.g. 11 (range 9 - 16)
  customFonts?: CustomFont[];
};

export const FONT_FAMILY_MAP: Record<string, string> = {
  Doran: "'Doran', Tahoma, sans-serif",
  IRANSans: "'IRANSans', Tahoma, sans-serif",
  IRANYekan: "'IRANYekan', Tahoma, sans-serif",
  Vazirmatn: "'Vazirmatn', Tahoma, sans-serif",
};

export function resolveFontFamily(fontKey: string, customFonts: CustomFont[] = []): string {
  if (FONT_FAMILY_MAP[fontKey]) {
    return FONT_FAMILY_MAP[fontKey];
  }
  const custom = customFonts.find((f) => f.family === fontKey || f.name === fontKey);
  if (custom) {
    return `'${custom.family}', Tahoma, sans-serif`;
  }
  return fontKey ? `'${fontKey}', Tahoma, sans-serif` : FONT_FAMILY_MAP["IRANSans"];
}

export function applyTypography(config: TypographyConfig) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const customFonts = config.customFonts || [];

  // 1. Inject @font-face for custom fonts
  let styleEl = document.getElementById("custom-fonts-style") as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "custom-fonts-style";
    document.head.appendChild(styleEl);
  }

  if (customFonts.length > 0) {
    styleEl.textContent = customFonts
      .map(
        (f) => `
@font-face {
  font-family: '${f.family}';
  src: url('${f.url}') format('${f.format || "woff2"}');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}`
      )
      .join("\n");
  } else {
    styleEl.textContent = "";
  }

  // 2. Resolve CSS font family strings
  const headingFont = resolveFontFamily(config.fontHeading || "Doran", customFonts);
  const bodyFont = resolveFontFamily(config.fontBody || "IRANSans", customFonts);
  const printFont = resolveFontFamily(config.fontPrint || "IRANSans", customFonts);

  // 3. Resolve Font Sizes
  const headingSizeNum = Number(config.fontHeadingSize || 100);
  const headingScale = Math.max(0.7, Math.min(1.6, headingSizeNum / 100));
  const bodySizeNum = Math.max(11, Math.min(22, Number(config.fontBodySize || 14)));
  const printSizeNum = Math.max(8, Math.min(18, Number(config.fontPrintSize || 11)));

  // 4. Set CSS variables on document root
  root.style.setProperty("--font-heading", headingFont);
  root.style.setProperty("--font-body", bodyFont);
  root.style.setProperty("--font-print", printFont);
  root.style.setProperty("--font-heading-scale", String(headingScale));
  root.style.setProperty("--font-body-size", `${bodySizeNum}px`);
  root.style.setProperty("--font-print-size", `${printSizeNum}px`);

  // 5. Apply font styles to body so font-inherit propagates cleanly
  if (document.body) {
    document.body.style.fontFamily = bodyFont;
    document.body.style.fontSize = `${bodySizeNum}px`;
  }

  // 6. Cache in localStorage for instant zero-flash styling on next visit
  try {
    localStorage.setItem(
      "site_typography",
      JSON.stringify({
        fontHeading: config.fontHeading || "Doran",
        fontBody: config.fontBody || "IRANSans",
        fontPrint: config.fontPrint || "IRANSans",
        fontHeadingSize: headingSizeNum,
        fontBodySize: bodySizeNum,
        fontPrintSize: printSizeNum,
        customFonts: customFonts,
      })
    );
  } catch {}
}

export default function DynamicTypography() {
  useEffect(() => {
    // 1. Instant load from localStorage cache
    try {
      const cached = localStorage.getItem("site_typography");
      if (cached) {
        const parsed = JSON.parse(cached);
        applyTypography(parsed);
      }
    } catch {}

    // 2. Fetch fresh settings from public API
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          applyTypography({
            fontHeading: res.data.fontHeading || "Doran",
            fontBody: res.data.fontBody || "IRANSans",
            fontPrint: res.data.fontPrint || "IRANSans",
            fontHeadingSize: res.data.fontHeadingSize || 100,
            fontBodySize: res.data.fontBodySize || 14,
            fontPrintSize: res.data.fontPrintSize || 11,
            customFonts: res.data.customFonts || [],
          });
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch typography settings:", err);
      });

    // 3. Listen for updates dispatched from Settings page
    const handleUpdate = (e: CustomEvent<TypographyConfig>) => {
      if (e.detail) {
        applyTypography(e.detail);
      }
    };

    window.addEventListener("typography-updated" as any, handleUpdate);
    return () => {
      window.removeEventListener("typography-updated" as any, handleUpdate);
    };
  }, []);

  return null;
}
