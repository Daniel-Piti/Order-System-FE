import { useEffect, useRef } from 'react';

interface AriaLiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  id?: string;
}

/**
 * AriaLiveRegion component for announcing dynamic content changes to screen readers
 * WCAG 2.2 AA compliant - ensures screen reader users are informed of important changes
 */
export default function AriaLiveRegion({ 
  message, 
  priority = 'polite',
  id = 'aria-live-region'
}: AriaLiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clear and set message to ensure screen readers announce changes
    if (regionRef.current && message) {
      // Clear first to ensure re-announcement
      regionRef.current.textContent = '';
      // Use setTimeout to ensure the clear happens before the new message
      setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = message;
        }
      }, 100);
    }
  }, [message]);

  if (!message) {
    return null;
  }

  return (
    <div
      ref={regionRef}
      id={id}
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
      aria-relevant="additions text"
    >
      {message}
    </div>
  );
}

