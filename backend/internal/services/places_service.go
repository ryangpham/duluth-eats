package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/ryangpham/duluth-eats/internal/models"
)

// default location: Duluth, GA (specifically city farmers market)
const (
	lat          = 33.94771
	lng          = -84.12489
	searchRadius = 20000 // 20 km
)

// request struct
type textSearchRequest struct {
	TextQuery      string `json:"textQuery"`
	MaxResultCount int    `json:"maxResultCount"`
	LocationBias   struct {
		Circle struct {
			Center struct {
				Latitude  float64 `json:"latitude"`
				Longitude float64 `json:"longitude"`
			} `json:"center"`
			Radius float64 `json:"radius"`
		} `json:"circle"`
	} `json:"locationBias"`
}

// response struct
type placesAPIResponse struct {
	Places []struct {
		ID          string `json:"id"`
		DisplayName struct {
			Text string `json:"text"`
		} `json:"displayName"`
		Rating       float64 `json:"rating"`
		TotalRatings int     `json:"userRatingCount"`
		PriceLevel   string  `json:"priceLevel"`
		Location     struct {
			Lat float64 `json:"latitude"`
			Lng float64 `json:"longitude"`
		} `json:"location"`
		CurrentOpeningHours struct {
			OpenNow bool `json:"openNow"`
		} `json:"currentOpeningHours"`
	} `json:"places"`
}

// fetch nearby restaurants by cuisine keyword
func FetchRestaurantsByCuisine(cuisine string, city string) ([]models.Restaurant, error) {
	apiKey := os.Getenv("GOOGLE_PLACES_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("Google Places API key not set in environment variables")
	}

	baseURL := "https://places.googleapis.com/v1/places:searchText"

	var reqBody textSearchRequest
	reqBody.TextQuery = fmt.Sprintf("%s restaurant in %s GA", cuisine, city)
	reqBody.MaxResultCount = 20
	reqBody.LocationBias.Circle.Center.Latitude = lat
	reqBody.LocationBias.Circle.Center.Longitude = lng
	reqBody.LocationBias.Circle.Radius = float64(searchRadius)

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", baseURL, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Goog-Api-Key", apiKey)
	req.Header.Set(
		"X-Goog-FieldMask",
		"places.id,"+
			"places.displayName.text,"+
			"places.rating,"+
			"places.userRatingCount,"+
			"places.location.latitude,"+
			"places.location.longitude,"+
			"places.currentOpeningHours.openNow",
	)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var apiResp placesAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, err
	}

	fmt.Println("DEBUG: Places returned:", len(apiResp.Places))

	var restaurants []models.Restaurant
	for _, result := range apiResp.Places {
		restaurants = append(restaurants, models.Restaurant{
			ID:           result.ID,
			Name:         result.DisplayName.Text,
			Cuisine:      cuisine,
			Rating:       result.Rating,
			TotalRatings: result.TotalRatings,
			Latitude:     result.Location.Lat,
			Longitude:    result.Location.Lng,
			IsOpen:       result.CurrentOpeningHours.OpenNow,
		})
	}

	return restaurants, nil
}
