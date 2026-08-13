package game

import "testing"

func TestGameInitialization(t *testing.T) {
	players := []int{1, 2, 3, 4}
	g := NewGame("LOBBY123", players)

	if g.Phase != "waiting" {
		t.Errorf("Expected initial phase to be 'waiting', got %s", g.Phase)
	}

	err := g.StartRound(5, Spades)
	if err != nil {
		t.Fatalf("Failed to start round: %v", err)
	}

	if g.Phase != "bidding" {
		t.Errorf("Expected phase to be 'bidding', got %s", g.Phase)
	}

	if len(g.Hands[1]) != 5 {
		t.Errorf("Expected player 1 to have 5 cards, got %d", len(g.Hands[1]))
	}
}

func TestBiddingRules(t *testing.T) {
	players := []int{1, 2, 3, 4}
	g := NewGame("LOBBY123", players)
	g.StartRound(5, Spades)

	// In a new round, dealer index is 1 (player 2), turn index is 2 (player 3)
	// Let's force TurnIndex for easier testing
	g.TurnIndex = 0

	// Valid bid
	err := g.PlaceBid(1, 2)
	if err != nil {
		t.Errorf("Unexpected error for valid bid: %v", err)
	}

	// Out of turn bid
	err = g.PlaceBid(4, 1)
	if err == nil {
		t.Error("Expected error when bidding out of turn")
	}

	// Continue valid bids
	g.PlaceBid(2, 1)
	g.PlaceBid(3, 1)

	// Total bids so far: 2 + 1 + 1 = 4. Cards per player = 5.
	// Player 4 bids 1
	err = g.PlaceBid(4, 1)
	if err != nil {
		t.Errorf("Unexpected error for valid last bid: %v", err)
	}

	if g.Phase != "playing" {
		t.Errorf("Expected phase to transition to 'playing', got %s", g.Phase)
	}
}

func TestPlayingRules_MustFollowSuit(t *testing.T) {
	players := []int{1, 2}
	g := NewGame("LOBBY123", players)
	g.Phase = "playing"
	g.TurnIndex = 0

	// Setup fake hands
	g.Hands[1] = []Card{
		{Suit: Spades, Rank: Ace},
		{Suit: Hearts, Rank: Two},
	}
	g.Hands[2] = []Card{
		{Suit: Spades, Rank: King},
		{Suit: Diamonds, Rank: Two},
	}

	// Player 1 leads with Spades
	err := g.PlayCard(1, Card{Suit: Spades, Rank: Ace})
	if err != nil {
		t.Errorf("Unexpected error leading card: %v", err)
	}

	// Player 2 tries to play Diamonds instead of Spades (even though they have Spades)
	err = g.PlayCard(2, Card{Suit: Diamonds, Rank: Two})
	if err == nil {
		t.Error("Expected error because player must follow suit")
	}

	// Player 2 plays Spades
	err = g.PlayCard(2, Card{Suit: Spades, Rank: King})
	if err != nil {
		t.Errorf("Unexpected error following suit: %v", err)
	}
}

func TestEvaluateTrickAndScoring(t *testing.T) {
	players := []int{1, 2, 3}
	g := NewGame("LOBBY123", players)
	g.StartRound(1, Diamonds) // Trump is Diamonds, 1 card each
	g.Phase = "playing"

	// Override hands
	g.Hands[1] = []Card{{Suit: Spades, Rank: Ace}}
	g.Hands[2] = []Card{{Suit: Hearts, Rank: Two}} // No spades, throws off-suit
	g.Hands[3] = []Card{{Suit: Diamonds, Rank: Three}} // No spades, throws Trump

	// Force bids
	g.Bids[1] = 1
	g.Bids[2] = 0
	g.Bids[3] = 1

	// Play cards
	g.TurnIndex = 0
	g.PlayCard(1, Card{Suit: Spades, Rank: Ace})   // Lead Spades A
	g.PlayCard(2, Card{Suit: Hearts, Rank: Two})   // Off-suit H2
	g.PlayCard(3, Card{Suit: Diamonds, Rank: Three}) // Trump D3!

	// Trick should have evaluated and round should be finished
	if g.Phase != "gameOver" {
		t.Errorf("Expected game phase to be gameOver, got %s", g.Phase)
	}

	// Player 3 should have won because they played Trump!
	if g.TricksWon[3] != 1 {
		t.Errorf("Expected player 3 to win 1 trick, got %d", g.TricksWon[3])
	}

	// Scores with current scoring rules (0 on fail):
	// Player 1 bid 1, won 0 -> Score: 0
	// Player 2 bid 0, won 0 -> Score: 10 + 0 = 10
	// Player 3 bid 1, won 1 -> Score: 10 + 1 = 11
	if g.Scores[1] != 0 {
		t.Errorf("Expected player 1 score to be 0, got %d", g.Scores[1])
	}
	if g.Scores[2] != 10 {
		t.Errorf("Expected player 2 score to be 10, got %d", g.Scores[2])
	}
	if g.Scores[3] != 11 {
		t.Errorf("Expected player 3 score to be 11, got %d", g.Scores[3])
	}
}
