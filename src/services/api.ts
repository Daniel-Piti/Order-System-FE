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
  id: string;
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

  createLocation: async (data: LocationRequest): Promise<string> => {
    const response = await api.post<string>('/locations', data);
    return response.data;
  },

  updateLocation: async (locationId: string, data: LocationRequest): Promise<string> => {
    const response = await api.put<string>(`/locations/${locationId}`, data);
    return response.data;
  },

  deleteLocation: async (locationId: string): Promise<string> => {
    const response = await api.delete<string>(`/locations/${locationId}`);
    return response.data;
  },
};

export interface Category {
  id: string;
  userId: string;
  category: string;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  categoryId: string | null;
  originalPrice: number;
  specialPrice: number;
  description: string;
  pictureUrl: string | null;
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
}

export const categoryAPI = {
  getAllCategories: async (): Promise<Category[]> => {
    const token = localStorage.getItem('authToken');
    // Extract userId from token
    const payload = token ? JSON.parse(atob(token.split('.')[1])) : null;
    const userId = payload?.userId;
    
    if (!userId) {
      throw new Error('User ID not found');
    }
    
    const response = await api.get<Category[]>(`/categories/user/${userId}`);
    return response.data;
  },

  createCategory: async (categoryName: string): Promise<string> => {
    const response = await api.post<string>('/categories', {
      category: categoryName,
    });
    return response.data;
  },

  updateCategory: async (categoryId: string, categoryName: string): Promise<string> => {
    const response = await api.put<string>(`/categories/${categoryId}`, {
      category: categoryName,
    });
    return response.data;
  },
};

export const productAPI = {
  getAllProducts: async (page: number = 0, size: number = 20, sortBy: string = 'name', sortDirection: string = 'ASC', categoryId?: string): Promise<PageResponse<Product>> => {
    const params: any = { page, size, sortBy, sortDirection };
    if (categoryId) {
      params.categoryId = categoryId;
    }
    const response = await api.get<PageResponse<Product>>('/products', { params });
    return response.data;
  },
};

export interface CustomerRequest {
  name: string;
  phoneNumber: string;
  email: string;
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

export default api;

