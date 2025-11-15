import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentAPI, publicAPI, type Customer, type Agent } from '../services/api';
import PaginationBar from '../components/PaginationBar';
import { formatPrice } from '../utils/formatPrice';
import type { ProductListItem, CustomerListItem, ProductOverride, ProductOverrideWithPrice } from '../utils/types';

const MAX_PRICE = 1_000_000;

export default function AgentOverridesPage() {
  const [overrides, setOverrides] = useState<ProductOverrideWithPrice[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [agentInfo, setAgentInfo] = useState<Agent | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  const [productFilter, setProductFilter] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [overrideToEdit, setOverrideToEdit] = useState<ProductOverride | null>(null);
  const [overrideToDelete, setOverrideToDelete] = useState<ProductOverride | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    productId: '',
    customerId: '',
    overridePrice: '',
  });
  const [editFormData, setEditFormData] = useState({
    overridePrice: '',
  });

  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchAgentInfo();
  }, []);

  useEffect(() => {
    if (agentInfo) {
      fetchOverrides();
      fetchProducts();
      fetchCustomers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentInfo, currentPage, pageSize, productFilter, customerFilter]);

  const fetchAgentInfo = async () => {
    try {
      const agent = await agentAPI.getCurrentAgent();
      setAgentInfo(agent);
    } catch (err: any) {
      if (err.message?.includes('401')) {
        navigate('/login/agent');
      } else {
        setError(err?.response?.data?.userMessage || err?.message || 'Failed to load agent profile');
      }
    }
  };

  const fetchOverrides = async () => {
    if (!agentInfo) return;
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');

      const params = new URLSearchParams({
        page: currentPage.toString(),
        size: pageSize.toString(),
        sortBy: 'customer_id',
        sortDirection: 'ASC',
      });
      if (productFilter) params.append('productId', productFilter);
      if (customerFilter) params.append('customerId', customerFilter);

      const response = await fetch(`http://localhost:8080/api/agent/product-overrides?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.userMessage || 'Failed to fetch overrides');
      }

      const data = await response.json();
      setOverrides(data.content || []);
      setTotalPages(data.totalPages || 0);
    } catch (err: any) {
      const message = err?.message || 'Failed to load overrides';
      setError(message);
      if (message.includes('401')) {
        navigate('/login/agent');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    if (!agentInfo) return;
    try {
      const data = await publicAPI.products.getAllByManagerId(agentInfo.managerId, 0, 1000);
      const items = data.content ?? [];
      setProducts(items.map((p) => ({ id: p.id, name: p.name, price: p.price, minimumPrice: p.minimumPrice })));
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data: Customer[] = await agentAPI.getCustomersForAgent();
      setCustomers(data.map((c) => ({ id: c.id, name: c.name })));
    } catch (err) {
      console.error('Failed to fetch customers', err);
    }
  };

  // Create maps for O(1) lookups instead of O(n) .find() on every render
  // Store products with both original ID and string ID to handle type mismatches
  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach(p => {
      map.set(p.id, p);
      map.set(String(p.id), p);
      if (typeof p.id !== 'string') {
        map.set(p.id.toString(), p);
      }
    });
    return map;
  }, [products]);

  const customerMap = useMemo(() => {
    return new Map(customers.map(c => [c.id, c]));
  }, [customers]);

  // Get selected product for add modal - useMemo to ensure React tracks changes
  const selectedProductForAdd = useMemo(() => {
    if (!formData.productId || products.length === 0) {
      return undefined;
    }
    // Try multiple lookup methods to handle any type mismatches
    const product = productMap.get(formData.productId) 
      || productMap.get(String(formData.productId))
      || products.find(p => p.id === formData.productId)
      || products.find(p => String(p.id) === String(formData.productId))
      || products.find(p => p.id.toString() === formData.productId.toString());
    return product;
  }, [formData.productId, productMap, products]);

  const handleProductFilterChange = (value: string) => {
    setProductFilter(value);
    setCurrentPage(0);
  };

  const handleCustomerFilterChange = (value: string) => {
    setCustomerFilter(value);
    setCurrentPage(0);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
  };

  const handleOpenModal = () => {
    setFormData({ productId: '', customerId: '', overridePrice: '' });
    setFieldErrors({});
    setFormError('');
    setShowErrors(false);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setFieldErrors({});
    setFormError('');
    setShowErrors(false);
    setFormData({ productId: '', customerId: '', overridePrice: '' });
  };

  const validateOverrideForm = (priceValue: string, { requireSelection }: { requireSelection: boolean }) => {
    const errors: Record<string, string> = {};
    if (requireSelection) {
      if (!formData.productId) errors.productId = 'Product is required';
      if (!formData.customerId) errors.customerId = 'Customer is required';
    }

    if (!priceValue.trim()) {
      errors.overridePrice = 'Override price is required';
    } else if (isNaN(Number(priceValue)) || Number(priceValue) < 0) {
      errors.overridePrice = 'Override price must be a valid positive number';
    } else if (Number(priceValue) > MAX_PRICE) {
      errors.overridePrice = 'Override price cannot exceed 1,000,000';
    }
    return errors;
  };

  const handleAddSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!agentInfo) return;

    setShowErrors(true);
    const errors = validateOverrideForm(formData.overridePrice, { requireSelection: true });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8080/api/agent/product-overrides', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: formData.productId,
          customerId: formData.customerId,
          overridePrice: Math.min(Number(formData.overridePrice), MAX_PRICE),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.userMessage || 'Failed to create override');
      }

      setCurrentPage(0);
      await fetchOverrides();
      handleCloseModal();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create override');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOverride = (override: ProductOverride) => {
    setOverrideToEdit(override);
    setEditFormData({ overridePrice: override.overridePrice.toString() });
    setFieldErrors({});
    setFormError('');
    setShowErrors(false);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setOverrideToEdit(null);
    setEditFormData({ overridePrice: '' });
    setFieldErrors({});
    setFormError('');
    setShowErrors(false);
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!overrideToEdit) return;

    setShowErrors(true);
    const errors = validateOverrideForm(editFormData.overridePrice, { requireSelection: false });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Check if anything has changed
    // Compare the new price with the original override price
    const newPrice = Math.min(Number(editFormData.overridePrice), MAX_PRICE);
    const originalPrice = overrideToEdit.overridePrice;
    
    // Use a small epsilon for floating point comparison
    const hasChanges = Math.abs(newPrice - originalPrice) > 0.001;

    // If nothing changed, just close the modal without making an API call
    if (!hasChanges) {
      handleCloseEditModal();
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8080/api/agent/product-overrides/override/${overrideToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          overridePrice: newPrice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.userMessage || 'Failed to update override');
      }

      await fetchOverrides();
      handleCloseEditModal();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update override');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOverride = async () => {
    if (!overrideToDelete) return;

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8080/api/agent/product-overrides/override/${overrideToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.userMessage || 'Failed to delete override');
      }

      await fetchOverrides();
      setOverrideToDelete(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete override');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <svg className="animate-spin h-12 w-12 text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-600">Loading overrides...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-32">
      <div className="glass-card rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Product Overrides</h1>
            <p className="text-gray-600 mt-1">Adjust pricing for the customers assigned to you</p>
          </div>
          <button
            onClick={handleOpenModal}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 border-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Override
          </button>
        </div>
      </div>

      {(overrides.length > 0 || productFilter || customerFilter) && (
        <div className="glass-card rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="glass-select px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-20"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Product:</span>
              <select
                value={productFilter}
                onChange={(e) => handleProductFilterChange(e.target.value)}
                className="glass-select px-3 py-2 rounded-xl text-sm text-gray-800 cursor-pointer min-w-[12rem]"
              >
                <option value="">All Products</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Customer:</span>
              <select
                value={customerFilter}
                onChange={(e) => handleCustomerFilterChange(e.target.value)}
                className="glass-select px-3 py-2 rounded-xl text-sm text-gray-800 cursor-pointer min-w-[12rem]"
              >
                <option value="">All Customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {error && overrides.length === 0 ? (
        <div className="glass-card rounded-3xl p-6 text-center text-red-600 font-medium">{error}</div>
      ) : (
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-sky-50/70 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Minimum Price</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Override Price</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {overrides.map((override) => (
                  <tr key={override.id} className="hover:bg-sky-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {customerMap.get(override.customerId)?.name ?? override.customerId}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">{productMap.get(override.productId)?.name ?? override.productId}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatPrice(override.productMinimumPrice ?? override.productPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-semibold">
                      {formatPrice(override.overridePrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          className="glass-button p-2 rounded-lg text-sm font-semibold text-gray-800 border border-sky-200 hover:border-sky-300 transition-colors"
                          onClick={() => handleEditOverride(override)}
                          aria-label="Edit override"
                        >
                          <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="glass-button p-2 rounded-lg text-sm font-semibold text-gray-800 border border-red-200 hover:border-red-300 transition-colors"
                          onClick={() => setOverrideToDelete(override)}
                          aria-label="Delete override"
                        >
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {overrides.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No overrides found. Create one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        maxWidth="max-w-5xl"
        showCondition={overrides.length > 0 && totalPages > 1}
      />

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 w-full max-w-lg bg-white/85">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Add Product Override</h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && <div className="mb-4 rounded-xl bg-red-50/60 border border-red-200 p-3 text-sm text-red-600">{formError}</div>}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, productId: e.target.value }))}
                  className={`glass-select w-full px-3 py-2 rounded-xl text-sm text-gray-800 ${showErrors && fieldErrors.productId ? 'border-red-400 focus:border-red-400' : ''}`}
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {formatPrice(product.price)}
                    </option>
                  ))}
                </select>
                {showErrors && fieldErrors.productId && <p className="text-xs text-red-500 mt-1">{fieldErrors.productId}</p>}
                {(() => {
                  if (!formData.productId) return null;
                  const product = products.find(p => String(p.id) === String(formData.productId));
                  if (!product) return null;
                  return (
                    <div className="mt-3 p-4 bg-gradient-to-br from-sky-50 to-sky-100/60 border-2 border-sky-300 rounded-xl shadow-sm">
                      <p className="font-bold text-gray-900 text-base mb-3">{product.name}</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Minimum Price</span>
                          <span className="text-sm font-bold text-sky-900">{formatPrice(product.minimumPrice ?? 0)}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-sky-200 pt-2">
                          <span className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Base Price</span>
                          <span className="text-sm font-bold text-sky-900">{formatPrice(product.price ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customerId: e.target.value }))}
                  className={`glass-select w-full px-3 py-2 rounded-xl text-sm text-gray-800 ${showErrors && fieldErrors.customerId ? 'border-red-400 focus:border-red-400' : ''}`}
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {showErrors && fieldErrors.customerId && <p className="text-xs text-red-500 mt-1">{fieldErrors.customerId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Override Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.overridePrice}
                  onChange={(e) => setFormData((prev) => ({ ...prev, overridePrice: e.target.value }))}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 ${showErrors && fieldErrors.overridePrice ? 'border-red-400 focus:border-red-400' : ''}`}
                  placeholder="Enter override price"
                />
                {showErrors && fieldErrors.overridePrice && <p className="text-xs text-red-500 mt-1">{fieldErrors.overridePrice}</p>}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button type="button" onClick={handleCloseModal} className="glass-button px-4 py-2 rounded-xl text-sm font-semibold text-gray-700">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && overrideToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-900/30 backdrop-blur">
          <div className="glass-card rounded-[28px] p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white/90 shadow-2xl shadow-sky-200/60 border border-white/40">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Update Override</h2>
              <button
                onClick={handleCloseEditModal}
                className="p-2 rounded-full bg-white/70 hover:bg-white transition-colors shadow-sm"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {(() => {
              const overrideWithPrice = overrides.find((o) => o.id === overrideToEdit.id);
              const productMinimumPrice = overrideWithPrice?.productMinimumPrice ?? overrideWithPrice?.productPrice ?? 0;
              const productPrice = overrideWithPrice?.productPrice ?? 0;
              
              return (
                <div className="mb-5 rounded-2xl bg-gradient-to-br from-sky-50 via-white to-sky-100/60 border border-white/40 shadow-inner divide-y divide-sky-100">
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-sky-600 uppercase tracking-wide">Customer:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {customerMap.get(overrideToEdit.customerId)?.name ?? overrideToEdit.customerId}
                    </span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-sky-600 uppercase tracking-wide">Product:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {productMap.get(overrideToEdit.productId)?.name ?? overrideToEdit.productId}
                    </span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-sky-600 uppercase tracking-wide">Minimum Price:</span>
                    <span className="text-sm font-semibold text-gray-900">{formatPrice(productMinimumPrice)}</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-sky-600 uppercase tracking-wide">Base Price:</span>
                    <span className="text-sm font-semibold text-gray-900">{formatPrice(productPrice)}</span>
                  </div>
                </div>
              );
            })()}

            {formError && (
              <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 p-3 text-sm text-red-600 shadow">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="edit-overridePrice" className="block text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold mb-2">
                  Override Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₪</span>
                  <input
                    id="edit-overridePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editFormData.overridePrice}
                    onChange={(e) => setEditFormData({ overridePrice: e.target.value })}
                    className={`w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm text-gray-900 bg-white/70 border border-white/60 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white ${
                      showErrors && fieldErrors.overridePrice ? 'border-red-300 focus:ring-red-300 bg-red-50' : ''
                    }`}
                    placeholder="Enter new override price"
                  />
                </div>
                {showErrors && fieldErrors.overridePrice && (
                  <p className="text-red-500 text-xs mt-2 font-medium">{fieldErrors.overridePrice}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-2xl text-sm font-semibold text-gray-700 bg-white/80 hover:bg-white border border-gray-200 hover:border-gray-300 transition-all disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 shadow-lg shadow-sky-200/70 transition-all disabled:opacity-60"
                >
                  {isSubmitting ? 'Updating...' : 'Update Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {overrideToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 w-full max-w-md bg-white/85">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Delete Override</h2>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete the override for{' '}
              <span className="font-semibold text-gray-800">
                {customerMap.get(overrideToDelete.customerId)?.name ?? overrideToDelete.customerId}
              </span>
              ?
            </p>

            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setOverrideToDelete(null)}
                className="glass-button px-4 py-2 rounded-xl text-sm font-semibold text-gray-700"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOverride}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


