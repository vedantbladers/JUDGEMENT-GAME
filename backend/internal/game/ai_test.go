package game

import (
	"testing"
)

func TestCalculateBid(t *testing.T) {
	// Hand with Ace of trump, Ace of side suit, and two low cards
	trump := Spades
	hand := []Card{
		{Suit: Spades, Rank: Ace},
		{Suit: Hearts, Rank: Ace},
		{Suit: Clubs, Rank: Two},
		{Suit: Diamonds, Rank: Three},
	}

	bid := CalculateBid(hand, trump, 4, map[int]int{}, false)
	if bid < 1 || bid > 3 {
		t.Errorf("expected bid around 2 for two Aces, got %d", bid)
	}

	// Any bid amount between 0 and len(hand) is allowed
	priorBids := map[int]int{1: 1, 2: 1}
	dealerBid := CalculateBid(hand, trump, 4, priorBids, true)
	if dealerBid < 0 || dealerBid > len(hand) {
		t.Errorf("dealer bid out of bounds: %d", dealerBid)
	}
}

func TestChooseCardToPlay_Lead(t *testing.T) {
	trump := Spades
	hand := []Card{
		{Suit: Hearts, Rank: Ace},
		{Suit: Hearts, Rank: Two},
		{Suit: Spades, Rank: King}, // Trump
	}

	// 1. Bot needs tricks -> should lead Ace of Hearts (sure-winner side card)
	card := ChooseCardToPlay(hand, []Play{}, trump, 2, 0, 4)
	if card.Suit != Hearts || card.Rank != Ace {
		t.Errorf("expected Ace of Hearts lead when needing tricks, got %v", card)
	}

	// 2. Bot already met bid (bid=1, won=1) -> should dump lowest non-trump card
	cardLow := ChooseCardToPlay(hand, []Play{}, trump, 1, 1, 4)
	if cardLow.Suit != Hearts || cardLow.Rank != Two {
		t.Errorf("expected Two of Hearts lead to avoid winning trick, got %v", cardLow)
	}
}

func TestChooseCardToPlay_FollowSuit(t *testing.T) {
	trump := Spades
	hand := []Card{
		{Suit: Hearts, Rank: King},
		{Suit: Hearts, Rank: Ten},
		{Suit: Hearts, Rank: Four},
	}

	// Current trick led by Hearts Queen (value 12)
	trick := []Play{
		{PlayerID: 1, Card: Card{Suit: Hearts, Rank: Queen}},
	}

	// If bot needs tricks: King can beat Queen. Should play King.
	card := ChooseCardToPlay(hand, trick, trump, 1, 0, 4)
	if card.Suit != Hearts || card.Rank != King {
		t.Errorf("expected King of Hearts to beat Queen, got %v", card)
	}

	// If bot already met bid (needs 0 more tricks): should play lowest card or safe card
	cardAvoid := ChooseCardToPlay(hand, trick, trump, 1, 1, 4)
	if cardAvoid.Suit != Hearts || cardAvoid.Rank != Ten { // Ten is highest safe card below Queen
		t.Errorf("expected Ten of Hearts (highest safe under Queen), got %v", cardAvoid)
	}
}

func TestChooseCardToPlay_TrumpRuff(t *testing.T) {
	trump := Spades
	hand := []Card{
		{Suit: Spades, Rank: Four},  // Trump
		{Suit: Spades, Rank: Jack},  // Trump
		{Suit: Clubs, Rank: Two},
	}

	// Lead suit is Hearts Ace. Bot is void in Hearts.
	trick := []Play{
		{PlayerID: 1, Card: Card{Suit: Hearts, Rank: Ace}},
	}

	// Bot needs tricks -> should trump with lowest trump (Spades 4)
	card := ChooseCardToPlay(hand, trick, trump, 1, 0, 4)
	if card.Suit != Spades || card.Rank != Four {
		t.Errorf("expected 4 of Spades to trump trick, got %v", card)
	}

	// Bot does NOT want tricks -> should discard non-trump junk (Clubs 2), NOT trump!
	cardDiscard := ChooseCardToPlay(hand, trick, trump, 1, 1, 4)
	if cardDiscard.Suit == Spades {
		t.Errorf("bot should not trump when avoiding tricks! Got %v", cardDiscard)
	}
}
