import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

function isTokenValid(token: string): boolean {
  try {
    // Decode JWT token (it's base64 encoded)
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Check if token has expired (exp is in seconds, Date.now() is in milliseconds)
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false;
    }
    
    return true;
  } catch (error) {
    // If we can't decode the token, it's invalid
    return false;
  }
}

export default function ProtectedRoute({ children, redirectTo = '/login/manager' }: ProtectedRouteProps) {
  const token = localStorage.getItem('authToken');

  if (!token || !isTokenValid(token)) {
    // Not authenticated or token is expired, clear storage and redirect to login
    localStorage.removeItem('authToken');
    return <Navigate to={redirectTo} replace />;
  }

  // Authenticated, render the children
  return <>{children}</>;
}

