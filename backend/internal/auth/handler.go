package auth

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/models"
)

// Handler manages HTTP requests for auth
type Handler struct {
	service *Service
}

// NewHandler creates a new auth handler
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers the auth routes to a chi router
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Post("/register", h.register)
	r.Post("/login", h.login)
	r.Post("/guest", h.guestLogin)
}

func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Username == "" || req.Email == "" || req.Password == "" {
		h.respondError(w, http.StatusBadRequest, "Username, email, and password are required")
		return
	}

	resp, err := h.service.Register(&req)
	if err != nil {
		h.respondError(w, http.StatusConflict, err.Error())
		return
	}

	h.respondJSON(w, http.StatusCreated, resp)
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	resp, err := h.service.Login(&req)
	if err != nil {
		h.respondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	h.respondJSON(w, http.StatusOK, resp)
}

func (h *Handler) guestLogin(w http.ResponseWriter, r *http.Request) {
	var req models.GuestLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	resp, err := h.service.GuestLogin(&req)
	if err != nil {
		h.respondError(w, http.StatusConflict, err.Error())
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
