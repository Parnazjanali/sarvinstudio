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
          "bg-[#1C3324] text-white hover:bg-[#2D4F38] shadow-xs dark:bg-[#D8B65C] dark:text-[#101813] dark:hover:bg-[#EAD9A0]",
        destructive:
          "bg-rose-600 text-white hover:bg-rose-700 shadow-xs dark:bg-rose-700 dark:hover:bg-rose-800",
        outline:
          "border border-[#1C3324]/15 bg-white text-[#1C3324] hover:bg-[#1C3324]/5 hover:text-[#1C3324] dark:border-white/10 dark:bg-[#15221B] dark:text-zinc-100 dark:hover:bg-white/5",
        secondary:
          "bg-[#F3EFEA] text-[#1C3324] hover:bg-[#E9E4DC] dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
        ghost:
          "hover:bg-[#1C3324]/5 text-[#1C3324] hover:text-[#1C3324] dark:text-zinc-200 dark:hover:bg-white/5",
        link: "text-[#8B263E] underline-offset-4 hover:underline dark:text-[#D8B65C]",
        gold: "bg-gradient-to-r from-[#B4901E] to-[#D8B65C] text-white font-extrabold shadow-sm hover:brightness-105",
        crimson:
          "bg-[#8B263E] text-white font-extrabold shadow-xs hover:bg-[#721F33] dark:bg-[#8B263E] dark:hover:bg-[#A32D49]",
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
