import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

// Same free, unlimited, no-API-key vector tiles used in Map.tsx.
const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

interface LocationPickerProps {
  initialLocation?: { lat: number; lng: number };
  onLocationChange: (location: { lat: number; lng: number }) => void;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface PlaceSeedResult {
  id: string;
  name: string;
  category: string | null;
  lat: number;
  lng: number;
  address: string | null;
}

// A unified shape for rendering, so the dropdown doesn't need to know
// whether a result came from our local Overture-seeded table or from a
// live Nominatim call.
interface SearchResult {
  id: string;
  primary: string;
  secondary: string;
  lat: number;
  lng: number;
}

// Two points within ~120m of each other are treated as the same physical
// place when merging local + Nominatim results, to avoid showing an
// obvious duplicate entry twice.
function isNearDuplicate(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const DEG = 0.0011; // roughly 120m at Maputo's latitude
  return Math.abs(a.lat - b.lat) < DEG && Math.abs(a.lng - b.lng) < DEG;
}

const LocationPicker = ({ initialLocation = { lat: -25.9655, lng: 32.6086 }, onLocationChange }: LocationPickerProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const currentStyleRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);

  // Always calls the latest onLocationChange without forcing the map-init
  // effect below to depend on (and re-run for) a new function identity.
  const onLocationChangeRef = useRef(onLocationChange);
  onLocationChangeRef.current = onLocationChange;

