package services

import "github.com/ryangpham/duluth-eats/internal/models"

// fetch nearby restaurants by cuisine keyword
func FetchRestaurantsByCuisine(cuisine string, city string) ([]models.Restaurant, error) {
	// TODO:
	// 1. resolve city to lat/lng
	// 2. call Google Places API with cuisine keyword and lat/lng
	// 3. parse response and return list of restaurants
	return nil, nil
}
