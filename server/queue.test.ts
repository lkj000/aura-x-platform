import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as queueDb from './queueDb';
import { getDb } from './db';
import { users, userQueueStats, generationQueue } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Integration Tests for Queue Management System
 * Level 5 Autonomous Agent Architecture
 * 
 * Tests cover:
 * - Queue enqueue/dequeue operations
 * - Tier-based rate limiting
 * - Priority queue ordering
 * - Concurrent job tracking
 * - Queue analytics
 */

describe.skip('Queue Management System', () => {
  let testUserId: number;
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeEach(async () => {
    db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create test user
    const [user] = await db.insert(users).values({
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      tier: 'free',
      role: 'user',
    });
    testUserId = user.insertId;

    // Initialize queue stats
    await db.insert(userQueueStats).values({
      userId: testUserId,
      concurrentJobs: 0,
      maxConcurrentJobs: 1, // Free tier default
      totalJobsQueued: 0,
      totalJobsCompleted: 0,
      totalJobsFailed: 0,
    });
  });

  afterEach(async () => {
    if (!db) return;

    // Cleanup test data
    await db.delete(generationQueue).where(eq(generationQueue.userId, testUserId));
    await db.delete(userQueueStats).where(eq(userQueueStats.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe('enqueueGeneration', () => {
    it('should enqueue generation with correct priority based on tier', async () => {
      const queueId = await queueDb.enqueueGeneration({
        userId: testUserId,
        generationId: 1,
        tier: 'free',
      });

      expect(queueId).toBeGreaterThan(0);

      const [queueItem] = await db!
        .select()
        .from(generationQueue)
        .where(eq(generationQueue.id, queueId));

      expect(queueItem).toBeDefined();
      expect(queueItem.userId).toBe(testUserId);
      expect(queueItem.generationId).toBe(1);
      expect(queueItem.priority).toBe(1); // Free tier priority
      expect(queueItem.status).toBe('queued');
    });

    it('should set higher priority for pro tier', async () => {
      // Update user to pro tier
      await db!.update(users).set({ tier: 'pro' }).where(eq(users.id, testUserId));

      const queueId = await queueDb.enqueueGeneration({
        userId: testUserId,
        generationId: 1,
        tier: 'pro',
      });

      const [queueItem] = await db!
        .select()
        .from(generationQueue)
        .where(eq(generationQueue.id, queueId));

      expect(queueItem.priority).toBe(5); // Pro tier priority
    });

    it('should set highest priority for enterprise tier', async () => {
      // Update user to enterprise tier
      await db!.update(users).set({ tier: 'enterprise' }).where(eq(users.id, testUserId));

      const queueId = await queueDb.enqueueGeneration({
        userId: testUserId,
        generationId: 1,
        tier: 'enterprise',
      });

      const [queueItem] = await db!
        .select()
        .from(generationQueue)
        .where(eq(generationQueue.id, queueId));

      expect(queueItem.priority).toBe(10); // Enterprise tier priority
    });

    it('should increment totalJobsQueued counter', async () => {
      const [statsBefore] = await db!
        .select()
        .from(userQueueStats)
        .where(eq(userQueueStats.userId, testUserId));

      await queueDb.enqueueGeneration({
        userId: testUserId,
        generationId: 1,
        tier: 'free',
      });

      const [statsAfter] = await db!
        .select()
        .from(userQueueStats)
        .where(eq(userQueueStats.userId, testUserId));

      expect(statsAfter.totalJobsQueued).toBe(statsBefore.totalJobsQueued + 1);
    });
  });

  describe('canUserQueueJob', () => {
    it('should allow job if under concurrent limit (free tier)', async () => {
      const canQueue = await queueDb.canUserQueueJob(testUserId);
      expect(canQueue).toBe(true);
    });

    it('should block job if at concurrent limit (free tier)', async () => {
      // Enqueue one job (free tier limit is 1)
      await queueDb.enqueueGeneration({
        userId: testUserId,
        generationId: 1,
        tier: 'free',
      });

      // Start the job (increment concurrentJobs)
      await queueDb.startQueuedGeneration(testUserId, 1);

      const canQueue = await queueDb.canUserQueueJob(testUserId);
      expect(canQueue).toBe(false);
    });

    it('should allow multiple jobs for pro tier', async () => {
      // Update to pro tier (limit: 3)
      await db!.update(users).set({ tier: 'pro' }).where(eq(users.id, testUserId));
      await db!
        .update(userQueueStats)
        .set({ maxConcurrentJobs: 3 })
        .where(eq(userQueueStats.userId, testUserId));

      // Enqueue and start 2 jobs
      for (let i = 1; i <= 2; i++) {
        await queueDb.enqueueGeneration({
          userId: testUserId,
          generationId: i,
          tier: 'pro',
        });
        await queueDb.startQueuedGeneration(testUserId, i);
      }

      // Should still be able to queue one more
      const canQueue = await queueDb.canUserQueueJob(testUserId);
      expect(canQueue).toBe(true);
    });
  });

  describe('getUserConcurrentJobs', () => {
    it('should return 0 for new user', async () => {
      const count = await queueDb.getUserConcurrentJobs(testUserId);
      expect(count).toBe(0);
    });

    it('should return correct count after starting jobs', async () => {
      // Enqueue and start 2 jobs
      for (let i = 1; i <= 2; i++) {
        await queueDb.enqueueGeneration({
          userId: testUserId,
          generationId: i,
          tier: 'free',
        });
        await queueDb.startQueuedGeneration(testUserId, i);
      }

      const count = await queueDb.getUserConcurrentJobs(testUserId);
      expect(count).toBe(2);
    });

    it('should decrement after completing job', async () => {
      // Enqueue and start job
      const queueId = await queueDb.enqueueGeneration({
        userId: testUserId,
        generationId: 1,
        tier: 'free',
      });
      await queueDb.startQueuedGeneration(testUserId, 1);

      const countBefore = await queueDb.getUserConcurrentJobs(testUserId);
      expect(countBefore).toBe(1);

      // Complete job
      await queueDb.completeQueuedGeneration(queueId);

      const countAfter = await queueDb.getUserConcurrentJobs(testUserId);
      expect(countAfter).toBe(0);
    });
  });

  describe('getUserQueuePosition', () => {
    it('should return null for non-existent generation', async () => {
      const position = await queueDb.getUserQueuePosition(testUserId, 999);
      expect(position).toBeNull();
    });

    it('should return correct position in queue', async () => {
      // Enqueue 3 jobs
      for (let i = 1; i <= 3; i++) {
        await queueDb.enqueueGeneration({
          userId: testUserId,
          generationId: i,
          tier: 'free',
        });
      }

      // Check position of second job
      const position = await queueDb.getUserQueuePosition(testUserId, 2);
      expect(position).toBe(2);
    });

    it('should return null for processing job', async () => {
      const queueId = await queueDb.enqueueGeneration({
        userId: testUserId,
        generationId: 1,
        tier: 'free',
      });

      // Start the job
      await queueDb.startQueuedGeneration(testUserId, 1);

      const position = await queueDb.getUserQueuePosition(testUserId, 1);
      expect(position).toBeNull();
    });
  });

  describe('getQueueAnalytics', () => {
    it('should return correct analytics', async () => {
      // Create test scenario:
      // - 2 queued jobs
      // - 1 processing job
      for (let i = 1; i <= 3; i++) {
        await queueDb.enqueueGeneration({
          userId: testUserId,
          generationId: i,
          tier: 'free',
        });
      }

      // Start one job
      await queueDb.startQueuedGeneration(testUserId, 1);

      const analytics = await queueDb.getQueueAnalytics();

      expect(analytics.queuedCount).toBe(2);
      expect(analytics.processingCount).toBe(1);
      expect(analytics.avgWaitTime).toBeGreaterThanOrEqual(0);
    });

    it('should return zero for empty queue', async () => {
      const analytics = await queueDb.getQueueAnalytics();

      expect(analytics.queuedCount).toBe(0);
      expect(analytics.processingCount).toBe(0);
      expect(analytics.avgWaitTime).toBe(0);
    });
  });

  describe('Priority Queue Ordering', () => {
    it('should process higher priority jobs first', async () => {
      // Create users with different tiers
      const [freeUser] = await db!.insert(users).values({
        email: 'free@example.com',
        name: 'Free User',
        tier: 'free',
        role: 'user',
      });

      const [proUser] = await db!.insert(users).values({
        email: 'pro@example.com',
        name: 'Pro User',
        tier: 'pro',
        role: 'user',
      });

      // Enqueue jobs in reverse priority order
      await queueDb.enqueueGeneration({
        userId: freeUser.insertId,
        generationId: 1,
        tier: 'free',
      });

      await queueDb.enqueueGeneration({
        userId: proUser.insertId,
        generationId: 2,
        tier: 'pro',
      });

      // Get next job (should be pro tier)
      const nextJob = await queueDb.getNextQueuedGeneration();

      expect(nextJob).toBeDefined();
      expect(nextJob!.generationId).toBe(2); // Pro job should be first
      expect(nextJob!.priority).toBe(5);

      // Cleanup
      await db!.delete(users).where(eq(users.id, freeUser.insertId));
      await db!.delete(users).where(eq(users.id, proUser.insertId));
    });
  });

  describe.skip('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Try to enqueue with invalid user ID
      await expect(
        queueDb.enqueueGeneration({
          userId: 999999,
          generationId: 1,
          tier: 'free',
        })
      ).rejects.toThrow();
    });

    it('should handle concurrent job limit edge cases', async () => {
      // Set maxConcurrentJobs to 0 (edge case)
      await db!
        .update(userQueueStats)
        .set({ maxConcurrentJobs: 0 })
        .where(eq(userQueueStats.userId, testUserId));

      const canQueue = await queueDb.canUserQueueJob(testUserId);
      expect(canQueue).toBe(false);
    });
  });
});
