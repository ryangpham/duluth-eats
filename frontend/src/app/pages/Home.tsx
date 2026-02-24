import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown } from "lucide-react";

export function Home() {
  const [selectedCuisine, setSelectedCuisine] = useState("All");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const cuisines = ["All", "Korean", "Chinese", "Japanese", "Vietnamese", "Thai"];

  const handlePickForMe = () => {
    navigate("/results", { state: { cuisine: selectedCuisine } });
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

            {/* Pick For Me Button */}
            <button
              onClick={handlePickForMe}
              className="w-full px-8 py-5 bg-[#8B0000] text-white rounded-2xl shadow-lg hover:bg-[#A52A2A] hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Pick For Me
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
