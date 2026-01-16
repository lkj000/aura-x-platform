/**
 * Stripe Product Definitions
 * 
 * This file centralizes all product and price configurations for the marketplace.
 * Sample packs are created dynamically, but this file serves as a reference
 * for product structure and metadata.
 */

export interface MarketplaceProduct {
  name: string;
  description: string;
  price: number; // in USD
  category: string;
  metadata?: Record<string, string>;
}

/**
 * Create Stripe product metadata for a sample pack
 */
export function createPackMetadata(pack: {
  id: number;
  title: string;
  category: string;
  sellerId: number;
}): Record<string, string> {
  return {
    pack_id: pack.id.toString(),
    pack_title: pack.title,
    category: pack.category,
    seller_id: pack.sellerId.toString(),
    product_type: 'sample_pack',
  };
}

/**
 * Validate pack price meets Stripe minimum
 */
export function validatePackPrice(price: number): { valid: boolean; error?: string } {
  const MIN_PRICE = 0.50; // Stripe minimum in USD
  
  if (price < MIN_PRICE) {
    return {
      valid: false,
      error: `Price must be at least $${MIN_PRICE} USD (Stripe minimum)`,
    };
  }
  
  return { valid: true };
}
