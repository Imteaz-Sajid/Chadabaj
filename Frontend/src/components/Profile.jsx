import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import LocationPicker from './LocationPicker';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newPost, setNewPost] = useState({
    caption: '',
    image: null,
    area: '',
    district: '',
    upazila: '',
    isAnonymous: false,
    location: { lat: null, lng: null, address: '' }
  });
  const [editData, setEditData] = useState({
    fullName: '',
    phoneNumber: '',
    address: '',
    residentialArea: ''
  });
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [upazilas, setUpazilas] = useState([]);

  useEffect(() => {
    fetchUserData();
    fetchMyPosts();
  }, []);

  // Fetch districts for incident location dropdown (same as registration)
  useEffect(() => {
    axios
      .get('http://localhost:5000/api/locations/districts')
      .then((res) => {
        if (res.data.success) setDistricts(res.data.districts);
      })
      .catch(() => {});
  }, []);

  // Fetch upazilas when a district is selected (same as registration)
  useEffect(() => {
    if (newPost.district) {
      axios
        .get('http://localhost:5000/api/locations/upazilas', {
          params: { district: newPost.district }
        })
        .then((res) => {
          if (res.data.success) setUpazilas(res.data.upazilas);
        })
        .catch(() => {});
    } else {
      setUpazilas([]);
      setNewPost((prev) => ({ ...prev, upazila: '', area: '' }));
    }
  }, [newPost.district]);

  const fetchUserData = async () => {
    try {
      // First, get user from localStorage as fallback
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(localUser);
      
      // Then fetch fresh data from backend if we have a token
      const token = localStorage.getItem('token');
      if (token) {
        const response = await axios.get('http://localhost:5000/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.data.success) {
          setUser(response.data.user);
          // Update localStorage with fresh data
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }
    } catch (err) {
      console.error('Fetch user data error:', err);
      // If API fails, keep using localStorage data
    }
  };

  const fetchMyPosts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      const response = await axios.get('http://localhost:5000/api/posts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        // Filter posts by current user
        const userPosts = response.data.posts.filter(
          post => post.author._id === localUser._id
        );
        setMyPosts(userPosts);
      }
    } catch (err) {
      console.error('Fetch posts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    
    if (!newPost.caption || !newPost.image) {
      alert('Please fill in all required fields and upload an image');
      return;
    }

    // Require either area selection OR map location
    if (!newPost.area && !newPost.location.lat) {
      alert('Please select a location - either from dropdown or map');
      return;
    }

    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      
      // Create FormData object
      const formData = new FormData();
      formData.append('caption', newPost.caption);
      formData.append('image', newPost.image);
      formData.append('area', newPost.area || newPost.location.address?.split(',')[0] || 'Unknown');
      formData.append('isAnonymous', newPost.isAnonymous);
      
      // Add district and upazila if selected from dropdown
      if (newPost.district) {
        formData.append('district', newPost.district);
      }
      if (newPost.upazila) {
        formData.append('upazila', newPost.upazila);
      }
      
      // Add coordinates if provided from map
      if (newPost.location.lat && newPost.location.lng) {
        formData.append('lat', newPost.location.lat);
        formData.append('lng', newPost.location.lng);
        formData.append('address', newPost.location.address || '');
      }

      const response = await axios.post(
        'http://localhost:5000/api/posts',
        formData,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        alert(`Post created successfully! ${response.data.notificationsSent} users notified.`);
        setShowCreateModal(false);
        setNewPost({ caption: '', image: null, area: '', district: '', upazila: '', isAnonymous: false, location: { lat: null, lng: null, address: '' } });
        setImagePreview(null);
        fetchMyPosts(); // Refresh posts
      }
    } catch (err) {
      console.error('Create post error:', err);
      alert(err.response?.data?.message || 'Failed to create post');
    } finally {
      setCreating(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        alert('Please upload a valid image file (JPG, JPEG, or PNG)');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should not exceed 5MB');
        return;
      }

      setNewPost({ ...newPost, image: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        alert('Please upload a valid image file (JPG, JPEG, or PNG)');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should not exceed 5MB');
        return;
      }

      setProfilePictureFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditProfile = () => {
    setEditData({
      fullName: user.fullName || '',
      phoneNumber: user.phoneNumber || '',
      address: user.address || '',
      residentialArea: user.residentialArea || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const token = localStorage.getItem('token');

      // Update profile data
      const profileResponse = await axios.put(
        'http://localhost:5000/api/auth/profile',
        editData,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (profileResponse.data.success) {
        // Update profile picture if selected
        if (profilePictureFile) {
          const formData = new FormData();
          formData.append('profilePicture', profilePictureFile);

          const pictureResponse = await axios.post(
            'http://localhost:5000/api/auth/profile-picture',
            formData,
            {
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              }
            }
          );

          if (pictureResponse.data.success) {
            setUser(pictureResponse.data.user);
            localStorage.setItem('user', JSON.stringify(pictureResponse.data.user));
          }
        } else {
          setUser(profileResponse.data.user);
          localStorage.setItem('user', JSON.stringify(profileResponse.data.user));
        }

        alert('Profile updated successfully!');
        setShowEditModal(false);
        setProfilePictureFile(null);
        setProfilePicturePreview(null);
      }
    } catch (err) {
      console.error('Update profile error:', err);
      alert(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const calculateAuthenticity = (post) => {
    const totalVotes = (post.verifications?.length || 0) + (post.refutations?.length || 0);
    return totalVotes > 0 
      ? Math.round((post.verifications?.length || 0) / totalVotes * 100) 
      : 50;
  };

  const getRoleBadgeColor = (role) => {
    const roleLower = role?.toLowerCase();
    switch(roleLower) {
      case 'police': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'dc': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  // Show loading if user data is not yet available
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-6 text-gray-600 text-lg font-medium">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header - Modern Card Design */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-2xl overflow-hidden mb-8">
          <div className="relative">
            {/* Decorative Background Pattern */}
            <div className="absolute inset-0 bg-black opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
                backgroundSize: '32px 32px'
              }}></div>
            </div>
            
            <div className="relative p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                {/* Profile Info */}
                <div className="flex items-start gap-6">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg ring-4 ring-blue-300 overflow-hidden">
                      {user.profilePicture ? (
                        <img 
                          src={user.profilePicture} 
                          alt={user.fullName} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl font-bold text-blue-600">
                          {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* User Details */}
                  <div className="flex-1">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                      {user.fullName || 'User Profile'}
                    </h1>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border-2 ${getRoleBadgeColor(user.role)} mb-4`}>
                      <span className="mr-1">
                        {user.role === 'police' ? '👮' : user.role === 'dc' ? '⚖️' : '👤'}
                      </span>
                      {user.role?.toUpperCase() || 'USER'}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-white">
                      <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-lg px-3 py-2 backdrop-blur-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm truncate">{user.email}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-lg px-3 py-2 backdrop-blur-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="text-sm">{user.phoneNumber}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-lg px-3 py-2 backdrop-blur-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm">{user.district}, {user.upazila}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-lg px-3 py-2 backdrop-blur-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                        <span className="text-sm">NID: {user.nidNumber}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="md:self-start flex gap-3">
                  <button
                    onClick={handleEditProfile}
                    className="group relative bg-white text-green-600 hover:bg-green-50 font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit Profile</span>
                  </button>
                  
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="group relative bg-white text-blue-600 hover:bg-blue-50 font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 flex items-center gap-2"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create Post</span>
                  </button>
                </div>
              </div>
              
              {/* Address Bar */}
              <div className="mt-6 bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-3 text-white">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="text-sm font-medium">{user.address}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Posts</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{myPosts.length}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Verifications</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">
                  {myPosts.reduce((sum, post) => sum + (post.verifications?.length || 0), 0)}
                </p>
              </div>
              <div className="bg-green-100 rounded-full p-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-red-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Refutations</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">
                  {myPosts.reduce((sum, post) => sum + (post.refutations?.length || 0), 0)}
                </p>
              </div>
              <div className="bg-red-100 rounded-full p-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Reputation Card */}
          <div className={`rounded-xl shadow-lg p-6 border-t-4 hover:shadow-xl transition-shadow ${
            user?.reputation > 70 ? 'bg-white border-green-500' :
            user?.reputation < 30 ? 'bg-white border-red-500' :
            'bg-white border-yellow-500'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">User Reputation</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{user?.reputation || 50}</p>
                <p className={`text-xs font-semibold mt-2 ${
                  user?.reputation > 70 ? 'text-green-600' :
                  user?.reputation < 30 ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {user?.reputation > 70 ? '✅ Trusted' : user?.reputation < 30 ? '⚠️ Suspicious' : '○ Neutral'}
                </p>
              </div>
              <div className={`flex items-center justify-center w-20 h-20 rounded-full font-bold text-white text-2xl shadow-lg ${
                user?.reputation > 70 ? 'bg-gradient-to-br from-green-400 to-green-600' :
                user?.reputation < 30 ? 'bg-gradient-to-br from-red-400 to-red-600' :
                'bg-gradient-to-br from-yellow-400 to-yellow-600'
              }`}>
                {user?.reputation || 50}
              </div>
            </div>
          </div>
        </div>

        {/* My Posts Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              My Posts
            </h2>
            <span className="bg-blue-100 text-blue-800 font-bold px-4 py-2 rounded-full text-lg">
              {myPosts.length}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
              </div>
              <p className="mt-6 text-gray-600 text-lg font-medium">Loading your posts...</p>
            </div>
          ) : myPosts.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl">
              <div className="mb-6">
                <svg className="w-24 h-24 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-600 text-xl font-semibold mb-2">No posts yet</p>
              <p className="text-gray-500 mb-6">Start sharing incidents with your community</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your First Post
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {myPosts.map(post => {
                const authenticity = calculateAuthenticity(post);
                const totalVotes = (post.verifications?.length || 0) + (post.refutations?.length || 0);
                
                return (
                  <div 
                    key={post._id} 
                    className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-indigo-200 transition-all duration-300"
                  >
                    {/* Image Section - Full Width at Top */}
                    {post.image && (
                      <div className="relative h-48 overflow-hidden">
                        <img 
                          src={post.image} 
                          alt="Post" 
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/400x300/e2e8f0/64748b?text=Image+Unavailable';
                          }}
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        
                        {/* Date Badge */}
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-700 px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
                          {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        
                        {/* Location Overlay */}
                        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                          </svg>
                          <span className="text-sm font-medium drop-shadow-lg">{post.area}</span>
                        </div>
                        
                        {/* Authenticity Badge */}
                        <div className={`absolute bottom-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                          authenticity >= 70 ? 'bg-emerald-500 text-white' :
                          authenticity >= 40 ? 'bg-amber-500 text-white' :
                          'bg-red-500 text-white'
                        }`}>
                          {authenticity}% Authentic
                        </div>
                      </div>
                    )}
                    
                    {/* Content Section */}
                    <div className="p-5">
                      {/* Caption */}
                      <p className="text-gray-800 text-[15px] leading-relaxed line-clamp-3 mb-4">
                        {post.caption}
                      </p>
                      
                      {/* Stats Row */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                          </svg>
                          <span className="font-bold text-sm">{post.verifications?.length || 0}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                          </svg>
                          <span className="font-bold text-sm">{post.refutations?.length || 0}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg ml-auto">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                          </svg>
                          <span className="font-semibold text-sm">{totalVotes}</span>
                        </div>
                      </div>
                      
                      {/* Authenticity Progress Bar */}
                      <div className="relative">
                        <div className="h-1.5 rounded-full overflow-hidden bg-gray-100 flex">
                          <div 
                            className="bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                            style={{ width: `${authenticity}%` }}
                          />
                          <div 
                            className="bg-gradient-to-r from-red-400 to-red-500"
                            style={{ width: `${100 - authenticity}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Time Ago */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-3">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(post.createdAt).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Post Modal - Enhanced */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all animate-scaleIn max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Report New Incident
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewPost({ caption: '', image: null, area: '', district: '', upazila: '', isAnonymous: false, location: { lat: null, lng: null, address: '' } });
                    setImagePreview(null);
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-blue-100 mt-2">Share important incidents with your community</p>
            </div>
            
            {/* Modal Body - Scrollable */}
            <form onSubmit={handleCreatePost} className="p-8 space-y-6 overflow-y-auto flex-1">
              {/* Caption Field */}
              <div>
                <label className="block text-gray-800 font-bold mb-2 text-sm uppercase tracking-wide">
                  Incident Description *
                </label>
                <textarea
                  value={newPost.caption}
                  onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })}
                  placeholder="Provide a detailed description of what happened..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all resize-none text-gray-700"
                  rows="5"
                  maxLength="500"
                  required
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">Be clear and specific about the incident</p>
                  <p className={`text-sm font-semibold ${newPost.caption.length > 450 ? 'text-red-600' : 'text-gray-600'}`}>
                    {newPost.caption.length}/500
                  </p>
                </div>
              </div>

              {/* Image Upload Field */}
              <div>
                <label className="block text-gray-800 font-bold mb-2 text-sm uppercase tracking-wide">
                  Evidence Image *
                </label>
                
                {/* File Input */}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleImageChange}
                    className="hidden"
                    id="imageUpload"
                    required
                  />
                  <label
                    htmlFor="imageUpload"
                    className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 transition-all cursor-pointer bg-gray-50 hover:bg-blue-50"
                  >
                    <div className="text-center">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-600 font-semibold">
                        {newPost.image ? newPost.image.name : 'Click to upload image'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, JPEG or PNG (Max 5MB)
                      </p>
                    </div>
                  </label>
                </div>

                {/* Image Preview */}
                {imagePreview && (
                  <div className="mt-4 relative">
                    <div className="relative rounded-xl overflow-hidden border-2 border-gray-200">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-64 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setNewPost({ ...newPost, image: null });
                          setImagePreview(null);
                          document.getElementById('imageUpload').value = '';
                        }}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-green-600 mt-2 font-semibold flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Image ready to upload
                    </p>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-2">Upload a clear image of the incident as evidence</p>
              </div>

              {/* Area Field - District & Upazila/Thana (same as registration) */}
              <div>
                <label className="block text-gray-800 font-bold mb-2 text-sm uppercase tracking-wide">
                  Incident Location *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* District Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      District
                    </label>
                    <div className="relative">
                      <select
                        value={newPost.district}
                        onChange={(e) =>
                          setNewPost({
                            ...newPost,
                            district: e.target.value,
                            upazila: '',
                            area: ''
                          })
                        }
                        required
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all text-gray-700 appearance-none bg-white"
                      >
                        <option value="">Select district</option>
                        {districts.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <svg
                        className="w-5 h-5 text-gray-400 absolute right-3 top-3 pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Upazila/Thana Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Upazila/Thana
                    </label>
                    <div className="relative">
                      <select
                        value={newPost.upazila}
                        onChange={(e) => {
                          const upazila = e.target.value;
                          setNewPost({
                            ...newPost,
                            upazila,
                            // Store selected upazila as the "area" used for notifications
                            area: upazila
                          });
                        }}
                        required
                        disabled={!newPost.district}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all text-gray-700 appearance-none bg-white disabled:bg-gray-100 disabled:text-gray-500"
                      >
                        <option value="">
                          {newPost.district ? 'Select upazila/thana' : 'Select district first'}
                        </option>
                        {upazilas.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      <svg
                        className="w-5 h-5 text-gray-400 absolute right-3 top-3 pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  <span className="font-semibold">⚠️ Note:</span> All users in this upazila/thana will receive a notification
                </p>
              </div>

              {/* Location Picker with Map */}
              <div>
                <label className="block text-gray-800 font-bold mb-2 text-sm uppercase tracking-wide flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Pin Exact Location on Map
                </label>
                
                <LocationPicker
                  onLocationSelect={({ lat, lng, address }) => {
                    setNewPost(prev => ({
                      ...prev,
                      location: { lat, lng, address }
                    }));
                  }}
                />
              </div>

                {/* Anonymous Option */}
                <div className="mt-2 flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setNewPost({ ...newPost, isAnonymous: !newPost.isAnonymous })}
                    className={`mt-0.5 w-10 h-6 flex items-center rounded-full border transition-colors duration-200 ${
                      newPost.isAnonymous ? 'bg-green-500 border-green-500' : 'bg-gray-300 border-gray-300'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${
                        newPost.isAnonymous ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Post anonymously
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      If enabled, your name and profile will not be shown with this post in the public feed.
                    </p>
                  </div>
                </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Creating Post...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Create Post</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewPost({ caption: '', image: null, area: '', district: '', upazila: '', isAnonymous: false, location: { lat: null, lng: null, address: '' } });
                    setImagePreview(null);
                  }}
                  disabled={creating}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 font-bold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all animate-scaleIn max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-800 px-8 py-6 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setProfilePictureFile(null);
                    setProfilePicturePreview(null);
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-green-100 mt-2">Update your profile information and picture</p>
            </div>
            
            {/* Modal Body */}
            <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
              {/* Profile Picture Upload */}
              <div>
                <label className="block text-gray-800 font-bold mb-2 text-sm uppercase tracking-wide">
                  Profile Picture
                </label>
                <div className="flex items-center gap-6">
                  {/* Current/Preview Image */}
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-4 border-gray-300">
                    {profilePicturePreview ? (
                      <img src={profilePicturePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : user.profilePicture ? (
                      <img src={user.profilePicture} alt={user.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl font-bold text-gray-400">
                        {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  
                  {/* Upload Button */}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                      id="profilePictureUpload"
                    />
                    <label
                      htmlFor="profilePictureUpload"
                      className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg cursor-pointer transition-colors"
                    >
                      Choose New Picture
                    </label>
                    <p className="text-xs text-gray-500 mt-2">JPG, JPEG or PNG (Max 5MB)</p>
                    {profilePictureFile && (
                      <p className="text-sm text-green-600 mt-2 font-semibold">✓ New picture selected</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-gray-800 font-bold mb-2 text-sm uppercase tracking-wide">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editData.fullName}
                  onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all text-gray-700"
                  required
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-gray-800 font-bold mb-2 text-sm uppercase tracking-wide">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={editData.phoneNumber}
                  onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all text-gray-700"
                  required
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-gray-800 font-bold mb-2 text-sm uppercase tracking-wide">
                  Address *
                </label>
                <textarea
                  value={editData.address}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all resize-none text-gray-700"
                  rows="3"
                  required
                />
              </div>

              {/* Residential Area */}
              <div>
                <label className="block text-gray-800 font-bold mb-2 text-sm uppercase tracking-wide">
                  Residential Area (for notifications)
                </label>
                <input
                  type="text"
                  value={editData.residentialArea}
                  onChange={(e) => setEditData({ ...editData, residentialArea: e.target.value })}
                  placeholder="e.g., Dhanmondi, Gulshan, etc."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all text-gray-700"
                />
                <p className="text-xs text-gray-500 mt-2">
                  You'll receive notifications for incidents reported in this area
                </p>
              </div>

              {/* Read-only Fields Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Note:</strong> Email, NID, District, Upazila, and Role cannot be changed.
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>NID:</strong> {user.nidNumber}</p>
                  <p><strong>District:</strong> {user.district}</p>
                  <p><strong>Upazila:</strong> {user.upazila}</p>
                  <p><strong>Role:</strong> {user.role}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setProfilePictureFile(null);
                    setProfilePicturePreview(null);
                  }}
                  disabled={updating}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 font-bold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
