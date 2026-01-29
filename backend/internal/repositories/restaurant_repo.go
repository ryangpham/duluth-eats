package repositories

import (
	"context"
	"time"

	"github.com/ryangpham/duluth-eats/internal/db"
	"github.com/ryangpham/duluth-eats/internal/models"
)

func UpsertRestaurant(ctx context.Context, r models.Restaurant) error {
	query := `
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
		state
	)
	VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
	ON CONFLICT (google_place_id)
	DO UPDATE SET
		rating = EXCLUDED.rating,
		total_ratings = EXCLUDED.total_ratings,
		price_level = EXCLUDED.price_level,
		is_open = EXCLUDED.is_open,
		last_fetched = NOW();
	`

	_, err := db.Pool.Exec(ctx, query,
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
	)

	return err
}

func GetRestaurantsByLocation(
	ctx context.Context,
	city string,
	state string,
) ([]models.Restaurant, bool, error) {

	query := `
	SELECT
		id,
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
		last_fetched
	FROM restaurants
	WHERE city = $1 AND state = $2
	`

	rows, err := db.Pool.Query(ctx, query, city, state)
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
