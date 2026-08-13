package ws

import (
	"encoding/json"
	"log"

	"github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/game"
	"github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/models"
	"gorm.io/gorm"
)

// Hub maintains the set of active clients and broadcasts messages to the lobbies.
type Hub struct {
	// Database connection
	db *gorm.DB

	// Registered clients mapped by LobbyID
	Lobbies map[string]map[*Client]bool

	// Active game instances mapped by LobbyID
	Games map[string]*game.GameState

	// LobbyHosts tracks the UserID of the host for each LobbyID
	LobbyHosts map[string]int

	// Inbound messages from the clients.
	Actions chan Action

	// Register requests from the clients.
	Register chan *Client

	// Unregister requests from clients.
	Unregister chan *Client
}

// NewHub creates a new Hub instance
func NewHub(db *gorm.DB) *Hub {
	return &Hub{
		db:         db,
		Actions:    make(chan Action),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Lobbies:    make(map[string]map[*Client]bool),
		Games:      make(map[string]*game.GameState),
		LobbyHosts: make(map[string]int),
	}
}

// Run starts the hub's main event loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			if h.Lobbies[client.LobbyID] == nil {
				h.Lobbies[client.LobbyID] = make(map[*Client]bool)
				// The first person to join the lobby becomes the host
				h.LobbyHosts[client.LobbyID] = client.UserID
			}
			h.Lobbies[client.LobbyID][client] = true

			// Broadcast player joined notification
			h.broadcastPlayerEvent(client, EventPlayerJoined)

			// If game is active, broadcast to everyone (or just send to the new client)
			// so the frontend knows how many players are connected in the waiting phase!
			h.broadcastGameState(client.LobbyID)

		case client := <-h.Unregister:
			if _, ok := h.Lobbies[client.LobbyID][client]; ok {
				delete(h.Lobbies[client.LobbyID], client)
				close(client.Send)

				// Broadcast player left notification
				h.broadcastPlayerEvent(client, EventPlayerLeft)

				// Clean up empty lobbies, otherwise broadcast the new player count
				if len(h.Lobbies[client.LobbyID]) == 0 {
					log.Printf("Lobby %s is now empty. Deleting from DB and memory.", client.LobbyID)
					if h.db != nil {
						h.db.Where("lobby_id = ?", client.LobbyID).Delete(&models.LobbyPlayer{})
						h.db.Where("id = ?", client.LobbyID).Delete(&models.Lobby{})
					}
					delete(h.Lobbies, client.LobbyID)
					delete(h.Games, client.LobbyID)
					delete(h.LobbyHosts, client.LobbyID)
				} else {
					// Handle Host reassignment if the host left
					if h.LobbyHosts[client.LobbyID] == client.UserID {
						for remainingClient := range h.Lobbies[client.LobbyID] {
							h.LobbyHosts[client.LobbyID] = remainingClient.UserID
							if g, ok := h.Games[client.LobbyID]; ok {
								g.HostID = remainingClient.UserID
							}
							break
						}
					}

					// If only 1 player remains and a game is active, gracefully abort it
					if len(h.Lobbies[client.LobbyID]) == 1 {
						if g, ok := h.Games[client.LobbyID]; ok && g.Phase != "waiting" && g.Phase != "gameOver" {
							g.Phase = "waiting"
							g.CurrentTrick = nil
							g.LastTrick = nil
						}
					}

					h.broadcastGameState(client.LobbyID)
				}
			}

		case action := <-h.Actions:
			h.handleAction(action)
		}
	}
}

