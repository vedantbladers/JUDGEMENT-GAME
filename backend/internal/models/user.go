package models

import "time"

// User represents a user in the database
type User struct {
	ID           int       `json:"id" gorm:"primaryKey"`
	Username     string    `json:"username" gorm:"uniqueIndex;not null"`
	Email        string    `json:"email" gorm:"uniqueIndex;not null"`
	PasswordHash string    `json:"-" gorm:"not null"` // Never return the hash in JSON
	Wins         int       `json:"wins" gorm:"default:0"`
	Losses       int       `json:"losses" gorm:"default:0"`
	IsGuest      bool      `json:"is_guest" gorm:"-"`
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime"`
}

// RegisterRequest represents the payload for user registration
type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginRequest represents the payload for user login
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// GuestLoginRequest represents the payload for guest access
type GuestLoginRequest struct {
	Username string `json:"username"`
}

// AuthResponse represents the payload returned after successful login/registration
type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

