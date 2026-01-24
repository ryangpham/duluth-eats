package models

type Restaurant struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Cuisine      string  `json:"cuisine"`
	Rating       float64 `json:"rating"`
	TotalRatings int     `json:"totalRatings"`
	PriceLevel   int     `json:"price_level"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	IsOpen       bool    `json:"is_open"`
}
