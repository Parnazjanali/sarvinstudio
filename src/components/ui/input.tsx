import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-3.5 py-2 text-xs text-[#1C3324] ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-[#3A5A46]/60 focus-visible:outline-none focus-visible:border-[#1C3324] focus-visible:ring-2 focus-visible:ring-[#1C3324]/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:border-[#D8B65C] dark:focus-visible:ring-[#D8B65C]/20",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
