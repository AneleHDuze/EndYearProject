import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const PrivateRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  // Still loading auth state
  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  }

  // Not logged in → login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but wrong role → forbidden
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  // Authorized
  return children;
};

export default PrivateRoute;