import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { LocateFixed } from 'lucide-react';

let googleLoaded = false;

// Convert zoom level to a sensible fetch radius in metres
const zoomToRadius = (zoom) => {
  if (zoom >= 16) return 1000;
  if (zoom >= 15) return 1500;
  if (zoom >= 14) return 2500;
  if (zoom >= 13) return 5000;
  if (zoom >= 12) return 10000;
  return 20000;
};

const MapView = ({ location, shops, selectedShop, onShopSelect, onAreaChange }) => {
  const mapRef             = useRef(null);
  const mapInstance        = useRef(null);
  const markersRef         = useRef([]);
  const idleTimerRef       = useRef(null);
  const isProgrammaticMove = useRef(false);   // suppresses idle→onAreaChange for code-driven pans
  const [error, setError]  = useState(null);

  // Load Google Maps once
  useEffect(() => {
    if (!location) return;
    if (googleLoaded && mapInstance.current) return;

    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places', 'marker'],
    });

    loader.load().then((google) => {
      googleLoaded = true;

      const map = new google.maps.Map(mapRef.current, {
        center: location,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        styles: mapStyles,
      });

      mapInstance.current = map;

      // User location pin
      new google.maps.Marker({
        position: location,
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#1a0f08',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: 'You',
        zIndex: 999,
      });

      // Fire onAreaChange when the map stops moving (debounced 600ms).
      // Skip if the pan was triggered by code (shop selection, return-to-location).
      map.addListener('idle', () => {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
          if (isProgrammaticMove.current) {
            isProgrammaticMove.current = false;
            return;
          }
          const center = map.getCenter();
          const zoom   = map.getZoom();
          if (onAreaChange) {
            onAreaChange({
              lat:    center.lat(),
              lng:    center.lng(),
              radius: zoomToRadius(zoom),
            });
          }
        }, 600);
      });
    }).catch(() => setError('Failed to load Google Maps'));
  }, [location]);

  // Update shop markers when shops change
  useEffect(() => {
    if (!mapInstance.current || !window.google) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    shops.forEach((shop) => {
      const pos = shop.geometry?.location;
      if (!pos) return;

      const isSelected = selectedShop?.place_id === shop.place_id;

      const marker = new window.google.maps.Marker({
        position: pos,
        map: mapInstance.current,
        title: shop.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 9 : 6,
          fillColor: isSelected ? '#ffffff' : '#1a0f08',
          fillOpacity: 1,
          strokeColor: isSelected ? '#1a0f08' : '#ffffff',
          strokeWeight: isSelected ? 2.5 : 1.5,
        },
        zIndex: isSelected ? 100 : 1,
      });

      marker.addListener('click', () => {
        const alreadySelected = selectedShop?.place_id === shop.place_id;
        onShopSelect(alreadySelected ? null : shop);
      });
      markersRef.current.push(marker);
    });
  }, [shops, selectedShop]);

  // Pan to selected shop (mark as programmatic so idle doesn't trigger a new area fetch)
  useEffect(() => {
    if (!mapInstance.current || !selectedShop?.geometry?.location) return;
    isProgrammaticMove.current = true;
    mapInstance.current.panTo(selectedShop.geometry.location);
  }, [selectedShop]);

  const returnToLocation = () => {
    if (!mapInstance.current || !location) return;
    isProgrammaticMove.current = true;
    mapInstance.current.panTo(location);
    mapInstance.current.setZoom(15);
  };

  if (error) return (
    <div className="w-full h-full flex items-center justify-center bg-cream-100 text-espresso-400 text-sm">
      {error}
    </div>
  );

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="map-container" />
      <button
        onClick={returnToLocation}
        className="absolute bottom-4 right-4 z-10 p-2.5 bg-white rounded-xl shadow-md border border-cream-200
                   hover:bg-cream-50 active:scale-95 transition-all"
        title="Return to my location"
      >
        <LocateFixed size={18} className="text-espresso-500" />
      </button>
    </div>
  );
};

const mapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#f5ede0' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b3820' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#fdf5ec' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#fff8ef' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#f0d4a0' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#fae8cc' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9dfe8' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#7a9fb0' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

export default MapView;
