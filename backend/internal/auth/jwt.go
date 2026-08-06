package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// GenerateToken creates a new JWT token for a given user ID
func GenerateToken(userID int, secret string) (string, error) {
	// Create a new token object, specifying signing method and the claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Hour * 72).Unix(), // Expires in 72 hours
		"iat":     time.Now().Unix(),
	})

	// Sign and get the complete encoded token as a string using the secret
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}
