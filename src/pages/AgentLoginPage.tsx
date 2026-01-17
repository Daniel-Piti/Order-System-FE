import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAriaLive } from '../components/AriaLiveRegionContext';

export default function AgentLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();
  const { announce } = useAriaLive();

  // Announce errors to screen readers
  useEffect(() => {
    if (error) {
      announce(error, 'assertive');
    }
  }, [error, announce]);

  useEffect(() => {
    if (emailError) {
      announce(emailError, 'polite');
    }
  }, [emailError, announce]);

  useEffect(() => {
    if (passwordError) {
      announce(passwordError, 'polite');
    }
  }, [passwordError, announce]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setPasswordError('');

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    let hasError = false;

    if (!trimmedEmail) {
      setEmailError('אנא הזן את כתובת האימייל שלך');
      hasError = true;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setEmailError('אנא הזן כתובת אימייל תקינה');
        hasError = true;
      }
    }

    if (!trimmedPassword) {
      setPasswordError('אנא הזן את הסיסמה שלך');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.loginAgent({ email: trimmedEmail, password: trimmedPassword });
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('userRole', 'agent');
      announce('התחברות בוצעה בהצלחה', 'polite');
      navigate('/agent/dashboard/profile');
    } catch (err: any) {
      const errorMsg = 'אימייל או סיסמה לא תקינים';
      setError(errorMsg);
      announce(errorMsg, 'assertive');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Login Card */}
      <div className="glass-card rounded-3xl p-8 w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-400 via-sky-500 to-sky-600 mb-6 shadow-xl shadow-sky-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <svg
              className="w-10 h-10 text-white relative z-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">פורטל סוכן</h1>
          <p className="text-gray-600">התחבר כדי לראות את המשימות שלך</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5" method="post" autoComplete="on" noValidate>
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
            <label htmlFor="agent-email" className="block text-sm font-medium text-gray-700 mb-2">
              אימייל <span className="text-red-500" aria-label="שדה חובה">*</span>
            </label>
            <input
              id="agent-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              className={`glass-input w-full px-4 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 text-center ${
                emailError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-sky-500'
              }`}
              placeholder="agent@example.com"
              autoComplete="email"
              dir="ltr"
              aria-required="true"
              aria-invalid={emailError ? 'true' : 'false'}
              aria-describedby={emailError ? 'agent-email-error' : undefined}
            />
            {emailError && (
              <div id="agent-email-error" role="alert" className="mt-1 text-sm text-red-600" aria-live="polite">
                {emailError}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="agent-password" className="block text-sm font-medium text-gray-700 mb-2">
              סיסמה <span className="text-red-500" aria-label="שדה חובה">*</span>
            </label>
            <input
              id="agent-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              className={`glass-input w-full px-4 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 text-center ${
                passwordError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-sky-500'
              }`}
              placeholder="••••••••"
              autoComplete="current-password"
              dir="ltr"
              aria-required="true"
              aria-invalid={passwordError ? 'true' : 'false'}
              aria-describedby={passwordError ? 'agent-password-error' : undefined}
            />
            {passwordError && (
              <div id="agent-password-error" role="alert" className="mt-1 text-sm text-red-600" aria-live="polite">
                {passwordError}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="glass-button w-full py-3 px-4 rounded-xl font-semibold text-gray-800 
                     hover:shadow-sky-200 disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center space-x-2 focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
            aria-label={isLoading ? 'מתחבר...' : 'התחבר לחשבון סוכן'}
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
                <span>מתחבר...</span>
              </>
            ) : (
              <span>התחבר</span>
            )}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-gray-600 -mb-4">
          <div>
            חזרה להתחברות מנהל?{' '}
            <Link 
              to="/login/manager" 
              className="text-sky-600 hover:text-sky-700 font-medium focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2 rounded"
              aria-label="חזרה להתחברות מנהל"
            >
              התחבר כאן
            </Link>
          </div>
          <div className="pt-3 border-t border-gray-300/50">
            <Link 
              to="/home" 
              className="text-sky-600 hover:text-sky-700 font-medium focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2 rounded"
              aria-label="חזרה לדף הבית"
            >
              ← חזרה לדף הבית
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

