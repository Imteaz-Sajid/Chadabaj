import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Add scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/feed', label: 'Feed', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    )},
    { path: '/stats', label: 'Statistics', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )},
    { path: '/notifications', label: 'Alerts', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    )},
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/80 backdrop-blur-lg shadow-lg shadow-gray-200/50' 
          : 'bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <Link to="/feed" className="flex items-center gap-3 group flex-shrink-0">
              {/* Modern Shield Logo */}
              <div className={`relative w-10 h-10 rounded-xl ${scrolled ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-white/10 backdrop-blur'} flex items-center justify-center transform group-hover:scale-110 transition-all duration-300 shadow-lg`}>
                <svg className={`w-6 h-6 ${scrolled ? 'text-white' : 'text-blue-400'}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                </svg>
                {/* Pulse effect */}
                <div className="absolute inset-0 rounded-xl bg-blue-500/30 animate-ping opacity-0 group-hover:opacity-100"></div>
              </div>
              <div className="flex flex-col">
                <span className={`text-xl font-black tracking-tight ${scrolled ? 'text-gray-900' : 'text-white'}`}>
                  CHADABAJ
                </span>
                <span className={`text-[10px] font-medium tracking-widest uppercase ${scrolled ? 'text-blue-600' : 'text-blue-300'}`}>
                  Community Safety
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links - Centered */}
            <div className="hidden md:flex items-center gap-1 absolute left-1/2 transform -translate-x-1/2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 group ${
                    isActive(link.path)
                      ? scrolled 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-white/20 text-white backdrop-blur-sm'
                      : scrolled
                        ? 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className={`transition-transform duration-300 ${isActive(link.path) ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {link.icon}
                  </span>
                  <span className="text-sm">{link.label}</span>
                  {/* Active indicator */}
                  {isActive(link.path) && (
                    <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-current rounded-full"></span>
                  )}
                </Link>
              ))}
            </div>

            {/* User Info & Logout */}
            <div className="hidden md:flex items-center gap-3 flex-shrink-0">
              {/* User Avatar & Info - Clickable to Profile */}
              <Link
                to="/profile"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 group ${
                  isActive('/profile')
                    ? scrolled 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30'
                      : 'bg-white/20 backdrop-blur-sm'
                    : scrolled
                      ? 'hover:bg-gray-100'
                      : 'hover:bg-white/10'
                }`}
              >
                {/* Avatar with Profile Picture */}
                {user.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt={user.fullName || 'User'}
                    className={`w-9 h-9 rounded-full object-cover shadow-lg ring-2 transition-all duration-300 ${
                      isActive('/profile') 
                        ? 'ring-white' 
                        : scrolled ? 'ring-blue-200 group-hover:ring-blue-400' : 'ring-white/30 group-hover:ring-white/60'
                    }`}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                {/* Fallback Avatar */}
                <div 
                  className={`w-9 h-9 rounded-full ${
                    isActive('/profile')
                      ? 'bg-white/20'
                      : scrolled ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-white/20'
                  } items-center justify-center font-bold text-sm shadow-lg ring-2 transition-all duration-300 ${
                    isActive('/profile') 
                      ? 'text-white ring-white' 
                      : scrolled ? 'text-white ring-blue-200 group-hover:ring-blue-400' : 'text-white ring-white/30 group-hover:ring-white/60'
                  } ${user.profilePicture ? 'hidden' : 'flex'}`}
                >
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                {/* User Name */}
                <div className="text-left">
                  <p className={`text-sm font-semibold transition-colors duration-300 ${
                    isActive('/profile')
                      ? 'text-white'
                      : scrolled ? 'text-gray-800 group-hover:text-blue-600' : 'text-white'
                  }`}>
                    {user.fullName || 'User'}
                  </p>
                  <p className={`text-xs transition-colors duration-300 ${
                    isActive('/profile')
                      ? 'text-white/80'
                      : scrolled ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    View Profile
                  </p>
                </div>
              </Link>

              {/* Divider */}
              <div className={`w-px h-8 ${scrolled ? 'bg-gray-200' : 'bg-white/20'}`}></div>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                  scrolled 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-lg hover:shadow-red-200/50' 
                    : 'bg-red-500/20 text-red-300 hover:bg-red-500/30 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm">Logout</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                scrolled ? 'text-gray-600 hover:bg-gray-100' : 'text-white hover:bg-white/10'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden transition-all duration-300 overflow-hidden ${
          mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className={`px-4 py-4 space-y-2 ${scrolled ? 'bg-white' : 'bg-slate-900/95 backdrop-blur-lg'}`}>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  isActive(link.path)
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : scrolled
                      ? 'text-gray-600 hover:bg-gray-100'
                      : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}

            {/* Profile Link in Mobile - Shows User Name */}
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                isActive('/profile')
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : scrolled
                    ? 'text-gray-600 hover:bg-gray-100'
                    : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              {/* Mobile Profile Avatar */}
              {user.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  alt={user.fullName || 'User'}
                  className="w-6 h-6 rounded-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center text-white text-xs font-bold ${user.profilePicture ? 'hidden' : 'flex'}`}>
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <span>{user.fullName || 'Profile'}</span>
            </Link>
            
            {/* Mobile User Info */}
            <div className={`flex items-center justify-between px-4 py-3 mt-4 rounded-xl ${scrolled ? 'bg-gray-50' : 'bg-white/5'}`}>
              <div className="flex items-center gap-3">
                {/* Mobile Avatar with Profile Picture */}
                {user.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt={user.fullName || 'User'}
                    className="w-10 h-10 rounded-full object-cover shadow-lg border-2 border-white"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center text-white font-bold ${user.profilePicture ? 'hidden' : 'flex'}`}
                >
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <p className={`font-semibold ${scrolled ? 'text-gray-800' : 'text-white'}`}>{user.fullName || 'User'}</p>
                  <p className={`text-xs ${scrolled ? 'text-gray-500' : 'text-gray-400'}`}>{user.residentialArea || 'Member'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-16"></div>
    </>
  );
};

export default Navbar;
