import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicAPI } from '../services/api';
import type { Product, Category } from '../services/api';

interface CartItem {
  product: Product;
  quantity: number;
}

export default function StorePage() {
  const { userId: userIdParam, orderId } = useParams<{ userId?: string; orderId?: string }>();
  const navigate = useNavigate();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
  const [totalElements, setTotalElements] = useState(0);
  
  // Sorting state
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
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
          const order = await publicAPI.orders.getById(orderId);
          setUserId(order.userId);
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
          filteredProducts = allProducts.filter(p => p.categoryId === Number(selectedCategory));
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
          selectedCategory ? Number(selectedCategory) : undefined
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
  }, [userId, orderId, currentPage, pageSize, sortBy, sortDirection, selectedCategory]);

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
    }
  }, [userId, fetchProducts, fetchCategories]);

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

  // Client-side search filtering (only filters current page)
  const filteredProducts = (products || []).filter(product => {
    if (searchQuery.trim()) {
      return product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return true;
  });

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
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
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
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full h-7 w-7 flex items-center justify-center shadow-lg">
                  {getTotalItems()}
                </span>
              )}
            </button>
          </div>

          {/* Order Context Banner */}
          {orderId && (
            <div className="mt-4 mb-2 p-3 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 rounded-xl">
              <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                <span>🎯</span>
                Viewing products for this order - Prices shown are customer-specific
              </p>
            </div>
          )}

          {/* Filters and Controls Bar */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Category */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryFilterChange(e.target.value)}
                className="glass-select px-4 py-3 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer min-w-[140px]"
              >
                <option value="">All</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.category}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Sort:</span>
              <button
                onClick={() => handleSortChange('name')}
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center space-x-1 ${
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
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center space-x-1 ${
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
            </div>

            {/* Show */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="glass-select px-4 py-3 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-20"
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredProducts.length === 0 ? (
          <div className="glass-card p-12 rounded-3xl text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Products Found</h3>
            <p className="text-gray-600">
              {searchQuery || selectedCategory
                ? 'Try adjusting your filters'
                : 'Check back later for new products!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
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
                      <div className="absolute top-2 right-2 backdrop-blur-xl bg-green-500/90 px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-lg flex items-center gap-1">
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
                          <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            ${product.specialPrice.toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            ${product.originalPrice.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xl font-bold text-gray-900">
                          ${product.specialPrice.toFixed(2)}
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
                        className="flex-1 font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-xl hover:scale-105 transition-transform duration-200 text-sm"
                      >
                        {/* Purple background (always there) */}
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 transition-opacity duration-500"></div>
                        
                        {/* Green success overlay */}
                        <div 
                          className={`absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 transition-opacity duration-500 ${
                            showSuccess ? 'opacity-100' : 'opacity-0'
                          }`}
                        ></div>

                        {/* Content */}
                        <div className="relative z-10 flex items-center justify-center gap-1.5">
                          {/* Icon Container */}
                          <div className="relative w-4 h-4 flex items-center justify-center">
                            {/* Add Icon */}
                            <svg 
                              className={`w-4 h-4 absolute transition-all duration-300 ${
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
                              className={`w-4 h-4 absolute transition-all duration-300 ${
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
                          <div className="relative inline-block min-w-[3rem]">
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
        {totalPages > 0 && (
          <div className="mt-8 glass-card rounded-3xl p-6">
            <div className="flex flex-col items-center gap-4">
              {/* Page Navigation */}
              <div className="flex items-center justify-center gap-1 flex-wrap">
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

              {/* Page Info */}
              <div className="text-sm text-gray-600 font-medium text-center">
                Showing <span className="font-semibold text-gray-800">{currentPage * pageSize + 1}</span> to{' '}
                <span className="font-semibold text-gray-800">
                  {Math.min((currentPage + 1) * pageSize, totalElements)}
                </span>{' '}
                of <span className="font-semibold text-gray-800">{totalElements}</span> products
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Shopping Cart Sidebar */}
      {isCartOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setIsCartOpen(false)}
          ></div>

          {/* Cart Sidebar */}
          <div className="fixed right-0 top-0 h-full w-full sm:w-96 glass-card border-l-2 border-white/40 z-50 shadow-2xl overflow-y-auto">
            <div className="p-6">
              {/* Cart Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Your Cart</h2>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-gray-600 hover:text-gray-800 text-3xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Cart Items */}
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🛒</div>
                  <p className="text-gray-600">Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="glass-button rounded-2xl p-4"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {/* Placeholder for future product images */}
                            {false ? (
                              <img
                                src=""
                                alt={item.product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-2xl">📦</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-800 truncate">
                              {item.product.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              ${item.product.specialPrice.toFixed(2)} × {item.quantity}
                            </p>
                            <p className="text-lg font-bold text-purple-600 mt-1">
                              ${(item.product.specialPrice * item.quantity).toFixed(2)}
                            </p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-red-500 hover:text-red-700 text-xl font-bold"
                          >
                            ×
                          </button>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-center space-x-3 mt-3">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-lg bg-white/50 hover:bg-white/80 flex items-center justify-center font-bold transition-colors"
                          >
                            −
                          </button>
                          <span className="font-bold text-lg w-12 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-lg bg-white/50 hover:bg-white/80 flex items-center justify-center font-bold transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="glass-card rounded-2xl p-6 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Items</span>
                      <span className="font-semibold">{getTotalItems()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t-2 border-white/40">
                      <span className="text-xl font-bold text-gray-800">Total</span>
                      <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        ${getTotalPrice().toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={() => {
                      alert('Checkout functionality coming soon! 🚀');
                      // TODO: Implement checkout
                    }}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
                  >
                    Proceed to Checkout
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

