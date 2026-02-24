import { useLocation, useNavigate } from "react-router";
import { Star, MapPin, ExternalLink, ArrowLeft } from "lucide-react";

interface Restaurant {
  id: number;
  name: string;
  rating: number;
  distance: string;
  isOpen: boolean;
  mapsUrl: string;
  rank?: number;
}

const mockRestaurants: Restaurant[] = [
  {
    id: 1,
    name: "Seoul Garden Restaurant",
    rating: 4.6,
    distance: "0.8 miles",
    isOpen: true,
    mapsUrl: "https://maps.google.com",
    rank: 1,
  },
  {
    id: 2,
    name: "Golden Wok Chinese Cuisine",
    rating: 4.4,
    distance: "1.2 miles",
    isOpen: true,
    mapsUrl: "https://maps.google.com",
    rank: 2,
  },
  {
    id: 3,
    name: "Sushi Avenue",
    rating: 4.7,
    distance: "1.5 miles",
    isOpen: false,
    mapsUrl: "https://maps.google.com",
    rank: 3,
  },
  {
    id: 4,
    name: "Pho Dai Loi",
    rating: 4.5,
    distance: "2.1 miles",
    isOpen: true,
    mapsUrl: "https://maps.google.com",
  },
  {
    id: 5,
    name: "Thai Basil Kitchen",
    rating: 4.3,
    distance: "2.3 miles",
    isOpen: true,
    mapsUrl: "https://maps.google.com",
  },
  {
    id: 6,
    name: "Kang Nam Korean BBQ",
    rating: 4.8,
    distance: "1.8 miles",
    isOpen: false,
    mapsUrl: "https://maps.google.com",
  },
];

export function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const cuisine = location.state?.cuisine || "All";

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Decorative red roof banner at top */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#8B0000] to-[#A52A2A]"></div>
      
      {/* Warm wood texture background */}
      <div className="absolute inset-0 bg-wood-pattern opacity-20"></div>
      
      {/* Content */}
      <div className="relative z-10 min-h-screen pt-20 pb-8 px-4">
        <div className="max-w-2xl mx-auto">
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
                {mockRestaurants.length} results in Duluth, GA
              </p>
            </div>
          </div>

          {/* Restaurant Cards */}
          <div className="space-y-4">
            {mockRestaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                className="bg-[#FFF8F0] rounded-2xl p-5 shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 relative"
              >
                {/* Ranking Badge */}
                {restaurant.rank && (
                  <div className="absolute -top-2 -left-2 bg-[#8B0000] text-white px-3 py-1 rounded-full text-sm">
                    #{restaurant.rank} Pick
                  </div>
                )}

                <div className="space-y-3">
                  {/* Restaurant Name */}
                  <h3 className="text-xl font-semibold text-gray-900 pr-8">
                    {restaurant.name}
                  </h3>

                  {/* Info Row */}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {/* Rating */}
                    <div className="flex items-center gap-1 text-amber-600">
                      <Star className="w-4 h-4 fill-amber-500" />
                      <span className="font-medium">{restaurant.rating}</span>
                    </div>

                    {/* Distance */}
                    <div className="flex items-center gap-1 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{restaurant.distance}</span>
                    </div>

                    {/* Open/Closed Status */}
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          restaurant.isOpen ? "bg-green-500" : "bg-red-500"
                        }`}
                      ></div>
                      <span
                        className={`font-medium ${
                          restaurant.isOpen ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {restaurant.isOpen ? "Open Now" : "Closed"}
                      </span>
                    </div>
                  </div>

                  {/* Maps Link */}
                  <a
                    href={restaurant.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#8B0000] hover:text-[#A52A2A] transition-colors"
                  >
                    <span className="text-sm font-medium">View on Google Maps</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
