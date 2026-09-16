package game

import (
	crand "crypto/rand"
	"errors"
	"math/big"
)

// NewDeck generates a fresh, unshuffled 52-card deck
func NewDeck() []Card {
	var deck []Card
	suits := AllSuits()
	ranks := AllRanks()

	for _, suit := range suits {
		for _, rank := range ranks {
			deck = append(deck, Card{Suit: suit, Rank: rank})
		}
	}

	return deck
}

// Shuffle randomizes the order of cards in a deck using cryptographically secure randomness (Fisher-Yates algorithm)
func Shuffle(deck []Card) {
	for i := len(deck) - 1; i > 0; i-- {
		n, err := crand.Int(crand.Reader, big.NewInt(int64(i+1)))
		if err != nil {
			continue
		}
		j := int(n.Int64())
		deck[i], deck[j] = deck[j], deck[i]
	}
}

// Deal distributes a specific number of cards to a specific number of players.
// It returns a slice of hands (where each hand is a slice of Cards), and the remaining deck.
func Deal(deck []Card, numPlayers, cardsPerPlayer int) ([][]Card, []Card, error) {
	if numPlayers <= 0 {
		return nil, nil, errors.New("number of players must be greater than 0")
	}
	if cardsPerPlayer < 0 {
		return nil, nil, errors.New("cards per player cannot be negative")
	}

	totalCardsNeeded := numPlayers * cardsPerPlayer
	if totalCardsNeeded > len(deck) {
		return nil, nil, errors.New("not enough cards in the deck to deal")
	}

	hands := make([][]Card, numPlayers)
	for i := 0; i < numPlayers; i++ {
		// Slice out the cards for this player
		hands[i] = deck[:cardsPerPlayer]
		// Shift the deck forward
		deck = deck[cardsPerPlayer:]
	}

	return hands, deck, nil
}
