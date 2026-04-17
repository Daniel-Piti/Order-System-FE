import { useState, useEffect, useMemo } from 'react';
import CloseButton from '../components/CloseButton';
import { useNavigate } from 'react-router-dom';
import { customerAPI, managerAPI, productAPI, agentAPI } from '../services/api';
import type { PageResponse, Agent } from '../services/api';
import PaginationBar from '../components/PaginationBar';
import type { ProductOverrideWithPrice, ProductListItem, CustomerListItem, ProductOverride } from '../utils/types';
import { formatPrice } from '../utils/formatPrice';
import { useModalBackdrop } from '../hooks/useModalBackdrop';
import { msgFromBody, resolveApiErr } from '../utils/apiErrorMessage';

const MAX_PRICE = 1_000_000;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export default function OverridesPage() {
  const [overrides, setOverrides] = useState<ProductOverrideWithPrice[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  // Filters (manager: all overrides, optional filter by product/customer)
  const [productFilter, setProductFilter] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [overrideToEdit, setOverrideToEdit] = useState<ProductOverride | null>(null);
  const [overrideToDelete, setOverrideToDelete] = useState<ProductOverride | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
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
  const [managerId, setManagerId] = useState<string | null>(null);
  const [addModalProductSearch, setAddModalProductSearch] = useState('');

  const navigate = useNavigate();
  const { backdropProps: addModalBackdropProps, contentProps: addModalContentProps } = useModalBackdrop(() => setIsAddModalOpen(false));
  const { backdropProps: editModalBackdropProps, contentProps: editModalContentProps } = useModalBackdrop(() => setIsEditModalOpen(false));
  const { backdropProps: deleteModalBackdropProps, contentProps: deleteModalContentProps } = useModalBackdrop(() => setOverrideToDelete(null));

  useEffect(() => {
    fetchManagerId();
  }, []);

  useEffect(() => {
    if (managerId) {
      fetchOverrides();
      fetchProducts();
      fetchCustomers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managerId, currentPage, pageSize, productFilter, customerFilter]);

  useEffect(() => {
    if (managerId) {
      fetchAgents();
    }
  }, [managerId]);

  const fetchOverrides = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      // Build query params
      const params = new URLSearchParams({
        pageNumber: currentPage.toString(),
        pageSize: pageSize.toString(),
        sortBy: 'updated_at',
        sortOrder: 'desc',
      });
      
      if (productFilter) {
        params.append('productId', productFilter);
      }
      if (customerFilter) {
        params.append('customerId', customerFilter);
      }

      const response = await fetch(`${API_BASE_URL}/product-overrides?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(msgFromBody(errorData, 'overridesLoad'));
      }

      const data: PageResponse<ProductOverrideWithPrice> = await response.json();
      
      setOverrides(data.content);
      setTotalPages(data.totalPages);
    } catch (err: unknown) {
      setError(resolveApiErr(err, 'overridesLoad'));
      const e = err as { message?: string };
      if (e.message?.includes('401')) {
        navigate('/login/manager');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchManagerId = async () => {
    try {
      const manager = await managerAPI.getCurrentManager();
      setManagerId(manager.id);
    } catch (err: any) {
      if (err.message?.includes('401')) {
        navigate('/login/manager');
      }
    }
  };

  const fetchProducts = async () => {
    if (!managerId) return;
    try {
      const data = await productAPI.getAllProducts();
      setProducts(data.map((p) => ({ id: p.id, name: p.name, price: p.price, minimumPrice: p.minimumPrice })));
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await customerAPI.getAllCustomers();
      setCustomers(data.map((c) => ({ id: c.id, name: c.name })));
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const fetchAgents = async () => {
    try {
      const data = await agentAPI.getAgentsForManager();
      setAgents(data);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    }
  };

  // Create maps for O(1) lookups instead of O(n) .find() on every render
  const productMap = useMemo(() => {
    return new Map(products.map(p => [p.id, p]));
  }, [products]);

  const customerMap = useMemo(() => {
    return new Map(customers.map(c => [c.id, c]));
  }, [customers]);

  const agentMap = useMemo(() => {
    return new Map(agents.map((agent) => [agent.id, agent]));
  }, [agents]);

  const getProductName = (productId: string) => {
    return productMap.get(productId)?.name ?? productId;
  };

  const getCustomerName = (customerId: string) => {
    return customerMap.get(customerId)?.name ?? customerId;
  };

  const getAgentLabel = (agentId: string | null) => {
    if (agentId == null) {
      return 'אני';
    }
    const agent = agentMap.get(agentId);
    if (!agent) {
      return 'סוכן';
    }
    return `${agent.firstName} ${agent.lastName}`.trim();
  };

  const selectedProductForAdd = formData.productId ? productMap.get(formData.productId) : undefined;

  const filteredProductsForAdd = useMemo(() => {
    const query = addModalProductSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) => p.name.toLowerCase().includes(query));
  }, [products, addModalProductSearch]);

  const handleProductFilterChange = (productId: string) => {
    setProductFilter(productId);
    setCurrentPage(0);
  };

  const handleCustomerFilterChange = (customerId: string) => {
    setCustomerFilter(customerId);
    setCurrentPage(0);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setAddModalProductSearch('');
    setFormData({
      productId: '',
      customerId: '',
      overridePrice: '',
    });
    setFormError('');
    setFieldErrors({});
    setShowErrors(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setShowErrors(true);

    const errors: Record<string, string> = {};
    if (!formData.productId) errors.productId = 'נדרש לבחור מוצר';
    if (!formData.customerId) errors.customerId = 'נדרש לבחור לקוח';
    if (!formData.overridePrice.trim()) {
      errors.overridePrice = 'נדרש להזין מחיר מותאם';
    } else if (isNaN(Number(formData.overridePrice)) || Number(formData.overridePrice) < 0) {
      errors.overridePrice = 'מחיר מותאם חייב להיות מספר חיובי תקין';
    } else if (Number(formData.overridePrice) > MAX_PRICE) {
      errors.overridePrice = 'מחיר מותאם לא יכול לעלות על 1,000,000';
    } else {
      // Check decimal places
      const decimalParts = formData.overridePrice.split('.');
      if (decimalParts.length > 1 && decimalParts[1].length > 2) {
        errors.overridePrice = 'מחיר מותאם יכול לכלול עד 2 ספרות אחרי הנקודה';
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/product-overrides`, {
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
        throw new Error(msgFromBody(errorData, 'overridesCreate'));
      }

      const created = await response.json();
      const product = products.find((p) => p.id === formData.productId);
      const withPrice: ProductOverrideWithPrice = {
        ...created,
        overridePrice: Number(created.overridePrice),
        productPrice: product?.price ?? 0,
        productMinimumPrice: product?.minimumPrice ?? 0,
      };
      setOverrides((prev) => [withPrice, ...prev]);
      setCurrentPage(0);
      handleCloseModal();
    } catch (err: unknown) {
      setFormError(resolveApiErr(err, 'overridesCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOverride = (override: ProductOverride) => {
    setOverrideToEdit(override);
    setEditFormData({
      overridePrice: override.overridePrice.toString(),
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setOverrideToEdit(null);
    setEditFormData({
      overridePrice: '',
    });
    setFormError('');
    setFieldErrors({});
    setShowErrors(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideToEdit) return;

    setFormError('');
    setShowErrors(true);

    const errors: Record<string, string> = {};
    if (!editFormData.overridePrice.trim()) {
      errors.overridePrice = 'נדרש להזין מחיר מותאם';
    } else if (isNaN(Number(editFormData.overridePrice)) || Number(editFormData.overridePrice) < 0) {
      errors.overridePrice = 'מחיר מותאם חייב להיות מספר חיובי תקין';
    } else if (Number(editFormData.overridePrice) > MAX_PRICE) {
      errors.overridePrice = 'מחיר מותאם לא יכול לעלות על 1,000,000';
    } else {
      // Check decimal places
      const decimalParts = editFormData.overridePrice.split('.');
      if (decimalParts.length > 1 && decimalParts[1].length > 2) {
        errors.overridePrice = 'מחיר מותאם יכול לכלול עד 2 ספרות אחרי הנקודה';
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

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
      const response = await fetch(`${API_BASE_URL}/product-overrides/override/${overrideToEdit.id}`, {
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
        throw new Error(msgFromBody(errorData, 'overridesUpdate'));
      }

      const updated = await response.json();
      const product = products.find((p) => p.id === overrideToEdit.productId);
      const withPrice: ProductOverrideWithPrice = {
        ...updated,
        overridePrice: Number(updated.overridePrice),
        productPrice: product?.price ?? 0,
        productMinimumPrice: product?.minimumPrice ?? 0,
      };
      setOverrides((prev) => prev.map((o) => (o.id === withPrice.id ? withPrice : o)));
      handleCloseEditModal();
    } catch (err: unknown) {
      setFormError(resolveApiErr(err, 'overridesUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOverride = async () => {
    if (!overrideToDelete) return;

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/product-overrides/override/${overrideToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(msgFromBody(errorData, 'overridesDelete'));
      }

      const idToRemove = overrideToDelete.id;
      setOverrides((prev) => prev.filter((o) => o.id !== idToRemove));
      setOverrideToDelete(null);
    } catch (err: unknown) {
      setError(resolveApiErr(err, 'overridesDelete'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
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
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-gray-600 font-medium">... טוען מחירים מיוחדים</p>
        </div>
      </div>
    );
  }

  if (error && overrides.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="glass-card rounded-3xl p-8 text-center">
          <p className="text-red-600 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-32">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">מחירים מיוחדים</h1>
            <p className="text-gray-600 mt-1">נהל מחירים מותאמים אישית ללקוחות</p>
            <p
              className="mt-3 px-3 py-2 text-sm font-bold text-orange-800 bg-orange-50 border border-orange-200 rounded-lg max-w-md"
              role="note"
            >
              מחירים מיוחדים מחושבים לפני הנחת האחוזים של הלקוח.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-add-indigo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>הוסף מחיר מיוחד</span>
          </button>
        </div>
      </div>

      {/* Filters & Controls */}
      {(overrides.length > 0 || productFilter || customerFilter) && (
        <div className="glass-card rounded-3xl p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-start">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
                  className="glass-select pl-8 pr-4 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-48"
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
                  <option value={5}>5</option>
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

      {/* Overrides Table */}
      {overrides.length === 0 ? (
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
                  לא נמצאו מחירים מיוחדים עבור המסננים שנבחרו.
                </p>
                <button
                  onClick={() => {
                    setProductFilter('');
                    setCustomerFilter('');
                  }}
                  className="glass-button mt-4 px-8 py-3 rounded-xl font-semibold text-gray-800 hover:shadow-lg transition-all"
                >
                  נקה מסנן
                </button>
              </>
            ) : (
              <>
                <div className="p-6 rounded-full bg-indigo-100/50">
                  <svg className="w-16 h-16 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">אין מחירים מיוחדים עדיין</h2>
                <p className="text-gray-600 max-w-md">
                  עדיין לא הגדרת מחירים מותאמים אישית ללקוחות שלך. לחץ על הכפתור למטה כדי ליצור את המחיר המיוחד הראשון שלך.
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
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
            <table 
              className="w-full"
              aria-label="טבלת מחירים מיוחדים"
              role="table"
            >
              <caption className="sr-only">
                טבלת מחירים מיוחדים עם פרטי לקוח, סוכן, מוצר, מחיר מינימלי, מחיר מותאם ופעולות
              </caption>
              <thead className="bg-white/30 border-b border-gray-200/50">
                <tr>
                  <th scope="col" id="override-customer" className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-64">לקוח</th>
                  <th scope="col" id="override-agent" className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-48">סוכן</th>
                  <th scope="col" id="override-product" className="px-6 py-4 text-left text-sm font-semibold text-gray-700">מוצר</th>
                  <th scope="col" id="override-min-price" className="px-6 py-4 text-left text-sm font-semibold text-gray-700">מחיר מינימלי</th>
                  <th scope="col" id="override-override-price" className="px-6 py-4 text-left text-sm font-semibold text-gray-700">מחיר מותאם</th>
                  <th scope="col" id="override-actions" className="px-6 py-4 text-right text-sm font-semibold text-gray-700">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {overrides.map((override) => (
                  <tr key={override.id} className="hover:bg-white/20 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-800 font-medium" headers="override-customer">
                      <span className="inline-block max-w-[200px] truncate" title={getCustomerName(override.customerId)}>
                      {getCustomerName(override.customerId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700" headers="override-agent">
                      {getAgentLabel(override.agentId)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800" headers="override-product">
                      <span
                        className="inline-block max-w-[220px] truncate align-middle"
                        title={getProductName(override.productId)}
                      >
                        {getProductName(override.productId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800" headers="override-min-price">
                      {formatPrice(override.productMinimumPrice ?? override.productPrice)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 font-semibold" headers="override-override-price">
                      {formatPrice(override.overridePrice)}
                    </td>
                    <td className="px-6 py-4 text-right" headers="override-actions">
                      <div className="flex items-center justify-end gap-2" role="group" aria-label={`פעולות עבור מחיר מיוחד עבור ${getCustomerName(override.customerId)}`}>
                        <button
                          onClick={() => handleEditOverride(override)}
                          className="glass-button p-2 rounded-lg hover:shadow-md transition-all focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                          aria-label={`ערוך מחיר מיוחד עבור ${getCustomerName(override.customerId)} - ${getProductName(override.productId)}`}
                        >
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setOverrideToDelete(override)}
                          className="glass-button p-2 rounded-lg hover:shadow-md transition-all border-red-500 hover:border-red-600 focus-visible:outline-3 focus-visible:outline-red-600 focus-visible:outline-offset-2"
                          aria-label={`מחק מחיר מיוחד עבור ${getCustomerName(override.customerId)} - ${getProductName(override.productId)}`}
                        >
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

      {/* Pagination Controls - Bottom */}
      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        maxWidth="max-w-7xl"
        showCondition={overrides.length > 0 && totalPages > 0}
      />

      {/* Add Override Modal */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" 
          dir="rtl" 
          style={{ margin: 0, top: 0 }}
          {...addModalBackdropProps}
        >
          <div 
            className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-xl shadow-xl"
            {...addModalContentProps}
          >
            <div className="modal-header">
              <h2 className="modal-header-title">הוסף מחיר מיוחד</h2>
              <CloseButton onClick={handleCloseModal} />
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50/80 border border-red-200/60 rounded-xl text-red-600 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3.5" noValidate>
              {/* Product */}
              <div>
                <label htmlFor="add-modal-product-search" className="block text-xs font-medium text-gray-700 mb-1.5">
                  מוצר *
                </label>
                <div className="relative mb-2">
                  <svg
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    id="add-modal-product-search"
                    type="text"
                    placeholder="חפש מוצרים..."
                    value={addModalProductSearch}
                    onChange={(e) => setAddModalProductSearch(e.target.value)}
                    className="glass-input w-full pr-10 pl-10 py-2 rounded-xl text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    dir="rtl"
                    aria-label="חפש מוצרים"
                  />
                  {addModalProductSearch && (
                    <button
                      type="button"
                      onClick={() => setAddModalProductSearch('')}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label="נקה חיפוש"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className={`rounded-xl border overflow-hidden ${showErrors && fieldErrors.productId ? 'border-red-400 ring-2 ring-red-400/30' : 'border-gray-200'}`}>
                  <div className="space-y-1 max-h-40 overflow-y-auto p-1.5 bg-gray-50/50">
                    {filteredProductsForAdd.length === 0 && addModalProductSearch ? (
                      <div className="text-center py-6 text-gray-500">
                        <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-xs">לא נמצאו מוצרים</p>
                        <button
                          type="button"
                          onClick={() => setAddModalProductSearch('')}
                          className="text-xs text-indigo-600 hover:text-indigo-700 mt-1"
                        >
                          נקה חיפוש
                        </button>
                      </div>
                    ) : filteredProductsForAdd.length === 0 && !addModalProductSearch ? (
                      <div className="text-center py-6 text-gray-500">
                        {isLoading ? (
                          <p className="text-xs">טוען מוצרים...</p>
                        ) : (
                          <p className="text-xs">אין מוצרים להצגה</p>
                        )}
                      </div>
                    ) : (
                      filteredProductsForAdd.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, productId: product.id }));
                            if (showErrors && fieldErrors.productId) setFieldErrors((prev) => ({ ...prev, productId: '' }));
                          }}
                          className={`w-full text-right px-3 py-2.5 rounded-lg transition-all flex items-center gap-2.5 ${
                            formData.productId === product.id
                              ? 'bg-indigo-100 border-2 border-indigo-500 shadow-sm'
                              : 'bg-white hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            formData.productId === product.id ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                          }`}>
                            {formData.productId === product.id && (
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 font-medium text-gray-800 text-sm truncate">
                            {product.name}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
                {showErrors && fieldErrors.productId && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.productId}</p>
                )}
                {selectedProductForAdd && (
                  <div className="mt-3 p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl text-sm text-indigo-800">
                    <p className="font-semibold">{selectedProductForAdd.name}</p>
                    <p className="mt-1 text-xs text-indigo-700">
                      מחיר מינימלי: {formatPrice(selectedProductForAdd.minimumPrice)}
                    </p>
                    <p className="mt-1 text-xs text-indigo-700">מחיר בסיס: {formatPrice(selectedProductForAdd.price)}</p>
                  </div>
                )}
              </div>

              {/* Customer */}
              <div>
                <label htmlFor="customerId" className="block text-xs font-medium text-gray-700 mb-1.5">
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
                  className={`glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-800 text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${
                    showErrors && fieldErrors.customerId ? 'border-red-400 focus:ring-red-400/50' : ''
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
                {showErrors && fieldErrors.customerId && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.customerId}</p>
                )}
              </div>

              {/* Override Price */}
              <div>
                <label htmlFor="overridePrice" className="block text-xs font-medium text-gray-700 mb-1.5">
                  מחיר מותאם *
                </label>
                <div className="relative">
                  <span className="absolute right-3 top-2.5 text-gray-700 text-sm font-semibold z-10">₪</span>
                  <input
                    id="overridePrice"
                    name="overridePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    max={MAX_PRICE}
                    value={formData.overridePrice}
                    onChange={(e) => {
                      const { value } = e.target;
                      let nextValue = value;
                      // Limit to 2 decimal places
                      if (nextValue.includes('.')) {
                        const parts = nextValue.split('.');
                        if (parts[1] && parts[1].length > 2) {
                          nextValue = parts[0] + '.' + parts[1].substring(0, 2);
                        }
                      }
                      const numericValue = Number(nextValue);
                      if (nextValue !== '' && !Number.isNaN(numericValue) && numericValue > MAX_PRICE) {
                        nextValue = MAX_PRICE.toString();
                      }
                      setFormData({ ...formData, overridePrice: nextValue });
                      if (showErrors && fieldErrors.overridePrice) {
                        setFieldErrors({ ...fieldErrors, overridePrice: '' });
                      }
                    }}
                    className={`glass-input w-full pr-7 pl-3.5 py-2.5 rounded-xl text-sm text-gray-800 text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${
                      showErrors && fieldErrors.overridePrice ? 'border-red-400 focus:ring-red-400/50' : ''
                    }`}
                    placeholder="0.00"
                    dir="ltr"
                  />
                </div>
                {showErrors && fieldErrors.overridePrice && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.overridePrice}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="btn-cancel"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>ביטול</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-save"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>יוצר...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>צור מחיר מיוחד</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Override Modal */}
      {isEditModalOpen && overrideToEdit && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" 
          dir="rtl" 
          style={{ margin: 0, top: 0 }}
          {...editModalBackdropProps}
        >
          <div 
            className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-xl shadow-xl"
            {...editModalContentProps}
          >
            <div className="modal-header">
              <h2 className="modal-header-title">ערוך מחיר מיוחד</h2>
              <CloseButton onClick={handleCloseEditModal} />
            </div>

            {/* Show product and customer info (read-only) */}
            <div className="mb-4 p-4 bg-gray-100/50 rounded-xl space-y-2">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">מוצר:</span> {getProductName(overrideToEdit.productId)}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">לקוח:</span> {getCustomerName(overrideToEdit.customerId)}
              </p>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50/80 border border-red-200/60 rounded-xl text-red-600 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5" noValidate>
              {/* Override Price */}
              <div>
                <label htmlFor="edit-overridePrice" className="block text-xs font-medium text-gray-700 mb-1.5">
                  מחיר מותאם *
                </label>
                <div className="relative">
                  <span className="absolute right-3 top-2.5 text-gray-700 text-sm font-semibold z-10">₪</span>
                  <input
                    id="edit-overridePrice"
                    name="overridePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    max={MAX_PRICE}
                    value={editFormData.overridePrice}
                    onChange={(e) => {
                      const { value } = e.target;
                      let nextValue = value;
                      // Limit to 2 decimal places
                      if (nextValue.includes('.')) {
                        const parts = nextValue.split('.');
                        if (parts[1] && parts[1].length > 2) {
                          nextValue = parts[0] + '.' + parts[1].substring(0, 2);
                        }
                      }
                      const numericValue = Number(nextValue);
                      if (nextValue !== '' && !Number.isNaN(numericValue) && numericValue > MAX_PRICE) {
                        nextValue = MAX_PRICE.toString();
                      }
                      setEditFormData({ overridePrice: nextValue });
                      if (showErrors && fieldErrors.overridePrice) {
                        setFieldErrors({ ...fieldErrors, overridePrice: '' });
                      }
                    }}
                    className={`glass-input w-full pr-7 pl-3.5 py-2.5 rounded-xl text-sm text-gray-800 text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${
                      showErrors && fieldErrors.overridePrice ? 'border-red-400 focus:ring-red-400/50' : ''
                    }`}
                    placeholder="0.00"
                    dir="ltr"
                  />
                </div>
                {showErrors && fieldErrors.overridePrice && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.overridePrice}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={isSubmitting}
                  className="btn-cancel"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>ביטול</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-save"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>מעדכן...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>עדכן מחיר מיוחד</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {overrideToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          {...deleteModalBackdropProps}
        >
          <div 
            className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/85"
            {...deleteModalContentProps}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">מחק מחיר מיוחד</h2>
              <button
                onClick={() => setOverrideToDelete(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                האם אתה בטוח שברצונך למחוק את המחיר המיוחד הזה?
              </p>
              <div className="p-4 bg-gray-100/50 rounded-xl space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">לקוח:</span> {getCustomerName(overrideToDelete.customerId)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">מוצר:</span> {getProductName(overrideToDelete.productId)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">מחיר מקורי:</span> {formatPrice(productMap.get(overrideToDelete.productId)?.price ?? 0)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">מחיר מותאם:</span> {formatPrice(overrideToDelete.overridePrice)}
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setOverrideToDelete(null)}
                disabled={isDeleting}
                className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                onClick={handleDeleteOverride}
                disabled={isDeleting}
                className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 border-red-700 disabled:opacity-50"
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
