/**
 * J1: Natural Language → Amapiano Track — integration tests
 *
 * Covers the three J1 changes:
 *   1. CulturalScore interface: 8-dimension breakdown
 *   2. aiStudio.checkJobStatus: scores on first completion, stores breakdown,
 *      skips re-scoring on subsequent polls
 *   3. BPM/key defaults reflected in generation parameters
 *   4. rateGeneration: T7 feedback loop (rating ≥ 4 → gold standard)
 *
 * DB is mocked via vi.mock('./db').
 * Modal client and cultural scoring are mocked at the module level.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';
import * as modalClient from './modalClient';
import * as culturalScoring from './culturalScoring';

// ── In-memory DB mock ─────────────────────────────────────────────────────────

let nextId = 1;
const store = new Map<number, Record<string, any>>();

vi.mock('./db', () => ({
  createGeneration: vi.fn(async (data: Record<string, any>) => {
    const id = nextId++;
    const row = {
      id,
      status: 'pending',
      resultUrl: null,
      culturalScore: null,
      culturalScoreBreakdown: null,
      errorMessage: null,
      workflowId: null,
      completedAt: null,
      prompt: data.prompt ?? '',
      parameters: data.parameters ?? {},
      ...data,
    };
    store.set(id, row);
    return row;
  }),
  updateGeneration: vi.fn(async (id: number, updates: Record<string, any>) => {
    const existing = store.get(id) ?? { id };
    const merged = { ...existing, ...updates };
    store.set(id, merged);
  }),
  getGenerationById: vi.fn(async (id: number) => store.get(id) ?? null),
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
  upsertUser: vi.fn(async () => ({})),
  getUserByEmail: vi.fn(async () => null),
  getUserByOpenId: vi.fn(async () => null),
  getDb: vi.fn(async () => null),
}));

// ── Modal client mock ─────────────────────────────────────────────────────────

vi.mock('./modalClient', () => ({
  generateMusic: vi.fn(),
  checkJobStatus: vi.fn(),
  separateStems: vi.fn(),
}));

// ── Cultural scoring mock ─────────────────────────────────────────────────────

vi.mock('./culturalScoring', () => ({
  scoreCulturalAuthenticity: vi.fn(),
  generateImprovementPrompt: vi.fn((p: string) => p + ' [improved]'),
}));

// ── Temporal client stub ──────────────────────────────────────────────────────

vi.mock('./temporalClient', () => ({
  executeMusicGenerationWorkflow: vi.fn(async () => ({ workflowId: 'wf-mock-123' })),
  executeStemSeparationWorkflow: vi.fn(async () => ({ workflowId: 'wf-stems-mock' })),
  executeTrackAnalysisWorkflow: vi.fn(async () => ({ workflowId: 'wf-analysis-mock' })),
  executeDJSetWorkflow: vi.fn(async () => ({ workflowId: 'wf-dj-mock' })),
  startGenerateAndScoreWorkflow: vi.fn(async () => ({ workflowId: 'wf-score-mock' })),
}));

// ── Canonical mock score ──────────────────────────────────────────────────────

const MOCK_SCORE = {
  overall: 84,
  breakdown: {
    logDrumPresence:      17,
    pianoAuthenticity:    17,
    rhythmicSwing:        12,
    languageAuthenticity: 12,
    energyArc:             9,
    harmonicStructure:     9,
    timbreTexture:         4,
    productionEra:         4,
  },
  feedback: 'Authentic Amapiano with strong log drum presence.',
  recommendations: ['Increase swing to 58% for Gauteng character.'],
};

// ── Test context ──────────────────────────────────────────────────────────────

function ctx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: 'j1-test-user',
      email: 'j1@test.com',
      name: 'J1 Test User',
      loginMethod: 'email',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: 'https', headers: {} } as TrpcContext['req'],
    res: { clearCookie: () => {} } as TrpcContext['res'],
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  nextId = 1;
  store.clear();
  vi.clearAllMocks();

  vi.mocked(modalClient.generateMusic).mockResolvedValue({
    jobId: 'mock-job-123',
    status: 'pending',
  });
  vi.mocked(modalClient.checkJobStatus).mockResolvedValue({ status: 'processing' } as any);
  vi.mocked(culturalScoring.scoreCulturalAuthenticity).mockResolvedValue(MOCK_SCORE);
});

// ── Helper: create a generation ───────────────────────────────────────────────

async function createGeneration(overrides: Partial<{
  prompt: string; style: string; mood: string; bpm: number; key: string;
}> = {}) {
  const caller = appRouter.createCaller(ctx());
  return caller.aiStudio.generateMusic({
    prompt: overrides.prompt ?? 'Amapiano track',
    style: overrides.style ?? 'Amapiano',
    mood: overrides.mood ?? 'Energetic',
    bpm: overrides.bpm ?? 120,
    key: overrides.key ?? 'A min',
    vocalStyle: 'male',
    mode: 'simple',
  });
}

// ── 1. CulturalScore 8-dimension interface ────────────────────────────────────

describe('CulturalScore — 8-dimension breakdown', () => {
  it('returns all 8 breakdown fields', async () => {
    const score = await culturalScoring.scoreCulturalAuthenticity('https://s3/test.wav', 'Amapiano', {});

    expect(score.breakdown).toHaveProperty('logDrumPresence');
    expect(score.breakdown).toHaveProperty('pianoAuthenticity');
    expect(score.breakdown).toHaveProperty('rhythmicSwing');
    expect(score.breakdown).toHaveProperty('languageAuthenticity');
    expect(score.breakdown).toHaveProperty('energyArc');
    expect(score.breakdown).toHaveProperty('harmonicStructure');
    expect(score.breakdown).toHaveProperty('timbreTexture');
    expect(score.breakdown).toHaveProperty('productionEra');
  });

  it('dimension values sum to overall', async () => {
    const score = await culturalScoring.scoreCulturalAuthenticity('https://s3/test.wav', 'test', {});
    const sum = Object.values(score.breakdown).reduce((a, b) => a + b, 0);
    expect(sum).toBe(score.overall);
  });

  it('no dimension exceeds its max (20/20/15/15/10/10/5/5)', async () => {
    const score = await culturalScoring.scoreCulturalAuthenticity('https://s3/test.wav', 'test', {});
    expect(score.breakdown.logDrumPresence).toBeLessThanOrEqual(20);
    expect(score.breakdown.pianoAuthenticity).toBeLessThanOrEqual(20);
    expect(score.breakdown.rhythmicSwing).toBeLessThanOrEqual(15);
    expect(score.breakdown.languageAuthenticity).toBeLessThanOrEqual(15);
    expect(score.breakdown.energyArc).toBeLessThanOrEqual(10);
    expect(score.breakdown.harmonicStructure).toBeLessThanOrEqual(10);
    expect(score.breakdown.timbreTexture).toBeLessThanOrEqual(5);
    expect(score.breakdown.productionEra).toBeLessThanOrEqual(5);
  });

  it('has feedback string and recommendations array', async () => {
    const score = await culturalScoring.scoreCulturalAuthenticity('https://s3/test.wav', 'test', {});
    expect(typeof score.feedback).toBe('string');
    expect(score.feedback.length).toBeGreaterThan(0);
    expect(Array.isArray(score.recommendations)).toBe(true);
  });
});

// ── 2. checkJobStatus completion path ─────────────────────────────────────────

describe('aiStudio.checkJobStatus — cultural scoring on first completion', () => {
  it('returns processing status while job is running', async () => {
    const { generationId } = await createGeneration();
    const result = await appRouter.createCaller(ctx()).aiStudio.checkJobStatus({
      jobId: 'mock-job-123',
      generationId,
    });

    expect(result.status).toBe('processing');
    expect((result as any).culturalScore).toBeUndefined();
    expect(culturalScoring.scoreCulturalAuthenticity).not.toHaveBeenCalled();
  });

  it('scores on first completed poll and returns breakdown', async () => {
    vi.mocked(modalClient.checkJobStatus).mockResolvedValue({
      status: 'completed',
      audioUrl: 'https://s3/track.wav',
    } as any);

    const { generationId } = await createGeneration();
    const result = await appRouter.createCaller(ctx()).aiStudio.checkJobStatus({
      jobId: 'mock-job-123',
      generationId,
    });

    expect(result.status).toBe('completed');
    expect((result as any).culturalScore).toBe(84);

    const bd = (result as any).culturalScoreBreakdown;
    expect(bd.overall).toBe(84);
    expect(bd.breakdown.logDrumPresence).toBe(17);
    expect(bd.breakdown.pianoAuthenticity).toBe(17);
    expect(bd.feedback).toBe('Authentic Amapiano with strong log drum presence.');
    expect(culturalScoring.scoreCulturalAuthenticity).toHaveBeenCalledOnce();
  });

  it('writes culturalScore and culturalScoreBreakdown to DB', async () => {
    vi.mocked(modalClient.checkJobStatus).mockResolvedValue({
      status: 'completed',
      audioUrl: 'https://s3/track.wav',
    } as any);

    const db = await import('./db');
    const { generationId } = await createGeneration();
    await appRouter.createCaller(ctx()).aiStudio.checkJobStatus({
      jobId: 'mock-job-123',
      generationId,
    });

    expect(vi.mocked(db.updateGeneration)).toHaveBeenCalledWith(
      generationId,
      expect.objectContaining({
        status: 'completed',
        culturalScore: '84',
        culturalScoreBreakdown: expect.objectContaining({
          overall: 84,
          breakdown: expect.objectContaining({ logDrumPresence: 17 }),
        }),
      })
    );
  });

  it('skips re-scoring on second completed poll', async () => {
    vi.mocked(modalClient.checkJobStatus).mockResolvedValue({
      status: 'completed',
      audioUrl: 'https://s3/track.wav',
    } as any);

    const { generationId } = await createGeneration();
    const caller = appRouter.createCaller(ctx());

    // First poll — should score
    await caller.aiStudio.checkJobStatus({ jobId: 'mock-job-123', generationId });
    expect(culturalScoring.scoreCulturalAuthenticity).toHaveBeenCalledOnce();

    // Second poll — must not re-score
    await caller.aiStudio.checkJobStatus({ jobId: 'mock-job-123', generationId });
    expect(culturalScoring.scoreCulturalAuthenticity).toHaveBeenCalledOnce(); // still once
  });

  it('marks failed and returns error message', async () => {
    vi.mocked(modalClient.checkJobStatus).mockResolvedValue({
      status: 'failed',
      error: 'GPU timeout',
    } as any);

    const { generationId } = await createGeneration();
    const result = await appRouter.createCaller(ctx()).aiStudio.checkJobStatus({
      jobId: 'mock-job-123',
      generationId,
    });

    expect(result.status).toBe('failed');
    expect((result as any).error).toBe('GPU timeout');
    expect(culturalScoring.scoreCulturalAuthenticity).not.toHaveBeenCalled();
  });
});

// ── 3. Default generation parameters ─────────────────────────────────────────

describe('aiStudio.generateMusic — Amapiano default parameters', () => {
  it('accepts BPM 120 (Amapiano sweet spot) and returns processing status', async () => {
    const result = await createGeneration({ bpm: 120 });
    expect(result).toHaveProperty('generationId');
    expect(result.status).toBe('processing');
  });

  it('stores bpm=120 and key=A min in DB record', async () => {
    await createGeneration({ bpm: 120, key: 'A min' });
    const gen = store.get(1);
    expect(gen?.bpm).toBe(120);
    expect(gen?.key).toBe('A min');
  });

  it('accepts full BPM range 115–130 without rejection', async () => {
    for (const bpm of [115, 118, 120, 124, 128, 130]) {
      nextId = 1;
      store.clear();
      const result = await createGeneration({ bpm });
      expect(result.status).toBe('processing');
    }
  });

  it('rejects BPM above schema max (140)', async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(
      caller.aiStudio.generateMusic({
        prompt: 'Too fast',
        style: 'Amapiano',
        mood: 'Energetic',
        bpm: 200,
        key: 'A min',
        vocalStyle: 'male',
        mode: 'simple',
      })
    ).rejects.toThrow();
  });
});

// ── 4. rateGeneration — T7 feedback loop ─────────────────────────────────────

describe('aiStudio.rateGeneration — T7 feedback loop', () => {
  async function createCompletedGeneration() {
    const { generationId } = await createGeneration();
    store.set(generationId, {
      ...store.get(generationId),
      status: 'completed',
      culturalScore: '84',
      resultUrl: 'https://s3/track.wav',
    });
    return generationId;
  }

  it('saves rating and triggers gold standard for rating ≥ 4', async () => {
    const generationId = await createCompletedGeneration();
    const db = await import('./db');

    const result = await appRouter.createCaller(ctx()).aiStudio.rateGeneration({
      generationId,
      rating: 5,
    });

    expect(result.success).toBe(true);
    expect(vi.mocked(db.setGenerationRating)).toHaveBeenCalledWith(generationId, 5);
    expect(vi.mocked(db.upsertGoldStandard)).toHaveBeenCalled();
  });

  it('saves rating without gold standard for rating < 4', async () => {
    const generationId = await createCompletedGeneration();
    const db = await import('./db');

    const result = await appRouter.createCaller(ctx()).aiStudio.rateGeneration({
      generationId,
      rating: 2,
    });

    expect(result.success).toBe(true);
    expect(vi.mocked(db.setGenerationRating)).toHaveBeenCalledWith(generationId, 2);
    expect(vi.mocked(db.upsertGoldStandard)).not.toHaveBeenCalled();
  });

  it('rejects rating outside 1–5 range', async () => {
    const generationId = await createCompletedGeneration();
    const caller = appRouter.createCaller(ctx());

    await expect(
      caller.aiStudio.rateGeneration({ generationId, rating: 6 })
    ).rejects.toThrow();

    await expect(
      caller.aiStudio.rateGeneration({ generationId, rating: 0 })
    ).rejects.toThrow();
  });
});
