import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { managerAPI, publicAPI } from '../services/api';
import type { Brand } from '../services/api';
import PaginationBar from '../components/PaginationBar';
import type { ProductWithBrand } from '../utils/types';

export default function BrandsPage() {
  const MAX_BRAND_NAME_LENGTH = 50;
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<ProductWithBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [brandToEdit, setBrandToEdit] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [managerId, setManagerId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchManagerId();
  }, []);

  useEffect(() => {
    if (managerId) {
      fetchBrands();
      fetchProducts();
    }
  }, [managerId]);

  // Calculate pagination (0-based)
  const { paginatedBrands, totalPages, filteredCount } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filteredBrands = query
      ? brands.filter((brand) => brand.name.toLowerCase().includes(query))
      : brands;

    const sortedBrands = [...filteredBrands].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = sortedBrands.slice(startIndex, endIndex);
    const total = Math.ceil(sortedBrands.length / pageSize);

    if (total > 0 && currentPage >= total) {
      return { paginatedBrands: [], totalPages: total, filteredCount: sortedBrands.length };
    }

    return { paginatedBrands: paginated, totalPages: total, filteredCount: sortedBrands.length };
  }, [brands, currentPage, pageSize, searchQuery, sortDirection]);

  // Reset currentPage if it's out of bounds after pageSize change
  useEffect(() => {
    if (totalPages > 0 && currentPage >= totalPages) {
      setCurrentPage(0);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, sortDirection]);

  // Count products per brand
  const productCountByBrand = useMemo(() => {
    const countMap = new Map<number, number>();
    products.forEach(product => {
      if (product.brandId) {
        countMap.set(product.brandId, (countMap.get(product.brandId) || 0) + 1);
      }
    });
    return countMap;
  }, [products]);

  const fetchBrands = async () => {
    if (!managerId) return;
    try {
      setIsLoading(true);
      setError('');

      const data = await publicAPI.brands.getAllByManagerId(managerId);
      setBrands(data);
      setCurrentPage(0); // Reset to first page when data changes (0-based)
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('authToken');
        navigate('/login/manager');
        return;
      }

      const message =
        err.response?.data?.userMessage ||
        err.response?.data?.message ||
        err.message ||
        'נכשל בטעינת המותגים';
      setError(message);
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
      setProducts(data.content.map((p: any) => ({ id: p.id, brandId: p.brandId })));
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const updateBrandName = (value: string) => {
    setBrandName(value.slice(0, MAX_BRAND_NAME_LENGTH));
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    updateBrandName('');
    setSelectedImage(null);
    setPreviewImage(null);
    setFormError('');
    setFieldErrors({});
    setShowErrors(false);
    setIsDragging(false);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setBrandToEdit(null);
    updateBrandName('');
    setSelectedImage(null);
    setPreviewImage(null);
    setFormError('');
    setFieldErrors({});
    setShowErrors(false);
    setIsDragging(false);
  };

  const handleEditBrand = (brand: Brand) => {
    setBrandToEdit(brand);
    updateBrandName(brand.name);
    setSelectedImage(null);
    setPreviewImage(null);
    setIsEditModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const processImageFile = (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFormError('סוג קובץ לא תקין. אנא בחר תמונה בפורמט JPEG, PNG או WebP.');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setFormError('גודל הקובץ עולה על 5MB.');
      return;
    }

    setSelectedImage(file);
    setFormError('');
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processImageFile(files[0]); // Only take the first file
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});
    setShowErrors(true);

    const errors: Record<string, string> = {};
    if (!brandName.trim()) {
      errors.name = 'שם המותג נדרש';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('authToken');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      
      // Create FormData for multipart/form-data
      const formData = new FormData();
      formData.append('name', brandName);
      if (selectedImage) {
        formData.append('image', selectedImage);
      }
      
      const response = await fetch(`${API_BASE_URL}/brands`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - let browser set it with boundary for multipart/form-data
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to create brand';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.userMessage || errorData.message || 'נכשל ביצירת המותג';
        } catch (parseError) {
          // If JSON parse fails, use the raw error text
          errorMessage = errorText || 'נכשל ביצירת המותג';
        }
        throw new Error(errorMessage);
      }

      await fetchBrands();
      handleCloseModal();
    } catch (err: any) {
      setFormError(err.message || 'נכשל ביצירת המותג');
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
    if (!brandName.trim()) {
      errors.name = 'שם המותג נדרש';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    if (!brandToEdit) return;

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('authToken');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      
      // Create FormData for multipart/form-data
      const formData = new FormData();
      formData.append('name', brandName);
      if (selectedImage) {
        formData.append('image', selectedImage);
      }
      
      const response = await fetch(`${API_BASE_URL}/brands/${brandToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - let browser set it with boundary for multipart/form-data
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to update brand';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.userMessage || errorData.message || 'נכשל בעדכון המותג';
        } catch (parseError) {
          // If JSON parse fails, use the raw error text
          errorMessage = errorText || 'נכשל בעדכון המותג';
        }
        throw new Error(errorMessage);
      }

      await fetchBrands();
      handleCloseEditModal();
    } catch (err: any) {
      setFormError(err.message || 'נכשל בעדכון המותג');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!brandToDelete) return;

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('authToken');
      
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const response = await fetch(`${API_BASE_URL}/brands/${brandToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to delete brand';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.userMessage || errorData.message || 'נכשל במחיקת המותג';
        } catch (parseError) {
          // If JSON parse fails, use the raw error text
          errorMessage = errorText || 'נכשל במחיקת המותג';
        }
        throw new Error(errorMessage);
      }

      await fetchBrands();
      setBrandToDelete(null);
    } catch (err: any) {
      setError(err.message || 'נכשל במחיקת המותג');
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
          <p className="text-gray-600 font-medium">... טוען מותגים</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-3xl p-8 bg-red-50/50 border-red-200">
          <h2 className="text-xl font-bold text-red-800 mb-2">שגיאה בטעינת המותגים</h2>
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
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">מותגים</h1>
            <p className="text-gray-600">
              נהל את מותגי המוצרים שלך ({brands.length} סה״כ)
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 md:mt-0 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 border-0"
          >
            <span>הוסף מותג</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Brands List */}
      {brands.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-6 rounded-full bg-indigo-100/50">
              <svg className="w-16 h-16 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">אין מותגים עדיין</h2>
            <p className="text-gray-600 max-w-md">
              עדיין לא יצרת מותגים. מותגים עוזרים לארגן את המוצרים שלך.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="glass-button mt-4 px-8 py-3 rounded-xl font-semibold text-gray-800 hover:shadow-lg transition-all"
            >
              הוסף את המותג הראשון שלך
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="glass-card rounded-3xl p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Page Size Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">הצג:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(0); // Reset to first page when page size changes (0-based)
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
                    aria-label={`Sort by name ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
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
                  placeholder="חפש מותגים..."
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

          {/* Brands Grid */}
          {filteredCount === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-5 rounded-full bg-indigo-100/50">
                  <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-800">לא נמצאו מותגים</h2>
                <p className="text-gray-600 max-w-sm">
                  נסה לשנות את החיפוש או נקה את המסננים כדי לראות את כל המותגים.
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="glass-button px-6 py-2 rounded-xl font-semibold text-indigo-600 hover:shadow-md transition-all"
                  >
                    נקה חיפוש
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {paginatedBrands.map((brand) => {
                return (
                  <div
                    key={brand.id}
                    className="glass-card rounded-2xl p-4 flex flex-col items-center text-center hover:shadow-lg transition-all relative"
                  >
                    {/* Brand Image or Icon */}
                    <div className="w-full h-32 mb-3 rounded-xl bg-gray-100 flex items-center justify-center p-2">
                      {brand.imageUrl ? (
                        <img
                          src={brand.imageUrl}
                          alt={brand.name}
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            // Fallback to icon if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              `;
                            }
                          }}
                        />
                      ) : (
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      )}
                    </div>

                    {/* Brand Name */}
                    <h3 className="text-sm font-bold text-gray-800 mb-1 truncate w-full px-2" title={brand.name}>
                      {brand.name}
                    </h3>

                    {/* Product Count */}
                    <div className="mb-3">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                        {productCountByBrand.get(brand.id) || 0} {productCountByBrand.get(brand.id) === 1 ? 'מוצר' : 'מוצרים'}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => handleEditBrand(brand)}
                        className="glass-button p-2 rounded-lg hover:shadow-md transition-all"
                        title="ערוך מותג"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setBrandToDelete(brand)}
                        className="glass-button p-2 rounded-lg hover:shadow-md transition-all border-red-500 hover:border-red-600"
                        title="מחק מותג"
                      >
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls - Bottom */}
      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        rtl={true}
        maxWidth="max-w-4xl"
        showCondition={filteredCount > 0 && totalPages > 0}
      />

      {/* Add Brand Modal */}
      {isAddModalOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl" style={{ position: 'fixed' }}>
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/85">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">הוסף מותג חדש</h2>
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
                <label htmlFor="brandName" className="block text-sm font-medium text-gray-700 mb-2">
                  שם המותג *
                </label>
                <input
                  id="brandName"
                  name="brandName"
                  type="text"
                  value={brandName}
                  onChange={(e) => {
                    updateBrandName(e.target.value);
                    if (showErrors && fieldErrors.name) {
                      setFieldErrors({ ...fieldErrors, name: '' });
                    }
                  }}
                  maxLength={MAX_BRAND_NAME_LENGTH}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center ${
                    showErrors && fieldErrors.name ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="לדוגמה: נייק, אפל, סמסונג"
                  autoFocus
                  dir="ltr"
                />
                {showErrors && fieldErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="brandImage" className="block text-sm font-medium text-gray-700 mb-2">
                  תמונה <span className="text-gray-500 text-xs">(אופציונלי)</span>
                </label>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      id="brandImage"
                      name="brandImage"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="brandImage"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`glass-input w-full px-3 py-4 rounded-xl text-sm text-gray-800 cursor-pointer flex items-center justify-center border-2 border-dashed transition-all ${
                        isDragging
                          ? 'border-indigo-600 bg-indigo-100/50'
                          : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/30'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {isDragging ? 'שחרר תמונה כאן' : selectedImage ? 'שנה תמונה' : 'בחר תמונה או גרור ושחרר'}
                      </span>
                    </label>
                  </div>

                  {/* Image Preview */}
                  {previewImage && (
                    <div className="flex flex-col items-center">
                      <div className="relative group">
                        <div className="w-full max-w-xs h-48 flex items-center justify-center bg-white rounded-lg border-2 border-gray-200 p-2">
                          <img
                            src={previewImage}
                            alt="Preview"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImage(null);
                            setPreviewImage(null);
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          title="הסר תמונה"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 text-center">
                    JPEG, PNG, WebP. גודל מקסימלי: 5MB.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-red-100/60 hover:bg-red-200/70 border-red-500 hover:border-red-600 disabled:opacity-50"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-green-100/60 hover:bg-green-200/70 border-green-600 hover:border-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    <span>צור מותג</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Brand Modal */}
      {isEditModalOpen && brandToEdit && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl" style={{ position: 'fixed' }}>
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/85">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">ערוך מותג</h2>
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
                <label htmlFor="editBrandName" className="block text-sm font-medium text-gray-700 mb-2">
                  שם המותג *
                </label>
                <input
                  id="editBrandName"
                  name="editBrandName"
                  type="text"
                  value={brandName}
                  onChange={(e) => {
                    updateBrandName(e.target.value);
                    if (showErrors && fieldErrors.name) {
                      setFieldErrors({ ...fieldErrors, name: '' });
                    }
                  }}
                  maxLength={MAX_BRAND_NAME_LENGTH}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center ${
                    showErrors && fieldErrors.name ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="לדוגמה: נייק, אפל, סמסונג"
                  autoFocus
                  dir="ltr"
                />
                {showErrors && fieldErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="editBrandImage" className="block text-sm font-medium text-gray-700 mb-2">
                  תמונה <span className="text-gray-500 text-xs">(אופציונלי)</span>
                </label>
                <div className="space-y-3">
                  {/* Current Image */}
                  {brandToEdit?.imageUrl && !previewImage && (
                    <div className="flex flex-col items-center">
                      <p className="text-xs text-gray-500 mb-2">תמונה נוכחית:</p>
                      <div className="relative group">
                        <div className="w-full max-w-xs h-48 flex items-center justify-center bg-white rounded-lg border-2 border-gray-200 p-2">
                          <img
                            src={brandToEdit.imageUrl}
                            alt={brandToEdit.name}
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              // Hide image if it fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <input
                      id="editBrandImage"
                      name="editBrandImage"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="editBrandImage"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`glass-input w-full px-3 py-4 rounded-xl text-sm text-gray-800 cursor-pointer flex items-center justify-center border-2 border-dashed transition-all ${
                        isDragging
                          ? 'border-indigo-600 bg-indigo-100/50'
                          : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/30'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {isDragging 
                          ? 'שחרר תמונה כאן' 
                          : previewImage 
                            ? 'שנה תמונה' 
                            : brandToEdit?.imageUrl 
                              ? 'החלף תמונה או גרור ושחרר' 
                              : 'בחר תמונה או גרור ושחרר'}
                      </span>
                    </label>
                  </div>

                  {/* New Image Preview */}
                  {previewImage && (
                    <div className="flex flex-col items-center">
                      <p className="text-xs text-gray-500 mb-2">תצוגה מקדימה של תמונה חדשה:</p>
                      <div className="relative group">
                        <div className="w-full max-w-xs h-48 flex items-center justify-center bg-white rounded-lg border-2 border-gray-200 p-2">
                          <img
                            src={previewImage}
                            alt="Preview"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImage(null);
                            setPreviewImage(null);
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          title="הסר תמונה"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 text-center">
                    JPEG, PNG, WebP. גודל מקסימלי: 5MB.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={isSubmitting}
                  className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-red-100/60 hover:bg-red-200/70 border-red-500 hover:border-red-600 disabled:opacity-50"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-green-100/60 hover:bg-green-200/70 border-green-600 hover:border-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    <span>עדכן מותג</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Brand Modal */}
      {brandToDelete && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl" style={{ position: 'fixed' }}>
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/90">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">מחק מותג</h2>
              <button
                onClick={() => setBrandToDelete(null)}
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
                האם אתה בטוח שברצונך למחוק את המותג <span className="font-semibold">{brandToDelete.name}</span>? פעולה זו לא ניתנת לביטול.
              </p>
              <div className="glass-card bg-yellow-50/50 border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-yellow-800">
                    מוצרים המשויכים למותג זה יהפכו ללא מותג.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setBrandToDelete(null)}
                disabled={isDeleting}
                className="glass-button flex-1 py-2.5 px-4 rounded-xl font-semibold text-gray-800 bg-gray-100/60 hover:bg-gray-200/70 border-gray-400 hover:border-gray-500 disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                onClick={handleDeleteBrand}
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
                  <span>מחק מותג</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

