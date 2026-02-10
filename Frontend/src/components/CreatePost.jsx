import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';
import LocationPicker from './LocationPicker';

const CreatePost = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    caption: '',
    image: null,
    imagePreview: null,
    location: {
      lat: null,
      lng: null,
      address: ''
    },
    isAnonymous: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle caption change
  const handleCaptionChange = (e) => {
    setFormData(prev => ({
      ...prev,
      caption: e.target.value
    }));
  };

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      setFormData(prev => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file)
      }));
      setError('');
    }
  };

  // Handle location selection from LocationPicker
  const handleLocationSelect = (locationData) => {
    setFormData(prev => ({
      ...prev,
      location: {
        lat: locationData.lat,
        lng: locationData.lng,
        address: locationData.address
      }
    }));
  };

  // Handle anonymous toggle
  const handleAnonymousToggle = () => {
    setFormData(prev => ({
      ...prev,
      isAnonymous: !prev.isAnonymous
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.caption.trim()) {
      setError('Please enter a caption describing the crime/incident');
      return;
    }

    if (!formData.image) {
      setError('Please select an image');
      return;
    }

    if (!formData.location.lat || !formData.location.lng) {
      setError('Please select a location on the map');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }

      // Create FormData for multipart upload
      const submitData = new FormData();
      submitData.append('caption', formData.caption);
      submitData.append('image', formData.image);
      submitData.append('lat', formData.location.lat);
      submitData.append('lng', formData.location.lng);
      submitData.append('address', formData.location.address);
      submitData.append('isAnonymous', formData.isAnonymous);

      const response = await axios.post(
        'http://localhost:5000/api/posts',
        submitData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setSuccess('Post created successfully!');
        setTimeout(() => {
          navigate('/feed');
        }, 1500);
      }
    } catch (err) {
      console.error('Create post error:', err);
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  // Remove selected image
  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null,
      imagePreview: null
    }));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-3xl">📝</span>
            Report a Crime
          </h1>
          <p className="text-gray-600 mt-2">
            Share information about a crime or incident in your area to help keep the community safe.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Caption */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <label className="block text-lg font-semibold text-gray-800 mb-3">
              📋 Describe the Incident
            </label>
            <textarea
              value={formData.caption}
              onChange={handleCaptionChange}
              placeholder="Describe what happened, when it occurred, and any other relevant details..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-sm text-gray-500 mt-2 text-right">
              {formData.caption.length}/500 characters
            </p>
          </div>

          {/* Image Upload */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <label className="block text-lg font-semibold text-gray-800 mb-3">
              📷 Upload Evidence Image
            </label>
            
            {!formData.imagePreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <div className="text-5xl mb-4">🖼️</div>
                  <p className="text-gray-600 font-medium">Click to upload an image</p>
                  <p className="text-sm text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={formData.imagePreview}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Location Picker */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <label className="block text-lg font-semibold text-gray-800 mb-3">
              📍 Select Crime Location
            </label>
            <LocationPicker onLocationSelect={handleLocationSelect} />
          </div>

          {/* Anonymous Toggle */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-lg font-semibold text-gray-800">
                  🕵️ Post Anonymously
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  Your identity will be hidden from other users
                </p>
              </div>
              <button
                type="button"
                onClick={handleAnonymousToggle}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  formData.isAnonymous ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
                    formData.isAnonymous ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <span className="text-xl">✅</span>
              {success}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/feed')}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-4 px-6 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Posting...
                </>
              ) : (
                <>
                  <span>📤</span>
                  Submit Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;
