/**
 * DJ Studio tRPC Router
 *
 * Provides API endpoints for Level-5 Autonomous DJ Set Generator:
 * - Track upload and management
 * - Track analysis (BPM, key, energy curve, segments)
 * - Stem separation (vocals, drums, bass, other)
 * - Performance plan generation (DJ set planning)
 * - Mix rendering (final audio output)
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { storagePut, storageDelete } from "../storage";
import * as djDb from "../djStudioDb";
import {
  executeAnalyzeTrackWorkflow,
  executeSeparateStemsWorkflow,
  executeGenerateDJSetWorkflow,
  queryWorkflowStatus,
} from "../temporalClient";
import crypto from "crypto";

// ── In-process job status cache ───────────────────────────────────────────────
// Maps trackId → Temporal workflowId for in-flight analysis / stem jobs.
// Entries are removed once the workflow reaches a terminal state or the
// database record confirms completion. The cache is intentionally
// process-scoped: after a server restart in-flight jobs continue to run
// in Temporal; the DB result (features row / stems row) is the source of
// truth for completion — the boolean flags will correctly flip to false
// until the webhooks write results back.
const analysisJobs = new Map<number, string>(); // trackId → workflowId
const stemsJobs = new Map<number, string>();    // trackId → workflowId

async function isJobRunning(workflowId: string): Promise<boolean> {
  try {
    const { status } = await queryWorkflowStatus(workflowId);
    return status === "RUNNING";
  } catch {
    return false;
  }
}

export const djStudioRouter = router({
  /**
   * Upload a track file to S3 and create database record
   */
  uploadTrack: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.enum(["mp3", "mp4", "wav"]),
        fileSize: z.number(),
        fileData: z.string(), // Base64 encoded file data
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const fileBuffer = Buffer.from(input.fileData, "base64");

      const hash = crypto.createHash("sha256");
      hash.update(fileBuffer);
      const sha256 = hash.digest("hex");

      const existingTrack = await djDb.findDJTrackByHash(userId, sha256);
      if (existingTrack) {
        return { trackId: existingTrack.id, isDuplicate: true, message: "Track already exists in your library" };
      }

      const fileKey = `dj-tracks/${userId}/${Date.now()}-${input.fileName}`;
      const contentType =
        input.fileType === "mp3" ? "audio/mpeg" :
        input.fileType === "wav" ? "audio/wav" : "audio/mp4";

      const { url: fileUrl } = await storagePut(fileKey, fileBuffer, contentType);

      const track = await djDb.createDJTrack({
        userId,
        name: input.fileName,
        fileUrl,
        fileKey,
        fileType: input.fileType,
        fileSize: input.fileSize,
        sha256,
        durationSec: 0,
      });

      return { trackId: track.id, isDuplicate: false, message: "Track uploaded successfully" };
    }),

  /**
   * Get all tracks for the current user, enriched with analysis/stem status
   */
  getTracks: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const tracks = await djDb.getUserDJTracks(userId);

    const tracksWithFeatures = await Promise.all(
      tracks.map(async (track) => {
        const [features, stems] = await Promise.all([
          djDb.getDJTrackFeatures(track.id),
          djDb.getDJStems(track.id),
        ]);

        // Derive live job status from the in-process cache + Temporal
        let isAnalyzing = false;
        let isSeparatingStems = false;

        if (!features) {
          const wfId = analysisJobs.get(track.id);
          if (wfId) {
            isAnalyzing = await isJobRunning(wfId);
            if (!isAnalyzing) analysisJobs.delete(track.id); // stale entry
          }
        }

        if (!stems) {
          const wfId = stemsJobs.get(track.id);
          if (wfId) {
            isSeparatingStems = await isJobRunning(wfId);
            if (!isSeparatingStems) stemsJobs.delete(track.id);
          }
        }

        return {
          ...track,
          durationSec: track.durationSec ?? 0,
          isAnalyzed: !!features,
          isAnalyzing,
          bpm: features?.bpm ?? undefined,
          bpmConfidence: features?.bpmConfidence ?? undefined,
          key: features?.key ?? undefined,
          camelotKey: features?.camelotKey ?? undefined,
          energyAvg: features?.energyAvg ?? undefined,
          lufs: features?.lufs ?? undefined,
          hasStemsSeparated: !!stems,
          isSeparatingStems,
        };
      })
    );

    return tracksWithFeatures;
  }),

  /**
   * Delete a track, its S3 assets, and its database records
   */
  deleteTrack: protectedProcedure
    .input(z.object({ trackId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const track = await djDb.getDJTrackById(input.trackId);
      if (!track) throw new TRPCError({ code: "NOT_FOUND", message: "Track not found" });
      if (track.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      // Collect all S3 keys to delete
      const keysToDelete: string[] = [track.fileKey];

      const stems = await djDb.getDJStems(input.trackId);
      if (stems) {
        // Collect S3 keys from priority stem columns
        for (const key of [
          stems.logDrumKey, stems.kickKey, stems.pianoChordKey,
          stems.bassSynthKey, stems.leadVocalKey, stems.fluteKey,
        ]) {
          if (key) keysToDelete.push(key);
        }
        // Also collect keys from the full stem map JSON
        if (stems.stemMap) {
          const stemMap = stems.stemMap as Record<string, { key?: string }>;
          for (const entry of Object.values(stemMap)) {
            if (entry?.key) keysToDelete.push(entry.key);
          }
        }
      }

      // Delete DB record first (fast), then purge S3 objects (best-effort)
      await djDb.deleteDJTrack(input.trackId);
      analysisJobs.delete(input.trackId);
      stemsJobs.delete(input.trackId);

      await Promise.allSettled(keysToDelete.map(k => storageDelete(k)));

      return { success: true, message: "Track deleted successfully" };
    }),

  /**
   * Trigger track analysis job via Temporal → Modal
   */
  analyzeTrack: protectedProcedure
    .input(z.object({ trackId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const track = await djDb.getDJTrackById(input.trackId);
      if (!track) throw new TRPCError({ code: "NOT_FOUND", message: "Track not found" });
      if (track.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      // Don't start a duplicate if one is already running
      const existingWf = analysisJobs.get(input.trackId);
      if (existingWf && (await isJobRunning(existingWf))) {
        return { jobId: existingWf, status: "running", message: "Analysis already in progress" };
      }

      const handle = await executeAnalyzeTrackWorkflow(input.trackId, track.fileKey);
      analysisJobs.set(input.trackId, handle.workflowId);

      return { jobId: handle.workflowId, status: "pending", message: "Analysis job queued" };
    }),

  /**
   * Trigger stem separation job via Temporal → Modal Demucs
   */
  separateStems: protectedProcedure
    .input(z.object({ trackId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const track = await djDb.getDJTrackById(input.trackId);
      if (!track) throw new TRPCError({ code: "NOT_FOUND", message: "Track not found" });
      if (track.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const existingWf = stemsJobs.get(input.trackId);
      if (existingWf && (await isJobRunning(existingWf))) {
        return { jobId: existingWf, status: "running", message: "Stem separation already in progress" };
      }

      const handle = await executeSeparateStemsWorkflow(input.trackId, track.fileKey, ctx.user.id);
      stemsJobs.set(input.trackId, handle.workflowId);

      return { jobId: handle.workflowId, status: "pending", message: "Stem separation job queued" };
    }),

  /**
   * Get vibe presets for DJ set generation
   */
  getVibePresets: protectedProcedure.query(async () => {
    return djDb.getAllVibePresets();
  }),

  /**
   * Generate DJ set performance plan via Temporal workflow
   */
  generateSet: protectedProcedure
    .input(
      z.object({
        trackIds: z.array(z.number()),
        preset: z.string(),
        durationTargetSec: z.number(),
        riskLevel: z.number().min(0).max(1),
        allowVocalOverlay: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      for (const trackId of input.trackIds) {
        const track = await djDb.getDJTrackById(trackId);
        if (!track || track.userId !== userId) {
          throw new TRPCError({ code: "FORBIDDEN", message: `Track ${trackId} not found or access denied` });
        }
      }

      const handle = await executeGenerateDJSetWorkflow(userId, input.trackIds, {
        durationMinutes: Math.round(input.durationTargetSec / 60),
        vibePreset: input.preset,
        riskLevel: input.riskLevel,
        allowVocalOverlay: input.allowVocalOverlay,
      });

      return { jobId: handle.workflowId, status: "pending", message: "Set generation job queued" };
    }),

  /**
   * Get all performance plans for the current user
   */
  getPerformancePlans: protectedProcedure.query(async ({ ctx }) => {
    const plans = await djDb.getUserPerformancePlans(ctx.user.id);
    return Promise.all(
      plans.map(async (plan) => {
        const renders = await djDb.getPlanRenders(plan.id);
        return { ...plan, renders: renders || [] };
      })
    );
  }),
});
