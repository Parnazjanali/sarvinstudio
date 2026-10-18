"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("theme");

    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    const initialTheme: Theme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : prefersDark
          ? "dark"
          : "light";

    setTheme(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  const handleToggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem("theme", nextTheme);
  };

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="در حال آماده‌سازی تغییر تم"
        disabled
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E7D7A8] bg-white text-[#7C5E14] dark:border-zinc-700 dark:bg-zinc-900 dark:text-[#E7D7A8]"
      >
        <Sun className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggleTheme}
      aria-label={
        theme === "dark"
          ? "تغییر به حالت روشن"
          : "تغییر به حالت تاریک"
      }
      title={
        theme === "dark"
          ? "تغییر به حالت روشن"
          : "تغییر به حالت تاریک"
      }
      className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-[#E7D7A8] bg-white text-[#7C5E14] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#FBF6EA] hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:text-[#E7D7A8] dark:hover:bg-zinc-800"
    >
      <Sun
        className={`absolute h-5 w-5 transition-all duration-300 ${
          theme === "dark"
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100"
        }`}
      />

      <Moon
        className={`absolute h-5 w-5 transition-all duration-300 ${
          theme === "dark"
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </button>
  );
}
