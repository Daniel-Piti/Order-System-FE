import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryAPI, userAPI, publicAPI } from '../services/api';
import type { Product, Category, Brand } from '../services/api';
import PaginationBar from '../components/PaginationBar';
import { formatPrice } from '../utils/formatPrice';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Store product images: productId -> array of image URLs
  const [productImages, setProductImages] = useState<Record<string, string[]>>({});
  // Store current image index for each product: productId -> currentIndex
  const [productImageIndices, setProductImageIndices] = useState<Record<string, number>>({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [, setTotalElements] = useState(0);
  
  // Sorting state
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC');

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [brandFilter, setBrandFilter] = useState<string>('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    brandId: '',
    categoryId: '',
    originalPrice: '',
    specialPrice: '',
    description: '',
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingEdit, setIsDraggingEdit] = useState(false);
  
  // Product image states for edit modal
  interface ProductImage {
    id: number;
    productId: string;
    userId: string;
    url: string; // Full public URL from R2 (constructed from s3_key)
    fileName: string; // From product_images.file_name (NOT NULL)
    mimeType: string; // From product_images.mime_type (NOT NULL)
  }
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [originalImages, setOriginalImages] = useState<ProductImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);
  const [newImagesToAdd, setNewImagesToAdd] = useState<File[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    brandId: '',
    categoryId: '',
    originalPrice: '',
    specialPrice: '',
    description: '',
  });
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchProducts(currentPage);
      fetchCategories();
      fetchBrands();
    }
  }, [userId, currentPage, sortBy, sortDirection, pageSize, categoryFilter, brandFilter]);

  const fetchUserId = async () => {
    try {
      const user = await userAPI.getCurrentUser();
      setUserId(user.id);
    } catch (err: any) {
      if (err.message?.includes('401')) {
        navigate('/login');
      }
    }
  };

  const fetchProducts = async (page: number = 0) => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      setError('');

      const pageResponse = await publicAPI.products.getAllByUserId(
        userId,
        page, 
        pageSize, 
        sortBy, 
        sortDirection, 
        categoryFilter ? Number(categoryFilter) : undefined,
        brandFilter ? Number(brandFilter) : undefined
      );
      setProducts(pageResponse.content);
      setTotalPages(pageResponse.totalPages);
      setTotalElements(pageResponse.totalElements);
      
      // Clear old images and fetch images for all products in parallel
      setProductImages({});
      await fetchProductImagesForAll(pageResponse.content);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
      if (err.message.includes('401')) {
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProductImagesForAll = async (productsList: Product[]) => {
    if (!userId || productsList.length === 0) return;
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
      const imagePromises = productsList.map(async (product) => {
        try {
          const response = await fetch(`${API_BASE_URL}/public/products/user/${userId}/product/${product.id}/images`);
          if (response.ok) {
            const images: ProductImage[] = await response.json();
            // Sort images by filename
            const sortedImages = images.sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' }));
            return { productId: product.id, imageUrls: sortedImages.map(img => img.url) };
          }
        } catch (err) {
          console.error(`Failed to fetch images for product ${product.id}:`, err);
        }
        return { productId: product.id, imageUrls: [] };
      });
      
      const results = await Promise.all(imagePromises);
      const imagesMap: Record<string, string[]> = {};
      results.forEach(({ productId, imageUrls }) => {
        imagesMap[productId] = imageUrls;
      });
      setProductImages(prev => ({ ...prev, ...imagesMap }));
    } catch (err) {
      console.error('Failed to fetch product images:', err);
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

  const fetchBrands = async () => {
    if (!userId) return;
    try {
      const data = await publicAPI.brands.getAllByUserId(userId);
      setBrands(data);
    } catch (err) {
      console.error('Failed to fetch brands:', err);
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

  const handleBrandFilterChange = (brandId: string) => {
    setBrandFilter(brandId);
    setCurrentPage(0); // Reset to first page when brand changes
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
      brandId: '',
      categoryId: '',
      originalPrice: '',
      specialPrice: '',
      description: '',
    });
    setSelectedImages([]);
    setFormError('');
    setFieldErrors({});
    setShowErrors(false);
    setIsDragging(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    processImageFiles(Array.from(files), selectedImages, setSelectedImages);
    e.target.value = ''; // Reset input to allow selecting same file again
  };

  const processImageFiles = (
    newFiles: File[],
    currentImages: File[],
    setImages: React.Dispatch<React.SetStateAction<File[]>>
  ) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Check total count (existing + new)
    if (currentImages.length + newFiles.length > 5) {
      setFormError(`Maximum 5 images allowed. You already have ${currentImages.length} image(s) selected.`);
      return;
    }

    // Validate each file
    newFiles.forEach((file) => {
      // Check file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Only JPEG, PNG, and WebP are allowed.`);
        return;
      }

      // Check file size (5MB = 5 * 1024 * 1024 bytes)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        errors.push(`${file.name}: File size exceeds 5MB limit.`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      setFormError(errors.join(' '));
    } else if (validFiles.length > 0) {
      setImages((prev) => [...prev, ...validFiles]);
      setFormError('');
    }
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
      processImageFiles(Array.from(files), selectedImages, setSelectedImages);
    }
  };

  const handleEditDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingEdit(true);
  };

  const handleEditDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingEdit(false);
  };

  const handleEditDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingEdit(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const validFiles: File[] = [];
      const errors: string[] = [];

      // Check total count (existing visible + new to add)
      const currentImageCount = existingImages.length + newImagesToAdd.length;
      if (currentImageCount + newFiles.length > 5) {
        setFormError(`Maximum 5 images allowed. Current: ${currentImageCount}, trying to add: ${newFiles.length}`);
        return;
      }

      // Validate each file
      newFiles.forEach((file) => {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          errors.push(`${file.name}: Invalid file type. Only JPEG, PNG, and WebP are allowed.`);
          return;
        }

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          errors.push(`${file.name}: File size exceeds 5MB limit.`);
          return;
        }

        validFiles.push(file);
      });

      if (errors.length > 0) {
        setFormError(errors.join(' '));
      } else if (validFiles.length > 0) {
        setNewImagesToAdd((prev) => [...prev, ...validFiles]);
        setFormError('');
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Edit modal image handlers
  const handleDeleteExistingImage = (imageId: number) => {
    setImagesToDelete((prev) => {
      if (prev.includes(imageId)) return prev; // Already marked for deletion
      return [...prev, imageId];
    });
    setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const handleUndoDeleteImage = (imageId: number) => {
    // Restore the image from originalImages
    const imageToRestore = originalImages.find(img => img.id === imageId);
    if (imageToRestore) {
      setImagesToDelete((prev) => prev.filter((id) => id !== imageId));
      setExistingImages((prev) => [...prev, imageToRestore].sort((a, b) => a.id - b.id));
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Check total count (existing visible + new to add)
    const currentImageCount = existingImages.length + newImagesToAdd.length;
    if (currentImageCount + newFiles.length > 5) {
      setFormError(`Maximum 5 images allowed. Current: ${currentImageCount}, trying to add: ${newFiles.length}`);
      e.target.value = '';
      return;
    }

    // Validate each file
    newFiles.forEach((file) => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Only JPEG, PNG, and WebP are allowed.`);
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        errors.push(`${file.name}: File size exceeds 5MB limit.`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      setFormError(errors.join(' '));
    } else if (validFiles.length > 0) {
      setNewImagesToAdd((prev) => [...prev, ...validFiles]);
      setFormError('');
    }

    e.target.value = '';
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImagesToAdd((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditProduct = async (product: Product) => {
    setProductToEdit(product);
    setEditFormData({
      name: product.name,
      brandId: product.brandId?.toString() || '',
      categoryId: product.categoryId?.toString() || '',
      originalPrice: product.originalPrice.toString(),
      specialPrice: product.specialPrice.toString(),
      description: product.description,
    });
    setExistingImages([]);
    setOriginalImages([]);
    setImagesToDelete([]);
    setNewImagesToAdd([]);
    setIsEditModalOpen(true);
    
    // Fetch existing images
    await fetchProductImages(product.userId, product.id);
  };

  const fetchProductImages = async (userId: string, productId: string) => {
    try {
      setIsLoadingImages(true);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
      const response = await fetch(`${API_BASE_URL}/public/products/user/${userId}/product/${productId}/images`);
      
      if (response.ok) {
        const images: ProductImage[] = await response.json();
        // Sort images by filename
        const sortedImages = images.sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' }));
        setExistingImages(sortedImages);
        setOriginalImages(sortedImages); // Store original for undo
      }
    } catch (err) {
      console.error('Failed to fetch product images:', err);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setProductToEdit(null);
    setEditFormData({
      name: '',
      brandId: '',
      categoryId: '',
      originalPrice: '',
      specialPrice: '',
      description: '',
    });
    setExistingImages([]);
    setOriginalImages([]);
    setImagesToDelete([]);
    setNewImagesToAdd([]);
    setFormError('');
    setFieldErrors({});
    setShowErrors(false);
    setIsDraggingEdit(false);
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

    // Validate image count (existing visible + new to add)
    const currentImageCount = existingImages.length + newImagesToAdd.length;
    if (currentImageCount > 5) {
      setFormError('Maximum 5 images allowed per product');
      return;
    }

    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('authToken');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
      
      const finalSpecialPrice = editFormData.specialPrice ? Number(editFormData.specialPrice) : Number(editFormData.originalPrice);
      
      // Update product data
      const response = await fetch(`${API_BASE_URL}/products/${productToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editFormData.name,
          brandId: editFormData.brandId ? Number(editFormData.brandId) : null,
          categoryId: editFormData.categoryId ? Number(editFormData.categoryId) : null,
          originalPrice: Number(editFormData.originalPrice),
          specialPrice: finalSpecialPrice,
          description: editFormData.description,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update product');
      }

      // Delete images
      for (const imageId of imagesToDelete) {
        const deleteResponse = await fetch(`${API_BASE_URL}/products/${productToEdit.id}/images/${imageId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!deleteResponse.ok) {
          console.error(`Failed to delete image ${imageId}`);
        }
      }

      // Upload new images
      for (const imageFile of newImagesToAdd) {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        const uploadResponse = await fetch(`${API_BASE_URL}/products/${productToEdit.id}/images`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          console.error(`Failed to upload image ${imageFile.name}`);
        }
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

    // Validate image count
    if (selectedImages.length > 5) {
      setFormError('Maximum 5 images allowed per product');
      return;
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
      
      // Create FormData
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      if (formData.brandId) {
        formDataToSend.append('brandId', formData.brandId);
      }
      if (formData.categoryId) {
        formDataToSend.append('categoryId', formData.categoryId);
      }
      formDataToSend.append('originalPrice', formData.originalPrice);
      formDataToSend.append('specialPrice', finalSpecialPrice.toString());
      formDataToSend.append('description', formData.description || ''); // Always send, even if empty
      
      // Add images
      selectedImages.forEach(image => {
        formDataToSend.append('images', image);
      });
      
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - let browser set it with boundary for multipart/form-data
        },
        body: formDataToSend,
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
    <div className="max-w-6xl mx-auto space-y-4 pb-32">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Products</h1>
            <p className="text-gray-600">Your product catalog ({products.length} products)</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 md:mt-0 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 border-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Sort Controls & Pagination Info */}
      {(products.length > 0 || categoryFilter || brandFilter) && (
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

                {/* Brand Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Brand:</span>
                  <select
                    value={brandFilter}
                    onChange={(e) => handleBrandFilterChange(e.target.value)}
                    className="glass-select px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-32"
                  >
                    <option value="">All</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
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
            </div>
          </div>
        </div>
      )}

      {/* Products List */}
      {products.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            {/* Show different message based on whether it's a filter or no products at all */}
            {(categoryFilter || brandFilter) ? (
              // Filter with 0 results
              <>
                <div className="p-6 rounded-full bg-gray-100/50">
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  No Products Match Filters
                </h2>
                <p className="text-gray-600 max-w-md">
                  There are no products matching the selected filters.
                </p>
                <button
                  onClick={() => {
                    handleCategoryFilterChange('');
                    handleBrandFilterChange('');
                  }}
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
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {products.map((product) => {
            const category = categories.find(cat => cat.id === product.categoryId);
            return (
              <div key={product.id} className="glass-card rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 group border border-gray-200/50 flex flex-col">
                {/* Product Image */}
                <div className="relative h-32 bg-gradient-to-br from-purple-100 to-pink-100 overflow-hidden flex-shrink-0 group/image">
                  {productImages[product.id] && productImages[product.id].length > 0 ? (
                    <>
                      <img
                        src={productImages[product.id][productImageIndices[product.id] || 0]}
                        alt={product.name}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const placeholder = (e.target as HTMLImageElement).parentElement?.querySelector('.image-placeholder');
                          if (placeholder) {
                            (placeholder as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                      {/* Navigation arrows - only show if multiple images */}
                      {productImages[product.id].length > 1 && (
                        <>
                          {/* Left Arrow */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentIndex = productImageIndices[product.id] || 0;
                              const newIndex = currentIndex === 0 ? productImages[product.id].length - 1 : currentIndex - 1;
                              setProductImageIndices(prev => ({ ...prev, [product.id]: newIndex }));
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover/image:opacity-100 transition-opacity backdrop-blur-sm z-10"
                            title="Previous image"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          {/* Right Arrow */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentIndex = productImageIndices[product.id] || 0;
                              const newIndex = (currentIndex + 1) % productImages[product.id].length;
                              setProductImageIndices(prev => ({ ...prev, [product.id]: newIndex }));
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover/image:opacity-100 transition-opacity backdrop-blur-sm z-10"
                            title="Next image"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </>
                      )}
                    </>
                  ) : null}
                  {(!productImages[product.id] || productImages[product.id].length === 0) && (
                    <div className="image-placeholder w-full h-full flex items-center justify-center text-4xl opacity-40">
                      📦
                    </div>
                  )}
                  {/* Show image count badge if multiple images */}
                  {productImages[product.id] && productImages[product.id].length > 1 && (
                    <div className="absolute bottom-2 left-2">
                      <span className="px-2 py-1 text-xs font-semibold bg-black/60 text-white rounded-full backdrop-blur-sm">
                        {(productImageIndices[product.id] || 0) + 1} / {productImages[product.id].length}
                      </span>
                    </div>
                  )}
                  
                  {/* Category Badge */}
                  {product.categoryId && (
                    <div className="absolute top-2 left-2 backdrop-blur-xl bg-white/90 px-2 py-0.5 rounded-full text-xs font-bold text-gray-700 shadow-lg border border-white/50">
                      {category?.category || 'Category'}
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProduct(product);
                      }}
                      className="p-1.5 rounded-lg bg-white/90 hover:bg-white transition-colors shadow-md backdrop-blur-sm"
                      title="Edit product"
                    >
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProductToDelete(product);
                      }}
                      className="p-1.5 rounded-lg bg-white/90 hover:bg-red-50 transition-colors shadow-md backdrop-blur-sm"
                      title="Delete product"
                    >
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-3 flex flex-col flex-1">
                  {/* Title */}
                  <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-1">
                    {product.name}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-gray-600 mb-1 whitespace-pre-line line-clamp-2">
                    {product.description || ''}
                  </p>

                  {/* Price */}
                  <div className="pb-1">
                    {product.originalPrice !== product.specialPrice ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-purple-600">
                          {formatPrice(product.specialPrice)}
                        </span>
                        <span className="text-xs text-gray-400 line-through">
                          {formatPrice(product.originalPrice)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xl font-bold text-purple-600">
                        {formatPrice(product.specialPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls - Bottom */}
      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        maxWidth="max-w-6xl"
        showCondition={!isLoading && products.length > 0 && totalPages > 0}
      />

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

              <div>
                <label htmlFor="brandId" className="block text-sm font-medium text-gray-700 mb-2">
                  Brand
                </label>
                <select
                  id="brandId"
                  name="brandId"
                  value={formData.brandId}
                  onChange={handleInputChange}
                  className="glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">None</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
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
                    <span className="absolute left-3 top-2 text-gray-700 text-sm font-semibold z-10">₪</span>
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
                    <span className="absolute left-3 top-2 text-gray-700 text-sm font-semibold z-10">₪</span>
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

              {/* Image Upload Section */}
              <div>
                <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-2">
                  Product Images <span className="text-gray-500 text-xs">(up to 5, optional)</span>
                </label>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      id="images"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={selectedImages.length >= 5}
                    />
                    <label
                      htmlFor="images"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`glass-input w-full px-3 py-4 rounded-xl text-sm text-gray-800 cursor-pointer flex items-center justify-center border-2 border-dashed transition-all ${
                        selectedImages.length >= 5
                          ? 'opacity-50 cursor-not-allowed border-gray-300'
                          : isDragging
                            ? 'border-indigo-600 bg-indigo-100/50'
                            : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/30'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {selectedImages.length >= 5
                          ? 'Maximum 5 images reached'
                          : isDragging
                            ? 'Drop Images Here'
                            : `Select Images or Drag & Drop (${selectedImages.length}/5)`}
                      </span>
                    </label>
                  </div>

                  {/* Image Previews */}
                  {selectedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {[...selectedImages].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })).map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            title="Remove image"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <p className="text-xs text-gray-600 truncate mt-1" title={image.name}>
                            {image.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    Accepted formats: JPEG, PNG, WebP. Maximum size: 5MB per image.
                  </p>
                </div>
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

              <div>
                <label htmlFor="edit-brandId" className="block text-sm font-medium text-gray-700 mb-2">
                  Brand
                </label>
                <select
                  id="edit-brandId"
                  name="brandId"
                  value={editFormData.brandId}
                  onChange={handleEditInputChange}
                  className="glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">None</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
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
                    <span className="absolute left-3 top-2 text-gray-700 text-sm font-semibold z-10">₪</span>
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
                    <span className="absolute left-3 top-2 text-gray-700 text-sm font-semibold z-10">₪</span>
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

              {/* Image Management Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Images <span className="text-gray-500 text-xs">(up to 5 total)</span>
                </label>
                <div className="space-y-3">
                  {/* Loading State */}
                  {isLoadingImages && (
                    <div className="text-center py-4">
                      <svg className="animate-spin h-6 w-6 text-indigo-600 mx-auto" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-xs text-gray-500 mt-2">Loading images...</p>
                    </div>
                  )}

                  {/* Existing Images */}
                  {!isLoadingImages && existingImages.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">Existing Images:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[...existingImages].sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' })).map((image) => (
                          <div key={image.id} className="relative group">
                            <img
                              src={image.url}
                              alt={image.fileName}
                              className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteExistingImage(image.id)}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              title="Delete image"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <p className="text-xs text-gray-600 truncate mt-1" title={image.fileName}>
                              {image.fileName}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Images Marked for Deletion */}
                  {imagesToDelete.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-600 mb-2">Images to be deleted ({imagesToDelete.length}):</p>
                      <div className="flex flex-wrap gap-2">
                        {imagesToDelete.map((imageId) => {
                          const deletedImage = originalImages.find(img => img.id === imageId);
                          if (!deletedImage) return null;
                          return (
                            <div key={imageId} className="relative opacity-50 border-2 border-red-300 rounded-lg p-1">
                              <img
                                src={deletedImage.url}
                                alt={deletedImage.fileName}
                                className="w-16 h-16 object-cover rounded"
                              />
                              <button
                                type="button"
                                onClick={() => handleUndoDeleteImage(imageId)}
                                className="absolute -top-1 -right-1 p-1 bg-green-500 text-white rounded-full shadow-lg"
                                title="Undo delete"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* New Images to Add */}
                  {newImagesToAdd.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-600 mb-2">New Images to Add:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[...newImagesToAdd].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })).map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(image)}
                              alt={`New ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border-2 border-green-200"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveNewImage(index)}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              title="Remove image"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <p className="text-xs text-gray-600 truncate mt-1" title={image.name}>
                              {image.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add More Images Input */}
                  <div className="relative">
                    <input
                      id="edit-images"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      multiple
                      onChange={handleEditImageChange}
                      className="hidden"
                      disabled={(existingImages.length + newImagesToAdd.length) >= 5}
                    />
                    <label
                      htmlFor="edit-images"
                      onDragOver={handleEditDragOver}
                      onDragLeave={handleEditDragLeave}
                      onDrop={handleEditDrop}
                      className={`glass-input w-full px-3 py-4 rounded-xl text-sm text-gray-800 cursor-pointer flex items-center justify-center border-2 border-dashed transition-all ${
                        (existingImages.length + newImagesToAdd.length) >= 5
                          ? 'opacity-50 cursor-not-allowed border-gray-300'
                          : isDraggingEdit
                            ? 'border-indigo-600 bg-indigo-100/50'
                            : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/30'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {(existingImages.length + newImagesToAdd.length) >= 5
                          ? 'Maximum 5 images reached'
                          : isDraggingEdit
                            ? 'Drop Images Here'
                            : `Add More Images or Drag & Drop (${existingImages.length + newImagesToAdd.length}/5)`}
                      </span>
                    </label>
                  </div>

                  <p className="text-xs text-gray-500">
                    Accepted formats: JPEG, PNG, WebP. Maximum size: 5MB per image.
                  </p>
                </div>
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
