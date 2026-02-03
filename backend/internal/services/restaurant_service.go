package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/ryangpham/duluth-eats/internal/cache"
	"github.com/ryangpham/duluth-eats/internal/models"
	"github.com/ryangpham/duluth-eats/internal/repositories"
)

func GetRestaurants(
	ctx context.Context,
	cuisine string,
	city string,
	state string,
) ([]models.Restaurant, error) {
	key := fmt.Sprintf("restaurants:%s:%s:%s", cuisine, city, state)

	// try redis first
	cached, err := cache.RedisClient.Get(ctx, key).Result()
	if err == nil {
		log.Println("REDIS HIT:", key)
		var restaurants []models.Restaurant
		if err := json.Unmarshal([]byte(cached), &restaurants); err != nil {
			log.Println("Error unmarshaling cached data:", err)
		} else {
			return restaurants, nil
		}
	}
	log.Println("REDIS MISS:", key)

	// try db
	restaurants, stale, err := repositories.GetRestaurantsByLocation(ctx, city, state)
	if err != nil {
		return nil, err
	}

	if len(restaurants) > 0 && !stale {
		// cache it
		if data, err := json.Marshal(restaurants); err == nil {
			cache.RedisClient.Set(ctx, key, string(data), cache.DefaultTTL)
		}
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

	// cache it
	if data, err := json.Marshal(googleResults); err == nil {
		cache.RedisClient.Set(ctx, key, string(data), cache.DefaultTTL)
	}

	return googleResults, nil
}
