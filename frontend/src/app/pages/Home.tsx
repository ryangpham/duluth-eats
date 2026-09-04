import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowUpRight, ArrowRight, Soup, MapPin, LocateFixed, Sparkles, Clock3, Check, LoaderCircle } from "lucide-react";
import { Switch } from "../components/ui/switch";

const DEFAULT_CITY = "Duluth";
const DEFAULT_STATE = "GA";
const SEARCH_CITY = "Duluth";
const SEARCH_STATE = "GA";

const CUISINES = ["All", "Korean", "Chinese", "Japanese", "Vietnamese", "Thai"];

const SUB_CUISINES: Record<string, string[]> = {
  Korean: ["Any", "KBBQ", "Traditional", "Ramyun", "Fried Chicken", "Stew & Soup"],
  Chinese: ["Any", "Sichuan", "Cantonese", "Dim Sum", "Hot Pot", "Noodles"],
  Japanese: ["Any", "Sushi", "Ramen", "Izakaya", "Tonkatsu", "Teppanyaki"],
  Vietnamese: ["Any", "Pho", "Banh Mi", "Bun", "Com Tam"],
  Thai: ["Any", "Curry", "Pad Thai", "Noodle Soup", "Street Food"],
};

interface Coordinates {
  lat: number;
  lng: number;
}

interface SavedPreferences {
  cuisine?: string;
  subCuisine?: string;
  maxPrice?: string;
  openNowOnly?: boolean;
  locationLabel?: string;
  lat?: number;
  lng?: number;
}

interface HomeNavigationState {
  preferences?: SavedPreferences;
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
  const location = useLocation();
  const preferences = (location.state as HomeNavigationState | null)?.preferences;
  const [selectedCuisine, setSelectedCuisine] = useState(preferences?.cuisine ?? "All");
  const [selectedSubCuisine, setSelectedSubCuisine] = useState(preferences?.subCuisine ?? "Any");
  const [maxPrice, setMaxPrice] = useState(preferences?.maxPrice ?? "0");
  const [isPicking, setIsPicking] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [manualAddress, setManualAddress] = useState(preferences?.locationLabel !== "your current location" ? preferences?.locationLabel ?? "" : "");
  const [locationError, setLocationError] = useState("");
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(() => preferences?.locationLabel === "your current location" && preferences.lat !== undefined && preferences.lng !== undefined ? { lat: preferences.lat, lng: preferences.lng } : null);
  const [openNowOnly, setOpenNowOnly] = useState(preferences?.openNowOnly ?? false);
  const navigate = useNavigate();

  const subCuisineOptions = SUB_CUISINES[selectedCuisine] ?? [];

  const handleSelectCuisine = (cuisine: string) => {
    setSelectedCuisine(cuisine);
    setSelectedSubCuisine("Any");

  };

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
        setManualAddress("");
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
      const typedAddress = manualAddress.trim();
      const { city: userCity, state: userState } = parseLocationInput(typedAddress);
      let resolvedCoordinates = userCoordinates;

      if (!resolvedCoordinates && typedAddress) {
        const locationParams = new URLSearchParams({ address: typedAddress });
        const locationRes = await fetch(`/resolve-location?${locationParams.toString()}`);
        if (locationRes.ok) {
          const locationData = (await locationRes.json()) as Coordinates;
          resolvedCoordinates = locationData;
        } else {
          setLocationError("Couldn't find that address. Try a different address or use your current location.");
          return;
        }
      }

      const params = new URLSearchParams({
        cuisine: selectedCuisine,
        city: SEARCH_CITY,
        state: SEARCH_STATE,
        openNowOnly: String(openNowOnly),
        maxPrice,
      });

      if (selectedSubCuisine !== "Any") {
        params.set("subCuisine", selectedSubCuisine);
      }

      if (resolvedCoordinates) {
        params.set("lat", resolvedCoordinates.lat.toString());
        params.set("lng", resolvedCoordinates.lng.toString());
      }

      const res = await fetch(`/pick?${params.toString()}`);
      if (!res.ok) {
        setLocationError(res.status === 404 ? "No matches this time. Try a higher budget, another cuisine, or turning off open now." : "We couldn’t load restaurants. Please try again in a moment.");
        return;
      }

      const data = await res.json();
      const userLocationLabel = userCoordinates ? "your current location" : typedAddress || `${userCity}, ${userState}`;

