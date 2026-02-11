import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getQueuePosition, getQueueStats } from './queueManager';
import * as db from './db';

// Mock the database module
vi.mock('./db');

describe('Queue Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getQueuePosition', () => {
    it('should return completed status for completed generation', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{
          id: 1,
          status: 'completed',
          createdAt: new Date(),
        }]),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const result = await getQueuePosition(1);

      expect(result.status).toBe('completed');
      expect(result.position).toBe(0);
      expect(result.totalInQueue).toBe(0);
      expect(result.estimatedWaitTime).toBe(0);
    });

    it('should return processing status with estimated remaining time', async () => {
      const createdAt = new Date(Date.now() - 30000); // 30 seconds ago
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{
          id: 1,
          status: 'processing',
          createdAt,
        }]),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const result = await getQueuePosition(1);

      expect(result.status).toBe('processing');
      expect(result.position).toBe(1);
      expect(result.totalInQueue).toBe(1);
      expect(result.estimatedWaitTime).toBeLessThanOrEqual(30); // Should be ~30 seconds remaining
    });

    it('should calculate correct queue position for pending generation', async () => {
      const targetCreatedAt = new Date(Date.now() - 10000);
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn()
          .mockResolvedValueOnce([{ id: 1, status: 'pending', createdAt: targetCreatedAt }]) // Target generation
          .mockResolvedValueOnce([{ count: 2 }]) // 2 generations before this one
          .mockResolvedValueOnce([{ count: 5 }]), // 5 total pending
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const result = await getQueuePosition(1);

      expect(result.status).toBe('queued');
      expect(result.position).toBe(3); // 2 before + 1 = position 3
      expect(result.totalInQueue).toBe(5);
      expect(result.estimatedWaitTime).toBe(120); // (3-1) * 60 = 120 seconds
    });

    it('should throw error if generation not found', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      await expect(getQueuePosition(999)).rejects.toThrow('Generation not found');
    });
  });

  describe('getQueueStats', () => {
    it('should return correct queue statistics', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn()
          .mockResolvedValueOnce([{ count: 5 }]) // 5 pending
          .mockResolvedValueOnce([{ count: 2 }]), // 2 processing
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const result = await getQueueStats();

      expect(result.totalPending).toBe(5);
      expect(result.totalProcessing).toBe(2);
      expect(result.avgWaitTime).toBe(300); // 5 * 60 = 300 seconds
    });

    it('should handle empty queue', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn()
          .mockResolvedValueOnce([{ count: 0 }]) // 0 pending
          .mockResolvedValueOnce([{ count: 0 }]), // 0 processing
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const result = await getQueueStats();

      expect(result.totalPending).toBe(0);
      expect(result.totalProcessing).toBe(0);
      expect(result.avgWaitTime).toBe(0);
    });
  });
});
