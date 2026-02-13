package models

type Restaurant struct {
	ID            int     `json:"id"`
	GooglePlaceID string  `json:"google_place_id"`
	Name          string  `json:"name"`
	Rating        float64 `json:"rating"`
	TotalRatings  int     `json:"total_ratings"`
	PriceLevel    int     `json:"price_level"`
	Latitude      float64 `json:"latitude"`
	Longitude     float64 `json:"longitude"`
	IsOpen        bool    `json:"is_open"`
	City          string  `json:"city"`
	State         string  `json:"state"`
	Score         float64 `json:"score,omitempty"`
}
