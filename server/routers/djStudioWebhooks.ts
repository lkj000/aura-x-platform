/**
 * DJ Studio Webhook Endpoints
 * 
 * Receives callbacks from Modal Python backend when:
 * - Track analysis completes
 * - Stem separation completes
 * - Set rendering completes
 */

import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import * as djDb from "../djStudioDb";

export const djStudioWebhooksRouter = router({
  /**
   * Webhook: Track analysis complete
   * 
   * Called by Modal worker after analyzing a track
   */
  analysisComplete: publicProcedure
    .input(
      z.object({
        track_id: z.number(),
        duration_sec: z.number(),
        bpm: z.number(),
        bpm_confidence: z.number(),
        key: z.string(),
        camelot_key: z.string(),
        energy_curve: z.array(z.number()),
        energy_avg: z.number(),
        segments: z.array(
          z.object({
            time: z.number(),
            type: z.enum(["beat", "downbeat"]),
            confidence: z.number(),
          })
        ),
        lufs: z.number(),
        true_peak: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      console.log(`[Webhook] Analysis complete for track ${input.track_id}`);

      // Save track features to database
      await djDb.saveDJTrackFeatures({
        trackId: input.track_id,
        bpm: input.bpm,
        bpmConfidence: input.bpm_confidence,
        key: input.key,
        camelotKey: input.camelot_key,
        energyCurve: JSON.stringify(input.energy_curve),
        energyAvg: input.energy_avg,
        segments: JSON.stringify(input.segments),
        lufs: input.lufs,
        truePeak: input.true_peak,
      });

      // Update track duration
      const track = await djDb.getDJTrackById(input.track_id);
      if (track && track.durationSec === 0) {
        // Update duration if not set
        // TODO: Add updateDJTrack function to djStudioDb.ts
        console.log(`[Webhook] Track ${input.track_id} duration: ${input.duration_sec}s`);
      }

      return {
        success: true,
        message: "Analysis results saved",
      };
    }),

  /**
   * Webhook: Stem separation complete
   * 
   * Called by Modal worker after separating stems
   */
  stemsComplete: publicProcedure
    .input(
      z.object({
        track_id: z.number(),
        vocals_url: z.string(),
        vocals_key: z.string(),
        drums_url: z.string(),
        drums_key: z.string(),
        bass_url: z.string(),
        bass_key: z.string(),
        other_url: z.string(),
        other_key: z.string(),
        model_version: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      console.log(`[Webhook] Stems complete for track ${input.track_id}`);

      // Save stems to database
      await djDb.saveDJStems({
        trackId: input.track_id,
        vocalsUrl: input.vocals_url,
        vocalsKey: input.vocals_key,
        drumsUrl: input.drums_url,
        drumsKey: input.drums_key,
        bassUrl: input.bass_url,
        bassKey: input.bass_key,
        otherUrl: input.other_url,
        otherKey: input.other_key,
        modelVersion: input.model_version,
      });

      return {
        success: true,
        message: "Stems saved",
      };
    }),
});
