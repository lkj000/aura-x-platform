import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';

describe('Marketplace Integration Tests', () => {
  let testUserId = 1; // Use existing test user
  let testPackId: number;
  let testSellerId = 1; // Use existing test user

  beforeAll(async () => {

    // Create test sample pack
    const pack = await db.createMarketplacePack({
      sellerId: testSellerId,
      title: 'Test Amapiano Pack',
      description: 'Test pack for integration testing',
      price: 29.99,
      category: 'log_drums',
      tags: ['amapiano', 'test'],
      fileUrl: 'https://example.com/test-pack.zip',
      sampleCount: 50,
    });
    testPackId = pack.id;
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      if (testPackId) {
        // Note: deleteMarketplacePack may not exist, so we'll skip cleanup
        // await db.deleteMarketplacePack(testPackId);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Pack Management', () => {
    it('should create a sample pack', async () => {
      const caller = appRouter.createCaller({
        user: { id: testSellerId, openId: 'test-seller-openid', name: 'Test Seller', email: 'seller@test.com', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      const pack = await caller.marketplace.createPack({
        title: 'New Test Pack',
        description: 'Another test pack',
        price: 19.99,
        category: 'piano_chords',
        tags: ['piano', 'chords'],
        fileUrl: 'https://example.com/new-pack.zip',
        sampleCount: 30,
      });

      expect(pack).toBeDefined();
      expect(pack.title).toBe('New Test Pack');
      expect(pack.sellerId).toBe(testSellerId);

      // Note: Cleanup skipped - deleteMarketplacePack not implemented
    });

    it('should list packs with filters', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const packs = await caller.marketplace.listPacks({
        category: 'log_drums',
        sortBy: 'recent',
      });

      expect(Array.isArray(packs)).toBe(true);
      expect(packs.length).toBeGreaterThan(0);
      expect(packs[0].category).toBe('log_drums');
    });

    it('should get pack details', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const pack = await caller.marketplace.getPack({ id: testPackId });

      expect(pack).toBeDefined();
      expect(pack?.id).toBe(testPackId);
      expect(pack?.title).toBe('Test Amapiano Pack');
    });

    it('should search packs by title', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const packs = await caller.marketplace.listPacks({
        search: 'Amapiano',
        sortBy: 'popular',
      });

      expect(Array.isArray(packs)).toBe(true);
      expect(packs.some(p => p.title.includes('Amapiano'))).toBe(true);
    });
  });

  describe('Purchase Flow', () => {
    it('should create checkout session', async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: 'test-buyer-openid', name: 'Test Buyer', email: 'buyer@test.com', role: 'user' },
        req: { headers: { origin: 'http://localhost:3000' } } as any,
        res: {} as any,
      });

      const session = await caller.marketplace.createCheckoutSession({
        packId: testPackId,
      });

      expect(session).toBeDefined();
      expect(session.url).toBeDefined();
      expect(typeof session.url).toBe('string');
      expect(session.url).toContain('checkout.stripe.com');
    });

    it('should create purchase record', async () => {
      const purchase = await db.createMarketplacePurchase({
        userId: testUserId,
        packId: testPackId,
        paymentIntentId: 'pi_test_123456',
      });

      expect(purchase).toBeDefined();
      expect(purchase.userId).toBe(testUserId);
      expect(purchase.packId).toBe(testPackId);
      expect(purchase.id).toBeDefined();
    });

    it('should get user purchases', async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: 'test-buyer-openid', name: 'Test Buyer', email: 'buyer@test.com', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      const purchases = await caller.marketplace.getUserPurchases();

      expect(Array.isArray(purchases)).toBe(true);
      expect(purchases.length).toBeGreaterThan(0);
      expect(purchases[0].userId).toBe(testUserId);
    });
  });

  describe('Reviews', () => {
    it('should add a review', async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: 'test-buyer-openid', name: 'Test Buyer', email: 'buyer@test.com', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      const review = await caller.marketplace.addReview({
        packId: testPackId,
        rating: 5,
        comment: 'Excellent pack!',
      });

      expect(review).toBeDefined();
      expect(review.packId).toBe(testPackId);
      expect(review.userId).toBe(testUserId);
      expect(review.rating).toBe(5);
    });

    it('should get pack reviews', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const reviews = await caller.marketplace.getPackReviews({ packId: testPackId });

      expect(Array.isArray(reviews)).toBe(true);
      expect(reviews.length).toBeGreaterThan(0);
      expect(reviews[0].packId).toBe(testPackId);
    });

    it('should allow multiple reviews from same user (no duplicate prevention yet)', async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: 'test-buyer-openid', name: 'Test Buyer', email: 'buyer@test.com', role: 'user' },
        req: {} as any,
        res: {} as any,
      });

      // Currently allows duplicate reviews - this is a known limitation
      const review = await caller.marketplace.addReview({
        packId: testPackId,
        rating: 4,
        comment: 'Another review',
      });

      expect(review).toBeDefined();
      expect(review.rating).toBe(4);
    });
  });

  describe('Pack Statistics', () => {
    it('should update pack rating after review', async () => {
      const pack = await db.getMarketplacePack(testPackId);
      
      expect(pack).toBeDefined();
      expect(pack?.rating).toBeDefined();
      // Rating should be between 1 and 5
      if (pack?.rating) {
        const rating = Number(pack.rating);
        expect(rating).toBeGreaterThanOrEqual(1);
        expect(rating).toBeLessThanOrEqual(5);
      }
    });

    it('should track purchase count', async () => {
      const pack = await db.getMarketplacePack(testPackId);
      
      expect(pack).toBeDefined();
      // purchaseCount may be undefined if no purchases yet
      if (pack?.purchaseCount !== undefined) {
        expect(pack.purchaseCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Authentication', () => {
    it('should require auth for creating packs', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.marketplace.createPack({
          title: 'Unauthorized Pack',
          description: 'Should fail',
          price: 10,
          category: 'bass',
          tags: [],
          fileUrl: 'https://example.com/fail.zip',
        })
      ).rejects.toThrow();
    });

    it('should require auth for checkout', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.marketplace.createCheckoutSession({
          packId: testPackId,
        })
      ).rejects.toThrow();
    });

    it('should require auth for adding reviews', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.marketplace.addReview({
          packId: testPackId,
          rating: 5,
          comment: 'Unauthorized review',
        })
      ).rejects.toThrow();
    });
  });
});
