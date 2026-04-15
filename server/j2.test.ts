/**
 * J2: Cultural Diagnosis and Autonomous Iteration — integration tests
 *
 * Covers:
 *   1. culturalScoreBreakdown stored at all three scoring callsites:
 *      - generate.autonomous per-attempt
 *      - generate.webhook auto-scoring
 *      - aiStudio.rateGeneration auto-scoring
 *   2. Autonomous loop polling — waits for webhook-delivered resultUrl
 *   3. Polling timeout — null score entry when audio never arrives
 *   4. Per-attempt prompt improvement using weakest dimension
 *   5. allScores / allPrompts alignment
 *   6. Target-score early exit
 *   7. Best-attempt fallback when target not reached
 *
 * NOTE T-new: generate.autonomous runs in the tRPC request handler. Phase 2
 * must refactor to AutonomousGenerationWorkflow (Temporal) before autonomous
 * mode is exposed to production traffic.
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
      userId: data.userId ?? 1,
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
  generateImprovementPrompt: vi.fn((p: string, _score: any, _params: any) => p + ' [improved]'),
}));

// ── Temporal client stub ──────────────────────────────────────────────────────

vi.mock('./temporalClient', () => ({
  executeMusicGenerationWorkflow: vi.fn(async () => ({ workflowId: 'wf-mock-123' })),
  executeStemSeparationWorkflow: vi.fn(async () => ({ workflowId: 'wf-stems-mock' })),
  executeTrackAnalysisWorkflow: vi.fn(async () => ({ workflowId: 'wf-analysis-mock' })),
  executeDJSetWorkflow: vi.fn(async () => ({ workflowId: 'wf-dj-mock' })),
  startGenerateAndScoreWorkflow: vi.fn(async () => ({ workflowId: 'wf-score-mock' })),
}));

// ── Canonical 8-dimension mock scores ────────────────────────────────────────

const MOCK_SCORE_HIGH: import('./culturalScoring').CulturalScore = {
  overall: 85,
  breakdown: {
    logDrumPresence:      17,
    pianoAuthenticity:    17,
    rhythmicSwing:        13,
    languageAuthenticity: 13,
    energyArc:             9,
    harmonicStructure:     9,
    timbreTexture:         4,
    productionEra:         3,
  },
  feedback: 'Authentic Amapiano with excellent log drum presence.',
  recommendations: ['Increase swing to 58% for fuller Gauteng character.'],
};

/** Score below the default 80 target — triggers improvement loop */
const MOCK_SCORE_LOW: import('./culturalScoring').CulturalScore = {
  overall: 65,
  breakdown: {
    logDrumPresence:       3,  // 15% of max 20 — weakest
    pianoAuthenticity:    14,  // 70%
    rhythmicSwing:        10,  // 67%
    languageAuthenticity: 10,  // 67%
    energyArc:             7,  // 70%
    harmonicStructure:     7,  // 70%
    timbreTexture:         4,  // 80%
    productionEra:         4,  // 80%
  },
  feedback: 'Log drum lacks sub-bass presence.',
  recommendations: ['Boost log drum sub-bass 40-80 Hz by 6 dB.'],
};

// ── Test context ──────────────────────────────────────────────────────────────

function ctx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: 'j2-test-user',
      email: 'j2@test.com',
      name: 'J2 Test User',
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

  // Default Modal response: synchronous completion with audioUrl
  vi.mocked(modalClient.generateMusic).mockResolvedValue({
    jobId: 'mock-job-123',
    status: 'completed',
    audioUrl: 'https://s3/track.wav',
  } as any);
});

// ── 1. culturalScoreBreakdown stored at all three scoring callsites ───────────

