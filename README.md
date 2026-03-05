# DuluthEats

A restaurant recommendation app for Asian cuisine in Duluth, GA. Search by cuisine type, get scored rankings based on ratings, reviews, and distance, or let the app pick the best spot for you.

## How It Works

1. Choose a cuisine (Korean, Chinese, Japanese, Vietnamese, Thai, or All)
2. Enter a location or use your current position
3. Browse ranked results or hit **Pick For Me** to get the top recommendation

The backend fetches restaurant data from the Google Places API, caches it in Redis, and persists it to PostgreSQL. Restaurants are scored using a weighted formula that factors in rating, review count, and distance from the user.

## Tech Stack

| Layer     | Technology                                      |
| --------- | ----------------------------------------------- |
| Frontend  | React 19, TypeScript, Vite 7, Tailwind CSS v4   |
| Backend   | Go 1.25, net/http, pgx/v5, go-redis/v9          |
| Database  | PostgreSQL 18                                    |
| Cache     | Redis 7                                          |
| Infra     | Docker Compose, nginx                            |
| UI Kit    | shadcn/ui (Radix primitives)                     |

## Getting Started

### Prerequisites

- Go 1.25+
- Node.js 22+
- PostgreSQL 18
- Redis 7
- A [Google Places API](https://developers.google.com/maps/documentation/places/web-service) key

### Environment Setup

Create `backend/.env` with the required variables:

```
DATABASE_URL=postgresql://user:password@localhost:5432/dulutheats?sslmode=disable
REDIS_ADDR=localhost:6379
GOOGLE_PLACES_API_KEY=your-api-key
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=dulutheats
```

### Run with Docker (recommended)

```bash
docker compose -f infra/docker-compose.yml up --build
```

This starts all four services:

| Service  | Host Port |
| -------- | --------- |
| Frontend | 3000      |
| Backend  | 8080      |
| Postgres | 5433      |
| Redis    | 6379      |

The database schema is applied automatically on first startup via the migration file.

### Run Locally (development)

Start the backend:

```bash
cd backend
go run ./cmd/api
```

In a separate terminal, start the frontend:

```bash
cd frontend
npm ci --legacy-peer-deps
npm run dev
```

The Vite dev server proxies `/restaurants` and `/pick` requests to the backend at `localhost:8080`.

## API Endpoints

### `GET /restaurants`

Returns a scored list of restaurants.

| Param       | Required | Description                        |
| ----------- | -------- | ---------------------------------- |
| cuisine     | yes      | Cuisine type (e.g., "korean")      |
| city        | yes      | City name (e.g., "Duluth")         |
| state       | no       | State abbreviation (e.g., "GA")    |
| lat         | no       | User latitude (default: Duluth)    |
| lng         | no       | User longitude (default: Duluth)   |
| openNowOnly | no       | Filter to open restaurants ("true") |

### `GET /pick`

Returns the single highest-scored restaurant. Same parameters as `/restaurants`.

### `GET /health`

Returns `OK` with status 200.

## Project Structure

```
backend/
  cmd/api/          Entry point and route registration
  internal/
    handlers/       HTTP handlers
    services/       Business logic, scoring, caching
    repositories/   PostgreSQL queries
    models/         Data structs
    cache/          Redis client
    db/             Database connection pool
  migrations/       SQL schema

frontend/
  src/
    app/pages/      Page components (Home, Results)
    app/components/ui/  shadcn/ui primitives
    styles/         Tailwind config and theme

infra/
  docker-compose.yml
```
