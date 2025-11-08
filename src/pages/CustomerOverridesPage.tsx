import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicAPI } from '../services/api';
import type { PageResponse, Customer } from '../services/api';
import type { ProductOverride, ProductListItem } from '../utils/types';
import { formatPrice } from '../utils/formatPrice';

const MAX_PRICE = 1_000_000;

export default function CustomerOverridesPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [overrides, setOverrides] = useState<ProductOverride[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Edit customer modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    streetAddress: '',
    city: '',
  });
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit override modal
  const [isEditOverrideModalOpen, setIsEditOverrideModalOpen] = useState(false);
  const [overrideToEdit, setOverrideToEdit] = useState<ProductOverride | null>(null);
  const [editOverridePrice, setEditOverridePrice] = useState('');
  const [overrideFormError, setOverrideFormError] = useState('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Delete override modal
  const [overrideToDelete, setOverrideToDelete] = useState<ProductOverride | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add override modal
  const [isAddOverrideModalOpen, setIsAddOverrideModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newOverridePrice, setNewOverridePrice] = useState('');
  const [addOverrideError, setAddOverrideError] = useState('');
  const [isSubmittingNewOverride, setIsSubmittingNewOverride] = useState(false);

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
      fetchOverrides();
    }
  }, [customerId, currentPage, pageSize]);

  const fetchCustomer = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8080/api/customers/${customerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch customer');
      const data = await response.json();
      setCustomer(data);
    } catch (err) {
      console.error('Failed to fetch customer:', err);
      setError('Failed to load customer information');
    }
  };

  const fetchOverrides = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `http://localhost:8080/api/product-overrides?customerId=${customerId}&page=${currentPage}&size=${pageSize}&sortBy=product_id&sortDirection=ASC`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch overrides');
      const data: PageResponse<ProductOverride> = await response.json();
      
      setOverrides(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      console.error('Failed to fetch overrides:', err);
      setError('Failed to load overrides');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = useCallback(async () => {
    if (!customer?.userId) return;
    
    try {
      const data = await publicAPI.products.getAllByUserId(customer.userId, 0, 1000);
      setProducts(data.content || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  }, [customer?.userId]);

  useEffect(() => {
    if (customer?.userId) {
      fetchProducts();
    }
  }, [customer?.userId, fetchProducts]);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach(product => map.set(product.id, product));
    return map;
  }, [products]);

  const formatPhoneNumber = (phone: string) => {
    if (phone.length >= 3) {
      return `${phone.substring(0, 3)}-${phone.substring(3)}`;
    }
    return phone;
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
  };

  const handleEditCustomer = () => {
    if (!customer) return;
    setEditFormData({
      name: customer.name,
      phoneNumber: customer.phoneNumber,
      email: customer.email,
      streetAddress: customer.streetAddress,
      city: customer.city,
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditFormData({
      name: '',
      phoneNumber: '',
      email: '',
      streetAddress: '',
      city: '',
    });
    setFormError('');
    setFieldErrors({});
    setShowErrors(false);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
    if (showErrors && fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setShowErrors(true);

    const errors: Record<string, string> = {};
    if (!editFormData.name.trim()) {
      errors.name = 'Customer name is required';
    }
    if (!editFormData.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    } else if (!/^\d+$/.test(editFormData.phoneNumber)) {
      errors.phoneNumber = 'Phone number must contain only digits';
    }
    if (!editFormData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!editFormData.streetAddress.trim()) {
      errors.streetAddress = 'Street address is required';
    }
    if (!editFormData.city.trim()) {
      errors.city = 'City is required';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    if (!customer || !customerId) return;

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8080/api/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.userMessage || 'Failed to update customer');
      }

      const updatedCustomer = await response.json();
      setCustomer(updatedCustomer);
      handleCloseEditModal();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOverride = (override: ProductOverride) => {
    setOverrideToEdit(override);
    setEditOverridePrice(override.overridePrice.toString());
    setOverrideFormError('');
    setIsEditOverrideModalOpen(true);
  };

  const handleCloseEditOverrideModal = () => {
    setIsEditOverrideModalOpen(false);
    setOverrideToEdit(null);
    setEditOverridePrice('');
    setOverrideFormError('');
  };

  const handleEditOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOverrideFormError('');

    const price = parseFloat(editOverridePrice);
    if (isNaN(price) || price <= 0) {
      setOverrideFormError('Please enter a valid price greater than 0');
      return;
    }

    if (price > MAX_PRICE) {
      setOverrideFormError('Override price cannot exceed 1,000,000');
      return;
    }

    if (!overrideToEdit) return;

    try {
      setIsSubmittingOverride(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8080/api/product-overrides/${overrideToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          overridePrice: Math.min(price, MAX_PRICE)
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update override');
      }

      await fetchOverrides();
      handleCloseEditOverrideModal();
    } catch (err: any) {
      setOverrideFormError(err.message || 'Failed to update override');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const handleDeleteOverride = async () => {
    if (!overrideToDelete) return;

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8080/api/product-overrides/${overrideToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete override');
      }

      setOverrideToDelete(null);
      await fetchOverrides();
    } catch (err: any) {
      setError(err.message || 'Failed to delete override');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenAddOverrideModal = () => {
    setSelectedProductId('');
    setNewOverridePrice('');
    setAddOverrideError('');
    setIsAddOverrideModalOpen(true);
  };

  const handleCloseAddOverrideModal = () => {
    setIsAddOverrideModalOpen(false);
    setSelectedProductId('');
    setNewOverridePrice('');
    setAddOverrideError('');
  };

  const handleAddOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddOverrideError('');

    if (!selectedProductId) {
      setAddOverrideError('Please select a product');
      return;
    }

    const price = parseFloat(newOverridePrice);
    if (isNaN(price) || price <= 0) {
      setAddOverrideError('Please enter a valid price greater than 0');
      return;
    }

    if (price > MAX_PRICE) {
      setAddOverrideError('Override price cannot exceed 1,000,000');
      return;
    }

    if (!customerId) return;

    try {
      setIsSubmittingNewOverride(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8080/api/product-overrides', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedProductId,
          customerId: customerId,
          overridePrice: Math.min(price, MAX_PRICE)
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to create override';
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.userMessage || errorMessage;
        } catch (parseError) {
          // If JSON parsing fails, use the raw error text
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      await fetchOverrides();
      handleCloseAddOverrideModal();
    } catch (err: any) {
      setAddOverrideError(err.message || 'Failed to create override');
    } finally {
      setIsSubmittingNewOverride(false);
    }
  };

  if (error && !customer) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="glass-card rounded-3xl p-8 bg-red-50/50 border-red-200">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => navigate('/dashboard/customers')}
            className="mt-4 glass-button px-6 py-2 rounded-xl font-semibold text-gray-800 hover:shadow-lg transition-all"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard/customers')}
        className="glass-button px-4 py-2 rounded-xl font-semibold text-gray-800 hover:shadow-lg transition-all flex items-center space-x-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back to Customers</span>
      </button>

      {/* Header */}
      <div className="glass-card rounded-3xl p-6">
        {customer && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-800">Price Overrides</h1>
              <div className="flex space-x-3">
                <button
                  onClick={handleOpenAddOverrideModal}
                  className="glass-button px-4 py-2 rounded-xl font-semibold text-gray-800 hover:shadow-lg transition-all flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Override</span>
                </button>
                <button
                  onClick={handleEditCustomer}
                  className="glass-button px-4 py-2 rounded-xl font-semibold text-gray-800 hover:shadow-lg transition-all flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit Customer</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card p-4 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Customer Name</p>
                <p className="text-lg font-bold text-gray-800">{customer.name}</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                <p className="text-lg font-bold text-gray-800">{formatPhoneNumber(customer.phoneNumber)}</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="text-lg font-bold text-gray-800 truncate" title={customer.email}>{customer.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalElements > 0 && (
        <div className="glass-card rounded-3xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Left side: Page Size */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="glass-select px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-20"
                >
                  <option value={1}>1</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              
              <div className="text-sm text-gray-600 font-medium">
                Page:
              </div>
            </div>

            {/* Right side: Page Navigation */}
            <div className="flex items-center gap-1">
              {totalPages > 1 && (
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="glass-button px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {Array.from({ length: totalPages }, (_, i) => i).map((page) => {
                const showPage =
                  page === 0 ||
                  page === totalPages - 1 ||
                  Math.abs(page - currentPage) <= 1;

                const showEllipsis =
                  (page === 1 && currentPage > 3) ||
                  (page === totalPages - 2 && currentPage < totalPages - 4);

                if (!showPage && !showEllipsis) return null;

                if (showEllipsis) {
                  return (
                    <span key={`ellipsis-${page}`} className="px-2 text-gray-400">
                      ...
                    </span>
                  );
                }

                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      currentPage === page
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'glass-button text-gray-800 hover:shadow-md'
                    }`}
                  >
                    {page + 1}
                  </button>
                );
              })}

              {totalPages > 1 && (
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages - 1}
                  className="glass-button px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overrides List */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center space-y-4">
            <svg
              className="animate-spin h-12 w-12 text-indigo-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-gray-600 font-medium">Loading overrides...</p>
          </div>
        </div>
      ) : overrides.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-6 rounded-full bg-gray-100/50">
              <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">No Price Overrides</h2>
            <p className="text-gray-600 max-w-md">
              This customer doesn't have any custom pricing set up yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-6">
          <div className="space-y-3">
            {overrides.map((override) => {
              const product = productMap.get(override.productId);
              return (
                <div key={override.id} className="glass-card rounded-xl p-3 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="p-1.5 rounded-lg bg-indigo-100/50 flex-shrink-0">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-gray-800">
                          {product?.name || 'Unknown Product'}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-0.5">Original Price</p>
                        <p className="text-sm text-gray-500 line-through">
                          {formatPrice(override.originalPrice)}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-0.5">Override Price</p>
                        <p className="text-lg font-bold text-indigo-600">
                          {formatPrice(override.overridePrice)}
                        </p>
                      </div>
                      <div className="flex space-x-1.5 ml-6">
                        <button
                          onClick={() => handleEditOverride(override)}
                          className="glass-button p-1.5 rounded-lg hover:shadow-md transition-all ml-3"
                          title="Edit override"
                        >
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setOverrideToDelete(override)}
                          className="glass-button p-1.5 rounded-lg hover:shadow-md transition-all border-red-500 hover:border-red-600"
                          title="Delete override"
                        >
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {isEditModalOpen && customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white/85">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Edit Customer</h2>
              <button
                onClick={handleCloseEditModal}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {formError && (
              <div className="glass-card bg-red-50/50 border-red-200 rounded-xl p-3 mb-4 text-red-600 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <input
                  id="edit-name"
                  name="name"
                  type="text"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    showErrors && fieldErrors.name ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="e.g., John Doe"
                />
                {showErrors && fieldErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="edit-phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  id="edit-phoneNumber"
                  name="phoneNumber"
                  type="text"
                  value={editFormData.phoneNumber}
                  onChange={handleEditInputChange}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    showErrors && fieldErrors.phoneNumber ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="e.g., 0501234567"
                />
                {showErrors && fieldErrors.phoneNumber && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.phoneNumber}</p>
                )}
              </div>

              <div>
                <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  id="edit-email"
                  name="email"
                  type="email"
                  value={editFormData.email}
                  onChange={handleEditInputChange}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    showErrors && fieldErrors.email ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="e.g., john@example.com"
                />
                {showErrors && fieldErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="edit-streetAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <input
                  id="edit-streetAddress"
                  name="streetAddress"
                  type="text"
                  value={editFormData.streetAddress}
                  onChange={handleEditInputChange}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    showErrors && fieldErrors.streetAddress ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="e.g., 123 Main St"
                />
                {showErrors && fieldErrors.streetAddress && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.streetAddress}</p>
                )}
              </div>

              <div>
                <label htmlFor="edit-city" className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  id="edit-city"
                  name="city"
                  type="text"
                  value={editFormData.city}
                  onChange={handleEditInputChange}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    showErrors && fieldErrors.city ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="e.g., New York"
                />
                {showErrors && fieldErrors.city && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.city}</p>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={isSubmitting}
                  className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-red-100/60 hover:bg-red-200/70 border-red-500 hover:border-red-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-green-100/60 hover:bg-green-200/70 border-green-600 hover:border-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Customer</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Override Modal */}
      {isEditOverrideModalOpen && overrideToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/85">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Edit Price Override</h2>
              <button
                onClick={handleCloseEditOverrideModal}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {overrideFormError && (
              <div className="glass-card bg-red-50/50 border-red-200 rounded-xl p-3 mb-4 text-red-600 text-sm">
                {overrideFormError}
              </div>
            )}

            <div className="mb-4 glass-card bg-gray-50/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Product</h3>
              <p className="text-base font-bold text-gray-800">
                {productMap.get(overrideToEdit.productId)?.name || 'Unknown Product'}
              </p>
              <div className="mt-3 flex items-center space-x-4 text-sm">
                <div>
                  <span className="text-gray-500">Original: </span>
                  <span className="font-semibold text-gray-700">{formatPrice(overrideToEdit.originalPrice)}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleEditOverrideSubmit} className="space-y-4">
              <div>
                <label htmlFor="override-price" className="block text-sm font-medium text-gray-700 mb-2">
                  Override Price *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-700 text-sm font-semibold z-10">₪</span>
                  <input
                    id="override-price"
                    name="overridePrice"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={MAX_PRICE}
                    value={editOverridePrice}
                    onChange={(e) => {
                      const { value } = e.target;
                      if (value === '') {
                        setEditOverridePrice(value);
                        return;
                      }
                      const numericValue = Number(value);
                      if (!Number.isNaN(numericValue) && numericValue > MAX_PRICE) {
                        setEditOverridePrice(MAX_PRICE.toString());
                      } else {
                        setEditOverridePrice(value);
                      }
                    }}
                    className="glass-input w-full pl-7 pr-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 29.99"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseEditOverrideModal}
                  disabled={isSubmittingOverride}
                  className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-red-100/60 hover:bg-red-200/70 border-red-500 hover:border-red-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOverride}
                  className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-green-100/60 hover:bg-green-200/70 border-green-600 hover:border-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSubmittingOverride ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Price</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Override Confirmation Modal */}
      {overrideToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/90">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Delete Override</h2>
              <button
                onClick={() => setOverrideToDelete(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete the price override for{' '}
                <span className="font-semibold">
                  {productMap.get(overrideToDelete.productId)?.name || 'this product'}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="glass-card bg-yellow-50/50 border-yellow-200 rounded-xl p-4">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-yellow-800">
                    The customer will be charged the standard product price after deletion.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setOverrideToDelete(null)}
                disabled={isDeleting}
                className="glass-button flex-1 py-2.5 px-4 rounded-xl font-semibold text-gray-800 bg-gray-100/60 hover:bg-gray-200/70 border-gray-400 hover:border-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOverride}
                disabled={isDeleting}
                className="glass-button flex-1 py-2.5 px-4 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 border-red-700 hover:border-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isDeleting ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Override</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Override Modal */}
      {isAddOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/85">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Add Price Override</h2>
              <button
                onClick={handleCloseAddOverrideModal}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {addOverrideError && (
              <div className="glass-card bg-red-50/50 border-red-200 rounded-xl p-3 mb-4 text-red-600 text-sm">
                {addOverrideError}
              </div>
            )}

            <form onSubmit={handleAddOverrideSubmit} className="space-y-4">
              <div>
                <label htmlFor="product-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Product *
                </label>
                <select
                  id="product-select"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select a product --</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {formatPrice(product.specialPrice)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="new-override-price" className="block text-sm font-medium text-gray-700 mb-2">
                  Override Price *
                </label>
                <input
                  id="new-override-price"
                  name="newOverridePrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={MAX_PRICE}
                  value={newOverridePrice}
                  onChange={(e) => {
                    const { value } = e.target;
                    if (value === '') {
                      setNewOverridePrice(value);
                      return;
                    }
                    const numericValue = Number(value);
                    if (!Number.isNaN(numericValue) && numericValue > MAX_PRICE) {
                      setNewOverridePrice(MAX_PRICE.toString());
                    } else {
                      setNewOverridePrice(value);
                    }
                  }}
                  className="glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., 29.99"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseAddOverrideModal}
                  disabled={isSubmittingNewOverride}
                  className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-red-100/60 hover:bg-red-200/70 border-red-500 hover:border-red-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewOverride}
                  className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-green-100/60 hover:bg-green-200/70 border-green-600 hover:border-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSubmittingNewOverride ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Override</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

