"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";

type CartBadgeProps = {
  onClick?: () => void;
  className?: string;
};

export function CartBadge({ onClick, className }: CartBadgeProps) {
  const { totalItems } = useCart();

  return (
    <button
      type="button"
      onClick={onClick}
      className={className ?? "relative inline-flex items-center justify-center rounded-full p-2 transition hover:bg-black/5"}
      aria-label="سبد خرید"
    >
      <ShoppingCart size={20} className="text-foreground" />
      {totalItems > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#7C5E14] px-1 text-[11px] font-bold text-white">
          {totalItems}
        </span>
      )}
    </button>
  );
}
