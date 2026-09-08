package ws

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

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

	// LobbyBots tracks bot users per LobbyID (BotID -> BotName)
	LobbyBots map[string]map[int]string

	// LobbyMaxPlayers tracks the max players limit per LobbyID
	LobbyMaxPlayers map[string]int

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
		db:              db,
		Actions:         make(chan Action),
		Register:        make(chan *Client),
		Unregister:      make(chan *Client),
		Lobbies:         make(map[string]map[*Client]bool),
		Games:           make(map[string]*game.GameState),
		LobbyHosts:      make(map[string]int),
		LobbyBots:       make(map[string]map[int]string),
		LobbyMaxPlayers: make(map[string]int),
	}
}

// getMaxPlayers retrieves the maximum player capacity for a lobby, querying DB if necessary
func (h *Hub) getMaxPlayers(lobbyID string) int {
	if h.LobbyMaxPlayers != nil {
		if max, exists := h.LobbyMaxPlayers[lobbyID]; exists && max >= 2 && max <= 4 {
			return max
		}
	}
	if h.db != nil {
		var lob models.Lobby
		if err := h.db.Select("max_players").Where("id = ?", lobbyID).First(&lob).Error; err == nil && lob.MaxPlayers >= 2 && lob.MaxPlayers <= 4 {
			if h.LobbyMaxPlayers == nil {
				h.LobbyMaxPlayers = make(map[string]int)
			}
			h.LobbyMaxPlayers[lobbyID] = lob.MaxPlayers
			return lob.MaxPlayers
		}
	}
	return 4
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
				h.getMaxPlayers(client.LobbyID)
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
				client.CloseSend()

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
					delete(h.LobbyBots, client.LobbyID)
					delete(h.LobbyMaxPlayers, client.LobbyID)
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
	case EventAddBot:
		// Only host can add bots
		if h.LobbyHosts[lobbyID] != userID {
			h.sendError(action.Client, "Only the host can add bots")
			return
		}
		g, hasGame := h.Games[lobbyID]
		if hasGame && g.Phase != "waiting" {
			h.sendError(action.Client, "Cannot add bots while a game is in progress")
			return
		}

		if h.LobbyBots[lobbyID] == nil {
			h.LobbyBots[lobbyID] = make(map[int]string)
		}

		maxPlayers := h.getMaxPlayers(lobbyID)
		uniqueUsers := make(map[int]bool)
		for c := range h.Lobbies[lobbyID] {
			uniqueUsers[c.UserID] = true
		}
		currentCount := len(uniqueUsers) + len(h.LobbyBots[lobbyID])
		if currentCount >= maxPlayers {
			h.sendError(action.Client, fmt.Sprintf("Lobby is full (maximum %d players)", maxPlayers))
			return
		}

		botIdx := len(h.LobbyBots[lobbyID])
		botPersona := game.BotPersonas[botIdx%len(game.BotPersonas)]
		botID := -500 - (botIdx + 1)
		h.LobbyBots[lobbyID][botID] = botPersona.Name

		h.broadcastGameState(lobbyID)

	case EventRemoveBot:
		if h.LobbyHosts[lobbyID] != userID {
			h.sendError(action.Client, "Only the host can remove bots")
			return
		}
		g, hasGame := h.Games[lobbyID]
		if hasGame && g.Phase != "waiting" {
			h.sendError(action.Client, "Cannot remove bots while a game is in progress")
			return
		}

		var payload RemoveBotPayload
		if err := json.Unmarshal(action.Event.Payload, &payload); err == nil && payload.BotID < 0 {
			delete(h.LobbyBots[lobbyID], payload.BotID)
		} else {
			for bID := range h.LobbyBots[lobbyID] {
				delete(h.LobbyBots[lobbyID], bID)
				break
			}
		}

		h.broadcastGameState(lobbyID)

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

		// Gather unique player IDs currently in the lobby (humans + bots)
		clients := h.Lobbies[lobbyID]
		var playerIDs []int
		seen := make(map[int]bool)
		for c := range clients {
			if !seen[c.UserID] {
				seen[c.UserID] = true
				playerIDs = append(playerIDs, c.UserID)
			}
		}
		if bots, exists := h.LobbyBots[lobbyID]; exists {
			for bID := range bots {
				if !seen[bID] {
					seen[bID] = true
					playerIDs = append(playerIDs, bID)
				}
			}
		}

		maxPlayers := h.getMaxPlayers(lobbyID)
		if len(playerIDs) < 2 {
			h.sendError(action.Client, "Not enough players to start (need at least 2 players or bots)")
			return
		}
		if len(playerIDs) > maxPlayers {
			h.sendError(action.Client, fmt.Sprintf("Too many players to start (maximum %d players)", maxPlayers))
			return
		}

		// Use existing game state if it exists, otherwise create new
		g, ok := h.Games[lobbyID]
		if !ok {
			g = game.NewGame(lobbyID, playerIDs)
			g.HostID = h.LobbyHosts[lobbyID]
			g.MaxPlayers = maxPlayers
		} else {
			// Ensure player list is up to date for the new round
			g.Players = playerIDs
			if g.MaxPlayers == 0 {
				g.MaxPlayers = maxPlayers
			}
		}

		// Populate player names from connected clients and bots
		for c := range clients {
			g.PlayerNames[c.UserID] = c.Username
		}
		if bots, exists := h.LobbyBots[lobbyID]; exists {
			for bID, bName := range bots {
				g.PlayerNames[bID] = bName
			}
		}

		// Alternating trump sequence: Hearts -> Spades -> Diamonds -> Clubs (Clover)
		trumpSeq := []game.Suit{game.Hearts, game.Spades, game.Diamonds, game.Clubs}
		selectedTrump := game.Hearts
		if g.TrumpSuit != "" {
			for idx, s := range trumpSeq {
				if s == g.TrumpSuit {
					selectedTrump = trumpSeq[(idx+1)%len(trumpSeq)]
					break
				}
			}
		} else if payload.TrumpSuit != "" {
			selectedTrump = payload.TrumpSuit
		}

		cardsToDeal := payload.CardsPerPlayer
		if cardsToDeal <= 0 && len(g.Players) > 0 {
			cardsToDeal = 52 / len(g.Players)
		}

		if err := g.StartRound(cardsToDeal, selectedTrump); err != nil {
			h.sendError(action.Client, err.Error())
			return
		}

		h.Games[lobbyID] = g
		h.broadcastGameState(lobbyID)
		h.scheduleBotMove(lobbyID)

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
		h.scheduleBotMove(lobbyID)

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
		if g.Phase == "finished" {
			h.recordGameStats(g)
		} else {
			h.scheduleBotMove(lobbyID)
		}
		// (Game over lobby deletion is handled when the last player unregisters)
	
	default:
		log.Printf("Unknown event type: %s", action.Event.Type)
	}
}

