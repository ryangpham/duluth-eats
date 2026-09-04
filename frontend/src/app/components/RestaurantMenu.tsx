import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, LoaderCircle, RefreshCw, Search, Soup } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

interface MenuPrice {
  label?: string;
  amount: string;
  currency?: string;
}

interface MenuItem {
  name: string;
  description?: string;
  section?: string;
  prices: MenuPrice[];
  source_url: string;
}

interface MenuData {
  website_url?: string;
  menu_url?: string;
  items: MenuItem[];
  checked_at: string;
}

interface RestaurantMenuProps {
  placeId: string;
  restaurantName: string;
  mapsUrl: string;
}

function formatMenuPrice(price: MenuPrice) {
  const amount = Number(price.amount);
  if (!Number.isFinite(amount)) return "Price unavailable";
  if (!price.currency) return `${price.amount} (currency not listed)`;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency, currencyDisplay: "symbol" }).format(amount);
  } catch {
    return `${price.amount} ${price.currency}`;
  }
}

export function RestaurantMenu({ placeId, restaurantName, mapsUrl }: RestaurantMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const filteredItems = menu?.items.filter((item) => `${item.name} ${item.description ?? ""} ${item.section ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())) ?? [];
  const sections = [...new Set(filteredItems.map((item) => item.section || "On the menu"))];

  useEffect(() => {
    if (!isOpen || !placeId || menu) return;
    const controller = new AbortController();
    async function loadMenu() {
      setIsLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ placeId });
        const res = await fetch(`/menu?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Menu unavailable");
        const data = (await res.json()) as MenuData;
        if (!Array.isArray(data.items)) throw new Error("Invalid menu response");
        if (!controller.signal.aborted) setMenu(data);
      } catch {
        if (!controller.signal.aborted) setError("We couldn’t load the menu right now. Try again, or check the restaurant on Google Maps.");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void loadMenu();
    return () => controller.abort();
  }, [isOpen, menu, placeId, retryCount]);

  return (
    <div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button className="flex min-h-11 items-center gap-2 rounded-xl border border-[#DADBCF] bg-[#F6F5EC] px-4 py-2.5 text-sm font-semibold text-[#4E5F3B] transition-colors hover:border-[#64704B] hover:bg-[#EBEFDF] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#AD3529]" aria-label={`View menu for ${restaurantName}`}>
            <BookOpen size={17} /> View menu
          </button>
        </DialogTrigger>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-[24px] border-[#E2DFD3] bg-[#FAF7F0] p-0 text-[#27291F] sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-[#E2DFD3] p-6 pr-12 text-left">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[#AD3529]">Something delicious awaits</p>
            <DialogTitle className="font-[Georgia] text-3xl font-normal leading-tight">{restaurantName}</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed text-[#696C60]">Menu items and prices published on the restaurant’s website. Availability and prices may vary by location or ordering method.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {isLoading || (!menu && !error && placeId) ? (
              <div role="status" className="flex flex-col items-center gap-3 py-14 text-center text-[#696C60]">
                <LoaderCircle size={28} className="animate-spin text-[#AD3529] motion-reduce:animate-none" />
                <p>Checking the restaurant’s published menu…</p>
                <p className="text-sm">This can take a few seconds.</p>
              </div>
            ) : error ? (
              <div role="alert" className="rounded-2xl bg-[#FBEDE6] p-5 text-[#913D2F]">
                <p className="text-sm leading-relaxed">{error}</p>
                <button onClick={() => setRetryCount((count) => count + 1)} className="mt-4 flex min-h-11 items-center gap-2 rounded-lg bg-[#FFFEFB] px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#AD3529]"><RefreshCw size={16} /> Try again</button>
              </div>
            ) : menu && menu.items.length > 0 ? (
              <div>
                <div className="mb-5 rounded-xl bg-[#EEF0E6] p-3 text-sm leading-relaxed text-[#526043]">These are the items we could read from the published menu; the restaurant’s full menu may include more. Unlisted prices are never estimated.</div>
                <label className="mb-2 block text-sm font-semibold" htmlFor={`menu-search-${placeId}`}>Find a dish</label>
                <div className="relative mb-5"><Search size={17} className="absolute left-3 top-3.5 text-[#737468]" /><input id={`menu-search-${placeId}`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dishes or ingredients" className="min-h-11 w-full rounded-xl border border-[#DADBCF] bg-[#FFFEFB] py-3 pl-10 pr-3 text-sm focus:outline-2 focus:outline-[#AD3529]" /></div>
                <p role="status" className="mb-4 text-xs text-[#737468]">{filteredItems.length} of {menu.items.length} published items</p>
                {sections.map((section) => (
                  <section key={section} className="mb-6">
                    <h3 className="mb-2 font-[Georgia] text-xl text-[#AD3529]">{section}</h3>
                    <div className="divide-y divide-[#E6E3D8]">
                      {filteredItems.filter((item) => (item.section || "On the menu") === section).map((item) => (
                        <div key={`${item.section}:${item.name}`} className="py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <h4 className="min-w-0 flex-1 basis-40 text-base font-semibold">{item.name}</h4>
                            <div className="space-y-1 text-right text-sm font-semibold text-[#526043]">
                              {item.prices.length > 0 ? item.prices.map((price, index) => <p key={`${price.label}:${price.amount}:${index}`}>{price.label && <span className="font-normal">{price.label} · </span>}{formatMenuPrice(price)}</p>) : <p className="font-normal text-[#737468]">Price not listed</p>}
                            </div>
                          </div>
                          {item.description && <p className="mt-2 text-sm leading-relaxed text-[#696C60]">{item.description}</p>}
                          <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-8 items-center gap-1 text-xs text-[#AD3529] underline underline-offset-2">Published source <ArrowUpRight size={12} /></a>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
                {filteredItems.length === 0 && <p className="py-6 text-center text-sm text-[#696C60]">No dishes match that search. Try another name.</p>}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Soup size={42} className="mx-auto mb-4 text-[#AD3529]" />
                <h3 className="font-[Georgia] text-2xl">This menu needs a closer look</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#696C60]">We couldn’t read item prices for this restaurant. Its menu may be a PDF, image, or ordering page. Use the links below to check the published menu and prices.</p>
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-[#E2DFD3] bg-[#FFFEFB] p-5">
            <div className="flex flex-wrap gap-3">
              {(menu?.menu_url || menu?.website_url) && <a href={menu.menu_url || menu.website_url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 rounded-xl bg-[#AD3529] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8F2B22]">{menu.menu_url ? "Open published menu" : "Restaurant website"}<ArrowUpRight size={16} /></a>}
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-1 px-1 text-sm font-semibold text-[#AD3529] hover:underline">Google Maps <ArrowUpRight size={16} /></a>
            </div>
            {menu && <p className="mt-3 text-xs text-[#737468]">Website checked {new Date(menu.checked_at).toLocaleString()} · Prices may have changed since publication. Source links open in a new tab.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
