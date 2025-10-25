import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import UserLayout from './components/UserLayout';
import ProfilePage from './pages/ProfilePage';
import OrdersPage from './pages/OrdersPage';
import CustomersPage from './pages/CustomersPage';
import CustomerOverridesPage from './pages/CustomerOverridesPage';
import ProductsPage from './pages/ProductsPage';
import OverridesPage from './pages/OverridesPage';
import CategoriesPage from './pages/CategoriesPage';
import LocationsPage from './pages/LocationsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        
        {/* User Dashboard Routes */}
        <Route path="/dashboard" element={<UserLayout />}>
          <Route index element={<Navigate to="/dashboard/profile" replace />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:customerId/overrides" element={<CustomerOverridesPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="overrides" element={<OverridesPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="locations" element={<LocationsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
