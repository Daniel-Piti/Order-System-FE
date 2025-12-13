import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { publicAPI, orderAPI, agentAPI } from '../services/api';
import type { Product, Category, Brand, OrderPublic, Order } from '../services/api';
import CheckoutFlow from '../components/CheckoutFlow';
import PaginationBar from '../components/PaginationBar';
import ProductDetailModal from '../components/ProductDetailModal';
import { formatPrice } from '../utils/formatPrice';

interface CartItem {
  product: Product;
  quantity: number;
}

export default function StorePage() {
  const { managerId: managerIdParam, orderId } = useParams<{ managerId?: string; orderId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Detect edit mode from URL path
  const isEditMode = location.pathname.includes('/edit/');
  
  const [managerId, setManagerId] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderPublic | null>(null);
  const [editOrder, setEditOrder] = useState<Order | null>(null); // Full order for edit mode
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
  
  // Sorting state
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<number[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);
  const [isBrandsExpanded, setIsBrandsExpanded] = useState(true);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);
  
  // Track pending quantities for products not yet in cart
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
  
  // Track which products just got added (for success animation)
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());
  const [hasLoadedCart, setHasLoadedCart] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    if (!managerId && !orderId) return; // Wait for managerId or orderId to be set
    
    const key = orderId ? `cart_${orderId}` : `cart_${managerId}`;
    const savedCartData = localStorage.getItem(key);
    if (savedCartData) {
      try {
        const parsed = JSON.parse(savedCartData);
        
        // Check if data has expiration info (new format)
        if (parsed.expiresAt) {
          const expiresAt = new Date(parsed.expiresAt);
          const now = new Date();
          
          if (now > expiresAt) {
            // Cart has expired, remove it
            localStorage.removeItem(key);
            setHasLoadedCart(true);
            return;
          }
          
          // Cart is still valid, load it
          if (parsed.cart && parsed.cart.length > 0) {
            setCart(parsed.cart);
          }
        } else {
          // Old format (no expiration) - treat as expired and remove
          localStorage.removeItem(key);
        }
      } catch (err) {
        console.error('Failed to parse saved cart:', err);
        localStorage.removeItem(key); // Remove corrupted data
      }
    }
    setHasLoadedCart(true);
  }, [orderId, managerId]);

  // Save cart to localStorage whenever it changes (but only after initial load)
  useEffect(() => {
    if (!hasLoadedCart) return; // Don't save until we've tried to load
    if (!managerId && !orderId) return; // Don't save if managerId/orderId not set yet
    
    const key = orderId ? `cart_${orderId}` : `cart_${managerId}`;
    if (cart.length > 0) {
      // Save with expiration date (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      const cartData = {
        cart: cart,
        expiresAt: expiresAt.toISOString()
      };
      
      localStorage.setItem(key, JSON.stringify(cartData));
    } else {
      // If cart is empty, remove from localStorage
      localStorage.removeItem(key);
    }
  }, [cart, orderId, managerId, hasLoadedCart]);

  // Fetch managerId from order if orderId is provided, otherwise use managerIdParam
  // Handle edit mode: load order via authenticated API and populate cart
  useEffect(() => {
    const fetchManagerId = async () => {
      setError('');
      
      // Edit mode: Load order via authenticated API
      if (isEditMode && orderId) {
        try {
          setIsLoading(true);
          const token = localStorage.getItem('authToken');
          if (!token) {
            setError('אנא התחבר כדי לערוך הזמנות');
            navigate('/login/manager');
            setIsLoading(false);
            return;
          }
          
          const userRole = localStorage.getItem('userRole');
          
          // Load order based on user role
          let fetchedOrder: Order;
          if (userRole === 'agent') {
            fetchedOrder = await agentAPI.getOrderById(orderId);
          } else if (userRole === 'manager') {
            fetchedOrder = await orderAPI.getOrderById(orderId);
          } else {
            setError('אין הרשאה לערוך הזמנות');
            navigate('/login/manager');
            setIsLoading(false);
            return;
          }
          
          // Validate order is PLACED
          if (fetchedOrder.status !== 'PLACED') {
            setError('ניתן לערוך רק הזמנות שהוזמנו');
            setIsLoading(false);
            return;
          }
          
          setEditOrder(fetchedOrder);
          setManagerId(fetchedOrder.managerId);
          
          // Populate cart with order products (filter out deleted products)
          // Use getAllByOrderId to get products with correct prices (overrides and discounts)
          const allProducts = await publicAPI.products.getAllByOrderId(fetchedOrder.id);
          const availableProductIds = new Set(allProducts.map(p => p.id));
          
          // Build cart from order products, only including products that still exist
          const cartItems: CartItem[] = [];
          for (const orderProduct of fetchedOrder.products) {
            const product = allProducts.find(p => p.id === orderProduct.productId);
            if (product && availableProductIds.has(product.id)) {
              cartItems.push({
                product: product,
                quantity: orderProduct.quantity
              });
            }
            // If product doesn't exist, skip it (deleted product)
          }
          
          setCart(cartItems);
          setHasLoadedCart(true);
          
          // Don't set loading to false here - fetchProducts will handle loading state
        } catch (err: any) {
          console.error('Error fetching order for edit:', err);
          if (err.response?.status === 401 || err.response?.status === 403) {
            setError('אין הרשאה לערוך את ההזמנה הזו');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userRole');
            navigate('/login/manager');
          } else if (err.response?.status === 404) {
            setError('הזמנה לא נמצאה');
          } else {
            setError(err.response?.data?.userMessage || 'נכשל בטעינת ההזמנה');
          }
          setIsLoading(false);
        }
      } else if (managerIdParam) {
        setManagerId(managerIdParam);
        // Don't set loading to false here - fetchProducts will handle loading state
      } else if (orderId) {
        try {
          setIsLoading(true);
          const fetchedOrder = await publicAPI.orders.getById(orderId);
          setOrder(fetchedOrder);
          setManagerId(fetchedOrder.managerId);
          // Don't set loading to false here - fetchProducts will handle loading state
        } catch (err: any) {
          console.error('Error fetching order:', err);
          setError('נכשל בטעינת ההזמנה');
          setIsLoading(false);
        }
      } else {
        // No managerId or orderId in URL - invalid route
        setError('כתובת חנות לא תקינה');
        setIsLoading(false);
      }
    };
    fetchManagerId();
  }, [managerIdParam, orderId, isEditMode, navigate]);

  const fetchCategories = useCallback(async () => {
    if (!managerId) return;
    
    try {
      const data = await publicAPI.categories.getAllByManagerId(managerId);
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, [managerId]);

  const fetchBrands = useCallback(async () => {
    if (!managerId) return;
    
    try {
      const data = await publicAPI.brands.getAllByManagerId(managerId);
      setBrands(data);
    } catch (err) {
      console.error('Failed to fetch brands:', err);
    }
  }, [managerId]);

  const fetchProducts = useCallback(async () => {
    if (!managerId) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      // If orderId exists, use order-specific endpoint (with price overrides) - returns all products
      // Otherwise use regular store endpoint with pagination
      if (orderId) {
        const allProducts = await publicAPI.products.getAllByOrderId(orderId);
        
        // In edit mode, update cart items with new product prices
        if (isEditMode) {
          setCart(prevCart => {
            if (prevCart.length === 0) return prevCart; // No cart items to update
            return prevCart.map(cartItem => {
              const updatedProduct = allProducts.find(p => p.id === cartItem.product.id);
              if (updatedProduct) {
                return {
                  ...cartItem,
                  product: updatedProduct // Update with new product object that has correct prices
                };
              }
              return cartItem; // Keep original if product not found
            });
          });
        }
        
        // Filter by categories and brands client-side if selected
        let filteredProducts = allProducts;
        if (selectedCategories.length > 0) {
          filteredProducts = filteredProducts.filter(p => p.categoryId && selectedCategories.includes(p.categoryId));
        }
        if (selectedBrands.length > 0) {
          filteredProducts = filteredProducts.filter(p => p.brandId && selectedBrands.includes(p.brandId));
        }
        
        // Sort client-side
        let sortedProducts = [...filteredProducts];
        if (sortBy === 'name') {
          sortedProducts.sort((a, b) => {
            const comparison = a.name.localeCompare(b.name);
            return sortDirection === 'ASC' ? comparison : -comparison;
          });
        } else if (sortBy === 'price') {
          sortedProducts.sort((a, b) => {
            const comparison = a.price - b.price;
            return sortDirection === 'ASC' ? comparison : -comparison;
          });
        } else if (sortBy === 'minimumPrice') {
          sortedProducts.sort((a, b) => {
            const comparison = a.minimumPrice - b.minimumPrice;
            return sortDirection === 'ASC' ? comparison : -comparison;
          });
        }
        
        // Paginate client-side
        const startIndex = currentPage * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedProducts = sortedProducts.slice(startIndex, endIndex);
        
        setProducts(paginatedProducts);
        setTotalPages(Math.ceil(sortedProducts.length / pageSize));
        
        // Fetch images for products
        await fetchProductImagesForAll(paginatedProducts);
      } else {
        // Regular store - use paginated endpoint
        // Note: Backend currently supports single category/brand filter
        // For multi-select, we'll fetch all and filter client-side
        const hasFilters = selectedCategories.length > 0 || selectedBrands.length > 0;
        
        if (hasFilters) {
          // Fetch all products and filter client-side
          const allProductsResponse = await publicAPI.products.getAllByManagerId(
            managerId,
            0,
            1000, // Large page size to get all products
            sortBy,
            sortDirection
          );
          
          let filteredProducts = allProductsResponse.content;
          
          // Filter by categories
          if (selectedCategories.length > 0) {
            filteredProducts = filteredProducts.filter(p => p.categoryId && selectedCategories.includes(p.categoryId));
          }
          
          // Filter by brands
          if (selectedBrands.length > 0) {
            filteredProducts = filteredProducts.filter(p => p.brandId && selectedBrands.includes(p.brandId));
          }
          
          // Sort client-side (already sorted, but keep for consistency)
          let sortedProducts = [...filteredProducts];
          if (sortBy === 'name') {
            sortedProducts.sort((a, b) => {
              const comparison = a.name.localeCompare(b.name);
              return sortDirection === 'ASC' ? comparison : -comparison;
            });
          } else if (sortBy === 'price') {
            sortedProducts.sort((a, b) => {
              const comparison = a.price - b.price;
              return sortDirection === 'ASC' ? comparison : -comparison;
            });
          }
          
          // Paginate client-side
          const startIndex = currentPage * pageSize;
          const endIndex = startIndex + pageSize;
          const paginatedProducts = sortedProducts.slice(startIndex, endIndex);
          
          setProducts(paginatedProducts);
          setTotalPages(Math.ceil(sortedProducts.length / pageSize));
          
          await fetchProductImagesForAll(paginatedProducts);
        } else {
          // No filters - use normal pagination
          const pageResponse = await publicAPI.products.getAllByManagerId(
            managerId,
            currentPage,
            pageSize,
            sortBy,
            sortDirection
          );
          
          setProducts(pageResponse.content);
          setTotalPages(pageResponse.totalPages);
          
          await fetchProductImagesForAll(pageResponse.content);
        }
      }
    } catch (err: any) {
      console.error('Store error:', err);
      
      // Check if it's a 404 (user not found)
      if (err.response?.status === 404 || err.message?.includes('404')) {
        setError('STORE_NOT_FOUND');
      } else if (err.response?.status === 403 || err.message?.includes('403')) {
        setError('STORE_NOT_ACCESSIBLE');
      } else {
        setError('STORE_ERROR');
      }
    } finally {
      setIsLoading(false);
    }
  }, [managerId, orderId, isEditMode, currentPage, pageSize, sortBy, sortDirection, selectedCategories, selectedBrands]);

  const fetchProductImagesForAll = async (productsList: Product[]) => {
    if (!managerId || productsList.length === 0) return;
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const imagePromises = productsList.map(async (product) => {
        try {
          const response = await fetch(`${API_BASE_URL}/public/products/manager/${managerId}/product/${product.id}/images`);
          if (response.ok) {
            const images: Array<{ id: number; url: string; fileName: string }> = await response.json();
            // Sort images by fileName (same as ProductsPage)
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

  useEffect(() => {
    if (managerId) {
      fetchProducts();
      fetchCategories();
      fetchBrands();
    }
  }, [managerId, fetchProducts, fetchCategories, fetchBrands]);

  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, { product, quantity }];
    });
    
    // Reset pending quantity after adding to cart
    setPendingQuantities(prev => {
      const updated = { ...prev };
      delete updated[product.id];
      return updated;
    });

    // Show "Added!" feedback
    setJustAdded(prev => new Set(prev).add(product.id));
    
    // Remove feedback after 2 seconds
    setTimeout(() => {
      setJustAdded(prev => {
        const updated = new Set(prev);
        updated.delete(product.id);
        return updated;
      });
    }, 2000);
  };

  const getPendingQuantity = (productId: string): number => {
    return pendingQuantities[productId] || 1;
  };

  const updatePendingQuantity = (productId: string, delta: number) => {
    setPendingQuantities(prev => {
      const currentQty = prev[productId] || 1;
      const newQty = Math.max(1, currentQty + delta);
      return { ...prev, [productId]: newQty };
    });
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

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
    setCurrentPage(0); // Reset to first page when filter changes
  };

  const handleBrandToggle = (brandId: number) => {
    setSelectedBrands(prev => {
      if (prev.includes(brandId)) {
        return prev.filter(id => id !== brandId);
      } else {
        return [...prev, brandId];
      }
    });
    setCurrentPage(0); // Reset to first page when filter changes
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setCurrentPage(0);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.product.id === productId
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  // Client-side filtering (currently only category filter, search removed as unused)
  const filteredProducts = products || [];

  // Check if order status is EXPIRED, CANCELLED, DONE, or PLACED (only if we have an orderId in the URL)
  const isLinkExpired = orderId && order && order.status === 'EXPIRED';
  const isLinkCancelled = orderId && order && order.status === 'CANCELLED';
  const isOrderDone = orderId && order && order.status === 'DONE';
  const isOrderPlaced = orderId && order && order.status === 'PLACED';

  if (isLinkExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4" dir="rtl">
        <div className="glass-card rounded-3xl p-8 md:p-12 max-w-2xl w-full text-center">
          <div className="text-6xl mb-6">⏰</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">קישור פג תוקף</h1>
          <p className="text-lg text-gray-600">
            קישור ההזמנה הזה פג תוקף. אנא צור קשר עם המוכר לקבלת קישור חדש או בדוק את סטטוס ההזמנה שלך.
          </p>
        </div>
      </div>
    );
  }

  if (isLinkCancelled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4" dir="rtl">
        <div className="glass-card rounded-3xl p-8 md:p-12 max-w-2xl w-full text-center">
          <div className="text-6xl mb-6">🚫</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">הזמנה בוטלה</h1>
          <p className="text-lg text-gray-600">
            ההזמנה הזו בוטלה. אנא צור קשר עם המוכר אם יש לך שאלות או שאתה צריך עזרה.
          </p>
        </div>
      </div>
    );
  }

  if (isOrderDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4" dir="rtl">
        <div className="glass-card rounded-3xl p-8 md:p-12 max-w-2xl w-full text-center">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">הזמנה הושלמה</h1>
          <p className="text-lg text-gray-600">
            ההזמנה הזו כבר הושלמה.
          </p>
        </div>
      </div>
    );
  }

  if (isOrderPlaced) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4" dir="rtl">
        <div className="glass-card rounded-3xl p-8 md:p-12 max-w-2xl w-full text-center">
          <div className="text-6xl mb-6">📋</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">ההזמנה הזו כבר הוזמנה</h1>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" dir="rtl">
        <div className="glass-card p-8 rounded-3xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    let emoji = '😕';
    let title = 'אופס!';
    let message = 'משהו השתבש';
    
    if (error === 'STORE_NOT_FOUND') {
      emoji = '🏪';
      title = 'חנות לא נמצאה';
      message = 'החנות הזו לא קיימת או הוסרה. אנא בדוק את הקישור ונסה שוב.';
    } else if (error === 'STORE_NOT_ACCESSIBLE') {
      emoji = '🔒';
      title = 'חנות לא נגישה';
      message = 'החנות הזו כרגע לא נגישה. אנא צור קשר עם בעל החנות.';
    } else if (error === 'STORE_ERROR') {
      emoji = '😕';
      title = 'לא ניתן לטעון את החנות';
      message = 'יש לנו בעיה בטעינת החנות הזו. אנא נסה שוב מאוחר יותר.';
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-4" dir="rtl">
        <div className="glass-card p-12 rounded-3xl max-w-lg text-center">
          <div className="text-8xl mb-6">{emoji}</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">{title}</h2>
          <p className="text-lg text-gray-600 mb-6">{message}</p>
          <button
            onClick={() => window.location.reload()}
            className="glass-button px-6 py-3 rounded-xl font-semibold text-gray-800"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-24" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-white/40 border-b-2 border-white/40 shadow-lg">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">🛍️</div>
              <div>
                <h1 className="text-2xl font-bold text-purple-600">
                  החנות שלנו
                </h1>
                <p className="text-sm text-gray-600">עיין במוצרים שלנו</p>
              </div>
            </div>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(!isCartOpen)}
              className="glass-button px-6 py-3 rounded-2xl font-semibold text-gray-800 flex items-center gap-2"
            >
              <span className="text-2xl">🛒</span>
              <span>עגלה</span>
              {getTotalItems() > 0 && (
                          <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs font-bold rounded-full h-7 w-7 flex items-center justify-center shadow-lg">
                  {getTotalItems()}
                </span>
              )}
            </button>
          </div>

          {/* Filters and Controls Bar */}
          <div className="mt-4 space-y-3">
            {/* Mobile Filter Button - Full width on mobile */}
            <div className="lg:hidden flex justify-center">
            <button
              onClick={() => setIsSidebarOpen(true)}
                className="glass-button px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-800 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>מסננים</span>
              {(selectedCategories.length > 0 || selectedBrands.length > 0) && (
                <span className="bg-purple-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {selectedCategories.length + selectedBrands.length}
                </span>
              )}
            </button>
            </div>

            {/* Sort and Show Controls */}
            <div className="flex flex-wrap gap-2 sm:gap-3 items-center justify-center">
            {/* Sort */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">מיין:</span>
              <button
                onClick={() => handleSortChange('name')}
                className={`px-2 sm:px-4 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1 ${
                  sortBy === 'name'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'glass-button text-gray-800 hover:shadow-md'
                }`}
              >
                <span>שם</span>
                {sortBy === 'name' && (
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className={`px-2 sm:px-4 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1 ${
                  sortBy === 'price'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'glass-button text-gray-800 hover:shadow-md'
                }`}
              >
                <span>מחיר</span>
                {sortBy === 'price' && (
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {sortDirection === 'ASC' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    )}
                  </svg>
                )}
              </button>
            </div>

            {/* Show */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">הצג:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="glass-select pl-3 pr-8 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold text-gray-800 cursor-pointer w-16 sm:w-20"
                dir="ltr"
              >
                <option value={2}>2</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="hidden lg:block w-64 flex-shrink-0 fixed right-0 top-[144px] bottom-[80px] z-30">
          <div className="h-full bg-purple-50/40 backdrop-blur-xl border-2 border-gray-300/60 border-t-0 border-r-0 pr-4 sm:pr-6 lg:pr-8 pl-6 overflow-y-auto pt-8 pb-6">
            {/* Clear Filters Button */}
            {(selectedCategories.length > 0 || selectedBrands.length > 0) && (
              <button
                onClick={clearAllFilters}
                className="w-full mb-4 px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50/50 rounded-lg transition-colors"
              >
                נקה כל המסננים
              </button>
            )}

            {/* Filter Title */}
            <h2 className="text-xl font-bold text-gray-800 mb-4">מסננים</h2>

            {/* Divider */}
            <div className="mb-4 border-t border-gray-300/40"></div>

            {/* Categories Section */}
            <div className="mb-6">
              <button
                onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                className="w-full flex items-center justify-between mb-2 text-base font-semibold text-gray-800"
              >
                <span>קטגוריות</span>
                <svg
                  className={`w-5 h-5 transition-transform ${isCategoriesExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isCategoriesExpanded && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {categories.slice(0, showAllCategories ? categories.length : 5).map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-white/30 p-2 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 flex-shrink-0"
                      />
                      <span className="text-sm text-gray-700 flex-1">{category.category}</span>
                    </label>
                  ))}
                  
                  {categories.length > 5 && (
                    <button
                      onClick={() => setShowAllCategories(!showAllCategories)}
                      className="w-full text-sm text-purple-600 hover:text-purple-700 font-medium mt-2 py-1"
                    >
                      {showAllCategories ? 'הצג פחות' : `הצג הכל (${categories.length})`}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="my-6 border-t border-gray-300/40"></div>

            {/* Brands Section */}
            <div>
              <button
                onClick={() => setIsBrandsExpanded(!isBrandsExpanded)}
                className="w-full flex items-center justify-between mb-2 text-base font-semibold text-gray-800"
              >
                <span>מותגים</span>
                <svg
                  className={`w-5 h-5 transition-transform ${isBrandsExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isBrandsExpanded && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {brands.slice(0, showAllBrands ? brands.length : 5).map((brand) => (
                    <label
                      key={brand.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-white/30 p-2 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand.id)}
                        onChange={() => handleBrandToggle(brand.id)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 flex-shrink-0"
                      />
                      <span className="text-sm text-gray-700 flex-1">{brand.name}</span>
                    </label>
                  ))}
                  
                  {brands.length > 5 && (
                    <button
                      onClick={() => setShowAllBrands(!showAllBrands)}
                      className="w-full text-sm text-purple-600 hover:text-purple-700 font-medium mt-2 py-1"
                    >
                      {showAllBrands ? 'הצג פחות' : `הצג הכל (${brands.length})`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

      {/* Main Content */}
      <div className="w-full py-8 pb-32 lg:pr-64">
        {/* Main Content Area */}
        <main className="w-full pr-4 sm:pr-6 lg:pr-8 pl-4 sm:pl-6 lg:pl-8">
        {filteredProducts.length === 0 ? (
          <div className="glass-card p-12 rounded-3xl text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">לא נמצאו מוצרים</h3>
            <p className="text-gray-600">
              {selectedCategories.length > 0 || selectedBrands.length > 0
                ? 'נסה להתאים את המסננים שלך'
                : 'בדוק מאוחר יותר למוצרים חדשים!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
            {filteredProducts.map((product) => {
              const cartItem = cart.find(item => item.product.id === product.id);
              const inCart = !!cartItem;
              const showSuccess = justAdded.has(product.id);

              return (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="glass-card rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 group border border-gray-200/50 flex flex-col cursor-pointer"
                >
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
                            {/* Previous Arrow (Right side in RTL) */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentIndex = productImageIndices[product.id] || 0;
                                const newIndex = currentIndex === 0 ? productImages[product.id].length - 1 : currentIndex - 1;
                                setProductImageIndices(prev => ({ ...prev, [product.id]: newIndex }));
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white opacity-100 md:opacity-0 md:group-hover/image:opacity-100 transition-opacity backdrop-blur-sm z-10"
                              title="תמונה קודמת"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                            {/* Next Arrow (Left side in RTL) */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentIndex = productImageIndices[product.id] || 0;
                                const newIndex = (currentIndex + 1) % productImages[product.id].length;
                                setProductImageIndices(prev => ({ ...prev, [product.id]: newIndex }));
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white opacity-100 md:opacity-0 md:group-hover/image:opacity-100 transition-opacity backdrop-blur-sm z-10"
                              title="תמונה הבאה"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
                    
                    {/* In Cart Badge */}
                    {inCart && (
                      <div className="absolute top-2 right-2 backdrop-blur-xl bg-green-600/90 px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-lg flex items-center gap-1">
                        <span>✓</span>
                        <span>{cartItem!.quantity}</span>
                      </div>
                    )}
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
                      <span className="text-xl font-bold text-purple-600">
                        {formatPrice(product.price)}
                      </span>
                    </div>

                    {/* Quantity and Add to Cart */}
                    <div className="flex items-center gap-1.5 mt-auto" onClick={(e) => e.stopPropagation()}>
                      {/* Quantity Selector */}
                      <div className="flex items-center glass-button rounded-lg overflow-hidden border border-gray-300">
                        <button
                          onClick={() => inCart 
                            ? updateQuantity(product.id, cartItem!.quantity - 1)
                            : updatePendingQuantity(product.id, -1)
                          }
                          className="px-2 py-1.5 hover:bg-white/80 transition-colors font-bold text-gray-700 text-sm"
                        >
                          −
                        </button>
                        <span className="px-2 py-1.5 font-bold text-gray-900 min-w-[2rem] text-center border-x border-gray-300 text-sm">
                          {inCart ? cartItem!.quantity : getPendingQuantity(product.id)}
                        </span>
                        <button
                          onClick={() => inCart 
                            ? updateQuantity(product.id, cartItem!.quantity + 1)
                            : updatePendingQuantity(product.id, 1)
                          }
                          className="px-2 py-1.5 hover:bg-white/80 transition-colors font-bold text-gray-700 text-sm"
                        >
                          +
                        </button>
                      </div>

                      {/* Add/Success Button */}
                      <button
                        onClick={() => !showSuccess && addToCart(product, getPendingQuantity(product.id))}
                        disabled={showSuccess}
                        className="flex-1 font-semibold py-1.5 px-2 sm:px-3 rounded-lg flex items-center justify-center relative overflow-hidden bg-purple-600 text-white hover:bg-purple-700 hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm"
                      >
                        {/* Purple background (always there) */}
                        <div className="absolute inset-0 bg-purple-600 transition-opacity duration-500"></div>
                        
                        {/* Green success overlay */}
                        <div 
                          className={`absolute inset-0 bg-green-600 transition-opacity duration-500 ${
                            showSuccess ? 'opacity-100' : 'opacity-0'
                          }`}
                        ></div>

                        {/* Content */}
                        <div className="relative z-10 flex items-center justify-center gap-0 sm:gap-1.5">
                          {/* Icon Container - Hidden on mobile */}
                          <div className="hidden sm:block relative w-4 h-4 flex items-center justify-center flex-shrink-0">
                            {/* Add Icon */}
                            <svg 
                              className={`w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                                showSuccess ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
                              }`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
                              />
                            </svg>

                            {/* Success Icon */}
                            <svg 
                              className={`w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                                showSuccess ? 'opacity-100 scale-110' : 'opacity-0 scale-75'
                              }`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>

                          {/* Text */}
                          <div className="relative inline-block min-w-[2.5rem] sm:min-w-[3rem]">
                            <span className={`block transition-opacity duration-300 ${
                              showSuccess ? 'opacity-0' : 'opacity-100'
                            }`}>
                              הוסף
                            </span>
                            <span className={`absolute top-0 left-0 right-0 transition-opacity duration-300 ${
                              showSuccess ? 'opacity-100' : 'opacity-0'
                            }`}>
                              נוסף!
                            </span>
                          </div>
                        </div>
                      </button>
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
          maxWidth="max-w-full"
          sidebarOffset={false}
          showCondition={totalPages > 0}
          rtl={true}
        />
        </main>
      </div>

      {/* Mobile Sidebar Drawer */}
      {isSidebarOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>

          {/* Drawer */}
          <div className="fixed left-0 top-0 h-full w-full sm:w-96 backdrop-blur-xl bg-white/95 border-r-2 border-white/40 z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col lg:hidden" dir="rtl">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 border-b border-gray-200/50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">מסננים</h2>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="text-gray-600 hover:text-gray-800 text-3xl leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Clear Filters Button */}
                {(selectedCategories.length > 0 || selectedBrands.length > 0) && (
                  <button
                    onClick={clearAllFilters}
                    className="w-full mb-4 px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50/50 rounded-lg transition-colors"
                  >
                    נקה כל המסננים
                  </button>
                )}

                {/* Divider */}
                <div className="mb-4 border-t border-gray-300/40"></div>

                {/* Categories Section */}
                <div className="mb-6">
                  <button
                    onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                    className="w-full flex items-center justify-between mb-2 text-base font-semibold text-gray-800"
                  >
                    <span>קטגוריות</span>
                    <svg
                      className={`w-5 h-5 transition-transform ${isCategoriesExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isCategoriesExpanded && (
                    <div className="space-y-2">
                      {categories.slice(0, showAllCategories ? categories.length : 5).map((category) => (
                        <label
                          key={category.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-white/30 p-2 rounded-lg transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category.id)}
                            onChange={() => handleCategoryToggle(category.id)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 flex-shrink-0"
                          />
                          <span className="text-sm text-gray-700 flex-1">{category.category}</span>
                        </label>
                      ))}
                      
                      {categories.length > 5 && (
                        <button
                          onClick={() => setShowAllCategories(!showAllCategories)}
                          className="w-full text-sm text-purple-600 hover:text-purple-700 font-medium mt-2 py-1"
                        >
                          {showAllCategories ? 'הצג פחות' : `הצג הכל (${categories.length})`}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Brands Section */}
                <div>
                  <button
                    onClick={() => setIsBrandsExpanded(!isBrandsExpanded)}
                    className="w-full flex items-center justify-between mb-2 text-base font-semibold text-gray-800"
                  >
                    <span>מותגים</span>
                    <svg
                      className={`w-5 h-5 transition-transform ${isBrandsExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isBrandsExpanded && (
                    <div className="space-y-2">
                      {brands.slice(0, showAllBrands ? brands.length : 5).map((brand) => (
                        <label
                          key={brand.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-white/30 p-2 rounded-lg transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand.id)}
                            onChange={() => handleBrandToggle(brand.id)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 flex-shrink-0"
                          />
                          <span className="text-sm text-gray-700 flex-1">{brand.name}</span>
                        </label>
                      ))}
                      
                      {brands.length > 5 && (
                        <button
                          onClick={() => setShowAllBrands(!showAllBrands)}
                          className="w-full text-sm text-purple-600 hover:text-purple-700 font-medium mt-2 py-1"
                        >
                          {showAllBrands ? 'הצג פחות' : `הצג הכל (${brands.length})`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Shopping Cart Sidebar */}
      <>
        {/* Overlay */}
        {isCartOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={() => setIsCartOpen(false)}
          ></div>
        )}

        {/* Cart Sidebar */}
        <div className={`fixed left-0 top-0 h-full w-full sm:w-[480px] md:w-[520px] backdrop-blur-xl bg-white/95 border-r-2 border-white/40 z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          isCartOpen ? 'translate-x-0' : '-translate-x-full'
        }`} dir="rtl">
            <div className="flex flex-col h-full">
              {/* Cart Header - Fixed */}
              <div className="p-6 border-b border-gray-200/50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">העגלה שלך</h2>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="text-gray-600 hover:text-gray-800 text-3xl leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Cart Items - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🛒</div>
                    <p className="text-gray-600">העגלה שלך ריקה</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 flex flex-col items-center">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="bg-white/90 backdrop-blur-md rounded-3xl p-4 border-2 border-gray-200 hover:border-purple-300 hover:shadow-2xl transition-all w-full sm:w-[440px]"
                      >
                        <div className="flex items-start justify-between gap-4 mb-2 px-3">
                          <h4 className="font-semibold text-gray-900 text-base leading-snug flex-1 text-center truncate" title={item.product.name}>
                            {item.product.name}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="w-8 h-8 rounded-full bg-red-500/90 hover:bg-red-600 text-white flex items-center justify-center flex-shrink-0 transition-all shadow"
                            title="הסר פריט"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="grid grid-cols-[110px,48px,1fr] gap-3 items-stretch">
                          {/* Product Image */}
                          <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center min-h-[90px]">
                            {productImages[item.product.id] && productImages[item.product.id].length > 0 ? (
                              <img
                                src={productImages[item.product.id][0]}
                                alt={item.product.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const placeholder = (e.target as HTMLImageElement).parentElement;
                                  if (placeholder) {
                                    placeholder.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 text-3xl">📦</div>';
                                  }
                                }}
                              />
                            ) : (
                              <span className="text-3xl text-gray-400">📦</span>
                            )}
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex flex-col items-center justify-center gap-1.5 bg-gray-100/70 border border-gray-200 rounded-2xl px-2 py-2.5 min-h-[90px]">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-8 h-8 rounded-full border border-gray-300 bg-white hover:bg-gray-50 hover:border-purple-400 flex items-center justify-center font-semibold text-gray-600 hover:text-purple-600 transition-all text-sm"
                            >
                              +
                            </button>
                            <span className="font-semibold text-gray-900 text-sm w-10 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-8 h-8 rounded-full border border-gray-300 bg-white hover:bg-gray-50 hover:border-purple-400 flex items-center justify-center font-semibold text-gray-600 hover:text-purple-600 transition-all text-sm"
                            >
                              −
                            </button>
                          </div>

                          {/* Product Details */}
                          <div className="flex flex-col gap-2 min-w-0">
                            <div className="bg-gray-100/80 border border-gray-200 rounded-2xl px-3 py-2 text-center flex flex-col items-center justify-center min-h-[90px] h-full">
                              <span className="text-sm text-gray-600 whitespace-nowrap">
                                {formatPrice(item.product.price)} × {item.quantity}
                              </span>
                              <span className="text-lg font-bold text-purple-600 whitespace-nowrap">
                                {formatPrice(item.product.price * item.quantity)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total & Checkout - Sticky Bottom */}
              {cart.length > 0 && (
                <div className="border-t-2 border-gray-200/50 bg-white/95 backdrop-blur-xl p-6 flex-shrink-0">
                  {/* Total */}
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2.5 mb-4 border-2 border-purple-400/60 shadow-md">
                    <div className="flex items-center">
                      <span className="text-base font-semibold text-gray-800">
                        סה״כ: <span className="text-2xl font-bold text-purple-600">{formatPrice(getTotalPrice())}</span>
                      </span>
                      <div className="flex-1 flex justify-center">
                        <div className="w-px h-6 bg-purple-300/40"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        פריטים: <span className="font-bold">{getTotalItems()}</span>
                      </span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={() => {
                      // Allow checkout if we have managerId (public store) or orderId (order link)
                      if (!managerId && !orderId) {
                        alert('לא ניתן להמשיך לתשלום');
                        return;
                      }
                      setIsCheckoutOpen(true);
                      setIsCartOpen(false);
                    }}
                    className="w-full bg-purple-600 text-white font-bold py-4 rounded-xl hover:bg-purple-700 hover:shadow-2xl hover:scale-105 transition-all duration-200 shadow-lg"
                  >
                    המשך לתשלום
                  </button>
                </div>
              )}
            </div>
          </div>
      </>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          productImages={productImages[selectedProduct.id] || []}
          categories={categories}
          brands={brands}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
          currentQuantity={cart.find(item => item.product.id === selectedProduct.id)?.quantity || 0}
          getPendingQuantity={getPendingQuantity}
          updateQuantity={updateQuantity}
          inCart={!!cart.find(item => item.product.id === selectedProduct.id)}
        />
      )}

      {/* Checkout Flow */}
      {isCheckoutOpen && managerId && (
        <CheckoutFlow
          orderId={orderId || undefined}
          userId={managerId!}
          cart={cart}
          order={order}
          editOrder={editOrder}
          isEditMode={isEditMode}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={() => {
            setCart([]);
            // Clear cart from localStorage
            if (orderId) {
              localStorage.removeItem(`cart_${orderId}`);
            } else if (managerId) {
              localStorage.removeItem(`cart_${managerId}`);
            }
            // In edit mode, redirect to orders page after successful update
            if (isEditMode) {
              const userRole = localStorage.getItem('userRole');
              if (userRole === 'agent') {
                navigate('/agent/dashboard/orders');
              } else if (userRole === 'manager') {
                navigate('/dashboard/orders');
              }
            }
            // Keep checkout open to show success screen - no redirect (unless edit mode)
          }}
        />
      )}
    </div>
  );
}

