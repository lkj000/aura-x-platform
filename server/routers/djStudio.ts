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
import { storagePut } from "../storage";
import * as djDb from "../djStudioDb";
import crypto from "crypto";

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

      // Decode base64 file data
      const fileBuffer = Buffer.from(input.fileData, "base64");

      // Calculate SHA256 hash for deduplication
      const hash = crypto.createHash("sha256");
      hash.update(fileBuffer);
      const sha256 = hash.digest("hex");

      // Check if track already exists
      const existingTrack = await djDb.findDJTrackByHash(userId, sha256);
      if (existingTrack) {
        return {
          trackId: existingTrack.id,
          isDuplicate: true,
          message: "Track already exists in your library",
        };
      }

      // Upload to S3
      const fileKey = `dj-tracks/${userId}/${Date.now()}-${input.fileName}`;
      const contentType =
        input.fileType === "mp3"
          ? "audio/mpeg"
          : input.fileType === "wav"
          ? "audio/wav"
          : "audio/mp4";

      const { url: fileUrl } = await storagePut(fileKey, fileBuffer, contentType);

      // Get audio duration (placeholder - will be calculated during analysis)
      const durationSec = 0;

      // Create database record
      const track = await djDb.createDJTrack({
        userId,
        name: input.fileName,
        fileUrl,
        fileKey,
        fileType: input.fileType,
        fileSize: input.fileSize,
        sha256,
        durationSec,
      });

      return {
        trackId: track.id,
        isDuplicate: false,
        message: "Track uploaded successfully",
      };
    }),

  /**
   * Get all tracks for the current user
   */
  getTracks: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const tracks = await djDb.getUserDJTracks(userId);

    // Fetch features for each track
    const tracksWithFeatures = await Promise.all(
      tracks.map(async (track) => {
        const features = await djDb.getDJTrackFeatures(track.id);
        const stems = await djDb.getDJStems(track.id);

        return {
          ...track,
          // Analysis status
          isAnalyzed: !!features,
          isAnalyzing: false, // TODO: Check job status from Temporal
          // Features
          bpm: features?.bpm,
          bpmConfidence: features?.bpmConfidence,
          key: features?.key,
          camelotKey: features?.camelotKey,
          energyAvg: features?.energyAvg,
          lufs: features?.lufs,
          // Stems status
          hasStemsSeparated: !!stems,
          isSeparatingStems: false, // TODO: Check job status from Temporal
        };
      })
    );

    return tracksWithFeatures;
  }),

  /**
   * Delete a track and its associated data
   */
  deleteTrack: protectedProcedure
    .input(z.object({ trackId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify ownership
      const track = await djDb.getDJTrackById(input.trackId);
      if (!track) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Track not found",
        });
      }

      if (track.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this track",
        });
      }

      // Delete from database (will also delete features and stems)
      await djDb.deleteDJTrack(input.trackId);

      // TODO: Delete from S3 (track file and stems)

      return {
        success: true,
        message: "Track deleted successfully",
      };
    }),

  /**
   * Trigger track analysis job (BPM, key, energy curve, segments)
   * 
   * This will be implemented with Modal + Temporal in Phase 5
   */
  analyzeTrack: protectedProcedure
    .input(z.object({ trackId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify ownership
      const track = await djDb.getDJTrackById(input.trackId);
      if (!track) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Track not found",
        });
      }

      if (track.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to analyze this track",
        });
      }

      // TODO: Trigger Modal analysis job via Temporal workflow
      // For now, return placeholder response
      return {
        jobId: `analysis-${input.trackId}-${Date.now()}`,
        status: "pending",
        message: "Analysis job queued (placeholder - Modal integration pending)",
      };
    }),

  /**
   * Trigger stem separation job (vocals, drums, bass, other)
   * 
   * This will be implemented with Modal + Temporal in Phase 5
   */
  separateStems: protectedProcedure
    .input(z.object({ trackId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify ownership
      const track = await djDb.getDJTrackById(input.trackId);
      if (!track) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Track not found",
        });
      }

      if (track.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to separate stems for this track",
        });
      }

      // TODO: Trigger Modal Demucs job via Temporal workflow
      // For now, return placeholder response
      return {
        jobId: `stems-${input.trackId}-${Date.now()}`,
        status: "pending",
        message: "Stem separation job queued (placeholder - Modal integration pending)",
      };
    }),

  /**
   * Get vibe presets for DJ set generation
   */
  getVibePresets: protectedProcedure.query(async () => {
    return await djDb.getAllVibePresets();
  }),

  /**
   * Generate DJ set performance plan
   * 
   * This will be implemented with Modal + Temporal in Phase 6
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

      // Verify all tracks belong to user
      for (const trackId of input.trackIds) {
        const track = await djDb.getDJTrackById(trackId);
        if (!track || track.userId !== userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Track ${trackId} not found or access denied`,
          });
        }
      }

      // TODO: Trigger Modal set planning job via Temporal workflow
      // For now, return placeholder response
      return {
        jobId: `set-${Date.now()}`,
        status: "pending",
        message: "Set generation job queued (placeholder - Modal integration pending)",
      };
    }),
});
