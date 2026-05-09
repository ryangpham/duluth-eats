package repositories

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/ryangpham/duluth-eats/internal/db"
	"github.com/ryangpham/duluth-eats/internal/models"
)

func UpsertRestaurant(ctx context.Context, r models.Restaurant, cuisine string) error {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	restaurantQuery := `
	INSERT INTO restaurants (
		google_place_id,
		name,
		rating,
		total_ratings,
		price_level,
		latitude,
		longitude,
		is_open,
		city,
		state,
		formatted_address,
		photo_reference,
		google_maps_uri
	)
	VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
	ON CONFLICT (google_place_id)
	DO UPDATE SET
		name = EXCLUDED.name,
		rating = EXCLUDED.rating,
		total_ratings = EXCLUDED.total_ratings,
		price_level = EXCLUDED.price_level,
		latitude = EXCLUDED.latitude,
		longitude = EXCLUDED.longitude,
		is_open = EXCLUDED.is_open,
		city = EXCLUDED.city,
		state = EXCLUDED.state,
		formatted_address = EXCLUDED.formatted_address,
		photo_reference = EXCLUDED.photo_reference,
		google_maps_uri = EXCLUDED.google_maps_uri,
		last_fetched = NOW()
	RETURNING id;
	`

	var restaurantID int
	if err := tx.QueryRow(ctx, restaurantQuery,
		r.GooglePlaceID,
		r.Name,
		r.Rating,
		r.TotalRatings,
		r.PriceLevel,
		r.Latitude,
		r.Longitude,
		r.IsOpen,
		r.City,
		r.State,
		r.FormattedAddress,
		r.PhotoReference,
		r.GoogleMapsUri,
	).Scan(&restaurantID); err != nil {
		return err
	}

	normalizedCuisine := strings.TrimSpace(strings.ToLower(cuisine))
	if normalizedCuisine == "" {
		return fmt.Errorf("cuisine is required")
	}

	cuisineQuery := `
	INSERT INTO cuisines (name)
	VALUES ($1)
	ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
	RETURNING id;
	`

	var cuisineID int
	if err := tx.QueryRow(ctx, cuisineQuery, normalizedCuisine).Scan(&cuisineID); err != nil {
		return err
	}

	linkQuery := `
	INSERT INTO restaurant_cuisines (restaurant_id, cuisine_id)
	VALUES ($1, $2)
	ON CONFLICT (restaurant_id, cuisine_id) DO NOTHING;
	`

	if _, err := tx.Exec(ctx, linkQuery, restaurantID, cuisineID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func GetRestaurantsByLocation(
	ctx context.Context,
	cuisine string,
	city string,
	state string,
) ([]models.Restaurant, bool, error) {

	query := `
	SELECT r.id, r.google_place_id, r.name, r.rating, r.total_ratings, r.price_level,
		   r.latitude, r.longitude, r.is_open, r.city, r.state,
		   COALESCE(r.formatted_address, ''), COALESCE(r.photo_reference, ''), COALESCE(r.google_maps_uri, ''),
		   r.last_fetched
	FROM restaurants r
	JOIN restaurant_cuisines rc ON r.id = rc.restaurant_id
	JOIN cuisines c ON rc.cuisine_id = c.id
	WHERE LOWER(r.city) = LOWER($1) AND LOWER(r.state) = LOWER($2) AND LOWER(c.name) = LOWER($3)
	`

	rows, err := db.Pool.Query(ctx, query, city, state, cuisine)
	if err != nil {
		return nil, true, err
	}
	defer rows.Close()

	var restaurants []models.Restaurant
	var stale bool = true

	for rows.Next() {
		var r models.Restaurant
		var lastFetched time.Time

		err := rows.Scan(
			&r.ID,
			&r.GooglePlaceID,
			&r.Name,
			&r.Rating,
			&r.TotalRatings,
			&r.PriceLevel,
			&r.Latitude,
			&r.Longitude,
			&r.IsOpen,
			&r.City,
			&r.State,
			&r.FormattedAddress,
			&r.PhotoReference,
			&r.GoogleMapsUri,
			&lastFetched,
		)
		if err != nil {
			return nil, true, err
		}

		restaurants = append(restaurants, r)
		stale = false
	}

	return restaurants, stale, nil
}
