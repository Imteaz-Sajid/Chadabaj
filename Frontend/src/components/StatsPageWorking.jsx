import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import Navbar from './Navbar';

const StatsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [areaStats, setAreaStats] = useState([]);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHeatmapData();
    // eslint-disable-next-line
  }, []);

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
        setPosts(response.data.posts);
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
    return '#86efac';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="flex justify-center items-center h-screen">
          <div className="text-2xl font-bold">Loading statistics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-100 border-2 border-red-400 text-red-700 px-6 py-4 rounded">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">📊 Crime Statistics Dashboard</h1>
          <p className="text-lg text-gray-600">Visual analysis of crime reports across different areas</p>
        </div>

        {/* Statistics Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center border-t-4 border-blue-500">
            <h3 className="text-5xl font-bold text-blue-600 mb-2">{posts.length}</h3>
            <p className="text-gray-600 font-semibold">Total Crime Reports</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center border-t-4 border-green-500">
            <h3 className="text-5xl font-bold text-green-600 mb-2">{areaStats.length}</h3>
            <p className="text-gray-600 font-semibold">Areas Affected</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center border-t-4 border-red-500">
            <h3 className="text-5xl font-bold text-red-600 mb-2">
              {areaStats.filter(stat => stat.count >= 10).length}
            </h3>
            <p className="text-gray-600 font-semibold">High Risk Areas</p>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 Top 5 High Crime Areas</h2>
          
          {top5Areas.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={top5Areas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="area" angle={-45} textAnchor="end" height={100} />
                  <YAxis label={{ value: 'Crime Count', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Number of Reports">
                    {top5Areas.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.count)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>High Risk (&gt; 10 reports)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>Medium Risk (5-10 reports)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                  <span>Low Risk (&lt; 5 reports)</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center py-8 text-gray-500">No data available for chart</p>
          )}
        </div>

        {/* Crime Density Heat Grid */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🗺️ Crime Density Visualization</h2>
          
          <div className="mb-4">
            <h3 className="font-semibold text-gray-700 mb-2">Density Legend:</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: '#7f1d1d' }}></div>
                <span>≥10 Critical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: '#991b1b' }}></div>
                <span>7-9 Very High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: '#dc2626' }}></div>
                <span>5-6 High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: '#f97316' }}></div>
                <span>3-4 Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: '#fbbf24' }}></div>
                <span>2 Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: '#86efac' }}></div>
                <span>1 Very Low</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {areaStats.map((stat, index) => (
              <div 
                key={index} 
                className="p-4 rounded-lg border-2 transition-all hover:shadow-xl hover:scale-105 cursor-pointer"
                style={{ 
                  borderColor: getDensityColor(stat.count),
                  backgroundColor: `${getDensityColor(stat.count)}15`
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{stat.area}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="text-3xl font-bold" style={{ color: getDensityColor(stat.count) }}>
                        {stat.count}
                      </span>
                      <span className="ml-2">reports</span>
                    </p>
                  </div>
                  <div className="text-3xl">
                    {stat.count >= 10 ? '🔴' :
                     stat.count >= 5 ? '🟠' :
                     stat.count >= 3 ? '🟡' :
                     '🟢'}
                  </div>
                </div>
                <div className="mt-2 text-xs font-semibold" style={{ color: getDensityColor(stat.count) }}>
                  {stat.count >= 10 ? 'CRITICAL ZONE' :
                   stat.count >= 7 ? 'VERY HIGH RISK' :
                   stat.count >= 5 ? 'HIGH RISK' :
                   stat.count >= 3 ? 'MEDIUM RISK' :
                   stat.count >= 2 ? 'LOW RISK' :
                   'VERY LOW RISK'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">⚠️ High Risk Areas</h2>
            <div className="space-y-3">
              {areaStats.filter(stat => stat.count >= 10).length > 0 ? (
                areaStats.filter(stat => stat.count >= 10).map((stat, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-red-50 border-l-4 border-red-500 rounded">
                    <span className="font-semibold text-gray-800">{stat.area}</span>
                    <span className="text-red-600 font-bold">{stat.count} reports</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No high risk areas</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">✅ Safe Areas</h2>
            <div className="space-y-3">
              {areaStats.filter(stat => stat.count < 3).length > 0 ? (
                areaStats.filter(stat => stat.count < 3).map((stat, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-green-50 border-l-4 border-green-500 rounded">
                    <span className="font-semibold text-gray-800">{stat.area}</span>
                    <span className="text-green-600 font-bold">{stat.count} reports</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No safe areas identified</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
