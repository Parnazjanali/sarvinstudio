import type { ProductColor } from "@/lib/products";

export const COLORS = {
  cream: "#FBF6EA",
  creamDeep: "#F1E6C9",
  paper: "#FFFDF8",
  white: "#FFFFFF", // رنگ سفیدی که قبلا جا افتاده بود
  gold: "#B4901E",
  goldLight: "#D8B65C",
  goldPale: "#EAD9A0",
  goldDeep: "#7C5E14",
  ink: "#4A3D22",
  inkSoft: "#7A6B49",
  line: "rgba(124,94,20,0.20)",
};

export const SHADOW = "0 20px 50px -20px rgba(124,94,20,0.25)";

export const CATEGORIES = [
  { key: "all", label: "همه دسته‌ها" },
  { key: "ring", label: "انگشتر" },
  { key: "necklace", label: "گردنبند" },
  { key: "bracelet", label: "دستبند" },
  { key: "earring", label: "گوشواره" },
];

export const COLOR_OPTIONS: {
  key: "all" | ProductColor;
  label: string;
  hex: string;
}[] = [
  { key: "all", label: "همه رنگ‌ها", hex: "transparent" },
  { key: "yellow", label: "طلای زرد", hex: "#EAB308" },
  { key: "white", label: "طلای سفید", hex: "#E2E8F0" },
  { key: "rose", label: "رزگلد", hex: "#FB7185" },
  { key: "mixed", label: "دو رنگ / ترکیبی", hex: "linear-gradient(45deg, #EAB308, #E2E8F0)" },
];