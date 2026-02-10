import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PostCard from './PostCard';
import Navbar from './Navbar';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [areaFilter, setAreaFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Please login to view posts');
        return;
      }

      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (areaFilter) {
        params.append('area', areaFilter);
      }
      if (districtFilter) {
        params.append('district', districtFilter);
      }

      const response = await axios.get(
        `http://localhost:5000/api/posts?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setPosts(response.data.posts);
        setTotalPages(response.data.pagination.totalPages);
        setError('');
      }
    } catch (err) {
      console.error('Fetch posts error:', err);
      setError(err.response?.data?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [page, areaFilter, districtFilter]);

  // Fetch all posts once to extract available districts
  const fetchAllDistricts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Fetch a large number of posts to get all districts
      const response = await axios.get(
        `http://localhost:5000/api/posts?limit=500`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        const fetchedPosts = response.data.posts;
        
        // Extract unique districts from posts
        const districts = new Set();
        fetchedPosts.forEach(post => {
          // Check location.district first
          if (post.location?.district) {
            districts.add(post.location.district);
          }
          // Also check district field directly on post
          if (post.district) {
            districts.add(post.district);
          }
          // Check author's district
          if (post.author?.district) {
            districts.add(post.author.district);
          }
        });
        
        // Convert to sorted array and filter out empty values
        const sortedDistricts = [...districts]
          .filter(d => d && d.trim())
          .sort((a, b) => a.localeCompare(b));
        
        setAvailableDistricts(sortedDistricts);
      }
    } catch (err) {
      console.error('Failed to fetch districts:', err);
    }
  }, []);

  useEffect(() => {
    // Load current user from localStorage so we know their area for voting rules
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch {
        setCurrentUser(null);
      }
    }

    // Fetch districts on initial load
    fetchAllDistricts();
  }, [fetchAllDistricts]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleVote = (updatedPost) => {
    // Update the post in the list with the new vote counts
    setPosts(posts.map(p => p._id === updatedPost._id ? updatedPost : p));
  };

  if (loading && posts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading posts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Crime Feed</h1>
              <p className="text-gray-500 text-sm mt-1">Stay informed about incidents in your community</p>
            </div>
            {(districtFilter || areaFilter) && (
              <button
                onClick={() => {
                  setDistrictFilter('');
                  setAreaFilter('');
                  setPage(1);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* District Dropdown */}
            <div className="relative flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">District</label>
              <div className="relative">
                <select
                  value={districtFilter}
                  onChange={(e) => {
                    setDistrictFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">All Districts</option>
                  {availableDistricts.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Area Search */}
            <div className="relative flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Area</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by area name..."
                  value={areaFilter}
                  onChange={(e) => {
                    setAreaFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-3 pl-11 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {areaFilter && (
                  <button
                    onClick={() => {
                      setAreaFilter('');
                      setPage(1);
                    }}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Active Filters Pills */}
          {(districtFilter || areaFilter) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {districtFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  {districtFilter}
                  <button onClick={() => { setDistrictFilter(''); setPage(1); }} className="ml-1 hover:text-indigo-900">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {areaFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  "{areaFilter}"
                  <button onClick={() => { setAreaFilter(''); setPage(1); }} className="ml-1 hover:text-purple-900">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Posts List */}
        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No posts found</p>
            <p className="text-gray-500 text-sm mt-2">
              {areaFilter ? 'Try a different area filter' : 'Be the first to report an incident'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map(post => (
              <PostCard key={post._id} post={post} onVote={handleVote} currentUser={currentUser} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;
