package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/ryangpham/duluth-eats/internal/services"
)

func GetRestaurants(w http.ResponseWriter, r *http.Request) {
	cuisine := r.URL.Query().Get("cuisine")
	city := r.URL.Query().Get("city")

	fmt.Printf("DEBUG: Received request with cuisine=%q, city=%q\n", cuisine, city)

	if cuisine == "" || city == "" {
		http.Error(w, "cuisine and city are required", http.StatusBadRequest)
		return
	}

	restaurants, err := services.FetchRestaurantsByCuisine(cuisine, city)
	fmt.Printf("DEBUG: FetchRestaurantsByCuisine returned %d restaurants, err=%v\n", len(restaurants), err)
	if err != nil {
		http.Error(w, "failed to fetch restaurants: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(restaurants)
}
