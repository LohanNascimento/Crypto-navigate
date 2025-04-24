import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  
  if (isLoading) {
    // Return a loading indicator if auth state is still being determined
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-light">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;
