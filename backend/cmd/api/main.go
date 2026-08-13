package main

import (
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/auth"
	"github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/config"
	"github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/database"
	"github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/lobby"
	customMiddleware "github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/middleware"
	"github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/ws"
)

func main() {
	// 1. Load configuration (Environment variables)
	cfg := config.LoadConfig()

	// 2. Initialize the Database Connection Pool
	db := database.Connect(cfg.DBUrl)
	sqlDB, err := db.DB()
	if err == nil {
		defer sqlDB.Close() // Ensure the database connection pool is closed on shutdown
	}

	// 3. Clean up orphaned lobbies from previous server runs
	log.Println("Cleaning up any orphaned lobbies from previous sessions...")
	db.Exec("DELETE FROM lobby_players")
	db.Exec("DELETE FROM lobbies")

	// 4. Initialize the chi router
	r := chi.NewRouter()

	// 4. Register global middleware
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", cfg.FrontendUrl},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(middleware.Recoverer)
	r.Use(middleware.Logger)
	r.Use(middleware.RequestID)
	r.Use(middleware.Timeout(60 * time.Second))

	// 5. Initialize Services and Handlers
	authRepo := auth.NewRepository(db)
	authService := auth.NewService(authRepo, cfg.JwtSecret)
	authHandler := auth.NewHandler(authService)

	lobbyRepo := lobby.NewRepository(db)
	lobbyService := lobby.NewService(lobbyRepo)
	lobbyHandler := lobby.NewHandler(lobbyService)

	// Initialize WebSocket Hub
	wsHub := ws.NewHub(db)
	go wsHub.Run()
	wsHandler := ws.NewHandler(wsHub)

	// 6. Register Routes
	r.Get("/health", healthCheckHandler)

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			authHandler.RegisterRoutes(r)
		})

		r.Group(func(r chi.Router) {
			r.Use(customMiddleware.AuthMiddleware(cfg.JwtSecret))
			
			r.Route("/lobbies", func(r chi.Router) {
				lobbyHandler.RegisterRoutes(r)
				// WebSocket upgrade route (e.g. /api/v1/lobbies/ABCD12/ws)
				wsHandler.RegisterRoutes(r)
			})
		})
	})

	// 7. Start the server
	log.Printf("Starting server on port %s", cfg.Port)
	err = http.ListenAndServe(":"+cfg.Port, r)
	if err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

// healthCheckHandler responds with a simple JSON status.
func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "ok", "message": "Server is running", "database": "connected"}`))
}
