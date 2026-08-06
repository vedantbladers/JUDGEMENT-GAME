package game



// Play represents a card played by a specific player
type Play struct {
	PlayerID int  `json:"player_id"`
	Card     Card `json:"card"`
}

// GameState holds the entire state of an active Judgement game
type GameState struct {
	LobbyID      string            `json:"lobby_id"`
	Players      []int             `json:"players"`      // Array of User IDs
	PlayerNames  map[int]string    `json:"player_names"` // UserID -> Username
	HostID       int               `json:"host_id"`      // The creator of the lobby
	Scores       map[int]int       `json:"scores"`
	
	// Current Round State
	CardsPerPlayer int            `json:"cards_per_player"`
	TrumpSuit      Suit           `json:"trump_suit"`
	Hands          map[int][]Card `json:"hands"`
	Bids           map[int]int    `json:"bids"`
	TricksWon      map[int]int    `json:"tricks_won"`
	
	// Turn Management
	DealerIndex int `json:"dealer_index"`
	TurnIndex   int `json:"turn_index"`   // Whose turn is it to bid or play
	LeadIndex   int `json:"lead_index"`   // Who lead the current trick
	
	// Trick State
	CurrentTrick    []Play `json:"current_trick"`
	LastTrick       []Play `json:"last_trick"`
	LastTrickWinner int    `json:"last_trick_winner"`
	Phase           string `json:"phase"` // "waiting", "bidding", "playing", "finished"
}

// NewGame initializes a new game state
func NewGame(lobbyID string, playerIDs []int) *GameState {
	return &GameState{
		LobbyID:     lobbyID,
		Players:     playerIDs,
		PlayerNames: make(map[int]string),
		Scores:      make(map[int]int),
		Hands:       make(map[int][]Card),
		Bids:        make(map[int]int),
		TricksWon:   make(map[int]int),
		Phase:       "waiting",
	}
}

// StartRound begins a new round of Judgement
func (g *GameState) StartRound(cardsPerPlayer int, trump Suit) error {
	g.CardsPerPlayer = cardsPerPlayer
	g.TrumpSuit = trump
	g.Bids = make(map[int]int)
	g.TricksWon = make(map[int]int)
	g.CurrentTrick = []Play{}
	g.LastTrick = []Play{}
	g.LastTrickWinner = 0
	g.Phase = "bidding"

	// Move dealer to the next player
	g.DealerIndex = (g.DealerIndex + 1) % len(g.Players)
	// The player left of the dealer starts bidding
	g.TurnIndex = (g.DealerIndex + 1) % len(g.Players)
	g.LeadIndex = g.TurnIndex

	deck := NewDeck()
	Shuffle(deck)

	hands, _, err := Deal(deck, len(g.Players), cardsPerPlayer)
	if err != nil {
		return err
	}

	for i, playerID := range g.Players {
		g.Hands[playerID] = hands[i]
	}

	return nil
}
