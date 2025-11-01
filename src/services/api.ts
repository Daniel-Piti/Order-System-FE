import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

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

export interface LoginRequest {
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

export interface User {
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
  loginUser: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  loginAdmin: async (data: AdminLoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login/admin', data);
    return response.data;
  },
};

export interface NewUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  dateOfBirth: string;
  streetAddress: string;
  city: string;
}

export interface UpdateUserDetailsRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: string;
  streetAddress: string;
  city: string;
}

export const userAPI = {
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/users');
    return response.data;
  },

  createUser: async (data: NewUserRequest): Promise<string> => {
    const response = await api.post<string>('/users', data);
    return response.data;
  },

  deleteUser: async (id: string, email: string): Promise<string> => {
    const response = await api.delete<string>('/users', {
      params: { id, email },
    });
    return response.data;
  },

  resetPassword: async (email: string, newPassword: string): Promise<string> => {
    const response = await api.put<string>('/users/reset-password', null, {
      params: { email, newPassword },
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/users/me');
    return response.data;
  },

  updateCurrentUser: async (data: UpdateUserDetailsRequest): Promise<string> => {
    const response = await api.put<string>('/users/me', data);
    return response.data;
  },

  updateCurrentUserPassword: async (
    oldPassword: string,
    newPassword: string,
    newPasswordConfirmation: string
  ): Promise<string> => {
    const response = await api.put<string>('/users/me/update-password', null, {
      params: {
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      },
    });
    return response.data;
  },
};

export interface Location {
  id: number;
  userId: string;
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
  userId: string;
  category: string;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  categoryId: number | null;
  originalPrice: number;
  specialPrice: number;
  description: string;
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
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  email: string;
  streetAddress: string;
  city: string;
}

export const categoryAPI = {
  getAllCategories: async (): Promise<Category[]> => {
    const response = await api.get<Category[]>('/categories');
    return response.data;
  },

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

export interface ProductRequest {
  name: string;
  categoryId: number | null;
  originalPrice: number;
  specialPrice: number;
  description: string;
}

export const productAPI = {
  getAllProducts: async (page: number = 0, size: number = 20, sortBy: string = 'name', sortDirection: string = 'ASC', categoryId?: number): Promise<PageResponse<Product>> => {
    const params: any = { page, size, sortBy, sortDirection };
    if (categoryId) {
      params.categoryId = categoryId;
    }
    const response = await api.get<PageResponse<Product>>('/products', { params });
    return response.data;
  },

  createProduct: async (data: ProductRequest): Promise<string> => {
    const response = await api.post<string>('/products', data);
    return response.data;
  },

  updateProduct: async (productId: string, data: ProductRequest): Promise<string> => {
    const response = await api.put<string>(`/products/${productId}`, data);
    return response.data;
  },

  deleteProduct: async (productId: string): Promise<string> => {
    const response = await api.delete<string>(`/products/${productId}`);
    return response.data;
  },
};

export interface CustomerRequest {
  name: string;
  phoneNumber: string;
  email: string;
  streetAddress: string;
  city: string;
}

export const customerAPI = {
  getAllCustomers: async (): Promise<Customer[]> => {
    const response = await api.get<Customer[]>('/customers');
    return response.data;
  },

  createCustomer: async (data: CustomerRequest): Promise<Customer> => {
    const response = await api.post<Customer>('/customers', data);
    return response.data;
  },

  updateCustomer: async (customerId: string, data: CustomerRequest): Promise<Customer> => {
    const response = await api.put<Customer>(`/customers/${customerId}`, data);
    return response.data;
  },

  deleteCustomer: async (customerId: string): Promise<string> => {
    const response = await api.delete<string>(`/customers/${customerId}`);
    return response.data;
  },
};

export interface ProductDataForOrder {
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
}

export interface Order {
  id: string;
  userId: string;
  userStreetAddress: string | null;
  userCity: string | null;
  userPhoneNumber: string | null;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerStreetAddress: string | null;
  customerCity: string | null;
  status: 'EMPTY' | 'PLACED' | 'DONE' | 'EXPIRED' | 'CANCELLED';
  products: ProductDataForOrder[];
  productsVersion: number;
  totalPrice: number;
  deliveryDate: string | null;
  linkExpiresAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmptyOrderRequest {
  customerId?: string | null;
}

export const orderAPI = {
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
    const response = await api.get<PageResponse<Order>>('/orders', { params });
    return response.data;
  },

  getOrderById: async (orderId: string): Promise<Order> => {
    const response = await api.get<Order>(`/orders/${orderId}`);
    return response.data;
  },

  createEmptyOrder: async (data: CreateEmptyOrderRequest): Promise<string> => {
    const response = await api.post<string>('/orders', data);
    return response.data;
  },
};

// Public API (no authentication required) - for customers
export const publicAPI = {
  products: {
    // Get all products for a user (seller) with pagination
    getAllByUserId: async (
      userId: string,
      page: number = 0,
      size: number = 20,
      sortBy: string = 'name',
      sortDirection: string = 'ASC',
      categoryId?: number
    ): Promise<PageResponse<Product>> => {
      const params: any = { page, size, sortBy, sortDirection };
      if (categoryId) {
        params.categoryId = categoryId;
      }
      const response = await axios.get<PageResponse<Product>>(`${API_BASE_URL}/public/products/user/${userId}`, { params });
      return response.data;
    },

    // Get single product by userId and productId
    getByUserIdAndProductId: async (userId: string, productId: string): Promise<Product> => {
      const response = await axios.get<Product>(`${API_BASE_URL}/public/products/user/${userId}/product/${productId}`);
      return response.data;
    },

    // Get products for a specific order (with overrides applied)
    getAllByOrderId: async (orderId: string): Promise<Product[]> => {
      const response = await axios.get<Product[]>(`${API_BASE_URL}/public/products/order/${orderId}`);
      return response.data;
    },
  },

  categories: {
    // Get all categories for a user (seller)
    getAllByUserId: async (userId: string): Promise<Category[]> => {
      const response = await axios.get<Category[]>(`${API_BASE_URL}/public/categories/user/${userId}`);
      return response.data;
    },

    // Get single category by userId and categoryId
    getByUserIdAndCategoryId: async (userId: string, categoryId: number): Promise<Category> => {
      const response = await axios.get<Category>(`${API_BASE_URL}/public/categories/user/${userId}/category/${categoryId}`);
      return response.data;
    },
  },

  orders: {
    // Get order details (for customer viewing via link)
    getById: async (orderId: string): Promise<Order> => {
      const response = await axios.get<Order>(`${API_BASE_URL}/public/orders/${orderId}`);
      return response.data;
    },
  },
};

export default api;

