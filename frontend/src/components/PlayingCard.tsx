"use client";

import { Card, Suit } from "@/lib/types";
import { getSuitSymbol, getSuitColor } from "@/lib/cardUtils";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
          ? { y: -18, scale: 1.08, transition: { type: "spring", stiffness: 450, damping: 20 } }
          : {}
      }
      whileTap={!disabled && onClick ? { scale: 0.94 } : {}}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "playing-card bg-linear-to-b from-slate-50 to-slate-100 border-2 shadow-xl select-none relative overflow-hidden",
        color === "red" ? "text-red-600 border-red-200/50" : "text-slate-900 border-slate-300/50",
        isTrump && "is-trump border-amber-400/80 shadow-amber-500/20 shadow-lg",
        disabled && onClick ? "opacity-50 cursor-not-allowed grayscale-[30%]" : "",
        !disabled && onClick
          ? "cursor-pointer hover:shadow-2xl hover:shadow-primary/30 hover:border-primary/50"
          : "",
        small ? "!w-[56px] !h-[80px] !text-xs border rounded-lg" : "rounded-xl",
        className
      )}
    >
      {/* Subtle Inner Card Border Hairline */}
      <div className="absolute inset-1 border border-slate-900/5 rounded-[6px] pointer-events-none" />

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

      {/* Trump corner indicator */}
      {isTrump && (
        <div className="absolute top-1 right-1.5 text-amber-500 font-bold text-xs leading-none z-20 pointer-events-none">
          *
        </div>
      )}
    </motion.div>
  );
}
