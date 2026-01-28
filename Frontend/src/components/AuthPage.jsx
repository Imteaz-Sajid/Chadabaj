import React, { useState } from 'react';
import axios from 'axios';

const AuthPage = () => {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [role, setRole] = useState('User'); // 'User', 'Police', or 'DC'
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    nidNumber: '',
    phoneNumber: '',
    address: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const portals = [
    { value: 'User', label: 'User Portal', color: 'bg-blue-500' },
    { value: 'Police', label: 'Police Portal', color: 'bg-green-500' },
    { value: 'DC', label: 'DC Portal', color: 'bg-purple-500' }
  ];

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login' 
        ? {
            email: formData.email,
            password: formData.password,
            role: role
          }
        : {
            fullName: formData.fullName,
            email: formData.email,
            password: formData.password,
            nidNumber: formData.nidNumber,
            phoneNumber: formData.phoneNumber,
            address: formData.address,
            role: role
          };

      const response = await axios.post(`http://localhost:5000${endpoint}`, payload);

      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
        
        if (mode === 'login') {
          // Store token in localStorage
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          // Redirect based on role after 2 seconds
          setTimeout(() => {
            // You can implement role-based redirects here
            window.location.href = `/${role.toLowerCase()}-dashboard`;
          }, 2000);
        } else {
          // Clear form after registration
          setFormData({ 
            fullName: '',
            email: '', 
            password: '',
            nidNumber: '',
            phoneNumber: '',
            address: ''
          });
        }
      }
    } catch (error) {
      console.error('Error details:', error);
      let errorMessage = 'An error occurred. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Portal Selection */}
        <div className="mb-6">
          <h2 className="text-white text-center text-2xl font-bold mb-4">
            Select Portal
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {portals.map((portal) => (
              <button
                key={portal.value}
                onClick={() => setRole(portal.value)}
                className={`
                  py-3 px-4 rounded-lg font-semibold text-white transition-all
                  ${role === portal.value 
                    ? `${portal.color} scale-105 shadow-lg` 
                    : 'bg-gray-700 hover:bg-gray-600'
                  }
                `}
              >
                {portal.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Auth Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => {
                setMode('login');
                setMessage({ type: '', text: '' });
              }}
              className={`
                flex-1 py-2 rounded-md font-semibold transition-all
                ${mode === 'login' 
                  ? 'bg-white text-gray-900 shadow' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              Login
            </button>
            <button
              onClick={() => {
                setMode('register');
                setMessage({ type: '', text: '' });
              }}
              className={`
                flex-1 py-2 rounded-md font-semibold transition-all
                ${mode === 'register' 
                  ? 'bg-white text-gray-900 shadow' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              Register
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-gray-600 mt-2">
              {mode === 'login' 
                ? `Sign in to your ${role} account` 
                : `Register as a ${role}`
              }
            </p>
          </div>

          {/* Message Display */}
          {message.text && (
            <div className={`
              mb-4 p-4 rounded-lg text-sm whitespace-pre-line
              ${message.type === 'success' 
                ? 'bg-green-100 text-green-800 border border-green-300' 
                : 'bg-red-100 text-red-800 border border-red-300'
              }
            `}>
              {message.text}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Enter your full name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength="6"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter your password"
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NID Number
                  </label>
                  <input
                    type="text"
                    name="nidNumber"
                    value={formData.nidNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Enter your National ID number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    rows="2"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                    placeholder="Enter your full address"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`
                w-full py-3 px-4 rounded-lg font-semibold text-white transition-all
                ${loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                }
              `}
            >
              {loading 
                ? 'Processing...' 
                : mode === 'login' ? 'Sign In' : 'Create Account'
              }
            </button>
          </form>

          {/* Additional Info */}
          <div className="mt-6 text-center text-sm text-gray-600">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('register')}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Register here
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Login here
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>© 2026 Chadabaj.com - All Rights Reserved</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
