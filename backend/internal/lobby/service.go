package lobby

import (
	"errors"
	"strings"

	"github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/models"
)

// Service handles business logic for lobbies
type Service struct {
	repo *Repository
}

// NewService creates a new lobby service
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// CreateLobby validates and creates a new game lobby
func (s *Service) CreateLobby(hostID int, username string, req *models.CreateLobbyRequest) (*models.LobbyResponse, error) {
	if req.MaxPlayers < 2 || req.MaxPlayers > 4 {
		// Judgement usually requires 4 players, but we can allow 2-4 for testing
		return nil, errors.New("lobby max players must be between 2 and 4")
	}

	lobby, err := s.repo.CreateLobby(hostID, req.MaxPlayers, username)
	if err != nil {
		return nil, errors.New("failed to create lobby")
	}

	players, err := s.repo.GetPlayersInLobby(lobby.ID)
	if err != nil {
		return nil, errors.New("failed to fetch players")
	}

	return &models.LobbyResponse{
		Lobby:   *lobby,
		Players: players,
	}, nil
}

// JoinLobby allows a user to join an existing lobby
func (s *Service) JoinLobby(userID int, username string, lobbyID string) (*models.LobbyResponse, error) {
	lobbyID = strings.ToUpper(strings.TrimSpace(lobbyID))

	// Fetch the lobby to check its status and player count
	lobby, err := s.repo.GetLobby(lobbyID)
	if err != nil {
		return nil, errors.New("lobby not found")
	}

	if lobby.Status != "waiting" {
		return nil, errors.New("cannot join lobby: game is already in progress or finished")
	}

	// Check if full
	players, err := s.repo.GetPlayersInLobby(lobbyID)
	if err != nil {
		return nil, errors.New("failed to fetch players")
	}

	// If the user is already in the lobby, just return success
	for _, p := range players {
		if p.ID == userID {
			return &models.LobbyResponse{
				Lobby:   *lobby,
				Players: players,
			}, nil
		}
	}

	if len(players) >= lobby.MaxPlayers {
		return nil, errors.New("lobby is full")
	}

	// Actually join the lobby
	if err := s.repo.JoinLobby(lobbyID, userID, username); err != nil {
		return nil, errors.New("failed to join lobby")
	}

	// Fetch updated players
	players, _ = s.repo.GetPlayersInLobby(lobbyID)

	return &models.LobbyResponse{
		Lobby:   *lobby,
		Players: players,
	}, nil
}
