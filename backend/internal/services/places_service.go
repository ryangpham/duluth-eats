package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

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

type locationSearchRequest struct {
	TextQuery      string `json:"textQuery"`
	MaxResultCount int    `json:"maxResultCount"`
}

type locationSearchResponse struct {
	Places []struct {
		Location struct {
			Lat float64 `json:"latitude"`
			Lng float64 `json:"longitude"`
		} `json:"location"`
	} `json:"places"`
}

// fetch nearby restaurants by cuisine keyword
func fetchFromGooglePlaces(cuisine string, city string, state string) ([]models.Restaurant, error) {
	apiKey := os.Getenv("GOOGLE_PLACES_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("Google Places API key not set in environment variables")
	}

	baseURL := "https://places.googleapis.com/v1/places:searchText"

	var reqBody textSearchRequest
	reqBody.TextQuery = fmt.Sprintf("%s restaurant in %s %s", cuisine, city, state)
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
			GooglePlaceID: result.ID,
			Name:          result.DisplayName.Text,
			Rating:        result.Rating,
			TotalRatings:  result.TotalRatings,
			Latitude:      result.Location.Lat,
			Longitude:     result.Location.Lng,
			IsOpen:        result.CurrentOpeningHours.OpenNow,
			City:          city,
			State:         state,
		})
	}

	return restaurants, nil
}

func ResolveCoordinates(address string, city string, state string) (float64, float64, error) {
	apiKey := os.Getenv("GOOGLE_PLACES_API_KEY")
	if apiKey == "" {
		return 0, 0, fmt.Errorf("Google Places API key not set in environment variables")
	}

	baseURL := "https://places.googleapis.com/v1/places:searchText"

	query := strings.TrimSpace(address)
	if query == "" {
		query = fmt.Sprintf("%s, %s", city, state)
	}

	reqBody := locationSearchRequest{
		TextQuery:      query,
		MaxResultCount: 1,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return 0, 0, err
	}

	req, err := http.NewRequest("POST", baseURL, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return 0, 0, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Goog-Api-Key", apiKey)
	req.Header.Set("X-Goog-FieldMask", "places.location.latitude,places.location.longitude")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		return 0, 0, fmt.Errorf("failed to resolve location")
	}

	var apiResp locationSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return 0, 0, err
	}

	if len(apiResp.Places) == 0 {
		return 0, 0, fmt.Errorf("no matching location found")
	}

	return apiResp.Places[0].Location.Lat, apiResp.Places[0].Location.Lng, nil
}
