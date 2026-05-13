import { useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Star, MapPin, ExternalLink, ArrowLeft } from "lucide-react";

interface ApiRestaurant {
  id: number;
  google_place_id: string;
  name: string;
  rating: number;
  latitude: number;
  longitude: number;
  is_open: boolean;
  price_level: number;
  formatted_address: string;
  photo_reference: string;
  google_maps_uri: string;
}

interface Restaurant {
  id: number;
  googlePlaceId: string;
  name: string;
  rating: number;
  distance: string;
  isOpen: boolean;
  mapsUrl: string;
  priceLevel: number;
  formattedAddress: string;
  photoReference: string;
  googleMapsUri: string;
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
}

const DEFAULT_CITY = "Duluth";
const DEFAULT_STATE = "GA";

interface Coordinates {
  lat: number;
  lng: number;
}

function getDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRestaurantViewModel(restaurant: ApiRestaurant, origin: Coordinates | null): Restaurant {
  const distance = origin
    ? `${getDistanceMiles(origin.lat, origin.lng, restaurant.latitude, restaurant.longitude).toFixed(1)} mi away`
    : "Distance unavailable";

  const mapsUrl = restaurant.google_maps_uri || `https://www.google.com/maps/place/?q=place_id:${restaurant.google_place_id}`;

  return {
    id: restaurant.id,
    googlePlaceId: restaurant.google_place_id,
    name: restaurant.name,
    rating: restaurant.rating,
    distance,
    isOpen: restaurant.is_open,
    mapsUrl,
    priceLevel: restaurant.price_level ?? 0,
    formattedAddress: restaurant.formatted_address ?? "",
    photoReference: restaurant.photo_reference ?? "",
    googleMapsUri: restaurant.google_maps_uri ?? "",
  };
}

export function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchState = (location.state as SearchState | null) ?? null;
  const cuisine = searchState?.cuisine || "All";
  const subCuisine = searchState?.subCuisine;
  const city = searchState?.city || DEFAULT_CITY;
  const state = searchState?.state || DEFAULT_STATE;
  const lat = searchState?.lat;
  const lng = searchState?.lng;
  const openNowOnly = searchState?.openNowOnly ?? false;
  const locationLabel = searchState?.locationLabel || `${city}, ${state}`;
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [distanceOrigin, setDistanceOrigin] = useState<Coordinates | null>(() => {
    if (lat !== undefined && lng !== undefined) {
      return { lat, lng };
    }
    return null;
  });
  const pickedRestaurant = searchState?.restaurant;
  const mappedPickedRestaurant = pickedRestaurant
    ? toRestaurantViewModel(pickedRestaurant, distanceOrigin)
    : undefined;
  const displayRestaurants = mappedPickedRestaurant
    ? [
        mappedPickedRestaurant,
        ...restaurants.filter(
          (r) => r.googlePlaceId !== mappedPickedRestaurant.googlePlaceId,
        ),
      ]
    : restaurants;

  useEffect(() => {
    async function loadRestaurants() {
      setLoading(true);

      let origin = distanceOrigin;
      if (!origin && city && state) {
        const locationParams = new URLSearchParams({ city, state });
        const locationRes = await fetch(`/resolve-location?${locationParams.toString()}`);
        if (locationRes.ok) {
          const locationData = (await locationRes.json()) as Coordinates;
          origin = locationData;
          setDistanceOrigin(locationData);
        }
      }

      const params = new URLSearchParams({
        cuisine,
        city,
        state,
        openNowOnly: String(openNowOnly),
      });

      if (subCuisine) {
        params.set("subCuisine", subCuisine);
      }

      if (origin) {
        params.set("lat", String(origin.lat));
        params.set("lng", String(origin.lng));
      }

      try {
        const res = await fetch(`/restaurants?${params.toString()}`);
        const data = (await res.json()) as ApiRestaurant[];
        setRestaurants(data.map((restaurant) => toRestaurantViewModel(restaurant, origin)));
      } catch {
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    }

    loadRestaurants();
  }, [city, cuisine, distanceOrigin, openNowOnly, state, subCuisine]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Decorative red roof banner at top */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#8B0000] to-[#A52A2A]"></div>
      
      {/* Warm wood texture background */}
      <div className="absolute inset-0 bg-wood-pattern opacity-20"></div>
      
      {/* Content */}
      <div className="relative z-10 min-h-screen pt-20 pb-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-full hover:bg-white/50 transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-[#8B0000]" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-[#8B0000]">
                {cuisine === "All" ? "Top Picks" : `${cuisine} Restaurants`}
              </h1>
              <p className="text-gray-600">
                {restaurants.length} results near {locationLabel}
              </p>
              {openNowOnly && <p className="text-sm text-gray-600">Showing only places open now</p>}
            </div>
          </div>

          {/* Restaurant Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div>Loading...</div>
            ) : (
              displayRestaurants.map((restaurant, index) => (
                <div
                  key={restaurant.googlePlaceId || restaurant.id}
                  className="bg-[#FFF8F0] rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 relative flex flex-col"
                >
                  {/* Ranking Badge */}
                  {index < 3 && (
                    <div className="absolute top-2 left-2 z-10 bg-[#8B0000] text-white px-3 py-1 rounded-full text-sm">
                      #{index + 1} Pick
                    </div>
                  )}

                  {/* Photo */}
                  {restaurant.photoReference ? (
                    <img
                      src={`/photo?name=${restaurant.photoReference}`}
                      alt={restaurant.name}
                      className="w-full h-36 object-cover"
                    />
                  ) : (
                    <div className="w-full h-36 bg-gradient-to-br from-[#8B0000]/10 to-[#A52A2A]/20 flex items-center justify-center">
                      <span className="text-3xl">🍽️</span>
                    </div>
                  )}

                  {/* Card body */}
                  <div className="p-5 flex flex-col flex-1">
                    {/* Name + price level */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 leading-snug">
                        {restaurant.name}
                      </h3>
                      {restaurant.priceLevel > 0 && (
                        <span className="text-sm font-medium text-gray-500 shrink-0">
                          {"$".repeat(restaurant.priceLevel)}
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex flex-col gap-2 text-sm flex-1">
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <Star className="w-4 h-4 fill-amber-500 shrink-0" />
                        <span className="font-medium">{restaurant.rating}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span>{restaurant.distance}</span>
                      </div>
                      {restaurant.formattedAddress && (
                        <div className="flex items-start gap-1.5 text-gray-600">
                          <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                          <span className="leading-snug">{restaurant.formattedAddress}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${restaurant.isOpen ? "bg-green-500" : "bg-red-500"}`} />
                        <span className={`font-medium ${restaurant.isOpen ? "text-green-700" : "text-red-700"}`}>
                          {restaurant.isOpen ? "Open Now" : "Closed"}
                        </span>
                      </div>
                    </div>

                    {/* Reviews link pinned to bottom */}
                    <a
                      href={restaurant.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[#8B0000] hover:text-[#A52A2A] transition-colors mt-4"
                    >
                      <span className="text-sm font-medium">Reviews &amp; Info on Google Maps</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
