import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicAPI } from '../services/api';
import type { Product, Category } from '../services/api';

interface CartItem {
  product: Product;
  quantity: number;
}

export default function StorePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
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
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Track pending quantities for products not yet in cart
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
  
  // Track which products just got added (for success animation)
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userId) {
      fetchProducts();
      fetchCategories();
    }
  }, [userId, currentPage, pageSize, sortBy, sortDirection, selectedCategory]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError('');
      const pageResponse = await publicAPI.products.getAllByUserId(
        userId!,
        currentPage,
        pageSize,
        sortBy,
        sortDirection,
        selectedCategory || undefined
      );
      setProducts(pageResponse.content);
      setTotalPages(pageResponse.totalPages);
      setTotalElements(pageResponse.totalElements);
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
  };

  const fetchCategories = async () => {
    try {
      const data = await publicAPI.categories.getAllByUserId(userId!);
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

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
                <option value="none">None</option>
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
                  <div className="relative h-32 bg-gradient-to-br from-purple-100 to-pink-100 overflow-hidden flex-shrink-0">
                    {product.pictureUrl ? (
                      <img
                        src={product.pictureUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl opacity-40">
                        📦
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
                            {item.product.pictureUrl ? (
                              <img
                                src={item.product.pictureUrl}
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

