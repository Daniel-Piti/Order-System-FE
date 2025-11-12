// Shared types for pages that need simplified interfaces
// Full interfaces are exported from api.ts, but pages sometimes need simplified versions

/**
 * Simplified Product interface for dropdowns and lists (e.g., in OverridesPage)
 */
export interface ProductListItem {
  id: string;
  name: string;
  price: number;
  minimumPrice: number;
}

/**
 * ProductOverride interface (used in OverridesPage)
 */
export interface ProductOverride {
  id: number;
  productId: string;
  managerId: string;
  agentId: number | null;
  customerId: string;
  overridePrice: number;
}

/**
 * Extended ProductOverride including base product price (used in OverridesPage)
 */
export interface ProductOverrideWithPrice extends ProductOverride {
  productPrice: number;
  productMinimumPrice: number;
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

/**
 * Simplified Product interface for brand counting (used in BrandsPage)
 */
export interface ProductWithBrand {
  id: string;
  brandId: number | null;
}

