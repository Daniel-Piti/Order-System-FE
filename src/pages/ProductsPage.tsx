import { useEffect, useState } from 'react';
import CloseButton from '../components/CloseButton';
import { useNavigate } from 'react-router-dom';
import { managerAPI, publicAPI } from '../services/api';
import type { Product, Category, Brand } from '../services/api';
import PaginationBar from '../components/PaginationBar';
import { formatPrice } from '../utils/formatPrice';
import SparkMD5 from 'spark-md5';
import Spinner from '../components/Spinner';

// Helper function to calculate MD5 hash of a file and return as Base64
async function calculateFileMD5(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const blobSlice = File.prototype.slice;
    const chunkSize = 2097152; // Read in chunks of 2MB
    const chunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;
    const spark = new SparkMD5.ArrayBuffer();
    const fileReader = new FileReader();

    fileReader.onload = function (e) {
      if (e.target?.result) {
        spark.append(e.target.result as ArrayBuffer);
        currentChunk++;

        if (currentChunk < chunks) {
          loadNext();
        } else {
          const hashHex = spark.end();
          // Convert hex string to base64
          const hashBytes = new Uint8Array(
            hashHex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
          );
          // Convert bytes to base64
          let binary = '';
          for (let i = 0; i < hashBytes.length; i++) {
            binary += String.fromCharCode(hashBytes[i]);
          }
          const hashBase64 = btoa(binary);
          resolve(hashBase64);
        }
      }
    };

    fileReader.onerror = function () {
      reject(new Error('Failed to read file for MD5 calculation'));
    };

    function loadNext() {
      const start = currentChunk * chunkSize;
      const end = start + chunkSize >= file.size ? file.size : start + chunkSize;
      fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
    }

    loadNext();
  });
}

