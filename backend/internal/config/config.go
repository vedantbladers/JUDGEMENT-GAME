package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// AppConfig holds all environment variables
type AppConfig struct {
	Port      string
	DBUrl     string
	JwtSecret string
}

// LoadConfig reads configuration from file or environment variables.
func LoadConfig() *AppConfig {
	// Attempt to load .env file, but ignore error if it doesn't exist
	// (e.g., in production where env vars are set directly)
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default port
	}

	dbUrl := os.Getenv("DB_URL")
	if dbUrl == "" {
		log.Fatal("DB_URL environment variable is required")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}

	return &AppConfig{
		Port:      port,
		DBUrl:     dbUrl,
		JwtSecret: jwtSecret,
	}
}
