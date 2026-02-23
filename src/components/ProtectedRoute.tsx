import { Navigate } from 'react-router-dom';
import { isTokenExpired } from '../utils/jwtUtils';
import { clearAuth, getAuthToken, getAuthRole } from '../utils/authUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  allowedRoles?: string[];
}

export default function ProtectedRoute({
  children,
  redirectTo = '/login/manager',
  allowedRoles,
}: ProtectedRouteProps) {
  const token = getAuthToken();
  const userRole = getAuthRole();

  if (!token || isTokenExpired(token)) {
    clearAuth();
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to={redirectTo} replace />;
  }

  // Authenticated, render the children
  return <>{children}</>;
}

