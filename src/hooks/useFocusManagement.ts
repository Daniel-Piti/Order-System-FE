import { useEffect, useRef, RefObject } from 'react';

/**
 * Hook for managing focus in modals and dynamic content
 * Implements WCAG 2.2 AA requirements for focus management
 */
export function useFocusManagement() {
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  /**
   * Trap focus within a container element (e.g., modal)
   * Prevents focus from escaping the modal when using Tab/Shift+Tab
   */
  const trapFocus = (containerRef: RefObject<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return;

    // Get all focusable elements within the container
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // If only one focusable element, keep focus on it
      if (focusableElements.length === 1) {
        e.preventDefault();
        firstFocusable.focus();
        return;
      }

      // Shift+Tab: going backwards
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab: going forwards
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Focus the first element
    firstFocusable.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  };

  /**
   * Save the currently focused element
   * Call this before opening a modal
   */
  const saveFocus = () => {
    previousActiveElementRef.current = document.activeElement as HTMLElement;
  };

  /**
   * Return focus to the previously focused element
   * Call this after closing a modal
   */
  const returnFocus = () => {
    if (previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
  };

  /**
   * Focus a specific element
   */
  const focusElement = (element: HTMLElement | null) => {
    if (element) {
      element.focus();
    }
  };

  /**
   * Focus the first focusable element in a container
   */
  const focusFirst = (containerRef: RefObject<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  };

  /**
   * Focus the last focusable element in a container
   */
  const focusLast = (containerRef: RefObject<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  };

  return {
    trapFocus,
    saveFocus,
    returnFocus,
    focusElement,
    focusFirst,
    focusLast,
  };
}

/**
 * Hook specifically for modal focus management
 * Combines saveFocus, trapFocus, and returnFocus in one hook
 */
export function useModalFocus(containerRef: RefObject<HTMLElement>, isOpen: boolean) {
  const { trapFocus, saveFocus, returnFocus } = useFocusManagement();

  useEffect(() => {
    if (isOpen) {
      // Save current focus before opening modal
      saveFocus();

      // Trap focus within modal
      const cleanup = trapFocus(containerRef);

      // Return cleanup function
      return () => {
        if (cleanup) cleanup();
        // Return focus when modal closes
        returnFocus();
      };
    } else {
      // Return focus when modal closes
      returnFocus();
    }
  }, [isOpen, containerRef]);
}

