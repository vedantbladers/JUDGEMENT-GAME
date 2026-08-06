// Types that mirror the Go backend structs exactly

export type Suit = "SPADES" | "HEARTS" | "DIAMONDS" | "CLUBS";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Play {
  player_id: number;
  card: Card;
}

export interface GameState {
  lobby_id: string;
  players: number[];
  player_names: Record<number, string>;
  scores: Record<number, number>;
  cards_per_player: number;
  trump_suit: Suit;
  hands: Record<number, Card[]>;
  bids: Record<number, number>;
  tricks_won: Record<number, number>;
  dealer_index: number;
  turn_index: number;
  lead_index: number;
  current_trick: Play[];
  last_trick: Play[];
  last_trick_winner: number;
  host_id: number;
  phase: "waiting" | "bidding" | "playing" | "finished" | "gameOver";
}

// Event types (must match Go backend ws/events.go)
export type EventType =
  | "START_GAME"
  | "PLACE_BID"
  | "PLAY_CARD"
  | "STATE_UPDATE"
  | "ERROR"
  | "PLAYER_JOINED"
  | "PLAYER_LEFT";

export interface WSEvent {
  type: EventType;
  payload?: unknown;
}

export interface ErrorPayload {
  message: string;
}

export interface PlayerNotification {
  player_id: number;
  username: string;
}
