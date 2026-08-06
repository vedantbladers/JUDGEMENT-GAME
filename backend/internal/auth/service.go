package auth

import (
	"errors"

	"github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

// Service handles business logic for authentication
type Service struct {
	repo   *Repository
	secret string
}

// NewService creates a new auth service
func NewService(repo *Repository, secret string) *Service {
	return &Service{
		repo:   repo,
		secret: secret,
	}
}

// Register hashes the password and saves the user
func (s *Service) Register(req *models.RegisterRequest) (*models.AuthResponse, error) {
	// Hash the password using bcrypt
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	user := &models.User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
	}

	// Save to DB
	if err := s.repo.CreateUser(user); err != nil {
		return nil, errors.New("user with this email or username already exists")
	}

	// Generate JWT
	token, err := GenerateToken(user.ID, s.secret)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	return &models.AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}

// Login verifies credentials and returns a JWT
func (s *Service) Login(req *models.LoginRequest) (*models.AuthResponse, error) {
	// Get user from DB
	user, err := s.repo.GetUserByEmail(req.Email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Compare passwords
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Generate JWT
	token, err := GenerateToken(user.ID, s.secret)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	return &models.AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}
