import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';
import * as modalClient from './modalClient';

/**
 * Test webhook pattern implementation for async music generation.
 *
 * Validates:
 *   1. generate.music creates a generation record and returns immediately
 *   2. generate.webhook updates generation status (completion / failure)
 *   3. generate.getJobStatus returns the current generation status
 *
 * The DB layer is mocked so these tests run without DATABASE_URL.
 * The Modal client is mocked so no real API calls are made.
 */

// ── Stateful in-memory DB mock ────────────────────────────────────────────────
// Mirrors the subset of db.ts that generation.ts uses.

let nextId = 1;
const store = new Map<number, Record<string, any>>();

vi.mock('./db', () => {
  return {
    createGeneration: vi.fn(async (data: Record<string, any>) => {
      const id = nextId++;
      const row = {
        id,
        status: 'pending',
        resultUrl: null,
        errorMessage: null,
        culturalScore: null,
        processingTime: null,
        workflowId: null,
        completedAt: null,
        ...data,
      };
      store.set(id, row);
      return row;
    }),
    updateGeneration: vi.fn(async (id: number, updates: Record<string, any>) => {
      const existing = store.get(id) ?? { id };
      store.set(id, { ...existing, ...updates });
    }),
    getGenerationById: vi.fn(async (id: number) => store.get(id) ?? null),
    // Stub remaining barrel exports that the router may touch
    getUserGenerations: vi.fn(async () => []),
    createGenerationHistory: vi.fn(async (data: any) => ({ id: nextId++, ...data })),
    getUserGenerationHistory: vi.fn(async () => []),
    getGenerationHistoryById: vi.fn(async () => null),
    updateGenerationHistory: vi.fn(async () => {}),
    toggleGenerationHistoryFavorite: vi.fn(async () => {}),
    deleteGenerationHistory: vi.fn(async () => {}),
    setGenerationRating: vi.fn(async () => {}),
    upsertGoldStandard: vi.fn(async (p: any) => ({
      id: nextId++,
      generationId: p.generationId,
      feedbackCount: 1,
      avgCulturalRating: p.culturalRating,
      avgSwingRating: p.swingRating,
      isGoldStandard: true,
    })),
    getGoldStandardByGenerationId: vi.fn(async () => null),
    getGenerationRetryCount: vi.fn(async () => 0),
    deleteGeneration: vi.fn(async () => {}),
    toggleGenerationFavorite: vi.fn(async () => {}),
    // Other domains (unused by generate router but imported via barrel)
    upsertUser: vi.fn(async () => ({})),
    getUserByEmail: vi.fn(async () => null),
    getUserByOpenId: vi.fn(async () => null),
    getDb: vi.fn(async () => null),
  };
});

// ── Test context helpers ───────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: 'test-webhook-user',
    email: 'webhook@test.com',
    name: 'Test Webhook User',
    loginMethod: 'email',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: 'https', headers: {} } as TrpcContext['req'],
    res: { clearCookie: () => {} } as TrpcContext['res'],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: 'https', headers: {} } as TrpcContext['req'],
    res: { clearCookie: () => {} } as TrpcContext['res'],
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  nextId = 1;
  store.clear();

  vi.mocked(modalClient.generateMusic).mockResolvedValue({
    jobId: 'mock-job-123',
    status: 'pending',
  });
});

vi.spyOn(modalClient, 'generateMusic');

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Webhook Pattern Implementation', () => {

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
  });

  it('should update generation status via webhook', async () => {
    const ctx = createTestContext();
    const { generationId } = await appRouter.createCaller(ctx).generate.music({
      prompt: 'setup',
      parameters: { duration: 10 },
    });

    const publicCaller = appRouter.createCaller(createPublicContext());
    const webhookResult = await publicCaller.generate.webhook({
      generationId,
      jobId: `modal-${generationId}`,
      status: 'completed',
      audioUrl: 'https://aura-x-audio.s3.amazonaws.com/test.wav',
      culturalScore: 85,
      processingTime: 120000,
    });

    expect(webhookResult.success).toBe(true);
  });

  it('should return updated status via getJobStatus', async () => {
    const ctx = createTestContext();
    const { generationId } = await appRouter.createCaller(ctx).generate.music({
      prompt: 'setup',
      parameters: { duration: 10 },
    });

    await appRouter.createCaller(createPublicContext()).generate.webhook({
      generationId,
      jobId: `modal-${generationId}`,
      status: 'completed',
      audioUrl: 'https://aura-x-audio.s3.amazonaws.com/test.wav',
      culturalScore: 85,
      processingTime: 120000,
    });

    const status = await appRouter.createCaller(ctx).generate.getJobStatus({ generationId });

    expect(status.status).toBe('completed');
  });

  it('should handle webhook failure scenario', async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const { generationId: failedGenerationId } = await caller.generate.music({
      prompt: 'Test failure scenario',
      parameters: { duration: 10 },
    });

    await appRouter.createCaller(createPublicContext()).generate.webhook({
      generationId: failedGenerationId,
      jobId: `modal-${failedGenerationId}`,
      status: 'failed',
      error: 'Modal GPU timeout',
    });

    const status = await caller.generate.getJobStatus({
      generationId: failedGenerationId,
    });

    expect(status.status).toBe('failed');
    expect(status.errorMessage).toBe('Modal GPU timeout');
  });
});
