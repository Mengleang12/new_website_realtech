// Persistent storage for product visibility overrides and admin product caching.
// This ensures that when a product is hidden from frontend users, it remains visible
// in the Admin product list (under All and Hidden tabs) even if the backend public
// endpoints only return active/visible products.

import type { Product } from "./api";

const VISIBILITY_STORAGE_KEY = "admin_product_visibility_overrides";
const CACHED_ADMIN_PRODUCTS_KEY = "admin_all_known_products";

export interface ProductVisibilityOverrides {
  [productId: number]: boolean; // true = visible, false = hidden
}

/**
 * Retrieve the current map of product ID -> visibility boolean.
 */
export function getProductVisibilityOverrides(): ProductVisibilityOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(VISIBILITY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn("Failed to parse product visibility overrides:", err);
    return {};
  }
}

/**
 * Set an override for a product's visibility.
 */
export function setProductVisibilityOverride(productId: number, isVisible: boolean): void {
  if (typeof window === "undefined" || !productId) return;
  try {
    const current = getProductVisibilityOverrides();
    current[productId] = Boolean(isVisible);
    localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(current));

    // Also update any matching product in cached products
    const cached = getCachedAdminProducts();
    const updated = cached.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          is_visible: Boolean(isVisible),
          is_active: Boolean(isVisible),
        };
      }
      return p;
    });
    saveCachedAdminProducts(updated);
  } catch (err) {
    console.warn("Failed to set product visibility override:", err);
  }
}

/**
 * Remove an override (e.g. when product is deleted).
 */
export function removeProductVisibilityOverride(productId: number): void {
  if (typeof window === "undefined" || !productId) return;
  try {
    const current = getProductVisibilityOverrides();
    delete current[productId];
    localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(current));
    removeCachedAdminProduct(productId);
  } catch (err) {
    console.warn("Failed to remove product visibility override:", err);
  }
}

/**
 * Get cached products for admin view.
 */
export function getCachedAdminProducts(): Product[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CACHED_ADMIN_PRODUCTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save cached products for admin view.
 */
export function saveCachedAdminProducts(products: Product[]): void {
  if (typeof window === "undefined" || !Array.isArray(products)) return;
  try {
    // Keep max 200 items in local cache
    const slice = products.slice(0, 200);
    localStorage.setItem(CACHED_ADMIN_PRODUCTS_KEY, JSON.stringify(slice));
  } catch (err) {
    console.warn("Failed to save cached admin products:", err);
  }
}

/**
 * Remove a product from the cached admin products list.
 */
export function removeCachedAdminProduct(productId: number): void {
  if (typeof window === "undefined" || !productId) return;
  try {
    const cached = getCachedAdminProducts();
    const filtered = cached.filter(p => p.id !== productId);
    localStorage.setItem(CACHED_ADMIN_PRODUCTS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn("Failed to remove cached admin product:", err);
  }
}

/**
 * Merge API-returned products with local visibility overrides and cached hidden products.
 * If the API omitted hidden products (because public /api/products only returns active products),
 * this function restores them to the list so admin users NEVER lose them.
 */
export function syncProductsWithVisibilityStorage(incomingProducts: Product[]): Product[] {
  const overrides = getProductVisibilityOverrides();
  const cached = getCachedAdminProducts();

  // Create a map by product ID
  const map = new Map<number, Product>();

  // 1. Put cached products first
  for (const p of cached) {
    if (p && p.id) {
      const isOverridden = overrides[p.id] !== undefined;
      const isVisible = isOverridden ? overrides[p.id] : (p.is_visible ?? p.is_active ?? true);
      map.set(p.id, {
        ...p,
        is_visible: isVisible,
        is_active: isVisible,
      });
    }
  }

  // 2. Put incoming products (they take precedence for newer data, but respect overrides)
  for (const p of incomingProducts) {
    if (p && p.id) {
      const isOverridden = overrides[p.id] !== undefined;
      const isVisible = isOverridden ? overrides[p.id] : (p.is_visible ?? p.is_active ?? true);
      map.set(p.id, {
        ...p,
        is_visible: isVisible,
        is_active: isVisible,
      });
    }
  }

  const result = Array.from(map.values());
  saveCachedAdminProducts(result);
  return result;
}
