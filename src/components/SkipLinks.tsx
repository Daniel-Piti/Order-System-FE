export default function SkipLinks() {
  const handleSkipToMain = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const mainElement = document.querySelector('main');
    
    if (mainElement) {
      const isMobile = window.innerWidth < 1024;
      
      // On mobile, close sidebar if it's open so user can see the main content
      if (isMobile) {
        const toggleButton = document.querySelector('[aria-controls="main-navigation"], [aria-controls="agent-navigation"]') as HTMLElement;
        
        if (toggleButton) {
          // Check if sidebar is open by checking aria-expanded
          const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
          
          if (isExpanded) {
            // Close the sidebar first
            toggleButton.click();
            // Wait for sidebar to close, then focus main content
            setTimeout(() => {
              mainElement.setAttribute('tabindex', '-1');
              (mainElement as HTMLElement).focus();
              mainElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              setTimeout(() => {
                mainElement.removeAttribute('tabindex');
              }, 1000);
            }, 300);
            return;
          }
        }
      }
      
      // On desktop or if sidebar is already closed, just focus main content
      mainElement.setAttribute('tabindex', '-1');
      (mainElement as HTMLElement).focus();
      mainElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        mainElement.removeAttribute('tabindex');
      }, 1000);
    }
  };

  const handleSkipToNavigation = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const navElement = document.querySelector('nav');
    const asideElement = document.querySelector('aside');
    const targetElement = navElement || asideElement;
    
    if (targetElement) {
      const isMobile = window.innerWidth < 1024;
      const toggleButton = document.querySelector('[aria-controls="main-navigation"], [aria-controls="agent-navigation"]') as HTMLElement;
      
      // On mobile, open sidebar first if it's closed
      if (isMobile && toggleButton) {
        const aside = asideElement as HTMLElement;
        const isCurrentlyOpen = aside && !aside.classList.contains('translate-x-full');
        
        if (!isCurrentlyOpen) {
          // Sidebar is closed, open it first
          toggleButton.click();
          // Wait for sidebar to open, then focus first nav item
          setTimeout(() => {
            const firstNavLink = targetElement.querySelector('a, button') as HTMLElement;
            if (firstNavLink) {
              firstNavLink.focus();
            }
          }, 300);
          return;
        }
      }
      
      // On desktop (sidebar always visible) or mobile (sidebar already open), focus first nav item
      const firstNavLink = targetElement.querySelector('a, button') as HTMLElement;
      if (firstNavLink) {
        firstNavLink.focus();
        // Scroll into view if needed (for mobile)
        if (isMobile) {
          firstNavLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  };

  return (
    <div className="skip-links" dir="rtl">
      <a
        href="#main-content"
        onClick={handleSkipToMain}
        onKeyDown={(e) => {
          // Handle Enter and Space keys for keyboard accessibility
          if (e.key === 'Enter' || e.key === ' ') {
            handleSkipToMain(e as any);
          }
        }}
        className="skip-link"
        aria-label="דלג לתוכן הראשי"
      >
        דלג לתוכן הראשי
      </a>
      <a
        href="#navigation"
        onClick={handleSkipToNavigation}
        onKeyDown={(e) => {
          // Handle Enter and Space keys for keyboard accessibility
          if (e.key === 'Enter' || e.key === ' ') {
            handleSkipToNavigation(e as any);
          }
        }}
        className="skip-link"
        aria-label="דלג לניווט"
      >
        דלג לניווט
      </a>
    </div>
  );
}

