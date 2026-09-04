package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/ryangpham/duluth-eats/internal/services"
)

func GetRestaurantMenu(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	placeID := r.URL.Query().Get("placeId")
	if !services.ValidMenuPlaceID(placeID) {
		http.Error(w, "a valid placeId is required", http.StatusBadRequest)
		return
	}
	menu, err := services.GetRestaurantMenu(r.Context(), placeID)
	if err != nil {
		http.Error(w, "could not load this restaurant's menu", http.StatusBadGateway)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(menu)
}
