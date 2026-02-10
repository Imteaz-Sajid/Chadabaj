import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
try {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
} catch (error) {
  console.warn('Leaflet icon fix failed:', error);
}

// Component to handle map click events using useMapEvents
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Component to recenter map when position changes
const MapRecenter = ({ position, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(position, zoom);
  }, [map, position, zoom]);
  return null;
};

// Search Component with Nominatim API
const SearchBar = ({ onLocationSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 3) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=BD`,
        {
          headers: {
            'Accept-Language': 'en',
          }
        }
      );
      const data = await response.json();
      setResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSelectResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const address = result.display_name;
    
    onLocationSelect({ lat, lng, address });
    setQuery(result.display_name.split(',')[0]); // Show short name
    setResults([]);
    setShowResults(false);
  };

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(query);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [query, handleSearch]);

  return (
    <div className="absolute top-3 left-3 right-3 z-[1000]">
      <div className="relative">
        <div className="flex items-center bg-white rounded-lg shadow-lg border border-gray-200">
          <span className="pl-3 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search for a location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            className="w-full px-3 py-3 border-0 rounded-lg focus:outline-none focus:ring-0 text-gray-700"
          />
          {isSearching && (
            <div className="pr-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
        
        {showResults && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg max-h-48 overflow-y-auto shadow-xl">
            {results.map((result, index) => (
              <div
                key={index}
                onClick={() => handleSelectResult(result)}
                className="p-3 cursor-pointer hover:bg-blue-50 border-b last:border-b-0 text-sm text-gray-700 flex items-start gap-2"
              >
                <span className="text-red-500 mt-0.5">📍</span>
                <span>{result.display_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const LocationPicker = ({ onLocationSelect, initialLat = 23.8103, initialLng = 90.4125 }) => {
  const [position, setPosition] = useState([
    parseFloat(initialLat) || 23.8103, 
    parseFloat(initialLng) || 90.4125
  ]);
  const [address, setAddress] = useState('');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [zoom, setZoom] = useState(13);

  // Reverse Geocoding function
  const reverseGeocode = useCallback(async (lat, lng) => {
    setIsReverseGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          }
        }
      );
      const data = await response.json();
      if (data.display_name) {
        setAddress(data.display_name);
        return data.display_name;
      }
      return '';
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return '';
    } finally {
      setIsReverseGeocoding(false);
    }
  }, []);

  // Handle location update from any source (search, click, drag)
  const handleLocationUpdate = useCallback(async (lat, lng, providedAddress = null) => {
    const newPos = [lat, lng];
    setPosition(newPos);
    setZoom(16); // Zoom in when location is selected
    
    let finalAddress = providedAddress;
    if (!providedAddress) {
      finalAddress = await reverseGeocode(lat, lng);
    } else {
      setAddress(providedAddress);
    }
    
    // Call the parent callback with location data
    onLocationSelect({
      lat,
      lng,
      address: finalAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    });
  }, [onLocationSelect, reverseGeocode]);

  // Handle search result selection
  const handleSearchSelect = ({ lat, lng, address }) => {
    handleLocationUpdate(lat, lng, address);
  };

  // Handle map click
  const handleMapClick = (lat, lng) => {
    handleLocationUpdate(lat, lng);
  };

  // Handle marker drag end
  const handleMarkerDragEnd = (e) => {
    const { lat, lng } = e.target.getLatLng();
    handleLocationUpdate(lat, lng);
  };

  // Use current location
  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (geoPosition) => {
          const lat = geoPosition.coords.latitude;
          const lng = geoPosition.coords.longitude;
          handleLocationUpdate(lat, lng);
        },
        (error) => {
          console.error('Error getting current location:', error);
          alert('Unable to get your current location. Please enable location access.');
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  return (
    <div className="w-full">
      {/* Map Container with Search Bar */}
      <div className="relative rounded-lg overflow-hidden shadow-lg" style={{ height: '400px' }}>
        <MapContainer
          center={position}
          zoom={zoom}
          className="leaflet-container"
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Map click handler */}
          <MapClickHandler onMapClick={handleMapClick} />
          
          {/* Recenter map when position changes */}
          <MapRecenter position={position} zoom={zoom} />
          
          {/* Draggable Marker */}
          <Marker 
            position={position} 
            draggable={true}
            eventHandlers={{
              dragend: handleMarkerDragEnd
            }}
          />
        </MapContainer>

        {/* Search Bar Overlay */}
        <SearchBar onLocationSelect={handleSearchSelect} />
      </div>
      
      {/* Controls and Info */}
      <div className="mt-4 space-y-3">
        {/* Current Location Button */}
        <button
          type="button"
          onClick={useCurrentLocation}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Use My Current Location
        </button>
        
        {/* Selected Location Info */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-start gap-2">
            <span className="text-red-500 text-xl">📍</span>
            <div className="flex-1">
              <p className="font-medium text-gray-800">Selected Location</p>
              {isReverseGeocoding ? (
                <p className="text-sm text-gray-500">Getting address...</p>
              ) : address ? (
                <p className="text-sm text-gray-600 mt-1">{address}</p>
              ) : (
                <p className="text-sm text-gray-500 mt-1">Click on the map or search to select a location</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Coordinates: {position[0].toFixed(6)}, {position[1].toFixed(6)}
              </p>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <p className="text-xs text-gray-500 text-center">
          💡 Tip: Search for a place, click on the map, or drag the pin to select a location
        </p>
      </div>
    </div>
  );
};

export default LocationPicker;