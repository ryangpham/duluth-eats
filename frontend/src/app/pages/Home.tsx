import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown } from "lucide-react";

const DEFAULT_CITY = "Duluth";
const DEFAULT_STATE = "GA";
const SEARCH_CITY = "Duluth";
const SEARCH_STATE = "GA";

interface Coordinates {
  lat: number;
  lng: number;
}

function parseLocationInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return { city: DEFAULT_CITY, state: DEFAULT_STATE };
  }

  const [cityPart, statePart] = trimmed.split(",").map((part) => part.trim());
  return {
    city: cityPart || DEFAULT_CITY,
    state: statePart || DEFAULT_STATE,
  };
}

export function Home() {
  const [selectedCuisine, setSelectedCuisine] = useState("All");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [manualLocation, setManualLocation] = useState("");
  const [locationError, setLocationError] = useState("");
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const navigate = useNavigate();

  const cuisines = ["All", "Korean", "Chinese", "Japanese", "Vietnamese", "Thai"];

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported in this browser.");
      return;
    }

    setLocationError("");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      () => {
        setLocationError("Couldn't get your location. Try typing a city and state.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  };

  const handlePickForMe = async () => {
    setIsPicking(true);
    setLocationError("");

    try {
      const { city: userCity, state: userState } = parseLocationInput(manualLocation);
      let resolvedCoordinates = userCoordinates;

      if (!resolvedCoordinates) {
        const locationParams = new URLSearchParams({ city: userCity, state: userState });
        const locationRes = await fetch(`/resolve-location?${locationParams.toString()}`);
        if (locationRes.ok) {
          const locationData = (await locationRes.json()) as Coordinates;
          resolvedCoordinates = locationData;
        }
      }

      const params = new URLSearchParams({
        cuisine: selectedCuisine,
        city: SEARCH_CITY,
        state: SEARCH_STATE,
        openNowOnly: String(openNowOnly),
      });

      if (resolvedCoordinates) {
        params.set("lat", resolvedCoordinates.lat.toString());
        params.set("lng", resolvedCoordinates.lng.toString());
      }

      const res = await fetch(`/pick?${params.toString()}`);
      if (!res.ok) {
        setLocationError("Couldn't find a restaurant for that location. Try another city and state.");
        return;
      }

      const data = await res.json();
      const userLocationLabel = userCoordinates ? "your current location" : `${userCity}, ${userState}`;

      navigate("/results", {
        state: {
          cuisine: selectedCuisine,
          restaurant: data,
          city: SEARCH_CITY,
          state: SEARCH_STATE,
          lat: resolvedCoordinates?.lat,
          lng: resolvedCoordinates?.lng,
          openNowOnly,
          locationLabel: userLocationLabel,
        },
      });
    } finally {
      setIsPicking(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Decorative red roof banner at top */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[#8B0000] to-[#A52A2A] clip-roof"></div>
      
      {/* Warm wood texture background */}
      <div className="absolute inset-0 bg-wood-pattern opacity-30"></div>
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto text-center space-y-8">
          {/* Logo/Title */}
          <div className="space-y-3">
            <h1 className="text-5xl font-bold text-[#8B0000] tracking-tight">
              DuluthEats
            </h1>
            <p className="text-lg text-gray-700">
              Find the best Asian food in Duluth, GA
            </p>
          </div>

          {/* Cuisine Selector */}
          <div className="space-y-4">
            <button
              onClick={handleUseCurrentLocation}
              className="self-start px-4 py-2 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow text-sm text-gray-800"
              disabled={isLocating}
            >
              {isLocating ? "Getting Location..." : "Use My Current Location"}
            </button>

            <p className="text-sm text-gray-600 text-center">or</p>

            <p className="mb-2 text-sm text-gray-700 text-left font-medium">
              Manually enter your city and state
            </p>
            <input
              type="text"
              value={manualLocation}
              onChange={(event) => {
                setManualLocation(event.target.value);
                setUserCoordinates(null);
              }}
              placeholder="City, State"
              className="w-full px-6 py-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow text-lg text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B0000]/40"
            />

            {locationError && <p className="text-sm text-red-700">{locationError}</p>}

            <p className="mb-2 text-sm text-gray-700 text-left font-medium">Choose a cuisine</p>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-6 py-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow flex items-center justify-between text-lg"
              >
                <span className="text-gray-800">{selectedCuisine}</span>
                <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl overflow-hidden z-20">
                  {cuisines.map((cuisine) => (
                    <button
                      key={cuisine}
                      onClick={() => {
                        setSelectedCuisine(cuisine);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full px-6 py-3 text-left hover:bg-red-50 transition-colors ${
                        selectedCuisine === cuisine ? 'bg-red-50 text-[#8B0000]' : 'text-gray-800'
                      }`}
                    >
                      {cuisine}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-center gap-3 text-gray-700">
              <input
                type="checkbox"
                checked={openNowOnly}
                onChange={(event) => setOpenNowOnly(event.target.checked)}
                className="h-4 w-4 accent-[#8B0000]"
              />
              <span className="text-sm">Show restaurants that are open now only</span>
            </label>

            {/* Pick For Me Button */}
            <button
              onClick={handlePickForMe}
              className="w-full px-8 py-5 bg-[#8B0000] text-white rounded-2xl shadow-lg hover:bg-[#A52A2A] hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              disabled={isPicking}
            >
              {isPicking ? "Loading..." : "Pick For Me"}
            </button>

            {/* Tagline */}
            <p className="text-sm text-gray-600">
              Powered by live Google Places data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
