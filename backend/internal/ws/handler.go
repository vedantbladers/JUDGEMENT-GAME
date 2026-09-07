package ws

import (
	"log"
	"net/http"

	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
	"github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/middleware"
)

// Handler manages WebSocket upgrades
type Handler struct {
	Hub         *Hub
	frontendURL string
	upgrader    websocket.Upgrader
}

func isAllowedOrigin(origin string, frontendURL string) bool {
	if origin == "" {
		return true // Allow same-origin or non-browser clients
	}
	allowed := []string{
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"http://localhost:8080",
		"http://127.0.0.1:8080",
		"http://localhost:5173",
	}
	if frontendURL != "" {
		allowed = append(allowed, strings.TrimRight(frontendURL, "/"))
	}
	originTrimmed := strings.TrimRight(origin, "/")
	for _, a := range allowed {
		if strings.EqualFold(originTrimmed, a) {
			return true
		}
	}
	return false
}

// NewHandler creates a new WebSocket handler with secure origin validation
func NewHandler(hub *Hub, frontendURL string) *Handler {
	return &Handler{
		Hub:         hub,
		frontendURL: frontendURL,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				return isAllowedOrigin(r.Header.Get("Origin"), frontendURL)
			},
		},
	}
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
	conn, err := h.upgrader.Upgrade(w, r, nil)
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
