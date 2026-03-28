import axios from 'axios';
import { getAuthToken } from '../utils/authUtils';

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
  const token = getAuthToken();
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
  id: string;
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

  createManager: async (data: NewManagerRequest): Promise<Manager> => {
    const response = await api.post<Manager>('/managers', data);
    return response.data;
  },

  deleteManager: async (managerId: string, email: string): Promise<string> => {
    const response = await api.delete<string>('/managers', {
      params: { managerId, email },
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

  updateCurrentManager: async (data: UpdateManagerDetailsRequest): Promise<Manager> => {
    const response = await api.put<Manager>('/managers/me', data);
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
  imageUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImageMetadata {
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  fileMd5Base64: string;
}

export interface UpdateBusinessDetailsRequest {
  name: string;
  stateIdNumber: string;
  email: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
}

export interface UpdateBusinessDetailsResponse {
  business: Business;
}

export interface SetBusinessImageResponse {
  business: Business;
  preSignedUrl: string;
}

export const businessAPI = {
  createBusiness: async (data: CreateBusinessRequest): Promise<Business> => {
    const response = await api.post<Business>('/businesses', data);
    return response.data;
  },

  getMyBusiness: async (): Promise<Business> => {
    const response = await api.get<Business>('/businesses/me');
    return response.data;
  },

  /** Update business details only (name, stateIdNumber, email, phoneNumber, streetAddress, city). */
  updateMyBusiness: async (data: UpdateBusinessDetailsRequest): Promise<UpdateBusinessDetailsResponse> => {
    const response = await api.put<UpdateBusinessDetailsResponse>('/businesses/me', data);
    return response.data;
  },

  removeBusinessImage: async (): Promise<void> => {
    await api.delete('/businesses/me/image');
  },

  setBusinessImage: async (imageMetadata: ImageMetadata): Promise<SetBusinessImageResponse> => {
    const response = await api.post<SetBusinessImageResponse>('/businesses/me/image', imageMetadata);
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

  createAgent: async (data: NewAgentRequest): Promise<Agent> => {
    const response = await api.post<Agent>('/agents', data);
    return response.data;
  },

  updateAgent: async (agentId: string, data: UpdateAgentRequest): Promise<Agent> => {
    const response = await api.put<Agent>(`/agents/${agentId}`, data);
    return response.data;
  },

  deleteAgent: async (agentId: string): Promise<string> => {
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
    pageNumber: number = 0,
    pageSize: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: string = 'DESC',
    status?: string,
    customerId?: string | null
  ): Promise<PageResponse<Order>> => {
    const params: Record<string, unknown> = { pageNumber, pageSize, sortBy, sortOrder };
    if (status) params.status = status;
    if (customerId != null) params.customerId = customerId;
    const response = await api.get<PageResponse<Order>>('/agent/orders', { params });
    return response.data;
  },

  getOrderById: async (orderId: string): Promise<Order> => {
    const response = await api.get<Order>(`/agent/orders/${orderId}`);
    return response.data;
  },

  createOrder: async (data: CreateOrderRequest): Promise<Order> => {
    const response = await api.post<Order>('/agent/orders', data);
    return response.data;
  },

  markOrderCancelled: async (orderId: string): Promise<Order> => {
    const response = await api.put<Order>(`/agent/orders/${orderId}/status/cancelled`);
    return response.data;
  },

  updateOrder: async (orderId: string, data: UpdateOrderRequest): Promise<Order> => {
    const response = await api.put<Order>(`/agent/orders/${orderId}`, data);
    return response.data;
  },

  updateOrderDiscount: async (orderId: string, discount: number): Promise<Order> => {
    const response = await api.put<Order>(`/agent/orders/${orderId}/discount`, { discount });
    return response.data;
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
  createLocation: async (data: LocationRequest): Promise<Location> => {
    const response = await api.post<Location>('/locations', data);
    return response.data;
  },

  updateLocation: async (locationId: number, data: LocationRequest): Promise<Location> => {
    const response = await api.put<Location>(`/locations/${locationId}`, data);
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
  name: string;
}

export interface Brand {
  id: number;
  managerId: string;
  name: string;
  imageUrl: string | null; // Full public URL from R2 (constructed from s3_key)
  fileName: string | null; // From brands.file_name (nullable)
  mimeType: string | null; // From brands.mime_type (nullable)
}

/** Product image data (id + mimeType + url) – included on product list/order responses. */
export interface ProductImageData {
  id: number;
  mimeType: string;
  url: string;
}

/** Public API product (store, order flow) – no minimum price. Includes images. */
export interface ProductPublic {
  id: string;
  managerId: string;
  name: string;
  brandId: number | null;
  brandName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  price: number;
  description: string;
  images?: ProductImageData[];
}

/** Internal API product (manager/agent) – includes minimum price and images. */
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
  images?: ProductImageData[];
}

export interface ProductInfo {
  name: string;
  brandId: number | null;
  categoryId: number | null;
  minimumPrice: number;
  price: number;
  description: string;
}

export interface CreateProductRequest {
  productInfo: ProductInfo;
  imagesMetadata: ImageMetadata[];
}

export interface CreateProductResponse {
  product: Product;
  imagesPreSignedUrls: string[];
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
  agentId: string | null;
  name: string;
  phoneNumber: string;
  email: string;
  streetAddress: string;
  city: string;
  stateId: string;
}

export interface CustomerRequest {
  name: string;
  phoneNumber: string;
  email: string;
  streetAddress: string;
  city: string;
  stateId: string;
  discountPercentage?: number;
}

export interface SelectedLocation {
  locationId: number | null;
  name: string | null;
  streetAddress: string | null;
  city: string | null;
  phoneNumber: string | null;
}

export interface Order {
  id: string;
  referenceId: number;
  orderSource: 'MANAGER' | 'AGENT' | 'PUBLIC';
  managerId: string;
  agentId: string | null;
  customerId: string | null;
  selectedLocation: SelectedLocation | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerStreetAddress: string | null;
  customerCity: string | null;
  customerStateId: string | null;
  status: 'EMPTY' | 'PLACED' | 'DONE' | 'EXPIRED' | 'CANCELLED';
  products: ProductDataForOrder[];
  productsVersion: number;
  totalPrice: number;
  discount: number;
  vat: number;
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
  referenceId: number;
  status: 'EMPTY' | 'PLACED' | 'DONE' | 'EXPIRED' | 'CANCELLED';
  customerId: string | null;
}

export interface CreateOrderRequest {
  customerId?: string | null;
}

export interface AgentLinkInfo {
  agentId: string;
  agentName: string;
  linkCount: number;
}

export interface LinksCreatedStats {
  managerLinks: number;
  agentLinks: number;
  total: number;
  linksPerAgent: Record<string, AgentLinkInfo>;
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
    pageNumber: number = 0,
    pageSize: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: string = 'DESC',
    status?: string,
    orderSource?: 'MANAGER' | 'AGENT' | 'PUBLIC' | null,
    agentId?: string | null,
    customerId?: string | null
  ): Promise<PageResponse<Order>> => {
    const params: Record<string, unknown> = { pageNumber, pageSize, sortBy, sortOrder };
    if (status) params.status = status;
    if (orderSource != null) params.orderSource = orderSource;
    if (agentId !== undefined && agentId !== null && agentId !== '') params.agentId = agentId;
    if (customerId != null) params.customerId = customerId;
    const response = await api.get<PageResponse<Order>>('/orders', { params });
    return response.data;
  },

  getOrderById: async (orderId: string): Promise<Order> => {
    const response = await api.get<Order>(`/orders/${orderId}`);
    return response.data;
  },

  createOrder: async (data: CreateOrderRequest): Promise<Order> => {
    const response = await api.post<Order>('/orders', data);
    return response.data;
  },

  markOrderDone: async (orderId: string): Promise<Order> => {
    await api.put(`/orders/${orderId}/status/done`);
    const response = await api.get<Order>(`/orders/${orderId}`);
    return response.data;
  },

  markOrderCancelled: async (orderId: string): Promise<Order> => {
    const response = await api.put<Order>(`/orders/${orderId}/status/cancelled`);
    return response.data;
  },

  updateOrder: async (orderId: string, data: UpdateOrderRequest): Promise<Order> => {
    const response = await api.put<Order>(`/orders/${orderId}`, data);
    return response.data;
  },

  updateOrderDiscount: async (orderId: string, discount: number): Promise<Order> => {
    const response = await api.put<Order>(`/orders/${orderId}/discount`, { discount });
    return response.data;
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
  createCategory: async (categoryName: string): Promise<Category> => {
    const response = await api.post<Category>('/categories', {
      name: categoryName,
    });
    return response.data;
  },

  updateCategory: async (categoryId: number, categoryName: string): Promise<Category> => {
    const response = await api.put<Category>(`/categories/${categoryId}`, {
      name: categoryName,
    });
    return response.data;
  },

  deleteCategory: async (categoryId: number): Promise<string> => {
    const response = await api.delete<string>(`/categories/${categoryId}`);
    return response.data;
  },
};

export interface CreateBrandResponse {
  brand: Brand;
  preSignedUrl?: string | null;
}

export interface UpdateBrandImageResponse {
  brand: Brand;
  preSignedUrl: string;
}

export const brandAPI = {
  /** Create brand (name + optional imageMetadata). Returns { brand, preSignedUrl? }; upload to preSignedUrl when present. */
  createBrand: async (data: { name: string; imageMetadata?: ImageMetadata }): Promise<CreateBrandResponse> => {
    const response = await api.post<CreateBrandResponse>('/brands', data);
    return response.data;
  },

  /** Update brand name only. Use removeBrandImage / setBrandImage for image changes. Returns the updated brand. */
  updateBrand: async (brandId: number, data: { name: string }): Promise<Brand> => {
    const response = await api.put<Brand>(`/brands/${brandId}`, data);
    return response.data;
  },

  removeBrandImage: async (brandId: number): Promise<void> => {
    await api.delete(`/brands/${brandId}/image`);
  },

  setBrandImage: async (
    brandId: number,
    imageMetadata: ImageMetadata
  ): Promise<UpdateBrandImageResponse> => {
    const response = await api.post<UpdateBrandImageResponse>(`/brands/${brandId}/image`, imageMetadata);
    return response.data;
  },
};

/** Shape used in the product edit modal for existing images (id required for delete). Built from ProductImageData + product context. */
export interface ProductImage {
  id: number;
  productId: string;
  managerId: string;
  url: string;
  fileName: string;
  mimeType: string;
}

export interface UploadProductImagesResponse {
  imagesPreSignedUrls: string[];
}

/** Manager product API (authenticated). Returns Product (with minimumPrice). */
export const productAPI = {
  getAllProducts: async (): Promise<Product[]> => {
    const response = await api.get<Product[]>('/products');
    return response.data;
  },

  getProduct: async (productId: string): Promise<Product> => {
    const response = await api.get<Product>(`/products/${productId}`);
    return response.data;
  },

  createProduct: async (request: CreateProductRequest): Promise<CreateProductResponse> => {
    const response = await api.post<CreateProductResponse>('/products', request);
    return response.data;
  },

  updateProductInfo: async (productId: string, productInfo: ProductInfo): Promise<Product> => {
    const response = await api.put<Product>(`/products/${productId}`, productInfo);
    return response.data;
  },

  deleteProduct: async (productId: string): Promise<void> => {
    await api.delete(`/products/${productId}`);
  },

  /** Delete product images by IDs. Only images belonging to this product are deleted. */
  deleteProductImages: async (productId: string, imageIds: number[]): Promise<void> => {
    await api.delete(`/products/${productId}/images`, { data: imageIds });
  },

  /** Get presigned URLs for new images; upload each file to the corresponding URL (PUT, Content-Type + Content-MD5). */
  uploadProductImages: async (
    productId: string,
    imagesMetadata: ImageMetadata[]
  ): Promise<UploadProductImagesResponse> => {
    const response = await api.post<UploadProductImagesResponse>(`/products/${productId}/images`, imagesMetadata);
    return response.data;
  },
};

// Public API (no authentication required) - for customers
export const publicAPI = {
  products: {
    // Get all products for a manager (seller) - no pagination, no minimum price (public)
    getAllByManagerId: async (managerId: string): Promise<ProductPublic[]> => {
      const response = await axios.get<ProductPublic[]>(`${API_BASE_URL}/public/products/manager/${managerId}`);
      return response.data;
    },

    // Get all products for a specific order (with overrides applied)
    getAllByOrderId: async (orderId: string): Promise<ProductPublic[]> => {
      const response = await axios.get<ProductPublic[]>(
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

  business: {
    // Get store header info (name + imageUrl) for a manager
    getByManagerId: async (managerId: string): Promise<{ name: string; imageUrl: string | null }> => {
      const response = await axios.get<{ name: string; imageUrl: string | null }>(
        `${API_BASE_URL}/public/business/manager/${managerId}`
      );
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
  customerStateId?: string;
  pickupLocationId: number;
  products: ProductDataForOrder[];
  notes?: string;
}

export interface UpdateOrderRequest {
  pickupLocationId: number;
  products: ProductDataForOrder[];
  notes?: string;
}

export const invoiceAPI = {
  createInvoice: async (data: CreateInvoiceRequest): Promise<CreateInvoiceResponse> => {
    const response = await api.post<CreateInvoiceResponse>('/invoices', data);
    return response.data;
  },

  getInvoicesByOrderIds: async (orderIds: string[]): Promise<Record<string, string>> => {
    const response = await api.post<Record<string, string>>('/invoices/by-order-ids', orderIds);
    return response.data;
  },

  downloadInvoicesDocument: async (from: string, to: string): Promise<Blob> => {
    const response = await api.get('/invoices/document', {
      params: { from, to },
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  searchInvoices: async (
    from: string,
    to: string,
    pageNumber: number = 0,
    pageSize: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: string = 'DESC',
  ): Promise<PageResponse<InvoiceWithOrderTotal>> => {
    const response = await api.get<PageResponse<InvoiceWithOrderTotal>>('/invoices/search', {
      params: { from, to, pageNumber, pageSize, sortBy, sortOrder },
    });
    return response.data;
  },
};

export interface CreateInvoiceRequest {
  orderId: string;
  paymentMethod: 'CREDIT_CARD' | 'CASH';
  paymentProof: string;
  allocationNumber?: string | null;
}

export interface CreateInvoiceResponse {
  invoiceId: number;
  invoiceName: string;
  pdfUrl: string;
}

/** Domain invoice (matches BE [Invoice]) */
export interface Invoice {
  id: number;
  managerId: string;
  orderId: string;
  invoiceSequenceNumber: number;
  paymentMethod: 'CREDIT_CARD' | 'CASH';
  paymentProof: string;
  allocationNumber?: string | null;
  s3Key?: string | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  mimeType?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** BE [InvoiceWithOrderTotal] — invoice + public PDF URL + order total */
export interface InvoiceWithOrderTotal {
  invoice: Invoice;
  pdfUrl: string;
  orderTotalPrice: number;
}

export default api;

