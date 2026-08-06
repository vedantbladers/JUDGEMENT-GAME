"use client";

import { useEffect, useState } from "react";

const COLORS = [
  "#f5d782", "#d4a847", "#e8c86e",
  "#ff6b6b", "#51cf66", "#339af0",
  "#ffd43b", "#ff922b", "#845ef7",
];

interface ConfettiPiece {
  id: number;
  left: number;
  color: string;
  delay: number;
  duration: number;
  width: number;
  height: number;
}

interface ConfettiProps {
  trigger: boolean;
  count?: number;
  duration?: number;
}

export default function Confetti({ trigger, count = 50, duration = 5000 }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!trigger) {
      setPieces([]);
      return;
    }

    const generated: ConfettiPiece[] = [];
    for (let i = 0; i < count; i++) {
      generated.push({
        id: i,
        left: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.8,
        duration: 2 + Math.random() * 2,
        width: 6 + Math.random() * 8,
        height: 6 + Math.random() * 8,
      });
    }
    setPieces(generated);

    // Clean up after animation
    const timer = setTimeout(() => setPieces([]), duration);
    return () => clearTimeout(timer);
  }, [trigger, count, duration]);

  if (pieces.length === 0) return null;

  return (
    <>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            width: `${p.width}px`,
            height: `${p.height}px`,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </>
  );
}
