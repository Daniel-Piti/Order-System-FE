import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryAPI, managerAPI, publicAPI } from '../services/api';
import type { Category } from '../services/api';
import PaginationBar from '../components/PaginationBar';
import type { ProductWithCategory } from '../utils/types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const MAX_CATEGORY_NAME_LENGTH = 50;
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [managerId, setManagerId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchManagerId();
  }, []);

  useEffect(() => {
    if (managerId) {
      fetchCategories();
      fetchProducts();
    }
  }, [managerId]);

  // Calculate pagination (0-based)
  const { paginatedCategories, totalPages, filteredCount } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filteredCategories = query
      ? categories.filter((category) => category.category.toLowerCase().includes(query))
      : categories;

    const sortedCategories = [...filteredCategories].sort((a, b) => {
      const comparison = a.category.localeCompare(b.category);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = sortedCategories.slice(startIndex, endIndex);
    const total = Math.ceil(sortedCategories.length / pageSize);
    
    if (total > 0 && currentPage >= total) {
      return { paginatedCategories: [], totalPages: total, filteredCount: sortedCategories.length };
    }
    
    return { paginatedCategories: paginated, totalPages: total, filteredCount: sortedCategories.length };
  }, [categories, currentPage, pageSize, searchQuery, sortDirection]);

  // Reset currentPage if it's out of bounds after pageSize change
  useEffect(() => {
    if (totalPages > 0 && currentPage >= totalPages) {
      setCurrentPage(0);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, sortDirection, pageSize]);

  // Count products per category
  const productCountByCategory = useMemo(() => {
    const countMap = new Map<number, number>();
    products.forEach(product => {
      if (product.categoryId) {
        countMap.set(product.categoryId, (countMap.get(product.categoryId) || 0) + 1);
      }
    });
    return countMap;
  }, [products]);

  const fetchCategories = async () => {
    const id = managerId;
    if (!id) return;
    try {
      setIsLoading(true);
      setError('');

      const data = await publicAPI.categories.getAllByManagerId(id);
      setCategories(data);
      setCurrentPage(0); // Reset to first page when data changes (0-based)
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('authToken');
        navigate('/login/manager');
        return;
      }

      const errorMessage = err.response?.data?.userMessage ||
        err.response?.data?.message ||
        err.message ||
        'נכשל בטעינת הקטגוריות';
      
      // Translate "Network Error" to Hebrew (check both message and axios error codes)
      const isNetworkError = errorMessage === 'Network Error' || 
        errorMessage?.includes('Network Error') ||
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNABORTED';
      
      const translatedMessage = isNetworkError ? 'שגיאת רשת' : errorMessage;
      
      setError(translatedMessage);
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
      const data = await publicAPI.products.getAllByManagerId(managerId, 0, 1000);
      setProducts(data.content.map((p: any) => ({ id: p.id, categoryId: p.categoryId })));
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setCategoryName('');
    setFormError('');
    setFieldErrors({});
    setShowErrors(false);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setCategoryToEdit(null);
    setCategoryName('');
    setFormError('');
    setFieldErrors({});
    setShowErrors(false);
  };

  const handleEditCategory = (category: Category) => {
    setCategoryToEdit(category);
    setCategoryName(category.category.slice(0, MAX_CATEGORY_NAME_LENGTH));
    setIsEditModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});
    setShowErrors(true);

    const errors: Record<string, string> = {};
    if (!categoryName.trim()) {
      errors.name = 'שם הקטגוריה נדרש';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);

      await categoryAPI.createCategory(categoryName.trim());

      await fetchCategories();
      handleCloseModal();
    } catch (err: any) {
      const message =
        err.response?.data?.userMessage ||
        err.response?.data?.message ||
        err.message ||
        'נכשל ביצירת קטגוריה';
      setFormError(message);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('authToken');
        navigate('/login/manager');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});
    setShowErrors(true);

    const errors: Record<string, string> = {};
    if (!categoryName.trim()) {
      errors.name = 'שם הקטגוריה נדרש';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    if (!categoryToEdit) return;

    try {
      setIsSubmitting(true);
      await categoryAPI.updateCategory(categoryToEdit.id, categoryName.trim());

      await fetchCategories();
      handleCloseEditModal();
    } catch (err: any) {
      const message =
        err.response?.data?.userMessage ||
        err.response?.data?.message ||
        err.message ||
        'נכשל בעדכון קטגוריה';
      setFormError(message);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('authToken');
        navigate('/login/manager');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      setIsDeleting(true);
      await categoryAPI.deleteCategory(categoryToDelete.id);

      await fetchCategories();
      setCategoryToDelete(null);
    } catch (err: any) {
      const message =
        err.response?.data?.userMessage ||
        err.response?.data?.message ||
        err.message ||
        'נכשל במחיקת קטגוריה';
      setError(message);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('authToken');
        navigate('/login/manager');
      }
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
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-600 font-medium">... טוען קטגוריות</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-3xl p-8 bg-red-50/50 border-red-200">
          <h2 className="text-xl font-bold text-red-800 mb-2">שגיאה בטעינת קטגוריות</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-32" dir="rtl">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">קטגוריות</h1>
            <p className="text-gray-600">
              צפה ונהל את קטגוריות המוצרים שלך ({categories.length} סה״כ)
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 md:mt-0 btn-add-indigo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>הוסף קטגוריה</span>
          </button>
        </div>
      </div>

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-6 rounded-full bg-indigo-100/50">
              <svg className="w-16 h-16 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">No Categories Yet</h2>
            <p className="text-gray-600 max-w-md">
              You haven't created any categories yet. Categories help organize your products.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="glass-button mt-4 px-8 py-3 rounded-xl font-semibold text-gray-800 hover:shadow-lg transition-all"
            >
              Add Your First Category
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="glass-card rounded-3xl p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">הצג:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(0);
                    }}
                    className="glass-select pl-3 pr-8 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-18"
                    dir="ltr"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">מיין:</span>
                  <button
                    type="button"
                    onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                    className="glass-button px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 flex items-center gap-2"
                    aria-pressed={sortDirection === 'desc'}
                    aria-label={`Sort categories ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
                  >
                    {sortDirection === 'asc' ? (
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-indigo-600 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                    <span>{sortDirection === 'asc' ? 'א ← ת' : 'א → ת'}</span>
                  </button>
                </div>
              </div>

              <div className="relative w-full sm:w-80 sm:max-w-xs">
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-5.197-5.197m0 0A6 6 0 1010.606 4.5a6 6 0 005.197 11.303z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חפש קטגוריות..."
                  maxLength={100}
                  className="glass-input w-full pr-10 pl-10 py-2 rounded-xl text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 border-2 border-gray-400/80 hover:border-gray-500 focus:border-gray-400 bg-white/50 focus:bg-white/60 shadow-lg hover:shadow-xl"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="נקה חיפוש"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 md:p-8">
            <div className="space-y-2">
              {filteredCount === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="p-5 rounded-full bg-indigo-100/50">
                      <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800">No categories found</h2>
                    <p className="text-gray-600 max-w-sm">
                      Try adjusting your search or clear the filters to see all categories.
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="glass-button px-6 py-2 rounded-xl font-semibold text-indigo-600 hover:shadow-md transition-all"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                paginatedCategories.map((category) => (
                  <div key={category.id} className="glass-card rounded-xl p-4 hover:shadow-md transition-all flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-indigo-100/50 flex-shrink-0">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <h3 className="text-base font-bold text-gray-800 truncate" title={category.category}>
                          {category.category}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                          {productCountByCategory.get(category.id) || 0} {productCountByCategory.get(category.id) === 1 ? 'מוצר' : 'מוצרים'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-4 mr-4">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="glass-button p-2 rounded-xl hover:shadow-md transition-all"
                        title="ערוך קטגוריה"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setCategoryToDelete(category)}
                        className="glass-button p-2 rounded-xl hover:shadow-md transition-all border-red-500 hover:border-red-600"
                        title="מחק קטגוריה"
                      >
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls - Bottom */}
      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        maxWidth="max-w-4xl"
        showCondition={filteredCount > 0 && totalPages > 0}
        rtl={true}
      />

      {/* Add Category Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl" style={{ margin: 0, top: 0 }}>
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/90 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-gray-900">הוסף קטגוריה חדשה</h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100/50 rounded-xl transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
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
              <div className="mb-4 p-3 bg-red-50/80 border border-red-200/60 rounded-xl text-red-600 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="categoryName" className="block text-xs font-medium text-gray-700 mb-1.5">
                  שם *
                </label>
                <input
                  id="categoryName"
                  name="categoryName"
                  type="text"
                  value={categoryName}
                  onChange={(e) => {
                    setCategoryName(e.target.value.slice(0, MAX_CATEGORY_NAME_LENGTH));
                    if (showErrors && fieldErrors.name) {
                      setFieldErrors({ ...fieldErrors, name: '' });
                    }
                  }}
                  maxLength={MAX_CATEGORY_NAME_LENGTH}
                  className={`glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-center ${
                    showErrors && fieldErrors.name ? 'border-red-400 focus:ring-red-400/50' : ''
                  }`}
                  dir="ltr"
                  placeholder="לדוגמה: משקאות, חטיפים, אלקטרוניקה"
                  autoFocus
                />
                {showErrors && fieldErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
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
                      <span>יוצר...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>צור קטגוריה</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {isEditModalOpen && categoryToEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl" style={{ margin: 0, top: 0 }}>
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/90 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-gray-900">ערוך קטגוריה</h2>
              <button
                onClick={handleCloseEditModal}
                className="p-2 hover:bg-gray-100/50 rounded-xl transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
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
              <div className="mb-4 p-3 bg-red-50/80 border border-red-200/60 rounded-xl text-red-600 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="editCategoryName" className="block text-xs font-medium text-gray-700 mb-1.5">
                  שם *
                </label>
                <input
                  id="editCategoryName"
                  name="editCategoryName"
                  type="text"
                  value={categoryName}
                  onChange={(e) => {
                    setCategoryName(e.target.value.slice(0, MAX_CATEGORY_NAME_LENGTH));
                    if (showErrors && fieldErrors.name) {
                      setFieldErrors({ ...fieldErrors, name: '' });
                    }
                  }}
                  maxLength={MAX_CATEGORY_NAME_LENGTH}
                  className={`glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-center ${
                    showErrors && fieldErrors.name ? 'border-red-400 focus:ring-red-400/50' : ''
                  }`}
                  dir="ltr"
                  placeholder="לדוגמה: משקאות, חטיפים, אלקטרוניקה"
                  autoFocus
                />
                {showErrors && fieldErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
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
                      <span>מעדכן...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>עדכן קטגוריה</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" style={{ margin: 0, top: 0 }}>
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/90" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">מחק קטגוריה</h2>
              <button
                onClick={() => setCategoryToDelete(null)}
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
              <p className="text-gray-700 mb-4 break-words">
                האם אתה בטוח שברצונך למחוק את הקטגוריה <span className="font-semibold">{categoryToDelete.category}</span>? פעולה זו לא ניתנת לביטול.
              </p>
              <div className="glass-card bg-yellow-50/50 border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-yellow-800">
                    מוצרים המשויכים לקטגוריה זו יהפכו ללא קטגוריה.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCategoryToDelete(null)}
                disabled={isDeleting}
                className="glass-button flex-1 py-2.5 px-4 rounded-xl font-semibold text-gray-800 bg-gray-100/60 hover:bg-gray-200/70 border-gray-400 hover:border-gray-500 disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                onClick={handleDeleteCategory}
                disabled={isDeleting}
                className="glass-button flex-1 py-2.5 px-4 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 border-red-700 hover:border-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    <span>מוחק...</span>
                  </>
                ) : (
                  <span>מחק קטגוריה</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

