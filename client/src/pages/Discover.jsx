import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, SlidersHorizontal, Loader2, MapPin, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import MapView from '../components/MapView';
import ShopCard from '../components/ShopCard';
import ShopDetail from '../components/ShopDetail';
import FilterPanel from '../components/FilterPanel';
import { shopsApi } from '../services/api';
import { useLocation } from '../hooks/useLocation';

const DEFAULT_RADIUS = 8046; // 5 miles
const PAGE_SIZE = 10;        // shops shown per "page" in the list

const DEFAULT_FILTERS = {
  vibes: [],
  priceRange: [],
  radius: DEFAULT_RADIUS,
  openNow: false,
  minRating: 0,
};

const SORT_OPTIONS = [
  { key: 'score',    label: 'Best Match' },
  { key: 'distance', label: 'Distance'   },
  { key: 'price',    label: 'Price'      },
  { key: 'rating',   label: 'Rating'     },
];

const Discover = () => {
  const { location, error: locationError, loading: locationLoading } = useLocation();

  const [selectedShop, setSelectedShop] = useState(null);
  const [showFilters, setShowFilters]   = useState(false);
  const [filters, setFilters]           = useState(DEFAULT_FILTERS);
  const [sortBy, setSortBy]             = useState('score');
  const [searchQuery, setSearchQuery]   = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [view, setView]                 = useState('split');

  // All fetched shops across areas — keyed by place_id to deduplicate
  const [shopMap, setShopMap] = useState({});
  // How many list items to show (load more)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Track areas already fetched so we don't re-fetch the same spot
  const fetchedAreas = useRef([]);
  const [areaLoading, setAreaLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const isSearching = debouncedQuery.length > 0;

  // ── Initial nearby fetch (GPS location) ──────────────────────────────────
  const { data: nearbyData, isLoading: nearbyLoading, error: nearbyError } = useQuery({
    queryKey: ['nearby', location?.lat, location?.lng, filters.radius],
    queryFn: () => shopsApi.nearby(location.lat, location.lng, filters.radius),
    enabled: !!location && !isSearching,
    select: (res) => res.data,
  });

  // Seed shopMap from initial fetch
  useEffect(() => {
    if (!nearbyData?.shops) return;
    setShopMap((prev) => {
      const next = { ...prev };
      nearbyData.shops.forEach((s) => { next[s.place_id] = s; });
      return next;
    });
  }, [nearbyData]);

  // ── Search ────────────────────────────────────────────────────────────────
  const { data: searchData, isLoading: searchLoading, error: searchError } = useQuery({
    queryKey: ['search', debouncedQuery, location?.lat, location?.lng],
    queryFn: () => shopsApi.search(debouncedQuery, location?.lat, location?.lng),
    enabled: isSearching,
    select: (res) => res.data.shops,
  });

  // ── onAreaChange: called when map idles after pan/zoom ───────────────────
  const handleAreaChange = useCallback(async ({ lat, lng, radius }) => {
    if (isSearching) return;

    // Skip if we've already fetched very close to this spot
    const alreadyFetched = fetchedAreas.current.some(
      (a) => Math.abs(a.lat - lat) < 0.005 && Math.abs(a.lng - lng) < 0.005
    );
    if (alreadyFetched) return;

    fetchedAreas.current.push({ lat, lng });
    setAreaLoading(true);

    try {
      const res = await shopsApi.nearby(lat, lng, radius);
      const newShops = res.data?.shops ?? [];
      setShopMap((prev) => {
        const next = { ...prev };
        newShops.forEach((s) => { next[s.place_id] = s; });
        return next;
      });
    } catch {
      // fail silently — existing results still show
    } finally {
      setAreaLoading(false);
    }
  }, [isSearching]);

  const isLoading = isSearching ? searchLoading : nearbyLoading;
  const error     = isSearching ? searchError   : nearbyError;

  // ── Build filtered + sorted shop list ────────────────────────────────────
  const allShops = useMemo(() => {
    if (isSearching) return searchData ?? [];
    return Object.values(shopMap);
  }, [isSearching, searchData, shopMap]);

  const shops = useMemo(() => {
    if (!allShops.length) return [];
    let list = [...allShops];

    // 1. FILTER
    if (!isSearching) {
      if (filters.openNow) list = list.filter((s) => s.opening_hours?.open_now);
      if (filters.minRating > 0) list = list.filter((s) => (s.rating || 0) >= filters.minRating);
      if (filters.priceRange.length > 0) {
        list = list.filter((s) => s.price_level == null || filters.priceRange.includes(s.price_level));
      }
    }

    // 2. SORT
    switch (sortBy) {
      case 'distance':
        list.sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
        break;
      case 'price':
        list.sort((a, b) => {
          if (a.price_level == null) return 1;
          if (b.price_level == null) return -1;
          return a.price_level - b.price_level;
        });
        break;
      case 'rating':
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        list.sort((a, b) => (b.brewScore || 0) - (a.brewScore || 0));
        break;
    }

    return list;
  }, [allShops, filters, sortBy, isSearching]);

  // Reset visible count when shops/filters change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filters, sortBy, debouncedQuery]);

  const visibleShops   = shops.slice(0, visibleCount);
  const hasMore        = visibleCount < shops.length;

  const activeFilterCount = [
    filters.openNow,
    filters.minRating > 0,
    filters.priceRange.length > 0,
    filters.vibes.length > 0,
    filters.radius !== DEFAULT_RADIUS,
  ].filter(Boolean).length;

  const sublabel = () => {
    if (isSearching) return `${shops.length} results for "${debouncedQuery}"`;
    const s = { score: 'best match', distance: 'closest first', price: 'cheapest first', rating: 'highest rated' }[sortBy];
    return `${shops.length} shops · ${s}`;
  };

  if (locationLoading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <Loader2 size={32} className="text-espresso-400 animate-spin mx-auto mb-3" />
        <p className="text-sm text-espresso-400">Getting your location…</p>
      </div>
    </div>
  );

  if (locationError) return (
    <div className="flex items-center justify-center h-screen px-6">
      <div className="text-center max-w-xs">
        <MapPin size={40} className="text-espresso-300 mx-auto mb-3" />
        <h2 className="font-display font-semibold text-roast-mid mb-1">Location required</h2>
        <p className="text-sm text-espresso-400">{locationError}</p>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col pt-14 pb-16">

      {/* ── Top bar ── */}
      <div className="bg-white dark:bg-night-surface border-b border-cream-200 dark:border-night-border px-4 pt-3 pb-0 shrink-0">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso-300" />
            <input
              type="text"
              placeholder="Search any coffee shop…"
              className="input pl-9 pr-8 py-2 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-espresso-300 hover:text-espresso-500">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className={`relative p-2.5 rounded-xl border transition-colors shrink-0
              ${activeFilterCount > 0 ? 'bg-espresso-400 border-espresso-400 text-white' : 'bg-white dark:bg-night-surface border-cream-200 dark:border-night-border text-espresso-400 hover:bg-cream-100 dark:hover:bg-night-raised'}`}
          >
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-roast-dark text-white text-[10px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
          <div className="flex rounded-xl border border-cream-200 dark:border-night-border overflow-hidden shrink-0">
            {['split','map','list'].map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-2.5 py-2 text-xs font-medium transition-colors capitalize ${view === v ? 'bg-espresso-400 text-white' : 'text-espresso-400 hover:bg-cream-100 dark:hover:bg-night-raised'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Sort row */}
        {!isSearching && (
          <div className="flex items-center gap-1.5 pb-2.5 overflow-x-auto scrollbar-none">
            <span className="text-xs text-espresso-300 shrink-0 mr-0.5">Sort</span>
            {SORT_OPTIONS.map(({ key, label }) => (
              <button key={key} onClick={() => setSortBy(key)}
                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors
                  ${sortBy === key ? 'bg-espresso-400 text-white border-espresso-400' : 'bg-white dark:bg-night-surface text-espresso-500 dark:text-espresso-300 border-cream-200 dark:border-night-border hover:bg-cream-100 dark:hover:bg-night-raised'}`}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-hidden flex">

        {(view === 'split' || view === 'map') && (
          <div className={`${view === 'split' ? 'w-1/2' : 'flex-1'} relative`}>
            {location && (
              <MapView
                location={location}
                shops={shops}
                selectedShop={selectedShop}
                onShopSelect={setSelectedShop}
                onAreaChange={handleAreaChange}
              />
            )}
            {/* "Searching area…" indicator */}
            {areaLoading && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5
                              bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow border border-cream-200 text-xs text-espresso-500">
                <Loader2 size={12} className="animate-spin" /> Searching this area…
              </div>
            )}
          </div>
        )}

        {(view === 'split' || view === 'list') && (
          <div className={`${view === 'split' ? 'w-1/2' : 'flex-1'} overflow-y-auto bg-cream-50`}>
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 size={24} className="text-espresso-400 animate-spin" />
              </div>
            ) : error ? (
              <div className="p-6 text-center text-sm text-espresso-400">Failed to load shops. Check your API key.</div>
            ) : shops.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-espresso-400">No coffee shops match your filters.</p>
                <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-xs text-espresso-500 mt-2 hover:underline">
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="p-3 space-y-2.5">
                <p className="text-xs text-espresso-400 px-1 pt-1">{sublabel()}</p>

                {visibleShops.map((shop) => (
                  <ShopCard key={shop.place_id} shop={shop} onClick={(s) => setSelectedShop(s)} />
                ))}

                {/* Load more */}
                {hasMore && (
                  <button
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="w-full py-3 text-sm text-espresso-500 font-medium hover:text-espresso-700
                               border border-dashed border-cream-300 rounded-xl hover:border-espresso-300 transition-colors"
                  >
                    Show {Math.min(PAGE_SIZE, shops.length - visibleCount)} more
                  </button>
                )}

                {areaLoading && (
                  <div className="flex items-center justify-center py-3 gap-2 text-xs text-espresso-400">
                    <Loader2 size={14} className="animate-spin" /> Loading shops in this area…
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedShop && (
        <ShopDetail
          placeId={selectedShop.place_id}
          distanceM={selectedShop.distanceM}
          onClose={() => setSelectedShop(null)}
        />
      )}
      {showFilters && <FilterPanel filters={filters} onChange={setFilters} onClose={() => setShowFilters(false)} />}
    </div>
  );
};

export default Discover;
