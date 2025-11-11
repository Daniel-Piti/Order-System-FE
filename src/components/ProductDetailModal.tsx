import { useState, useEffect, useRef } from 'react';
import type { Product, Category, Brand } from '../services/api';
import { formatPrice } from '../utils/formatPrice';

interface ProductDetailModalProps {
  product: Product | null;
  productImages: string[];
  categories: Category[];
  brands: Brand[];
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (product: Product, quantity: number) => void;
  currentQuantity?: number;
  getPendingQuantity?: (productId: string) => number;
  updateQuantity?: (productId: string, quantity: number) => void;
  inCart?: boolean;
}

export default function ProductDetailModal({
  product,
  productImages,
  categories,
  brands,
  isOpen,
  onClose,
  onAddToCart,
  currentQuantity = 0,
  getPendingQuantity,
  updateQuantity,
  inCart = false,
}: ProductDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantityInput, setQuantityInput] = useState('1');
  const isUpdatingCartRef = useRef(false);

  useEffect(() => {
    // Only sync from props when product changes (initial mount or product switch)
    if (product && !isUpdatingCartRef.current) {
      if (currentQuantity > 0) {
        // Product is in cart - use currentQuantity
        setQuantityInput(currentQuantity.toString());
      } else if (getPendingQuantity) {
        // Product not in cart - use pending quantity
        const qty = getPendingQuantity(product.id) || 1;
        setQuantityInput(qty.toString());
      } else {
        // Default to 1
        setQuantityInput('1');
      }
    }
  }, [product?.id, isOpen]); // Only run when product ID changes or modal opens

  useEffect(() => {
    // Only sync from currentQuantity if it changed externally (not from our button click)
    // Skip if we're currently updating the cart to prevent reset loops
    if (!isUpdatingCartRef.current && inCart && currentQuantity > 0) {
      const inputValue = parseInt(quantityInput, 10) || 0;
      // Only update if cart quantity is different AND it's a meaningful change
      // This prevents resetting when user clicks Add button (which sets the same value)
      if (inputValue !== currentQuantity && currentQuantity > 0) {
        setQuantityInput(currentQuantity.toString());
      }
    }
    // Reset the flag after a short delay
    if (isUpdatingCartRef.current) {
      setTimeout(() => {
        isUpdatingCartRef.current = false;
      }, 100);
    }
  }, [currentQuantity]); // Only depend on currentQuantity, not inCart or quantityInput

  useEffect(() => {
    if (isOpen && productImages.length > 0) {
      setCurrentImageIndex(0);
    }
  }, [isOpen, productImages]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? productImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === productImages.length - 1 ? 0 : prev + 1));
  };

  const handleQuantityChange = (delta: number) => {
    const currentQty = parseInt(quantityInput, 10) || 1;
    const newQty = Math.max(1, Math.min(1000, currentQty + delta));
    setQuantityInput(newQty.toString());
    // Don't update cart - only update local state
  };

  const handleQuantityInputChange = (value: string) => {
    // Only allow digits
    const numericValue = value.replace(/[^0-9]/g, '');
    
    if (numericValue === '') {
      setQuantityInput('');
      return;
    }
    
    const numValue = parseInt(numericValue, 10);
    
    // Only allow numbers between 1 and 1000
    if (numValue > 0 && numValue <= 1000) {
      setQuantityInput(numericValue);
      // Don't update cart - only update local state
    } else if (numValue > 1000) {
      // If user types a number greater than 1000, cap it at 1000
      setQuantityInput('1000');
      // Don't update cart - only update local state
    }
  };

  const handleQuantityBlur = () => {
    // If input is empty or 0, set to 1
    if (!quantityInput || parseInt(quantityInput, 10) <= 0) {
      const defaultQty = 1;
      setQuantityInput(defaultQty.toString());
      // Don't update cart - only update local state
    }
  };

  const handleAddToCart = () => {
    const qty = parseInt(quantityInput, 10) || 1;
    
    // Set flag to prevent useEffect from resetting the input
    isUpdatingCartRef.current = true;
    
    // If product is already in cart (currentQuantity > 0), SET the quantity
    // Otherwise, add it to cart with the specified quantity
    if (currentQuantity > 0 && updateQuantity) {
      updateQuantity(product.id, qty);
    } else if (onAddToCart) {
      onAddToCart(product, qty);
    }
    
    // Reset flag after a short delay to allow cart to update
    setTimeout(() => {
      isUpdatingCartRef.current = false;
    }, 200);
  };

  const category = categories.find((c) => c.id === product.categoryId);
  const brand = brands.find((b) => b.id === product.brandId);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gradient-to-br from-black/40 via-black/50 to-black/40 backdrop-blur-xl z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="backdrop-blur-3xl bg-white/90 rounded-3xl shadow-2xl border-2 border-white/70 max-w-4xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto transform transition-all duration-300"
          style={{
            boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.8) inset, 0 1px 0 rgba(255, 255, 255, 0.9) inset',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md hover:bg-white transition-all shadow-lg flex items-center justify-center z-10 border border-white/60"
            style={{
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-5 md:p-6">
            <div className="grid md:grid-cols-2 gap-5 md:gap-6">
              {/* Left Side - Images */}
              <div className="flex flex-col h-full items-center justify-between gap-4">
                {/* Main Image */}
                <div className="relative w-full max-w-sm aspect-square bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl overflow-hidden border border-white/50 shadow-inner">
                  {productImages.length > 0 ? (
                    <>
                      <img
                        src={productImages[currentImageIndex]}
                        alt={product.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const placeholder = (e.target as HTMLImageElement).parentElement?.querySelector('.image-placeholder');
                          if (placeholder) {
                            (placeholder as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                      {productImages.length > 1 && (
                        <>
                          <button
                            onClick={handlePrevImage}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-all shadow-lg"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={handleNextImage}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-all shadow-lg"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                            <span className="px-2.5 py-1 text-xs font-semibold bg-black/60 text-white rounded-full backdrop-blur-sm">
                              {currentImageIndex + 1} / {productImages.length}
                            </span>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="image-placeholder w-full h-full flex items-center justify-center text-5xl opacity-40">
                      📦
                    </div>
                  )}
                </div>

                {/* Thumbnail Gallery */}
                {productImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 w-full max-w-sm justify-center pt-2">
                    {productImages.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          currentImageIndex === index
                            ? 'border-purple-600 ring-2 ring-purple-300 shadow-md'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Side - Details */}
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto pr-1 space-y-5">
                  {/* Category & Brand Badges */}
                  <div className="flex flex-wrap gap-2">
                    {category && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100/80 backdrop-blur-sm text-purple-700 border border-purple-200/50">
                        {category.category}
                      </span>
                    )}
                    {brand && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100/80 backdrop-blur-sm text-indigo-700 border border-indigo-200/50">
                        {brand.name}
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="space-y-1">
                    {product.price < product.minimumPrice ? (
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-3xl font-bold text-purple-600">
                          {formatPrice(product.price)}
                        </span>
                        <span className="text-base text-gray-400 line-through">
                          {formatPrice(product.minimumPrice)}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-red-100 text-red-700">
                          Save {formatPrice(product.minimumPrice - product.price)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-3xl font-bold text-purple-600">
                        {formatPrice(product.price)}
                      </span>
                    )}
                  </div>

                  {/* Product Name */}
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {product.name}
                  </h1>

                  {/* Description */}
                  {product.description && (
                    <div className="max-h-48 overflow-y-auto pr-1">
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {product.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Add to Cart Section */}
                {onAddToCart && (
                  <div className="mt-0 space-y-2 pt-1 border-t border-gray-200/40">
                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700">Quantity:</span>
                        <div className="flex items-center glass-button rounded-lg overflow-hidden border border-gray-300">
                          <button
                            onClick={() => handleQuantityChange(-1)}
                            className="px-3 py-2 hover:bg-white/80 transition-colors font-bold text-gray-700 text-sm"
                          >
                            −
                          </button>
                          <input
                            type="text"
                            value={quantityInput}
                            onChange={(e) => handleQuantityInputChange(e.target.value)}
                            onBlur={handleQuantityBlur}
                            className="w-16 px-2 py-2 font-bold text-gray-900 text-center text-sm border-x border-gray-300 focus:outline-none bg-transparent"
                            inputMode="numeric"
                            pattern="[1-9][0-9]*"
                            maxLength={4}
                          />
                          <button
                            onClick={() => handleQuantityChange(1)}
                            className="px-3 py-2 hover:bg-white/80 transition-colors font-bold text-gray-700 text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      {inCart && currentQuantity > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100/80 backdrop-blur-sm border border-green-200/50 ml-auto">
                          <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs font-bold text-green-700 whitespace-nowrap">
                            {currentQuantity} in cart
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleAddToCart}
                      className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 hover:shadow-xl hover:scale-105 transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>Add</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

