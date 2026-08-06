package game

// Suit represents the suit of a playing card
type Suit string

const (
	Spades   Suit = "SPADES"
	Hearts   Suit = "HEARTS"
	Diamonds Suit = "DIAMONDS"
	Clubs    Suit = "CLUBS"
)

// Rank represents the rank (value) of a playing card
type Rank string

const (
	Two   Rank = "2"
	Three Rank = "3"
	Four  Rank = "4"
	Five  Rank = "5"
	Six   Rank = "6"
	Seven Rank = "7"
	Eight Rank = "8"
	Nine  Rank = "9"
	Ten   Rank = "10"
	Jack  Rank = "J"
	Queen Rank = "Q"
	King  Rank = "K"
	Ace   Rank = "A"
)

// Card represents a standard playing card
type Card struct {
	Suit Suit `json:"suit"`
	Rank Rank `json:"rank"`
}

// AllSuits returns a slice of all possible suits
func AllSuits() []Suit {
	return []Suit{Spades, Hearts, Diamonds, Clubs}
}

// AllRanks returns a slice of all possible ranks in ascending order
func AllRanks() []Rank {
	return []Rank{Two, Three, Four, Five, Six, Seven, Eight, Nine, Ten, Jack, Queen, King, Ace}
}
