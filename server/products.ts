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

/**
 * Tier Subscription Products
 * Level 5 Autonomous Agent Architecture - Tier Pricing
 */
export const TIER_PRODUCTS = {
  pro: {
    name: 'AURA-X Pro',
    description: 'Professional music production with enhanced AI generation capabilities',
    priceId: process.env.STRIPE_PRICE_PRO || 'price_pro_monthly',
    amount: 2900, // $29.00 USD
    currency: 'usd',
    interval: 'month',
    features: [
      '3 concurrent AI generations',
      'Priority queue processing',
      'Advanced cultural analysis',
      'Stem separation included',
      'Commercial license',
      'Priority support',
    ],
  },
  enterprise: {
    name: 'AURA-X Enterprise',
    description: 'Enterprise-grade music production with unlimited AI generation',
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_monthly',
    amount: 9900, // $99.00 USD
    currency: 'usd',
    interval: 'month',
    features: [
      '10 concurrent AI generations',
      'Highest priority queue',
      'Advanced cultural analysis',
      'Unlimited stem separation',
      'Commercial license',
      'Dedicated support',
      'API access',
      'Custom model training',
    ],
  },
} as const;

export type TierProductKey = keyof typeof TIER_PRODUCTS;

/**
 * Get Stripe price ID for a tier
 */
export function getStripePriceId(tier: 'pro' | 'enterprise'): string {
  return TIER_PRODUCTS[tier].priceId;
}

/**
 * Get tier from Stripe price ID
 */
export function getTierFromPriceId(priceId: string): 'pro' | 'enterprise' | null {
  for (const [tier, product] of Object.entries(TIER_PRODUCTS)) {
    if (product.priceId === priceId) {
      return tier as 'pro' | 'enterprise';
    }
  }
  return null;
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}
