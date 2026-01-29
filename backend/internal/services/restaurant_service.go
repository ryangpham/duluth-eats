package services

import (
	"context"

	"github.com/ryangpham/duluth-eats/internal/models"
	"github.com/ryangpham/duluth-eats/internal/repositories"
)

func GetRestaurants(
	ctx context.Context,
	cuisine string,
	city string,
	state string,
) ([]models.Restaurant, error) {
	// try db first
	restaurants, stale, err := repositories.GetRestaurantsByLocation(ctx, city, state)
	if err != nil {
		return nil, err
	}

	if len(restaurants) > 0 && !stale {
		return restaurants, nil
	}

	// fallback to google
	googleResults, err := fetchFromGooglePlaces(cuisine, city, state)
	if err != nil {
		return nil, err
	}

	// upsert to db
	for _, r := range googleResults {
		_ = repositories.UpsertRestaurant(ctx, r)
	}

	return googleResults, nil
}
