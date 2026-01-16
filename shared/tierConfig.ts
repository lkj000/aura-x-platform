/**
 * Tier Configuration for Level 5 Autonomous Agent Architecture
 * Defines rate limiting and priority for different user tiers
 */

export type UserTier = 'free' | 'pro' | 'enterprise';

export interface TierConfig {
  maxConcurrentJobs: number;
  priority: number; // Higher number = higher priority in queue
  maxRetries: number;
  description: string;
  features: string[];
}

export const TIER_CONFIGS: Record<UserTier, TierConfig> = {
  free: {
    maxConcurrentJobs: 1,
    priority: 1,
    maxRetries: 3,
    description: 'Free Tier',
    features: [
      'Basic AI music generation',
      '1 concurrent job',
      'Standard queue priority',
      'Community support',
    ],
  },
  pro: {
    maxConcurrentJobs: 3,
    priority: 5,
    maxRetries: 5,
    description: 'Pro Tier',
    features: [
      'Advanced AI music generation',
      '3 concurrent jobs',
      'High queue priority',
      'Priority support',
      'Advanced features',
    ],
  },
  enterprise: {
    maxConcurrentJobs: 10,
    priority: 10,
    maxRetries: 10,
    description: 'Enterprise Tier',
    features: [
      'Unlimited AI music generation',
      '10 concurrent jobs',
      'Highest queue priority',
      'Dedicated support',
      'Custom workflows',
      'API access',
    ],
  },
};

/**
 * Get tier configuration for a user
 */
export function getTierConfig(tier: UserTier): TierConfig {
  return TIER_CONFIGS[tier];
}

/**
 * Get max concurrent jobs for a tier
 */
export function getMaxConcurrentJobs(tier: UserTier): number {
  return TIER_CONFIGS[tier].maxConcurrentJobs;
}

/**
 * Get priority for a tier
 */
export function getPriority(tier: UserTier): number {
  return TIER_CONFIGS[tier].priority;
}

/**
 * Get max retries for a tier
 */
export function getMaxRetries(tier: UserTier): number {
  return TIER_CONFIGS[tier].maxRetries;
}
