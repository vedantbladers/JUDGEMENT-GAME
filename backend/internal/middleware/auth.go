package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// UserIDKey is the context key for the user ID
type UserIDKey string
type UsernameKey string

const ContextUserIDKey UserIDKey = "userID"
const ContextUsernameKey UsernameKey = "username"

func sendAuthError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"error": map[string]string{
			"message": message,
		},
	})
}

// AuthMiddleware validates JWT tokens and injects the user ID into the context
func AuthMiddleware(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			
			// Fallback: check query param for WebSocket connections
			// (browsers cannot set custom headers on WebSocket upgrade requests)
			if authHeader == "" {
				tokenParam := r.URL.Query().Get("token")
				if tokenParam != "" {
					authHeader = "Bearer " + tokenParam
				}
			}

			if authHeader == "" {
				sendAuthError(w, http.StatusUnauthorized, "Authorization header missing")
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				sendAuthError(w, http.StatusUnauthorized, "Invalid authorization format")
				return
			}
			tokenString := parts[1]

			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				// Validate the alg is what we expect
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return []byte(secret), nil
			})

			if err != nil || !token.Valid {
				sendAuthError(w, http.StatusUnauthorized, "Invalid or expired token")
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				sendAuthError(w, http.StatusUnauthorized, "Invalid token claims")
				return
			}

			// In jwt.MapClaims, numeric values are parsed as float64
			userIDFloat, ok := claims["user_id"].(float64)
			if !ok {
				sendAuthError(w, http.StatusUnauthorized, "Invalid user ID in token")
				return
			}

			username, _ := claims["username"].(string)

			// Add the user ID and username to the request context
			ctx := context.WithValue(r.Context(), ContextUserIDKey, int(userIDFloat))
			ctx = context.WithValue(ctx, ContextUsernameKey, username)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
