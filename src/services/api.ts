import axios from 'axios';

// Get API URL from environment variable, fallback to relative URL (works with Vite proxy locally and same-domain in production)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ManagerLoginRequest {
  email: string;
  password: string;
}

export interface AgentLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginRequest {
  adminUserName: string;
  password: string;
  userEmail?: string;
}

export interface LoginResponse {
  token: string;
}

export interface Manager {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  streetAddress: string;
  city: string;
  createdAt: string;
  updatedAt: string;
}

export const authAPI = {
  loginManager: async (data: ManagerLoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login/manager', data);
    return response.data;
  },

  loginAgent: async (data: AgentLoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login/agent', data);
    return response.data;
  },

  loginAdmin: async (data: AdminLoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login/admin', data);
    return response.data;
  },
};

export interface NewManagerRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  dateOfBirth: string;
  streetAddress: string;
  city: string;
}

export interface UpdateManagerDetailsRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: string;
  streetAddress: string;
  city: string;
}

export interface Agent {
  id: number;
  managerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewAgentRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
}

export interface UpdateAgentRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
}

export const managerAPI = {
  getAllManagers: async (): Promise<Manager[]> => {
    const response = await api.get<Manager[]>('/managers');
    return response.data;
  },

  createManager: async (data: NewManagerRequest): Promise<string> => {
    const response = await api.post<string>('/managers', data);
    return response.data;
  },

  deleteManager: async (id: string, email: string): Promise<string> => {
    const response = await api.delete<string>('/managers', {
      params: { id, email },
    });
    return response.data;
  },

  resetPassword: async (email: string, newPassword: string): Promise<string> => {
    const response = await api.put<string>('/managers/reset-password', null, {
      params: { email, newPassword },
    });
    return response.data;
  },

  getCurrentManager: async (): Promise<Manager> => {
    const response = await api.get<Manager>('/managers/me');
    return response.data;
  },

  updateCurrentManager: async (data: UpdateManagerDetailsRequest): Promise<string> => {
    const response = await api.put<string>('/managers/me', data);
    return response.data;
  },

  updateCurrentManagerPassword: async (
    oldPassword: string,
    newPassword: string,
    newPasswordConfirmation: string
  ): Promise<string> => {
    const response = await api.put<string>('/managers/me/update-password', null, {
      params: {
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      },
    });
    return response.data;
  },
};

export interface CreateBusinessRequest {
  managerId: string;
  name: string;
  stateIdNumber: string;
  email: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
}

export interface Business {
  id: string;
  managerId: string;
  name: string;
  stateIdNumber: string;
  email: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
  createdAt: string;
  updatedAt: string;
}

export const businessAPI = {
  createBusiness: async (data: CreateBusinessRequest): Promise<string> => {
    const response = await api.post<string>('/businesses', data);
    return response.data;
  },

  getMyBusiness: async (): Promise<Business> => {
    const response = await api.get<Business>('/businesses/me');
    return response.data;
  },

  updateMyBusiness: async (data: {
    name: string;
    stateIdNumber: string;
    email: string;
    phoneNumber: string;
    streetAddress: string;
    city: string;
  }): Promise<Business> => {
    const response = await api.put<Business>('/businesses/me', data);
    return response.data;
  },

  getBusinessesByManagerIds: async (managerIds: string[]): Promise<Record<string, Business>> => {
    const response = await api.post<Record<string, Business>>('/businesses/by-managers', managerIds);
    return response.data;
  },
};

export const customerAPI = {
  getAllCustomers: async (): Promise<Customer[]> => {
    const response = await api.get<Customer[]>('/manager/customers');
    return response.data;
  },

  getCustomer: async (customerId: string): Promise<Customer> => {
    const response = await api.get<Customer>(`/manager/customers/${customerId}`);
    return response.data;
  },

  createCustomer: async (data: CustomerRequest): Promise<Customer> => {
    const response = await api.post<Customer>('/manager/customers', data);
    return response.data;
  },

  updateCustomer: async (customerId: string, data: CustomerRequest): Promise<Customer> => {
    const response = await api.put<Customer>(`/manager/customers/${customerId}`, data);
    return response.data;
  },

  deleteCustomer: async (customerId: string): Promise<string> => {
    const response = await api.delete<string>(`/manager/customers/${customerId}`);
    return response.data;
  },
};

