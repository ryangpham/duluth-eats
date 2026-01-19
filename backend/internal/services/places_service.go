package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"

	"github.com/ryangpham/duluth-eats/internal/models"
)

// default location: Duluth, GA (specifically city farmers market)
const (
	lat          = 33.94771
	lng          = -84.12489
	searchRadius = 20000 // 20 km
)

// internal structs for Google Places API responses
type placesAPIResponse struct {
	Results []placeResult `json:"results"`
	Status  string        `json:"status"`
}

type placeResult struct {
	PlaceID      string  `json:"place_id"`
	Name         string  `json:"name"`
	Rating       float64 `json:"rating"`
	TotalRatings int     `jason:"user_ratings_total"`
	Price        int     `jason:"price_level"`
	Geometry     struct {
		Location struct {
			Lat float64 `json:"lat"`
			Lng float64 `json:"lng"`
		} `json:"location"`
	} `json:"geometry"`
	OpeningHours struct {
		OpenNow bool `json:"open_now"`
	} `json:"opening_hours"`
}

// fetch nearby restaurants by cuisine keyword
func FetchRestaurantsByCuisine(cuisine string, city string) ([]models.Restaurant, error) {
	apiKey := os.Getenv("GOOGLE_PLACES_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("Google Places API key not set in environment variables")
	}

	baseURL := "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

	params := url.Values{}
	params.Set("location", fmt.Sprintf("%f,%f", lat, lng))
	params.Set("radius", fmt.Sprintf("%d", searchRadius))
	params.Set("type", "restaurant")
	params.Set("keyword", cuisine)
	params.Set("key", apiKey)

	reqURL := fmt.Sprintf("%s?%s", baseURL, params.Encode())

	resp, err := http.Get(reqURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var apiResp placesAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, err
	}

	var restaurants []models.Restaurant
	for _, result := range apiResp.Results {
		restaurants = append(restaurants, models.Restaurant{
			ID:          result.PlaceID,
			Name:        result.Name,
			Cuisine:     cuisine,
			Rating:      result.Rating,
			ReviewCount: result.TotalRatings,
			PriceLevel:  result.Price,
			Latitude:    result.Geometry.Location.Lat,
			Longitude:   result.Geometry.Location.Lng,
			IsOpen:      result.OpeningHours.OpenNow,
		})
	}

	return restaurants, nil
}
