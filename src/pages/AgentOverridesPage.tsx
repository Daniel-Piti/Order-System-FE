import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentAPI, publicAPI, type Customer, type Agent } from '../services/api';
import PaginationBar from '../components/PaginationBar';
import { formatPrice } from '../utils/formatPrice';
import type { ProductListItem, CustomerListItem, ProductOverride, ProductOverrideWithPrice } from '../utils/types';

const MAX_PRICE = 1_000_000;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

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

      const response = await fetch(`${API_BASE_URL}/agent/product-overrides?${params.toString()}`, {
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
      const message = err?.message || 'נכשל בטעינת מחירים מיוחדים';
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
      if (!formData.productId) errors.productId = 'נדרש לבחור מוצר';
      if (!formData.customerId) errors.customerId = 'נדרש לבחור לקוח';
    }

    if (!priceValue.trim()) {
      errors.overridePrice = 'נדרש להזין מחיר מותאם';
    } else if (isNaN(Number(priceValue)) || Number(priceValue) < 0) {
      errors.overridePrice = 'מחיר מותאם חייב להיות מספר חיובי תקין';
    } else if (Number(priceValue) > MAX_PRICE) {
      errors.overridePrice = 'מחיר מותאם לא יכול לעלות על 1,000,000';
    } else {
      // Check decimal places
      const decimalParts = priceValue.split('.');
      if (decimalParts.length > 1 && decimalParts[1].length > 2) {
        errors.overridePrice = 'מחיר מותאם יכול לכלול עד 2 ספרות אחרי הנקודה';
      }
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
      const response = await fetch(`${API_BASE_URL}/agent/product-overrides`, {
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
      setFormError(err?.message || 'נכשל ביצירת מחיר מיוחד');
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
      const response = await fetch(`${API_BASE_URL}/agent/product-overrides/override/${overrideToEdit.id}`, {
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
      setFormError(err?.message || 'נכשל בעדכון מחיר מיוחד');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOverride = async () => {
    if (!overrideToDelete) return;

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/agent/product-overrides/override/${overrideToDelete.id}`, {
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
      setError(err?.message || 'נכשל במחיקת מחיר מיוחד');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
        <div className="flex flex-col items-center space-y-4">
          <svg className="animate-spin h-12 w-12 text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-600 font-medium">... טוען מחירים מיוחדים</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-32" dir="rtl">
      <div className="glass-card rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">המחירים המיוחדים שלי</h1>
            <p className="text-gray-600 mt-1">התאם מחירים ללקוחות שהוקצו לך</p>
          </div>
          <button
            onClick={handleOpenModal}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 border-0"
          >
            <span>הוסף מחיר מיוחד</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {(overrides.length > 0 || productFilter || customerFilter) && (
        <div className="glass-card rounded-3xl p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:ml-auto">
              {/* Product Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700" dir="rtl">מוצר:</span>
                <select
                  value={productFilter}
                  onChange={(e) => handleProductFilterChange(e.target.value)}
                  className="glass-select pl-8 pr-4 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-48"
                  dir="ltr"
                >
                  <option value="">הכל</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {formatPrice(product.price)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700" dir="rtl">לקוח:</span>
                <select
                  value={customerFilter}
                  onChange={(e) => handleCustomerFilterChange(e.target.value)}
                  className="glass-select pl-8 pr-4 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-40"
                  dir="ltr"
                >
                  <option value="">הכל</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Page Size */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700" dir="rtl">הצג:</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="glass-select pl-3 pr-8 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-24"
                  dir="ltr"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && overrides.length === 0 ? (
        <div className="glass-card rounded-3xl p-6 text-center text-red-600 font-medium">{error}</div>
      ) : overrides.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            {productFilter || customerFilter ? (
              <>
                <div className="p-6 rounded-full bg-gray-100/50">
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">לא נמצאו מחירים מיוחדים תואמים</h2>
                <p className="text-gray-600 max-w-md">
                  לא נמצאו מחירים מיוחדים התואמים למסננים שנבחרו.
                </p>
                <button
                  onClick={() => {
                    setProductFilter('');
                    setCustomerFilter('');
                  }}
                  className="glass-button mt-4 px-8 py-3 rounded-xl font-semibold text-gray-800 hover:shadow-lg transition-all"
                >
                  נקה מסננים
                </button>
              </>
            ) : (
              <>
                <div className="p-6 rounded-full bg-sky-100/50">
                  <svg className="w-16 h-16 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">אין מחירים מיוחדים עדיין</h2>
                <p className="text-gray-600 max-w-md">
                  עדיין לא הגדרת מחירים מותאמים אישית ללקוחות שלך. לחץ על הכפתור למעלה כדי ליצור את המחיר המיוחד הראשון שלך.
                </p>
                <button
                  onClick={handleOpenModal}
                  className="glass-button mt-4 px-8 py-3 rounded-xl font-semibold text-gray-800 hover:shadow-lg transition-all"
                >
                  הוסף את המחיר המיוחד הראשון שלך
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/30 border-b border-gray-200/50">
                <tr>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 w-64">לקוח</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 w-48 border-l border-gray-200">מוצר</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 border-l border-gray-200">מחיר מינימלי</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 border-l border-gray-200">מחיר מותאם</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 border-l border-gray-200 w-24">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {overrides.map((override) => (
                  <tr key={override.id} className="hover:bg-white/20 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                      <span className="inline-block max-w-[200px] truncate" title={customerMap.get(override.customerId)?.name ?? override.customerId}>
                        {customerMap.get(override.customerId)?.name ?? override.customerId}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 border-l border-gray-200">
                      <span className="inline-block max-w-[220px] truncate align-middle" title={productMap.get(override.productId)?.name ?? override.productId}>
                        {productMap.get(override.productId)?.name ?? override.productId}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 border-l border-gray-200">
                      {formatPrice(override.productMinimumPrice ?? override.productPrice)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 font-semibold border-l border-gray-200">
                      {formatPrice(override.overridePrice)}
                    </td>
                    <td className="px-6 py-4 text-right border-l border-gray-200">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="glass-button p-2 rounded-lg hover:shadow-md transition-all"
                          onClick={() => handleEditOverride(override)}
                          title="ערוך מחיר מיוחד"
                        >
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          className="glass-button p-2 rounded-lg hover:shadow-md transition-all border-red-500 hover:border-red-600"
                          onClick={() => setOverrideToDelete(override)}
                          title="מחק מחיר מיוחד"
                        >
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
        rtl={true}
      />

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white/85">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">הוסף מחיר מיוחד</h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-100/60 border border-red-300 rounded-xl text-red-700 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="productId" className="block text-sm font-medium text-gray-700 mb-2">
                  מוצר *
                </label>
                <select
                  id="productId"
                  name="productId"
                  value={formData.productId}
                  onChange={(e) => {
                    setFormData({ ...formData, productId: e.target.value });
                    if (showErrors && fieldErrors.productId) {
                      setFieldErrors({ ...fieldErrors, productId: '' });
                    }
                  }}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    showErrors && fieldErrors.productId ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  dir="ltr"
                >
                  <option value="">בחר מוצר</option>
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
                          <span className="text-xs font-semibold text-sky-700 uppercase tracking-wide">מחיר מינימלי</span>
                          <span className="text-sm font-bold text-sky-900">{formatPrice(product.minimumPrice ?? 0)}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-sky-200 pt-2">
                          <span className="text-xs font-semibold text-sky-700 uppercase tracking-wide">מחיר בסיס</span>
                          <span className="text-sm font-bold text-sky-900">{formatPrice(product.price ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-2">
                  לקוח *
                </label>
                <select
                  id="customerId"
                  name="customerId"
                  value={formData.customerId}
                  onChange={(e) => {
                    setFormData({ ...formData, customerId: e.target.value });
                    if (showErrors && fieldErrors.customerId) {
                      setFieldErrors({ ...fieldErrors, customerId: '' });
                    }
                  }}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    showErrors && fieldErrors.customerId ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  dir="ltr"
                >
                  <option value="">בחר לקוח</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {showErrors && fieldErrors.customerId && <p className="text-xs text-red-500 mt-1">{fieldErrors.customerId}</p>}
              </div>

              <div>
                <label htmlFor="overridePrice" className="block text-sm font-medium text-gray-700 mb-2">
                  מחיר מותאם *
                </label>
                <input
                  id="overridePrice"
                  name="overridePrice"
                  type="number"
                  min="0"
                  max={MAX_PRICE}
                  step="0.01"
                  value={formData.overridePrice}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Limit to 2 decimal places
                    if (value.includes('.')) {
                      const parts = value.split('.');
                      if (parts[1] && parts[1].length > 2) {
                        value = parts[0] + '.' + parts[1].substring(0, 2);
                      }
                    }
                    // Limit to max price
                    if (value && !isNaN(Number(value)) && Number(value) > MAX_PRICE) {
                      value = MAX_PRICE.toString();
                    }
                    setFormData((prev) => ({ ...prev, overridePrice: value }));
                    if (showErrors && fieldErrors.overridePrice) {
                      setFieldErrors({ ...fieldErrors, overridePrice: '' });
                    }
                  }}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    showErrors && fieldErrors.overridePrice ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="הזן מחיר מותאם"
                  dir="ltr"
                />
                {showErrors && fieldErrors.overridePrice && <p className="text-xs text-red-500 mt-1">{fieldErrors.overridePrice}</p>}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button type="button" onClick={handleCloseModal} className="glass-button px-4 py-2 rounded-xl text-sm font-semibold text-gray-700">
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'שומר...' : 'שמור מחיר מיוחד'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && overrideToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-900/30 backdrop-blur" dir="rtl">
          <div className="glass-card rounded-[28px] p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white/90 shadow-2xl shadow-sky-200/60 border border-white/40">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">עדכן מחיר מיוחד</h2>
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
                    <span className="text-xs font-semibold text-sky-600 uppercase tracking-wide">לקוח:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {customerMap.get(overrideToEdit.customerId)?.name ?? overrideToEdit.customerId}
                    </span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-sky-600 uppercase tracking-wide">מוצר:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {productMap.get(overrideToEdit.productId)?.name ?? overrideToEdit.productId}
                    </span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-sky-600 uppercase tracking-wide">מחיר מינימלי:</span>
                    <span className="text-sm font-semibold text-gray-900">{formatPrice(productMinimumPrice)}</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-sky-600 uppercase tracking-wide">מחיר בסיס:</span>
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
                  מחיר מותאם
                </label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₪</span>
                  <input
                    id="edit-overridePrice"
                    type="number"
                    min="0"
                    max={MAX_PRICE}
                    step="0.01"
                    value={editFormData.overridePrice}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Limit to 2 decimal places
                      if (value.includes('.')) {
                        const parts = value.split('.');
                        if (parts[1] && parts[1].length > 2) {
                          value = parts[0] + '.' + parts[1].substring(0, 2);
                        }
                      }
                      // Limit to max price
                      if (value && !isNaN(Number(value)) && Number(value) > MAX_PRICE) {
                        value = MAX_PRICE.toString();
                      }
                      setEditFormData({ overridePrice: value });
                      if (showErrors && fieldErrors.overridePrice) {
                        setFieldErrors({ ...fieldErrors, overridePrice: '' });
                      }
                    }}
                    className={`w-full pr-9 pl-4 py-2.5 rounded-2xl text-sm text-gray-900 bg-white/70 border border-white/60 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white ${
                      showErrors && fieldErrors.overridePrice ? 'border-red-300 focus:ring-red-300 bg-red-50' : ''
                    }`}
                    placeholder="הזן מחיר מותאם חדש"
                    dir="ltr"
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
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 shadow-lg shadow-sky-200/70 transition-all disabled:opacity-60"
                >
                  {isSubmitting ? 'מעדכן...' : 'עדכן מחיר מיוחד'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {overrideToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl">
          <div className="glass-card rounded-3xl p-6 w-full max-w-md bg-white/85">
            <h2 className="text-lg font-bold text-gray-800 mb-3">מחק מחיר מיוחד</h2>
            <p className="text-sm text-gray-600">
              האם אתה בטוח שברצונך למחוק את המחיר המיוחד עבור{' '}
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
                ביטול
              </button>
              <button
                onClick={handleDeleteOverride}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isDeleting}
              >
                {isDeleting ? 'מוחק...' : 'מחק'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


