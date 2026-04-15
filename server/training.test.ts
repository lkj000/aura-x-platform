/**
 * training.test.ts — Training data ingestion pipeline router tests
 *
 * Tests the admin-only training router:
 *  - ingestTrack  (SHA-256 dedup, S3 upload, DB record)
 *  - labelTrack   (cultural score computation, eligibility threshold)
 *  - analysisWebhook / stemsWebhook (Modal callback handlers)
 *  - listTracks / getPipelineStats (query endpoints)
 *
 * DB and storage are mocked — no live database or S3 required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock DB layer ─────────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  ingestTrainingTrack: vi.fn(),
  getTrainingTrack: vi.fn(),
  updateTrainingTrackStatus: vi.fn(),
  updateTrainingTrackFeatures: vi.fn(),
  listTrainingTracks: vi.fn(),
  getTrainingPipelineStats: vi.fn(),
  createTrainingLabel: vi.fn(),
  getTrainingLabel: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn(),
  storageGet: vi.fn(),
  storageDelete: vi.fn(),
}));

import * as db from "./db";
import * as storage from "./storage";

// ── Context factories ─────────────────────────────────────────────────────────

function adminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-openid",
      email: "admin@aura-x.com",
      name: "Admin User",
      role: "admin",
      loginMethod: "email",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function userCtx(): TrpcContext {
  return {
    ...adminCtx(),
    user: { ...adminCtx().user!, role: "user" },
  };
}

// ── ingestTrack ───────────────────────────────────────────────────────────────

describe("training.ingestTrack", () => {
  const caller = () => appRouter.createCaller(adminCtx());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storage.storagePut).mockResolvedValue({
      key: "training-data/amapiano/raw/abc123.mp3",
      url: "https://s3.example.com/training-data/amapiano/raw/abc123.mp3",
    });
    vi.mocked(db.updateTrainingTrackFeatures).mockResolvedValue(undefined as any);
  });

  it("creates a new track record and uploads to S3", async () => {
    const fakeTrack = { id: 42, rawFileKey: "training-data/amapiano/raw/aabbcc.mp3" };
    vi.mocked(db.ingestTrainingTrack).mockResolvedValue({
      track: fakeTrack as any,
      isNew: true,
    });

    const result = await caller().training.ingestTrack({
      fileName: "umculo_wami.mp3",
      fileType: "mp3",
      fileSize: 5_000_000,
      fileData: Buffer.from("fake audio data").toString("base64"),
      artist: "Kabza De Small",
      year: 2023,
    });

    expect(result.isDuplicate).toBe(false);
    expect(result.trackId).toBe(42);
    expect(result.sha256).toBeDefined();
    expect(typeof result.sha256).toBe("string");
    expect(storage.storagePut).toHaveBeenCalled();
  });

  it("returns isDuplicate=true for already-ingested SHA-256", async () => {
    const existingTrack = { id: 7, rawFileKey: "training-data/amapiano/raw/exist.mp3" };
    vi.mocked(db.ingestTrainingTrack).mockResolvedValue({
      track: existingTrack as any,
      isNew: false,
    });

    const result = await caller().training.ingestTrack({
      fileName: "duplicate.mp3",
      fileType: "mp3",
      fileSize: 3_000_000,
      fileData: Buffer.from("same audio").toString("base64"),
    });

    expect(result.isDuplicate).toBe(true);
    expect(result.trackId).toBe(7);
    // S3 upload should NOT be called for duplicates
    expect(storage.storagePut).not.toHaveBeenCalled();
  });

  it("rejects non-admin users with FORBIDDEN", async () => {
    const c = appRouter.createCaller(userCtx());
    await expect(
      c.training.ingestTrack({
        fileName: "attempt.mp3",
        fileType: "mp3",
        fileSize: 1_000_000,
        fileData: Buffer.from("data").toString("base64"),
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("validates fileType enum — rejects invalid type", async () => {
    await expect(
      caller().training.ingestTrack({
        fileName: "bad.ogg",
        fileType: "ogg" as any,
        fileSize: 1_000_000,
        fileData: Buffer.from("data").toString("base64"),
      })
    ).rejects.toThrow();
  });

  it("validates year range — rejects year outside 2010–2030", async () => {
    await expect(
      caller().training.ingestTrack({
        fileName: "old.mp3",
        fileType: "mp3",
        fileSize: 1_000_000,
        fileData: Buffer.from("data").toString("base64"),
        year: 2005,
      })
    ).rejects.toThrow();
  });
});

// ── labelTrack ────────────────────────────────────────────────────────────────

describe("training.labelTrack — cultural score computation", () => {
  const caller = () => appRouter.createCaller(adminCtx());

  beforeEach(() => {
    const track = { id: 10, status: "stems_separated" };
    vi.mocked(db.getTrainingTrack).mockResolvedValue(track as any);
    vi.mocked(db.createTrainingLabel).mockImplementation(async (label) => ({
      id: 99,
      ...label,
    } as any));
  });

  it("sums cultural breakdown correctly and flags eligible tracks", async () => {
    const result = await caller().training.labelTrack({
      trackId: 10,
      stemQualityRatings: {
        log_drum: 0.9,
        piano_chords: 0.85,
        lead_vocal: 0.8,
      },
      culturalBreakdown: {
        logDrum: 18,     // /20
        piano: 17,       // /20
        swing: 13,       // /15
        language: 12,    // /15
        energyArc: 9,    // /10
        harmonic: 9,     // /10
        timbre: 4,       // /5
        era: 4,          // /5
      },
    });

    expect(result.totalCulturalScore).toBe(86); // 18+17+13+12+9+9+4+4
    expect(result.avgStemQuality).toBeCloseTo(0.85, 2);
    expect(result.isEligibleForTraining).toBe(true); // ≥0.7 avg AND ≥60 cultural
  });

  it("marks NOT eligible when avgStemQuality < 0.7", async () => {
    const result = await caller().training.labelTrack({
      trackId: 10,
      stemQualityRatings: { log_drum: 0.5, piano_chords: 0.6 },
      culturalBreakdown: {
        logDrum: 18, piano: 17, swing: 13, language: 12,
        energyArc: 9, harmonic: 9, timbre: 4, era: 4,
      },
    });
    expect(result.isEligibleForTraining).toBe(false);
  });

  it("marks NOT eligible when totalCulturalScore < 60", async () => {
    const result = await caller().training.labelTrack({
      trackId: 10,
      stemQualityRatings: { log_drum: 0.9, piano_chords: 0.9 },
      culturalBreakdown: {
        logDrum: 5, piano: 5, swing: 5, language: 5,
        energyArc: 5, harmonic: 5, timbre: 2, era: 2,
      },
    });
    expect(result.isEligibleForTraining).toBe(false);
    expect(result.totalCulturalScore).toBe(34); // below 60
  });

  it("correctly sums all 8 cultural breakdown dimensions", async () => {
    // Each axis at maximum
    const result = await caller().training.labelTrack({
      trackId: 10,
      stemQualityRatings: { log_drum: 1.0 },
      culturalBreakdown: {
        logDrum: 20, piano: 20, swing: 15, language: 15,
        energyArc: 10, harmonic: 10, timbre: 5, era: 5,
      },
    });
    expect(result.totalCulturalScore).toBe(100);
  });

  it("validates culturalBreakdown max values", async () => {
    await expect(
      caller().training.labelTrack({
        trackId: 10,
        stemQualityRatings: {},
        culturalBreakdown: {
          logDrum: 21,  // > 20 — invalid
          piano: 20, swing: 15, language: 15,
          energyArc: 10, harmonic: 10, timbre: 5, era: 5,
        },
      })
    ).rejects.toThrow();
  });
});

// ── analysisWebhook ───────────────────────────────────────────────────────────

describe("training.analysisWebhook", () => {
  const caller = () => appRouter.createCaller(adminCtx());

  beforeEach(() => {
    vi.mocked(db.updateTrainingTrackStatus).mockResolvedValue(undefined as any);
  });

  it("updates track to features_extracted status with BPM/key/swing", async () => {
    const result = await caller().training.analysisWebhook({
      training_track_id: 5,
      bpm: 122.3,
      key: "Bb",
      scale: "minor",
      swing_percent: 57.2,
      lufs: -10.5,
      duration_sec: 245.8,
      cultural_score: 78,
      detected_language: "zul",
      detected_languages: ["zul", "eng"],
      regional_style: "Gauteng",
    });

    expect(result.success).toBe(true);
    expect(db.updateTrainingTrackStatus).toHaveBeenCalledWith(
      5,
      "features_extracted",
      expect.objectContaining({
        bpm: 122.3,
        key: "Bb",
        swingPercent: 57.2,
        culturalScore: 78,
        detectedLanguage: "zul",
        regionalStyle: "Gauteng",
      })
    );
  });

  it("handles webhook without optional fields", async () => {
    const result = await caller().training.analysisWebhook({
      training_track_id: 6,
      bpm: 120,
      key: "F#",
      lufs: -14,
      duration_sec: 180,
    });
    expect(result.success).toBe(true);
  });
});

// ── stemsWebhook ──────────────────────────────────────────────────────────────

describe("training.stemsWebhook", () => {
  const caller = () => appRouter.createCaller(adminCtx());

  beforeEach(() => {
    vi.mocked(db.updateTrainingTrackStatus).mockResolvedValue(undefined as any);
  });

  it("marks track as stems_separated with hasCleanStems=true when avg_sdr_db ≥ 8", async () => {
    await caller().training.stemsWebhook({
      training_track_id: 11,
      stems_completed: 26,
      avg_sdr_db: 9.5,
    });

    expect(db.updateTrainingTrackStatus).toHaveBeenCalledWith(
      11,
      "stems_separated",
      expect.objectContaining({ hasCleanStems: true })
    );
  });

  it("marks hasCleanStems=false when avg_sdr_db < 8", async () => {
    await caller().training.stemsWebhook({
      training_track_id: 12,
      stems_completed: 20,
      avg_sdr_db: 5.0,
    });

    expect(db.updateTrainingTrackStatus).toHaveBeenCalledWith(
      12,
      "stems_separated",
      expect.objectContaining({ hasCleanStems: false })
    );
  });

  it("handles missing avg_sdr_db gracefully (defaults to 0 → not clean)", async () => {
    await caller().training.stemsWebhook({
      training_track_id: 13,
      stems_completed: 15,
    });

    expect(db.updateTrainingTrackStatus).toHaveBeenCalledWith(
      13,
      "stems_separated",
      expect.objectContaining({ hasCleanStems: false })
    );
  });
});

// ── listTracks ────────────────────────────────────────────────────────────────

describe("training.listTracks", () => {
  const caller = () => appRouter.createCaller(adminCtx());

  it("returns tracks from DB with default pagination", async () => {
    const fakeTracks = [{ id: 1, name: "track1.mp3" }, { id: 2, name: "track2.flac" }];
    vi.mocked(db.listTrainingTracks).mockResolvedValue(fakeTracks as any);

    const result = await caller().training.listTracks({});
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  it("passes status filter to DB", async () => {
    vi.mocked(db.listTrainingTracks).mockResolvedValue([]);

    await caller().training.listTracks({ status: "labeled" });
    expect(db.listTrainingTracks).toHaveBeenCalledWith(
      expect.objectContaining({ status: "labeled" })
    );
  });

  it("passes eligibleOnly filter to DB", async () => {
    vi.mocked(db.listTrainingTracks).mockResolvedValue([]);

    await caller().training.listTracks({ eligibleOnly: true });
    expect(db.listTrainingTracks).toHaveBeenCalledWith(
      expect.objectContaining({ isEligibleForTraining: true })
    );
  });
});

// ── getPipelineStats ──────────────────────────────────────────────────────────

describe("training.getPipelineStats", () => {
  const caller = () => appRouter.createCaller(adminCtx());

  it("returns pipeline statistics", async () => {
    const stats = {
      pending: 10,
      processing: 3,
      features_extracted: 20,
      stems_separated: 15,
      labeled: 12,
      complete: 50,
      failed: 2,
      excluded: 1,
    };
    vi.mocked(db.getTrainingPipelineStats).mockResolvedValue(stats as any);

    const result = await caller().training.getPipelineStats();
    expect(result).toEqual(stats);
  });
});
