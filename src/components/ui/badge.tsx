import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#1C3324] text-white hover:bg-[#1C3324]/80 dark:bg-[#D8B65C] dark:text-[#101813]",
        secondary:
          "border-transparent bg-[#F3EFEA] text-[#1C3324] hover:bg-[#F3EFEA]/80 dark:bg-zinc-800 dark:text-zinc-100",
        destructive:
          "border-transparent bg-rose-500 text-white hover:bg-rose-600 dark:bg-rose-900/60 dark:text-rose-200",
        outline:
          "border-[#1C3324]/15 text-[#1C3324] dark:border-white/10 dark:text-zinc-200",
        success:
          "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40",
        warning:
          "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/40",
        gold:
          "border-[#B4901E]/30 bg-[#B4901E]/10 text-[#7C5E14] dark:border-[#D8B65C]/30 dark:bg-[#D8B65C]/10 dark:text-[#D8B65C]",
        crimson:
          "border-[#8B263E]/30 bg-[#8B263E]/10 text-[#8B263E] dark:border-[#8B263E]/40 dark:bg-[#8B263E]/20 dark:text-rose-300",
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
