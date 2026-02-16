import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './components/AuthPage';
import EmailVerify from './components/EmailVerify';
import Feed from './components/Feed';
import Profile from './components/Profile';
import Notifications from './components/Notifications';
import StatsPage from './components/StatsPage';
import PostDetail from './components/PostDetail';
import './index.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/auth" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/verify/:token" element={<EmailVerify />} />
        
        {/* Protected Routes */}
        <Route path="/feed" element={
          <ProtectedRoute>
            <Feed />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        } />
        <Route path="/stats" element={
          <ProtectedRoute>
            <StatsPage />
          </ProtectedRoute>
        } />
        <Route path="/post/:postId" element={
          <ProtectedRoute>
            <PostDetail />
          </ProtectedRoute>
        } />
        <Route path="/user-dashboard" element={
          <ProtectedRoute>
            <Feed />
          </ProtectedRoute>
        } />
        <Route path="/police-dashboard" element={
          <ProtectedRoute>
            <Feed />
          </ProtectedRoute>
        } />
        <Route path="/dc-dashboard" element={
          <ProtectedRoute>
            <Feed />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
