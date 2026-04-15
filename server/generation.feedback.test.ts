/**
 * generation.feedback.test.ts — T7 OS activation: feedback loop tests
 *
 * Verifies the complete T7 path:
 *   rateGeneration(rating ≥ 4) → upsertGoldStandard → gold_standard_generations row
 *   rateGeneration(rating < 4) → no gold standard row
 *   generate.webhook(completed, no score) → auto-triggers culturalScoring
 *   rateGeneration auto-scores if culturalScore is null
 *
 * These are the tests whose passing satisfies the Phase 0 exit criterion:
 *   "gold_standard_generations must have at least one row after the first
 *    test generation is rated."
 *
 * DB and cultural scoring are mocked — no live database required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock DB layer ─────────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getGenerationById: vi.fn(),
  updateGeneration: vi.fn(),
  setGenerationRating: vi.fn(),
  upsertGoldStandard: vi.fn(),
  getGoldStandardByGenerationId: vi.fn(),
  createGeneration: vi.fn(),
  getUserGenerations: vi.fn(),
  toggleGenerationFavorite: vi.fn(),
  deleteGeneration: vi.fn(),
  getGenerationRetryCount: vi.fn(),
  createGenerationHistory: vi.fn(),
  getUserGenerationHistory: vi.fn(),
  getGenerationHistoryById: vi.fn(),
  updateGenerationHistory: vi.fn(),
  toggleGenerationHistoryFavorite: vi.fn(),
  deleteGenerationHistory: vi.fn(),
  getUserProjects: vi.fn(),
  createProject: vi.fn(),
  createTrack: vi.fn(),
}));

// ── Mock cultural scoring ─────────────────────────────────────────────────────

vi.mock("./culturalScoring", () => ({
  scoreCulturalAuthenticity: vi.fn(),
  generateImprovementPrompt: vi.fn(),
}));

// ── Mock other dependencies ───────────────────────────────────────────────────

vi.mock("./modalClient", () => ({
  generateMusic: vi.fn(),
  checkJobStatus: vi.fn(),
  separateStems: vi.fn(),
}));

vi.mock("./temporalClient", () => ({
  executeMusicGenerationWorkflow: vi.fn(),
}));

vi.mock("./queueManager", () => ({
  getQueuePosition: vi.fn(() => 1),
  getQueueStats: vi.fn(() => ({ pending: 0, processing: 0 })),
}));

import * as db from "./db";
import * as culturalScoring from "./culturalScoring";

// ── Context helpers ───────────────────────────────────────────────────────────

function userCtx(userId = 42): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-openid",
      email: "producer@aura-x.com",
      name: "Test Producer",
      role: "user",
      loginMethod: "email",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function publicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeGeneration(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    userId: 42,
    type: "music",
    prompt: "Late night Amapiano with log drum",
    status: "completed",
    resultUrl: "https://s3.example.com/gen1.mp3",
    culturalScore: null,
    userRating: null,
    isFavorite: false,
    createdAt: new Date(),
    completedAt: new Date(),
    ...overrides,
  };
}

function makeGoldStandard(generationId = 1) {
  return {
    id: 99,
    generationId,
    avgCulturalRating: "4.00",
    avgSwingRating: "4.00",
    avgLinguisticRating: null,
    avgProductionRating: null,
    feedbackCount: 1,
    favoriteCount: 0,
    isGoldStandard: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ── rateGeneration — gold standard writes ────────────────────────────────────

describe("aiStudio.rateGeneration — rating ≥ 4 writes gold standard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getGenerationById).mockResolvedValue(makeGeneration() as any);
    vi.mocked(db.setGenerationRating).mockResolvedValue(undefined);
    vi.mocked(db.updateGeneration).mockResolvedValue(undefined);
    vi.mocked(db.upsertGoldStandard).mockResolvedValue(makeGoldStandard() as any);
    vi.mocked(culturalScoring.scoreCulturalAuthenticity).mockResolvedValue({
      overall: 78,
      breakdown: { rhythmicAuthenticity: 20, harmonicStructure: 18, productionQuality: 20, culturalElements: 20 },
      feedback: "Good",
      recommendations: [],
    });
  });

  it("rating=5 → upsertGoldStandard called, isGoldStandard=true returned", async () => {
    const caller = appRouter.createCaller(userCtx());
    const result = await caller.aiStudio.rateGeneration({ generationId: 1, rating: 5 });

    expect(result.isGoldStandard).toBe(true);
    expect(result.goldStandardId).toBe(99);
    expect(db.upsertGoldStandard).toHaveBeenCalledWith(
      expect.objectContaining({ generationId: 1, culturalRating: 5, swingRating: 5 })
    );
  });

  it("rating=4 → upsertGoldStandard called (threshold is inclusive)", async () => {
    const caller = appRouter.createCaller(userCtx());
    const result = await caller.aiStudio.rateGeneration({ generationId: 1, rating: 4 });

    expect(result.isGoldStandard).toBe(true);
    expect(db.upsertGoldStandard).toHaveBeenCalledTimes(1);
  });

  it("rating=3 → upsertGoldStandard NOT called, isGoldStandard=false", async () => {
    const caller = appRouter.createCaller(userCtx());
    const result = await caller.aiStudio.rateGeneration({ generationId: 1, rating: 3 });

    expect(result.isGoldStandard).toBe(false);
    expect(db.upsertGoldStandard).not.toHaveBeenCalled();
  });

  it("rating=1 → upsertGoldStandard NOT called", async () => {
    const caller = appRouter.createCaller(userCtx());
    const result = await caller.aiStudio.rateGeneration({ generationId: 1, rating: 1 });

    expect(result.isGoldStandard).toBe(false);
    expect(db.upsertGoldStandard).not.toHaveBeenCalled();
  });

  it("setGenerationRating always called regardless of rating value", async () => {
    const caller = appRouter.createCaller(userCtx());
    await caller.aiStudio.rateGeneration({ generationId: 1, rating: 2 });

    expect(db.setGenerationRating).toHaveBeenCalledWith(1, 2);
  });

  it("passes per-dimension ratings to upsertGoldStandard when provided", async () => {
    const caller = appRouter.createCaller(userCtx());
    await caller.aiStudio.rateGeneration({
      generationId: 1,
      rating: 5,
      swingRating: 4,
      linguisticRating: 3,
      productionRating: 5,
    });

    expect(db.upsertGoldStandard).toHaveBeenCalledWith(
      expect.objectContaining({
        culturalRating: 5,
        swingRating: 4,
        linguisticRating: 3,
        productionRating: 5,
      })
    );
  });

  it("uses overall rating as default swingRating when not provided", async () => {
    const caller = appRouter.createCaller(userCtx());
    await caller.aiStudio.rateGeneration({ generationId: 1, rating: 4 });

    expect(db.upsertGoldStandard).toHaveBeenCalledWith(
      expect.objectContaining({ culturalRating: 4, swingRating: 4 })
    );
  });

  it("throws NOT_FOUND when generation doesn't exist", async () => {
    vi.mocked(db.getGenerationById).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(userCtx());

    await expect(
      caller.aiStudio.rateGeneration({ generationId: 999, rating: 5 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND when generation belongs to different user", async () => {
    vi.mocked(db.getGenerationById).mockResolvedValue(makeGeneration({ userId: 99 }) as any);
    const caller = appRouter.createCaller(userCtx(42));

    await expect(
      caller.aiStudio.rateGeneration({ generationId: 1, rating: 5 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ── rateGeneration — auto-scoring on null culturalScore ──────────────────────

describe("aiStudio.rateGeneration — auto-scores when culturalScore is null", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.setGenerationRating).mockResolvedValue(undefined);
    vi.mocked(db.updateGeneration).mockResolvedValue(undefined);
    vi.mocked(db.upsertGoldStandard).mockResolvedValue(makeGoldStandard() as any);
  });

  it("calls scoreCulturalAuthenticity when culturalScore is null and rating ≥ 4", async () => {
    vi.mocked(db.getGenerationById).mockResolvedValue(makeGeneration({ culturalScore: null }) as any);
    vi.mocked(culturalScoring.scoreCulturalAuthenticity).mockResolvedValue({
      overall: 82,
      breakdown: {
        logDrumPresence: 17, pianoAuthenticity: 17, rhythmicSwing: 12,
        languageAuthenticity: 12, energyArc: 9, harmonicStructure: 9,
        timbreTexture: 4, productionEra: 2,
      },
      feedback: "Authentic",
      recommendations: [],
    });

    const caller = appRouter.createCaller(userCtx());
    await caller.aiStudio.rateGeneration({ generationId: 1, rating: 5 });

    expect(culturalScoring.scoreCulturalAuthenticity).toHaveBeenCalledWith(
      "https://s3.example.com/gen1.mp3",
      "Late night Amapiano with log drum",
      {}
    );
    expect(db.updateGeneration).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ culturalScore: "82" })
    );
  });

  it("does NOT call scoreCulturalAuthenticity when culturalScore already exists", async () => {
    vi.mocked(db.getGenerationById).mockResolvedValue(
      makeGeneration({ culturalScore: "75.50" }) as any
    );

    const caller = appRouter.createCaller(userCtx());
    await caller.aiStudio.rateGeneration({ generationId: 1, rating: 5 });

    expect(culturalScoring.scoreCulturalAuthenticity).not.toHaveBeenCalled();
  });

  it("does NOT call scoreCulturalAuthenticity when rating < 4", async () => {
    vi.mocked(db.getGenerationById).mockResolvedValue(makeGeneration({ culturalScore: null }) as any);

    const caller = appRouter.createCaller(userCtx());
    await caller.aiStudio.rateGeneration({ generationId: 1, rating: 3 });

    expect(culturalScoring.scoreCulturalAuthenticity).not.toHaveBeenCalled();
  });

  it("still writes gold standard even if auto-scoring throws", async () => {
    vi.mocked(db.getGenerationById).mockResolvedValue(makeGeneration({ culturalScore: null }) as any);
    vi.mocked(culturalScoring.scoreCulturalAuthenticity).mockRejectedValue(new Error("LLM timeout"));

    const caller = appRouter.createCaller(userCtx());
    // Should not throw — scoring failure is non-fatal
    const result = await caller.aiStudio.rateGeneration({ generationId: 1, rating: 5 });

    expect(result.isGoldStandard).toBe(true);
    expect(db.upsertGoldStandard).toHaveBeenCalled();
  });
});

// ── generate.webhook — auto-scoring on completion ────────────────────────────

describe("generate.webhook — T7 auto-scoring on completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.updateGeneration).mockResolvedValue(undefined);
    vi.mocked(db.getGenerationById).mockResolvedValue(makeGeneration() as any);
    vi.mocked(culturalScoring.scoreCulturalAuthenticity).mockResolvedValue({
      overall: 74,
      breakdown: { rhythmicAuthenticity: 18, harmonicStructure: 16, productionQuality: 20, culturalElements: 20 },
      feedback: "Good swing",
      recommendations: [],
    });
  });

  it("returns success=true on completion", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const result = await caller.generate.webhook({
      generationId: 1,
      jobId: "modal-job-abc",
      status: "completed",
      audioUrl: "https://s3.example.com/gen1.mp3",
    });

    expect(result.success).toBe(true);
  });

  it("always updates the generation record on completion", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.generate.webhook({
      generationId: 1,
      jobId: "modal-job-abc",
      status: "completed",
      audioUrl: "https://s3.example.com/gen1.mp3",
      culturalScore: 88,
    });

    expect(db.updateGeneration).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        status: "completed",
        resultUrl: "https://s3.example.com/gen1.mp3",
        culturalScore: "88",
      })
    );
  });

  it("webhook responds immediately (does not await auto-scoring)", async () => {
    // scoreCulturalAuthenticity is slow — webhook must not block on it
    let scoringResolved = false;
    vi.mocked(culturalScoring.scoreCulturalAuthenticity).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => { scoringResolved = true; resolve({ overall: 70, breakdown: {} as any, feedback: "", recommendations: [] }); }, 100))
    );

    const caller = appRouter.createCaller(publicCtx());
    const start = Date.now();
    await caller.generate.webhook({
      generationId: 1,
      jobId: "modal-job-xyz",
      status: "completed",
      audioUrl: "https://s3.example.com/gen1.mp3",
      // no culturalScore — triggers auto-scoring
    });
    const elapsed = Date.now() - start;

    // Webhook must return before the 100ms scoring delay
    expect(elapsed).toBeLessThan(80);
    expect(scoringResolved).toBe(false); // scoring still in-flight
  });

  it("failed generation does not trigger auto-scoring", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.generate.webhook({
      generationId: 1,
      jobId: "modal-job-fail",
      status: "failed",
      error: "GPU OOM",
    });

    // Give any fire-and-forget a tick to fire
    await new Promise(r => setTimeout(r, 10));
    expect(culturalScoring.scoreCulturalAuthenticity).not.toHaveBeenCalled();
  });

  it("does not trigger auto-scoring when Modal already provides culturalScore", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.generate.webhook({
      generationId: 1,
      jobId: "modal-job-scored",
      status: "completed",
      audioUrl: "https://s3.example.com/gen1.mp3",
      culturalScore: 88, // Modal already scored — no need to re-score
    });

    await new Promise(r => setTimeout(r, 10));
    expect(culturalScoring.scoreCulturalAuthenticity).not.toHaveBeenCalled();
  });
});

// ── Phase 0 exit criterion ────────────────────────────────────────────────────

describe("Phase 0 exit criterion — feedback loop closed", () => {
  it("rate(5) → upsertGoldStandard called — loop is closed", async () => {
    vi.clearAllMocks();
    vi.mocked(db.getGenerationById).mockResolvedValue(makeGeneration({ culturalScore: "82.00" }) as any);
    vi.mocked(db.setGenerationRating).mockResolvedValue(undefined);
    vi.mocked(db.updateGeneration).mockResolvedValue(undefined);
    vi.mocked(db.upsertGoldStandard).mockResolvedValue(makeGoldStandard() as any);

    const caller = appRouter.createCaller(userCtx());
    const result = await caller.aiStudio.rateGeneration({ generationId: 1, rating: 5 });

    // The OS feedback kernel: this is the row that makes the loop real
    expect(db.upsertGoldStandard).toHaveBeenCalledTimes(1);
    expect(result.isGoldStandard).toBe(true);
    expect(result.goldStandardId).toBeDefined();
  });
});