const MAX_PRICE = 1_000_000;
const MAX_PRODUCT_NAME_LENGTH = 200;
const MAX_PRODUCT_DESCRIPTION_LENGTH = 1000;

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
  const [productImageDirections, setProductImageDirections] = useState<Record<string, 'next' | 'prev'>>({});
  const [productPrevImageIndices, setProductPrevImageIndices] = useState<Record<string, number | null>>({});
  
  // Swipe detection state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; productId: string } | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  
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
    minimumPrice: '',
    price: '',
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
    managerId: string;
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
    minimumPrice: '',
    price: '',
    description: '',
  });
  const [managerId, setManagerId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchManagerId();
  }, []);

  useEffect(() => {
    if (managerId) {
      fetchProducts(currentPage);
      fetchCategories();
      fetchBrands();
    }
  }, [managerId, currentPage, sortBy, sortDirection, pageSize, categoryFilter, brandFilter]);

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

  const fetchProducts = async (page: number = 0) => {
    const id = managerId;
    if (!id) return;
    
    try {
      setIsLoading(true);
      setError('');

      const pageResponse = await publicAPI.products.getAllByManagerId(
        id,
        page, 
        pageSize, 
        sortBy, 
        sortDirection, 
        categoryFilter ? Number(categoryFilter) : undefined,
        brandFilter ? Number(brandFilter) : undefined
      );
      setProducts(pageResponse.content);
      setTotalPages(pageResponse.totalPages);
      
      // Clear old images and fetch images for all products in parallel
      setProductImages({});
      await fetchProductImagesForAll(pageResponse.content);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
      if (err.message.includes('401')) {
        navigate('/login/manager');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProductImagesForAll = async (productsList: Product[]) => {
    if (!managerId || productsList.length === 0) return;
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const imagePromises = productsList.map(async (product) => {
        try {
          const response = await fetch(`${API_BASE_URL}/public/products/manager/${managerId}/product/${product.id}/images`);
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
    const currentManagerId = managerId;
    if (!currentManagerId) return;
    try {
      const data = await publicAPI.categories.getAllByManagerId(currentManagerId);
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchBrands = async () => {
    if (!managerId) return;
    try {
      const data = await publicAPI.brands.getAllByManagerId(managerId);
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
    const { name } = e.target;
    let { value } = e.target;

    if (name === 'name') {
      value = value.slice(0, MAX_PRODUCT_NAME_LENGTH);
    } else if (name === 'description') {
      value = value.slice(0, MAX_PRODUCT_DESCRIPTION_LENGTH);
    } else if ((name === 'minimumPrice' || name === 'price') && value !== '') {
      // Limit to 2 decimal places
      const decimalIndex = value.indexOf('.');
      if (decimalIndex !== -1) {
        const decimalPart = value.substring(decimalIndex + 1);
        if (decimalPart.length > 2) {
          value = value.substring(0, decimalIndex + 3); // Keep only 2 decimal places
        }
      }
      const numericValue = Number(value);
      if (!Number.isNaN(numericValue) && numericValue > MAX_PRICE) {
        value = MAX_PRICE.toString();
      }
    }

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
      minimumPrice: '',
      price: '',
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
      name: product.name.slice(0, MAX_PRODUCT_NAME_LENGTH),
      brandId: product.brandId?.toString() || '',
      categoryId: product.categoryId?.toString() || '',
      minimumPrice: product.minimumPrice.toString(),
      price: product.price.toString(),
      description: (product.description || '').slice(0, MAX_PRODUCT_DESCRIPTION_LENGTH),
    });
    setExistingImages([]);
    setOriginalImages([]);
    setImagesToDelete([]);
    setNewImagesToAdd([]);
    setIsEditModalOpen(true);
    
    // Fetch existing images
    await fetchProductImages(product.managerId, product.id);
  };

  const fetchProductImages = async (managerId: string, productId: string) => {
    try {
      setIsLoadingImages(true);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const response = await fetch(`${API_BASE_URL}/public/products/manager/${managerId}/product/${productId}/images`);
      
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

  const schedulePrevReset = (productId: string) => {
    window.setTimeout(() => {
      setProductPrevImageIndices(prev => ({ ...prev, [productId]: null }));
    }, 250);
  };

  const handlePrevProductImage = (productId: string, images: string[]) => {
    const currentIndex = productImageIndices[productId] || 0;
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    setProductPrevImageIndices(prev => ({ ...prev, [productId]: currentIndex }));
    setProductImageDirections(prev => ({ ...prev, [productId]: 'prev' }));
    setProductImageIndices(prev => ({ ...prev, [productId]: newIndex }));
    schedulePrevReset(productId);
  };

  const handleNextProductImage = (productId: string, images: string[]) => {
    const currentIndex = productImageIndices[productId] || 0;
    const newIndex = (currentIndex + 1) % images.length;
    setProductPrevImageIndices(prev => ({ ...prev, [productId]: currentIndex }));
    setProductImageDirections(prev => ({ ...prev, [productId]: 'next' }));
    setProductImageIndices(prev => ({ ...prev, [productId]: newIndex }));
    schedulePrevReset(productId);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setProductToEdit(null);
    setEditFormData({
      name: '',
      brandId: '',
      categoryId: '',
      minimumPrice: '',
      price: '',
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
    const { name } = e.target;
    let { value } = e.target;

    if (name === 'name') {
      value = value.slice(0, MAX_PRODUCT_NAME_LENGTH);
    } else if (name === 'description') {
      value = value.slice(0, MAX_PRODUCT_DESCRIPTION_LENGTH);
    } else if ((name === 'minimumPrice' || name === 'price') && value !== '') {
      // Limit to 2 decimal places
      const decimalIndex = value.indexOf('.');
      if (decimalIndex !== -1) {
        const decimalPart = value.substring(decimalIndex + 1);
        if (decimalPart.length > 2) {
          value = value.substring(0, decimalIndex + 3); // Keep only 2 decimal places
        }
      }
      const numericValue = Number(value);
      if (!Number.isNaN(numericValue) && numericValue > MAX_PRICE) {
        value = MAX_PRICE.toString();
      }
    }

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
      errors.name = 'שם המוצר נדרש';
    }
    if (!editFormData.minimumPrice) {
      errors.minimumPrice = 'מחיר מינימלי נדרש';
    } else if (isNaN(Number(editFormData.minimumPrice)) || Number(editFormData.minimumPrice) <= 0) {
      errors.minimumPrice = 'מחיר מינימלי חייב להיות מספר חיובי';
    } else if (Number(editFormData.minimumPrice) > MAX_PRICE) {
      errors.minimumPrice = 'מחיר מינימלי אינו יכול לעלות על 1,000,000';
    }
    if (!editFormData.price) {
      errors.price = 'מחיר נדרש';
    } else if (isNaN(Number(editFormData.price)) || Number(editFormData.price) <= 0) {
      errors.price = 'מחיר חייב להיות מספר חיובי';
    } else if (Number(editFormData.price) > MAX_PRICE) {
      errors.price = 'מחיר אינו יכול לעלות על 1,000,000';
    } else if (Number(editFormData.price) < Number(editFormData.minimumPrice || 0)) {
      errors.price = 'מחיר אינו יכול להיות נמוך ממחיר מינימלי';
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

    // Check if anything has changed
    const minimumPriceValue = Math.round(Math.min(Number(editFormData.minimumPrice), MAX_PRICE) * 100) / 100;
    const finalPrice = Math.round(Math.min(Number(editFormData.price), MAX_PRICE) * 100) / 100;
    
    // Compare product data fields
    const productDataChanged =
      editFormData.name !== productToEdit.name ||
      (editFormData.brandId ? Number(editFormData.brandId) : null) !== productToEdit.brandId ||
      (editFormData.categoryId ? Number(editFormData.categoryId) : null) !== productToEdit.categoryId ||
      Math.abs(minimumPriceValue - productToEdit.minimumPrice) > 0.001 ||
      Math.abs(finalPrice - productToEdit.price) > 0.001 ||
      (editFormData.description || '') !== (productToEdit.description || '');
    
    // Check if images changed
    const imagesChanged = imagesToDelete.length > 0 || newImagesToAdd.length > 0;
    
    const hasChanges = productDataChanged || imagesChanged;

    // If nothing changed, just close the modal without making an API call
    if (!hasChanges) {
      handleCloseEditModal();
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('authToken');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      
      // Only update product data if it changed
      if (productDataChanged) {
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
            minimumPrice: minimumPriceValue,
            price: finalPrice,
            description: editFormData.description,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to update product');
        }
      }

      // Delete images if any were marked for deletion (bulk delete)
      if (imagesToDelete.length > 0) {
        const deleteResponse = await fetch(`${API_BASE_URL}/products/${productToEdit.id}/images`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(imagesToDelete),
        });
        
        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          throw new Error(errorText || 'Failed to delete images');
        }
      }

      // Upload new images if any were added
      if (newImagesToAdd.length > 0) {
        // Calculate MD5 hashes for all new images
        const imagesMetadata = await Promise.all(
          newImagesToAdd.map(async (imageFile) => {
            const fileMd5Base64 = await calculateFileMD5(imageFile);
            return {
              fileName: imageFile.name,
              contentType: imageFile.type,
              fileSizeBytes: imageFile.size,
              fileMd5Base64: fileMd5Base64,
            };
          })
        );

        // Step 1: Get presigned URLs from backend
        const uploadResponse = await fetch(`${API_BASE_URL}/products/${productToEdit.id}/images`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(imagesMetadata),
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          let errorMessage = 'Failed to upload images';
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.userMessage || errorData.message || 'נכשל בהעלאת התמונות';
          } catch (parseError) {
            errorMessage = errorText || 'נכשל בהעלאת התמונות';
          }
          throw new Error(errorMessage);
        }

        const result = await uploadResponse.json();

        // Step 2: Upload images to S3 using presigned URLs
        if (result.imagesPreSignedUrls && result.imagesPreSignedUrls.length > 0) {
          await Promise.all(
            result.imagesPreSignedUrls.map(async (preSignedUrl: string, index: number) => {
              const imageFile = newImagesToAdd[index];
              const imageMetadata = imagesMetadata[index];
              
              const s3UploadResponse = await fetch(preSignedUrl, {
                method: 'PUT',
                headers: {
                  'Content-Type': imageFile.type,
                  'Content-MD5': imageMetadata.fileMd5Base64,
                },
                body: imageFile,
              });

              if (!s3UploadResponse.ok) {
                throw new Error(`נכשל בהעלאת התמונה ${imageFile.name} ל-S3`);
              }
            })
          );
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
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const response = await fetch(`${API_BASE_URL}/products/${productToDelete.id}`, {
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
      errors.name = 'שם המוצר נדרש';
    }
    if (!formData.minimumPrice) {
      errors.minimumPrice = 'מחיר מינימלי נדרש';
    } else if (isNaN(Number(formData.minimumPrice)) || Number(formData.minimumPrice) <= 0) {
      errors.minimumPrice = 'מחיר מינימלי חייב להיות מספר חיובי';
    } else if (Number(formData.minimumPrice) > MAX_PRICE) {
      errors.minimumPrice = 'מחיר מינימלי אינו יכול לעלות על 1,000,000';
    }
    if (!formData.price) {
      errors.price = 'מחיר נדרש';
    } else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      errors.price = 'מחיר חייב להיות מספר חיובי';
    } else if (Number(formData.price) > MAX_PRICE) {
      errors.price = 'מחיר אינו יכול לעלות על 1,000,000';
    } else if (Number(formData.price) < Number(formData.minimumPrice || 0)) {
      errors.price = 'מחיר אינו יכול להיות נמוך ממחיר מינימלי';
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
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      
      const minimumPriceValue = Math.round(Math.min(Number(formData.minimumPrice), MAX_PRICE) * 100) / 100;
      const finalPrice = Math.round(Math.min(Number(formData.price), MAX_PRICE) * 100) / 100;
      
      // Calculate MD5 hashes for all images
      const imagesMetadata = await Promise.all(
        selectedImages.map(async (image) => {
          const fileMd5Base64 = await calculateFileMD5(image);
          return {
            fileName: image.name,
            contentType: image.type,
            fileSizeBytes: image.size,
            fileMd5Base64: fileMd5Base64,
          };
        })
      );

      // Step 1: Create product with image metadata (backend generates s3Keys and returns presigned URLs)
      const createProductBody: any = {
        productInfo: {
          name: formData.name,
          brandId: formData.brandId ? Number(formData.brandId) : null,
          categoryId: formData.categoryId ? Number(formData.categoryId) : null,
          minimumPrice: minimumPriceValue,
          price: finalPrice,
          description: formData.description || '',
        },
        imagesMetadata: imagesMetadata,
      };

      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createProductBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to create product';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.userMessage || errorData.message || 'נכשל ביצירת המוצר';
        } catch (parseError) {
          errorMessage = errorText || 'נכשל ביצירת המוצר';
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Step 2: Upload images to S3 using presigned URLs
      if (result.imagesPreSignedUrls && result.imagesPreSignedUrls.length > 0) {
        await Promise.all(
          result.imagesPreSignedUrls.map(async (preSignedUrl: string, index: number) => {
            const imageFile = selectedImages[index];
            const imageMetadata = imagesMetadata[index];
            
            const uploadResponse = await fetch(preSignedUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': imageFile.type,
                'Content-MD5': imageMetadata.fileMd5Base64,
              },
              body: imageFile,
            });

            if (!uploadResponse.ok) {
              throw new Error(`נכשל בהעלאת התמונה ${imageFile.name} ל-S3`);
            }
          })
        );
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
          <p className="text-gray-600 font-medium">... טוען מוצרים</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto" dir="rtl">
        <div className="glass-card rounded-3xl p-8 bg-red-50/50 border-red-200">
          <h2 className="text-xl font-bold text-red-800 mb-2">שגיאה בטעינת מוצרים</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-32" dir="rtl">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">מוצרים</h1>
            <p className="text-gray-600">קטלוג המוצרים שלך ({products.length} מוצרים)</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 md:mt-0 btn-add-indigo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>הוסף מוצר</span>
          </button>
        </div>
      </div>

      {/* Sort Controls & Pagination Info */}
      {(products.length > 0 || categoryFilter || brandFilter) && (
        <div className="glass-card rounded-3xl p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-start">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 ml-auto">
                {/* Category Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">קטגוריה:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => handleCategoryFilterChange(e.target.value)}
                    className="glass-select pl-8 pr-4 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-32"
                    dir="ltr"
                  >
                    <option value="">הכל</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Brand Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">מותג:</span>
                  <select
                    value={brandFilter}
                    onChange={(e) => handleBrandFilterChange(e.target.value)}
                    className="glass-select pl-8 pr-4 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-32"
                    dir="ltr"
                  >
                    <option value="">הכל</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">מיין לפי:</span>
                  <button
                    onClick={() => handleSortChange('name')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                      sortBy === 'name'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'glass-button text-gray-800 hover:shadow-md'
                    }`}
                  >
                    <span>שם</span>
                    {sortBy === 'name' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortDirection === 'ASC' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        )}
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleSortChange('price')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                      sortBy === 'price'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'glass-button text-gray-800 hover:shadow-md'
                    }`}
                  >
                    <span>מחיר</span>
                    {sortBy === 'price' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortDirection === 'ASC' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        )}
                      </svg>
                    )}
                  </button>
                </div>

                {/* Page Size Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">הצג:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="glass-select pl-3 pr-8 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-20"
                    dir="ltr"
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
      )}

      {/* Products List */}
      {products.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <div className="flex flex-col items-center gap-4">
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
                  אין מוצרים התואמים את המסננים
                </h2>
                <p className="text-gray-600 max-w-md">
                  אין מוצרים התואמים את המסננים שנבחרו.
                </p>
                <button
                  onClick={() => {
                    handleCategoryFilterChange('');
                    handleBrandFilterChange('');
                  }}
                  className="glass-button mt-4 px-8 py-3 rounded-xl font-semibold text-gray-800 hover:shadow-lg transition-all"
                >
                  הצג את כל המוצרים
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
                <h2 className="text-2xl font-bold text-gray-800">אין מוצרים עדיין</h2>
                <p className="text-gray-600 max-w-md">
                  עדיין לא הוספת מוצרים לקטלוג שלך.
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="glass-button mt-4 px-8 py-3 rounded-xl font-semibold text-gray-800 hover:shadow-lg transition-all"
                >
                  הוסף את המוצר הראשון שלך
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
          {products.map((product) => {
            const images = productImages[product.id] || [];
            const currentImageIndex = productImageIndices[product.id] || 0;
            const previousImageIndex = productPrevImageIndices[product.id];
            const direction = productImageDirections[product.id];
            return (
              <div key={product.id} className="glass-card rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 group border border-gray-200/50 flex flex-col">
                {/* Product Image */}
                <div 
                  className="relative h-32 bg-gradient-to-br from-purple-100 to-pink-100 overflow-hidden flex-shrink-0 group/image"
                  onTouchStart={(e) => {
                    if (images.length > 1) {
                      const touch = e.touches[0];
                      setTouchStart({
                        x: touch.clientX,
                        y: touch.clientY,
                        productId: product.id
                      });
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (!touchStart || touchStart.productId !== product.id || images.length <= 1) return;
                    
                    const touch = e.changedTouches[0];
                    const deltaX = touch.clientX - touchStart.x;
                    const deltaY = touch.clientY - touchStart.y;
                    
                    // Only trigger if horizontal swipe is greater than vertical (more horizontal than vertical)
                    // And minimum swipe distance of 50px
                    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                      e.stopPropagation();
                      // In RTL: swipe right (positive deltaX) = previous, swipe left (negative deltaX) = next
                      if (deltaX > 0) {
                        handlePrevProductImage(product.id, images);
                      } else {
                        handleNextProductImage(product.id, images);
                      }
                    }
                    
                    setTouchStart(null);
                  }}
                >
                  {images.length > 0 ? (
                    <>
                      {previousImageIndex != null && previousImageIndex !== currentImageIndex && images[previousImageIndex] && (
                        <img
                          key={`${product.id}-prev-${previousImageIndex}`}
                          src={images[previousImageIndex]}
                          alt={product.name}
                          className={`absolute inset-0 w-full h-full object-contain transition-transform duration-500 ${
                            direction === 'next'
                              ? 'animate-slide-out-left'
                              : direction === 'prev'
                                ? 'animate-slide-out-right'
                                : ''
                          }`}
                        />
                      )}
                      <img
                        key={`${product.id}-current-${currentImageIndex}`}
                        src={images[currentImageIndex]}
                        alt={product.name}
                        className={`absolute inset-0 w-full h-full object-contain transition-transform duration-500 ${
                          direction === 'prev'
                            ? 'animate-slide-in-right'
                            : direction === 'next'
                              ? 'animate-slide-in-left'
                              : ''
                        }`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const placeholder = (e.target as HTMLImageElement).parentElement?.querySelector('.image-placeholder');
                          if (placeholder) {
                            (placeholder as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                      {/* Navigation arrows - only show if multiple images */}
                      {images.length > 1 && (
                        <>
                          {/* Left Arrow */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrevProductImage(product.id, images);
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
                              handleNextProductImage(product.id, images);
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
                  {(images.length === 0) && (
                    <div className="image-placeholder w-full h-full flex items-center justify-center text-4xl opacity-40">
                      📦
                    </div>
                  )}
                  {/* Show image count badge if multiple images */}
                  {images.length > 1 && (
                    <div className="absolute bottom-2 left-2">
                      <span className="px-2 py-1 text-xs font-semibold bg-black/60 text-white rounded-full backdrop-blur-sm">
                        {currentImageIndex + 1} / {images.length}
                      </span>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProduct(product);
                      }}
                      className="p-2 md:p-1.5 rounded-lg bg-white/90 hover:bg-white transition-colors shadow-md backdrop-blur-sm touch-manipulation"
                      title="ערוך מוצר"
                    >
                      <svg className="w-5 h-5 md:w-4 md:h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProductToDelete(product);
                      }}
                      className="p-2 md:p-1.5 rounded-lg bg-white/90 hover:bg-red-50 transition-colors shadow-md backdrop-blur-sm touch-manipulation"
                      title="מחק מוצר"
                    >
                      <svg className="w-5 h-5 md:w-4 md:h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-xl font-bold text-purple-600">
                        {formatPrice(product.price)}
                      </span>
                      {product.price > product.minimumPrice && (
                        <span className="text-xs text-gray-400">
                          Min {formatPrice(product.minimumPrice)}
                        </span>
                      )}
                    </div>
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
        rtl={true}
      />

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" 
          dir="rtl" 
          style={{ margin: 0, top: 0 }}
          onClick={(e) => {
            // Close on backdrop click
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div 
            className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-header-title">הוסף מוצר חדש</h2>
              <CloseButton onClick={handleCloseModal} />
            </div>

            {formError && (
              <div className="glass-card bg-red-50/80 border border-red-200/60 rounded-xl p-3 mb-4 text-red-600 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
              <div>
                <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1.5">
                  שם המוצר *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  maxLength={MAX_PRODUCT_NAME_LENGTH}
                  className={`glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-800 text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${
                    showErrors && fieldErrors.name ? 'border-red-400 focus:ring-red-400/50' : ''
                  }`}
                  dir="ltr"
                  placeholder="לדוגמה: פולי קפה פרמיום"
                />
                {showErrors && fieldErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="categoryId" className="block text-xs font-medium text-gray-700 mb-1.5">
                  קטגוריה
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-800 text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  dir="ltr"
                >
                  <option value="">ללא</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="brandId" className="block text-xs font-medium text-gray-700 mb-1.5">
                  מותג
                </label>
                <select
                  id="brandId"
                  name="brandId"
                  value={formData.brandId}
                  onChange={handleInputChange}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-800 text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  dir="ltr"
                >
                  <option value="">ללא</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="minimumPrice" className="block text-xs font-medium text-gray-700 mb-1.5">
                    מחיר מינימלי *
                  </label>
                  <div className="relative">
                    <span className="absolute right-3 top-2.5 text-gray-700 text-sm font-semibold z-10">₪</span>
                    <input
                      id="minimumPrice"
                      name="minimumPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      max={MAX_PRICE}
                      value={formData.minimumPrice}
                      onChange={handleInputChange}
                      className={`glass-input w-full pr-7 pl-3.5 py-2.5 rounded-xl text-sm text-gray-800 text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${
                        showErrors && fieldErrors.minimumPrice ? 'border-red-400 focus:ring-red-400/50' : ''
                      }`}
                      dir="ltr"
                      placeholder="0.00"
                    />
                  </div>
                  {showErrors && fieldErrors.minimumPrice && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.minimumPrice}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="price" className="block text-xs font-medium text-gray-700 mb-1.5">
                    מחיר *
                  </label>
                  <div className="relative">
                    <span className="absolute right-3 top-2.5 text-gray-700 text-sm font-semibold z-10">₪</span>
                    <input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      max={MAX_PRICE}
                      value={formData.price}
                      onChange={handleInputChange}
                      className={`glass-input w-full pr-7 pl-3.5 py-2.5 rounded-xl text-sm text-gray-800 text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${
                        showErrors && fieldErrors.price ? 'border-red-400 focus:ring-red-400/50' : ''
                      }`}
                      dir="ltr"
                      placeholder="0.00"
                    />
                  </div>
                  {showErrors && fieldErrors.price && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.price}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-xs font-medium text-gray-700 mb-1.5">
                  תיאור
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  maxLength={MAX_PRODUCT_DESCRIPTION_LENGTH}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none transition-all"
                  placeholder="תיאור המוצר (אופציונלי)"
                  rows={3}
                />
              </div>

              {/* Image Upload Section */}
              <div>
                <label htmlFor="images" className="block text-xs font-medium text-gray-700 mb-1.5">
                  תמונות <span className="text-gray-500 text-xs">(עד 5, אופציונלי)</span>
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
                      className={`glass-input w-full px-3 py-4 rounded-xl text-sm text-gray-800 cursor-pointer flex items-center justify-center gap-2 border-2 border-dashed transition-all ${
                        selectedImages.length >= 5
                          ? 'opacity-50 cursor-not-allowed border-gray-300'
                          : isDragging
                            ? 'border-indigo-600 bg-indigo-100/50'
                            : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/30'
                      }`}
                    >
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {selectedImages.length >= 5
                          ? 'הושג מקסימום 5 תמונות'
                          : isDragging
                            ? 'שחרר תמונות כאן'
                            : `בחר תמונות או גרור ושחרר (${selectedImages.length}/5)`}
                      </span>
                    </label>
                  </div>

                  {/* Image Previews */}
                  {selectedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {[...selectedImages].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })).map((image, index) => (
                        <div key={index} className="flex flex-col">
                          <div className="relative group bg-gray-100 rounded-lg border-2 border-gray-200 p-2 flex items-center justify-center">
                            <img
                              src={URL.createObjectURL(image)}
                              alt={formData.name ? `תצוגה מקדימה של תמונת המוצר ${formData.name} - תמונה ${index + 1}` : `תצוגה מקדימה של תמונת מוצר - תמונה ${index + 1}`}
                              className="max-w-full max-h-24 object-contain rounded-lg"
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
                          </div>
                          <p className="text-xs text-gray-600 truncate mt-1 text-center" title={image.name}>
                            {image.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 text-center">
                    סדר התמונות לפי השמות שלהם
                  </p>
                  <p className="text-xs text-gray-500 text-center">
                    JPEG, PNG, WebP. גודל מקסימלי: 5MB לכל תמונה.
                  </p>
                </div>
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
                      <Spinner size="sm" />
                      <span>יוצר...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>צור מוצר</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && productToEdit && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" 
          dir="rtl" 
          style={{ margin: 0, top: 0 }}
          onClick={(e) => {
            // Close on backdrop click
            if (e.target === e.currentTarget) {
              handleCloseEditModal();
            }
          }}
        >
          <div 
            className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-header-title">ערוך מוצר</h2>
              <CloseButton onClick={handleCloseEditModal} />
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50/80 border border-red-200/60 rounded-xl text-red-600 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} noValidate className="space-y-3.5">
              <div>
                <label htmlFor="edit-name" className="block text-xs font-medium text-gray-700 mb-1.5">
                  שם המוצר *
                </label>
                <input
                  id="edit-name"
                  name="name"
                  type="text"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  maxLength={MAX_PRODUCT_NAME_LENGTH}
                  className={`glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-center ${
                    showErrors && fieldErrors.name ? 'border-red-400 focus:ring-red-400/50' : ''
                  }`}
                  dir="ltr"
                  placeholder="לדוגמה: פולי קפה פרמיום"
                />
                {showErrors && fieldErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="edit-categoryId" className="block text-xs font-medium text-gray-700 mb-1.5">
                  קטגוריה
                </label>
                <select
                  id="edit-categoryId"
                  name="categoryId"
                  value={editFormData.categoryId}
                  onChange={handleEditInputChange}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-center"
                  dir="ltr"
                >
                  <option value="">ללא</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-brandId" className="block text-xs font-medium text-gray-700 mb-1.5">
                  מותג
                </label>
                <select
                  id="edit-brandId"
                  name="brandId"
                  value={editFormData.brandId}
                  onChange={handleEditInputChange}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-center"
                  dir="ltr"
                >
                  <option value="">ללא</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="edit-minimumPrice" className="block text-xs font-medium text-gray-700 mb-1.5">
                    מחיר מינימלי *
                  </label>
                  <div className="relative">
                    <span className="absolute right-3 top-2.5 text-gray-700 text-sm font-semibold z-10">₪</span>
                    <input
                      id="edit-minimumPrice"
                      name="minimumPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      max={MAX_PRICE}
                      value={editFormData.minimumPrice}
                      onChange={handleEditInputChange}
                      className={`glass-input w-full pr-7 pl-3.5 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-center ${
                        showErrors && fieldErrors.minimumPrice ? 'border-red-400 focus:ring-red-400/50' : ''
                      }`}
                      dir="ltr"
                      placeholder="0.00"
                    />
                  </div>
                  {showErrors && fieldErrors.minimumPrice && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.minimumPrice}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="edit-price" className="block text-xs font-medium text-gray-700 mb-1.5">
                    מחיר *
                  </label>
                  <div className="relative">
                    <span className="absolute right-3 top-2.5 text-gray-700 text-sm font-semibold z-10">₪</span>
                    <input
                      id="edit-price"
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      max={MAX_PRICE}
                      value={editFormData.price}
                      onChange={handleEditInputChange}
                      className={`glass-input w-full pr-7 pl-3.5 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-center ${
                        showErrors && fieldErrors.price ? 'border-red-400 focus:ring-red-400/50' : ''
                      }`}
                      dir="ltr"
                      placeholder="0.00"
                    />
                  </div>
                  {showErrors && fieldErrors.price && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.price}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="edit-description" className="block text-xs font-medium text-gray-700 mb-1.5">
                  תיאור
                </label>
                <textarea
                  id="edit-description"
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditInputChange}
                  maxLength={MAX_PRODUCT_DESCRIPTION_LENGTH}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none"
                  placeholder="תיאור המוצר (אופציונלי)"
                  rows={3}
                />
              </div>

              {/* Image Management Section */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  תמונות <span className="text-gray-500 text-xs">(עד 5 סה״כ)</span>
                </label>
                <div className="space-y-3">
                  {/* Loading State */}
                  {isLoadingImages && (
                    <div className="text-center py-4">
                      <svg className="animate-spin h-6 w-6 text-indigo-600 mx-auto" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-xs text-gray-500 mt-2">טוען תמונות...</p>
                    </div>
                  )}

                  {/* Existing Images */}
                  {!isLoadingImages && existingImages.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">תמונות קיימות:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[...existingImages].sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' })).map((image) => (
                          <div key={image.id} className="flex flex-col">
                            <div className="relative group bg-gray-100 rounded-lg border-2 border-gray-200 p-2 flex items-center justify-center">
                              <img
                                src={image.url}
                                alt={productToEdit ? `תמונת המוצר ${productToEdit.name} - ${image.fileName}` : `תמונת מוצר - ${image.fileName}`}
                                className="max-w-full max-h-24 object-contain rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteExistingImage(image.id)}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                title="מחק תמונה"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <p className="text-xs text-gray-600 truncate mt-1 text-center" title={image.fileName}>
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
                      <p className="text-xs font-medium text-red-600 mb-2">תמונות למחיקה ({imagesToDelete.length}):</p>
                      <div className="flex flex-wrap gap-2">
                        {imagesToDelete.map((imageId) => {
                          const deletedImage = originalImages.find(img => img.id === imageId);
                          if (!deletedImage) return null;
                          return (
                            <div key={imageId} className="relative opacity-50 border-2 border-red-300 rounded-lg p-1">
                              <img
                                src={deletedImage.url}
                                alt={productToEdit ? `תמונת המוצר ${productToEdit.name} למחיקה - ${deletedImage.fileName}` : `תמונת מוצר למחיקה - ${deletedImage.fileName}`}
                                className="w-16 h-16 object-cover rounded"
                              />
                              <button
                                type="button"
                                onClick={() => handleUndoDeleteImage(imageId)}
                                className="absolute -top-1 -right-1 p-1 bg-green-500 text-white rounded-full shadow-lg"
                                title="בטל מחיקה"
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
                      <p className="text-xs font-medium text-green-600 mb-2">תמונות חדשות להוספה:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[...newImagesToAdd].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })).map((image, index) => (
                          <div key={index} className="flex flex-col">
                            <div className="relative group bg-gray-100 rounded-lg border-2 border-green-200 p-2 flex items-center justify-center">
                              <img
                                src={URL.createObjectURL(image)}
                                alt={productToEdit ? `תצוגה מקדימה של תמונת המוצר ${productToEdit.name} - תמונה חדשה ${index + 1}` : `תצוגה מקדימה של תמונת מוצר - תמונה חדשה ${index + 1}`}
                                className="max-w-full max-h-24 object-contain rounded-lg"
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
                            </div>
                            <p className="text-xs text-gray-600 truncate mt-1 text-center" title={image.name}>
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
                      className={`glass-input w-full px-3 py-4 rounded-xl text-sm text-gray-800 cursor-pointer flex items-center justify-center gap-2 border-2 border-dashed transition-all ${
                        (existingImages.length + newImagesToAdd.length) >= 5
                          ? 'opacity-50 cursor-not-allowed border-gray-300'
                          : isDraggingEdit
                            ? 'border-indigo-600 bg-indigo-100/50'
                            : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/30'
                      }`}
                    >
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {(existingImages.length + newImagesToAdd.length) >= 5
                          ? 'הושג מקסימום 5 תמונות'
                          : isDraggingEdit
                            ? 'שחרר תמונות כאן'
                            : `הוסף עוד תמונות או גרור ושחרר (${existingImages.length + newImagesToAdd.length}/5)`}
                      </span>
                    </label>
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    סדר התמונות לפי השמות שלהם
                  </p>
                  <p className="text-xs text-gray-500 text-center">
                    JPEG, PNG, WebP. גודל מקסימלי: 5MB לכל תמונה.
                  </p>
                </div>
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
                      <Spinner size="sm" />
                      <span>מעדכן...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>עדכן מוצר</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" 
          style={{ margin: 0, top: 0 }}
          onClick={(e) => {
            // Close on backdrop click
            if (e.target === e.currentTarget) {
              setProductToDelete(null);
            }
          }}
        >
          <div 
            className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/90" 
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">מחק מוצר</h2>
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
              <p className="text-gray-700 mb-4 break-words">
                האם אתה בטוח שברצונך למחוק את <span className="font-semibold">{productToDelete.name}</span>? פעולה זו לא ניתנת לביטול.
              </p>
              <div className="glass-card bg-yellow-50/50 border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-yellow-800">
                    מוצר זה יוסר מהקטלוג שלך. נתונים היסטוריים יישמרו במערכת.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="glass-button flex-1 py-2.5 px-4 rounded-xl font-semibold text-gray-800 bg-gray-100/60 hover:bg-gray-200/70 border-gray-400 hover:border-gray-500 disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                onClick={handleDeleteProduct}
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
                  <span>מחק מוצר</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