// handleAction processes inbound game events
func (h *Hub) handleAction(action Action) {
	lobbyID := action.Client.LobbyID
	userID := action.Client.UserID

	switch action.Event.Type {
	case EventStartGame:
		// Only host can start game
		if h.LobbyHosts[lobbyID] != userID {
			h.sendError(action.Client, "Only the host can start the game")
			return
		}

		// Parse payload
		var payload StartGamePayload
		if err := json.Unmarshal(action.Event.Payload, &payload); err != nil {
			h.sendError(action.Client, "Invalid start game payload")
			return
		}

		// Gather unique player IDs currently in the lobby
		clients := h.Lobbies[lobbyID]
		var playerIDs []int
		seen := make(map[int]bool)
		for c := range clients {
			if !seen[c.UserID] {
				seen[c.UserID] = true
				playerIDs = append(playerIDs, c.UserID)
			}
		}

		if len(playerIDs) < 2 {
			h.sendError(action.Client, "Not enough players to start")
			return
		}

		// Use existing game state if it exists, otherwise create new
		g, ok := h.Games[lobbyID]
		if !ok {
			g = game.NewGame(lobbyID, playerIDs)
			g.HostID = h.LobbyHosts[lobbyID]
		} else {
			// Ensure player list is up to date for the new round
			g.Players = playerIDs
		}

		// Populate player names from connected clients
		for c := range clients {
			g.PlayerNames[c.UserID] = c.Username
		}

		if err := g.StartRound(payload.CardsPerPlayer, payload.TrumpSuit); err != nil {
			h.sendError(action.Client, err.Error())
			return
		}

		h.Games[lobbyID] = g
		h.broadcastGameState(lobbyID)

	case EventPlaceBid:
		g, ok := h.Games[lobbyID]
		if !ok {
			h.sendError(action.Client, "Game not started")
			return
		}

		var payload PlaceBidPayload
		if err := json.Unmarshal(action.Event.Payload, &payload); err != nil {
			h.sendError(action.Client, "Invalid place bid payload")
			return
		}

		if err := g.PlaceBid(userID, payload.Bid); err != nil {
			h.sendError(action.Client, err.Error())
			return
		}

		h.broadcastGameState(lobbyID)

	case EventPlayCard:
		g, ok := h.Games[lobbyID]
		if !ok {
			h.sendError(action.Client, "Game not started")
			return
		}

		var payload PlayCardPayload
		if err := json.Unmarshal(action.Event.Payload, &payload); err != nil {
			h.sendError(action.Client, "Invalid play card payload")
			return
		}

		if err := g.PlayCard(userID, payload.Card); err != nil {
			h.sendError(action.Client, err.Error())
			return
		}

		h.broadcastGameState(lobbyID)
		// (Game over lobby deletion is handled when the last player unregisters)
	
	default:
		log.Printf("Unknown event type: %s", action.Event.Type)
	}
}

// sendError sends a targeted error message back to the offending client
func (h *Hub) sendError(client *Client, message string) {
	errPayload := ErrorPayload{Message: message}
	b, _ := json.Marshal(errPayload)
	
	event := Event{
		Type:    EventError,
		Payload: b,
	}
	eb, _ := json.Marshal(event)
	client.Send <- eb
}

// broadcastPlayerEvent sends a player joined/left notification to all clients in a lobby
func (h *Hub) broadcastPlayerEvent(player *Client, eventType EventType) {
	notification := PlayerNotification{
		PlayerID: player.UserID,
		Username: player.Username,
	}
	b, _ := json.Marshal(notification)

	event := Event{
		Type:    eventType,
		Payload: b,
	}
	eb, _ := json.Marshal(event)

	for client := range h.Lobbies[player.LobbyID] {
		// Don't send join notification back to the joining player
		if client == player && eventType == EventPlayerJoined {
			continue
		}
		select {
		case client.Send <- eb:
		default:
			close(client.Send)
			delete(h.Lobbies[client.LobbyID], client)
		}
	}
}

// broadcastGameState sanitizes and sends the game state to all players in a lobby
func (h *Hub) broadcastGameState(lobbyID string) {
	clients := h.Lobbies[lobbyID]
	
	// If the game hasn't started yet, generate a "waiting" state
	g, ok := h.Games[lobbyID]
	if !ok {
		var playerIDs []int
		seen := make(map[int]bool)
		for c := range clients {
			if !seen[c.UserID] {
				seen[c.UserID] = true
				playerIDs = append(playerIDs, c.UserID)
			}
		}
		g = game.NewGame(lobbyID, playerIDs)
		g.HostID = h.LobbyHosts[lobbyID]
		// We DO NOT save this to h.Games yet, it's just a temporary state for the UI
	}

	// Always populate player names from connected clients (keeps them fresh)
	for c := range clients {
		g.PlayerNames[c.UserID] = c.Username
	}

	for client := range clients {
		h.sendGameStateToClient(client, g)
	}
}

// sendGameStateToClient clones the state, strips out other players' hands, and sends it
func (h *Hub) sendGameStateToClient(client *Client, g *game.GameState) {
	// Create a shallow copy of the state
	sanitizedState := *g
	
	// Create a new Hands map containing ONLY this client's hand
	sanitizedState.Hands = make(map[int][]game.Card)
	if hand, ok := g.Hands[client.UserID]; ok {
		sanitizedState.Hands[client.UserID] = hand
	}

	stateBytes, _ := json.Marshal(sanitizedState)
	event := Event{
		Type:    EventStateUpdate,
		Payload: stateBytes,
	}
	
	eventBytes, _ := json.Marshal(event)
	
	// Non-blocking send
	select {
	case client.Send <- eventBytes:
	default:
		close(client.Send)
		delete(h.Lobbies[client.LobbyID], client)
	}
}
