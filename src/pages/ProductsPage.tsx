import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productAPI, categoryAPI } from '../services/api';
import type { Product, Category } from '../services/api';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  
  // Sorting state
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC');

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    originalPrice: '',
    specialPrice: '',
    description: '',
    pictureUrl: '',
  });
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    categoryId: '',
    originalPrice: '',
    specialPrice: '',
    description: '',
    pictureUrl: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts(currentPage);
    fetchCategories();
  }, [currentPage, sortBy, sortDirection, pageSize, categoryFilter]);

  const fetchProducts = async (page: number = 0) => {
    try {
      setIsLoading(true);
      setError('');

      const pageResponse = await productAPI.getAllProducts(
        page, 
        pageSize, 
        sortBy, 
        sortDirection, 
        categoryFilter || undefined
      );
      setProducts(pageResponse.content);
      setTotalPages(pageResponse.totalPages);
      setTotalElements(pageResponse.totalElements);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
      if (err.message.includes('401')) {
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await categoryAPI.getAllCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleSortChange = (newSortBy: string) => {
    // If clicking the same sort field, toggle direction
    if (newSortBy === sortBy) {
      setSortDirection(sortDirection === 'ASC' ? 'DESC' : 'ASC');
    } else {
      // New sort field, default to ASC
      setSortBy(newSortBy);
      setSortDirection('ASC');
    }
    setCurrentPage(0); // Reset to first page when sorting changes
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0); // Reset to first page when page size changes
  };

  const handleCategoryFilterChange = (categoryId: string) => {
    setCategoryFilter(categoryId);
    setCurrentPage(0); // Reset to first page when category changes
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear error for this field when user starts typing
    if (showErrors && fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: '',
      });
    }
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setFormData({
      name: '',
      categoryId: '',
      originalPrice: '',
      specialPrice: '',
      description: '',
      pictureUrl: '',
    });
    setFormError('');
    setFieldErrors({});
    setShowErrors(false);
  };

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    setEditFormData({
      name: product.name,
      categoryId: product.categoryId || '',
      originalPrice: product.originalPrice.toString(),
      specialPrice: product.specialPrice.toString(),
      description: product.description,
      pictureUrl: product.pictureUrl || '',
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setProductToEdit(null);
    setEditFormData({
      name: '',
      categoryId: '',
      originalPrice: '',
      specialPrice: '',
      description: '',
      pictureUrl: '',
    });
    setFormError('');
    setFieldErrors({});
    setShowErrors(false);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value,
    });
    if (showErrors && fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: '',
      });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productToEdit) return;

    setFormError('');
    setShowErrors(true);

    const errors: Record<string, string> = {};
    
    if (!editFormData.name.trim()) {
      errors.name = 'Product name is required';
    }
    if (!editFormData.originalPrice) {
      errors.originalPrice = 'Original price is required';
    } else if (isNaN(Number(editFormData.originalPrice)) || Number(editFormData.originalPrice) <= 0) {
      errors.originalPrice = 'Original price must be a positive number';
    }
    if (editFormData.specialPrice && (isNaN(Number(editFormData.specialPrice)) || Number(editFormData.specialPrice) <= 0)) {
      errors.specialPrice = 'Special price must be a positive number';
    }
    // Validate that special price is not greater than original price
    if (editFormData.specialPrice && editFormData.originalPrice && Number(editFormData.specialPrice) > Number(editFormData.originalPrice)) {
      errors.specialPrice = 'Special price cannot be greater than original price';
    }
    if (!editFormData.pictureUrl.trim()) {
      errors.pictureUrl = 'Picture URL is required';
    }

    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('authToken');
      
      const finalSpecialPrice = editFormData.specialPrice ? Number(editFormData.specialPrice) : Number(editFormData.originalPrice);
      
      const response = await fetch(`http://localhost:8080/api/products/${productToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editFormData.name,
          categoryId: editFormData.categoryId || null,
          originalPrice: Number(editFormData.originalPrice),
          specialPrice: finalSpecialPrice,
          description: editFormData.description,
          pictureUrl: editFormData.pictureUrl,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update product');
      }

      setCurrentPage(0); // Reset to first page
      await fetchProducts(0); // Explicitly fetch to ensure refresh
      handleCloseEditModal();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8080/api/products/${productToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      setProductToDelete(null);
      setCurrentPage(0); // Reset to first page
      await fetchProducts(0); // Explicitly fetch to ensure refresh
    } catch (err: any) {
      setError(err.message || 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setShowErrors(true);

    // Validation
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    }
    if (!formData.originalPrice) {
      errors.originalPrice = 'Original price is required';
    } else if (isNaN(Number(formData.originalPrice)) || Number(formData.originalPrice) <= 0) {
      errors.originalPrice = 'Original price must be a positive number';
    }
    // Special price is optional - if not provided, use originalPrice
    if (formData.specialPrice && (isNaN(Number(formData.specialPrice)) || Number(formData.specialPrice) <= 0)) {
      errors.specialPrice = 'Special price must be a positive number';
    }
    // Validate that special price is not greater than original price
    if (formData.specialPrice && formData.originalPrice && Number(formData.specialPrice) > Number(formData.originalPrice)) {
      errors.specialPrice = 'Special price cannot be greater than original price';
    }
    if (!formData.pictureUrl.trim()) {
      errors.pictureUrl = 'Picture URL is required';
    }

    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('authToken');
      
      // Use originalPrice as specialPrice if specialPrice is not provided
      const finalSpecialPrice = formData.specialPrice ? Number(formData.specialPrice) : Number(formData.originalPrice);
      
      const response = await fetch('http://localhost:8080/api/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          categoryId: formData.categoryId || null,
          originalPrice: Number(formData.originalPrice),
          specialPrice: finalSpecialPrice,
          description: formData.description,
          pictureUrl: formData.pictureUrl,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create product');
      }

      // Success - refresh products and close modal
      setCurrentPage(0); // Reset to first page
      await fetchProducts(0); // Explicitly fetch to ensure refresh
      handleCloseModal();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create product');
    } finally {
      setIsSubmitting(false);
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
          <p className="text-gray-600 font-medium">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-3xl p-8 bg-red-50/50 border-red-200">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Products</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Products</h1>
            <p className="text-gray-600">Your product catalog ({products.length} products)</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="glass-button mt-4 md:mt-0 px-6 py-3 rounded-xl font-semibold text-gray-800 hover:shadow-lg transition-all flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Sort Controls & Pagination Info */}
      {(products.length > 0 || categoryFilter) && (
        <div className="glass-card rounded-3xl p-6">
          <div className="flex flex-col gap-4">
            {/* Row 1: All controls on one line */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Left side: Category Filter, Sort Controls and Page Size */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Category Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Category:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => handleCategoryFilterChange(e.target.value)}
                    className="glass-select px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-32"
                  >
                    <option value="">All</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 mr-1">Sort by:</span>
                  <button
                    onClick={() => handleSortChange('name')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-1 ${
                      sortBy === 'name'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'glass-button text-gray-800 hover:shadow-md'
                    }`}
                  >
                    <span>Name</span>
                    {sortBy === 'name' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortDirection === 'ASC' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleSortChange('specialPrice')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-1 ${
                      sortBy === 'specialPrice'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'glass-button text-gray-800 hover:shadow-md'
                    }`}
                  >
                    <span>Price</span>
                    {sortBy === 'specialPrice' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortDirection === 'ASC' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    )}
                  </button>
                  {sortBy !== 'name' && (
                    <button
                      onClick={() => {
                        setSortBy('name');
                        setSortDirection('ASC');
                        setCurrentPage(0);
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700 underline ml-1"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Page Size Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="glass-select px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-20"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Right side: Page Navigation */}
              <div className="flex items-center justify-center lg:justify-end gap-1">
                {/* Previous button */}
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="glass-button px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i).map((page) => {
                  // Show first page, last page, current page, and pages around current
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
                      <span key={`ellipsis-top-${page}`} className="px-2 text-gray-400">
                        ...
                      </span>
                    );
                  }

                  return (
                    <button
                      key={`top-${page}`}
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

                {/* Next button */}
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages - 1}
                  className="glass-button px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Row 2: Page Info */}
            <div className="text-sm text-gray-600 font-medium text-center lg:text-left">
              Showing <span className="font-semibold text-gray-800">{currentPage * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-gray-800">
                {Math.min((currentPage + 1) * pageSize, totalElements)}
              </span>{' '}
              of <span className="font-semibold text-gray-800">{totalElements}</span> products
            </div>
          </div>
        </div>
      )}

      {/* Products List */}
      {products.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            {/* Show different message based on whether it's a category filter or no products at all */}
            {categoryFilter ? (
              // Category filter with 0 results
              <>
                <div className="p-6 rounded-full bg-gray-100/50">
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">No Products in This Category</h2>
                <p className="text-gray-600 max-w-md">
                  There are no products in the selected category yet.
                </p>
                <button
                  onClick={() => handleCategoryFilterChange('')}
                  className="glass-button mt-4 px-8 py-3 rounded-xl font-semibold text-gray-800 hover:shadow-lg transition-all"
                >
                  Show All Products
                </button>
              </>
            ) : (
              // No products at all
              <>
                <div className="p-6 rounded-full bg-indigo-100/50">
                  <svg className="w-16 h-16 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">No Products Yet</h2>
                <p className="text-gray-600 max-w-md">
                  You haven't added any products to your catalog yet.
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="glass-button mt-4 px-8 py-3 rounded-xl font-semibold text-gray-800 hover:shadow-lg transition-all"
                >
                  Add Your First Product
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((product) => {
            const category = categories.find(cat => cat.id === product.categoryId);
            return (
              <div key={product.id} className="glass-card rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                {/* Product Image */}
                <div className="aspect-square bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 relative overflow-hidden">
                  {product.pictureUrl ? (
                    <img
                      src={product.pictureUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Category Badge */}
                  {category && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 text-xs font-semibold bg-white/90 backdrop-blur-sm text-indigo-700 rounded-full shadow-md">
                        {category.category}
                      </span>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="p-1.5 rounded-lg bg-white/90 hover:bg-white transition-colors shadow-md"
                      title="Edit product"
                    >
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setProductToDelete(product)}
                      className="p-1.5 rounded-lg bg-white/90 hover:bg-red-50 transition-colors shadow-md"
                      title="Delete product"
                    >
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-3 space-y-2">
                  <h3 className="text-sm font-bold text-gray-800 truncate" title={product.name}>
                    {product.name}
                  </h3>

                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-base font-bold text-indigo-600">
                        {formatPrice(product.specialPrice)}
                      </span>
                      {product.originalPrice !== product.specialPrice && (
                        <span className="text-xs text-gray-500 line-through">
                          {formatPrice(product.originalPrice)}
                        </span>
                      )}
                    </div>
                    
                    {product.originalPrice !== product.specialPrice && (
                      <span className="px-1.5 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                        SALE
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Page Navigation */}
      {!isLoading && products.length > 0 && (
        <div className="glass-card rounded-3xl p-6 mt-4">
          <div className="flex items-center justify-center">
            {/* Page numbers */}
            <div className="flex items-center space-x-2">
              {/* Previous button */}
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="glass-button px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i).map((page) => {
                // Show first page, last page, current page, and pages around current
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

              {/* Next button */}
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
                className="glass-button px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white/85">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Add New Product</h2>
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

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    showErrors && fieldErrors.name ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="e.g., Premium Coffee Beans"
                />
                {showErrors && fieldErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  className="glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">None</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="originalPrice" className="block text-sm font-medium text-gray-700 mb-2">
                    Original Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-600 text-sm">$</span>
                    <input
                      id="originalPrice"
                      name="originalPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.originalPrice}
                      onChange={handleInputChange}
                      className={`glass-input w-full pl-7 pr-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        showErrors && fieldErrors.originalPrice ? 'border-red-400 focus:ring-red-400' : ''
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                  {showErrors && fieldErrors.originalPrice && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.originalPrice}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="specialPrice" className="block text-sm font-medium text-gray-700 mb-2">
                    Special Price <span className="text-gray-500 text-xs">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-600 text-sm">$</span>
                    <input
                      id="specialPrice"
                      name="specialPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.specialPrice}
                      onChange={handleInputChange}
                      className={`glass-input w-full pl-7 pr-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        showErrors && fieldErrors.specialPrice ? 'border-red-400 focus:ring-red-400' : ''
                      }`}
                      placeholder="Leave empty to use original price"
                    />
                  </div>
                  {showErrors && fieldErrors.specialPrice && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.specialPrice}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Product description (optional)"
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="pictureUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Picture URL *
                </label>
                <input
                  id="pictureUrl"
                  name="pictureUrl"
                  type="url"
                  value={formData.pictureUrl}
                  onChange={handleInputChange}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    showErrors && fieldErrors.pictureUrl ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="https://example.com/image.jpg"
                />
                {showErrors && fieldErrors.pictureUrl && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.pictureUrl}</p>
                )}
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
                    <span>Create Product</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && productToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white/85">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Edit Product</h2>
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
                  Product Name *
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
                  placeholder="e.g., Premium Coffee Beans"
                />
                {showErrors && fieldErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="edit-categoryId" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  id="edit-categoryId"
                  name="categoryId"
                  value={editFormData.categoryId}
                  onChange={handleEditInputChange}
                  className="glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">None</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-originalPrice" className="block text-sm font-medium text-gray-700 mb-2">
                    Original Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-600 text-sm">$</span>
                    <input
                      id="edit-originalPrice"
                      name="originalPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.originalPrice}
                      onChange={handleEditInputChange}
                      className={`glass-input w-full pl-7 pr-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        showErrors && fieldErrors.originalPrice ? 'border-red-400 focus:ring-red-400' : ''
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                  {showErrors && fieldErrors.originalPrice && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.originalPrice}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="edit-specialPrice" className="block text-sm font-medium text-gray-700 mb-2">
                    Special Price <span className="text-gray-500 text-xs">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-600 text-sm">$</span>
                    <input
                      id="edit-specialPrice"
                      name="specialPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.specialPrice}
                      onChange={handleEditInputChange}
                      className={`glass-input w-full pl-7 pr-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        showErrors && fieldErrors.specialPrice ? 'border-red-400 focus:ring-red-400' : ''
                      }`}
                      placeholder="Leave empty to use original price"
                    />
                  </div>
                  {showErrors && fieldErrors.specialPrice && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.specialPrice}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditInputChange}
                  className="glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Product description (optional)"
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="edit-pictureUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Picture URL *
                </label>
                <input
                  id="edit-pictureUrl"
                  name="pictureUrl"
                  type="url"
                  value={editFormData.pictureUrl}
                  onChange={handleEditInputChange}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    showErrors && fieldErrors.pictureUrl ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="https://example.com/image.jpg"
                />
                {showErrors && fieldErrors.pictureUrl && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.pictureUrl}</p>
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
                    <span>Update Product</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/90">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Delete Product</h2>
              <button
                onClick={() => setProductToDelete(null)}
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
                Are you sure you want to delete <span className="font-semibold">{productToDelete.name}</span>? This action cannot be undone.
              </p>
              <div className="glass-card bg-yellow-50/50 border-yellow-200 rounded-xl p-4">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-yellow-800">
                    This product will be removed from your catalog. Historical data will be preserved in the system.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="glass-button flex-1 py-2.5 px-4 rounded-xl font-semibold text-gray-800 bg-gray-100/60 hover:bg-gray-200/70 border-gray-400 hover:border-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
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
                  <span>Delete Product</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
