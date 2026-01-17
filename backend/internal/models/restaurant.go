package models

type Restaurant struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Cuisine     string  `json:"cuisine"`
	Rating      float64 `json:"rating"`
	ReviewCount int     `json:"review_count"`
	PriceLevel  int     `json:"price_level"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	IsOpen      bool    `json:"is_open"`
}
