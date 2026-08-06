package ws

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
	"github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/middleware"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Allow all origins for development
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Handler manages WebSocket upgrades
type Handler struct {
	Hub *Hub
}

// NewHandler creates a new WebSocket handler
func NewHandler(hub *Hub) *Handler {
	return &Handler{Hub: hub}
}

// RegisterRoutes registers the websocket route
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/{lobbyID}/ws", h.serveWs)
}

// serveWs handles websocket requests from the peer.
func (h *Handler) serveWs(w http.ResponseWriter, r *http.Request) {
	// 1. Get UserID from the JWT context (injected by AuthMiddleware)
	userID, ok := r.Context().Value(middleware.ContextUserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. Get LobbyID from the URL
	lobbyID := chi.URLParam(r, "lobbyID")
	if lobbyID == "" {
		http.Error(w, "Lobby ID is required", http.StatusBadRequest)
		return
	}

	// 3. Get Username from query param
	username := r.URL.Query().Get("username")
	if username == "" {
		username = "Player"
	}

	// 4. Upgrade the HTTP connection to a WebSocket connection
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade failed:", err)
		return
	}

	// 5. Create the client
	client := &Client{
		Hub:      h.Hub,
		Conn:     conn,
		Send:     make(chan []byte, 256),
		UserID:   userID,
		Username: username,
		LobbyID:  lobbyID,
	}
	
	// 5. Register the client with the hub
	client.Hub.Register <- client

	// 6. Allow collection of memory referenced by the caller by doing all work in new goroutines.
	go client.writePump()
	go client.readPump()
}
