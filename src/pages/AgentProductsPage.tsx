import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentAPI, publicAPI } from '../services/api';
import type { Product, Category, Brand } from '../services/api';
import PaginationBar from '../components/PaginationBar';
import { formatPrice } from '../utils/formatPrice';

const PAGE_SIZE_OPTIONS = [8, 12, 20] as const;

interface ProductImage {
  id: number;
  productId: string;
  managerId: string;
  url: string;
  fileName: string;
  mimeType: string;
}

type SortDirection = 'ASC' | 'DESC';

export default function AgentProductsPage() {
  const [managerId, setManagerId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [productImages, setProductImages] = useState<Record<string, string[]>>({});
  const [productImageIndices, setProductImageIndices] = useState<Record<string, number>>({});
  const [productPrevImageIndices, setProductPrevImageIndices] = useState<Record<string, number | null>>({});
  const [productImageDirections, setProductImageDirections] = useState<Record<string, 'next' | 'prev'>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(PAGE_SIZE_OPTIONS[1]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [sortDirection, setSortDirection] = useState<SortDirection>('ASC');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const agent = await agentAPI.getCurrentAgent();
        setManagerId(agent.managerId);
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          navigate('/login/agent');
        } else {
          setError(err?.response?.data?.userMessage || err?.message || 'נכשל בטעינת פרטי הסוכן');
        }
      }
    };

    fetchAgent();
  }, [navigate]);

  useEffect(() => {
    if (!managerId) return;

    const fetchMetadata = async () => {
      try {
        const [categoryData, brandData] = await Promise.all([
          publicAPI.categories.getAllByManagerId(managerId),
          publicAPI.brands.getAllByManagerId(managerId),
        ]);
        setCategories(categoryData);
        setBrands(brandData);
      } catch (err: any) {
        console.error('Failed to load categories or brands for agent view:', err);
      }
    };

    fetchMetadata();
  }, [managerId]);

  useEffect(() => {
    if (!managerId) return;
    fetchProducts(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managerId, currentPage, pageSize, sortDirection, selectedCategory, selectedBrand]);

  useEffect(() => {
    setCurrentPage(0);
  }, [pageSize, sortDirection, selectedCategory, selectedBrand]);

  const fetchProducts = async (page: number = 0) => {
    if (!managerId) return;

    try {
      setIsLoading(true);
      setError('');

      const pageResponse = await publicAPI.products.getAllByManagerId(
        managerId,
        page,
        pageSize,
        'name',
        sortDirection,
        selectedCategory ? Number(selectedCategory) : undefined,
        selectedBrand ? Number(selectedBrand) : undefined
      );

      setProducts(pageResponse.content);
      setTotalPages(pageResponse.totalPages);
      setTotalElements(pageResponse.totalElements);

      await fetchProductImagesForAll(pageResponse.content);
    } catch (err: any) {
      console.error('Failed to load products for agent view:', err);
      setError(err?.response?.data?.userMessage || err?.message || 'נכשל בטעינת מוצרים');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProductImagesForAll = async (productList: Product[]) => {
    if (!managerId || productList.length === 0) {
      setProductImages({});
      return;
    }

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

    const imagePromises = productList.map(async (product) => {
      try {
        const response = await fetch(`${API_BASE_URL}/public/products/manager/${managerId}/product/${product.id}/images`);
        if (!response.ok) {
          return { productId: product.id, images: [] as ProductImage[] };
        }
        const images: ProductImage[] = await response.json();
        const sortedImages = images.sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' }));
        return { productId: product.id, images: sortedImages };
      } catch (err) {
        console.error(`Failed to fetch images for product ${product.id}`, err);
        return { productId: product.id, images: [] as ProductImage[] };
      }
    });

    const results = await Promise.all(imagePromises);

    const imageMap: Record<string, string[]> = {};
    const indexMap: Record<string, number> = {};
    const prevIndexMap: Record<string, number | null> = {};

    results.forEach(({ productId, images }) => {
      imageMap[productId] = images.map((image) => image.url);
      indexMap[productId] = 0;
      prevIndexMap[productId] = null;
    });

    setProductImages(imageMap);
    setProductImageIndices(indexMap);
    setProductPrevImageIndices(prevIndexMap);
    setProductImageDirections({});
  };

  const schedulePrevReset = (productId: string) => {
    window.setTimeout(() => {
      setProductPrevImageIndices((prev) => ({ ...prev, [productId]: null }));
    }, 250);
  };

  const handlePrevProductImage = (productId: string, images: string[]) => {
    const currentIndex = productImageIndices[productId] || 0;
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    setProductPrevImageIndices((prev) => ({ ...prev, [productId]: currentIndex }));
    setProductImageDirections((prev) => ({ ...prev, [productId]: 'prev' }));
    setProductImageIndices((prev) => ({ ...prev, [productId]: newIndex }));
    schedulePrevReset(productId);
  };

  const handleNextProductImage = (productId: string, images: string[]) => {
    const currentIndex = productImageIndices[productId] || 0;
    const newIndex = (currentIndex + 1) % images.length;
    setProductPrevImageIndices((prev) => ({ ...prev, [productId]: currentIndex }));
    setProductImageDirections((prev) => ({ ...prev, [productId]: 'next' }));
    setProductImageIndices((prev) => ({ ...prev, [productId]: newIndex }));
    schedulePrevReset(productId);
  };

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
  };

  const handleSortToggle = () => {
    setSortDirection((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => {
      const haystack = [product.name, product.description, product.brandName ?? '', product.categoryName ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [products, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24" dir="rtl">
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 leading-tight">מוצרים</h1>
            <p className="text-gray-600 text-sm mt-2">
              מציג {filteredProducts.length} מתוך {totalElements} מוצרים זמינים עבורך.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-600" dir="rtl">הצג:</span>
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="glass-select pl-3 pr-8 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-24"
                dir="ltr"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-600" dir="rtl">מיין:</span>
              <button
                type="button"
                onClick={handleSortToggle}
                className="glass-select bg-none pl-4 pr-3 py-2 rounded-xl text-sm font-semibold text-gray-800 flex items-center justify-center gap-2 min-w-[88px]"
                style={{ backgroundImage: 'none' }}
                dir="ltr"
              >
                <span>{sortDirection === 'ASC' ? 'א ← ת' : 'א → ת'}</span>
                <svg
                  className={`w-4 h-4 text-sky-600 transition-transform duration-200 ${sortDirection === 'ASC' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-600" dir="rtl">קטגוריה:</span>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="glass-select pl-8 pr-4 py-2 rounded-xl text-sm text-gray-800 cursor-pointer w-36"
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

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-600" dir="rtl">מותג:</span>
              <select
                value={selectedBrand}
                onChange={(event) => setSelectedBrand(event.target.value)}
                className="glass-select pl-8 pr-4 py-2 rounded-xl text-sm text-gray-800 cursor-pointer w-36"
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
          </div>

          <div className="relative w-full xl:w-80">
            <label className="sr-only" htmlFor="agent-products-search">חפש מוצרים</label>
            <input
              id="agent-products-search"
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="חפש לפי שם, תיאור או מותג..."
              maxLength={100}
              className="glass-input w-full pr-10 pl-4 py-2.5 rounded-xl text-sm text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
              dir="rtl"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103 10.5a7.5 7.5 0 0013.65 6.15z" />
            </svg>
          </div>
        </div>
      </div>

      {error ? (
        <div className="glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-.01 4a9 9 0 110-18 9 9 0 010 18z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">נכשל בטעינת מוצרים</h2>
            <p className="text-gray-600">{error}</p>
          </div>
          <button
            onClick={() => fetchProducts(currentPage)}
            className="glass-button px-6 py-2 rounded-xl font-medium text-gray-800 hover:bg-white/40 border border-sky-200 hover:border-sky-300 transition-colors"
          >
            נסה שוב
          </button>
        </div>
      ) : isLoading ? (
        <div className="glass-card rounded-3xl p-10 flex flex-col items-center justify-center space-y-4 text-center">
          <svg className="animate-spin h-10 w-10 text-sky-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-600 font-medium">... טוען מוצרים</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-6 rounded-full bg-indigo-100/60">
            <svg className="w-14 h-14 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">אין מוצרים התואמים למסננים שלך</h2>
          <p className="text-gray-600 max-w-md">
            נסה להתאים את המסננים שלך או לנקות את החיפוש כדי לראות עוד מוצרים.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setSelectedCategory('');
                setSelectedBrand('');
                setSearchQuery('');
              }}
              className="glass-button px-6 py-2 rounded-xl font-semibold text-gray-800 hover:bg-white/40 border border-sky-200 hover:border-sky-300 transition-colors"
            >
              נקה מסננים
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {filteredProducts.map((product) => {
            const images = productImages[product.id] || [];
            const currentImageIndex = productImageIndices[product.id] || 0;
            const previousImageIndex = productPrevImageIndices[product.id];
            const direction = productImageDirections[product.id];
            return (
              <div key={product.id} className="glass-card rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 group border border-gray-200/50 flex flex-col">
                <div className="relative h-32 bg-gradient-to-br from-purple-100 to-pink-100 overflow-hidden flex-shrink-0 group/image">
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
                        onError={(event) => {
                          (event.target as HTMLImageElement).style.display = 'none';
                          const placeholder = (event.target as HTMLImageElement).parentElement?.querySelector('.image-placeholder');
                          if (placeholder) {
                            (placeholder as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />

                      {images.length > 1 && (
                        <>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handlePrevProductImage(product.id, images);
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover/image:opacity-100 transition-opacity backdrop-blur-sm z-10"
                            title="תמונה קודמת"
                            type="button"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleNextProductImage(product.id, images);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover/image:opacity-100 transition-opacity backdrop-blur-sm z-10"
                            title="תמונה הבאה"
                            type="button"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="image-placeholder w-full h-full flex items-center justify-center text-4xl opacity-40">
                      📦
                    </div>
                  )}

                  {images.length > 1 && (
                    <div className="absolute bottom-2 left-2">
                      <span className="px-2 py-1 text-xs font-semibold bg-black/60 text-white rounded-full backdrop-blur-sm">
                        {currentImageIndex + 1} / {images.length}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-3 flex flex-col flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-600 mb-1 whitespace-pre-line line-clamp-2">{product.description || ''}</p>

                  <div className="pb-1">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-xl font-bold text-purple-600">
                        {formatPrice(product.price)}
                      </span>
                      {product.price > product.minimumPrice && (
                        <span className="text-xs text-gray-400">
                          מינימום {formatPrice(product.minimumPrice)}
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

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        maxWidth="max-w-6xl"
        showCondition={!isLoading && totalPages > 1}
        rtl={true}
      />
    </div>
  );
}