// recordGameStats updates win/loss stats in PostgreSQL for registered players (ID > 0)
func (h *Hub) recordGameStats(g *game.GameState) {
	if h.db == nil || len(g.Scores) == 0 {
		return
	}

	maxScore := -999999
	for _, score := range g.Scores {
		if score > maxScore {
			maxScore = score
		}
	}

	for playerID, score := range g.Scores {
		// Only update stats for registered accounts (positive IDs)
		if playerID > 0 {
			if score == maxScore {
				h.db.Exec("UPDATE users SET wins = wins + 1 WHERE id = ?", playerID)
			} else {
				h.db.Exec("UPDATE users SET losses = losses + 1 WHERE id = ?", playerID)
			}
		}
	}
}

// scheduleBotMove checks if the current turn belongs to a bot and schedules an action
func (h *Hub) scheduleBotMove(lobbyID string) {
	g, ok := h.Games[lobbyID]
	if !ok || len(g.Players) == 0 {
		return
	}

	if g.Phase != "bidding" && g.Phase != "playing" {
		return
	}

	currentPID := g.Players[g.TurnIndex]
	bots := h.LobbyBots[lobbyID]
	if bots == nil {
		return
	}
	botName, isBot := bots[currentPID]
	if !isBot {
		return
	}

	// Snapshot needed fields for the goroutine
	currentPhase := g.Phase
	turnIndex := g.TurnIndex
	hand := make([]game.Card, len(g.Hands[currentPID]))
	copy(hand, g.Hands[currentPID])
	trick := make([]game.Play, len(g.CurrentTrick))
	copy(trick, g.CurrentTrick)
	trump := g.TrumpSuit
	cardsPerPlayer := g.CardsPerPlayer
	myBid := g.Bids[currentPID]
	myWon := g.TricksWon[currentPID]
	numPlayers := len(g.Players)
	isDealer := (turnIndex == (g.LeadIndex+numPlayers-1)%numPlayers)

	bidsSnapshot := make(map[int]int)
	for k, v := range g.Bids {
		bidsSnapshot[k] = v
	}

	go func() {
		// Human-like deliberation pause
		time.Sleep(800 * time.Millisecond)

		var actionEvent Event
		if currentPhase == "bidding" {
			calculatedBid := game.CalculateBid(hand, trump, cardsPerPlayer, bidsSnapshot, isDealer)
			payloadBytes, _ := json.Marshal(PlaceBidPayload{Bid: calculatedBid})
			actionEvent = Event{
				Type:    EventPlaceBid,
				Payload: payloadBytes,
			}
		} else if currentPhase == "playing" {
			chosenCard := game.ChooseCardToPlay(hand, trick, trump, myBid, myWon, numPlayers)
			payloadBytes, _ := json.Marshal(PlayCardPayload{Card: chosenCard})
			actionEvent = Event{
				Type:    EventPlayCard,
				Payload: payloadBytes,
			}
		}

		botClient := &Client{
			UserID:   currentPID,
			Username: botName,
			LobbyID:  lobbyID,
		}
		h.Actions <- Action{
			Client: botClient,
			Event:  actionEvent,
		}
	}()
}

