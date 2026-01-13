import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAriaLive } from './AriaLiveRegionContext';

interface AccessibilitySettings {
  fontSize: 'small' | 'normal' | 'large' | 'extra-large';
  contrast: 'normal' | 'high';
  spacing: 'normal' | 'increased';
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 'normal',
  contrast: 'normal',
  spacing: 'normal',
};

const STORAGE_KEY = 'accessibility-settings';

export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const widgetRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const announce = useAriaLive();

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AccessibilitySettings;
        setSettings(parsed);
        applySettings(parsed);
      } catch (e) {
        console.error('Failed to load accessibility settings:', e);
      }
    }
  }, []);

  // Apply settings to document
  const applySettings = useCallback((newSettings: AccessibilitySettings) => {
    const root = document.documentElement;
    
    // Font size
    root.classList.remove('font-size-small', 'font-size-normal', 'font-size-large', 'font-size-extra-large');
    root.classList.add(`font-size-${newSettings.fontSize}`);
    
    // Contrast
    root.classList.remove('contrast-normal', 'contrast-high');
    root.classList.add(`contrast-${newSettings.contrast}`);
    
    // Spacing
    root.classList.remove('spacing-normal', 'spacing-increased');
    root.classList.add(`spacing-${newSettings.spacing}`);
  }, []);

  // Save settings to localStorage and apply
  const updateSettings = useCallback((newSettings: AccessibilitySettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    applySettings(newSettings);
  }, [applySettings]);

  // Handle font size change
  const handleFontSizeChange = useCallback((size: AccessibilitySettings['fontSize']) => {
    const newSettings = { ...settings, fontSize: size };
    updateSettings(newSettings);
    
    const sizeLabels = {
      small: 'קטן',
      normal: 'רגיל',
      large: 'גדול',
      'extra-large': 'גדול מאוד',
    };
    announce(`גודל גופן שונה ל-${sizeLabels[size]}`);
  }, [settings, updateSettings, announce]);

  // Handle contrast change
  const handleContrastChange = useCallback((contrast: AccessibilitySettings['contrast']) => {
    const newSettings = { ...settings, contrast };
    updateSettings(newSettings);
    
    const contrastLabels = {
      normal: 'רגיל',
      high: 'גבוה',
    };
    announce(`ניגודיות שונתה ל-${contrastLabels[contrast]}`);
  }, [settings, updateSettings, announce]);

  // Handle spacing change
  const handleSpacingChange = useCallback((spacing: AccessibilitySettings['spacing']) => {
    const newSettings = { ...settings, spacing };
    updateSettings(newSettings);
    
    const spacingLabels = {
      normal: 'רגיל',
      increased: 'מוגדל',
    };
    announce(`מרווחים שונו ל-${spacingLabels[spacing]}`);
  }, [settings, updateSettings, announce]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    updateSettings(DEFAULT_SETTINGS);
    announce('הגדרות נגישות אופסו לברירת מחדל');
  }, [updateSettings, announce]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle Escape key to close menu
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt + A to toggle widget (Windows/Linux)
      // Option + A to toggle widget (Mac)
      if ((event.altKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        setIsOpen(!isOpen);
        if (!isOpen) {
          buttonRef.current?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={widgetRef} className="fixed bottom-6 left-6 z-[9999]" dir="rtl">
      {/* Toggle Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg
          hover:bg-indigo-700 focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2
          transition-all duration-200 flex items-center justify-center
          ${isOpen ? 'bg-indigo-700 scale-105' : ''}
        `}
        aria-label="פתח תפריט נגישות"
        aria-expanded={isOpen}
        aria-controls="accessibility-menu"
        aria-haspopup="true"
      >
        <svg
          className="w-10 h-10"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          {/* Full body person icon */}
          {/* Head */}
          <circle cx="12" cy="6" r="2.5" strokeWidth={2} />
          {/* Body */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8.5v6M12 8.5l-2 2M12 8.5l2 2"
          />
          {/* Legs */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 14.5l-2 4M12 14.5l2 4"
          />
        </svg>
      </button>

      {/* Menu Panel */}
      {isOpen && (
        <div
          id="accessibility-menu"
          className="absolute bottom-20 left-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-6"
          role="menu"
          aria-label="תפריט נגישות"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <h2 className="text-xl font-bold text-gray-800">הגדרות נגישות</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
              aria-label="סגור תפריט נגישות"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              גודל גופן
            </label>
            <div className="grid grid-cols-4 gap-2" role="group" aria-label="גודל גופן">
              {(['small', 'normal', 'large', 'extra-large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => handleFontSizeChange(size)}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all
                    focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2
                    ${
                      settings.fontSize === size
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                  role="menuitemradio"
                  aria-checked={settings.fontSize === size}
                >
                  {size === 'small' && 'א'}
                  {size === 'normal' && 'א'}
                  {size === 'large' && 'א'}
                  {size === 'extra-large' && 'א'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              קטן | רגיל | גדול | גדול מאוד
            </p>
          </div>

          {/* Contrast */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              ניגודיות
            </label>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="ניגודיות">
              {(['normal', 'high'] as const).map((contrast) => (
                <button
                  key={contrast}
                  onClick={() => handleContrastChange(contrast)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all
                    focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2
                    ${
                      settings.contrast === contrast
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                  role="menuitemradio"
                  aria-checked={settings.contrast === contrast}
                >
                  {contrast === 'normal' ? 'רגיל' : 'גבוה'}
                </button>
              ))}
            </div>
          </div>

          {/* Spacing */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              מרווחים
            </label>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="מרווחים">
              {(['normal', 'increased'] as const).map((spacing) => (
                <button
                  key={spacing}
                  onClick={() => handleSpacingChange(spacing)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all
                    focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2
                    ${
                      settings.spacing === spacing
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                  role="menuitemradio"
                  aria-checked={settings.spacing === spacing}
                >
                  {spacing === 'normal' ? 'רגיל' : 'מוגדל'}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Button */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleReset}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
              role="menuitem"
            >
              איפוס הגדרות
            </button>
          </div>

          {/* Keyboard Shortcut Hint */}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            <p className="text-xs text-gray-600 text-center">
              קיצור מקלדת: Alt + A (או Option + A ב-Mac)
            </p>
            
            {/* Accessibility Statement & Contact */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Show accessibility statement in a modal/alert
                  const statement = `
הצהרת נגישות

האתר עומד בתקן WCAG 2.2 Level AA.

האתר כולל:
• ניווט מקלדת מלא
• תמיכה בקוראי מסך
• התאמת גודל גופן
• התאמת ניגודיות
• התאמת מרווחים
• קישורי דילוג לתוכן

לשאלות או דיווח על בעיות נגישות:
support@order-it-app.com

תאריך עדכון אחרון: ${new Date().toLocaleDateString('he-IL')}
                  `.trim();
                  alert(statement);
                }}
                className="block w-full text-xs text-indigo-600 hover:text-indigo-700 underline text-center focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2 rounded"
                role="menuitem"
              >
                הצהרת נגישות
              </button>
              <a
                href="mailto:support@order-it-app.com?subject=דיווח על בעיית נגישות&body=שלום,%0D%0A%0D%0Aאני מעוניין/ת לדווח על בעיית נגישות באתר.%0D%0A%0D%0Aתיאור הבעיה:%0D%0A%0D%0A%0D%0Aדף/מסך שבו נתקלתי בבעיה:%0D%0A%0D%0A%0D%0Aתודה"
                className="block text-xs text-indigo-600 hover:text-indigo-700 underline text-center focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2 rounded"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                דיווח על בעיית נגישות
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

