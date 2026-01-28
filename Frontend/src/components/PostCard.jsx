import React, { useState } from 'react';
import axios from 'axios';

const PostCard = ({ post, onVote, currentUser }) => {
  const [voting, setVoting] = useState(false);
  
  // Calculate authenticity percentage
  const totalVotes = (post.verifications?.length || 0) + (post.refutations?.length || 0);
  const greenPercentage = totalVotes > 0 
    ? Math.round((post.verifications?.length || 0) / totalVotes * 100) 
    : 50;
  const redPercentage = 100 - greenPercentage;

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

  // Get reputation and icon
  const reputation = post.author?.reputation || 50;
  const getReputationIcon = () => {
    if (reputation > 70) {
      return { icon: '✅', color: 'text-green-600', label: 'Trusted' };
    } else if (reputation < 30) {
      return { icon: '⚠️', color: 'text-red-600', label: 'Suspicious' };
    } else {
      return { icon: '◯', color: 'text-gray-400', label: 'Neutral' };
    }
  };
  const repIcon = getReputationIcon();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6 max-w-2xl mx-auto">
      {/* Post Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-lg text-gray-900">
                {displayName}
              </h3>
              {/* Modern Reputation Badge */}
              <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-white text-sm shadow-md ${
                reputation > 70 ? 'bg-gradient-to-br from-green-400 to-green-600' :
                reputation < 30 ? 'bg-gradient-to-br from-red-400 to-red-600' :
                'bg-gradient-to-br from-yellow-400 to-yellow-600'
              }`}>
                {reputation}
              </div>
            </div>
            
            <p className="text-sm text-gray-600">
              📍 {post.area || 'Unknown Location'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {post.author?.district && post.author?.upazila 
                ? `${post.author.district}, ${post.author.upazila}`
                : 'Location not specified'}
            </p>
          </div>
          <span className="text-xs text-gray-400 ml-4">
            {new Date(post.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Post Image */}
      {post.image && (
        <div className="w-full bg-gray-100">
          <img 
            src={post.image} 
            alt="Post content" 
            className="w-full h-auto object-cover max-h-96"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/600x400?text=Image+Not+Found';
            }}
          />
        </div>
      )}

      {/* Post Caption */}
      <div className="p-4">
        <p className="text-gray-800 text-base leading-relaxed">
          {post.caption}
        </p>
      </div>

      {/* Authenticity Bar */}
      <div className="px-4 pb-4">
        <div className="mb-2 flex justify-between text-sm text-gray-600">
          <span>✅ {post.verifications?.length || 0} Verified</span>
          <span>❌ {post.refutations?.length || 0} Refuted</span>
        </div>
        
        <div className="relative h-10 rounded-full overflow-hidden flex shadow-inner">
          {/* Green side (Verifications) */}
          <div 
            className="bg-green-500 flex items-center justify-start pl-2 transition-all duration-500"
            style={{ width: `${greenPercentage}%` }}
          >
            {greenPercentage > 15 && (
              <span className="text-white text-xs font-bold">
                {greenPercentage}%
              </span>
            )}
          </div>
          
          {/* Red side (Refutations) */}
          <div 
            className="bg-red-500 flex items-center justify-end pr-2 transition-all duration-500"
            style={{ width: `${redPercentage}%` }}
          >
            {redPercentage > 15 && (
              <span className="text-white text-xs font-bold">
                {redPercentage}%
              </span>
            )}
          </div>

          {/* Center overlay text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-bold text-sm drop-shadow-lg">
              Authenticity: {greenPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4 flex gap-3">
        <button
          onClick={() => handleVote('verify')}
          disabled={voting || !canVote || hasAlreadyVoted}
          className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <span className="text-lg">✅</span>
          <span>
            {voting
              ? 'Voting...'
              : hasAlreadyVoted
              ? 'Already Voted'
              : !canVote
              ? 'Not in your area'
              : 'Verify'}
          </span>
        </button>
        
        <button
          onClick={() => handleVote('refute')}
          disabled={voting || !canVote || hasAlreadyVoted}
          className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <span className="text-lg">❌</span>
          <span>
            {voting
              ? 'Voting...'
              : hasAlreadyVoted
              ? 'Already Voted'
              : !canVote
              ? 'Not in your area'
              : 'Refute'}
          </span>
        </button>
      </div>

      {/* Vote Count Info */}
      {(totalVotes > 0 || !canVote || hasAlreadyVoted) && (
        <div className="px-4 pb-4 text-center text-xs text-gray-600 space-y-1">
          {totalVotes > 0 && (
            <div className="font-semibold text-gray-800">
              📊 Total Votes: {totalVotes}
            </div>
          )}
          {hasAlreadyVoted && (
            <div className="text-blue-600 font-medium">
              ✓ You have voted on this post
            </div>
          )}
          {!canVote && (
            <div>
              You can only verify or refute incidents reported in your own area.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PostCard;