// sendError sends a targeted error message back to the offending client
func (h *Hub) sendError(client *Client, message string) {
	if client == nil || client.Send == nil {
		log.Printf("[Notice]: %s", message)
		return
	}
	errPayload := ErrorPayload{Message: message}
	b, _ := json.Marshal(errPayload)
	
	event := Event{
		Type:    EventError,
		Payload: b,
	}
	eb, _ := json.Marshal(event)
	select {
	case client.Send <- eb:
	default:
		client.CloseSend()
	}
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
			client.CloseSend()
			delete(h.Lobbies[player.LobbyID], client)
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
		if bots, exists := h.LobbyBots[lobbyID]; exists {
			for bID := range bots {
				if !seen[bID] {
					seen[bID] = true
					playerIDs = append(playerIDs, bID)
				}
			}
		}
		g = game.NewGame(lobbyID, playerIDs)
		g.HostID = h.LobbyHosts[lobbyID]
		g.MaxPlayers = h.getMaxPlayers(lobbyID)
		// We DO NOT save this to h.Games yet, it's just a temporary state for the UI
	} else {
		if g.MaxPlayers == 0 {
			g.MaxPlayers = h.getMaxPlayers(lobbyID)
		}
	}

	// Always populate player names from connected clients and bots
	for c := range clients {
		g.PlayerNames[c.UserID] = c.Username
	}
	if bots, exists := h.LobbyBots[lobbyID]; exists {
		for bID, bName := range bots {
			g.PlayerNames[bID] = bName
		}
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
		client.CloseSend()
		delete(h.Lobbies[client.LobbyID], client)
	}
}
