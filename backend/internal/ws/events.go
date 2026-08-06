package ws

import (
	"encoding/json"

	"github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/game"
)

// EventType defines the type of event being sent or received
type EventType string

const (
	// Inbound Events (Client -> Server)
	EventStartGame EventType = "START_GAME"
	EventPlaceBid  EventType = "PLACE_BID"
	EventPlayCard  EventType = "PLAY_CARD"

	// Outbound Events (Server -> Client)
	EventStateUpdate  EventType = "STATE_UPDATE"
	EventError        EventType = "ERROR"
	EventPlayerJoined EventType = "PLAYER_JOINED"
	EventPlayerLeft   EventType = "PLAYER_LEFT"
)

// Event is the standard JSON wrapper for all WebSocket messages
type Event struct {
	Type    EventType       `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

// Action encapsulates an inbound event along with the sender's details
type Action struct {
	Client *Client
	Event  Event
}

// --- Payload Definitions ---

// StartGamePayload represents the payload to start a round
type StartGamePayload struct {
	CardsPerPlayer int       `json:"cards_per_player"`
	TrumpSuit      game.Suit `json:"trump_suit"`
}

// PlaceBidPayload represents the payload to place a bid
type PlaceBidPayload struct {
	Bid int `json:"bid"`
}

// PlayCardPayload represents the payload to play a card
type PlayCardPayload struct {
	Card game.Card `json:"card"`
}

// ErrorPayload represents an error message sent back to a client
type ErrorPayload struct {
	Message string `json:"message"`
}

// PlayerNotification represents a player joining or leaving the lobby
type PlayerNotification struct {
	PlayerID int    `json:"player_id"`
	Username string `json:"username"`
}

