import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AgentLoginPage from './pages/AgentLoginPage';
import AgentLayout from './components/AgentLayout';
import AgentProfilePage from './pages/AgentProfilePage';
import AgentCustomersPage from './pages/AgentCustomersPage';
import AgentsPage from './pages/AgentsPage';
import AdminDashboard from './pages/AdminDashboard';
import UserLayout from './components/UserLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ProfilePage from './pages/ProfilePage';
import OrdersPage from './pages/OrdersPage';
import CustomersPage from './pages/CustomersPage';
import CustomerOverridesPage from './pages/CustomerOverridesPage';
import ProductsPage from './pages/ProductsPage';
import OverridesPage from './pages/OverridesPage';
import CategoriesPage from './pages/CategoriesPage';
import BrandsPage from './pages/BrandsPage';
import LocationsPage from './pages/LocationsPage';
import StorePage from './pages/StorePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login/manager" replace />} />
        <Route path="/login/manager" element={<LoginPage />} />
        <Route path="/login/agent" element={<AgentLoginPage />} />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route
          path="/agent/dashboard"
          element={
            <ProtectedRoute redirectTo="/login/agent" allowedRoles={['agent']}>
              <AgentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/agent/dashboard/profile" replace />} />
          <Route path="profile" element={<AgentProfilePage />} />
          <Route path="customers" element={<AgentCustomersPage />} />
        </Route>
        
        {/* Public Store Routes - more specific route first */}
        <Route path="/store/order/:orderId" element={<StorePage />} />
        <Route path="/store/:userId" element={<StorePage />} />
        
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute redirectTo="/admin" allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* User Dashboard Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['manager', 'admin']}>
              <UserLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard/profile" replace />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="customers/:customerId/overrides" element={<CustomerOverridesPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="overrides" element={<OverridesPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="brands" element={<BrandsPage />} />
          <Route path="locations" element={<LocationsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login/manager" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
