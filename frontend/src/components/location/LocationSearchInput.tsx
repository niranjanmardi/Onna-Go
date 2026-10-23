import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Navigation, Loader2, Check, X, AlertCircle } from 'lucide-react';

export interface LocationData {
  destination: string;
  destination_address?: string;
  destination_lat?: number;
  destination_lng?: number;
}

interface LocationSearchInputProps {
  value: LocationData;
  onChange: (data: LocationData) => void;
  required?: boolean;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    county?: string;
  };
}

export const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  value,
  onChange,
  required = false,
}) => {
  const [query, setQuery] = useState(value.destination || '');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(Boolean(value.destination_lat && value.destination_lng));

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setGeoError(null);
    setIsConfirmed(false);

    // If cleared
    if (!val.trim()) {
      setResults([]);
      setShowDropdown(false);
      onChange({
        destination: '',
        destination_address: undefined,
        destination_lat: undefined,
        destination_lng: undefined,
      });
      return;
    }

    // Debounce Nominatim API call (400ms)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      if (val.trim().length < 2) return;
      setIsSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          val.trim()
        )}&addressdetails=1&limit=5`;
        const res = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
          },
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data || []);
          setShowDropdown(true);
        }
      } catch (err) {
        console.warn('Nominatim search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleSelectResult = (item: NominatimResult) => {
    const shortName =
      item.address?.city ||
      item.address?.town ||
      item.address?.village ||
      item.display_name.split(',')[0].trim();

    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);

    setQuery(shortName);
    setIsConfirmed(true);
    setShowDropdown(false);
    setResults([]);

    onChange({
      destination: shortName,
      destination_address: item.display_name,
      destination_lat: isNaN(lat) ? undefined : lat,
      destination_lng: isNaN(lng) ? undefined : lng,
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en',
              },
            }
          );

          if (res.ok) {
            const data: NominatimResult = await res.json();
            const shortName =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.display_name.split(',')[0].trim();

            setQuery(shortName);
            setIsConfirmed(true);
            setShowDropdown(false);
            onChange({
              destination: shortName,
              destination_address: data.display_name,
              destination_lat: lat,
              destination_lng: lng,
            });
          } else {
            setGeoError('Unable to reverse geocode current position.');
          }
        } catch {
          setGeoError('Failed to retrieve location details from OpenStreetMap.');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location permission denied. Search destination manually below.');
        } else {
          setGeoError('Could not determine current location. Please search manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleClear = () => {
    setQuery('');
    setIsConfirmed(false);
    setResults([]);
    setShowDropdown(false);
    onChange({
      destination: '',
      destination_address: undefined,
      destination_lat: undefined,
      destination_lng: undefined,
    });
  };

  return (
    <div ref={containerRef} className="space-y-1.5 relative">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
          Trip Destination {required && '*'}
        </label>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="text-[11px] text-[#16834A] hover:text-[#136F3F] font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
          title="Use GPS location for current destination"
        >
          {isLocating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Navigation className="w-3 h-3" />
          )}
          <span>{isLocating ? 'Detecting...' : 'Use my location'}</span>
        </button>
      </div>

      {geoError && (
        <div className="p-2 rounded-lg bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-[11px] flex items-center gap-1.5 animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{geoError}</span>
        </div>
      )}

      {isConfirmed && value.destination_lat && value.destination_lng ? (
        <div className="p-3 bg-[#DDF5E5]/40 border border-[#C6ECCF] rounded-xl flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#DDF5E5] text-[#16834A] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#171717] truncate">{value.destination}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#DDF5E5] text-[#16834A] rounded">
                  GPS Confirmed
                </span>
              </div>
              {value.destination_address && (
                <p className="text-xs text-[#737373] mt-0.5 line-clamp-1">
                  {value.destination_address}
                </p>
              )}
              <p className="text-[10px] text-[#A3A3A3] font-mono mt-0.5">
                Coords: {value.destination_lat.toFixed(4)}, {value.destination_lng.toFixed(4)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-[#737373] hover:text-[#171717] rounded-md hover:bg-white/80 transition-colors"
            title="Change Location"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-3 top-3 text-[#A3A3A3]" />
            <input
              type="text"
              required={required}
              value={query}
              onChange={handleQueryChange}
              onFocus={() => results.length > 0 && setShowDropdown(true)}
              placeholder="Search destination, city, or route (e.g. Ooty, Manali, Goa)..."
              className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-9 pr-9 py-2.5 text-[#171717] text-sm focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 absolute right-3 top-3 text-[#A3A3A3] animate-spin" />
            )}
            {!isSearching && query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-3 text-[#A3A3A3] hover:text-[#171717]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && results.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#E8E8E5] rounded-xl shadow-lg divide-y divide-[#F4F4F2] max-h-56 overflow-y-auto">
              {results.map((item) => (
                <div
                  key={item.place_id}
                  onClick={() => handleSelectResult(item)}
                  className="p-3 hover:bg-[#FAFAF8] cursor-pointer transition-colors flex items-start gap-2.5 text-left"
                >
                  <MapPin className="w-4 h-4 text-[#16834A] flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#171717] truncate">
                      {item.display_name.split(',')[0]}
                    </p>
                    <p className="text-[11px] text-[#737373] line-clamp-1 mt-0.5">
                      {item.display_name}
                    </p>
                  </div>
                </div>
              ))}
              <div className="p-2 text-[10px] text-center text-[#A3A3A3] bg-[#FAFAF8]">
                Map data © OpenStreetMap contributors
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
