package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"sort"
	"strings"

	"github.com/ryangpham/duluth-eats/internal/cache"
	"github.com/ryangpham/duluth-eats/internal/models"
	"github.com/ryangpham/duluth-eats/internal/repositories"
)

func filterOpenRestaurants(restaurants []models.Restaurant, openNowOnly bool) []models.Restaurant {
	if !openNowOnly {
		return restaurants
	}

	filtered := make([]models.Restaurant, 0, len(restaurants))
	for _, restaurant := range restaurants {
		if restaurant.IsOpen {
			filtered = append(filtered, restaurant)
		}
	}
	return filtered
}

// helper function to calculate distance (Haversine formula in meters)
func calculateDistance(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371e3 // Earth radius in meters
	dLat := (lat2 - lat1) * math.Pi / 180
	dLng := (lng2 - lng1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*math.Sin(dLng/2)*math.Sin(dLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

// helper function to calculate score
func calculateScore(r models.Restaurant, userLat, userLng float64) float64 {
	// simple scoring: rating * log(reviews + 1) / (1 + distance in km)
	distance := calculateDistance(r.Latitude, r.Longitude, userLat, userLng) / 1000 // convert to km
	score := r.Rating*0.6 + math.Log(float64(r.TotalRatings)+1)*0.25 - distance*0.05
	return score
}

func normalizeSubCuisine(subCuisine string) string {
	trimmed := strings.TrimSpace(subCuisine)
	if strings.EqualFold(trimmed, "Any") {
		return ""
	}
	return strings.ToLower(trimmed)
}

func restaurantCacheKey(cuisine string, subCuisine string, city string, state string) string {
	normalizedCuisine := strings.ToLower(strings.TrimSpace(cuisine))
	normalizedSubCuisine := normalizeSubCuisine(subCuisine)
	normalizedCity := strings.ToLower(strings.TrimSpace(city))
	normalizedState := strings.ToLower(strings.TrimSpace(state))

	return fmt.Sprintf("restaurants:%s:%s:%s:%s", normalizedCuisine, normalizedSubCuisine, normalizedCity, normalizedState)
}

func GetRestaurants(
	ctx context.Context,
	cuisine string,
	subCuisine string,
	city string,
	state string,
	userLat float64,
	userLng float64,
	openNowOnly bool,
) ([]models.Restaurant, error) {
	normalizedCuisine := strings.ToLower(strings.TrimSpace(cuisine))
	normalizedSubCuisine := normalizeSubCuisine(subCuisine)
	normalizedCity := strings.TrimSpace(city)
	normalizedState := strings.TrimSpace(state)
	key := restaurantCacheKey(normalizedCuisine, normalizedSubCuisine, normalizedCity, normalizedState)

	// try redis first
	cached, err := cache.RedisClient.Get(ctx, key).Result()
	if err == nil {
		log.Println("REDIS HIT:", key)
		var restaurants []models.Restaurant
		if err := json.Unmarshal([]byte(cached), &restaurants); err != nil {
			log.Println("Error unmarshaling cached data:", err)
		} else {
			// calculate scores
			for i := range restaurants {
				restaurants[i].Score = calculateScore(restaurants[i], userLat, userLng)
			}
			// sort by score descending
			sort.Slice(restaurants, func(i, j int) bool {
				return restaurants[i].Score > restaurants[j].Score
			})
			return filterOpenRestaurants(restaurants, openNowOnly), nil
		}
	}
	log.Println("REDIS MISS:", key)

	if normalizedSubCuisine == "" {
		// try db
		restaurants, stale, err := repositories.GetRestaurantsByLocation(ctx, normalizedCuisine, normalizedCity, normalizedState)
		if err != nil {
			return nil, err
		}
		// calculate scores
		for i := range restaurants {
			restaurants[i].Score = calculateScore(restaurants[i], userLat, userLng)
		}
		// sort by score descending
		sort.Slice(restaurants, func(i, j int) bool {
			return restaurants[i].Score > restaurants[j].Score
		})

		if len(restaurants) > 0 && !stale {
			// cache it
			if data, err := json.Marshal(restaurants); err == nil {
				cache.RedisClient.Set(ctx, key, string(data), cache.DefaultTTL)
			}
			return filterOpenRestaurants(restaurants, openNowOnly), nil
		}
	}

	// fallback to google
	googleResults, err := fetchFromGooglePlaces(normalizedCuisine, normalizedSubCuisine, normalizedCity, normalizedState)
	if err != nil {
		return nil, err
	}
	// calculate scores
	for i := range googleResults {
		googleResults[i].Score = calculateScore(googleResults[i], userLat, userLng)
	}
	// sort by score descending
	sort.Slice(googleResults, func(i, j int) bool {
		return googleResults[i].Score > googleResults[j].Score
	})

	if normalizedSubCuisine == "" {
		// upsert to db
		for _, r := range googleResults {
			_ = repositories.UpsertRestaurant(ctx, r, normalizedCuisine)
		}
	}

	// cache it
	if data, err := json.Marshal(googleResults); err == nil {
		cache.RedisClient.Set(ctx, key, string(data), cache.DefaultTTL)
	}

	return filterOpenRestaurants(googleResults, openNowOnly), nil
}

func PickRestaurant(
	ctx context.Context,
	cuisine, subCuisine, city, state string,
	userLat, userLng float64,
	openNowOnly bool,
) (models.Restaurant, error) {
	restaurants, err := GetRestaurants(ctx, cuisine, subCuisine, city, state, userLat, userLng, openNowOnly)
	if err != nil {
		return models.Restaurant{}, err
	}
	if len(restaurants) == 0 {
		return models.Restaurant{}, fmt.Errorf("no restaurants found for cuisine %s in %s, %s", cuisine, city, state)
	}
	return restaurants[0], nil
}

// FilterRestaurantsByBudget preserves ranking and excludes unknown prices when a budget is set.
func FilterRestaurantsByBudget(restaurants []models.Restaurant, maxPrice int) []models.Restaurant {
	filtered := make([]models.Restaurant, 0, len(restaurants))
	for _, restaurant := range restaurants {
		if maxPrice == 0 || (restaurant.PriceLevel > 0 && restaurant.PriceLevel <= maxPrice) {
			filtered = append(filtered, restaurant)
		}
	}
	return filtered
}
