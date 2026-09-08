package ws

import (
	"encoding/json"
	"testing"
)

func TestHub_BotLimits_TwoPlayers(t *testing.T) {
	hub := NewHub(nil)
	lobbyID := "TEST2P"
	hostID := 1
	hub.LobbyMaxPlayers[lobbyID] = 2

	// Register host
	hostClient := &Client{
		Hub:      hub,
		UserID:   hostID,
		Username: "HostPlayer",
		LobbyID:  lobbyID,
		Send:     make(chan []byte, 10),
	}
	hub.Lobbies[lobbyID] = map[*Client]bool{hostClient: true}
	hub.LobbyHosts[lobbyID] = hostID

	// 1. Add first bot -> should succeed (1 human + 1 bot = 2 players = max)
	hub.handleAction(Action{
		Client: hostClient,
		Event:  Event{Type: EventAddBot},
	})

	if len(hub.LobbyBots[lobbyID]) != 1 {
		t.Fatalf("Expected 1 bot in lobby, got %d", len(hub.LobbyBots[lobbyID]))
	}

	// 2. Add second bot -> should fail because max is 2
	hub.handleAction(Action{
		Client: hostClient,
		Event:  Event{Type: EventAddBot},
	})

	if len(hub.LobbyBots[lobbyID]) != 1 {
		t.Fatalf("Expected still 1 bot in lobby (max 2 players), got %d", len(hub.LobbyBots[lobbyID]))
	}

	// Verify error sent
	select {
	case msg := <-hostClient.Send:
		var event Event
		if err := json.Unmarshal(msg, &event); err == nil && event.Type == EventError {
			var errPayload ErrorPayload
			json.Unmarshal(event.Payload, &errPayload)
			if errPayload.Message != "Lobby is full (maximum 2 players)" {
				t.Errorf("Expected error 'Lobby is full (maximum 2 players)', got '%s'", errPayload.Message)
			}
		}
	default:
		t.Error("Expected error event to be sent to host")
	}
}

func TestHub_BotLimits_ThreePlayers(t *testing.T) {
	hub := NewHub(nil)
	lobbyID := "TEST3P"
	hostID := 10
	hub.LobbyMaxPlayers[lobbyID] = 3

	hostClient := &Client{
		Hub:      hub,
		UserID:   hostID,
		Username: "HostPlayer",
		LobbyID:  lobbyID,
		Send:     make(chan []byte, 10),
	}
	hub.Lobbies[lobbyID] = map[*Client]bool{hostClient: true}
	hub.LobbyHosts[lobbyID] = hostID

	// Add Bot 1 -> (1 human + 1 bot = 2)
	hub.handleAction(Action{Client: hostClient, Event: Event{Type: EventAddBot}})
	// Add Bot 2 -> (1 human + 2 bots = 3)
	hub.handleAction(Action{Client: hostClient, Event: Event{Type: EventAddBot}})

	if len(hub.LobbyBots[lobbyID]) != 2 {
		t.Fatalf("Expected 2 bots in lobby, got %d", len(hub.LobbyBots[lobbyID]))
	}

	// Add Bot 3 -> should fail (would be 4 players, exceeding max 3)
	hub.handleAction(Action{Client: hostClient, Event: Event{Type: EventAddBot}})

	if len(hub.LobbyBots[lobbyID]) != 2 {
		t.Fatalf("Expected still 2 bots in lobby (max 3 players), got %d", len(hub.LobbyBots[lobbyID]))
	}
}

func TestHub_BotLimits_FourPlayers(t *testing.T) {
	hub := NewHub(nil)
	lobbyID := "TEST4P"
	hostID := 20
	hub.LobbyMaxPlayers[lobbyID] = 4

	hostClient := &Client{
		Hub:      hub,
		UserID:   hostID,
		Username: "HostPlayer",
		LobbyID:  lobbyID,
		Send:     make(chan []byte, 10),
	}
	hub.Lobbies[lobbyID] = map[*Client]bool{hostClient: true}
	hub.LobbyHosts[lobbyID] = hostID

	// Add 3 bots -> total 4 players
	for i := 0; i < 3; i++ {
		hub.handleAction(Action{Client: hostClient, Event: Event{Type: EventAddBot}})
	}

	if len(hub.LobbyBots[lobbyID]) != 3 {
		t.Fatalf("Expected 3 bots in lobby, got %d", len(hub.LobbyBots[lobbyID]))
	}

	// Add 4th bot -> should fail
	hub.handleAction(Action{Client: hostClient, Event: Event{Type: EventAddBot}})

	if len(hub.LobbyBots[lobbyID]) != 3 {
		t.Fatalf("Expected still 3 bots in lobby (max 4 players), got %d", len(hub.LobbyBots[lobbyID]))
	}
}
