import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthPage from './components/AuthPage';
import EmailVerify from './components/EmailVerify';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/verify/:token" element={<EmailVerify />} />
      </Routes>
    </Router>
  );
}

export default App;
