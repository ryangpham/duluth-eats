-- 001_baseline.sql
DROP TABLE IF EXISTS restaurant_cuisines CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;
DROP TABLE IF EXISTS cuisines CASCADE;

CREATE TABLE cuisines (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE restaurants (
    id SERIAL PRIMARY KEY,
    google_place_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    rating DOUBLE PRECISION,
    total_ratings INTEGER,
    price_level INTEGER,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_open BOOLEAN,
    city TEXT,
    state TEXT,
    last_fetched TIMESTAMP DEFAULT now()
);

CREATE TABLE restaurant_cuisines (
    restaurant_id INTEGER NOT NULL,
    cuisine_id INTEGER NOT NULL,
    PRIMARY KEY (restaurant_id, cuisine_id),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (cuisine_id) REFERENCES cuisines(id) ON DELETE CASCADE
);
