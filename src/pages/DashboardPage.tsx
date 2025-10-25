export default function DashboardPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="glass-card rounded-3xl p-8 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Dashboard</h1>
        <p className="text-gray-600">
          Welcome to your dashboard! You've successfully logged in.
        </p>
        <button
          onClick={() => {
            localStorage.removeItem('authToken');
            window.location.href = '/';
          }}
          className="glass-button mt-6 px-6 py-2 rounded-xl font-medium"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}


