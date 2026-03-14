import { useEffect, useMemo, useState } from 'react';
import CloseButton from '../components/CloseButton';
import { useNavigate } from 'react-router-dom';
import { agentAPI, publicAPI, type Customer, type Agent } from '../services/api';
import PaginationBar from '../components/PaginationBar';
import { formatPrice } from '../utils/formatPrice';
import type { ProductListItem, CustomerListItem, ProductOverride, ProductOverrideWithPrice } from '../utils/types';
import { useModalBackdrop } from '../hooks/useModalBackdrop';

const MAX_PRICE = 1_000_000;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

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
  const [addModalProductSearch, setAddModalProductSearch] = useState('');

  const navigate = useNavigate();
  const { backdropProps: addModalBackdropProps, contentProps: addModalContentProps } = useModalBackdrop(() => setIsAddModalOpen(false));
  const { backdropProps: editModalBackdropProps, contentProps: editModalContentProps } = useModalBackdrop(() => setIsEditModalOpen(false));
  const { backdropProps: deleteModalBackdropProps, contentProps: deleteModalContentProps } = useModalBackdrop(() => setOverrideToDelete(null));

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
  }, [agentInfo, currentPage, pageSize, productFilter]);

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
        pageNumber: currentPage.toString(),
        pageSize: pageSize.toString(),
        sortBy: 'customer_id',
        sortOrder: 'asc',
      });
      if (productFilter) params.append('productId', productFilter);

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
      const data = await publicAPI.products.getAllByManagerId(agentInfo.managerId);
      setProducts(data.map((p) => ({ id: p.id, name: p.name, price: p.price, minimumPrice: (p as { minimumPrice?: number }).minimumPrice ?? 0 })));
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
    });
    return map;
  }, [products]);

  const customerMap = useMemo(() => {
    return new Map(customers.map(c => [c.id, c]));
  }, [customers]);


  const filteredProductsForAdd = useMemo(() => {
    const query = addModalProductSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) => p.name.toLowerCase().includes(query));
  }, [products, addModalProductSearch]);

  const handleProductFilterChange = (value: string) => {
    setProductFilter(value);
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
    setAddModalProductSearch('');
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

      const created = await response.json();
      const product = productMap.get(formData.productId) ?? productMap.get(created.productId);
      const withPrice: ProductOverrideWithPrice = {
        ...created,
        overridePrice: Number(created.overridePrice),
        productPrice: product?.price ?? 0,
        productMinimumPrice: product?.minimumPrice ?? 0,
      };
      setOverrides((prev) => [withPrice, ...prev]);
      setCurrentPage(0);
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

      const updated = await response.json();
      const product = productMap.get(overrideToEdit.productId) ?? productMap.get(updated.productId);
      const withPrice: ProductOverrideWithPrice = {
        ...updated,
        overridePrice: Number(updated.overridePrice),
        productPrice: product?.price ?? 0,
        productMinimumPrice: product?.minimumPrice ?? 0,
      };
      setOverrides((prev) => prev.map((o) => (o.id === withPrice.id ? withPrice : o)));
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

      const idToRemove = overrideToDelete.id;
      setOverrides((prev) => prev.filter((o) => o.id !== idToRemove));
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
            <p className="text-gray-600 mt-1">התאם מחירים ללקוחות שלך</p>
            <p
              className="mt-3 px-3 py-2 text-sm font-bold text-orange-800 bg-orange-50 border border-orange-200 rounded-lg max-w-md"
              role="note"
            >
              מחירים מיוחדים מחושבים לפני הנחת האחוזים של הלקוח.
            </p>
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

      {(overrides.length > 0 || productFilter) && (
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
            {productFilter ? (
              <>
                <div className="p-6 rounded-full bg-gray-100/50">
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">לא נמצאו מחירים מיוחדים תואמים</h2>
                <p className="text-gray-600 max-w-md">
                  לא נמצאו מחירים מיוחדים עבור המוצר שנבחר.
                </p>
                <button
                  onClick={() => setProductFilter('')}
                  className="glass-button mt-4 px-8 py-3 rounded-xl font-semibold text-gray-800 hover:shadow-lg transition-all"
                >
                  נקה מסנן
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
            <table 
              className="w-full"
              aria-label="טבלת מחירים מיוחדים"
              role="table"
            >
              <caption className="sr-only">
                טבלת מחירים מיוחדים עם פרטי לקוח, מוצר, מחיר מינימלי, מחיר מותאם ופעולות
              </caption>
              <thead className="bg-white/30 border-b border-gray-200/50">
                <tr>
                  <th scope="col" id="agent-override-customer" className="px-6 py-4 text-center text-sm font-semibold text-gray-700 w-64">לקוח</th>
                  <th scope="col" id="agent-override-product" className="px-6 py-4 text-center text-sm font-semibold text-gray-700 w-48 border-l border-gray-200">מוצר</th>
                  <th scope="col" id="agent-override-min-price" className="px-6 py-4 text-center text-sm font-semibold text-gray-700 border-l border-gray-200">מחיר מינימלי</th>
                  <th scope="col" id="agent-override-override-price" className="px-6 py-4 text-center text-sm font-semibold text-gray-700 border-l border-gray-200">מחיר מותאם</th>
                  <th scope="col" id="agent-override-actions" className="px-6 py-4 text-center text-sm font-semibold text-gray-700 border-l border-gray-200 w-24">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {overrides.map((override) => {
                  const customerName = customerMap.get(override.customerId)?.name ?? override.customerId;
                  const productName = productMap.get(override.productId)?.name ?? override.productId;
                  return (
                    <tr key={override.id} className="hover:bg-white/20 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-800 font-medium" headers="agent-override-customer">
                        <span className="inline-block max-w-[200px] truncate" title={customerName}>
                          {customerName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800 border-l border-gray-200" headers="agent-override-product">
                        <span className="inline-block max-w-[220px] truncate align-middle" title={productName}>
                          {productName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800 border-l border-gray-200" headers="agent-override-min-price">
                        {formatPrice(override.productMinimumPrice ?? override.productPrice)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800 font-semibold border-l border-gray-200" headers="agent-override-override-price">
                        {formatPrice(override.overridePrice)}
                      </td>
                      <td className="px-6 py-4 text-right border-l border-gray-200" headers="agent-override-actions">
                        <div className="flex items-center justify-end gap-2" role="group" aria-label={`פעולות עבור מחיר מיוחד עבור ${customerName}`}>
                          <button
                            className="glass-button p-2 rounded-lg hover:shadow-md transition-all focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                            onClick={() => handleEditOverride(override)}
                            aria-label={`ערוך מחיר מיוחד עבור ${customerName} - ${productName}`}
                          >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            className="glass-button p-2 rounded-lg hover:shadow-md transition-all border-red-500 hover:border-red-600 focus-visible:outline-3 focus-visible:outline-red-600 focus-visible:outline-offset-2"
                            onClick={() => setOverrideToDelete(override)}
                            aria-label={`מחק מחיר מיוחד עבור ${customerName} - ${productName}`}
                          >
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                {showErrors && fieldErrors.customerId && <p className="text-xs text-red-500 mt-1">{fieldErrors.customerId}</p>}
              </div>

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
                    className={`glass-input w-full pr-7 pl-3.5 py-2.5 rounded-xl text-sm text-gray-800 text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${
                      showErrors && fieldErrors.overridePrice ? 'border-red-400 focus:ring-red-400/50' : ''
                    }`}
                    placeholder="0.00"
                    dir="ltr"
                  />
                </div>
                {showErrors && fieldErrors.overridePrice && <p className="text-xs text-red-500 mt-1">{fieldErrors.overridePrice}</p>}
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
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>שומר...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>שמור מחיר מיוחד</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
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
              <h2 className="modal-header-title">עדכן מחיר מיוחד</h2>
              <CloseButton onClick={handleCloseEditModal} />
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
              <div className="mb-4 p-3 bg-red-50/80 border border-red-200/60 rounded-xl text-red-600 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5" noValidate>
              <div>
                <label htmlFor="edit-overridePrice" className="block text-xs font-medium text-gray-700 mb-1.5">
                  מחיר מותאם *
                </label>
                <div className="relative">
                  <span className="absolute right-3 top-2.5 text-gray-700 text-sm font-semibold z-10">₪</span>
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
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
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

      {/* Delete Confirmation */}
      {overrideToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" 
          dir="rtl"
          {...deleteModalBackdropProps}
        >
          <div 
            className="glass-card rounded-3xl p-6 w-full max-w-md bg-white/85"
            {...deleteModalContentProps}
          >
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


