package database

import (
	"log"

	"github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Connect returns a new gorm database connection
func Connect(dbUrl string) *gorm.DB {
	db, err := gorm.Open(postgres.Open(dbUrl), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Run auto migrations
	err = db.AutoMigrate(
		&models.User{},
		&models.Lobby{},
		&models.LobbyPlayer{},
	)
	if err != nil {
		log.Fatalf("Failed to run database migrations: %v", err)
	}

	log.Println("Database schema auto-migrated successfully.")
	log.Println("Successfully connected to the database with GORM!")
	
	return db
}
