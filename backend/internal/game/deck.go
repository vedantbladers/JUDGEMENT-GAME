package game

import (
	"errors"
	"math/rand"
	"time"
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

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

// Shuffle randomizes the order of cards in a deck (Fisher-Yates algorithm)
func Shuffle(deck []Card) {
	for i := len(deck) - 1; i > 0; i-- {
		j := rand.Intn(i + 1)
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
