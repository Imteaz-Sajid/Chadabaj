import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from './Navbar';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const StatsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [areaStats, setAreaStats] = useState([]);
  const [districtStats, setDistrictStats] = useState([]);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  const [geoJsonData, setGeoJsonData] = useState(null);

  useEffect(() => {
    fetchHeatmapData();
    fetchGeoJsonData();
    // eslint-disable-next-line
  }, []);

  const fetchGeoJsonData = async () => {
    try {
      const response = await fetch('/bangladeshDistricts.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('GeoJSON loaded successfully:', data.features?.length, 'districts');
      setGeoJsonData(data);
    } catch (err) {
      console.error('Failed to load GeoJSON data:', err);
    }
  };

  const fetchHeatmapData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }

      const response = await axios.get('http://localhost:5000/api/posts/heatmap', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setAreaStats(response.data.areaStats);
        setDistrictStats(response.data.districtStats || []);
        setPosts(response.data.posts);
        console.log('📊 Received district stats from API:', response.data.districtStats);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const top5Areas = areaStats.slice(0, 5);

  const getBarColor = (count) => {
    if (count > 10) return '#ef4444';
    if (count < 5) return '#fbbf24';
    return '#3b82f6';
  };

  const getDensityColor = (count) => {
    if (count >= 10) return '#7f1d1d';
    if (count >= 7) return '#991b1b';
    if (count >= 5) return '#dc2626';
    if (count >= 3) return '#f97316';
    if (count >= 2) return '#fbbf24';
    if (count >= 1) return '#86efac';
    return '#22c55e'; // Green for no reports (safe)
  };

  // Group posts by district and count crimes - prioritize post.district field
  const districtCrimeData = useMemo(() => {
    console.log('Processing posts for district data:', posts.length, 'posts');
    
    // First, use districtStats from API if available (most accurate)
    if (districtStats && districtStats.length > 0) {
      const data = {};
      districtStats.forEach(stat => {
        if (stat.district) {
          const normalized = stat.district.toLowerCase().trim()
            .replace(/district$/i, '')
            .replace(/zila$/i, '')
            .trim();
          data[normalized] = stat.count;
        }
      });
      console.log('Using districtStats from API:', data);
      return data;
    }
    
    // Fallback: Extract from posts
    const data = posts.reduce((acc, post) => {
      // Priority: 1. post.district, 2. location.district, 3. location.upazila, 4. area
      let district = post.district ||
                     post.location?.district || 
                     post.location?.zila ||
                     '';
      
      // If no district found, try to extract from address
      if (!district && post.location?.address) {
        const addressParts = post.location.address.split(',').map(p => p.trim());
        if (addressParts.length >= 3) {
          district = addressParts[addressParts.length - 3] || '';
        }
      }
      
      // Skip if no district found (don't use area as fallback for district)
      if (!district) {
        return acc;
      }
      
      const normalizedDistrict = district.toLowerCase().trim()
        .replace(/district$/i, '')
        .replace(/zila$/i, '')
        .trim();
      
      if (!acc[normalizedDistrict]) {
        acc[normalizedDistrict] = 0;
      }
      acc[normalizedDistrict]++;
      return acc;
    }, {});
    
    console.log('District crime data from posts:', data);
    return data;
  }, [posts, districtStats]);

  // Get crime count for a district (handles name variations)
  const getCrimeCountForDistrict = useCallback((districtName) => {
    if (!districtName) return 0;
    const normalized = districtName.toLowerCase().trim()
      .replace(/district$/i, '')
      .replace(/zila$/i, '')
      .replace("'s", 's')
      .replace(/'/g, '')
      .trim();
    
    // Direct match
    if (districtCrimeData[normalized] !== undefined) {
      return districtCrimeData[normalized];
    }
    
    // Try matching with common variations
    for (const [key, count] of Object.entries(districtCrimeData)) {
      const keyNormalized = key.replace("'s", 's').replace(/'/g, '');
      // Exact match after normalization
      if (keyNormalized === normalized) {
        return count;
      }
      // Partial match (for variations like "Cox's Bazar" vs "Coxs Bazar")
      if (key.includes(normalized) || normalized.includes(key) ||
          keyNormalized.includes(normalized) || normalized.includes(keyNormalized)) {
        return count;
      }
    }
    
    return 0;
  }, [districtCrimeData]);

  // Style function for GeoJSON features
  const getDistrictStyle = useCallback((feature) => {
    const districtName = feature.properties?.ADM2_EN;
    const count = getCrimeCountForDistrict(districtName);
    
    return {
      fillColor: getDensityColor(count),
      weight: 2,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.7
    };
  }, [getCrimeCountForDistrict]);

  // Highlight feature on hover
  const highlightFeature = useCallback((e) => {
    const layer = e.target;
    layer.setStyle({
      weight: 4,
      color: '#666',
      dashArray: '',
      fillOpacity: 0.9
    });
    layer.bringToFront();
  }, []);

  // Reset highlight on mouseout
  const resetHighlight = useCallback((e, originalStyle) => {
    e.target.setStyle(originalStyle);
  }, []);

  // Bind tooltip and events to each feature
  const onEachFeature = useCallback((feature, layer) => {
    const districtName = feature.properties?.ADM2_EN || 'Unknown';
    const divisionName = feature.properties?.ADM1_EN || '';
    const count = getCrimeCountForDistrict(districtName);
    
    const style = {
      fillColor: getDensityColor(count),
      weight: 2,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.7
    };

    const riskLevel = count >= 10 ? 'CRITICAL ZONE' :
      count >= 7 ? 'VERY HIGH RISK' :
      count >= 5 ? 'HIGH RISK' :
      count >= 3 ? 'MEDIUM RISK' :
      count >= 2 ? 'LOW RISK' :
      count >= 1 ? 'VERY LOW RISK' : 'SAFE ZONE';

    // Bind tooltip for hover (shows on mouseover)
    layer.bindTooltip(`
      <div style="text-align: center; min-width: 140px; padding: 8px;">
        <h3 style="font-weight: bold; font-size: 14px; margin: 0 0 4px 0; color: #1f2937;">${districtName}</h3>
        <p style="color: #6b7280; font-size: 11px; margin: 0 0 8px 0;">${divisionName} Division</p>
        <p style="font-size: 24px; font-weight: bold; margin: 0; color: ${getDensityColor(count)};">${count}</p>
        <p style="font-size: 11px; color: #6b7280; margin: 4px 0 0 0;">crime reports</p>
        <p style="font-size: 10px; font-weight: 600; margin-top: 6px; padding: 3px 8px; border-radius: 4px; background-color: ${getDensityColor(count)}20; color: ${getDensityColor(count)};">
          ${riskLevel}
        </p>
      </div>
    `, {
      sticky: true,
      direction: 'auto',
      className: 'district-tooltip'
    });

    layer.on({
      mouseover: (e) => {
        highlightFeature(e);
      },
      mouseout: (e) => {
        resetHighlight(e, style);
      }
    });
  }, [getCrimeCountForDistrict, highlightFeature, resetHighlight]);

  // Center of Bangladesh (approximate)
  const bangladeshCenter = [23.8103, 90.4125];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <Navbar />
        <div className="flex flex-col justify-center items-center h-[80vh]">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-200 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
          <p className="mt-6 text-gray-600 font-medium text-lg">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3">
            <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span className="font-medium">Error: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Crime Statistics</h1>
              <p className="text-gray-500">Visual analysis of crime reports across Bangladesh</p>
            </div>
          </div>
        </div>

        {/* Statistics Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Reports</p>
                <h3 className="text-4xl font-bold text-gray-900 mt-1">{posts.length}</h3>
              </div>
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                All time
              </span>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Areas Affected</p>
                <h3 className="text-4xl font-bold text-gray-900 mt-1">{areaStats.length}</h3>
              </div>
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                Unique locations
              </span>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">High Risk Zones</p>
                <h3 className="text-4xl font-bold text-gray-900 mt-1">
                  {areaStats.filter(stat => stat.count >= 10).length}
                </h3>
              </div>
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                ≥10 reports
              </span>
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Top 5 High Crime Areas</h2>
              <p className="text-sm text-gray-500">Areas with the highest number of reports</p>
            </div>
          </div>
          
          {top5Areas.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={top5Areas} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="area" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    label={{ value: 'Reports', angle: -90, position: 'insideLeft', fill: '#64748b' }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: 'none', 
                      borderRadius: '12px', 
                      boxShadow: '0 10px 40px rgba(0,0,0,0.1)' 
                    }}
                  />
                  <Bar dataKey="count" name="Number of Reports" radius={[6, 6, 0, 0]}>
                    {top5Areas.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.count)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              
              <div className="flex justify-center gap-6 mt-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-600">High Risk (&gt;10)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Medium (5-10)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
                  <span className="text-gray-600">Low (&lt;5)</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-gray-500">No data available for chart</p>
            </div>
          )}
        </div>

        {/* Crime Density Choropleth Map */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Crime Density Map</h2>
              <p className="text-sm text-gray-500">Interactive choropleth showing crime distribution across 64 districts</p>
            </div>
          </div>
          
          <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: '550px' }}>
            <MapContainer 
              center={bangladeshCenter} 
              zoom={7} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {geoJsonData && geoJsonData.features && (
                <GeoJSON 
                  key={`geojson-${posts.length}`}
                  data={geoJsonData} 
                  style={getDistrictStyle}
                  onEachFeature={onEachFeature}
                />
              )}
            </MapContainer>
            {!geoJsonData && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-500">Loading district boundaries...</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Map Legend */}
          <div className="mt-5 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm font-semibold text-gray-700 mb-3">Crime Density Legend</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#7f1d1d' }}></div>
                <span className="text-gray-600">≥10 Critical</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#991b1b' }}></div>
                <span className="text-gray-600">7-9 Very High</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#dc2626' }}></div>
                <span className="text-gray-600">5-6 High</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }}></div>
                <span className="text-gray-600">3-4 Medium</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fbbf24' }}></div>
                <span className="text-gray-600">2 Low</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#86efac' }}></div>
                <span className="text-gray-600">1 Very Low</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
                <span className="text-gray-600">Safe</span>
              </div>
            </div>
          </div>
        </div>

        {/* Area-wise Crime Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Area-wise Statistics</h2>
              <p className="text-sm text-gray-500">Crime report breakdown by area</p>
            </div>
          </div>

          {areaStats.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {areaStats.map((stat, index) => {
                const riskLevel = stat.count >= 10 ? 'Critical' :
                                  stat.count >= 7 ? 'Very High' :
                                  stat.count >= 5 ? 'High' :
                                  stat.count >= 3 ? 'Medium' :
                                  stat.count >= 2 ? 'Low' : 'Very Low';
                
                return (
                  <div 
                    key={index} 
                    className="group relative bg-gradient-to-br from-white to-gray-50 p-4 rounded-xl border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{stat.area}</h3>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-bold" style={{ color: getDensityColor(stat.count) }}>
                            {stat.count}
                          </span>
                          <span className="text-sm text-gray-500">reports</span>
                        </div>
                      </div>
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ backgroundColor: `${getDensityColor(stat.count)}20` }}
                      >
                        {stat.count >= 10 ? '🔴' :
                         stat.count >= 5 ? '🟠' :
                         stat.count >= 3 ? '🟡' :
                         '🟢'}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span 
                        className="text-xs font-semibold px-2 py-1 rounded-md"
                        style={{ 
                          backgroundColor: `${getDensityColor(stat.count)}15`,
                          color: getDensityColor(stat.count)
                        }}
                      >
                        {riskLevel}
                      </span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${Math.min(100, stat.count * 10)}%`,
                            backgroundColor: getDensityColor(stat.count)
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
              <p className="text-gray-500">No area statistics available</p>
            </div>
          )}
        </div>

        {/* Risk Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">High Risk Areas</h2>
                <p className="text-sm text-gray-500">Areas with ≥10 reports</p>
              </div>
            </div>
            
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {areaStats.filter(stat => stat.count >= 10).length > 0 ? (
                areaStats.filter(stat => stat.count >= 10).map((stat, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 border-l-4 border-red-500 rounded-lg">
                    <span className="font-medium text-gray-800">{stat.area}</span>
                    <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">{stat.count}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">No high risk areas</p>
                  <p className="text-gray-400 text-sm">Great news for the community!</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Safe Areas</h2>
                <p className="text-sm text-gray-500">Areas with &lt;3 reports</p>
              </div>
            </div>
            
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {areaStats.filter(stat => stat.count < 3).length > 0 ? (
                areaStats.filter(stat => stat.count < 3).map((stat, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded-lg">
                    <span className="font-medium text-gray-800">{stat.area}</span>
                    <span className="bg-emerald-500 text-white text-sm font-bold px-3 py-1 rounded-full">{stat.count}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">No safe areas identified</p>
                  <p className="text-gray-400 text-sm">All areas have 3+ reports</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
