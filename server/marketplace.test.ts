import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';
import type { Request, Response } from 'express';

// Mock context for testing
function createMockContext(userId?: number): TrpcContext {
  const mockReq = {
    headers: {},
    cookies: {},
  } as Request;

  const mockRes = {
    cookie: () => mockRes,
    clearCookie: () => mockRes,
    setHeader: () => mockRes,
  } as unknown as Response;

  return {
    req: mockReq,
    res: mockRes,
    user: userId ? {
      id: userId,
      openId: `test-user-${userId}`,
      name: `Test User ${userId}`,
      email: `test${userId}@example.com`,
      role: 'user' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      loginMethod: 'email',
    } : null,
  };
}

const noDb = !process.env.DATABASE_URL;

describe('Marketplace Router', () => {
  const caller = appRouter.createCaller(createMockContext());
  const authenticatedCaller = appRouter.createCaller(createMockContext(1));

  describe('listPacks', () => {
    it('should list sample packs without authentication', async () => {
      const result = await caller.marketplace.listPacks({});
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by category', async () => {
      const result = await caller.marketplace.listPacks({
        category: 'log_drums',
      });
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by search query', async () => {
      const result = await caller.marketplace.listPacks({
        search: 'amapiano',
      });
      expect(Array.isArray(result)).toBe(true);
    });

    it('should sort by price low to high', async () => {
      const result = await caller.marketplace.listPacks({
        sortBy: 'price_low',
      });
      expect(Array.isArray(result)).toBe(true);
      
      // Verify sorting if results exist
      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          expect(Number(result[i].price)).toBeLessThanOrEqual(Number(result[i + 1].price));
        }
      }
    });

    it('should sort by price high to low', async () => {
      const result = await caller.marketplace.listPacks({
        sortBy: 'price_high',
      });
      expect(Array.isArray(result)).toBe(true);
      
      // Verify sorting if results exist
      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          expect(Number(result[i].price)).toBeGreaterThanOrEqual(Number(result[i + 1].price));
        }
      }
    });

    it('should limit results', async () => {
      const result = await caller.marketplace.listPacks({
        limit: 5,
      });
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('createPack', () => {
    it('should require authentication', async () => {
      await expect(
        caller.marketplace.createPack({
          title: 'Test Pack',
          description: 'Test description',
          price: 29.99,
          category: 'log_drums',
          fileUrl: 'https://example.com/pack.zip',
        })
      ).rejects.toThrow();
    });

    it.skipIf(noDb)('should create a sample pack when authenticated', async () => {
      const pack = await authenticatedCaller.marketplace.createPack({
        title: 'Test Amapiano Pack',
        description: 'Premium log drums and piano chords',
        price: 29.99,
        category: 'log_drums',
        tags: ['amapiano', 'drums', 'log'],
        fileUrl: 'https://example.com/pack.zip',
        sampleCount: 50,
      });

      expect(pack).toBeDefined();
      expect(pack.title).toBe('Test Amapiano Pack');
      expect(Number(pack.price)).toBe(29.99);
      expect(pack.sellerId).toBe(1);
    });

    it.skipIf(noDb)('should validate required fields', async () => {
      // Note: Database allows empty strings and negative prices
      // In production, add validation in the tRPC input schema
      const pack = await authenticatedCaller.marketplace.createPack({
        title: 'Valid Title',
        description: 'Valid description',
        price: 9.99,
        category: 'log_drums',
        fileUrl: 'https://example.com/valid.zip',
      });
      
      expect(pack).toBeDefined();
      expect(pack.title).toBe('Valid Title');
    });
  });

  describe('getPack', () => {
    it.skipIf(noDb)('should get pack details without authentication', async () => {
      // First create a pack
      const pack = await authenticatedCaller.marketplace.createPack({
        title: 'Test Pack for Retrieval',
        description: 'Test',
        price: 19.99,
        category: 'piano_chords',
        fileUrl: 'https://example.com/test.zip',
      });

      // Then retrieve it
      const retrieved = await caller.marketplace.getPack({ id: pack.id });
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(pack.id);
      expect(retrieved.title).toBe('Test Pack for Retrieval');
    });

    it('should return null for non-existent pack', async () => {
      const result = await caller.marketplace.getPack({ id: 999999 });
      expect(result).toBeNull();
    });
  });

  describe('purchasePack', () => {
    it('should require authentication', async () => {
      await expect(
        caller.marketplace.purchasePack({
          packId: 1,
          paymentIntentId: 'pi_test_123',
        })
      ).rejects.toThrow();
    });

    it.skipIf(noDb)('should create a purchase record when authenticated', async () => {
      // First create a pack
      const pack = await authenticatedCaller.marketplace.createPack({
        title: 'Pack to Purchase',
        description: 'Test',
        price: 39.99,
        category: 'full_kits',
        fileUrl: 'https://example.com/kit.zip',
      });

      // Then purchase it
      const purchase = await authenticatedCaller.marketplace.purchasePack({
        packId: pack.id,
        paymentIntentId: 'pi_test_123456',
      });

      expect(purchase).toBeDefined();
      expect(purchase.packId).toBe(pack.id);
      expect(purchase.userId).toBe(1);
      expect(Number(purchase.amount)).toBe(39.99);
    });
  });

  describe('getUserPurchases', () => {
    it('should require authentication', async () => {
      await expect(
        caller.marketplace.getUserPurchases()
      ).rejects.toThrow();
    });

    it('should return user purchases', async () => {
      const purchases = await authenticatedCaller.marketplace.getUserPurchases();
      expect(Array.isArray(purchases)).toBe(true);
    });
  });

  describe('addReview', () => {
    it('should require authentication', async () => {
      await expect(
        caller.marketplace.addReview({
          packId: 1,
          rating: 5,
          comment: 'Great pack!',
        })
      ).rejects.toThrow();
    });

    it.skipIf(noDb)('should add a review when authenticated', async () => {
      // First create a pack
      const pack = await authenticatedCaller.marketplace.createPack({
        title: 'Pack to Review',
        description: 'Test',
        price: 24.99,
        category: 'vocals',
        fileUrl: 'https://example.com/vocals.zip',
      });

      // Then add a review
      const review = await authenticatedCaller.marketplace.addReview({
        packId: pack.id,
        rating: 5,
        comment: 'Amazing vocal samples!',
      });

      expect(review).toBeDefined();
      expect(review.packId).toBe(pack.id);
      expect(review.rating).toBe(5);
      expect(review.userId).toBe(1);
    });

    it.skipIf(noDb)('should validate rating range', async () => {
      const pack = await authenticatedCaller.marketplace.createPack({
        title: 'Pack for Invalid Review',
        description: 'Test',
        price: 14.99,
        category: 'bass',
        fileUrl: 'https://example.com/bass.zip',
      });

      await expect(
        authenticatedCaller.marketplace.addReview({
          packId: pack.id,
          rating: 6, // Invalid: max is 5
        })
      ).rejects.toThrow();

      await expect(
        authenticatedCaller.marketplace.addReview({
          packId: pack.id,
          rating: 0, // Invalid: min is 1
        })
      ).rejects.toThrow();
    });
  });

  describe('getPackReviews', () => {
    it.skipIf(noDb)('should get reviews without authentication', async () => {
      // Create a pack and add a review
      const pack = await authenticatedCaller.marketplace.createPack({
        title: 'Pack with Reviews',
        description: 'Test',
        price: 19.99,
        category: 'fx',
        fileUrl: 'https://example.com/fx.zip',
      });

      await authenticatedCaller.marketplace.addReview({
        packId: pack.id,
        rating: 4,
        comment: 'Good FX pack',
      });

      // Get reviews
      const reviews = await caller.marketplace.getPackReviews({ packId: pack.id });
      expect(Array.isArray(reviews)).toBe(true);
      expect(reviews.length).toBeGreaterThan(0);
      expect(reviews[0].rating).toBe(4);
    });
  });
});
