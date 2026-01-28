import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-blue-600">Chadabaj</h1>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            <Link
              to="/feed"
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive('/feed')
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              📰 Feed
            </Link>
            
            <Link
              to="/profile"
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive('/profile')
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              👤 Profile
            </Link>
            
            <Link
              to="/notifications"
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive('/notifications')
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              🔔 Notifications
            </Link>
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-gray-800">
                {user.fullName || 'User'}
              </p>
              <p className="text-xs text-gray-500">{user.role || 'User'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
