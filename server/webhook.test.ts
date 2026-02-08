import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';
import * as modalClient from './modalClient';

/**
 * Test webhook pattern implementation for async music generation
 * 
 * This test validates:
 * 1. generate.music mutation creates generation record and returns immediately (without calling Modal)
 * 2. generate.webhook public endpoint updates generation status
 * 3. generate.getJobStatus returns current generation status
 */

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: 'test-webhook-user',
    email: 'webhook@test.com',
    name: 'Test Webhook User',
    loginMethod: 'manus',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };
}

describe('Webhook Pattern Implementation', () => {
  let generationId: number;

  beforeEach(() => {
    // Mock Modal client to return immediately without calling API
    vi.spyOn(modalClient, 'generateMusic').mockResolvedValue({
      jobId: 'mock-job-123',
      status: 'pending',
    });
  });

  it('should create generation and return job ID immediately', async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.generate.music({
      prompt: 'Test Amapiano track for webhook pattern',
      parameters: {
        duration: 10,
        tempo: 112,
        key: 'F min',
      },
    });

    expect(result).toHaveProperty('generationId');
    expect(result).toHaveProperty('jobId');
    expect(result.status).toBe('processing');
    expect(modalClient.generateMusic).toHaveBeenCalled();
    
    generationId = result.generationId;
    console.log('[Test] Created generation:', generationId);
  });

  it('should update generation status via webhook', async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const webhookResult = await caller.generate.webhook({
      generationId,
      jobId: `modal-${generationId}`,
      status: 'completed',
      audioUrl: 'https://aura-x-audio-generation.s3.amazonaws.com/test.wav',
      culturalScore: 85,
      processingTime: 120000,
    });

    expect(webhookResult.success).toBe(true);
    console.log('[Test] Webhook callback successful');
  });

  it('should return updated status via getJobStatus', async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const status = await caller.generate.getJobStatus({
      generationId,
    });

    expect(status.status).toBe('completed');
    expect(status.audioUrl).toBe('https://aura-x-audio-generation.s3.amazonaws.com/test.wav');
    expect(status.culturalScore).toBe(85);
    expect(status.processingTime).toBe(120000);
    console.log('[Test] Job status retrieved successfully');
  });

  it('should handle webhook failure scenario', async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create another generation
    const result = await caller.generate.music({
      prompt: 'Test failure scenario',
      parameters: { duration: 10 },
    });

    const failedGenerationId = result.generationId;
    console.log('[Test] Created generation for failure test:', failedGenerationId);

    // Simulate webhook failure callback
    const publicCtx = createPublicContext();
    const publicCaller = appRouter.createCaller(publicCtx);

    await publicCaller.generate.webhook({
      generationId: failedGenerationId,
      jobId: `modal-${failedGenerationId}`,
      status: 'failed',
      error: 'Modal GPU timeout',
    });

    // Check status
    const status = await caller.generate.getJobStatus({
      generationId: failedGenerationId,
    });

    expect(status.status).toBe('failed');
    expect(status.errorMessage).toBe('Modal GPU timeout');
    console.log('[Test] Failure scenario handled correctly');
  });
});
