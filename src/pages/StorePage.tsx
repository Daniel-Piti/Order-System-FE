import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { publicAPI } from '../services/api';
import type { Product, Category, Brand, OrderPublic } from '../services/api';
import CheckoutFlow from '../components/CheckoutFlow';
import PaginationBar from '../components/PaginationBar';
import { formatPrice } from '../utils/formatPrice';

interface CartItem {
  product: Product;
  quantity: number;
}

export default function StorePage() {
  const { userId: userIdParam, orderId } = useParams<{ userId?: string; orderId?: string }>();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderPublic | null>(null);
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
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  
  // Track pending quantities for products not yet in cart
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
  
  // Track which products just got added (for success animation)
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());

  // Fetch userId from order if orderId is provided, otherwise use userIdParam
  useEffect(() => {
    const fetchUserId = async () => {
      setError('');
      
      if (userIdParam) {
        setUserId(userIdParam);
        // Don't set loading to false here - fetchProducts will handle loading state
      } else if (orderId) {
        try {
          setIsLoading(true);
          const fetchedOrder = await publicAPI.orders.getById(orderId);
          setOrder(fetchedOrder);
          setUserId(fetchedOrder.userId);
          // Don't set loading to false here - fetchProducts will handle loading state
        } catch (err: any) {
          console.error('Error fetching order:', err);
          setError('Failed to load order');
          setIsLoading(false);
        }
      } else {
        // No userId or orderId in URL - invalid route
        setError('Invalid store URL');
        setIsLoading(false);
      }
    };
    fetchUserId();
  }, [userIdParam, orderId]);

  const fetchCategories = useCallback(async () => {
    if (!userId) return;
    
    try {
      const data = await publicAPI.categories.getAllByUserId(userId);
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, [userId]);

  const fetchBrands = useCallback(async () => {
    if (!userId) return;
    
    try {
      const data = await publicAPI.brands.getAllByUserId(userId);
      setBrands(data);
    } catch (err) {
      console.error('Failed to fetch brands:', err);
    }
  }, [userId]);

  const fetchProducts = useCallback(async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      // If orderId exists, use order-specific endpoint (with price overrides) - returns all products
      // Otherwise use regular store endpoint with pagination
      if (orderId) {
        const allProducts = await publicAPI.products.getAllByOrderId(orderId);
        
        // Filter by category client-side if selected
        let filteredProducts = allProducts;
        if (selectedCategory) {
          filteredProducts = filteredProducts.filter(p => p.categoryId === Number(selectedCategory));
        }
        if (selectedBrand) {
          filteredProducts = filteredProducts.filter(p => p.brandId === Number(selectedBrand));
        }
        
        // Sort client-side
        let sortedProducts = [...filteredProducts];
        if (sortBy === 'name') {
          sortedProducts.sort((a, b) => {
            const comparison = a.name.localeCompare(b.name);
            return sortDirection === 'ASC' ? comparison : -comparison;
          });
        } else if (sortBy === 'specialPrice') {
          sortedProducts.sort((a, b) => {
            const comparison = a.specialPrice - b.specialPrice;
            return sortDirection === 'ASC' ? comparison : -comparison;
          });
        } else if (sortBy === 'originalPrice') {
          sortedProducts.sort((a, b) => {
            const comparison = a.originalPrice - b.originalPrice;
            return sortDirection === 'ASC' ? comparison : -comparison;
          });
        }
        
        // Paginate client-side
        const startIndex = currentPage * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedProducts = sortedProducts.slice(startIndex, endIndex);
        
        setProducts(paginatedProducts);
        setTotalPages(Math.ceil(sortedProducts.length / pageSize));
        setTotalElements(sortedProducts.length);
        
        // Fetch images for products
        await fetchProductImagesForAll(paginatedProducts);
      } else {
        // Regular store - use paginated endpoint
        const pageResponse = await publicAPI.products.getAllByUserId(
          userId,
          currentPage,
          pageSize,
          sortBy,
          sortDirection,
          selectedCategory ? Number(selectedCategory) : undefined,
          selectedBrand ? Number(selectedBrand) : undefined
        );
        
        setProducts(pageResponse.content);
        setTotalPages(pageResponse.totalPages);
        setTotalElements(pageResponse.totalElements);
        
        // Fetch images for products
        await fetchProductImagesForAll(pageResponse.content);
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
  }, [userId, orderId, currentPage, pageSize, sortBy, sortDirection, selectedCategory, selectedBrand]);

  const fetchProductImagesForAll = async (productsList: Product[]) => {
    if (!userId || productsList.length === 0) return;
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
      const imagePromises = productsList.map(async (product) => {
        try {
          const response = await fetch(`${API_BASE_URL}/public/products/user/${userId}/product/${product.id}/images`);
          if (response.ok) {
            const images: Array<{ id: number; url: string; fileName: string }> = await response.json();
            return { productId: product.id, imageUrls: images.map(img => img.url) };
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
    if (userId) {
      fetchProducts();
      fetchCategories();
      fetchBrands();
    }
  }, [userId, fetchProducts, fetchCategories, fetchBrands]);

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

  const handleCategoryFilterChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(0); // Reset to first page when category changes
  };

  const handleBrandFilterChange = (brandId: string) => {
    setSelectedBrand(brandId);
    setCurrentPage(0); // Reset to first page when brand changes
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
    return cart.reduce((total, item) => total + (item.product.specialPrice * item.quantity), 0);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
        <div className="glass-card rounded-3xl p-8 md:p-12 max-w-2xl w-full text-center">
          <div className="text-6xl mb-6">⏰</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Link Expired</h1>
          <p className="text-lg text-gray-600">
            This order link has expired. Please contact the seller for a new link or check your order status.
          </p>
        </div>
      </div>
    );
  }

  if (isLinkCancelled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
        <div className="glass-card rounded-3xl p-8 md:p-12 max-w-2xl w-full text-center">
          <div className="text-6xl mb-6">🚫</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Order Cancelled</h1>
          <p className="text-lg text-gray-600">
            This order has been cancelled. Please contact the seller if you have any questions or need assistance.
          </p>
        </div>
      </div>
    );
  }

  if (isOrderDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
        <div className="glass-card rounded-3xl p-8 md:p-12 max-w-2xl w-full text-center">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Order Already Done</h1>
          <p className="text-lg text-gray-600">
            This order has already been completed.
          </p>
        </div>
      </div>
    );
  }

  if (isOrderPlaced) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
        <div className="glass-card rounded-3xl p-8 md:p-12 max-w-2xl w-full text-center">
          <div className="text-6xl mb-6">📋</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Order Already Placed</h1>
          <p className="text-lg text-gray-600">
            This order has already been placed.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="glass-card p-8 rounded-3xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    let emoji = '😕';
    let title = 'Oops!';
    let message = 'Something went wrong';
    
    if (error === 'STORE_NOT_FOUND') {
      emoji = '🏪';
      title = 'Store Not Found';
      message = 'This store doesn\'t exist or has been removed. Please check the link and try again.';
    } else if (error === 'STORE_NOT_ACCESSIBLE') {
      emoji = '🔒';
      title = 'Store Not Accessible';
      message = 'This store is currently not accessible. Please contact the store owner.';
    } else if (error === 'STORE_ERROR') {
      emoji = '😕';
      title = 'Unable to Load Store';
      message = 'We\'re having trouble loading this store. Please try again later.';
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-4">
        <div className="glass-card p-12 rounded-3xl max-w-lg text-center">
          <div className="text-8xl mb-6">{emoji}</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">{title}</h2>
          <p className="text-lg text-gray-600 mb-6">{message}</p>
          <button
            onClick={() => window.location.reload()}
            className="glass-button px-6 py-3 rounded-xl font-semibold text-gray-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-white/40 border-b-2 border-white/40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">🛍️</div>
              <div>
                <h1 className="text-2xl font-bold text-purple-600">
                  Our Store
                </h1>
                <p className="text-sm text-gray-600">Browse our products</p>
              </div>
            </div>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(!isCartOpen)}
              className="relative glass-button px-6 py-3 rounded-2xl font-semibold text-gray-800 flex items-center space-x-2"
            >
              <span className="text-2xl">🛒</span>
              <span>Cart</span>
              {getTotalItems() > 0 && (
                          <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs font-bold rounded-full h-7 w-7 flex items-center justify-center shadow-lg">
                  {getTotalItems()}
                </span>
              )}
            </button>
          </div>

          {/* Filters and Controls Bar */}
          <div className="mt-4 flex flex-wrap gap-2 sm:gap-3 items-center">
            {/* Category */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryFilterChange(e.target.value)}
                className="glass-select px-2 sm:px-4 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold text-gray-800 cursor-pointer min-w-[100px] sm:min-w-[140px]"
              >
                <option value="">All</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.category}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Brand:</span>
              <select
                value={selectedBrand}
                onChange={(e) => handleBrandFilterChange(e.target.value)}
                className="glass-select px-2 sm:px-4 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold text-gray-800 cursor-pointer min-w-[100px] sm:min-w-[140px]"
              >
                <option value="">All</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Sort:</span>
              <button
                onClick={() => handleSortChange('name')}
                className={`px-2 sm:px-4 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1 ${
                  sortBy === 'name'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'glass-button text-gray-800 hover:shadow-md'
                }`}
              >
                <span>Name</span>
                {sortBy === 'name' && (
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className={`px-2 sm:px-4 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1 ${
                  sortBy === 'specialPrice'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'glass-button text-gray-800 hover:shadow-md'
                }`}
              >
                <span>Price</span>
                {sortBy === 'specialPrice' && (
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {sortDirection === 'ASC' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    )}
                  </svg>
                )}
              </button>
            </div>

            {/* Show */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="glass-select px-2 sm:px-4 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold text-gray-800 cursor-pointer w-16 sm:w-20"
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
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        {filteredProducts.length === 0 ? (
          <div className="glass-card p-12 rounded-3xl text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Products Found</h3>
            <p className="text-gray-600">
              {selectedCategory || selectedBrand
                ? 'Try adjusting your filters'
                : 'Check back later for new products!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const cartItem = cart.find(item => item.product.id === product.id);
              const inCart = !!cartItem;
              const showSuccess = justAdded.has(product.id);

              return (
                <div
                  key={product.id}
                  className="glass-card rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 group border border-gray-200/50 flex flex-col"
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
                        {categories.find(c => c.id === product.categoryId)?.category || 'Category'}
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
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2 min-h-[2rem]">
                      {product.description || ''}
                    </p>

                                {/* Price */}
                                <div className="mb-2">
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

                    {/* Quantity and Add to Cart */}
                    <div className="flex items-center gap-1.5 mt-auto">
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
                              Add
                            </span>
                            <span className={`absolute top-0 left-0 right-0 transition-opacity duration-300 ${
                              showSuccess ? 'opacity-100' : 'opacity-0'
                            }`}>
                              Added!
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
          maxWidth="max-w-6xl"
          sidebarOffset={false}
          showCondition={totalPages > 0}
        />
      </main>

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
        <div className={`fixed right-0 top-0 h-full w-full sm:w-96 backdrop-blur-xl bg-white/95 border-l-2 border-white/40 z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
            <div className="flex flex-col h-full">
              {/* Cart Header - Fixed */}
              <div className="p-6 border-b border-gray-200/50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">Your Cart</h2>
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
                    <p className="text-gray-600">Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border-2 border-gray-300/60 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-4">
                          {/* Product Image */}
                          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                            {productImages[item.product.id] && productImages[item.product.id].length > 0 ? (
                              <img
                                src={productImages[item.product.id][0]}
                                alt={item.product.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const placeholder = (e.target as HTMLImageElement).parentElement;
                                  if (placeholder) {
                                    placeholder.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 text-2xl">📦</div>';
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">📦</div>
                            )}
                          </div>
                          
                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900 text-base leading-tight">
                                {item.product.name}
                              </h4>
                              <button
                                onClick={() => removeFromCart(item.product.id)}
                                className="w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center flex-shrink-0 transition-colors ml-2"
                                title="Remove"
                              >
                                <span className="text-white text-xs font-bold leading-none">×</span>
                              </button>
                            </div>
                            <p className="text-sm text-gray-500 mb-2">
                              {formatPrice(item.product.specialPrice)} each
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                  className="w-7 h-7 rounded-md border border-gray-300 bg-white hover:bg-gray-50 hover:border-purple-400 flex items-center justify-center font-semibold text-gray-600 hover:text-purple-600 transition-all text-sm"
                                >
                                  −
                                </button>
                                <span className="font-semibold text-gray-900 w-8 text-center">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                  className="w-7 h-7 rounded-md border border-gray-300 bg-white hover:bg-gray-50 hover:border-purple-400 flex items-center justify-center font-semibold text-gray-600 hover:text-purple-600 transition-all text-sm"
                                >
                                  +
                                </button>
                              </div>
                              <p className="text-lg font-bold text-purple-600">
                                {formatPrice(item.product.specialPrice * item.quantity)}
                              </p>
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
                        Total: <span className="text-2xl font-bold text-purple-600">{formatPrice(getTotalPrice())}</span>
                      </span>
                      <div className="flex-1 flex justify-center">
                        <div className="w-px h-6 bg-purple-300/40"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        Items: <span className="font-bold">{getTotalItems()}</span>
                      </span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={() => {
                      if (!orderId) {
                        alert('Please use an order link to place an order');
                        return;
                      }
                      setIsCheckoutOpen(true);
                      setIsCartOpen(false);
                    }}
                    className="w-full bg-purple-600 text-white font-bold py-4 rounded-xl hover:bg-purple-700 hover:shadow-2xl hover:scale-105 transition-all duration-200 shadow-lg"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              )}
            </div>
          </div>
      </>

      {/* Checkout Flow */}
      {isCheckoutOpen && orderId && (
        <CheckoutFlow
          orderId={orderId}
          userId={userId || ''}
          cart={cart}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={() => {
            setCart([]);
            // Keep checkout open to show success screen - no redirect
          }}
        />
      )}
    </div>
  );
}

