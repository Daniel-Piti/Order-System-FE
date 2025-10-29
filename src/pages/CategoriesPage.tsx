import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryAPI } from '../services/api';
import type { Category } from '../services/api';

interface Product {
  id: string;
  categoryId: string | null;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  // Calculate pagination
  const { paginatedCategories, totalPages } = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = categories.slice(startIndex, endIndex);
    const total = Math.ceil(categories.length / pageSize);
    return { paginatedCategories: paginated, totalPages: total };
  }, [categories, currentPage, pageSize]);

  // Count products per category
  const productCountByCategory = useMemo(() => {
    const countMap = new Map<string, number>();
    products.forEach(product => {
      if (product.categoryId) {
        countMap.set(product.categoryId, (countMap.get(product.categoryId) || 0) + 1);
      }
    });
    return countMap;
  }, [products]);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const data = await categoryAPI.getAllCategories();
      setCategories(data);
      setCurrentPage(1); // Reset to first page when data changes
    } catch (err: any) {
      setError(err.message || 'Failed to load categories');
      if (err.message.includes('401') || err.message.includes('User ID not found')) {
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8080/api/products?page=0&size=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.content.map((p: any) => ({ id: p.id, categoryId: p.categoryId })));
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setCategoryName('');
    setFormError('');
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setCategoryToEdit(null);
    setCategoryName('');
    setFormError('');
  };

  const handleEditCategory = (category: Category) => {
    setCategoryToEdit(category);
    setCategoryName(category.category);
    setIsEditModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!categoryName.trim()) {
      setFormError('Category name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('http://localhost:8080/api/categories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: categoryName,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to create category';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.userMessage || errorData.message || 'Failed to create category';
        } catch (parseError) {
          // If JSON parse fails, use the raw error text
          errorMessage = errorText || 'Failed to create category';
        }
        throw new Error(errorMessage);
      }

      await fetchCategories();
      handleCloseModal();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!categoryName.trim()) {
      setFormError('Category name is required');
      return;
    }

    if (!categoryToEdit) return;

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`http://localhost:8080/api/categories/${categoryToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: categoryName,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to update category';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.userMessage || errorData.message || 'Failed to update category';
        } catch (parseError) {
          // If JSON parse fails, use the raw error text
          errorMessage = errorText || 'Failed to update category';
        }
        throw new Error(errorMessage);
      }

      await fetchCategories();
      handleCloseEditModal();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`http://localhost:8080/api/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to delete category';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.userMessage || errorData.message || 'Failed to delete category';
        } catch (parseError) {
          // If JSON parse fails, use the raw error text
          errorMessage = errorText || 'Failed to delete category';
        }
        throw new Error(errorMessage);
      }

      await fetchCategories();
      setCategoryToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
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
          <p className="text-gray-600 font-medium">Loading categories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-3xl p-8 bg-red-50/50 border-red-200">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Categories</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Categories</h1>
            <p className="text-gray-600">
              Manage your product categories ({categories.length} total)
              {categories.length > 0 && ` - Showing ${((currentPage - 1) * pageSize) + 1}-${Math.min(currentPage * pageSize, categories.length)}`}
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 md:mt-0 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 border-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Category</span>
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
          {/* Pagination Controls */}
          <div className="glass-card rounded-3xl p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="glass-select px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-20"
                >
                  <option value={1}>1</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Page Navigation */}
              <div className="flex items-center gap-1">
                {/* Previous button */}
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="glass-button px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  const showPage =
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 1;

                  const showEllipsis =
                    (page === 2 && currentPage > 4) ||
                    (page === totalPages - 1 && currentPage < totalPages - 3);

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
                      {page}
                    </button>
                  );
                })}

                {/* Next button */}
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="glass-button px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

        <div className="glass-card rounded-3xl p-6 md:p-8">
          <div className="space-y-2">
              {paginatedCategories.map((category) => (
              <div key={category.id} className="glass-card rounded-xl p-4 hover:shadow-md transition-all flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-indigo-100/50 flex-shrink-0">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                    <div className="flex-1 min-w-0 flex items-center space-x-2">
                    <h3 className="text-base font-bold text-gray-800 truncate" title={category.category}>
                      {category.category}
                    </h3>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                        {productCountByCategory.get(category.id) || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => handleEditCategory(category)}
                      className="glass-button p-2 rounded-xl hover:shadow-md transition-all"
                  title="Edit category"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                    </button>
                    <button
                      onClick={() => setCategoryToDelete(category)}
                      className="glass-button p-2 rounded-xl hover:shadow-md transition-all border-red-500 hover:border-red-600"
                      title="Delete category"
                    >
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                </button>
                  </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/85">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Add New Category</h2>
              <button
                onClick={handleCloseModal}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  id="categoryName"
                  name="categoryName"
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Beverages, Snacks, Electronics"
                  autoFocus
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
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
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Category</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {isEditModalOpen && categoryToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/85">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Edit Category</h2>
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

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label htmlFor="editCategoryName" className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  id="editCategoryName"
                  name="editCategoryName"
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Beverages, Snacks, Electronics"
                  autoFocus
                />
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
                    <span>Update Category</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/90">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Delete Category</h2>
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
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete the category <span className="font-semibold">{categoryToDelete.category}</span>? This action cannot be undone.
              </p>
              <div className="glass-card bg-yellow-50/50 border-yellow-200 rounded-xl p-4">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-yellow-800">
                    Products associated with this category will become uncategorized.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setCategoryToDelete(null)}
                disabled={isDeleting}
                className="glass-button flex-1 py-2.5 px-4 rounded-xl font-semibold text-gray-800 bg-gray-100/60 hover:bg-gray-200/70 border-gray-400 hover:border-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCategory}
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
                  <span>Delete Category</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

