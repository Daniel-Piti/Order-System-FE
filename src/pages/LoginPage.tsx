import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const navigate = useNavigate();

  const ADMIN_PHONE = '050-5566979';
  const ADMIN_PHONE_TEL = '0505566979'; // Without dashes for tel: link

  const handleContactAdmin = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Detect if mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                    ('ontouchstart' in window) || 
                    (navigator.maxTouchPoints > 0);

    if (isMobile) {
      // Open phone app on mobile
      window.location.href = `tel:${ADMIN_PHONE_TEL}`;
    } else {
      // Copy to clipboard on desktop
      try {
        await navigator.clipboard.writeText(ADMIN_PHONE);
        setShowCopiedMessage(true);
        setIsFadingOut(false);
        // Stay visible for 1.5 seconds, then fade out
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            setShowCopiedMessage(false);
            setIsFadingOut(false);
          }, 300); // Fade out duration
        }, 1500);
      } catch (err) {
        // Fallback if clipboard API fails
        const textArea = document.createElement('textarea');
        textArea.value = ADMIN_PHONE;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          setShowCopiedMessage(true);
          setIsFadingOut(false);
          // Stay visible for 1.5 seconds, then fade out
          setTimeout(() => {
            setIsFadingOut(true);
            setTimeout(() => {
              setShowCopiedMessage(false);
              setIsFadingOut(false);
            }, 300); // Fade out duration
          }, 1500);
        } catch (fallbackErr) {
          // Show popup with phone number if copy fails
          alert(`Admin Phone: ${ADMIN_PHONE}`);
        }
        document.body.removeChild(textArea);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Trim inputs
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    // Validate inputs
    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!trimmedPassword) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.loginManager({ email: trimmedEmail, password: trimmedPassword });
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('userRole', 'manager');
      navigate('/dashboard');
    } catch (err: any) {
      // Always show the same message for security (prevent user enumeration)
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Login Card */}
      <div className="glass-card rounded-3xl p-8 w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 mb-6 shadow-xl shadow-purple-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <svg
              className="w-10 h-10 text-white relative z-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Manager Portal</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="glass-card bg-red-50/50 border-red-200 rounded-xl p-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-input w-full px-4 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input w-full px-4 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center text-sm">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-gray-600">Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="glass-button w-full py-3 px-4 rounded-xl font-semibold text-gray-800 
                     hover:shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-gray-800"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
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
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-gray-600">
          <div>
            Need an account?{' '}
            <a 
              href={`tel:${ADMIN_PHONE_TEL}`}
              onClick={handleContactAdmin}
              className="text-purple-600 hover:text-purple-700 font-medium cursor-pointer"
            >
              Contact Admin
            </a>
          </div>
          <div>
            Are you an agent?{' '}
            <Link to="/login/agent" className="text-purple-600 hover:text-purple-700 font-medium">
              Login here
            </Link>
          </div>
        </div>
      </div>

      {/* Fixed notification at bottom of page */}
      {showCopiedMessage && (
        <div className={`fixed bottom-8 left-1/2 px-4 py-2.5 backdrop-blur-xl bg-green-500/90 border-2 border-green-700 text-white text-sm font-semibold rounded-xl shadow-2xl shadow-green-500/50 z-50 ${isFadingOut ? 'animate-fade-out' : 'animate-slide-up-bottom'}`}>
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Phone number copied!</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

