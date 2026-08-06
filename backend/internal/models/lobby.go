package models

import "time"

// Lobby represents a game room
type Lobby struct {
	ID         string    `json:"id" gorm:"primaryKey"`
	HostID     int       `json:"host_id" gorm:"not null"`
	Status     string    `json:"status" gorm:"not null;default:'waiting'"`
	MaxPlayers int       `json:"max_players" gorm:"not null"`
	CreatedAt  time.Time `json:"created_at" gorm:"autoCreateTime"`
}

// LobbyPlayer maps users to lobbies
type LobbyPlayer struct {
	LobbyID  string    `gorm:"primaryKey"`
	UserID   int       `gorm:"primaryKey"`
	JoinedAt time.Time `gorm:"autoCreateTime"`
}

// CreateLobbyRequest represents the payload for creating a lobby
type CreateLobbyRequest struct {
	MaxPlayers int `json:"max_players"`
}

// LobbyResponse represents the payload returned after creating/joining a lobby
type LobbyResponse struct {
	Lobby   Lobby  `json:"lobby"`
	Players []User `json:"players"`
}
