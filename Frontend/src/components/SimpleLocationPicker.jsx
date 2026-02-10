import React, { useState } from 'react';

const SimpleLocationPicker = ({ onLocationSelect, initialLat = '', initialLng = '' }) => {
  const [latitude, setLatitude] = useState(initialLat);
  const [longitude, setLongitude] = useState(initialLng);

  const handleLatChange = (e) => {
    const lat = e.target.value;
    setLatitude(lat);
    if (lat && longitude) {
      onLocationSelect({ lat: parseFloat(lat), lng: parseFloat(longitude) });
    }
  };

  const handleLngChange = (e) => {
    const lng = e.target.value;
    setLongitude(lng);
    if (latitude && lng) {
      onLocationSelect({ lat: parseFloat(latitude), lng: parseFloat(lng) });
    }
  };

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLatitude(lat.toString());
          setLongitude(lng.toString());
          onLocationSelect({ lat, lng });
        },
        (error) => {
          console.error('Error getting current location:', error);
          alert('Unable to get your current location. Please enable location access.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Latitude
          </label>
          <input
            type="number"
            step="any"
            placeholder="23.8103"
            value={latitude}
            onChange={handleLatChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Longitude
          </label>
          <input
            type="number"
            step="any"
            placeholder="90.4125"
            value={longitude}
            onChange={handleLngChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <button
        type="button"
        onClick={useCurrentLocation}
        className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Use My Current Location
      </button>
      
      {latitude && longitude && (
        <div className="text-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <p className="mb-2">📍 Coordinates: {parseFloat(latitude).toFixed(6)}, {parseFloat(longitude).toFixed(6)}</p>
          <a 
            href={`https://www.openstreetmap.org/#map=15/${latitude}/${longitude}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            View on OpenStreetMap
          </a>
        </div>
      )}
      
      <div className="text-xs text-gray-500">
        <p className="font-medium mb-1">How to get coordinates:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Click "Use My Current Location" to auto-fill</li>
          <li>Or visit <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">OpenStreetMap</a>, find your location, right-click and copy coordinates</li>
          <li>Format: Latitude (23.8103) and Longitude (90.4125) for Dhaka</li>
        </ul>
      </div>
    </div>
  );
};

export default SimpleLocationPicker;