package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/ryangpham/duluth-eats/internal/services"
)

func GetRestaurants(w http.ResponseWriter, r *http.Request) {
	userLatStr := r.URL.Query().Get("lat")
	userLngStr := r.URL.Query().Get("lng")
	userLat := 33.94771
	userLng := -84.12489

	if userLatStr != "" {
		if lat, err := strconv.ParseFloat(userLatStr, 64); err == nil {
			userLat = lat
		}
	}
	if userLngStr != "" {
		if lng, err := strconv.ParseFloat(userLngStr, 64); err == nil {
			userLng = lng
		}
	}

	cuisine := r.URL.Query().Get("cuisine")
	city := r.URL.Query().Get("city")
	state := r.URL.Query().Get("state")

	fmt.Printf("DEBUG: Received request with cuisine=%q, city=%q, lat=%f, lng=%f\n", cuisine, city, userLat, userLng)

	if cuisine == "" || city == "" {
		http.Error(w, "cuisine and city are required", http.StatusBadRequest)
		return
	}

	restaurants, err := services.GetRestaurants(r.Context(), cuisine, city, state, userLat, userLng)
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
	userLat := 33.94771
	userLng := -84.12489

	userLatStr := r.URL.Query().Get("lat")
	userLngStr := r.URL.Query().Get("lng")

	if userLatStr != "" {
		if lat, err := strconv.ParseFloat(userLatStr, 64); err == nil {
			userLat = lat
		}
	}
	if userLngStr != "" {
		if lng, err := strconv.ParseFloat(userLngStr, 64); err == nil {
			userLng = lng
		}
	}

	if cuisine == "" || city == "" {
		http.Error(w, "cuisine and city are required", http.StatusBadRequest)
		return
	}

	restaurant, err := services.PickRestaurant(r.Context(), cuisine, city, state, userLat, userLng)
	if err != nil {
		http.Error(w, "failed to pick restaurant: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(restaurant)
}