      navigate("/results", {
        state: {
          cuisine: selectedCuisine,
          subCuisine: selectedSubCuisine !== "Any" ? selectedSubCuisine : undefined,
          restaurant: data,
          city: SEARCH_CITY,
          state: SEARCH_STATE,
          lat: resolvedCoordinates?.lat,
          lng: resolvedCoordinates?.lng,
          openNowOnly,
          maxPrice,
          locationLabel: userLocationLabel,
        },
      });
    } catch {
      setLocationError("We couldn’t connect. Check your connection and try again.");
    } finally {
      setIsPicking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#27291F]">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-6 lg:px-12">
        <a href="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight" aria-label="DuluthEats home"><Soup className="h-8 w-8 text-[#AD3529]" />Duluth<span className="-ml-2 text-[#AD3529]">Eats</span><span className="text-[#AD3529]">.</span></a>
        <span className="flex items-center gap-2 text-sm text-[#65665B]"><MapPin size={16} /> Duluth, Georgia</span>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-12 lg:px-12">
        <div className="grid items-start gap-10 pt-5 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:pt-8">
          {/* A little inspiration, with the finder always close by. */}
          <section className="contents lg:block">
            <div>
            <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#AD3529]"><span className="h-2 w-2 rounded-full bg-[#AD3529]" /> A world of flavor. Right here.</p>
            <h1 className="font-[Georgia] text-5xl leading-[1.06] tracking-[-0.04em] sm:text-6xl xl:text-7xl">Big cravings.<br />Little decisions.<br /><span className="italic text-[#AD3529]">Good eats.</span></h1>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-[#66665C]">From sizzling Korean BBQ to a soul-warming bowl of pho. Find your next favorite in Duluth.</p>
            </div>
            <figure className="order-3 lg:order-none">
            <div className="relative lg:mt-7 overflow-hidden rounded-[24px] bg-[#383A2D]">
              <img src="https://images.unsplash.com/photo-1720873915320-84103511b1fb?auto=format&fit=crop&w=1000&q=85" alt="A rich bowl of ramen with eggs, mushrooms, scallions, and nori" className="h-64 w-full object-cover sm:h-72" fetchPriority="high" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-white"><div><p className="mb-1 text-xs uppercase tracking-[0.16em] text-white/80">A little craving inspiration</p><p className="font-[Georgia] text-2xl">Comfort by the bowl.</p></div><button type="button" onClick={() => { handleSelectCuisine("Japanese"); setSelectedSubCuisine("Ramen"); document.getElementById("finder")?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/50 bg-white/10 transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-4" aria-label="Choose Japanese ramen"><ArrowUpRight size={22} /></button></div>
            </div>
            <p className="mt-3 text-xs text-[#737468]">Food inspiration · <a className="underline underline-offset-2" href="https://unsplash.com/photos/a-bowl-of-food-with-chopsticks-on-a-wooden-table-ua-RZdLk0OE" target="_blank" rel="noreferrer">Photo on Unsplash</a></p>
            </figure>
          </section>

          {/* Restaurant finder */}
          <section id="finder" className="order-2 lg:order-none rounded-[28px] border border-[#E5E1D6] bg-[#FFFEFB] p-6 shadow-[0_16px_55px_-30px_#55513B55] sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4"><div><p className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-[#AD3529]">Less scrolling, more eating</p><h2 className="font-[Georgia] text-3xl tracking-tight">What sounds good?</h2></div><Sparkles className="mt-2 text-[#AD3529]" size={24} /></div>
            <form onSubmit={(event) => { event.preventDefault(); void handlePickForMe(); }}>
              <fieldset disabled={isPicking} className="space-y-6 disabled:opacity-70">
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><label htmlFor="address" className="text-sm font-semibold">Your starting point</label><button type="button" onClick={handleUseCurrentLocation} disabled={isLocating} className="flex items-center gap-1.5 text-sm text-[#AD3529] underline-offset-4 hover:underline disabled:opacity-50"><LocateFixed size={15} />{isLocating ? "Locating…" : "Use my location"}</button></div>
                  <div className="relative"><MapPin className="absolute left-3.5 top-3.5 text-[#797A6C]" size={19} /><input id="address" value={userCoordinates ? "Current location selected" : manualAddress} disabled={isLocating} onChange={(event) => { setManualAddress(event.target.value); setUserCoordinates(null); setLocationError(""); }} placeholder="Duluth, GA" aria-describedby="location-hint" className="w-full rounded-xl border border-[#DCDDD2] bg-[#FAFAF6] py-3 pl-11 pr-3 text-base focus:outline-2 focus:outline-[#AD3529]" /></div>
                  <p id="location-hint" className="mt-2 text-xs text-[#737468]">Optional. We’ll use central Duluth to rank nearby picks.</p>
                </div>
                <fieldset><legend className="mb-3 text-sm font-semibold">Pick your cuisine</legend><div className="grid grid-cols-3 gap-2">{CUISINES.map((cuisine) => <button key={cuisine} type="button" aria-pressed={selectedCuisine === cuisine} onClick={() => handleSelectCuisine(cuisine)} className={`flex min-h-11 items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AD3529] ${selectedCuisine === cuisine ? "border-[#AD3529] bg-[#AD3529] text-white" : "border-[#E2E2D7] bg-transparent text-[#55574A] hover:border-[#AD3529] hover:bg-[#FAF1E9]"}`}>{selectedCuisine === cuisine && <Check size={14} />}{cuisine === "All" ? "Anything" : cuisine}</button>)}</div></fieldset>
                {selectedCuisine !== "All" && <fieldset><legend className="mb-2 text-sm font-semibold">Something specific?</legend><div className="flex flex-wrap gap-2">{subCuisineOptions.map((style) => <button type="button" key={style} aria-pressed={selectedSubCuisine === style} onClick={() => setSelectedSubCuisine(style)} className={`rounded-full border px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-[#AD3529] ${selectedSubCuisine === style ? "border-[#AD3529] bg-[#F9EBE5] text-[#9B3025]" : "border-[#E2E2D7] hover:bg-[#FAF1E9]"}`}>{style === "Any" ? "Any style" : style}</button>)}</div></fieldset>}
                <fieldset><legend className="mb-2 text-sm font-semibold">Your budget <span className="font-normal text-[#737468]">· maximum price level</span></legend><div className="flex gap-2">{[{value: "0", label: "Any"}, {value: "1", label: "$"}, {value: "2", label: "$$"}, {value: "3", label: "$$$"}, {value: "4", label: "$$$$"}].map((price) => <button key={price.value} type="button" aria-label={price.value === "0" ? "Any budget" : `Maximum price level ${price.value} of 4`} aria-pressed={maxPrice === price.value} onClick={() => setMaxPrice(price.value)} className={`min-h-11 flex-1 rounded-lg border text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[#AD3529] ${maxPrice === price.value ? "border-[#64704B] bg-[#EEF0E6] font-semibold text-[#3F4F2F]" : "border-[#E2E2D7] text-[#66665C] hover:bg-[#F4F4EC]"}`}>{price.label}</button>)}</div><p className="mt-2 text-xs text-[#737468]">A budget excludes places with an unknown price level.</p></fieldset>
                <div className="flex items-center justify-between gap-4 border-t border-[#E8E7DE] pt-5"><label htmlFor="open-now" className="flex items-center gap-3 text-sm"><Clock3 size={19} className="text-[#687453]" /><span className="font-semibold">Open now only</span></label><Switch id="open-now" checked={openNowOnly} onCheckedChange={setOpenNowOnly} className="data-[state=checked]:bg-[#64704B]" /></div>
                {locationError && <p role="alert" className="rounded-xl bg-[#FBEAE5] p-3 text-sm text-[#9B3025]">{locationError}</p>}
                <button type="submit" disabled={isLocating || isPicking} className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#AD3529] px-5 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#8F2B22] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#AD3529] disabled:cursor-wait disabled:opacity-60">{isPicking ? <LoaderCircle className="animate-spin" size={20} /> : <Sparkles size={19} />}{isPicking ? "Finding your next bite…" : "Find my next bite"}{!isPicking && <ArrowRight size={19} />}</button>
              </fieldset>
              <p className="mt-3 text-center text-xs text-[#737468]" aria-live="polite">{isLocating ? "Waiting for location permission…" : userCoordinates ? "Your location is ready. Let’s find something good." : "One great pick, plus a few delicious alternatives."}</p>
            </form>
          </section>
        </div>
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#E2DFD3] pt-5 text-xs text-[#737468]"><p>Made for hungry people in Duluth.</p><p>Restaurant details from Google Places <span className="mx-2">·</span> Five cuisines. Endless cravings.</p></footer>
      </main>
    </div>
  );
}
