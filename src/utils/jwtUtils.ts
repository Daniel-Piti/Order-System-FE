/**
 * JWT Utilities
 * Helper functions to decode and extract information from JWT tokens
 */

interface JWTPayload {
  userId?: string;
  roles?: string[];
  email?: string;
  exp?: number;
  iat?: number;
}

/**
 * Decode JWT token without verification (client-side only)
 * Note: This does NOT verify the signature - only the backend can verify
 * This is safe for extracting display information, but backend always validates
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Decode the payload (second part of JWT)
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as JWTPayload;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Extract user role from JWT token
 * Returns the first role in the roles array, or null if not found
 */
export function getUserRoleFromToken(token: string | null): string | null {
  if (!token) {
    return null;
  }
  
  const payload = decodeJWT(token);
  if (!payload || !payload.roles || payload.roles.length === 0) {
    return null;
  }
  
  // Return the first role (roles are usually lowercase in JWT, but we store uppercase)
  const role = payload.roles[0];
  return role.toLowerCase(); // Normalize to lowercase
}

/**
 * Extract user ID from JWT token
 */
export function getUserIdFromToken(token: string | null): string | null {
  if (!token) {
    return null;
  }
  
  const payload = decodeJWT(token);
  return payload?.userId || null;
}

/**
 * Check if JWT token is expired (client-side check)
 * Note: Backend also validates expiration
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) {
    return true;
  }
  
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }
  
  // exp is in seconds, Date.now() is in milliseconds
  const expirationTime = payload.exp * 1000;
  return Date.now() >= expirationTime;
}

