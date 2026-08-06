package lobby

import (
	"errors"
	"fmt"
	"math/rand"
	"time"

	"github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/models"
	"gorm.io/gorm"
)

func init() {
	// Seed the random number generator
	rand.Seed(time.Now().UnixNano())
}

// Repository handles database operations for lobbies
type Repository struct {
	db *gorm.DB
}

// NewRepository creates a new lobby repository
func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

// generateLobbyID creates a random 6-character string
func generateLobbyID() string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 6)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}

// CreateLobby inserts a new lobby and adds the host as the first player
func (r *Repository) CreateLobby(hostID, maxPlayers int) (*models.Lobby, error) {
	lobbyID := generateLobbyID()
	lobby := &models.Lobby{
		ID:         lobbyID,
		HostID:     hostID,
		Status:     "waiting",
		MaxPlayers: maxPlayers,
	}

	err := r.db.Transaction(func(tx *gorm.DB) error {
		// Insert lobby
		if err := tx.Create(lobby).Error; err != nil {
			return err
		}

		// Add host to lobby_players
		lobbyPlayer := &models.LobbyPlayer{
			LobbyID: lobbyID,
			UserID:  hostID,
		}
		if err := tx.Create(lobbyPlayer).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to create lobby: %w", err)
	}

	return lobby, nil
}

// GetLobby retrieves a lobby by its ID
func (r *Repository) GetLobby(lobbyID string) (*models.Lobby, error) {
	var lobby models.Lobby
	result := r.db.First(&lobby, "id = ?", lobbyID)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("lobby not found")
		}
		return nil, fmt.Errorf("database error: %w", result.Error)
	}
	return &lobby, nil
}

// JoinLobby adds a user to a lobby
func (r *Repository) JoinLobby(lobbyID string, userID int) error {
	lobbyPlayer := &models.LobbyPlayer{
		LobbyID: lobbyID,
		UserID:  userID,
	}
	result := r.db.Create(lobbyPlayer)
	if result.Error != nil {
		return fmt.Errorf("failed to join lobby (you might already be in it): %w", result.Error)
	}
	return nil
}

// GetPlayersInLobby retrieves all users currently in a lobby
func (r *Repository) GetPlayersInLobby(lobbyID string) ([]models.User, error) {
	var players []models.User
	
	// Join lobby_players with users table
	err := r.db.
		Joins("JOIN lobby_players ON users.id = lobby_players.user_id").
		Where("lobby_players.lobby_id = ?", lobbyID).
		Order("lobby_players.joined_at ASC").
		Find(&players).Error

	return players, err
}
