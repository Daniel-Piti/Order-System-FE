import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export default function UserLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    navigate('/');
  };

  const menuItems = [
    { name: 'פרופיל', path: '/dashboard/profile', icon: '👤' },
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
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isSidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-800 flex-1">תפריט</h1>
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 right-0 h-screen w-64 backdrop-blur-xl bg-white/70 border-l-2 border-white/40 shadow-2xl z-50 transition-transform duration-300 overflow-hidden
          lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ maxHeight: '100vh', height: '100vh' }}
      >
        <div className="h-full flex flex-col p-6 pb-6 overflow-hidden" style={{ maxHeight: '100%' }}>
          <div className="mb-8 flex-shrink-0">
            <h1 className="text-2xl font-bold text-gray-800">
              תפריט
            </h1>
          </div>

          <nav className="space-y-2 flex-1 overflow-y-auto pl-2 min-h-0 scrollbar-hide mb-4">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 select-none ${
                    isActive
                      ? 'backdrop-blur-2xl bg-indigo-400/30 text-indigo-800 font-semibold border border-indigo-300/60 shadow-2xl shadow-indigo-400/40 ring-2 ring-indigo-200/30'
                      : 'backdrop-blur-xl bg-white/90 text-gray-800 hover:bg-white/95 border border-gray-300/70 hover:border-gray-400/80 shadow-xl shadow-gray-300/60 hover:shadow-2xl hover:shadow-gray-400/60'
                  }`
                }
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto pt-4 pb-2 flex-shrink-0 border-t border-gray-200/50">
            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 rounded-xl font-semibold text-gray-800 flex items-center justify-center gap-2 backdrop-blur-xl bg-white/90 hover:bg-red-50/90 border border-gray-300/70 hover:border-red-400/80 shadow-xl shadow-gray-300/60 hover:shadow-2xl hover:shadow-red-300/60 transition-all duration-200 select-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:mr-64 min-h-screen pt-20 lg:pt-6 p-6">
        <Outlet />
      </main>
    </div>
  );
}

