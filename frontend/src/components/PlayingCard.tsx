"use client";

import { Card, Suit } from "@/lib/types";
import { getSuitSymbol, getSuitColor } from "@/lib/cardUtils";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Crown } from "lucide-react";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface PlayingCardProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
  className?: string;
  animateProps?: object;
  trumpSuit?: Suit;
}

export default function PlayingCard({
  card,
  onClick,
  disabled,
  small,
  className,
  animateProps,
  trumpSuit,
}: PlayingCardProps) {
  const color = getSuitColor(card.suit);
  const symbol = getSuitSymbol(card.suit);
  const isTrump = trumpSuit && card.suit === trumpSuit;

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, ...animateProps }}
      exit={{ scale: 0.85, opacity: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      whileHover={
        !disabled && onClick
          ? { y: -16, scale: 1.07, transition: { type: "spring", stiffness: 450, damping: 20 } }
          : {}
      }
      whileTap={!disabled && onClick ? { scale: 0.95 } : {}}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "playing-card select-none relative overflow-hidden",
        color === "red" ? "text-rose-600" : "text-slate-900",
        isTrump && "is-trump",
        disabled && onClick ? "opacity-45 cursor-not-allowed grayscale-30" : "",
        !disabled && onClick ? "cursor-pointer hover:border-cyan-400" : "",
        small ? "w-14! h-20! text-xs! rounded-lg" : "rounded-xl",
        className
      )}
    >
      {/* Precision Inner Card Border Hairline */}
      <div className="absolute inset-1 border border-slate-900/10 rounded-md pointer-events-none" />

      {/* Top-left corner: rank + suit */}
      <div
        className={cn(
          "absolute top-1.5 left-2 flex flex-col items-center leading-none z-10",
          small ? "text-[10px] top-1 left-1.5" : "text-xs"
        )}
      >
        <span className="font-extrabold tracking-tighter">{card.rank}</span>
        <span className={cn(small ? "text-[10px]" : "text-sm", "-mt-0.5 font-bold")}>{symbol}</span>
      </div>

      {/* Center suit symbol */}
      <span className={cn("leading-none select-none z-10 font-bold drop-shadow-sm", small ? "text-2xl" : "text-4xl")}>
        {symbol}
      </span>

      {/* Bottom-right corner: rank + suit (rotated 180°) */}
      <div
        className={cn(
          "absolute bottom-1.5 right-2 flex flex-col items-center leading-none rotate-180 z-10",
          small ? "text-[10px] bottom-1 right-1.5" : "text-xs"
        )}
      >
        <span className="font-extrabold tracking-tighter">{card.rank}</span>
        <span className={cn(small ? "text-[10px]" : "text-sm", "-mt-0.5 font-bold")}>{symbol}</span>
      </div>

      {/* Trump corner indicator badge */}
      {isTrump && (
        <div className="absolute top-1.5 right-1.5 z-20 pointer-events-none text-amber-500">
          <Crown className={cn(small ? "w-2.5 h-2.5" : "w-3 h-3")} fill="currentColor" />
        </div>
      )}
    </motion.div>
  );
}
