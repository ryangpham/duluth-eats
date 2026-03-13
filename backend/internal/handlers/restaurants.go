package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/ryangpham/duluth-eats/internal/services"
)

func resolveUserCoordinates(userLatStr string, userLngStr string, city string, state string) (float64, float64, error) {
	if userLatStr != "" && userLngStr != "" {
		lat, latErr := strconv.ParseFloat(userLatStr, 64)
		lng, lngErr := strconv.ParseFloat(userLngStr, 64)
		if latErr == nil && lngErr == nil {
			return lat, lng, nil
		}
	}

	lat, lng, err := services.ResolveCoordinates("", city, state)
	if err != nil {
		return 0, 0, err
	}

	return lat, lng, nil
}

func GetRestaurants(w http.ResponseWriter, r *http.Request) {
	cuisine := r.URL.Query().Get("cuisine")
	city := r.URL.Query().Get("city")
	state := r.URL.Query().Get("state")
	openNowOnly, _ := strconv.ParseBool(r.URL.Query().Get("openNowOnly"))

	if cuisine == "" || city == "" {
		http.Error(w, "cuisine and city are required", http.StatusBadRequest)
		return
	}

	userLatStr := r.URL.Query().Get("lat")
	userLngStr := r.URL.Query().Get("lng")
	userLat, userLng, err := resolveUserCoordinates(userLatStr, userLngStr, city, state)
	if err != nil {
		http.Error(w, "failed to resolve location: "+err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Printf("DEBUG: Received request with cuisine=%q, city=%q, lat=%f, lng=%f\n", cuisine, city, userLat, userLng)

	restaurants, err := services.GetRestaurants(r.Context(), cuisine, city, state, userLat, userLng, openNowOnly)
	fmt.Printf("DEBUG: GetRestaurants returned %d restaurants, err=%v\n", len(restaurants), err)
	if err != nil {
		http.Error(w, "failed to fetch restaurants: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(restaurants)
}

func PickRestaurant(w http.ResponseWriter, r *http.Request) {
	cuisine := r.URL.Query().Get("cuisine")
	city := r.URL.Query().Get("city")
	state := r.URL.Query().Get("state")
	openNowOnly, _ := strconv.ParseBool(r.URL.Query().Get("openNowOnly"))

	if cuisine == "" || city == "" {
		http.Error(w, "cuisine and city are required", http.StatusBadRequest)
		return
	}

	userLatStr := r.URL.Query().Get("lat")
	userLngStr := r.URL.Query().Get("lng")
	userLat, userLng, err := resolveUserCoordinates(userLatStr, userLngStr, city, state)
	if err != nil {
		http.Error(w, "failed to resolve location: "+err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Printf("DEBUG: Pick request with cuisine=%q, city=%q, lat=%f, lng=%f\n", cuisine, city, userLat, userLng)

	restaurant, err := services.PickRestaurant(r.Context(), cuisine, city, state, userLat, userLng, openNowOnly)
	if err != nil {
		http.Error(w, "failed to pick restaurant: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(restaurant)
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
