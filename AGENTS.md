# AGENTS.md

DuluthEats is a restaurant recommendation app for Asian cuisine in Duluth, GA.
Monorepo with a Go backend, React/TypeScript frontend, and Docker-based infrastructure.

## Build and Run Commands

### Backend (Go)

```bash
# Run locally (from backend/)
go run ./cmd/api

# Build binary
CGO_ENABLED=0 go build -o bin/api ./cmd/api

# Run tests (none exist yet, but the convention is)
go test ./...

# Run a single test
go test ./internal/services/ -run TestCalculateScore -v

# Vet / static analysis
go vet ./...
```

### Frontend (React + Vite)

```bash
# Install dependencies (from frontend/)
npm ci --legacy-peer-deps

# Dev server (proxies /restaurants and /pick to localhost:8080)
npm run dev

# Type-check + production build
npm run build

# Lint (ESLint 9, flat config)
npm run lint

# Preview production build
npm run preview
```

There is no test runner configured for the frontend. No prettier or formatter is configured.

### Docker (full stack)

```bash
# Start all services (from infra/)
docker compose up --build

# Ports: frontend=3000, backend=8080, postgres=5433, redis=6379
```

## Project Structure

```
backend/
  cmd/api/main.go          -- entrypoint, routes, server startup
  internal/
    handlers/               -- HTTP handlers (net/http, no router library)
    services/               -- business logic, scoring, caching, Google Places API
    repositories/           -- PostgreSQL queries via pgx/v5
    models/                 -- data structs (Restaurant)
    cache/                  -- Redis client init
    db/                     -- PostgreSQL connection pool
  migrations/               -- SQL schema files
frontend/
  src/
    App.tsx, main.tsx, routes.ts  -- app shell and routing
    app/pages/                    -- page components (Home, Results)
    app/components/ui/            -- shadcn/ui primitives (do not edit by hand)
    styles/                       -- CSS: index.css -> fonts.css, tailwind.css, theme.css
infra/
  docker-compose.yml        -- postgres, redis, backend, frontend
```

## Code Style: Go Backend

### Imports
Two groups separated by a blank line: standard library first, then everything else
(third-party and internal packages together). Alphabetical within each group.
This is standard `goimports` formatting.

```go
import (
    "context"
    "fmt"
    "log"

    "github.com/ryangpham/duluth-eats/internal/models"
    "github.com/ryangpham/duluth-eats/internal/repositories"
)
```

### Error Handling
- Return errors directly without wrapping (`return err`, not `fmt.Errorf("...: %w", err)`).
- Use `fmt.Errorf` only for creating new error messages, not for wrapping.
- Use `log.Fatalf` for unrecoverable startup failures.
- Use `http.Error(w, message, statusCode)` for HTTP error responses.

### Naming
- Exported: PascalCase (`GetRestaurants`, `UpsertRestaurant`, `Restaurant`).
- Unexported: camelCase (`fetchFromGooglePlaces`, `calculateScore`).
- Acronyms stay uppercase: `placesAPIResponse`, `GooglePlaceID`.
- Short variable names for local scope: `r` for Restaurant, `ctx` for context, `w`/`r` for HTTP.
- SQL query variables named by purpose: `restaurantQuery`, `cuisineQuery`.

### HTTP Handlers
- Use `func(w http.ResponseWriter, r *http.Request)` signature directly.
- Extract params via `r.URL.Query().Get(...)`.
- Set `Content-Type: application/json` before encoding.
- Encode responses with `json.NewEncoder(w).Encode(data)`.
- Pass `r.Context()` to all service/repo calls.

### Struct Tags
- JSON tags use `snake_case`: `json:"google_place_id"`.
- Use `omitempty` only for computed/optional fields.
- No `db` tags; columns are scanned by position in repo layer.

### Context
Always pass `context.Context` as the first parameter in service/repo functions.

### Architecture
- Layered: handlers -> services -> repositories -> db.
- Cross-cutting deps (`db.Pool`, `cache.RedisClient`) are package-level globals.
- No interfaces or dependency injection.
- No test files exist yet.

## Code Style: React/TypeScript Frontend

### Imports
Group order (no blank lines between groups): React, third-party, local.
Use double quotes and semicolons (except in Vite-scaffolded files like main.tsx).

```tsx
import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown } from "lucide-react";
```

### Components
- Use `function` declarations, not arrow functions, for components.
- Named exports for page components (`export function Home`).
- Default export only for App (`export default function App`).
- Helper functions defined at module scope above the component.
- Event handlers use `handle` prefix: `handlePickForMe`, `handleUseCurrentLocation`.
- Event parameter named `event`, not `e`.

### TypeScript
- Use `interface` (not `type`) for object shapes.
- Interfaces are local to the file, not exported or shared.
- No `any` usage. Prefer explicit generics for useState: `useState<Restaurant[]>([])`.
- Use `as` for type assertions: `location.state as SearchState | null`.
- Use optional chaining (`?.`) and nullish coalescing (`??`).

### State
- Local state only via `useState`. No global state management.
- Pass data between pages via React Router navigation state.
- Derive values inline instead of storing computed state.
- Constants use SCREAMING_SNAKE_CASE: `DEFAULT_CITY`, `DEFAULT_LAT`.

### Naming
- PascalCase for component files and names: `Home.tsx`, `Results.tsx`.
- camelCase for non-component files: `routes.ts`, `main.tsx`.
- kebab-case for CSS files: `theme.css`, `tailwind.css`.
- Boolean state prefixed with `is`: `isPicking`, `isLocating`, `isOpen`.

### Styling
- Tailwind CSS v4 with arbitrary values for brand colors (e.g., `bg-[#8B0000]`).
- shadcn/ui design tokens defined in `theme.css` but page components use hardcoded hex.
- Class ordering: layout -> sizing -> spacing -> bg/color -> typography -> borders -> effects -> states -> transitions.
- Conditional classes via template literals, not `clsx`/`cn` in page components.
- Custom CSS classes (`.bg-wood-pattern`, `.clip-roof`) defined in `theme.css` `@layer base`.

### API Calls
- Use native `fetch` with relative URLs (`/pick`, `/restaurants`).
- Build query params via `URLSearchParams`.
- The codebase mixes `async/await` (Home.tsx) and `.then()` chaining (Results.tsx).
  Prefer `async/await` with `try/catch` for new code.

### JSX
- Single root `<div>`, no fragments.
- Ternary for conditional rendering; `&&` for optional sections.
- `.map()` with meaningful `key` props (prefer stable IDs over array index).
- Section comments via `{/* Description */}`.

### shadcn/ui Components
Located in `src/app/components/ui/`. These are generated files -- do not edit by hand.
When adding new shadcn components, use the shadcn CLI.

## Environment and Dependencies

- **Go**: 1.25 | **Node**: 22 | **npm** (not yarn/pnpm)
- **Database**: PostgreSQL 18 (pgx/v5 driver) | **Cache**: Redis 7 (go-redis/v9)
- **Frontend stack**: React 19, Vite 7, Tailwind CSS v4, react-router v7
- **External API**: Google Places API (New) Text Search endpoint
- Backend serves on port 8080; Vite dev server proxies API routes to it.
- Config loaded from `backend/.env` via godotenv. Never commit `.env` files.
