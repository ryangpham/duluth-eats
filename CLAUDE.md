# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

See `AGENTS.md` for the full command reference. Key commands:

```bash
# Backend
cd backend && go run ./cmd/api
cd backend && go test ./...
cd backend && go vet ./...

# Frontend (from frontend/)
npm ci --legacy-peer-deps
npm run dev        # Vite dev server — proxies /restaurants, /pick to localhost:8080
npm run build      # Type-check + production build
npm run lint

# Full stack
docker compose -f infra/docker-compose.yml up --build
# Ports: frontend=3000, backend=8080, postgres=5433, redis=6379
```

No test runner is configured for the frontend.

## Architecture

Layered Go backend, React frontend, Docker Compose infra. Full details in `AGENTS.md`.

### Request flow

```
Browser -> nginx (port 3000) -> React SPA
                              -> /restaurants, /pick, /photo -> Go API (port 8080)
                                                             -> Google Places API (New)
                                                             -> Redis cache
                                                             -> PostgreSQL
```

### Backend layers

`handlers` → `services` → `repositories` → `db`

- **handlers**: extract query params, call services, encode JSON responses
- **services/places_service.go**: fetches from Google Places API (Text Search endpoint), scores restaurants, manages Redis caching, upserts to Postgres
- **repositories/restaurant_repo.go**: pgx/v5 queries — columns scanned by position (no `db` tags)
- **models/restaurant.go**: single `Restaurant` struct shared across all layers
- **cache/**: Redis client (go-redis/v9) — package-level global
- **db/**: pgx pool — package-level global

Cross-cutting dependencies (`db.Pool`, `cache.RedisClient`) are package-level globals; no interfaces or DI.

### Frontend pages

- `Home.tsx` — cuisine picker, location input (GPS or address), fires `/pick` or navigates to Results
- `Results.tsx` — fetches `/restaurants`, renders scored restaurant cards in a grid

Navigation state passes search params from Home → Results via React Router.

### Google Places photo proxy

`/photo?ref=<photo_name>` is a backend proxy that forwards to the Places API photo endpoint, inserting the API key server-side. The frontend uses this to avoid exposing the key.

### Scoring

Restaurants are scored in `places_service.go` using a weighted formula combining rating, review count, and distance from the user's location (default: Duluth, GA — 33.94771, -84.12489).

### Database migrations

SQL files in `backend/migrations/` are applied automatically at startup in Docker. When adding a migration, name it `NNN_description.sql` and ensure it's idempotent.

## Key Constraints

- `GOOGLE_PLACES_API_KEY` must be in `backend/.env` — the backend refuses to start without it
- The frontend has no formatter configured; match the existing style (double quotes, semicolons)
- shadcn/ui components in `src/app/components/ui/` are generated — use the shadcn CLI to add new ones, don't edit by hand
- `npm` only (not yarn/pnpm); use `--legacy-peer-deps` flag for installs
