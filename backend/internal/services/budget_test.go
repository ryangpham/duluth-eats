package services

import (
	"testing"

	"github.com/ryangpham/duluth-eats/internal/models"
)

func TestFilterRestaurantsByBudget(t *testing.T) {
	restaurants := []models.Restaurant{{ID: 1, PriceLevel: 3}, {ID: 2, PriceLevel: 0}, {ID: 3, PriceLevel: 1}, {ID: 4, PriceLevel: 2}}
	filtered := FilterRestaurantsByBudget(restaurants, 2)
	if len(filtered) != 2 || filtered[0].ID != 3 || filtered[1].ID != 4 {
		t.Fatalf("expected affordable restaurants in ranked order, got %v", filtered)
	}
	if got := FilterRestaurantsByBudget(restaurants, 0); len(got) != 4 {
		t.Fatalf("unrestricted budget should include unknown prices, got %v", got)
	}
	if got := FilterRestaurantsByBudget(nil, 2); got == nil || len(got) != 0 {
		t.Fatalf("empty results must encode as an array, got %v", got)
	}
	if restaurants[0].ID != 1 || restaurants[1].ID != 2 {
		t.Fatal("filter changed the original ranking")
	}
}