  const updateLocation = useCallback((lat: number, lng: number, opts: { recenter?: boolean } = {}) => {
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    }
    if (opts.recenter && mapRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: 15 });
    }
    onLocationChangeRef.current({ lat, lng });
  }, []);

  // Create the map + draggable marker once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialStyle = MAP_STYLES[theme];
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: initialStyle,
      center: [initialLocation.lng, initialLocation.lat],
      zoom: 14,
      attributionControl: {},
    });
    currentStyleRef.current = initialStyle;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    const marker = new maplibregl.Marker({ color: '#C1502E', draggable: true })
      .setLngLat([initialLocation.lng, initialLocation.lat])
      .addTo(map);

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLngLat();
      updateLocation(lat, lng);
    });

    map.on('click', (e) => {
      updateLocation(e.lngLat.lat, e.lngLat.lng);
    });

    map.on('load', () => setMapReady(true));

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Runs once on mount — initialLocation only seeds the starting marker
    // position, matching the previous Google Maps implementation's behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap the vector-tile style when the site's light/dark theme changes.
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const nextStyle = MAP_STYLES[theme];
    if (currentStyleRef.current === nextStyle) return;
    currentStyleRef.current = nextStyle;
    mapRef.current.setStyle(nextStyle);
  }, [theme, mapReady]);

  // Debounced free-text search combining two free, no-API-key sources:
  //  - /api/places/search: our own locally-imported Overture Places slice
  //    (instant, richer business-name coverage, see the import script)
  //  - Nominatim: OpenStreetMap's live geocoder, catches anything newer or
  //    outside what was in the last Overture import
  // Local results are shown first since they're curated business data;
  // near-duplicate Nominatim hits (same spot, different source) are
  // dropped rather than shown twice.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 3) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSearching(true);
      try {
        const localPromise = fetch(`/api/places/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
          .then((res) => (res.ok ? (res.json() as Promise<PlaceSeedResult[]>) : []))
          .catch(() => [] as PlaceSeedResult[]);

        // countrycodes restricts results to Mozambique (avoids random
        // same-name matches in Brazil/Portugal outranking the local spot);
        // viewbox soft-biases ranking toward greater Maputo without
        // excluding the rest of the country.
        const nominatimParams = new URLSearchParams({
          format: 'json',
          limit: '6',
          q: query,
          countrycodes: 'mz',
          viewbox: '32.35,-25.75,32.75,-26.10',
        });
        const nominatimPromise = fetch(`https://nominatim.openstreetmap.org/search?${nominatimParams.toString()}`, {
          signal: controller.signal,
        })
          .then((res) => (res.ok ? (res.json() as Promise<NominatimResult[]>) : []))
          .catch(() => [] as NominatimResult[]);

        const [localRows, nominatimRows] = await Promise.all([localPromise, nominatimPromise]);

        const localResults: SearchResult[] = localRows.map((row) => ({
          id: row.id,
          primary: row.name,
          secondary: row.address || row.category || '',
          lat: row.lat,
          lng: row.lng,
        }));

        const nominatimResults: SearchResult[] = nominatimRows
          .map((row) => {
            const [primary, ...rest] = row.display_name.split(',');
            return {
              id: `nominatim:${row.place_id}`,
              primary: primary.trim(),
              secondary: rest.join(',').trim(),
              lat: parseFloat(row.lat),
              lng: parseFloat(row.lon),
            };
          })
          .filter((candidate) => !localResults.some((local) => isNearDuplicate(local, candidate)));

        setResults([...localResults, ...nominatimResults]);
        setShowResults(true);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error searching location:', err);
        }
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelectResult = (result: SearchResult) => {
    updateLocation(result.lat, result.lng, { recenter: true });
    setQuery(result.primary);
    setResults([]);
    setShowResults(false);
  };

  // `getCurrentPosition` with enableHighAccuracy hands back whatever it has
  // — often a fast, low-accuracy Wi-Fi/IP-based guess — and a *separate*,
  // slower GPS/Wi-Fi-triangulated fix may never arrive before the timeout.
  // `watchPosition` instead keeps listening and lets us keep the most
  // accurate reading it manages to get within our own time budget, updating
  // the pin progressively instead of gambling on a single shot.
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert(t('common.geolocation_not_supported'));
      return;
    }

    setIsGettingLocation(true);

    const GOOD_ENOUGH_ACCURACY_METERS = 100;
    const MAX_WAIT_MS = 20000;

    let bestAccuracy = Infinity;
    let gotAnyFix = false;
    let settled = false;
    let watchId: number;

    const finish = (error?: GeolocationPositionError) => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      setIsGettingLocation(false);

      // Only alert if we never managed to place the pin at all — if we got
      // at least one fix, the pin is already showing our best guess and an
      // error popup on top of that would just be noise.
      if (!gotAnyFix) {
        let errorMessage = t('common.location_error');
        if (error) {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = t('common.location_permission_denied');
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = t('common.location_unavailable');
              break;
            case error.TIMEOUT:
              errorMessage = t('common.location_timeout');
              break;
          }
        }
        alert(errorMessage);
      }
    };

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        gotAnyFix = true;
        // Only move the pin when this reading beats the best one so far —
        // avoids the marker jittering backwards to a worse fix.
        if (pos.coords.accuracy <= bestAccuracy) {
          bestAccuracy = pos.coords.accuracy;
          updateLocation(pos.coords.latitude, pos.coords.longitude, { recenter: true });
        }
        if (bestAccuracy <= GOOD_ENOUGH_ACCURACY_METERS) {
          finish();
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        finish(error);
      },
      { enableHighAccuracy: true, timeout: MAX_WAIT_MS, maximumAge: 0 }
    );

    // Hard ceiling regardless of what the browser's own timeout does —
    // settle for the best fix we got rather than waiting indefinitely.
    setTimeout(() => finish(), MAX_WAIT_MS);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
            placeholder={t('placeholder.search_location')}
            className="w-full px-3 py-2 border border-sand-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-800 text-ink dark:text-sand-100 focus:ring-primary focus:border-primary"
          />
          {showResults && results.length > 0 && (
            <div className="absolute z-[1000] top-full left-0 right-0 mt-1 bg-white dark:bg-ink-800 border border-sand-300 dark:border-ink-700 rounded-lg shadow-lg max-h-56 overflow-y-auto">
              {results.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectResult(result)}
                  className="block w-full text-left px-3 py-2 hover:bg-sand-100 dark:hover:bg-ink-700 border-b border-sand-100 dark:border-ink-700 last:border-b-0"
                >
                  <div className="text-sm font-medium text-ink dark:text-sand-100 truncate">{result.primary}</div>
                  {result.secondary && (
                    <div className="text-xs text-ink/50 dark:text-sand-300/60 truncate">{result.secondary}</div>
                  )}
                </button>
              ))}
            </div>
          )}
          {showResults && results.length === 0 && !searching && query.trim().length >= 3 && (
            <div className="absolute z-[1000] top-full left-0 right-0 mt-1 bg-white dark:bg-ink-800 border border-sand-300 dark:border-ink-700 rounded-lg shadow-lg px-3 py-2 text-sm text-ink/60 dark:text-sand-300/70">
              {t('location.no_results')}
            </div>
          )}
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink/40 dark:text-sand-300/50">…</div>
          )}
        </div>
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
          className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg font-medium hover:bg-primary-200 transition disabled:opacity-50"
          title={t('location.use_current')}
        >
          {isGettingLocation ? '...' : '📍'}
        </button>
      </div>

      <div
        ref={containerRef}
        className="w-full h-64 rounded-lg overflow-hidden border border-sand-300 dark:border-ink-700"
      />

      {/* OpenStreetMap only finds places that have already been mapped there
          — plenty of smaller Maputo spots aren't yet, so this fallback needs
          to be visible, not just implied by silence on a failed search. */}
      <p className="text-xs text-ink/50 dark:text-sand-300/60">{t('location.search_hint')}</p>
    </div>
  );
};

export default LocationPicker;
