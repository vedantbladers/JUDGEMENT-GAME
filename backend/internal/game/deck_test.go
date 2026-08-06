package game

import (
	"testing"
)

func TestNewDeck(t *testing.T) {
	deck := NewDeck()

	if len(deck) != 52 {
		t.Errorf("Expected deck length of 52, got %d", len(deck))
	}

	// Verify all unique cards exist
	cardMap := make(map[Card]bool)
	for _, card := range deck {
		cardMap[card] = true
	}

	if len(cardMap) != 52 {
		t.Errorf("Expected 52 unique cards, found %d", len(cardMap))
	}
}

func TestShuffle(t *testing.T) {
	deck1 := NewDeck()
	deck2 := NewDeck()

	Shuffle(deck2)

	// Since probability of shuffled deck being exactly same is astronomically low,
	// we just check if they are not identical.
	isDifferent := false
	for i := range deck1 {
		if deck1[i] != deck2[i] {
			isDifferent = true
			break
		}
	}

	if !isDifferent {
		t.Error("Expected shuffled deck to be different from original deck")
	}
}

func TestDeal(t *testing.T) {
	deck := NewDeck()

	numPlayers := 4
	cardsPerPlayer := 10

	hands, remainingDeck, err := Deal(deck, numPlayers, cardsPerPlayer)
	if err != nil {
		t.Fatalf("Unexpected error during deal: %v", err)
	}

	if len(hands) != numPlayers {
		t.Errorf("Expected %d hands, got %d", numPlayers, len(hands))
	}

	for i, hand := range hands {
		if len(hand) != cardsPerPlayer {
			t.Errorf("Expected player %d to have %d cards, got %d", i, cardsPerPlayer, len(hand))
		}
	}

	expectedRemaining := 52 - (numPlayers * cardsPerPlayer)
	if len(remainingDeck) != expectedRemaining {
		t.Errorf("Expected %d remaining cards, got %d", expectedRemaining, len(remainingDeck))
	}
}

func TestDeal_Errors(t *testing.T) {
	deck := NewDeck()

	// Try dealing more cards than exist
	_, _, err := Deal(deck, 4, 20) // 80 cards
	if err == nil {
		t.Error("Expected error when dealing more cards than available")
	}

	// Try zero players
	_, _, err = Deal(deck, 0, 10)
	if err == nil {
		t.Error("Expected error when dealing to 0 players")
	}
}
