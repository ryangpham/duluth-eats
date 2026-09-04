package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"

	"github.com/ryangpham/duluth-eats/internal/services"
)

func resolveUserCoordinates(userLatStr string, userLngStr string) (float64, float64) {
	if userLatStr != "" && userLngStr != "" {
		lat, latErr := strconv.ParseFloat(userLatStr, 64)
		lng, lngErr := strconv.ParseFloat(userLngStr, 64)
		if latErr == nil && lngErr == nil {
			return lat, lng
		}
	}
	return services.DefaultLat, services.DefaultLng
}

func GetRestaurants(w http.ResponseWriter, r *http.Request) {
	cuisine := r.URL.Query().Get("cuisine")
	subCuisine := r.URL.Query().Get("subCuisine")
	city := r.URL.Query().Get("city")
	state := r.URL.Query().Get("state")
	openNowOnly, _ := strconv.ParseBool(r.URL.Query().Get("openNowOnly"))
	maxPrice := 0
	if value := r.URL.Query().Get("maxPrice"); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil || parsed < 0 || parsed > 4 {
			http.Error(w, "maxPrice must be between 0 and 4", http.StatusBadRequest)
			return
		}
		maxPrice = parsed
	}

	if cuisine == "" || city == "" {
		http.Error(w, "cuisine and city are required", http.StatusBadRequest)
		return
	}

	userLatStr := r.URL.Query().Get("lat")
	userLngStr := r.URL.Query().Get("lng")
	userLat, userLng := resolveUserCoordinates(userLatStr, userLngStr)

	fmt.Printf("DEBUG: Received request with cuisine=%q, subCuisine=%q, city=%q, lat=%f, lng=%f\n", cuisine, subCuisine, city, userLat, userLng)

	restaurants, err := services.GetRestaurants(r.Context(), cuisine, subCuisine, city, state, userLat, userLng, openNowOnly)
	fmt.Printf("DEBUG: GetRestaurants returned %d restaurants, err=%v\n", len(restaurants), err)
	if err != nil {
		http.Error(w, "failed to fetch restaurants: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(services.FilterRestaurantsByBudget(restaurants, maxPrice))
}

func PickRestaurant(w http.ResponseWriter, r *http.Request) {
	cuisine := r.URL.Query().Get("cuisine")
	subCuisine := r.URL.Query().Get("subCuisine")
	city := r.URL.Query().Get("city")
	state := r.URL.Query().Get("state")
	openNowOnly, _ := strconv.ParseBool(r.URL.Query().Get("openNowOnly"))
	maxPrice := 0
	if value := r.URL.Query().Get("maxPrice"); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil || parsed < 0 || parsed > 4 {
			http.Error(w, "maxPrice must be between 0 and 4", http.StatusBadRequest)
			return
		}
		maxPrice = parsed
	}

	if cuisine == "" || city == "" {
		http.Error(w, "cuisine and city are required", http.StatusBadRequest)
		return
	}

	userLatStr := r.URL.Query().Get("lat")
	userLngStr := r.URL.Query().Get("lng")
	userLat, userLng := resolveUserCoordinates(userLatStr, userLngStr)

	fmt.Printf("DEBUG: Pick request with cuisine=%q, subCuisine=%q, city=%q, lat=%f, lng=%f\n", cuisine, subCuisine, city, userLat, userLng)

	restaurants, err := services.GetRestaurants(r.Context(), cuisine, subCuisine, city, state, userLat, userLng, openNowOnly)
	if err != nil {
		http.Error(w, "failed to pick restaurant: "+err.Error(), http.StatusInternalServerError)
		return
	}

	restaurants = services.FilterRestaurantsByBudget(restaurants, maxPrice)
	if len(restaurants) == 0 {
		http.Error(w, "no restaurants match your preferences", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(restaurants[0])
}

func PhotoProxy(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}

	apiKey := os.Getenv("GOOGLE_PLACES_API_KEY")
	if apiKey == "" {
		http.Error(w, "API key not configured", http.StatusInternalServerError)
		return
	}

	photoURL := fmt.Sprintf("https://places.googleapis.com/v1/%s/media?maxWidthPx=800&key=%s", name, apiKey)
	resp, err := http.Get(photoURL)
	if err != nil {
		http.Error(w, "failed to fetch photo", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, "photo not available", resp.StatusCode)
		return
	}

	w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
	w.Header().Set("Cache-Control", "public, max-age=86400")
	io.Copy(w, resp.Body)
}

func ResolveLocation(w http.ResponseWriter, r *http.Request) {
	address := r.URL.Query().Get("address")
	city := r.URL.Query().Get("city")
	state := r.URL.Query().Get("state")

	if address == "" && (city == "" || state == "") {
		http.Error(w, "address or city and state are required", http.StatusBadRequest)
		return
	}

	lat, lng, err := services.ResolveCoordinates(address, city, state)
	if err != nil {
		http.Error(w, "failed to resolve location: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]float64{
		"lat": lat,
		"lng": lng,
	})
}
