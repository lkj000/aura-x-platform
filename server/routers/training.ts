/**
 * server/routers/training.ts — Training Data Ingestion and Management Router
 *
 * Manages the owner's 150+ original Amapiano tracks that feed the model
 * fine-tuning pipeline. Three main flows:
 *
 * 1. INGEST — Upload raw MP3/FLAC/WAV files to S3, create DB records
 * 2. PROCESS — Trigger Modal feature extraction + 26-stem separation
 * 3. LABEL — Admin UI for reviewing and rating stem quality + cultural score
 *
 * Only admin users can write to this router. Read access (pipeline stats)
 * is also restricted to admins.
 *
 * S3 layout:
 *   Raw:      training-data/amapiano/raw/{sha256}.{ext}
 *   Features: training-data/amapiano/features/{id}.json
 *   Stems:    training-data/amapiano/stems/{id}/{stemId}.wav
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import * as db from "../db";
import { storagePut } from "../storage";
import { ENV } from "../_core/env";

// ── Admin guard ───────────────────────────────────────────────────────────────

const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next();
});

// ── Stem quality rating schema (for the label endpoint) ───────────────────────
// Keys must be valid StemIds from shared/stems.ts
const stemQualitySchema = z.record(z.string(), z.number().min(0).max(1));

// ── Cultural score breakdown schema ───────────────────────────────────────────
const culturalBreakdownSchema = z.object({
  logDrum: z.number().min(0).max(20),
  piano: z.number().min(0).max(20),
  swing: z.number().min(0).max(15),
  language: z.number().min(0).max(15),
  energyArc: z.number().min(0).max(10),
  harmonic: z.number().min(0).max(10),
  timbre: z.number().min(0).max(5),
  era: z.number().min(0).max(5),
});

export const trainingRouter = router({

  /**
   * Ingest a training track — idempotent (re-upload of same file is a no-op).
   *
   * Accepts base64-encoded audio. In production this would typically be
   * triggered by a batch upload script rather than the browser, but the
   * endpoint supports both use cases.
   */
  ingestTrack: adminProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.enum(["mp3", "flac", "wav"]),
        fileSize: z.number().positive(),
        fileData: z.string(), // base64 encoded audio
        artist: z.string().optional(),
        album: z.string().optional(),
        year: z.number().int().min(2010).max(2030).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const fileBuffer = Buffer.from(input.fileData, "base64");

      // SHA-256 deduplication
      const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");

      const { track, isNew } = await db.ingestTrainingTrack({
        name: input.fileName,
        artist: input.artist,
        album: input.album,
        year: input.year,
        originalFileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        sha256,
        rawFileKey: `training-data/amapiano/raw/${sha256}.${input.fileType}`,
        rawFileUrl: "", // filled in after upload
        status: "pending",
      });

      if (!isNew) {
        return {
          trackId: track.id,
          isDuplicate: true,
          message: `Track already ingested (SHA-256: ${sha256.slice(0, 8)}…)`,
        };
      }

      // Upload raw file to S3
      const contentType =
        input.fileType === "mp3" ? "audio/mpeg" :
        input.fileType === "flac" ? "audio/flac" : "audio/wav";

      const { url: rawFileUrl } = await storagePut(
        track.rawFileKey,
        fileBuffer,
        contentType
      );

      await db.updateTrainingTrackFeatures(track.id, { rawFileUrl });

      return {
        trackId: track.id,
        isDuplicate: false,
        sha256,
        message: "Track ingested successfully — queued for processing",
      };
    }),

  /**
   * Trigger feature extraction for a training track via Modal.
   * Uses the same analysis endpoint as DJ Studio but writes to training tables.
   */
  triggerFeatureExtraction: adminProcedure
    .input(z.object({ trackId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const track = await db.getTrainingTrack(input.trackId);
      if (!track) throw new TRPCError({ code: "NOT_FOUND", message: "Training track not found" });
      if (track.status !== "pending" && track.status !== "failed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Track is already in status: ${track.status}` });
      }

      if (!ENV.modalBaseUrl || !ENV.modalApiKey) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Modal not configured" });
      }

      const response = await fetch(`${ENV.modalBaseUrl}/analyze-training-track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ENV.modalApiKey}`,
        },
        body: JSON.stringify({
          training_track_id: track.id,
          file_key: track.rawFileKey,
          webhook_url: `${process.env.APP_URL ?? "http://localhost:3000"}/trpc/training.analysisWebhook`,
        }),
      });

      if (!response.ok) {
        const err = await response.text().catch(() => response.statusText);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Modal error: ${err}` });
      }

      const { job_id } = await response.json() as { job_id: string };

      await db.updateTrainingTrackStatus(input.trackId, "processing", { featureJobId: job_id });

      return { jobId: job_id, status: "processing" };
    }),

  /**
   * Trigger 26-stem separation for a training track via Modal.
   * Only available after feature extraction is complete.
   */
  triggerStemSeparation: adminProcedure
    .input(z.object({ trackId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const track = await db.getTrainingTrack(input.trackId);
      if (!track) throw new TRPCError({ code: "NOT_FOUND" });
      if (track.status !== "features_extracted") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Feature extraction must complete before stem separation" });
      }

      if (!ENV.modalBaseUrl || !ENV.modalApiKey) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Modal not configured" });
      }

      const response = await fetch(`${ENV.modalBaseUrl}/separate-stems-training`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ENV.modalApiKey}`,
        },
        body: JSON.stringify({
          training_track_id: track.id,
          file_key: track.rawFileKey,
          stems_prefix: `training-data/amapiano/stems/${track.id}/`,
          webhook_url: `${process.env.APP_URL ?? "http://localhost:3000"}/trpc/training.stemsWebhook`,
        }),
      });

      if (!response.ok) {
        const err = await response.text().catch(() => response.statusText);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Modal error: ${err}` });
      }

      const { job_id } = await response.json() as { job_id: string };

      await db.updateTrainingTrackStatus(input.trackId, "processing", {
        stemJobId: job_id,
        stemsPrefix: `training-data/amapiano/stems/${track.id}/`,
      });

      return { jobId: job_id, status: "processing" };
    }),

  /**
   * Submit human-verified stem quality ratings + cultural authenticity scores.
   * Tracks with avgStemQuality ≥ 0.7 AND totalCulturalScore ≥ 60 are marked
   * eligible for training.
   */
  labelTrack: adminProcedure
    .input(
      z.object({
        trackId: z.number(),
        stemQualityRatings: stemQualitySchema,
        culturalBreakdown: culturalBreakdownSchema,
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const track = await db.getTrainingTrack(input.trackId);
      if (!track) throw new TRPCError({ code: "NOT_FOUND" });

      const { culturalBreakdown } = input;
      const totalCulturalScore =
        culturalBreakdown.logDrum + culturalBreakdown.piano + culturalBreakdown.swing +
        culturalBreakdown.language + culturalBreakdown.energyArc + culturalBreakdown.harmonic +
        culturalBreakdown.timbre + culturalBreakdown.era;

      const stemQualityValues = Object.values(input.stemQualityRatings);
      const avgStemQuality = stemQualityValues.length > 0
        ? stemQualityValues.reduce((a, b) => a + b, 0) / stemQualityValues.length
        : 0;

      const label = await db.createTrainingLabel({
        trainingTrackId: input.trackId,
        reviewerId: ctx.user.id,
        stemQualityRatings: JSON.stringify(input.stemQualityRatings),
        logDrumScore: culturalBreakdown.logDrum,
        pianoScore: culturalBreakdown.piano,
        swingScore: culturalBreakdown.swing,
        languageScore: culturalBreakdown.language,
        energyArcScore: culturalBreakdown.energyArc,
        harmonicScore: culturalBreakdown.harmonic,
        timbreScore: culturalBreakdown.timbre,
        eraScore: culturalBreakdown.era,
        totalCulturalScore,
        avgStemQuality,
        notes: input.notes,
      });

      return {
        labelId: label.id,
        totalCulturalScore,
        avgStemQuality,
        isEligibleForTraining: avgStemQuality >= 0.7 && totalCulturalScore >= 60,
      };
    }),

  /**
   * List all training tracks with optional status filter.
   */
  listTracks: adminProcedure
    .input(
      z.object({
        status: z.enum(["pending", "processing", "features_extracted", "stems_separated", "labeled", "complete", "failed", "excluded"]).optional(),
        eligibleOnly: z.boolean().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      return db.listTrainingTracks({
        status: input.status,
        isEligibleForTraining: input.eligibleOnly,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  /**
   * Get pipeline statistics — how many tracks are at each stage.
   */
  getPipelineStats: adminProcedure
    .query(async () => {
      return db.getTrainingPipelineStats();
    }),

  /**
   * Webhook: Modal analysis complete for a training track.
   * Updates features and transitions to features_extracted status.
   */
  analysisWebhook: adminProcedure
    .input(
      z.object({
        training_track_id: z.number(),
        bpm: z.number(),
        key: z.string(),
        scale: z.string().optional(),
        swing_percent: z.number().optional(),
        lufs: z.number(),
        duration_sec: z.number(),
        cultural_score: z.number().optional(),
        detected_language: z.string().optional(),
        detected_languages: z.array(z.string()).optional(),
        regional_style: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db.updateTrainingTrackStatus(input.training_track_id, "features_extracted", {
        bpm: input.bpm,
        key: input.key,
        scale: input.scale,
        swingPercent: input.swing_percent,
        lufs: input.lufs,
        durationSec: input.duration_sec,
        culturalScore: input.cultural_score,
        detectedLanguage: input.detected_language,
        detectedLanguages: input.detected_languages ? JSON.stringify(input.detected_languages) : undefined,
        regionalStyle: input.regional_style,
        processedAt: new Date(),
      });
      return { success: true };
    }),

  /**
   * Webhook: Modal stem separation complete for a training track.
   */
  stemsWebhook: adminProcedure
    .input(
      z.object({
        training_track_id: z.number(),
        stems_completed: z.number(),
        avg_sdr_db: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const hasCleanStems = (input.avg_sdr_db ?? 0) >= 8;
      await db.updateTrainingTrackStatus(input.training_track_id, "stems_separated", {
        hasCleanStems,
      });
      return { success: true };
    }),
});
