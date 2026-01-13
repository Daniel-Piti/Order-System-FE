import { createContext, useContext, useState, ReactNode } from 'react';
import AriaLiveRegion from './AriaLiveRegion';

interface AriaLiveContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  clear: () => void;
}

const AriaLiveContext = createContext<AriaLiveContextType | undefined>(undefined);

interface AriaLiveProviderProps {
  children: ReactNode;
}

/**
 * Provider component for AriaLiveRegion
 * Allows any component to announce messages to screen readers
 */
export function AriaLiveProvider({ children }: AriaLiveProviderProps) {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'polite' | 'assertive'>('polite');

  const announce = (newMessage: string, newPriority: 'polite' | 'assertive' = 'polite') => {
    setPriority(newPriority);
    setMessage(newMessage);
    
    // Clear message after a delay to allow re-announcement
    setTimeout(() => {
      setMessage('');
    }, 1000);
  };

  const clear = () => {
    setMessage('');
  };

  return (
    <AriaLiveContext.Provider value={{ announce, clear }}>
      {children}
      <AriaLiveRegion message={message} priority={priority} />
    </AriaLiveContext.Provider>
  );
}

/**
 * Hook to use AriaLiveRegion from any component
 * Usage: const { announce } = useAriaLive();
 *        announce('הזמנה נוצרה בהצלחה');
 */
export function useAriaLive() {
  const context = useContext(AriaLiveContext);
  if (context === undefined) {
    throw new Error('useAriaLive must be used within an AriaLiveProvider');
  }
  return context;
}

