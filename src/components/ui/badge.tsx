import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#580F1F] text-white hover:bg-[#580F1F]/80 dark:bg-[#DFB76C] dark:text-[#140508]",
        secondary:
          "border-transparent bg-[#FDF8F9] text-[#3B0B14] hover:bg-[#FDF8F9]/80 dark:bg-zinc-800 dark:text-zinc-100",
        destructive:
          "border-transparent bg-rose-500 text-white hover:bg-rose-600 dark:bg-rose-900/60 dark:text-rose-200",
        outline:
          "border-[#580F1F]/15 text-[#3B0B14] dark:border-white/10 dark:text-zinc-200",
        success:
          "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40",
        warning:
          "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/40",
        gold:
          "border-[#C5A059]/30 bg-[#C5A059]/10 text-[#9E782F] dark:border-[#DFB76C]/30 dark:bg-[#DFB76C]/10 dark:text-[#DFB76C]",
        crimson:
          "border-[#8B142D]/30 bg-[#8B142D]/10 text-[#8B142D] dark:border-[#8B142D]/40 dark:bg-[#8B142D]/20 dark:text-rose-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
