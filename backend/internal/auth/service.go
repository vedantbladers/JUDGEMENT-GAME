package auth

import (
	"crypto/rand"
	"errors"
	"math/big"
	"regexp"
	"strings"
	"time"

	"github.com/vedantbladers/JUDGEMENT-GAME/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]{2,20}$`)

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
	username := strings.TrimSpace(req.Username)
	email := strings.ToLower(strings.TrimSpace(req.Email))

	if !usernameRegex.MatchString(username) {
		return nil, errors.New("username must be 2-20 characters long and contain only letters, numbers, underscores, or hyphens")
	}

	if len(req.Password) < 6 {
		return nil, errors.New("password must be at least 6 characters long")
	}
	if len(req.Password) > 72 {
		return nil, errors.New("password cannot exceed 72 characters")
	}

	// Hash the password using bcrypt
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	user := &models.User{
		Username:     username,
		Email:        email,
		PasswordHash: string(hashedPassword),
	}

	// Save to DB
	if err := s.repo.CreateUser(user); err != nil {
		return nil, errors.New("user with this email or username already exists")
	}

	// Generate JWT
	token, err := GenerateToken(user.ID, user.Username, s.secret)
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
	email := strings.ToLower(strings.TrimSpace(req.Email))

	// Get user from DB
	user, err := s.repo.GetUserByEmail(email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Compare passwords
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Generate JWT
	token, err := GenerateToken(user.ID, user.Username, s.secret)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	return &models.AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}

// GuestLogin creates a temporary guest session if the username is not already registered
func (s *Service) GuestLogin(req *models.GuestLoginRequest) (*models.AuthResponse, error) {
	username := strings.TrimSpace(req.Username)
	if !usernameRegex.MatchString(username) {
		return nil, errors.New("nickname must be 2-20 characters long and contain only letters, numbers, underscores, or hyphens")
	}

	// Check if username is already registered as a real user
	existingUser, err := s.repo.GetUserByUsername(username)
	if err == nil && existingUser != nil {
		return nil, errors.New("username is already registered. Please sign in or choose another nickname")
	}

	// Generate a cryptographically secure negative guest ID (range -100,000,000 to -999,999,999)
	randVal, err := rand.Int(rand.Reader, big.NewInt(900000000))
	var guestID int
	if err != nil {
		guestID = -int(time.Now().UnixNano()%900000000 + 100000000)
	} else {
		guestID = -int(100000000 + randVal.Int64())
	}

	token, err := GenerateGuestToken(guestID, username, s.secret)
	if err != nil {
		return nil, errors.New("failed to generate guest token")
	}

	guestUser := models.User{
		ID:        guestID,
		Username:  username,
		Email:     "",
		IsGuest:   true,
		CreatedAt: time.Now(),
	}

	return &models.AuthResponse{
		Token: token,
		User:  guestUser,
	}, nil
}

