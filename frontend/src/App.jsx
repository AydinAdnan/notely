import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PublicNote from './pages/PublicNote';
import Profile from './pages/Profile';
import useAuthStore from './store/authStore';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  const { init } = useAuthStore();

  useEffect(() => {
    init();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="/share/:token" element={<PublicNote />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
