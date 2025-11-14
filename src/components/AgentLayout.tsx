import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const menuItems = [
  { name: 'Profile', path: '/agent/dashboard/profile', icon: '👤' },
  { name: 'Orders', path: '/agent/dashboard/orders', icon: '📦' },
  { name: 'Customers', path: '/agent/dashboard/customers', icon: '🗂️' },
  { name: 'Products', path: '/agent/dashboard/products', icon: '🛍️' },
  { name: 'Overrides', path: '/agent/dashboard/overrides', icon: '💰' },
];

export default function AgentLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    navigate('/login/agent');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-cyan-50 to-indigo-100">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-card border-b border-white/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            aria-label="Toggle navigation"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isSidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-800 flex-1">Dashboard</h1>
          {/* Notification Button - Mobile Only */}
          <button
            onClick={() => {
              // TODO: Open notifications panel
              console.log('Notifications clicked');
            }}
            className="relative p-2 rounded-lg backdrop-blur-xl bg-white/40 border border-white/50 hover:bg-white/60 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 group"
            aria-label="Notifications"
          >
            <svg
              className="w-6 h-6 text-gray-800 group-hover:text-sky-600 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {/* Notification Badge - Only show when count > 0 */}
            {/* TODO: Replace with actual notification count */}
            {/* {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold shadow-lg border-2 border-white/60 animate-pulse">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )} */}
          </button>
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
          fixed top-0 left-0 h-full w-64 backdrop-blur-xl bg-white/70 border-r-2 border-white/40 shadow-2xl z-50 transition-transform duration-300
          lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6 h-full flex flex-col">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
              {/* Notification Button */}
              <button
                onClick={() => {
                  // TODO: Open notifications panel
                  console.log('Notifications clicked');
                }}
                className="relative p-2 rounded-xl backdrop-blur-xl bg-white/40 border border-white/50 hover:bg-white/60 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 group"
                aria-label="Notifications"
              >
                <svg
                  className="w-5 h-5 text-gray-800 group-hover:text-sky-600 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {/* Notification Badge - Only show when count > 0 */}
                {/* TODO: Replace with actual notification count */}
                {/* {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold shadow-lg border-2 border-white/60 animate-pulse">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )} */}
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-8">Agent Console</p>

            <nav className="space-y-2">
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 select-none ${
                      isActive
                        ? 'backdrop-blur-2xl bg-sky-400/30 text-sky-900 font-semibold border border-sky-300/60 shadow-2xl shadow-sky-400/40 ring-2 ring-sky-200/30'
                        : 'backdrop-blur-xl bg-white/90 text-gray-800 hover:bg-white/95 border border-gray-300/70 hover:border-gray-400/80 shadow-xl shadow-gray-300/60 hover:shadow-2xl hover:shadow-gray-400/60'
                    }`
                  }
                >
                  <span className="text-xl" aria-hidden>{item.icon}</span>
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="mt-auto pt-8">
            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 rounded-xl font-semibold text-gray-800 flex items-center justify-center space-x-2 backdrop-blur-xl bg-white/90 hover:bg-red-50/90 border border-gray-300/70 hover:border-red-400/80 shadow-xl shadow-gray-300/60 hover:shadow-2xl hover:shadow-red-300/60 transition-all duration-200 select-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-20 lg:pt-6 p-6">
        <Outlet />
      </main>
    </div>
  );
}

