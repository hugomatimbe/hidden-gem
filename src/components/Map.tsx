// src/components/Map.tsx
//
// Provider decision (kept here so it isn't lost between sessions): we're on
// MapLibre + OpenFreeMap deliberately, not just because it's free. Google
// Maps was ruled out for now for two reasons:
//   1. Billing risk — Dynamic Maps gives 10,000 free loads/month, then
//      $7.00/1,000 (no hard spending cap without manually setting a quota
//      limit in Cloud Console under Google Maps Platform > Quotas).
//   2. A hybrid (Google Places search + this free map) isn't actually
//      allowed — Google Maps Platform Service Specific Terms §10.2: "Customer
//      must not use Google Maps Content from the Places API in conjunction
//      with a non-Google map." Places results require either a Google Map
//      alongside them, or no map at all.
// If this ever needs to move to Google Maps (better search/POI coverage is
// the main reason it would), both Map.tsx and LocationPicker.tsx would need
// rewriting back to the Google Maps JavaScript API, NEXT_PUBLIC_GOOGLE_MAPS_
// API_KEY restored in .env.local, billing enabled, and a quota cap set
// before going live — see the two points above for why the cap matters.
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useTheme } from '../contexts/ThemeContext';

// OpenFreeMap hosts these vector-tile styles for free, unlimited use — no
// API key, no billing, no rate limits (https://openfreemap.org). Positron is
// a clean light basemap; the dark variant matches the site's dark mode.
const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

interface MapProps {
  gems: any[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onGemClick?: (gem: any) => void;
}

const Map = ({ gems, center = { lat: -25.9655, lng: 32.6086 }, zoom = 12, onGemClick }: MapProps) => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const currentStyleRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Create the map once. Center/zoom/theme changes are handled by the
  // effects below instead of tearing down and recreating the map.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialStyle = MAP_STYLES[theme];
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: initialStyle,
      center: [center.lng, center.lat],
      zoom,
      attributionControl: {},
    });
    currentStyleRef.current = initialStyle;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => setMapReady(true));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap the vector-tile style when the site's light/dark theme changes.
  // Markers are separate DOM overlays, so they survive a style swap.
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const nextStyle = MAP_STYLES[theme];
    if (currentStyleRef.current === nextStyle) return;
    currentStyleRef.current = nextStyle;
    mapRef.current.setStyle(nextStyle);
  }, [theme, mapReady]);

  // Keep markers in sync with the gems list.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const validGems = gems.filter(
      (gem) => gem.location && typeof gem.location.lat === 'number' && typeof gem.location.lng === 'number'
    );

    markersRef.current = validGems.map((gem) => {
      const marker = new maplibregl.Marker({ color: '#C1502E' })
        .setLngLat([gem.location.lng, gem.location.lat])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setText(gem.title))
        .addTo(map);

      if (onGemClick) {
        const el = marker.getElement();
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onGemClick(gem);
        });
      }

      return marker;
    });

    if (validGems.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      validGems.forEach((gem) => bounds.extend([gem.location.lng, gem.location.lat]));
      map.fitBounds(bounds, { padding: 40, maxZoom: 16, duration: 0 });
    } else {
      map.setCenter([center.lng, center.lat]);
      map.setZoom(zoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gems, mapReady, onGemClick]);

  return (
    <div
      ref={containerRef}
      className="map-container w-full rounded-lg overflow-hidden"
      style={{ height: '100%', width: '100%' }}
    />
  );
};

export default Map;
