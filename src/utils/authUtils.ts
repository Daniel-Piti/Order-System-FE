/**
 * Central place for auth storage keys and clearing.
 * Use clearAuth() on logout or when token is invalid/expired (e.g. 401/403).
 */
const AUTH_TOKEN_KEY = 'authToken';
const USER_ROLE_KEY = 'userRole';

export function clearAuth(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getAuthRole(): string | null {
  return localStorage.getItem(USER_ROLE_KEY);
}
