// Shared types for pages that need simplified interfaces
// Full interfaces are exported from api.ts, but pages sometimes need simplified versions

/**
 * Simplified Product interface for dropdowns and lists (e.g., in OverridesPage)
 */
export interface ProductListItem {
  id: string;
  name: string;
  specialPrice: number;
}

/**
 * ProductOverride interface (used in OverridesPage and CustomerOverridesPage)
 */
export interface ProductOverride {
  id: number;
  productId: string;
  customerId: string;
  overridePrice: number;
  originalPrice: number;
}

/**
 * Extended ProductOverride with userId (used in OverridesPage)
 */
export interface ProductOverrideWithUserId extends ProductOverride {
  userId: string;
}

/**
 * Simplified Customer interface for dropdowns (e.g., in OverridesPage)
 */
export interface CustomerListItem {
  id: string;
  name: string;
}

/**
 * Simplified Product interface for category counting (used in CategoriesPage)
 */
export interface ProductWithCategory {
  id: string;
  categoryId: number | null;
}

