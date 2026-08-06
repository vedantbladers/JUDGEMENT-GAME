package lobby

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/middleware"
	"github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/models"
)

// Handler manages HTTP requests for lobbies
type Handler struct {
	service *Service
}

// NewHandler creates a new lobby handler
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers the lobby routes to a chi router
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Post("/create", h.createLobby)
	r.Post("/{lobbyID}/join", h.joinLobby)
}

func (h *Handler) createLobby(w http.ResponseWriter, r *http.Request) {
	// Extract the userID from the context (injected by AuthMiddleware)
	userID, ok := r.Context().Value(middleware.ContextUserIDKey).(int)
	if !ok {
		h.respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req models.CreateLobbyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	resp, err := h.service.CreateLobby(userID, &req)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.respondJSON(w, http.StatusCreated, resp)
}

func (h *Handler) joinLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextUserIDKey).(int)
	if !ok {
		h.respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	lobbyID := chi.URLParam(r, "lobbyID")
	if lobbyID == "" {
		h.respondError(w, http.StatusBadRequest, "Lobby ID is required")
		return
	}

	resp, err := h.service.JoinLobby(userID, lobbyID)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, resp)
}

// Helper function for JSON responses
func (h *Handler) respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

// Helper function for error responses
func (h *Handler) respondError(w http.ResponseWriter, status int, message string) {
	h.respondJSON(w, status, map[string]interface{}{
		"success": false,
		"error": map[string]string{
			"message": message,
		},
	})
}
