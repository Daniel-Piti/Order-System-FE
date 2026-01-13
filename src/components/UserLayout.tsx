import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export default function UserLayout() {
  // On desktop, sidebar is always open. On mobile, it starts closed.
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Ensure sidebar state matches screen size on mount and resize
  useEffect(() => {
    const handleResize = () => {
      // On large screens, sidebar should be open
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      }
    };
    
    // Set initial state based on screen size
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    navigate('/');
  };

  const menuItems = [
    { name: 'פרופיל מנהל', path: '/dashboard/profile', icon: '👤' },
    { name: 'פרופיל עסק', path: '/dashboard/business-data', icon: '🏢' },
    { name: 'הזמנות', path: '/dashboard/orders', icon: '📦' },
    { name: 'מידע עסקי', path: '/dashboard/business-info', icon: '📊' },
    { name: 'סוכנים', path: '/dashboard/agents', icon: '🧑‍🤝‍🧑' },
    { name: 'לקוחות', path: '/dashboard/customers', icon: '👥' },
    { name: 'מוצרים', path: '/dashboard/products', icon: '🛍️' },
    { name: 'מחירים מיוחדים', path: '/dashboard/overrides', icon: '💰' },
    { name: 'קטגוריות', path: '/dashboard/categories', icon: '📂' },
    { name: 'מותגים', path: '/dashboard/brands', icon: '🏢' },
    { name: 'סניפים', path: '/dashboard/locations', icon: '📍' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100" dir="rtl">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 right-0 left-0 z-40 glass-card border-b border-white/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsSidebarOpen(!isSidebarOpen);
              }
            }}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
            aria-label={isSidebarOpen ? 'סגור תפריט' : 'פתח תפריט'}
            aria-expanded={isSidebarOpen}
            aria-controls="main-navigation"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isSidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <h2 className="text-xl font-bold text-gray-800 flex-1">תפריט</h2>
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsSidebarOpen(false);
            }
          }}
          role="button"
          tabIndex={-1}
          aria-label="סגור תפריט"
        />
      )}

      {/* Sidebar */}
      <aside
        id="main-navigation"
        aria-label="ניווט ראשי"
        className={`
          fixed top-0 right-0 h-screen w-64 backdrop-blur-xl bg-white/70 border-l-2 border-white/40 shadow-2xl z-50 transition-transform duration-300
          lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        onKeyDown={(e) => {
          // Close sidebar on Escape key (only on mobile)
          if (e.key === 'Escape' && isSidebarOpen) {
            const isMobile = window.innerWidth < 1024;
            if (isMobile) {
              setIsSidebarOpen(false);
              // Return focus to menu toggle button
              const toggleButton = document.querySelector('[aria-controls="main-navigation"]') as HTMLElement;
              toggleButton?.focus();
            }
          }
        }}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 p-6 pb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              תפריט
            </h2>
          </div>

          {/* Scrollable Menu */}
          <nav 
            className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide"
            aria-label="תפריט ניווט"
          >
            <div className="space-y-2 pt-2">
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 select-none focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2 ${
                      isActive
                        ? 'backdrop-blur-2xl bg-indigo-400/30 text-indigo-800 font-semibold border border-indigo-300/60 shadow-2xl shadow-indigo-400/40 ring-2 ring-indigo-200/30'
                        : 'backdrop-blur-xl bg-white/90 text-gray-800 hover:bg-white/95 border border-gray-300/70 hover:border-gray-400/80 shadow-xl shadow-gray-300/60 hover:shadow-2xl hover:shadow-gray-400/60'
                    }`
                  }
                  aria-current={({ isActive }) => isActive ? 'page' : undefined}
                >
                  <span className="text-xl" aria-hidden="true">{item.icon}</span>
                  <span>{item.name}</span>
                </NavLink>
              ))}
              
              {/* Logout Button as part of menu */}
              <button
                onClick={handleLogout}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleLogout();
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 select-none backdrop-blur-xl bg-red-50/90 text-red-600 hover:bg-red-100/90 border border-red-200/70 hover:border-red-300/80 shadow-xl shadow-gray-300/60 hover:shadow-2xl hover:shadow-gray-400/60 font-semibold focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                aria-label="התנתק מהמערכת"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>התנתק</span>
              </button>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        id="main-content"
        className="lg:mr-64 min-h-screen pt-20 lg:pt-6 p-6"
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </div>
  );
}

