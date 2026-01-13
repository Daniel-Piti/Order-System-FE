import { useState, useEffect, useRef, useCallback } from 'react';

const COOKIE_CONSENT_KEY = 'cookie-consent';
const COOKIE_CONSENT_EXPIRY_DAYS = 365; // Consent valid for 1 year

interface CookieConsentData {
  accepted: boolean;
  timestamp: number;
  preferences?: {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
  };
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const bannerRef = useRef<HTMLDivElement>(null);
  const acceptButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Check if consent already exists in localStorage
    const checkConsent = () => {
      try {
        const consentData = localStorage.getItem(COOKIE_CONSENT_KEY);
        
        if (!consentData) {
          // No consent found, show banner
          setShowBanner(true);
          setIsLoading(false);
          return;
        }

        const parsed: CookieConsentData = JSON.parse(consentData);
        const now = Date.now();
        const expiryTime = parsed.timestamp + (COOKIE_CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

        // Check if consent has expired
        if (now > expiryTime) {
          // Consent expired, show banner again
          setShowBanner(true);
          setIsLoading(false);
          return;
        }

        // Consent is valid, don't show banner
        setShowBanner(false);
        setIsLoading(false);
      } catch (error) {
        // If there's an error parsing, show banner to be safe
        console.error('Error reading cookie consent:', error);
        setShowBanner(true);
        setIsLoading(false);
      }
    };

    checkConsent();
  }, []);

  const saveConsent = useCallback((accepted: boolean, preferences?: CookieConsentData['preferences']) => {
    const consentData: CookieConsentData = {
      accepted,
      timestamp: Date.now(),
      preferences,
    };

    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));
    } catch (error) {
      console.error('Error saving cookie consent to localStorage:', error);
      // Continue anyway - hide banner even if localStorage fails
      // (e.g., in private browsing mode with storage disabled)
    }
    
    // Always hide banner after user makes a choice
    setShowBanner(false);
  }, []);

  // Auto-focus first button when banner appears (for keyboard users)
  useEffect(() => {
    if (showBanner && acceptButtonRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        acceptButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showBanner]);

  // Handle Escape key (optional - for cookie consent, we might not want to allow closing)
  // But for accessibility, we'll allow it and treat it as reject
  useEffect(() => {
    if (!showBanner) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Treat Escape as reject (privacy-first approach)
        saveConsent(false, {
          essential: true,
          analytics: false,
          marketing: false,
        });
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showBanner, saveConsent]);

  const handleAccept = () => {
    // Accept all cookies
    saveConsent(true, {
      essential: true,
      analytics: true,
      marketing: true,
    });
  };

  const handleReject = () => {
    // Reject all non-essential cookies
    saveConsent(false, {
      essential: true, // Essential cookies are always required
      analytics: false,
      marketing: false,
    });
  };

  // Don't render anything while checking consent
  if (isLoading) {
    return null;
  }

  // Don't render if consent already given
  if (!showBanner) {
    return null;
  }

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      aria-live="polite"
      className="fixed bottom-0 right-0 left-0 z-[10000] bg-white/95 backdrop-blur-xl border-t-2 border-gray-300 shadow-2xl"
      dir="rtl"
      onKeyDown={(e) => {
        // Handle keyboard navigation
        if (e.key === 'Escape') {
          saveConsent(false, {
            essential: true,
            analytics: false,
            marketing: false,
          });
        }
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Content */}
          <div className="flex-1">
            <h2
              id="cookie-consent-title"
              className="text-lg font-semibold text-gray-900 mb-2"
            >
              שימוש בעוגיות
            </h2>
            <p
              id="cookie-consent-description"
              className="text-sm text-gray-700 leading-relaxed"
            >
              אנו משתמשים בעוגיות כדי לשפר את החוויה שלך באתר. על ידי המשך השימוש באתר, אתה מסכים לשימוש בעוגיות בהתאם למדיניות הפרטיות שלנו.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={handleReject}
              onKeyDown={(e) => {
                // Ensure Enter and Space work
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleReject();
                }
              }}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 hover:border-gray-400 transition-all duration-200 focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
              aria-label="דחה עוגיות - דחיית כל העוגיות שאינן חיוניות"
            >
              דחה
            </button>
            <button
              ref={acceptButtonRef}
              onClick={handleAccept}
              onKeyDown={(e) => {
                // Ensure Enter and Space work
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleAccept();
                }
              }}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 border-2 border-indigo-700 hover:border-indigo-800 shadow-lg hover:shadow-xl transition-all duration-200 focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
              aria-label="קבל עוגיות - קבלת כל סוגי העוגיות"
            >
              קבל
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