export const agentAPI = {
  getCurrentAgent: async (): Promise<Agent> => {
    const response = await api.get<Agent>('/agents/me');
    return response.data;
  },

  getAgentsForManager: async (): Promise<Agent[]> => {
    const response = await api.get<Agent[]>('/agents');
    return response.data;
  },

  createAgent: async (data: NewAgentRequest): Promise<number> => {
    const response = await api.post<number>('/agents', data);
    return response.data;
  },

  updateAgent: async (agentId: number, data: UpdateAgentRequest): Promise<Agent> => {
    const response = await api.put<Agent>(`/agents/${agentId}`, data);
    return response.data;
  },

  deleteAgent: async (agentId: number): Promise<string> => {
    const response = await api.delete<string>(`/agents/${agentId}`);
    return response.data;
  },

  updateCurrentAgent: async (data: UpdateAgentRequest): Promise<Agent> => {
    const response = await api.put<Agent>('/agents/me', data);
    return response.data;
  },

  updateCurrentAgentPassword: async (
    oldPassword: string,
    newPassword: string,
    newPasswordConfirmation: string
  ): Promise<string> => {
    const response = await api.put<string>('/agents/me/update-password', null, {
      params: {
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      },
    });
    return response.data;
  },

  getCustomersForAgent: async (): Promise<Customer[]> => {
    const response = await api.get<Customer[]>('/agent/customers');
    return response.data;
  },

  createCustomerForAgent: async (data: CustomerRequest): Promise<Customer> => {
    const response = await api.post<Customer>('/agent/customers', data);
    return response.data;
  },

  updateCustomerForAgent: async (customerId: string, data: CustomerRequest): Promise<Customer> => {
    const response = await api.put<Customer>(`/agent/customers/${customerId}`, data);
    return response.data;
  },

  deleteCustomerForAgent: async (customerId: string): Promise<void> => {
    await api.delete(`/agent/customers/${customerId}`);
  },

  // Agent Orders API
  getAllOrders: async (
    page: number = 0,
    size: number = 20,
    sortBy: string = 'createdAt',
    sortDirection: string = 'DESC',
    status?: string
  ): Promise<PageResponse<Order>> => {
    const params: any = { page, size, sortBy, sortDirection };
    if (status) {
      params.status = status;
    }
    const response = await api.get<PageResponse<Order>>('/agent/orders', { params });
    return response.data;
  },

  getOrderById: async (orderId: string): Promise<Order> => {
    const response = await api.get<Order>(`/agent/orders/${orderId}`);
    return response.data;
  },

  createOrder: async (data: CreateOrderRequest): Promise<string> => {
    const response = await api.post<string>('/agent/orders', data);
    return response.data;
  },

  markOrderCancelled: async (orderId: string): Promise<void> => {
    await api.put(`/agent/orders/${orderId}/status/cancelled`);
  },

  updateOrder: async (orderId: string, data: UpdateOrderRequest): Promise<void> => {
    await api.put(`/agent/orders/${orderId}`, data);
  },
};

export interface Location {
  id: number;
  managerId: string;
  name: string;
  streetAddress: string;
  city: string;
  phoneNumber: string;
}

export interface LocationRequest {
  name: string;
  streetAddress: string;
  city: string;
  phoneNumber: string;
}

export const locationAPI = {
  getAllLocations: async (): Promise<Location[]> => {
    const response = await api.get<Location[]>('/locations');
    return response.data;
  },

  createLocation: async (data: LocationRequest): Promise<number> => {
    const response = await api.post<number>('/locations', data);
    return response.data;
  },

  updateLocation: async (locationId: number, data: LocationRequest): Promise<number> => {
    const response = await api.put<number>(`/locations/${locationId}`, data);
    return response.data;
  },

  deleteLocation: async (locationId: number): Promise<string> => {
    const response = await api.delete<string>(`/locations/${locationId}`);
    return response.data;
  },
};

export interface Category {
  id: number;
  managerId: string;
  category: string;
}

export interface Brand {
  id: number;
  managerId: string;
  name: string;
  imageUrl: string | null; // Full public URL from R2 (constructed from s3_key)
  fileName: string | null; // From brands.file_name (nullable)
  mimeType: string | null; // From brands.mime_type (nullable)
}

export interface Product {
  id: string;
  managerId: string;
  name: string;
  brandId: number | null;
  brandName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  minimumPrice: number;
  price: number;
  description: string;
}

