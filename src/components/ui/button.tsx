import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-xs font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer active:scale-98",
  {
    variants: {
      variant: {
        default:
          "bg-[#3B0B14] text-white hover:bg-[#580F1F] shadow-xs dark:bg-[#DFB76C] dark:text-[#140508] dark:hover:bg-[#F3E5C2]",
        destructive:
          "bg-rose-600 text-white hover:bg-rose-700 shadow-xs dark:bg-rose-700 dark:hover:bg-rose-800",
        outline:
          "border border-[#580F1F]/15 bg-white text-[#3B0B14] hover:bg-[#580F1F]/5 hover:text-[#580F1F] dark:border-white/10 dark:bg-[#1C080E] dark:text-zinc-100 dark:hover:bg-white/5",
        secondary:
          "bg-[#FDF8F9] text-[#3B0B14] hover:bg-[#F5EDEF] border border-[#580F1F]/10 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
        ghost:
          "hover:bg-[#580F1F]/5 text-[#3B0B14] hover:text-[#580F1F] dark:text-zinc-200 dark:hover:bg-white/5",
        link: "text-[#8B142D] underline-offset-4 hover:underline dark:text-[#DFB76C]",
        gold: "bg-gradient-to-r from-[#C5A059] to-[#DFB76C] text-white font-extrabold shadow-sm hover:brightness-105",
        crimson:
          "bg-[#8B142D] text-white font-extrabold shadow-xs hover:bg-[#580F1F] dark:bg-[#8B142D] dark:hover:bg-[#A3203C]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-xl px-3 text-[11px]",
        lg: "h-12 rounded-2xl px-6 text-sm",
        icon: "h-10 w-10 p-0 rounded-xl",
        "icon-sm": "h-8 w-8 p-0 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
