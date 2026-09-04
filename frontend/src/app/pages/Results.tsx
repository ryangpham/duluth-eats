import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, ArrowUpRight, Clock3, MapPin, Navigation, RefreshCw, SlidersHorizontal, Soup, Sparkles, Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import { RestaurantMenu } from "../components/RestaurantMenu";

interface ApiRestaurant {
  id: number;
  google_place_id: string;
  name: string;
  rating: number;
  total_ratings?: number;
  latitude: number;
  longitude: number;
  is_open: boolean;
  price_level: number;
  formatted_address: string;
  photo_reference: string;
  google_maps_uri: string;
}

interface SearchState {
  cuisine?: string;
  subCuisine?: string;
  restaurant?: ApiRestaurant;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
  openNowOnly?: boolean;
  locationLabel?: string;
  maxPrice?: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface RestaurantPhotoProps {
  restaurant: ApiRestaurant;
  isFeatured?: boolean;
}

interface RestaurantDetailsProps {
  restaurant: ApiRestaurant;
  origin: Coordinates;
}

const DEFAULT_CITY = "Duluth";
const DEFAULT_STATE = "GA";
// Use the same default ranking origin as the backend.
const DEFAULT_LAT = 33.94771;
const DEFAULT_LNG = -84.12489;
const FOCUS_STYLE = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#AD3529]";

function getDistanceMiles(restaurant: ApiRestaurant, origin: Coordinates) {
  if (!Number.isFinite(restaurant.latitude) || !Number.isFinite(restaurant.longitude)) return Infinity;
  const dLat = ((restaurant.latitude - origin.lat) * Math.PI) / 180;
  const dLng = ((restaurant.longitude - origin.lng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((origin.lat * Math.PI) / 180) *
    Math.cos((restaurant.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

function getRestaurantKey(restaurant: ApiRestaurant) {
  return restaurant.google_place_id || String(restaurant.id);
}

function getMapsUrl(restaurant: ApiRestaurant, isDirections = false) {
  const params = new URLSearchParams({ api: "1" });
  if (isDirections) {
    params.set("destination", restaurant.formatted_address || restaurant.name);
    if (restaurant.google_place_id) params.set("destination_place_id", restaurant.google_place_id);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }
  params.set("query", `${restaurant.name} ${restaurant.formatted_address || "Duluth GA"}`);
  if (restaurant.google_place_id) params.set("query_place_id", restaurant.google_place_id);
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function RestaurantPhoto({ restaurant, isFeatured = false }: RestaurantPhotoProps) {
  const [failedReference, setFailedReference] = useState("");
  const hasPhoto = restaurant.photo_reference && failedReference !== restaurant.photo_reference;
  return (
    <div className={`relative overflow-hidden bg-[#EDEBDD] ${isFeatured ? "min-h-64 lg:min-h-[360px]" : "h-52"}`}>
      {hasPhoto ? (
        <img
          src={`/photo?${new URLSearchParams({ name: restaurant.photo_reference })}`}
          alt={restaurant.name}
          loading={isFeatured ? "eager" : "lazy"}
          onError={() => setFailedReference(restaurant.photo_reference)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[#757962]">
          <Soup size={52} strokeWidth={1} aria-hidden="true" />
          <span className="text-sm">A good meal awaits</span>
          <span className="text-xs">Photo unavailable</span>
        </div>
      )}
      {isFeatured && (
        <span className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-[#FFFEFB] px-4 py-2 text-sm font-semibold text-[#AD3529] shadow-sm">
          <Sparkles size={16} /> Our top recommendation
        </span>
      )}
    </div>
  );
}

function RestaurantDetails({ restaurant, origin }: RestaurantDetailsProps) {
  const distance = getDistanceMiles(restaurant, origin);
  const price = restaurant.price_level > 0 && restaurant.price_level <= 4
    ? "$".repeat(restaurant.price_level) : "Price unavailable";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="flex items-center gap-1.5 text-[#7D531B]">
          <Star size={16} className="fill-[#D5A34B] text-[#D5A34B]" aria-hidden="true" />
          <span className="font-semibold">{restaurant.rating > 0 ? restaurant.rating.toFixed(1) : "Not rated"}</span>
          {Boolean(restaurant.total_ratings) && <span className="text-[#696C60]">({restaurant.total_ratings?.toLocaleString()})</span>}
        </span>
        <span className="text-[#696C60]">{price}</span>
        <span className={`flex items-center gap-1.5 ${restaurant.is_open ? "text-[#4C653C]" : "text-[#8A5549]"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${restaurant.is_open ? "bg-[#647C4E]" : "bg-[#A57466]"}`} />
          {restaurant.is_open ? "Open now" : "Closed now"}
        </span>
      </div>
      <p className="flex items-start gap-2 text-sm leading-relaxed text-[#696C60]">
        <MapPin size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
        {restaurant.formatted_address || "Address available on Google Maps"}
      </p>
      <p className="flex items-center gap-2 text-sm text-[#696C60]">
        <Navigation size={15} aria-hidden="true" />
        {Number.isFinite(distance) ? `${distance.toFixed(1)} miles from your starting point` : "Distance unavailable"}
      </p>
    </div>
  );
}

export function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchState = location.state as SearchState | null;
  const cuisine = searchState?.cuisine || "All";
  const subCuisine = searchState?.subCuisine;
  const city = searchState?.city || DEFAULT_CITY;
  const state = searchState?.state || DEFAULT_STATE;
  const lat = searchState?.lat ?? DEFAULT_LAT;
  const lng = searchState?.lng ?? DEFAULT_LNG;
  const origin = { lat, lng };
  const maxPrice = /^[0-4]$/.test(searchState?.maxPrice ?? "") ? searchState?.maxPrice ?? "0" : "0";
  const openNowOnly = searchState?.openNowOnly ?? false;
  const locationLabel = searchState?.locationLabel || `${city}, ${state}`;
  const [restaurants, setRestaurants] = useState<ApiRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [sortOrder, setSortOrder] = useState("recommended");
  const pickedRestaurant = searchState?.restaurant;
  const featured = pickedRestaurant ?? restaurants[0];
  const alternatives = restaurants.filter((restaurant) => !featured || getRestaurantKey(restaurant) !== getRestaurantKey(featured));
  if (sortOrder === "distance") alternatives.sort((a, b) => getDistanceMiles(a, origin) - getDistanceMiles(b, origin));
  if (sortOrder === "rating") alternatives.sort((a, b) => b.rating - a.rating);
  const resultCount = alternatives.length + (featured ? 1 : 0);

  function handleEditPreferences() {
    navigate("/", { state: { preferences: searchState ?? {} } });
  }

  useEffect(() => {
    const controller = new AbortController();
    async function loadRestaurants() {
      setIsLoading(true);
      setLoadError("");
      try {
        const params = new URLSearchParams({ cuisine, city, state, openNowOnly: String(openNowOnly), maxPrice, lat: String(lat), lng: String(lng) });
        if (subCuisine) params.set("subCuisine", subCuisine);
        const res = await fetch(`/restaurants?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Could not load restaurants");
        const data = (await res.json()) as ApiRestaurant[] | null;
        if (data !== null && !Array.isArray(data)) throw new Error("Invalid restaurant response");
        if (!controller.signal.aborted) setRestaurants(data ?? []);
      } catch {
        if (!controller.signal.aborted) setLoadError("We couldn’t load the restaurant list. Give it another try.");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void loadRestaurants();
    return () => controller.abort();
  }, [city, cuisine, lat, lng, maxPrice, openNowOnly, retryCount, state, subCuisine]);

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#27291F]">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 lg:px-12">
        <a href="/" className={`flex items-center gap-2 text-2xl font-bold tracking-tight ${FOCUS_STYLE}`} aria-label="DuluthEats home">
          <Soup className="h-8 w-8 text-[#AD3529]" />
          <span>Duluth<span className="text-[#AD3529]">Eats.</span></span>
        </a>
        <span className="flex items-center gap-2 text-sm text-[#65665B]"><MapPin size={16} /> Duluth, Georgia</span>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-12 lg:px-12">
        <button onClick={handleEditPreferences} className={`mb-6 mt-3 flex min-h-11 items-center gap-2 text-sm text-[#696C60] hover:text-[#AD3529] ${FOCUS_STYLE}`}>
          <ArrowLeft size={17} /> Back to preferences
        </button>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#AD3529]">The delicious part starts here</p>
            <h1 className="font-[Georgia] text-4xl leading-tight tracking-[-0.035em] sm:text-5xl">Your next <span className="italic text-[#AD3529]">great meal.</span></h1>
            <p className="mt-3 text-base text-[#696C60]" role="status">
              {isLoading ? "Gathering your local picks…" : loadError ? "Your table is worth another try." : `${resultCount} ${resultCount === 1 ? "place" : "places"} to satisfy your craving.`}
            </p>
          </div>
          <button onClick={handleEditPreferences} className={`flex min-h-11 items-center gap-2 rounded-xl border border-[#DADBCF] bg-[#FFFEFB] px-4 py-3 text-sm font-medium hover:border-[#AD3529] ${FOCUS_STYLE}`}>
            <SlidersHorizontal size={16} /> Edit preferences
          </button>
        </div>

        {/* Search context stays visible while comparing restaurants. */}
        <div className="mb-8 flex flex-wrap items-center gap-2 rounded-2xl border border-[#E4E2D7] bg-[#F2F1E8] p-4 text-sm text-[#565E49]">
          <span className="mr-2 flex items-center gap-2 break-words"><MapPin size={16} className="shrink-0" /> From {locationLabel}</span>
          <span className="rounded-full bg-[#FFFEFB] px-3 py-1.5">{cuisine === "All" ? "All cuisines" : cuisine}{subCuisine ? ` · ${subCuisine}` : ""}</span>
          <span className="rounded-full bg-[#FFFEFB] px-3 py-1.5">{maxPrice === "0" ? "Any budget" : `Up to ${"$".repeat(Number(maxPrice))}`}</span>
          {openNowOnly && <span className="flex items-center gap-1.5 rounded-full bg-[#E3E9D7] px-3 py-1.5"><Clock3 size={14} /> Open now</span>}
        </div>

        {loadError && (
          <div role="alert" className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E9C9BE] bg-[#FBEDE6] p-5 text-[#913D2F]">
            <p>{loadError}{featured ? " Your top pick is still here." : ""}</p>
            <button onClick={() => setRetryCount((count) => count + 1)} className={`flex min-h-11 items-center gap-2 rounded-lg bg-[#FFFEFB] px-4 text-sm font-semibold ${FOCUS_STYLE}`}><RefreshCw size={16} /> Try again</button>
          </div>
        )}

        {/* The first pick is available immediately when arriving from Home. */}
        {featured ? (
          <section aria-labelledby="top-pick-name" className="grid overflow-hidden rounded-[26px] border border-[#E2DFD3] bg-[#FFFEFB] shadow-[0_16px_55px_-35px_#55513B66] lg:grid-cols-[1.1fr_1fr]">
            <RestaurantPhoto key={getRestaurantKey(featured)} restaurant={featured} isFeatured />
            <div className="flex flex-col justify-center p-6 sm:p-9">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#AD3529]">Your next bite</p>
              <h2 id="top-pick-name" className="mb-5 break-words font-[Georgia] text-3xl leading-tight tracking-tight sm:text-4xl">{featured.name}</h2>
              <RestaurantDetails restaurant={featured} origin={origin} />
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <RestaurantMenu placeId={featured.google_place_id} restaurantName={featured.name} mapsUrl={getMapsUrl(featured)} />
                <a href={getMapsUrl(featured, true)} target="_blank" rel="noopener noreferrer" className={`flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#AD3529] px-5 py-3 text-sm font-semibold text-white hover:bg-[#8F2B22] ${FOCUS_STYLE}`}><Navigation size={17} /> Get directions <ArrowUpRight size={16} /></a>
                <a href={getMapsUrl(featured)} target="_blank" rel="noopener noreferrer" className={`flex min-h-11 items-center gap-1 text-sm font-semibold text-[#AD3529] hover:underline ${FOCUS_STYLE}`}>Reviews & details <ArrowUpRight size={17} /></a>
              </div>
              <p className="mt-4 text-xs text-[#737468]">Opens in Google Maps · Confirm hours before you go.</p>
            </div>
          </section>
        ) : isLoading ? (
          <div role="status" className="grid gap-6 rounded-[26px] border border-[#E2DFD3] bg-[#FFFEFB] p-6 lg:grid-cols-2">
            <span className="sr-only">Loading your recommendation</span>
            <Skeleton className="h-72 bg-[#E9E7DB] motion-reduce:animate-none" />
            <div className="space-y-5 py-6"><Skeleton className="h-9 w-3/4 bg-[#E9E7DB] motion-reduce:animate-none" /><Skeleton className="h-5 w-1/2 bg-[#E9E7DB] motion-reduce:animate-none" /><Skeleton className="h-5 w-full bg-[#E9E7DB] motion-reduce:animate-none" /><Skeleton className="h-12 w-44 bg-[#E9E7DB] motion-reduce:animate-none" /></div>
          </div>
        ) : !loadError ? (
          <div className="rounded-[26px] border border-[#E2DFD3] bg-[#FFFEFB] px-6 py-16 text-center">
            <Soup size={44} className="mx-auto mb-5 text-[#AD3529]" />
            <h2 className="font-[Georgia] text-3xl">A different craving, perhaps?</h2>
            <p className="mx-auto mt-3 max-w-md text-[#696C60]">No places match these preferences. Try another cuisine, a higher budget, or include places that are closed now.</p>
            <button onClick={handleEditPreferences} className={`mt-6 rounded-xl bg-[#AD3529] px-5 py-3 text-white hover:bg-[#8F2B22] ${FOCUS_STYLE}`}>Adjust my preferences</button>
          </div>
        ) : null}

        {(isLoading || alternatives.length > 0) && (
          <section aria-labelledby="alternatives-title" className="mt-11">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div><h2 id="alternatives-title" className="font-[Georgia] text-2xl sm:text-3xl">A few more good choices</h2><p className="mt-1 text-sm text-[#696C60]">{isLoading ? "Finding more flavors nearby…" : `${alternatives.length} alternatives, if you’re in a different mood.`}</p></div>
              {alternatives.length > 1 && (
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger aria-label="Sort alternative restaurants" className="h-11 w-48 rounded-xl border-[#DADBCF] bg-[#FFFEFB]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="recommended">Recommended</SelectItem><SelectItem value="distance">Nearest first</SelectItem><SelectItem value="rating">Highest rated</SelectItem></SelectContent>
                </Select>
              )}
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {isLoading && alternatives.length === 0 ? [1, 2, 3].map((item) => <div key={item} aria-hidden="true" className="overflow-hidden rounded-2xl border border-[#E2DFD3] bg-[#FFFEFB]"><Skeleton className="h-52 rounded-none bg-[#E9E7DB] motion-reduce:animate-none" /><div className="space-y-4 p-6"><Skeleton className="h-6 w-3/4 bg-[#E9E7DB] motion-reduce:animate-none" /><Skeleton className="h-4 w-1/2 bg-[#E9E7DB] motion-reduce:animate-none" /></div></div>) : alternatives.map((restaurant) => (
                <article key={getRestaurantKey(restaurant)} className="flex flex-col overflow-hidden rounded-[22px] border border-[#E2DFD3] bg-[#FFFEFB] transition-shadow hover:shadow-lg">
                  <RestaurantPhoto restaurant={restaurant} />
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h3 className="mb-4 break-words font-[Georgia] text-2xl leading-tight">{restaurant.name}</h3>
                    <RestaurantDetails restaurant={restaurant} origin={origin} />
                    <div className="mt-auto pt-5">
                      <RestaurantMenu placeId={restaurant.google_place_id} restaurantName={restaurant.name} mapsUrl={getMapsUrl(restaurant)} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                      <a href={getMapsUrl(restaurant)} target="_blank" rel="noopener noreferrer" aria-label={`View ${restaurant.name} on Google Maps`} className={`flex min-h-11 items-center gap-1 text-sm font-semibold text-[#AD3529] hover:underline ${FOCUS_STYLE}`}>View restaurant <ArrowUpRight size={17} /></a>
                      <a href={getMapsUrl(restaurant, true)} target="_blank" rel="noopener noreferrer" aria-label={`Get directions to ${restaurant.name}`} className={`flex h-11 w-11 items-center justify-center rounded-full border border-[#E2DFD3] text-[#626E4F] hover:bg-[#EEF0E6] ${FOCUS_STYLE}`}><Navigation size={17} /></a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        <footer className="mt-10 flex flex-wrap justify-between gap-3 border-t border-[#E2DFD3] pt-5 text-xs text-[#737468]">
          <p>Made for hungry people in Duluth.</p><p>Details from Google Places · Distances are straight-line estimates.</p>
        </footer>
      </main>
    </div>
  );
}
