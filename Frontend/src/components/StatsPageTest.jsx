import React from 'react';
import Navbar from './Navbar';

const StatsPageTest = () => {
  return (
    <div className="min-h-screen bg-red-500">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-6xl font-bold text-white text-center">
          TEST - Statistics Page is Working!
        </h1>
        <p className="text-3xl text-white text-center mt-4">
          If you see this, the route and component are rendering correctly.
        </p>
      </div>
    </div>
  );
};

export default StatsPageTest;
