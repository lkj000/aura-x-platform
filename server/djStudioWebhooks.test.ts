/**
 * djStudioWebhooks.test.ts — DJ Studio Modal webhook handler tests
 *
 * Tests the three public webhook endpoints called by Modal:
 *   analysisComplete — Amapiano audio analysis (BPM, key, swing, log drum, etc.)
 *   stemsComplete    — 26-stem separation result
 *   renderComplete   — DJ set render result
 *
 * `djStudioDb` is mocked — no live database required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock DJ Studio DB layer ───────────────────────────────────────────────────

vi.mock("./djStudioDb", () => ({
  saveDJTrackFeatures: vi.fn(),
  getDJTrackFeatures: vi.fn(),
  updateDJTrackFeatures: vi.fn(),
  updateDJTrackDuration: vi.fn(),
  saveDJStems: vi.fn(),
  getDJStems: vi.fn(),
  updateRenderComplete: vi.fn(),
  createDJTrack: vi.fn(),
  getUserDJTracks: vi.fn(),
  getDJTrackById: vi.fn(),
  deleteDJTrack: vi.fn(),
  findDJTrackByHash: vi.fn(),
  savePerformancePlan: vi.fn(),
  getUserPerformancePlans: vi.fn(),
  getPerformancePlanById: vi.fn(),
  createDJRender: vi.fn(),
  updateDJRenderStatus: vi.fn(),
  getDJRenderById: vi.fn(),
  getPlanRenders: vi.fn(),
  getAllVibePresets: vi.fn(),
  getVibePresetByName: vi.fn(),
  incrementPresetUsage: vi.fn(),
}));

import * as djDb from "./djStudioDb";

function publicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const caller = () => appRouter.createCaller(publicCtx());

// ── analysisComplete ──────────────────────────────────────────────────────────

describe("djStudioWebhooks.analysisComplete", () => {
  beforeEach(() => {
    vi.mocked(djDb.saveDJTrackFeatures).mockResolvedValue({ id: 1 } as any);
    vi.mocked(djDb.updateDJTrackDuration).mockResolvedValue(undefined as any);
  });

  it("saves all standard analysis fields", async () => {
    const result = await caller().djStudioWebhooks.analysisComplete({
      track_id: 10,
      duration_sec: 245.8,
      bpm: 122.0,
      bpm_confidence: 0.97,
      key: "Bb",
      camelot_key: "6A",
      energy_curve: [0.5, 0.6, 0.7, 0.8],
      energy_avg: 0.65,
      lufs: -10.5,
      true_peak: 0.98,
      segments: [{ type: "beat", start: 0, end: 0.49 }],
    });

    expect(result.success).toBe(true);
    expect(result.trackId).toBe(10);
    expect(djDb.saveDJTrackFeatures).toHaveBeenCalledWith(
      expect.objectContaining({
        trackId: 10,
        bpm: 122.0,
        key: "Bb",
        camelotKey: "6A",
      })
    );
  });

  it("saves Amapiano-specific fields (swing, log drum, piano, cultural score)", async () => {
    await caller().djStudioWebhooks.analysisComplete({
      track_id: 11,
      duration_sec: 200,
      bpm: 124,
      bpm_confidence: 0.95,
      key: "F",
      camelot_key: "4A",
      energy_curve: [0.7],
      energy_avg: 0.7,
      lufs: -11,
      true_peak: 0.95,
      segments: [],
      // Amapiano fields
      swing_percent: 57.3,
      log_drum_detected: true,
      log_drum_freq_hz: 63.5,
      log_drum_prominence: 0.21,
      piano_complexity: 0.78,
      flute_detected: true,
      cultural_score: 82,
      cultural_score_breakdown: { logDrum: 18, piano: 16, swing: 13 },
      detected_language: "zul",
      language_confidence: 0.88,
      detected_languages: ["zul", "eng"],
      regional_style: "Gauteng",
      production_era: "modern",
    });

    expect(djDb.saveDJTrackFeatures).toHaveBeenCalledWith(
      expect.objectContaining({
        swingPercent: 57.3,
        logDrumDetected: true,
        logDrumFreqHz: 63.5,
        pianoComplexity: 0.78,
        fluteDetected: true,
        culturalScore: 82,
        detectedLanguage: "zul",
        regionalStyle: "Gauteng",
        productionEra: "modern",
      })
    );
  });

  it("updates track duration when duration_sec > 0", async () => {
    await caller().djStudioWebhooks.analysisComplete({
      track_id: 12,
      duration_sec: 195.5,
      bpm: 120,
      bpm_confidence: 0.9,
      key: "C",
      camelot_key: "8A",
      energy_curve: [],
      energy_avg: 0.5,
      lufs: -12,
      true_peak: 0.9,
      segments: [],
    });

    expect(djDb.updateDJTrackDuration).toHaveBeenCalledWith(12, 195.5);
  });

  it("does not call updateDJTrackDuration when duration_sec = 0", async () => {
    vi.clearAllMocks();
    vi.mocked(djDb.saveDJTrackFeatures).mockResolvedValue({ id: 1 } as any);
    vi.mocked(djDb.updateDJTrackDuration).mockResolvedValue(undefined as any);

    await caller().djStudioWebhooks.analysisComplete({
      track_id: 13,
      duration_sec: 0,
      bpm: 118,
      bpm_confidence: 0.9,
      key: "A",
      camelot_key: "8A",
      energy_curve: [],
      energy_avg: 0.4,
      lufs: -13,
      true_peak: 0.85,
      segments: [],
    });

    expect(djDb.updateDJTrackDuration).not.toHaveBeenCalled();
  });
});

// ── stemsComplete ─────────────────────────────────────────────────────────────

describe("djStudioWebhooks.stemsComplete", () => {
  beforeEach(() => {
    vi.mocked(djDb.saveDJStems).mockResolvedValue({ id: 1 } as any);
  });

  it("saves priority stems in individual columns", async () => {
    const result = await caller().djStudioWebhooks.stemsComplete({
      track_id: 20,
      model_version: "htdemucs_6s",
      separation_pass_count: 2,
      avg_sdr_db: 9.2,
      stem_map: {
        log_drum: { url: "https://s3.example.com/log_drum.wav", key: "dj-stems/1/20/log_drum.wav", sdr_db: 9.1 },
        kick: { url: "https://s3.example.com/kick.wav", key: "dj-stems/1/20/kick.wav", sdr_db: 10.2 },
        piano_chords: { url: "https://s3.example.com/piano.wav", key: "dj-stems/1/20/piano_chords.wav", sdr_db: 8.5 },
        bass_synth: { url: "https://s3.example.com/bass.wav", key: "dj-stems/1/20/bass_synth.wav", sdr_db: 11.0 },
        lead_vocal: { url: "https://s3.example.com/vocal.wav", key: "dj-stems/1/20/lead_vocal.wav", sdr_db: 12.1 },
        flute: { url: "https://s3.example.com/flute.wav", key: "dj-stems/1/20/flute.wav", sdr_db: 7.8 },
      },
    });

    expect(result.success).toBe(true);
    expect(result.stemsStored).toBe(6);
    expect(djDb.saveDJStems).toHaveBeenCalledWith(
      expect.objectContaining({
        trackId: 20,
        logDrumUrl: "https://s3.example.com/log_drum.wav",
        logDrumKey: "dj-stems/1/20/log_drum.wav",
        logDrumSdrDb: 9.1,
        pianoChordUrl: "https://s3.example.com/piano.wav",
        leadVocalUrl: "https://s3.example.com/vocal.wav",
        modelVersion: "htdemucs_6s",
        separationPassCount: 2,
        avgSdrDb: 9.2,
        stemsCompleted: 6,
      })
    );
  });

  it("serializes full stem map to JSON", async () => {
    const stemMap = {
      log_drum: { url: "https://s3.example.com/ld.wav", key: "ld.wav" },
      kick: { url: "https://s3.example.com/kick.wav", key: "kick.wav" },
    };

    await caller().djStudioWebhooks.stemsComplete({
      track_id: 21,
      model_version: "htdemucs_6s",
      stem_map: stemMap,
    });

    expect(djDb.saveDJStems).toHaveBeenCalledWith(
      expect.objectContaining({
        stemMap: JSON.stringify(stemMap),
      })
    );
  });

  it("handles stems with no sdr_db (optional field)", async () => {
    const result = await caller().djStudioWebhooks.stemsComplete({
      track_id: 22,
      model_version: "htdemucs_ft",
      stem_map: {
        log_drum: { url: "https://s3.example.com/ld.wav", key: "ld.wav" },
        // No sdr_db
      },
    });

    expect(result.success).toBe(true);
    expect(djDb.saveDJStems).toHaveBeenCalledWith(
      expect.objectContaining({
        logDrumSdrDb: undefined,
      })
    );
  });
});

// ── renderComplete ────────────────────────────────────────────────────────────

describe("djStudioWebhooks.renderComplete", () => {
  beforeEach(() => {
    vi.mocked(djDb.updateRenderComplete).mockResolvedValue(undefined as any);
  });

  it("marks render as complete with mix and cue sheet URLs", async () => {
    const result = await caller().djStudioWebhooks.renderComplete({
      plan_id: 5,
      mix_url: "https://s3.example.com/mix.mp3",
      mix_key: "dj-renders/1/5/mix.mp3",
      cue_sheet_url: "https://s3.example.com/cuesheet.json",
      cue_sheet_key: "dj-renders/1/5/cuesheet.json",
      render_time_sec: 45.2,
    });

    expect(result.success).toBe(true);
    expect(djDb.updateRenderComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: 5,
        mixUrl: "https://s3.example.com/mix.mp3",
        mixKey: "dj-renders/1/5/mix.mp3",
        cueSheetUrl: "https://s3.example.com/cuesheet.json",
        renderTimeSec: 45.2,
      })
    );
  });

  it("works without optional cue sheet fields", async () => {
    const result = await caller().djStudioWebhooks.renderComplete({
      plan_id: 6,
      mix_url: "https://s3.example.com/mix2.mp3",
      mix_key: "dj-renders/1/6/mix.mp3",
    });

    expect(result.success).toBe(true);
  });
});

// ── T10: Groove fingerprint storage ───────────────────────────────────────────

describe("djStudioWebhooks.analysisComplete — T10 groove fingerprint", () => {
  beforeEach(() => {
    vi.mocked(djDb.saveDJTrackFeatures).mockResolvedValue({ id: 1 } as any);
    vi.mocked(djDb.updateDJTrackDuration).mockResolvedValue(undefined as any);
  });

  it("serialises groove_fingerprint to JSON and writes grooveFingerprint column", async () => {
    const fingerprint = {
      combined: Array.from({ length: 512 }, (_, i) => i % 20 - 10), // dummy deviations
      metricalStrength: 0.73,
      barsAnalysed: 32,
    };

    await caller().djStudioWebhooks.analysisComplete({
      track_id: 20,
      duration_sec: 320,
      bpm: 122,
      bpm_confidence: 0.95,
      key: "Am",
      camelot_key: "8A",
      energy_curve: [0.6, 0.7],
      energy_avg: 0.65,
      lufs: -11,
      true_peak: 0.97,
      segments: [],
      groove_fingerprint: fingerprint,
    });

    expect(djDb.saveDJTrackFeatures).toHaveBeenCalledWith(
      expect.objectContaining({
        grooveFingerprint: JSON.stringify(fingerprint),
      })
    );
  });

  it("serialises log_drum_syncopation_map and writes logDrumSyncopationMap column", async () => {
    const syncMap = {
      pattern: "E(3,16)",
      onsetOffsets: [0.032, 0.281, 0.531],
      kickRelativeOffsets: [-0.063, 0.156, 0.344],
      metricalStrength: 0.72,
    };

    await caller().djStudioWebhooks.analysisComplete({
      track_id: 21,
      duration_sec: 250,
      bpm: 124,
      bpm_confidence: 0.96,
      key: "Dm",
      camelot_key: "7A",
      energy_curve: [0.7],
      energy_avg: 0.7,
      lufs: -10,
      true_peak: 0.98,
      segments: [],
      log_drum_syncopation_map: syncMap,
    });

    expect(djDb.saveDJTrackFeatures).toHaveBeenCalledWith(
      expect.objectContaining({
        logDrumSyncopationMap: JSON.stringify(syncMap),
      })
    );
  });

  it("omits grooveFingerprint write when not provided by Modal", async () => {
    await caller().djStudioWebhooks.analysisComplete({
      track_id: 22,
      duration_sec: 200,
      bpm: 120,
      bpm_confidence: 0.9,
      key: "Gm",
      camelot_key: "6A",
      energy_curve: [],
      energy_avg: 0.5,
      lufs: -12,
      true_peak: 0.9,
      segments: [],
      // groove_fingerprint intentionally omitted
    });

    const call = vi.mocked(djDb.saveDJTrackFeatures).mock.calls[0]?.[0] as any;
    // undefined is acceptable — column stays null in DB
    expect(call.grooveFingerprint).toBeUndefined();
  });
});

// ── T11: Contrast Score storage ───────────────────────────────────────────────

describe("djStudioWebhooks.analysisComplete — T11 Contrast Score", () => {
  beforeEach(() => {
    vi.mocked(djDb.saveDJTrackFeatures).mockResolvedValue({ id: 1 } as any);
    vi.mocked(djDb.updateDJTrackDuration).mockResolvedValue(undefined as any);
  });

  it("writes contrast_score to contrastScore column", async () => {
    await caller().djStudioWebhooks.analysisComplete({
      track_id: 30,
      duration_sec: 280,
      bpm: 126,
      bpm_confidence: 0.95,
      key: "Cm",
      camelot_key: "5A",
      energy_curve: [0.8],
      energy_avg: 0.8,
      lufs: -10,
      true_peak: 0.99,
      segments: [],
      swing_percent: 60.0,
      contrast_score: 148.5,
      contrast_score_label: "mainstream",
    });

    expect(djDb.saveDJTrackFeatures).toHaveBeenCalledWith(
      expect.objectContaining({
        contrastScore: 148.5,
      })
    );
  });

  it("stores 0 Contrast Score without error (soulful track)", async () => {
    await caller().djStudioWebhooks.analysisComplete({
      track_id: 31,
      duration_sec: 360,
      bpm: 116,
      bpm_confidence: 0.91,
      key: "Am",
      camelot_key: "8A",
      energy_curve: [0.4],
      energy_avg: 0.4,
      lufs: -14,
      true_peak: 0.85,
      segments: [],
      swing_percent: 51.0,
      contrast_score: 12.4,
      contrast_score_label: "soulful",
    });

    expect(djDb.saveDJTrackFeatures).toHaveBeenCalledWith(
      expect.objectContaining({ contrastScore: 12.4 })
    );
  });

  it("omits contrastScore write when not provided by Modal", async () => {
    await caller().djStudioWebhooks.analysisComplete({
      track_id: 32,
      duration_sec: 200,
      bpm: 120,
      bpm_confidence: 0.9,
      key: "Am",
      camelot_key: "8A",
      energy_curve: [],
      energy_avg: 0.5,
      lufs: -12,
      true_peak: 0.9,
      segments: [],
    });

    const call = vi.mocked(djDb.saveDJTrackFeatures).mock.calls[0]?.[0] as any;
    expect(call.contrastScore).toBeUndefined();
  });
});

// ── shared/contrastScore.ts unit tests ────────────────────────────────────────

import { computeContrastScore, classifyContrastScore } from "../shared/contrastScore";

describe("computeContrastScore", () => {
  it("returns 0 for a perfectly soulful track (minimum inputs)", () => {
    const result = computeContrastScore({
      swingPercent: 53,   // swing_deviation = 0
      bpm: 112,           // bpm_normalized = 0
      logDrumAttackCentroidHz: 180, // attack_sharpness = 0
      avgPianoChordNoteCount: 1,    // piano_density = 0
    });
    expect(result.score).toBe(0);
    expect(result.label).toBe("soulful");
  });

  it("returns 200 for a maximum Sgija track", () => {
    const result = computeContrastScore({
      swingPercent: 67,   // swing_deviation = clamp(1, 0, 1) = 1 → ×100 = 100
      bpm: 132,           // bpm_normalized = clamp(1, 0, 1) = 1 → ×50 = 50
      logDrumAttackCentroidHz: 600, // attack_sharpness = 1 → ×30 = 30
      avgPianoChordNoteCount: 7,    // piano_density = 1 → ×20 = 20
    });
    expect(result.score).toBe(200);
    expect(result.label).toBe("sgija");
  });

  it("classifies a Gauteng mainstream track correctly (~120 BPM, 57% swing)", () => {
    const result = computeContrastScore({
      swingPercent: 57,   // swing_deviation = (57-53)/14 ≈ 0.286 → ×100 ≈ 28.6
      bpm: 122,           // bpm_normalized = (122-112)/20 = 0.5 → ×50 = 25
      logDrumAttackCentroidHz: 350, // sharpness = (350-180)/420 ≈ 0.405 → ×30 ≈ 12.1
      avgPianoChordNoteCount: 4,    // density = (4-1)/6 = 0.5 → ×20 = 10
    });
    // total ≈ 28.6 + 25 + 12.1 + 10 = 75.7 → mainstream
    expect(result.score).toBeGreaterThan(75);
    expect(result.score).toBeLessThan(150);
    expect(result.label).toBe("mainstream");
  });

  it("returns breakdown with correct variable contributions", () => {
    const result = computeContrastScore({
      swingPercent: 53,
      bpm: 112,
      logDrumAttackCentroidHz: 180,
      avgPianoChordNoteCount: 1,
    });
    expect(result.breakdown.swingContrib).toBe(0);
    expect(result.breakdown.bpmContrib).toBe(0);
    expect(result.breakdown.logDrumContrib).toBe(0);
    expect(result.breakdown.pianoContrib).toBe(0);
  });

  it("clamps swing_deviation at 1.0 when swing > 67%", () => {
    const result = computeContrastScore({
      swingPercent: 80, // way above max
      bpm: 112,
      logDrumAttackCentroidHz: 180,
      avgPianoChordNoteCount: 1,
    });
    expect(result.breakdown.swingDeviation).toBe(1);
    expect(result.breakdown.swingContrib).toBe(100);
  });
});

describe("classifyContrastScore", () => {
  it("classifies 0 as soulful", () => expect(classifyContrastScore(0)).toBe("soulful"));
  it("classifies 75 as soulful", () => expect(classifyContrastScore(75)).toBe("soulful"));
  it("classifies 76 as mainstream", () => expect(classifyContrastScore(76)).toBe("mainstream"));
  it("classifies 149 as mainstream", () => expect(classifyContrastScore(149)).toBe("mainstream"));
  it("classifies 150 as sgija", () => expect(classifyContrastScore(150)).toBe("sgija"));
  it("classifies 200 as sgija", () => expect(classifyContrastScore(200)).toBe("sgija"));
});
