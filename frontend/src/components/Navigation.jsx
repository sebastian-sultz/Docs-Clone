import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navigation = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-2xl font-bold text-gray-900">
            Collaboration Tool
          </Link>
          {location.pathname !== '/' && (
            <button
              onClick={() => window.history.back()}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Back
            </button>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span>Welcome, {currentUser?.username}</span>
          {currentUser?.role === 'admin' && (
            <Link
              to="/admin"
              className="bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              Admin Panel
            </Link>
          )}
          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded-md"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navigation;