package game

import "fmt"

// PlaceBid allows a player to declare how many tricks they will win.
func (g *GameState) PlaceBid(playerID int, bid int) error {
	if g.Phase != "bidding" {
		return fmt.Errorf("it is not the bidding phase")
	}

	currentPlayer := g.Players[g.TurnIndex]
	if playerID != currentPlayer {
		return fmt.Errorf("it is not your turn to bid")
	}

	maxAllowed := g.CardsPerPlayer
	if hand, ok := g.Hands[playerID]; ok && len(hand) > 0 {
		maxAllowed = len(hand)
	}

	if bid < 0 || bid > maxAllowed {
		return fmt.Errorf("bid must be between 0 and %d", maxAllowed)
	}

	g.Bids[playerID] = bid

	// If everyone has bid, move to playing phase
	if len(g.Bids) == len(g.Players) {
		g.Phase = "playing"
		// The person who leads the first trick is the one who bid first (left of dealer)
		g.TurnIndex = g.LeadIndex
	} else {
		// Next player's turn
		g.TurnIndex = (g.TurnIndex + 1) % len(g.Players)
	}

	return nil
}

// PlayCard allows a player to play a card from their hand into the current trick.
func (g *GameState) PlayCard(playerID int, cardToPlay Card) error {
	if g.Phase != "playing" {
		return fmt.Errorf("it is not the playing phase")
	}

	currentPlayer := g.Players[g.TurnIndex]
	if playerID != currentPlayer {
		return fmt.Errorf("it is not your turn to play")
	}

	// 1. Verify the player actually has this card
	hand := g.Hands[playerID]
	cardIndex := -1
	for i, c := range hand {
		if c.Suit == cardToPlay.Suit && c.Rank == cardToPlay.Rank {
			cardIndex = i
			break
		}
	}
	if cardIndex == -1 {
		return fmt.Errorf("you do not have this card in your hand")
	}

	// 2. Judgement Rules:
	if len(g.CurrentTrick) == 0 {
		// Leading the trick: Cannot lead with a Trump card unless all non-trump cards in hand are finished
		if cardToPlay.Suit == g.TrumpSuit {
			hasNonTrump := false
			for _, c := range hand {
				if c.Suit != g.TrumpSuit {
					hasNonTrump = true
					break
				}
			}
			if hasNonTrump {
				return fmt.Errorf("cannot lead with a trump card until your non-trump cards are finished")
			}
		}
	} else {
		// Following the trick: Must follow lead suit if available
		leadSuit := g.CurrentTrick[0].Card.Suit
		if cardToPlay.Suit != leadSuit {
			hasLeadSuit := false
			for _, c := range hand {
				if c.Suit == leadSuit {
					hasLeadSuit = true
					break
				}
			}
			if hasLeadSuit {
				return fmt.Errorf("you must follow the lead suit (%s) because you have it", leadSuit)
			}
		}
	}

	// 3. Play the card: Remove from hand and add to trick
	g.Hands[playerID] = append(hand[:cardIndex], hand[cardIndex+1:]...)
	g.CurrentTrick = append(g.CurrentTrick, Play{PlayerID: playerID, Card: cardToPlay})

	// Move turn to next player
	g.TurnIndex = (g.TurnIndex + 1) % len(g.Players)

	// If everyone has played, evaluate the trick!
	if len(g.CurrentTrick) == len(g.Players) {
		g.evaluateTrick()
	}

	return nil
}

// rankValue assigns a numerical hierarchy to card ranks for easy comparison
func rankValue(r Rank) int {
	switch r {
	case Two: return 2
	case Three: return 3
	case Four: return 4
	case Five: return 5
	case Six: return 6
	case Seven: return 7
	case Eight: return 8
	case Nine: return 9
	case Ten: return 10
	case Jack: return 11
	case Queen: return 12
	case King: return 13
	case Ace: return 14
	}
	return 0
}

// evaluateTrick determines the winner of the current trick
func (g *GameState) evaluateTrick() {
	if len(g.CurrentTrick) == 0 {
		return
	}

	leadSuit := g.CurrentTrick[0].Card.Suit
	winnerIndex := 0
	highestValue := rankValue(g.CurrentTrick[0].Card.Rank)
	winningSuit := leadSuit

	for i := 1; i < len(g.CurrentTrick); i++ {
		play := g.CurrentTrick[i]
		val := rankValue(play.Card.Rank)

		if play.Card.Suit == g.TrumpSuit {
			if winningSuit != g.TrumpSuit {
				// First trump played beats any lead suit
				winningSuit = g.TrumpSuit
				highestValue = val
				winnerIndex = i
			} else if val > highestValue {
				// Higher trump beats lower trump
				highestValue = val
				winnerIndex = i
			}
		} else if play.Card.Suit == winningSuit {
			// Following the winning suit (lead suit, since trump wasn't played)
			if val > highestValue {
				highestValue = val
				winnerIndex = i
			}
		}
		// Any other suit automatically loses
	}

	winningPlayerID := g.CurrentTrick[winnerIndex].PlayerID
	g.TricksWon[winningPlayerID]++

	// Save the completed trick before clearing it
	g.LastTrick = g.CurrentTrick
	g.LastTrickWinner = winningPlayerID

	// The winner leads the next trick
	g.CurrentTrick = []Play{}
	
	// Find the turn index of the winning player
	for i, pid := range g.Players {
		if pid == winningPlayerID {
			g.TurnIndex = i
			g.LeadIndex = i
			break
		}
	}

	// Check if the round is over
	if len(g.Hands[g.Players[0]]) == 0 {
		g.evaluateRound()
	}
}

// evaluateRound calculates scores at the end of a round
func (g *GameState) evaluateRound() {
	for _, playerID := range g.Players {
		bid := g.Bids[playerID]
		won := g.TricksWon[playerID]

		if bid == won {
			// Success: 10 + Bid bonus
			g.Scores[playerID] += 10 + bid
		} else {
			// Failure: score is 0
			g.Scores[playerID] += 0
		}
	}
	
	if g.CardsPerPlayer == 1 {
		g.Phase = "gameOver"
	} else {
		g.Phase = "finished"
	}
}