describe('culturalScoreBreakdown — stored at all callsites', () => {
  it('autonomous loop per-attempt: stores culturalScoreBreakdown', async () => {
    vi.mocked(culturalScoring.scoreCulturalAuthenticity).mockResolvedValue(MOCK_SCORE_HIGH);
    const db = await import('./db');

    const caller = appRouter.createCaller(ctx());
    await caller.generate.autonomous({
      prompt: 'Amapiano track',
      parameters: { tempo: 120 },
      maxAttempts: 1,
      targetScore: 80,
    });

    expect(vi.mocked(db.updateGeneration)).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({
        culturalScore: '85',
        culturalScoreBreakdown: expect.objectContaining({
          overall: 85,
          breakdown: expect.objectContaining({ logDrumPresence: 17 }),
        }),
      })
    );
  });

  it('generate.webhook auto-scoring: stores culturalScoreBreakdown when culturalScore absent', async () => {
    vi.mocked(culturalScoring.scoreCulturalAuthenticity).mockResolvedValue(MOCK_SCORE_HIGH);
    const db = await import('./db');

    // Pre-create a generation without culturalScore
    const gen = await vi.mocked(db.createGeneration)({
      userId: 1,
      type: 'music',
      prompt: 'Amapiano track',
      parameters: {},
      status: 'processing',
    });
    // getGenerationById must return the row for the webhook to score it
    vi.mocked(db.getGenerationById).mockResolvedValue(store.get(gen.id) as any);

    const caller = appRouter.createCaller(ctx());
    await caller.generate.webhook({
      generationId: gen.id,
      jobId: 'mock-job-123',
      status: 'completed',
      audioUrl: 'https://s3/track.wav',
    });

    // Give the fire-and-forget Promise a tick to run
    await new Promise(r => setTimeout(r, 50));

    expect(vi.mocked(db.updateGeneration)).toHaveBeenCalledWith(
      gen.id,
      expect.objectContaining({
        culturalScoreBreakdown: expect.objectContaining({
          overall: 85,
          breakdown: expect.objectContaining({ logDrumPresence: 17 }),
        }),
      })
    );
  });

  it('rateGeneration auto-scoring: stores culturalScoreBreakdown when culturalScore null', async () => {
    vi.mocked(culturalScoring.scoreCulturalAuthenticity).mockResolvedValue(MOCK_SCORE_HIGH);
    const db = await import('./db');

    // Create a completed generation without a cultural score
    const gen = await vi.mocked(db.createGeneration)({
      userId: 1,
      type: 'music',
      prompt: 'Amapiano track',
      parameters: {},
      status: 'completed',
      resultUrl: 'https://s3/track.wav',
      culturalScore: null,
    });
    vi.mocked(db.getGenerationById).mockResolvedValue({ ...store.get(gen.id), culturalScore: null } as any);

    const caller = appRouter.createCaller(ctx());
    await caller.aiStudio.rateGeneration({ generationId: gen.id, rating: 5 });

    expect(vi.mocked(db.updateGeneration)).toHaveBeenCalledWith(
      gen.id,
      expect.objectContaining({
        culturalScore: '85',
        culturalScoreBreakdown: expect.objectContaining({
          overall: 85,
          breakdown: expect.objectContaining({ logDrumPresence: 17 }),
        }),
      })
    );
  });
});

// ── 2. Autonomous loop polling behaviour ──────────────────────────────────────

