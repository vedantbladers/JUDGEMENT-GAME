import { Card, Suit } from "@/lib/types";

// Get suit symbol
export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case "SPADES": return "♠";
    case "HEARTS": return "♥";
    case "DIAMONDS": return "♦";
    case "CLUBS": return "♣";
  }
}

// Get suit color
export function getSuitColor(suit: Suit): "red" | "black" {
  return suit === "HEARTS" || suit === "DIAMONDS" ? "red" : "black";
}

// Get display rank
export function getDisplayRank(rank: string): string {
  return rank;
}

// Format a card for display
export function formatCard(card: Card): string {
  return `${getDisplayRank(card.rank)}${getSuitSymbol(card.suit)}`;
}
