import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAriaLive } from '../components/AriaLiveRegionContext';

export default function AdminLoginPage() {
  const [adminUserName, setAdminUserName] = useState('');
  const [password, setPassword] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminUserNameError, setAdminUserNameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [userEmailError, setUserEmailError] = useState('');
  const navigate = useNavigate();
  const { announce } = useAriaLive();

  // Announce errors to screen readers
  useEffect(() => {
    if (error) {
      announce(error, 'assertive');
    }
  }, [error, announce]);

  useEffect(() => {
    if (adminUserNameError) {
      announce(adminUserNameError, 'polite');
    }
  }, [adminUserNameError, announce]);

  useEffect(() => {
    if (passwordError) {
      announce(passwordError, 'polite');
    }
  }, [passwordError, announce]);

  useEffect(() => {
    if (userEmailError) {
      announce(userEmailError, 'polite');
    }
  }, [userEmailError, announce]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAdminUserNameError('');
    setPasswordError('');
    setUserEmailError('');

    // Trim inputs
    const trimmedAdminUserName = adminUserName.trim();
    const trimmedPassword = password.trim();
    const trimmedUserEmail = userEmail.trim();

    // Validate inputs
    let hasError = false;

    if (!trimmedAdminUserName) {
      setAdminUserNameError('Please enter your admin username');
      hasError = true;
    }
    
    if (!trimmedPassword) {
      setPasswordError('Please enter your admin password');
      hasError = true;
    }
    
    // Validate email format if provided
    if (trimmedUserEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedUserEmail)) {
        setUserEmailError('Please enter a valid user email address');
        hasError = true;
      }
    }

    if (hasError) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.loginAdmin({
        adminUserName: trimmedAdminUserName,
        password: trimmedPassword,
        userEmail: trimmedUserEmail || undefined,
      });
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('userRole', 'admin');
      announce('Login successful', 'polite');
      navigate('/admin/dashboard');
    } catch (err: any) {
      // Always show the same message for security (prevent user enumeration)
      const errorMsg = 'Invalid admin credentials';
      setError(errorMsg);
      announce(errorMsg, 'assertive');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Admin Login Card */}
      <div className="glass-card rounded-3xl p-8 w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass-button mb-4">
            <svg
              className="w-8 h-8 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Portal</h1>
          <p className="text-gray-600">Sign in with administrator credentials</p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-5" method="post" autoComplete="on" noValidate>
          {error && (
            <div 
              role="alert"
              className="glass-card bg-red-50/50 border-red-200 rounded-xl p-3 text-red-600 text-sm"
              aria-live="assertive"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="adminUserName" className="block text-sm font-medium text-gray-700 mb-2">
              Admin Username <span className="text-red-500" aria-label="required">*</span>
            </label>
            <input
              id="adminUserName"
              type="text"
              value={adminUserName}
              onChange={(e) => {
                setAdminUserName(e.target.value);
                if (adminUserNameError) setAdminUserNameError('');
              }}
              className={`glass-input w-full px-4 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 ${
                adminUserNameError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-indigo-500'
              }`}
              placeholder="admin"
              autoComplete="username"
              aria-required="true"
              aria-invalid={adminUserNameError ? 'true' : 'false'}
              aria-describedby={adminUserNameError ? 'adminUserName-error' : undefined}
            />
            {adminUserNameError && (
              <div id="adminUserName-error" role="alert" className="mt-1 text-sm text-red-600" aria-live="polite">
                {adminUserNameError}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Admin Password <span className="text-red-500" aria-label="required">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              className={`glass-input w-full px-4 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 ${
                passwordError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-indigo-500'
              }`}
              placeholder="••••••••"
              autoComplete="current-password"
              aria-required="true"
              aria-invalid={passwordError ? 'true' : 'false'}
              aria-describedby={passwordError ? 'password-error' : undefined}
            />
            {passwordError && (
              <div id="password-error" role="alert" className="mt-1 text-sm text-red-600" aria-live="polite">
                {passwordError}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-2">
              User Email <span className="text-gray-500 text-xs">(Optional - to impersonate user)</span>
            </label>
            <input
              id="userEmail"
              type="email"
              value={userEmail}
              onChange={(e) => {
                setUserEmail(e.target.value);
                if (userEmailError) setUserEmailError('');
              }}
              className={`glass-input w-full px-4 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 ${
                userEmailError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-indigo-500'
              }`}
              placeholder="user@example.com"
              autoComplete="email"
              aria-required="false"
              aria-invalid={userEmailError ? 'true' : 'false'}
              aria-describedby={userEmailError ? 'userEmail-error' : 'userEmail-help'}
            />
            {userEmailError ? (
              <div id="userEmail-error" role="alert" className="mt-1 text-sm text-red-600" aria-live="polite">
                {userEmailError}
              </div>
            ) : (
              <p id="userEmail-help" className="text-xs text-gray-500 mt-1">
                Leave empty to login as pure admin, or enter a user email to login as that user with admin privileges
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="glass-button w-full py-3 px-4 rounded-xl font-semibold text-gray-800 
                     hover:shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center space-x-2 focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
            aria-label={isLoading ? 'Signing in...' : 'Sign in as admin'}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-gray-800"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In as Admin</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

