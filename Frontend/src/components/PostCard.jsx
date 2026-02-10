import React, { useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const PostCard = ({ post, onVote, currentUser }) => {
  const [voting, setVoting] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Calculate authenticity percentage
  const totalVotes = (post.verifications?.length || 0) + (post.refutations?.length || 0);
  const greenPercentage = totalVotes > 0 
    ? Math.round((post.verifications?.length || 0) / totalVotes * 100) 
    : 50;

  const handleVote = async (voteType) => {
    if (voting) return;
    
    setVoting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/posts/${post._id}/vote`,
        { voteType },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success && onVote) {
        onVote(response.data.post);
      }
    } catch (error) {
      console.error('Vote error:', error);
      alert(error.response?.data?.message || 'Failed to submit vote');
    } finally {
      setVoting(false);
    }
  };

  const displayName = post.isAnonymous
    ? 'Anonymous User'
    : (post.author?.fullName || 'Anonymous User');

  const canVote = !!(currentUser && currentUser.residentialArea && currentUser.residentialArea === post.area);
  
  // Check if user has already voted on this post
  const hasAlreadyVoted = currentUser && (
    (post.verifications?.some(id => id === currentUser._id)) ||
    (post.refutations?.some(id => id === currentUser._id))
  );

  // Get reputation
  const reputation = post.author?.reputation || 50;

  // Format relative time
  const getRelativeTime = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffMs = now - postDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get authenticity status
  const getAuthenticityStatus = () => {
    if (totalVotes === 0) return { label: 'Unverified', color: 'text-gray-500', bg: 'bg-gray-100' };
    if (greenPercentage >= 70) return { label: 'Verified', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (greenPercentage <= 30) return { label: 'Disputed', color: 'text-red-600', bg: 'bg-red-50' };
    return { label: 'Mixed', color: 'text-amber-600', bg: 'bg-amber-50' };
  };

  const authenticityStatus = getAuthenticityStatus();

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden mb-6 max-w-2xl mx-auto border border-gray-100">
      
      {/* Post Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Author Profile Picture */}
            <div className="relative flex-shrink-0">
              {post.isAnonymous ? (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xl shadow-lg ring-2 ring-white">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9H15V22H13V16H11V22H9V9H3V7H21V9Z"/>
                  </svg>
                </div>
              ) : post.author?.profilePicture ? (
                <img 
                  src={post.author.profilePicture} 
                  alt={displayName}
                  className="w-12 h-12 rounded-full object-cover shadow-lg ring-2 ring-white"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              {/* Fallback Avatar */}
              {!post.isAnonymous && (
                <div 
                  className={`w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-white ${post.author?.profilePicture ? 'hidden' : ''}`}
                >
                  {post.author?.fullName ? post.author.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              
              {/* Reputation Badge - positioned on avatar */}
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md border-2 border-white ${
                reputation >= 70 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' :
                reputation <= 30 ? 'bg-gradient-to-br from-red-400 to-red-600' :
                'bg-gradient-to-br from-amber-400 to-amber-600'
              }`}>
                {reputation}
              </div>
            </div>
            
            {/* Author Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 truncate">
                  {displayName}
                </h3>
                {reputation >= 80 && (
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="truncate">{post.area || 'Unknown Location'}</span>
                <span className="text-gray-300">•</span>
                <span className="flex-shrink-0">{getRelativeTime(post.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Authenticity Badge */}
          <div className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${authenticityStatus.bg} ${authenticityStatus.color}`}>
            {authenticityStatus.label}
          </div>
        </div>
      </div>

      {/* Post Caption */}
      <div className="px-4 sm:px-5 pb-3">
        <p className="text-gray-800 text-[15px] leading-relaxed whitespace-pre-wrap">
          {post.caption}
        </p>
        
        {/* Location Tag */}
        {(post.author?.district || post.author?.upazila) && (
          <div className="mt-3 flex items-center gap-1.5 text-sm text-gray-500">
            <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span>{post.author.district}{post.author.upazila ? `, ${post.author.upazila}` : ''}</span>
          </div>
        )}
      </div>

      {/* Post Image with Mini Map Overlay */}
      {post.image && (
        <div className="relative bg-gray-100 overflow-hidden">
          {/* Image loading skeleton */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
          )}
          
          <img 
            src={post.image} 
            alt="Post content" 
            className={`w-full h-auto object-cover max-h-[500px] transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/600x400?text=Image+Not+Found';
              setImageLoaded(true);
            }}
          />
          
          {/* Mini Interactive Map - Always visible */}
          {post.location?.coordinates && post.location.coordinates.length === 2 && (() => {
            const lat = post.location.coordinates[1];
            const lng = post.location.coordinates[0];
            return (
              <div className="absolute bottom-3 right-3 w-24 h-24 bg-white rounded-xl shadow-xl overflow-hidden ring-2 ring-white/50 backdrop-blur-sm">
                <div className="w-full h-full relative">
                  <MapContainer
                    center={[lat, lng]}
                    zoom={14}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    attributionControl={false}
                    dragging={true}
                    scrollWheelZoom={true}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[lat, lng]} />
                  </MapContainer>
                  
                  {/* Expand button */}
                  <button 
                    className="absolute bottom-1 right-1 bg-white/90 hover:bg-white text-gray-700 rounded-lg w-6 h-6 flex items-center justify-center shadow-lg z-20 transition-all hover:scale-110"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMapExpanded(true);
                    }}
                    title="Expand map"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Expanded Map Modal */}
      {isMapExpanded && post.location?.coordinates && post.location.coordinates.length === 2 && (() => {
        const lat = post.location.coordinates[1];
        const lng = post.location.coordinates[0];
        return (
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setIsMapExpanded(false)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-5 py-4 flex items-center justify-between">
                <div className="text-white">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    Incident Location
                  </h3>
                  {post.location.address && (
                    <p className="text-indigo-100 text-sm truncate max-w-md mt-1">{post.location.address}</p>
                  )}
                </div>
                <button
                  onClick={() => setIsMapExpanded(false)}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Large Interactive Map */}
              <div className="h-96 w-full">
                <MapContainer
                  center={[lat, lng]}
                  zoom={16}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={true}
                  scrollWheelZoom={true}
                  dragging={true}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <Marker position={[lat, lng]} />
                </MapContainer>
              </div>
              
              {/* Footer */}
              <div className="bg-gray-50 px-5 py-4 flex items-center justify-between border-t">
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
                </div>
                <button
                  onClick={() => window.open(`https://www.openstreetmap.org/#map=17/${lat}/${lng}`, '_blank')}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 transition-all hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in Maps
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Engagement Stats & Authenticity Bar */}
      <div className="px-4 sm:px-5 py-4 border-t border-gray-100">
        {/* Vote Stats Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              </div>
              <span className="font-semibold text-gray-700">{post.verifications?.length || 0}</span>
              <span className="text-gray-400 hidden sm:inline">verified</span>
            </div>
            
            <div className="flex items-center gap-1.5 text-sm">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                </svg>
              </div>
              <span className="font-semibold text-gray-700">{post.refutations?.length || 0}</span>
              <span className="text-gray-400 hidden sm:inline">disputed</span>
            </div>
          </div>
          
          {totalVotes > 0 && (
            <span className="text-xs text-gray-400 font-medium">{totalVotes} total votes</span>
          )}
        </div>
        
        {/* Modern Authenticity Bar */}
        <div className="relative">
          <div className="h-2 rounded-full overflow-hidden bg-gray-100 flex">
            <div 
              className="bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700 ease-out"
              style={{ width: `${greenPercentage}%` }}
            />
            <div 
              className="bg-gradient-to-r from-red-400 to-red-500 transition-all duration-700 ease-out"
              style={{ width: `${100 - greenPercentage}%` }}
            />
          </div>
          
          {/* Percentage Labels */}
          <div className="flex justify-between mt-1.5 text-xs font-medium">
            <span className="text-emerald-600">{greenPercentage}% Authentic</span>
            <span className="text-red-500">{100 - greenPercentage}% Disputed</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 sm:px-5 pb-4 flex gap-3">
        <button
          onClick={() => handleVote('verify')}
          disabled={voting || !canVote || hasAlreadyVoted}
          className={`flex-1 font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm
            ${voting || !canVote || hasAlreadyVoted 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5'
            }`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
          </svg>
          <span>
            {voting ? 'Voting...' : hasAlreadyVoted ? 'Voted' : !canVote ? 'Area Mismatch' : 'Verify'}
          </span>
        </button>
        
        <button
          onClick={() => handleVote('refute')}
          disabled={voting || !canVote || hasAlreadyVoted}
          className={`flex-1 font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm
            ${voting || !canVote || hasAlreadyVoted 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5'
            }`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
          </svg>
          <span>
            {voting ? 'Voting...' : hasAlreadyVoted ? 'Voted' : !canVote ? 'Area Mismatch' : 'Dispute'}
          </span>
        </button>
      </div>

      {/* Status Message */}
      {(hasAlreadyVoted || !canVote) && (
        <div className="px-4 sm:px-5 pb-4">
          <div className={`text-center text-xs py-2 px-4 rounded-lg ${
            hasAlreadyVoted ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
          }`}>
            {hasAlreadyVoted ? (
              <span className="flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                You have already voted on this post
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                You can only vote on incidents from your registered area
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
