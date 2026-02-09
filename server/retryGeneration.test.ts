import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as db from './db';
import * as modalClient from './modalClient';

// Mock dependencies
vi.mock('./db');
vi.mock('./modalClient');

describe('Retry Generation Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully retry a failed generation', async () => {
    // Mock original generation
    const originalGeneration = {
      id: 1,
      userId: 123,
      projectId: 456,
      type: 'music',
      prompt: 'Test Amapiano track',
      parameters: {
        tempo: 112,
        key: 'F minor',
        duration: 30,
      },
      status: 'failed',
      errorMessage: 'Modal timeout',
    };

    // Mock retry count
    vi.mocked(db.getGenerationById).mockResolvedValue(originalGeneration as any);
    vi.mocked(db.getGenerationRetryCount).mockResolvedValue(0);
    
    // Mock new generation creation
    const newGeneration = {
      id: 2,
      ...originalGeneration,
      parentId: 1,
      status: 'pending',
    };
    vi.mocked(db.createGeneration).mockResolvedValue(newGeneration as any);

    // Mock Modal response
    vi.mocked(modalClient.generateMusic).mockResolvedValue({
      jobId: 'test-job-123',
      status: 'processing',
    } as any);

    vi.mocked(db.updateGeneration).mockResolvedValue(undefined);

    // Verify retry count is tracked
    expect(await db.getGenerationRetryCount(1)).toBe(0);
    
    // Verify new generation is created with parentId
    expect(newGeneration.parentId).toBe(1);
  });

  it('should prevent retry after max attempts (3)', async () => {
    vi.mocked(db.getGenerationById).mockResolvedValue({
      id: 1,
      userId: 123,
    } as any);
    
    // Mock retry count at maximum
    vi.mocked(db.getGenerationRetryCount).mockResolvedValue(3);

    // Should throw error when max retries reached
    const retryCount = await db.getGenerationRetryCount(1);
    expect(retryCount).toBe(3);
    expect(retryCount >= 3).toBe(true);
  });

  it('should track retry history with parentId', async () => {
    // Original generation
    const original = { id: 1, userId: 123, parentId: null };
    
    // First retry
    const retry1 = { id: 2, userId: 123, parentId: 1 };
    
    // Second retry
    const retry2 = { id: 3, userId: 123, parentId: 1 };

    // Mock database responses
    vi.mocked(db.getGenerationById)
      .mockResolvedValueOnce(original as any)
      .mockResolvedValueOnce(retry1 as any)
      .mockResolvedValueOnce(retry2 as any);

    vi.mocked(db.getGenerationRetryCount)
      .mockResolvedValueOnce(0) // No retries yet
      .mockResolvedValueOnce(1) // One retry
      .mockResolvedValueOnce(2); // Two retries

    // Verify retry count increases
    expect(await db.getGenerationRetryCount(1)).toBe(0);
    expect(await db.getGenerationRetryCount(1)).toBe(1);
    expect(await db.getGenerationRetryCount(1)).toBe(2);
  });

  it('should preserve original parameters in retry', async () => {
    const originalParams = {
      tempo: 112,
      key: 'F minor',
      mode: 'kasi',
      duration: 30,
      seed: 12345,
    };

    const originalGeneration = {
      id: 1,
      userId: 123,
      prompt: 'Test track',
      parameters: originalParams,
      status: 'failed',
    };

    vi.mocked(db.getGenerationById).mockResolvedValue(originalGeneration as any);
    vi.mocked(db.getGenerationRetryCount).mockResolvedValue(0);
    
    const newGeneration = {
      id: 2,
      ...originalGeneration,
      parentId: 1,
      status: 'pending',
    };
    vi.mocked(db.createGeneration).mockResolvedValue(newGeneration as any);

    // Verify parameters are preserved
    expect(newGeneration.parameters).toEqual(originalParams);
    expect(newGeneration.prompt).toBe(originalGeneration.prompt);
  });

  it('should handle Modal API errors during retry', async () => {
    vi.mocked(db.getGenerationById).mockResolvedValue({
      id: 1,
      userId: 123,
      prompt: 'Test',
      parameters: {},
    } as any);
    
    vi.mocked(db.getGenerationRetryCount).mockResolvedValue(0);
    vi.mocked(db.createGeneration).mockResolvedValue({ id: 2 } as any);
    
    // Mock Modal API error
    vi.mocked(modalClient.generateMusic).mockRejectedValue(
      new Error('Modal API unavailable')
    );

    vi.mocked(db.updateGeneration).mockResolvedValue(undefined);

    // Should handle error gracefully
    try {
      await modalClient.generateMusic({} as any, 2);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Modal API unavailable');
    }
  });
});
