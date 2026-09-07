package game

import (
	"math"
)

// Bot represents the AI decision engine for Judgement.
type Bot struct {
	ID   int
	Name string
}

// Predefined bot personas
var BotPersonas = []struct {
	Name string
}{
	{Name: "Atlas (Bot)"},
	{Name: "Nova (Bot)"},
	{Name: "Sage (Bot)"},
}

// CalculateBid evaluates the bot's hand and estimates the number of tricks it should bid.
// In Judgement, the dealer is not allowed to make the total bids equal the number of cards dealt.
func CalculateBid(hand []Card, trumpSuit Suit, cardsPerPlayer int, currentBids map[int]int, isDealer bool) int {
	if len(hand) == 0 {
		return 0
	}

	trumpCount := 0
	trumpHonorsValue := 0.0
	sideHonorsValue := 0.0

	// Count suits in hand
	suitCounts := make(map[Suit]int)
	for _, c := range hand {
		suitCounts[c.Suit]++
		val := rankValue(c.Rank)

		if c.Suit == trumpSuit {
			trumpCount++
			switch val {
			case 14: // Ace
				trumpHonorsValue += 1.0
			case 13: // King
				trumpHonorsValue += 0.85
			case 12: // Queen
				trumpHonorsValue += 0.65
			case 11: // Jack
				trumpHonorsValue += 0.45
			case 10:
				trumpHonorsValue += 0.25
			}
		} else {
			// Off-suit cards
			switch val {
			case 14: // Ace
				sideHonorsValue += 0.85
			case 13: // King
				sideHonorsValue += 0.40
			case 12: // Queen
				sideHonorsValue += 0.20
			}
		}
	}

	// Extra trumps beyond high honors have ruffing potential
	extraTrumps := 0
	if trumpCount > 2 {
		extraTrumps = trumpCount - 2
	}

	// Short side suits (singletons/voids) allow ruffing if we have trumps
	shortSuitBonus := 0.0
	if trumpCount > 0 {
		for s, count := range suitCounts {
			if s != trumpSuit && count == 1 {
				shortSuitBonus += 0.3
			}
		}
	}

	estimatedTricks := trumpHonorsValue + sideHonorsValue + (float64(extraTrumps) * 0.45) + shortSuitBonus
	bid := int(math.Round(estimatedTricks))

	// Ensure bid stays within [0, len(hand)]
	if bid < 0 {
		bid = 0
	}
	if bid > len(hand) {
		bid = len(hand)
	}

	return bid
}

// ChooseCardToPlay selects the optimal card for the bot to play given current trick and game state.
func ChooseCardToPlay(hand []Card, currentTrick []Play, trumpSuit Suit, myBid int, myTricksWon int, totalPlayers int) Card {
	if len(hand) == 1 {
		return hand[0]
	}

	legalCards := getLegalCards(hand, currentTrick, trumpSuit)
	if len(legalCards) == 1 {
		return legalCards[0]
	}

	needsTricks := myTricksWon < myBid

	// Case 1: Leading the trick
	if len(currentTrick) == 0 {
		return chooseLeadCard(legalCards, trumpSuit, needsTricks)
	}

	// Case 2: Following or ruffing / sloughing
	leadSuit := currentTrick[0].Card.Suit
	currentWinnerIndex, winningVal, winningSuit := evaluateCurrentTrick(currentTrick, trumpSuit)
	_ = currentWinnerIndex

	followingLeadSuit := false
	for _, c := range legalCards {
		if c.Suit == leadSuit {
			followingLeadSuit = true
			break
		}
	}

	if followingLeadSuit {
		return chooseFollowingCard(legalCards, leadSuit, winningSuit, winningVal, needsTricks)
	}

	// Out of lead suit: can trump or discard
	return chooseOffSuitCard(legalCards, trumpSuit, winningSuit, winningVal, needsTricks)
}

// getLegalCards returns all legal cards in hand according to Judgement rules
func getLegalCards(hand []Card, currentTrick []Play, trumpSuit Suit) []Card {
	if len(currentTrick) == 0 {
		// Leading: cannot lead trump unless only trumps remain
		hasNonTrump := false
		for _, c := range hand {
			if c.Suit != trumpSuit {
				hasNonTrump = true
				break
			}
		}
		if !hasNonTrump {
			return hand
		}
		var nonTrumps []Card
		for _, c := range hand {
			if c.Suit != trumpSuit {
				nonTrumps = append(nonTrumps, c)
			}
		}
		return nonTrumps
	}

	// Following: must follow lead suit if held
	leadSuit := currentTrick[0].Card.Suit
	var leadSuitCards []Card
	for _, c := range hand {
		if c.Suit == leadSuit {
			leadSuitCards = append(leadSuitCards, c)
		}
	}
	if len(leadSuitCards) > 0 {
		return leadSuitCards
	}

	// Void in lead suit: any card is legal
	return hand
}

