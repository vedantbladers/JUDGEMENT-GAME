package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// UserIDKey is the context key for the user ID
type UserIDKey string

const ContextUserIDKey UserIDKey = "userID"

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
				http.Error(w, "Authorization header missing", http.StatusUnauthorized)
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				http.Error(w, "Invalid authorization format", http.StatusUnauthorized)
				return
			}
			tokenString := parts[1]

			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				// Validate the alg is what we expect
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, http.ErrAbortHandler
				}
				return []byte(secret), nil
			})

			if err != nil || !token.Valid {
				http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, "Invalid token claims", http.StatusUnauthorized)
				return
			}

			// In jwt.MapClaims, numeric values are parsed as float64
			userIDFloat, ok := claims["user_id"].(float64)
			if !ok {
				http.Error(w, "Invalid user ID in token", http.StatusUnauthorized)
				return
			}

			// Add the user ID to the request context
			ctx := context.WithValue(r.Context(), ContextUserIDKey, int(userIDFloat))
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