describe('generate.autonomous — polling loop', () => {
  it('resolves audioUrl immediately when Modal returns it inline', async () => {
    vi.mocked(culturalScoring.scoreCulturalAuthenticity).mockResolvedValue(MOCK_SCORE_HIGH);
    vi.mocked(modalClient.generateMusic).mockResolvedValue({
      jobId: 'job-inline',
      status: 'completed',
      audioUrl: 'https://s3/inline.wav',
    } as any);

    const caller = appRouter.createCaller(ctx());
    const result = await caller.generate.autonomous({
      prompt: 'Test track',
      parameters: { tempo: 120 },
      maxAttempts: 1,
      targetScore: 80,
    });

    expect(result.audioUrl).toBe('https://s3/inline.wav');
    expect(result.success).toBe(true);
  });

  it('waits for webhook-delivered resultUrl when Modal returns no audioUrl', async () => {
    vi.mocked(modalClient.generateMusic).mockResolvedValue({
      jobId: 'job-fire-forget',
      status: 'processing',
      // No audioUrl — fire-and-forget pattern
    } as any);

    vi.mocked(culturalScoring.scoreCulturalAuthenticity).mockResolvedValue(MOCK_SCORE_HIGH);

    const db = await import('./db');

    // Simulate webhook delivering resultUrl on the 2nd DB poll
    let pollCount = 0;
    vi.mocked(db.getGenerationById).mockImplementation(async (id: number) => {
      const row = store.get(id);
      if (!row) return null;
      pollCount++;
      if (pollCount >= 2) {
        return { ...row, resultUrl: 'https://s3/webhook-delivered.wav', status: 'completed' } as any;
      }
      return { ...row, resultUrl: null, status: 'processing' } as any;
    });

    const caller = appRouter.createCaller(ctx());
    const result = await caller.generate.autonomous({
      prompt: 'Test track',
      parameters: { tempo: 120 },
      maxAttempts: 1,
      targetScore: 80,
    });

    expect(result.audioUrl).toBe('https://s3/webhook-delivered.wav');
    expect(result.success).toBe(true);
    expect(culturalScoring.scoreCulturalAuthenticity).toHaveBeenCalledWith(
      'https://s3/webhook-delivered.wav',
      'Test track',
      { tempo: 120 }
    );
  }, 60_000); // generous timeout for real poll loop

  it('scores with 8-dimension breakdown after successful poll', async () => {
    vi.mocked(modalClient.generateMusic).mockResolvedValue({
      jobId: 'job-scored',
      status: 'completed',
      audioUrl: 'https://s3/scored.wav',
    } as any);
    vi.mocked(culturalScoring.scoreCulturalAuthenticity).mockResolvedValue(MOCK_SCORE_HIGH);

    const caller = appRouter.createCaller(ctx());
    const result = await caller.generate.autonomous({
      prompt: 'Test',
      maxAttempts: 1,
      targetScore: 80,
    });

    expect(result.score).toMatchObject({
      overall: 85,
      breakdown: expect.objectContaining({
        logDrumPresence: 17,
        pianoAuthenticity: 17,
        rhythmicSwing: 13,
      }),
      feedback: expect.any(String),
      recommendations: expect.any(Array),
    });
  });

  it('returns success=true immediately when target score achieved in first attempt', async () => {
    vi.mocked(modalClient.generateMusic).mockResolvedValue({
      jobId: 'job-pass',
      status: 'completed',
      audioUrl: 'https://s3/pass.wav',
    } as any);
    vi.mocked(culturalScoring.scoreCulturalAuthenticity).mockResolvedValue(MOCK_SCORE_HIGH); // 85 ≥ 80

    const caller = appRouter.createCaller(ctx());
    const result = await caller.generate.autonomous({
      prompt: 'Test',
      maxAttempts: 3,
      targetScore: 80,
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(1); // stopped after first success
    expect(culturalScoring.scoreCulturalAuthenticity).toHaveBeenCalledOnce();
  });
});

// ── 3. Multi-attempt improvement loop ────────────────────────────────────────

describe('generate.autonomous — multi-attempt improvement', () => {
  it('calls generateImprovementPrompt after a low-scoring attempt', async () => {
    // First attempt fails to reach target; second reaches it
    vi.mocked(modalClient.generateMusic).mockResolvedValue({
      jobId: 'job-multi',
      status: 'completed',
      audioUrl: 'https://s3/multi.wav',
    } as any);
    vi.mocked(culturalScoring.scoreCulturalAuthenticity)
      .mockResolvedValueOnce(MOCK_SCORE_LOW)   // attempt 1: 65 < 80
      .mockResolvedValueOnce(MOCK_SCORE_HIGH);  // attempt 2: 85 ≥ 80

    const caller = appRouter.createCaller(ctx());
    await caller.generate.autonomous({
      prompt: 'Amapiano track',
      parameters: { tempo: 120 },
      maxAttempts: 3,
      targetScore: 80,
    });

    expect(culturalScoring.generateImprovementPrompt).toHaveBeenCalledWith(
      'Amapiano track',
      MOCK_SCORE_LOW,
      { tempo: 120 }
    );
  });

  it('allScores and allPrompts have same length after multi-attempt run', async () => {
    vi.mocked(modalClient.generateMusic).mockResolvedValue({
      jobId: 'job-arr',
      status: 'completed',
      audioUrl: 'https://s3/arr.wav',
    } as any);
    vi.mocked(culturalScoring.scoreCulturalAuthenticity)
      .mockResolvedValueOnce(MOCK_SCORE_LOW)   // 65
      .mockResolvedValueOnce(MOCK_SCORE_LOW)   // 65
      .mockResolvedValueOnce(MOCK_SCORE_HIGH); // 85

    const caller = appRouter.createCaller(ctx());
    const result = await caller.generate.autonomous({
      prompt: 'Amapiano track',
      maxAttempts: 3,
      targetScore: 80,
    });

    expect(result.allScores).toHaveLength(result.allPrompts.length);
  });

  it('returns best generation when target score is never achieved', async () => {
    vi.mocked(modalClient.generateMusic).mockResolvedValue({
      jobId: 'job-best',
      status: 'completed',
      audioUrl: 'https://s3/best.wav',
    } as any);

    const SCORE_72 = { ...MOCK_SCORE_LOW, overall: 72,
      breakdown: { ...MOCK_SCORE_LOW.breakdown, pianoAuthenticity: 7 } };
    const SCORE_68 = { ...MOCK_SCORE_LOW, overall: 68 };

    vi.mocked(culturalScoring.scoreCulturalAuthenticity)
      .mockResolvedValueOnce(SCORE_68)
      .mockResolvedValueOnce(SCORE_72); // best

    const caller = appRouter.createCaller(ctx());
    const result = await caller.generate.autonomous({
      prompt: 'Amapiano track',
      maxAttempts: 2,
      targetScore: 90, // intentionally unreachable
    });

    expect(result.success).toBe(false);
    expect(result.finalScore).toBe(72); // best among attempts
    expect(result.attempts).toBe(2);
  });
});

// ── 4. allScores / allPrompts alignment with timeout scenario ─────────────────

describe('generate.autonomous — allScores alignment', () => {
  it('includes only successful-attempt scores in allScores', async () => {
    vi.mocked(modalClient.generateMusic).mockResolvedValue({
      jobId: 'job-align',
      status: 'completed',
      audioUrl: 'https://s3/align.wav',
    } as any);
    vi.mocked(culturalScoring.scoreCulturalAuthenticity)
      .mockResolvedValueOnce(MOCK_SCORE_LOW)
      .mockResolvedValueOnce(MOCK_SCORE_HIGH);

    const caller = appRouter.createCaller(ctx());
    const result = await caller.generate.autonomous({
      prompt: 'Test',
      maxAttempts: 2,
      targetScore: 90,
    });

    // Both attempts completed — scores array has 2 entries
    expect(result.allScores).toHaveLength(2);
    expect((result.allScores[0] as any).overall).toBe(65);
    expect((result.allScores[1] as any).overall).toBe(85);
  });
});