// evaluateCurrentTrick returns the winner info among plays made so far
func evaluateCurrentTrick(trick []Play, trumpSuit Suit) (int, int, Suit) {
	if len(trick) == 0 {
		return 0, 0, ""
	}

	leadSuit := trick[0].Card.Suit
	winningIndex := 0
	winningVal := rankValue(trick[0].Card.Rank)
	winningSuit := leadSuit

	for i := 1; i < len(trick); i++ {
		play := trick[i]
		val := rankValue(play.Card.Rank)

		if play.Card.Suit == trumpSuit {
			if winningSuit != trumpSuit {
				winningSuit = trumpSuit
				winningVal = val
				winningIndex = i
			} else if val > winningVal {
				winningVal = val
				winningIndex = i
			}
		} else if play.Card.Suit == winningSuit {
			if val > winningVal {
				winningVal = val
				winningIndex = i
			}
		}
	}

	return winningIndex, winningVal, winningSuit
}

// chooseLeadCard picks the best card to lead
func chooseLeadCard(legalCards []Card, trumpSuit Suit, needsTricks bool) Card {
	if needsTricks {
		// Try to lead a high sure-winner (Ace) in a side suit
		for _, c := range legalCards {
			if c.Suit != trumpSuit && rankValue(c.Rank) == 14 {
				return c
			}
		}
		// Or highest card available
		highest := legalCards[0]
		for _, c := range legalCards[1:] {
			if rankValue(c.Rank) > rankValue(highest.Rank) {
				highest = c
			}
		}
		return highest
	}

	// When we have met our bid: lead lowest card to dump the lead safely
	lowest := legalCards[0]
	for _, c := range legalCards[1:] {
		if rankValue(c.Rank) < rankValue(lowest.Rank) {
			lowest = c
		}
	}
	return lowest
}

// chooseFollowingCard picks a card when following the lead suit
func chooseFollowingCard(legalCards []Card, leadSuit Suit, winningSuit Suit, winningVal int, needsTricks bool) Card {
	if needsTricks {
		if winningSuit == leadSuit {
			// Find cards that can beat the current winning lead card
			var winningOptions []Card
			for _, c := range legalCards {
				if rankValue(c.Rank) > winningVal {
					winningOptions = append(winningOptions, c)
				}
			}
			if len(winningOptions) > 0 {
				// Play the LOWEST winning option to conserve higher cards
				lowestWinner := winningOptions[0]
				for _, c := range winningOptions[1:] {
					if rankValue(c.Rank) < rankValue(lowestWinner.Rank) {
						lowestWinner = c
					}
				}
				return lowestWinner
			}
		}
		// If cannot win, dump the lowest card
		return findLowestCard(legalCards)
	}

	// Does NOT want tricks: play lowest or non-winning card
	if winningSuit == leadSuit {
		var safeCards []Card
		for _, c := range legalCards {
			if rankValue(c.Rank) < winningVal {
				safeCards = append(safeCards, c)
			}
		}
		if len(safeCards) > 0 {
			// Dump the highest safe card to eliminate dangerous high cards
			return findHighestCard(safeCards)
		}
	}
	return findLowestCard(legalCards)
}

// chooseOffSuitCard handles moves when player is void in lead suit
func chooseOffSuitCard(legalCards []Card, trumpSuit Suit, winningSuit Suit, winningVal int, needsTricks bool) Card {
	var trumps []Card
	var nonTrumps []Card
	for _, c := range legalCards {
		if c.Suit == trumpSuit {
			trumps = append(trumps, c)
		} else {
			nonTrumps = append(nonTrumps, c)
		}
	}

	if needsTricks && len(trumps) > 0 {
		// If trick is not yet trumped, any trump wins
		if winningSuit != trumpSuit {
			return findLowestCard(trumps)
		}
		// If already trumped, check if we have a higher trump
		var higherTrumps []Card
		for _, t := range trumps {
			if rankValue(t.Rank) > winningVal {
				higherTrumps = append(higherTrumps, t)
			}
		}
		if len(higherTrumps) > 0 {
			return findLowestCard(higherTrumps)
		}
	}

	// When not trumping: slough off dangerous high non-trump cards if trying to avoid tricks
	if !needsTricks && len(nonTrumps) > 0 {
		return findHighestCard(nonTrumps)
	}

	if len(nonTrumps) > 0 {
		return findLowestCard(nonTrumps)
	}
	return findLowestCard(legalCards)
}

func findLowestCard(cards []Card) Card {
	lowest := cards[0]
	for _, c := range cards[1:] {
		if rankValue(c.Rank) < rankValue(lowest.Rank) {
			lowest = c
		}
	}
	return lowest
}

func findHighestCard(cards []Card) Card {
	highest := cards[0]
	for _, c := range cards[1:] {
		if rankValue(c.Rank) > rankValue(highest.Rank) {
			highest = c
		}
	}
	return highest
}
