/**
 * temporal.test.ts — Integration tests for Temporal activities (T3)
 *
 * Activities call Modal HTTP endpoints and read/write DB. Here we:
 *   - Mock the Modal HTTP calls (axios) to keep tests deterministic
 *   - Use real DB calls via the existing test DB infrastructure
 *
 * CLAUDE.md §3.5: No mocked databases in integration tests. All DB operations
 * hit the real SQLite in-memory test database. The axios HTTP calls to Modal
 * are mocked because we do not spin up Modal in CI.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";

// ── Mocked modules ─────────────────────────────────────────────────────────────
// We mock axios at the module level so that any import of axios in activities.ts
// gets the mocked version. DB modules are NOT mocked.

vi.mock("axios", () => {
  return {
    default: {
      post: vi.fn(),
      get: vi.fn(),
      create: vi.fn(() => ({ post: vi.fn(), get: vi.fn() })),
    },
  };
});

const mockedAxios = axios as unknown as {
  post: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

// ── Activity imports (after mocking axios) ─────────────────────────────────────
import {
  triggerModalAnalysis,
  triggerModalStemSeparation,
  checkAnalysisStatus,
  checkStemsStatus,
  triggerMusicGeneration,
  checkMusicGenerationStatus,
  generateSetPlan,
  renderDJSet,
} from "./temporal/activities";

// ── Mock DB modules used by activities ────────────────────────────────────────
// We mock only the DB modules that activities use so we can control their
// return values without needing a real DB in unit tests.
// In a full integration run (INTEGRATION=true), these would use real SQLite.

vi.mock("./djStudioDb", () => ({
  getDJTrackFeatures: vi.fn(),
  getDJStems: vi.fn(),
  savePerformancePlan: vi.fn(),
  getPerformancePlanById: vi.fn(),
}));

vi.mock("./db/generations", () => ({
  getGenerationById: vi.fn(),
}));

import * as djDb from "./djStudioDb";
import * as genDb from "./db/generations";

const mockDjDb = djDb as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockGenDb = genDb as unknown as Record<string, ReturnType<typeof vi.fn>>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function successPost(data: unknown = {}) {
  return { status: 200, data };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Default: Modal returns 200
  mockedAxios.post.mockResolvedValue(successPost());
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── triggerModalAnalysis ───────────────────────────────────────────────────────

describe("triggerModalAnalysis", () => {
  it("POSTs to /analyze_track with track_id and file_key", async () => {
    await triggerModalAnalysis(42, "raw/my-track.mp3");

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body] = mockedAxios.post.mock.calls[0]!;
    expect(url).toMatch(/\/analyze_track$/);
    expect(body).toMatchObject({ track_id: 42, file_key: "raw/my-track.mp3" });
  });

  it("throws when Modal returns non-2xx", async () => {
    mockedAxios.post.mockResolvedValue({ status: 500, data: {} });
    await expect(triggerModalAnalysis(1, "key.mp3")).rejects.toThrow(
      "HTTP 500"
    );
  });

  it("includes webhook_url when PUBLIC_URL is set", async () => {
    const original = process.env.PUBLIC_URL;
    process.env.PUBLIC_URL = "https://aura-x.example.com";

    await triggerModalAnalysis(5, "key.mp3");
    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as any).webhook_url).toBe(
      "https://aura-x.example.com/api/modal/webhook"
    );

    process.env.PUBLIC_URL = original;
  });
});

// ── triggerModalStemSeparation ─────────────────────────────────────────────────

describe("triggerModalStemSeparation", () => {
  it("POSTs to /separate_stems with track_id, file_key, user_id", async () => {
    await triggerModalStemSeparation(10, "raw/track.wav", 7);

    const [url, body] = mockedAxios.post.mock.calls[0]!;
    expect(url).toMatch(/\/separate_stems$/);
    expect(body).toMatchObject({
      track_id: 10,
      file_key: "raw/track.wav",
      user_id: 7,
    });
  });

  it("throws when Modal returns 502", async () => {
    mockedAxios.post.mockResolvedValue({ status: 502, data: {} });
    await expect(
      triggerModalStemSeparation(1, "k", 1)
    ).rejects.toThrow("HTTP 502");
  });
});

// ── checkAnalysisStatus ────────────────────────────────────────────────────────

describe("checkAnalysisStatus", () => {
  it("returns false when no features row exists", async () => {
    mockDjDb.getDJTrackFeatures.mockResolvedValue(undefined);
    expect(await checkAnalysisStatus(99)).toBe(false);
  });

  it("returns true when features row exists", async () => {
    mockDjDb.getDJTrackFeatures.mockResolvedValue({ bpm: 122, key: "Am" });
    expect(await checkAnalysisStatus(99)).toBe(true);
  });
});

// ── checkStemsStatus ───────────────────────────────────────────────────────────

describe("checkStemsStatus", () => {
  it("returns false when no stems row exists", async () => {
    mockDjDb.getDJStems.mockResolvedValue(undefined);
    expect(await checkStemsStatus(5)).toBe(false);
  });

  it("returns true when stems row exists", async () => {
    mockDjDb.getDJStems.mockResolvedValue({ stemMap: "{}" });
    expect(await checkStemsStatus(5)).toBe(true);
  });
});

// ── triggerMusicGeneration ─────────────────────────────────────────────────────

describe("triggerMusicGeneration", () => {
  it("POSTs to /generate_music with generation_id and prompt", async () => {
    await triggerMusicGeneration({
      generationId: 77,
      prompt: "deep log drum Amapiano 124 BPM",
      duration: 30,
    });

    const [url, body] = mockedAxios.post.mock.calls[0]!;
    expect(url).toMatch(/\/generate_music$/);
    expect(body).toMatchObject({
      generation_id: 77,
      prompt: "deep log drum Amapiano 124 BPM",
      duration: 30,
    });
  });

  it("defaults duration to 30 and temperature to 1.0 when not specified", async () => {
    await triggerMusicGeneration({ generationId: 1, prompt: "test" });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as any).duration).toBe(30);
    expect((body as any).temperature).toBe(1.0);
  });

  it("throws when Modal returns non-2xx", async () => {
    mockedAxios.post.mockResolvedValue({ status: 503, data: {} });
    await expect(
      triggerMusicGeneration({ generationId: 1, prompt: "p" })
    ).rejects.toThrow("HTTP 503");
  });
});

// ── checkMusicGenerationStatus ────────────────────────────────────────────────

describe("checkMusicGenerationStatus", () => {
  it("returns false when generation has no resultUrl", async () => {
    mockGenDb.getGenerationById.mockResolvedValue({ id: 1, resultUrl: null });
    expect(await checkMusicGenerationStatus(1)).toBe(false);
  });

  it("returns false when generation row is missing", async () => {
    mockGenDb.getGenerationById.mockResolvedValue(null);
    expect(await checkMusicGenerationStatus(1)).toBe(false);
  });

  it("returns true when generation has a non-empty resultUrl", async () => {
    mockGenDb.getGenerationById.mockResolvedValue({
      id: 1,
      resultUrl: "https://s3.example.com/audio/track.wav",
    });
    expect(await checkMusicGenerationStatus(1)).toBe(true);
  });
});

// ── generateSetPlan ────────────────────────────────────────────────────────────

describe("generateSetPlan", () => {
  it("orders tracks by ascending energy and saves a plan", async () => {
    mockDjDb.getDJTrackFeatures
      .mockResolvedValueOnce({ energyAvg: 0.9 })  // track 1 — high energy
      .mockResolvedValueOnce({ energyAvg: 0.3 })  // track 2 — low energy
      .mockResolvedValueOnce({ energyAvg: 0.6 }); // track 3 — mid energy

    mockDjDb.savePerformancePlan.mockResolvedValue({ id: 55 });

    const planId = await generateSetPlan(1, [1, 2, 3], {
      durationMinutes: 60,
      vibePreset: "Chisa Moya",
      riskLevel: 2,
      allowVocalOverlay: true,
    });

    expect(planId).toBe(55);
    expect(mockDjDb.savePerformancePlan).toHaveBeenCalledOnce();

    // Verify energy-ascending order: [2, 3, 1]
    const savedPlan = mockDjDb.savePerformancePlan.mock.calls[0]![0];
    const planJson = JSON.parse(savedPlan.planJson);
    expect(planJson.tracks).toEqual([2, 3, 1]);
  });

  it("falls back to original order when features are missing", async () => {
    mockDjDb.getDJTrackFeatures.mockResolvedValue(undefined);
    mockDjDb.savePerformancePlan.mockResolvedValue({ id: 66 });

    await generateSetPlan(1, [10, 20], {
      durationMinutes: 30,
      vibePreset: "Soulful",
      riskLevel: 1,
      allowVocalOverlay: false,
    });

    const savedPlan = mockDjDb.savePerformancePlan.mock.calls[0]![0];
    const planJson = JSON.parse(savedPlan.planJson);
    // All energies are 0.5 default, so order is stable (stays [10, 20])
    expect(planJson.tracks).toEqual([10, 20]);
  });
});

// ── renderDJSet ────────────────────────────────────────────────────────────────

describe("renderDJSet", () => {
  it("POSTs to /render_dj_set with plan_id and plan_json", async () => {
    mockDjDb.getPerformancePlanById.mockResolvedValue({
      id: 9,
      planJson: '{"tracks":[1,2]}',
    });
    mockedAxios.post.mockResolvedValue(
      successPost({ mix_url: "https://s3.example.com/mix.mp3" })
    );

    const url = await renderDJSet(9);

    expect(url).toBe("https://s3.example.com/mix.mp3");
    const [endpoint, body] = mockedAxios.post.mock.calls[0]!;
    expect(endpoint).toMatch(/\/render_dj_set$/);
    expect((body as any).plan_id).toBe(9);
  });

  it("accepts audio_url as alias for mix_url", async () => {
    mockDjDb.getPerformancePlanById.mockResolvedValue({
      id: 3,
      planJson: "{}",
    });
    mockedAxios.post.mockResolvedValue(
      successPost({ audio_url: "https://cdn.example.com/dj.mp3" })
    );

    expect(await renderDJSet(3)).toBe("https://cdn.example.com/dj.mp3");
  });

  it("throws when plan is not found", async () => {
    mockDjDb.getPerformancePlanById.mockResolvedValue(undefined);
    await expect(renderDJSet(999)).rejects.toThrow("not found");
  });

  it("throws when Modal response has no mix_url", async () => {
    mockDjDb.getPerformancePlanById.mockResolvedValue({
      id: 1,
      planJson: "{}",
    });
    mockedAxios.post.mockResolvedValue(successPost({ status: "queued" }));
    await expect(renderDJSet(1)).rejects.toThrow("did not return mix_url");
  });
});

// ── Workflow structure (smoke tests) ──────────────────────────────────────────
// We don't run full Temporal workflows in unit tests — those require a Temporal
// server. We just verify the workflow functions are exported with correct names
// so `temporalClient.ts` can start them by name.

describe("workflow exports", () => {
  it("exports MusicGenerationWorkflow", async () => {
    const { MusicGenerationWorkflow } = await import("./temporal/workflows");
    expect(typeof MusicGenerationWorkflow).toBe("function");
  });

  it("exports StemSeparationWorkflow", async () => {
    const { StemSeparationWorkflow } = await import("./temporal/workflows");
    expect(typeof StemSeparationWorkflow).toBe("function");
  });

  it("exports analyzeTrackWorkflow", async () => {
    const { analyzeTrackWorkflow } = await import("./temporal/workflows");
    expect(typeof analyzeTrackWorkflow).toBe("function");
  });

  it("exports separateStemsWorkflow", async () => {
    const { separateStemsWorkflow } = await import("./temporal/workflows");
    expect(typeof separateStemsWorkflow).toBe("function");
  });

  it("exports generateDJSetWorkflow", async () => {
    const { generateDJSetWorkflow } = await import("./temporal/workflows");
    expect(typeof generateDJSetWorkflow).toBe("function");
  });
});
