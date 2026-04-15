/**
 * J3: 26-Stem Separation + DAW Integration — integration tests
 *
 * Covers:
 *   1. stemSeparationRouter.separate sends htdemucs_6s stem list (not 4-stem)
 *   2. aiStudio.separateStems starts Temporal workflow (not direct Modal call)
 *   3. aiStudio.separateStems falls back to direct Modal call when Temporal is unavailable
 *   4. importStemsToDAW: 26-stem map format → one DAW track per stem
 *   5. importStemsToDAW: legacy 4-stem array format still works
 *   6. importStemsToDAW: log_drum track gets correct type for color rendering
 *   7. importStemsToDAW: sdrDb stored in track metadata for timbral badge
 *   8. SEPARATION_MODEL_CAPABILITIES["htdemucs_6s"] contains ≥ 4 stems (not 4-stem fallback)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';
import * as modalClient from './modalClient';
import { SEPARATION_MODEL_CAPABILITIES, ALL_STEM_IDS } from '../shared/stems';

// ── In-memory DB mock ─────────────────────────────────────────────────────────

let nextId = 1;
const store = new Map<number, Record<string, any>>();

vi.mock('./db', () => ({
  createGeneration: vi.fn(async (data: Record<string, any>) => {
    const id = nextId++;
    const row = { id, status: 'pending', resultUrl: null, stemsUrl: null, culturalScore: null,
      culturalScoreBreakdown: null, errorMessage: null, workflowId: null, completedAt: null,
      prompt: data.prompt ?? '', parameters: data.parameters ?? {}, userId: data.userId ?? 1, ...data };
    store.set(id, row);
    return row;
  }),
  updateGeneration: vi.fn(async (id: number, updates: Record<string, any>) => {
    const existing = store.get(id) ?? { id };
    store.set(id, { ...existing, ...updates });
  }),
  getGenerationById: vi.fn(async (id: number) => store.get(id) ?? null),
  getUserGenerations: vi.fn(async () => []),
  getUserProjects: vi.fn(async () => []),
  createProject: vi.fn(async (data: any) => ({ id: nextId++, status: 'active', ...data })),
  createTrack: vi.fn(async (data: any) => ({ id: nextId++, ...data })),
  createGenerationHistory: vi.fn(async (data: any) => ({ id: nextId++, ...data })),
  getUserGenerationHistory: vi.fn(async () => []),
  getGenerationHistoryById: vi.fn(async () => null),
  updateGenerationHistory: vi.fn(async () => {}),
  toggleGenerationHistoryFavorite: vi.fn(async () => {}),
  deleteGenerationHistory: vi.fn(async () => {}),
  setGenerationRating: vi.fn(async () => {}),
  upsertGoldStandard: vi.fn(async (p: any) => ({ id: nextId++, ...p })),
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

// ── Temporal client mock ──────────────────────────────────────────────────────

vi.mock('./temporalClient', () => ({
  executeMusicGenerationWorkflow: vi.fn(async () => ({ workflowId: 'wf-music-mock' })),
  executeStemSeparationWorkflow: vi.fn(async () => ({ workflowId: 'wf-stems-mock-123' })),
  executeTrackAnalysisWorkflow: vi.fn(async () => ({ workflowId: 'wf-analysis-mock' })),
  executeDJSetWorkflow: vi.fn(async () => ({ workflowId: 'wf-dj-mock' })),
  startGenerateAndScoreWorkflow: vi.fn(async () => ({ workflowId: 'wf-score-mock' })),
}));

vi.mock('./culturalScoring', () => ({
  scoreCulturalAuthenticity: vi.fn(),
  generateImprovementPrompt: vi.fn((p: string) => p + ' [improved]'),
}));

// ── Test context ──────────────────────────────────────────────────────────────

function ctx(): TrpcContext {
  return {
    user: {
      id: 1, openId: 'j3-test-user', email: 'j3@test.com', name: 'J3 Test User',
      loginMethod: 'email', role: 'user', createdAt: new Date(),
      updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: 'https', headers: {} } as TrpcContext['req'],
    res: { clearCookie: () => {} } as TrpcContext['res'],
  };
}

beforeEach(() => {
  nextId = 1;
  store.clear();
  vi.clearAllMocks();
});

// ── 1. Stem ontology constants ────────────────────────────────────────────────

describe('26-stem ontology constants', () => {
  it('ALL_STEM_IDS contains exactly 26 stems', () => {
    expect(ALL_STEM_IDS).toHaveLength(26);
  });

  it('ALL_STEM_IDS includes log_drum, piano_chords, lead_vocal', () => {
    expect(ALL_STEM_IDS).toContain('log_drum');
    expect(ALL_STEM_IDS).toContain('piano_chords');
    expect(ALL_STEM_IDS).toContain('lead_vocal');
    expect(ALL_STEM_IDS).toContain('shaker_cabasa');
  });

  it('htdemucs_6s capability list is not the 4-stem fallback', () => {
    const sixStemList = SEPARATION_MODEL_CAPABILITIES['htdemucs_6s'];
    expect(sixStemList.length).toBeGreaterThan(4);
    // Must include the log drum pathway
    expect(sixStemList).toContain('kick'); // drums → kick classification
    expect(sixStemList).toContain('piano_chords');
    expect(sixStemList).toContain('bass_synth');
    expect(sixStemList).toContain('lead_vocal');
  });

  it('htdemucs 4-stem fallback does NOT include log_drum directly', () => {
    // log_drum is extracted via secondary classification, not natively in htdemucs
    const fourStemList = SEPARATION_MODEL_CAPABILITIES['htdemucs'];
    expect(fourStemList).not.toContain('log_drum');
  });
});

// ── 2. stemSeparationRouter.separate — Temporal-first, same as aiStudio path ──

describe('stemSeparationRouter.separate — Temporal-first durability', () => {
  it('starts StemSeparationWorkflow (not a direct Modal call)', async () => {
    const { executeStemSeparationWorkflow } = await import('./temporalClient');

    const caller = appRouter.createCaller(ctx());
    const result = await caller.stemSeparation.separate({ audioUrl: 'https://s3/track.wav' });

    expect(vi.mocked(executeStemSeparationWorkflow)).toHaveBeenCalledWith(
      expect.objectContaining({ audioUrl: 'https://s3/track.wav', userId: 1 })
    );
    expect(vi.mocked(modalClient.separateStems)).not.toHaveBeenCalled();
    expect((result as any).workflowId).toBe('wf-stems-mock-123');
    expect((result as any).status).toBe('processing');
  });

  it('falls back to direct Modal (htdemucs_6s list) when Temporal throws', async () => {
    const { executeStemSeparationWorkflow } = await import('./temporalClient');
    vi.mocked(executeStemSeparationWorkflow).mockRejectedValueOnce(new Error('Temporal down'));
    vi.mocked(modalClient.separateStems).mockResolvedValue({
      status: 'processing',
      jobId: 'job-fallback-sep',
    } as any);

    const caller = appRouter.createCaller(ctx());
    await caller.stemSeparation.separate({ audioUrl: 'https://s3/track.wav' });

    const callArgs = vi.mocked(modalClient.separateStems).mock.calls[0][0];
    expect(callArgs.stemTypes).toEqual(SEPARATION_MODEL_CAPABILITIES['htdemucs_6s']);
    expect(callArgs.stemTypes).not.toEqual(['vocals', 'drums', 'bass', 'other']);
  });

  it('passes optional generationId to Temporal when provided', async () => {
    const { executeStemSeparationWorkflow } = await import('./temporalClient');

    const caller = appRouter.createCaller(ctx());
    await caller.stemSeparation.separate({ audioUrl: 'https://s3/track.wav', generationId: 42 });

    expect(vi.mocked(executeStemSeparationWorkflow)).toHaveBeenCalledWith(
      expect.objectContaining({ generationId: 42 })
    );
  });
});

// ── 3. aiStudio.separateStems starts Temporal workflow ───────────────────────

describe('aiStudio.separateStems — Temporal workflow', () => {
  it('starts StemSeparationWorkflow and returns workflowId', async () => {
    const { executeStemSeparationWorkflow } = await import('./temporalClient');

    // Create a completed generation
    const gen = await vi.fn(async () => ({
      id: 1, status: 'completed', resultUrl: 'https://s3/track.wav',
      prompt: 'Test', parameters: {}, userId: 1, culturalScore: null,
      culturalScoreBreakdown: null, stemsUrl: null,
    }))();
    store.set(1, gen);
    const db = await import('./db');
    vi.mocked(db.getGenerationById).mockResolvedValue(gen as any);

    const caller = appRouter.createCaller(ctx());
    const result = await caller.aiStudio.separateStems({ generationId: 1 });

    expect(vi.mocked(executeStemSeparationWorkflow)).toHaveBeenCalledWith(
      expect.objectContaining({
        generationId: 1,
        audioUrl: 'https://s3/track.wav',
      })
    );
    expect((result as any).workflowId).toBe('wf-stems-mock-123');
    expect((result as any).status).toBe('processing');
  });

  it('falls back to direct Modal call when Temporal throws', async () => {
    const { executeStemSeparationWorkflow } = await import('./temporalClient');
    vi.mocked(executeStemSeparationWorkflow).mockRejectedValue(new Error('Temporal unavailable'));

    vi.mocked(modalClient.separateStems).mockResolvedValue({
      status: 'processing',
      jobId: 'job-fallback',
    } as any);

    const gen = {
      id: 1, status: 'completed', resultUrl: 'https://s3/track.wav',
      prompt: 'Test', parameters: {}, userId: 1,
    };
    store.set(1, gen);
    const db = await import('./db');
    vi.mocked(db.getGenerationById).mockResolvedValue(gen as any);

    const caller = appRouter.createCaller(ctx());
    const result = await caller.aiStudio.separateStems({ generationId: 1 });

    // Should fall back to Modal with htdemucs_6s stem types
    expect(vi.mocked(modalClient.separateStems)).toHaveBeenCalledWith(
      expect.objectContaining({
        stemTypes: SEPARATION_MODEL_CAPABILITIES['htdemucs_6s'],
      })
    );
    expect((result as any).jobId).toBe('job-fallback');
  });
});

// ── 4. importStemsToDAW — 26-stem map format ──────────────────────────────────

describe('aiStudio.importStemsToDAW — 26-stem map format', () => {
  async function setupGenerationWithStems(stemsUrl: any) {
    const gen = {
      id: 1, status: 'completed', resultUrl: 'https://s3/track.wav',
      prompt: 'Test', parameters: {}, userId: 1, title: 'Test Track',
      duration: 30, bpm: 120, key: 'A min', style: 'amapiano', stemsUrl,
    };
    store.set(1, gen);
    const db = await import('./db');
    vi.mocked(db.getGenerationById).mockResolvedValue(gen as any);
    vi.mocked(db.getUserProjects).mockResolvedValue([
      { id: 10, status: 'active', name: 'My Project' } as any,
    ]);
    return gen;
  }

  it('creates one DAW track per stem in the 26-stem map', async () => {
    await setupGenerationWithStems({
      log_drum: { url: 'https://s3/log_drum.wav', sdr_db: 9.2 },
      piano_chords: { url: 'https://s3/piano.wav', sdr_db: 11.1 },
      lead_vocal: { url: 'https://s3/vocal.wav' },
    });

    const db = await import('./db');
    const caller = appRouter.createCaller(ctx());
    const result = await caller.aiStudio.importStemsToDAW({ generationId: 1 });

    expect(result.tracksCreated).toBe(3);
    expect(vi.mocked(db.createTrack)).toHaveBeenCalledTimes(3);
  });

  it('sets track type to the stem ID for correct DAW color rendering', async () => {
    await setupGenerationWithStems({
      log_drum: { url: 'https://s3/log_drum.wav', sdr_db: 9.2 },
      piano_chords: { url: 'https://s3/piano.wav' },
    });

    const db = await import('./db');
    const caller = appRouter.createCaller(ctx());
    await caller.aiStudio.importStemsToDAW({ generationId: 1 });

    const calls = vi.mocked(db.createTrack).mock.calls;
    const types = calls.map(c => c[0].type);
    expect(types).toContain('log_drum');
    expect(types).toContain('piano_chords');
  });

  it('stores sdrDb in log_drum track metadata', async () => {
    await setupGenerationWithStems({
      log_drum: { url: 'https://s3/log_drum.wav', sdr_db: 9.2 },
      bass_synth: { url: 'https://s3/bass.wav', sdr_db: 7.5 },
    });

    const db = await import('./db');
    const caller = appRouter.createCaller(ctx());
    await caller.aiStudio.importStemsToDAW({ generationId: 1 });

    const logDrumCall = vi.mocked(db.createTrack).mock.calls
      .find(c => c[0].type === 'log_drum');
    expect(logDrumCall).toBeDefined();
    expect(logDrumCall![0].metadata).toMatchObject({ sdrDb: 9.2 });
  });

  it('handles legacy 4-stem array format without error', async () => {
    await setupGenerationWithStems([
      { name: 'drums', url: 'https://s3/drums.wav' },
      { name: 'bass', url: 'https://s3/bass.wav' },
      { name: 'vocals', url: 'https://s3/vocals.wav' },
      { name: 'other', url: 'https://s3/other.wav' },
    ]);

    const caller = appRouter.createCaller(ctx());
    const result = await caller.aiStudio.importStemsToDAW({ generationId: 1 });

    expect(result.tracksCreated).toBe(4);
  });

  it('throws when stemsUrl is null', async () => {
    const gen = {
      id: 1, status: 'completed', resultUrl: 'https://s3/track.wav',
      stemsUrl: null, userId: 1, prompt: 'Test', parameters: {},
    };
    store.set(1, gen);
    const db = await import('./db');
    vi.mocked(db.getGenerationById).mockResolvedValue(gen as any);

    const caller = appRouter.createCaller(ctx());
    await expect(
      caller.aiStudio.importStemsToDAW({ generationId: 1 })
    ).rejects.toThrow('No stems available');
  });
});