export interface ProductDataForOrder {
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface Customer {
  discountPercentage: number;
  id: string;
  managerId: string;
  agentId: number | null;
  name: string;
  phoneNumber: string;
  email: string;
  streetAddress: string;
  city: string;
}

export interface CustomerRequest {
  name: string;
  phoneNumber: string;
  email: string;
  streetAddress: string;
  city: string;
  discountPercentage?: number;
}

export interface Order {
  id: string;
  orderSource: 'MANAGER' | 'AGENT' | 'PUBLIC';
  managerId: string;
  agentId: number | null;
  customerId: string | null;
  storeStreetAddress: string | null;
  storeCity: string | null;
  storePhoneNumber: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerStreetAddress: string | null;
  customerCity: string | null;
  status: 'EMPTY' | 'PLACED' | 'DONE' | 'EXPIRED' | 'CANCELLED';
  products: ProductDataForOrder[];
  productsVersion: number;
  totalPrice: number;
  linkExpiresAt: string;
  notes: string;
  placedAt: string | null;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Minimal public order DTO (for order links)
export interface OrderPublic {
  managerId: string;
  status: 'EMPTY' | 'PLACED' | 'DONE' | 'EXPIRED' | 'CANCELLED';
  customerId: string | null;
}

export interface CreateOrderRequest {
  customerId?: string | null;
}

export interface AgentLinkInfo {
  agentId: number;
  agentName: string;
  linkCount: number;
}

export interface LinksCreatedStats {
  managerLinks: number;
  agentLinks: number;
  total: number;
  linksPerAgent: Record<number, AgentLinkInfo>;
}

export interface MonthlyData {
  month: number;
  monthName: string;
  revenue: number;
  completedOrders: number;
}

export interface BusinessStats {
  linksCreatedThisMonth: LinksCreatedStats;
  monthlyIncome: number;
  yearlyData: MonthlyData[];
}

export const orderAPI = {
  getAllOrders: async (
    page: number = 0,
    size: number = 20,
    sortBy: string = 'createdAt',
    sortDirection: string = 'DESC',
    status?: string,
    filterAgent: boolean = false,
    agentId?: number | null
  ): Promise<PageResponse<Order>> => {
    const params: any = { page, size, sortBy, sortDirection, filterAgent };
    if (status) {
      params.status = status;
    }
    if (agentId !== undefined && agentId !== null) {
      params.agentId = agentId;
    }
    const response = await api.get<PageResponse<Order>>('/orders', { params });
    return response.data;
  },

  getOrderById: async (orderId: string): Promise<Order> => {
    const response = await api.get<Order>(`/orders/${orderId}`);
    return response.data;
  },

  createOrder: async (data: CreateOrderRequest): Promise<string> => {
    const response = await api.post<string>('/orders', data);
    return response.data;
  },

  markOrderDone: async (orderId: string): Promise<void> => {
    await api.put(`/orders/${orderId}/status/done`);
  },

  markOrderCancelled: async (orderId: string): Promise<void> => {
    await api.put(`/orders/${orderId}/status/cancelled`);
  },

  updateOrder: async (orderId: string, data: UpdateOrderRequest): Promise<void> => {
    await api.put(`/orders/${orderId}`, data);
  },

  getBusinessStats: async (year?: number, month?: number): Promise<BusinessStats> => {
    const params: any = {};
    if (year !== undefined) params.year = year;
    if (month !== undefined) params.month = month;
    const response = await api.get<BusinessStats>('/business-stats', { params });
    return response.data;
  },

  getLinksCreatedStats: async (year?: number, month?: number): Promise<LinksCreatedStats> => {
    const params: any = {};
    if (year !== undefined) params.year = year;
    if (month !== undefined) params.month = month;
    const response = await api.get<LinksCreatedStats>('/business-stats/links-created', { params });
    return response.data;
  },

  getMonthlyIncome: async (year?: number, month?: number): Promise<number> => {
    const params: any = {};
    if (year !== undefined) params.year = year;
    if (month !== undefined) params.month = month;
    const response = await api.get<number>('/business-stats/monthly-income', { params });
    return response.data;
  },

  getCompletedOrdersCount: async (year?: number, month?: number): Promise<number> => {
    const params: any = {};
    if (year !== undefined) params.year = year;
    if (month !== undefined) params.month = month;
    const response = await api.get<number>('/business-stats/completed-orders', { params });
    return response.data;
  },

  getYearlyData: async (year?: number): Promise<MonthlyData[]> => {
    const params: any = {};
    if (year !== undefined) params.year = year;
    const response = await api.get<MonthlyData[]>('/business-stats/yearly-data', { params });
    return response.data;
  },
};

export const categoryAPI = {
  createCategory: async (categoryName: string): Promise<number> => {
    const response = await api.post<number>('/categories', {
      category: categoryName,
    });
    return response.data;
  },

  updateCategory: async (categoryId: number, categoryName: string): Promise<number> => {
    const response = await api.put<number>(`/categories/${categoryId}`, {
      category: categoryName,
    });
    return response.data;
  },

  deleteCategory: async (categoryId: number): Promise<string> => {
    const response = await api.delete<string>(`/categories/${categoryId}`);
    return response.data;
  },
};

// Public API (no authentication required) - for customers
export const publicAPI = {
  products: {
    // Get all products for a manager (seller) with pagination
    getAllByManagerId: async (
      managerId: string,
      page: number = 0,
      size: number = 20,
      sortBy: string = 'name',
      sortDirection: string = 'ASC',
      categoryId?: number,
      brandId?: number
    ): Promise<PageResponse<Product>> => {
      const params: any = { page, size, sortBy, sortDirection };
      if (categoryId) {
        params.categoryId = categoryId;
      }
      if (brandId) {
        params.brandId = brandId;
      }
      const response = await axios.get<PageResponse<Product>>(`${API_BASE_URL}/public/products/manager/${managerId}`, { params });
      return response.data;
    },

    // Get single product by managerId and productId
    getByManagerIdAndProductId: async (managerId: string, productId: string): Promise<Product> => {
      const response = await axios.get<Product>(`${API_BASE_URL}/public/products/manager/${managerId}/product/${productId}`);
      return response.data;
    },

    // Get all products for a specific order (with overrides applied) - no pagination, no category filter
    getAllByOrderId: async (orderId: string): Promise<Product[]> => {
      const response = await axios.get<Product[]>(
        `${API_BASE_URL}/public/products/order/${orderId}`
      );
      return response.data;
    },
  },

  categories: {
    // Get all categories for a manager (seller)
    getAllByManagerId: async (managerId: string): Promise<Category[]> => {
      const response = await axios.get<Category[]>(`${API_BASE_URL}/public/categories/manager/${managerId}`);
      return response.data;
    },

    // Get single category by managerId and categoryId
    getByManagerIdAndCategoryId: async (managerId: string, categoryId: number): Promise<Category> => {
      const response = await axios.get<Category>(`${API_BASE_URL}/public/categories/manager/${managerId}/category/${categoryId}`);
      return response.data;
    },
  },

  brands: {
    // Get all brands for a manager (seller)
    getAllByManagerId: async (managerId: string): Promise<Brand[]> => {
      const response = await axios.get<Brand[]>(`${API_BASE_URL}/public/brands/manager/${managerId}`);
      return response.data;
    },
  },

  orders: {
    // Get minimal order info (for customer viewing via link)
    getById: async (orderId: string): Promise<OrderPublic> => {
      const response = await axios.get<OrderPublic>(`${API_BASE_URL}/public/orders/${orderId}`);
      return response.data;
    },

    // Place an order (for existing orders)
    placeOrder: async (orderId: string, request: PlaceOrderRequest): Promise<string> => {
      const response = await axios.put<string>(`${API_BASE_URL}/public/orders/${orderId}/place`, request);
      return response.data;
    },

    // Create and place a public order (for public store - no existing order)
    createAndPlacePublicOrder: async (managerId: string, request: PlaceOrderRequest): Promise<string> => {
      const response = await axios.post<string>(`${API_BASE_URL}/public/orders/manager/${managerId}/create`, request);
      return response.data;
    },
  },

  locations: {
    // Get all locations for a manager (seller)
    getAllByManagerId: async (managerId: string): Promise<Location[]> => {
      const response = await axios.get<Location[]>(`${API_BASE_URL}/public/locations/manager/${managerId}`);
      return response.data;
    },
  },
};

export interface PlaceOrderRequest {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerStreetAddress: string;
  customerCity: string;
  pickupLocationId: number;
  products: ProductDataForOrder[];
  notes?: string;
}

export interface UpdateOrderRequest {
  pickupLocationId: number;
  products: ProductDataForOrder[];
  notes?: string;
}

export default api;

