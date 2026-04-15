/**
 * DJ Studio Webhook Endpoints
 *
 * Receives callbacks from the Modal Python backend when async jobs complete:
 * - Track analysis (BPM, key, energy, Amapiano-specific features)
 * - Stem separation (26-stem Amapiano ontology)
 * - Set rendering (final mix)
 *
 * These endpoints are called server-to-server (Modal → Express), not by
 * the browser. They are intentionally public (no user auth required) because
 * Modal cannot hold a session cookie — instead, each webhook includes the
 * job ID which is validated against the DB.
 */

import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import * as djDb from "../djStudioDb";
import { ALL_STEM_IDS } from "../../shared/stems";

// ── Reusable schema for a single stem result ──────────────────────────────────
const stemResultSchema = z.object({
  url: z.string(),
  key: z.string(),
  sdr_db: z.number().optional(),
});

export const djStudioWebhooksRouter = router({

  /**
   * Webhook: Track analysis complete
   *
   * Modal sends the full analysis result including Amapiano-specific fields
   * (swing %, log drum detection, piano complexity, cultural score).
   */
  analysisComplete: publicProcedure
    .input(
      z.object({
        track_id: z.number(),
        duration_sec: z.number(),
        // Standard audio features
        bpm: z.number(),
        bpm_confidence: z.number(),
        key: z.string(),
        scale: z.string().optional(),
        camelot_key: z.string(),
        compatible_keys: z.array(z.string()).optional(),
        energy_curve: z.array(z.number()),
        energy_avg: z.number(),
        energy_peak: z.number().optional(),
        energy_arc_type: z.string().optional(),
        lufs: z.number(),
        true_peak: z.number(),
        dynamic_range: z.number().optional(),
        segments: z.array(z.object({
          type: z.string(),
          start: z.number(),
          end: z.number(),
        })),
        beatgrid: z.array(z.number()).optional(),
        downbeats: z.array(z.number()).optional(),
        mixability_score: z.number().optional(),
        // Amapiano-specific features
        swing_percent: z.number().optional(),
        log_drum_detected: z.boolean().optional(),
        log_drum_freq_hz: z.number().optional(),
        log_drum_prominence: z.number().optional(),
        piano_complexity: z.number().optional(),
        flute_detected: z.boolean().optional(),
        cultural_score: z.number().optional(),
        cultural_score_breakdown: z.record(z.string(), z.number()).optional(),
        detected_language: z.string().optional(),
        language_confidence: z.number().optional(),
        detected_languages: z.array(z.string()).optional(),
        regional_style: z.string().optional(),
        production_era: z.string().optional(),
        analyzer_version: z.string().optional(),
        // T10: Groove fingerprint (32-bar microtiming matrix)
        groove_fingerprint: z.object({
          combined: z.array(z.number()),
          metricalStrength: z.number(),
          barsAnalysed: z.number(),
        }).optional(),
        // T10: Log drum syncopation map
        log_drum_syncopation_map: z.object({
          pattern: z.string(),
          onsetOffsets: z.array(z.number()),
          kickRelativeOffsets: z.array(z.number()),
          metricalStrength: z.number(),
        }).optional(),
        // T11: Contrast Score (0–200)
        contrast_score: z.number().optional(),
        contrast_score_label: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      console.log(`[Webhook] Analysis complete for track ${input.track_id} (BPM: ${input.bpm}, key: ${input.key})`);

      await djDb.saveDJTrackFeatures({
        trackId: input.track_id,
        bpm: input.bpm,
        bpmConfidence: input.bpm_confidence,
        key: input.key,
        scale: input.scale,
        camelotKey: input.camelot_key,
        compatibleKeys: input.compatible_keys ? JSON.stringify(input.compatible_keys) : undefined,
        energyCurve: JSON.stringify(input.energy_curve),
        energyAvg: input.energy_avg,
        energyPeak: input.energy_peak,
        energyArcType: input.energy_arc_type,
        lufs: input.lufs,
        truePeak: input.true_peak,
        dynamicRange: input.dynamic_range,
        segments: JSON.stringify(input.segments),
        beatgrid: input.beatgrid ? JSON.stringify(input.beatgrid) : undefined,
        downbeats: input.downbeats ? JSON.stringify(input.downbeats) : undefined,
        mixabilityScore: input.mixability_score,
        // Amapiano-specific
        swingPercent: input.swing_percent,
        logDrumDetected: input.log_drum_detected ?? false,
        logDrumFreqHz: input.log_drum_freq_hz,
        logDrumProminence: input.log_drum_prominence,
        pianoComplexity: input.piano_complexity,
        fluteDetected: input.flute_detected ?? false,
        culturalScore: input.cultural_score,
        culturalScoreBreakdown: input.cultural_score_breakdown
          ? JSON.stringify(input.cultural_score_breakdown) : undefined,
        detectedLanguage: input.detected_language,
        languageConfidence: input.language_confidence,
        detectedLanguages: input.detected_languages
          ? JSON.stringify(input.detected_languages) : undefined,
        regionalStyle: input.regional_style,
        productionEra: input.production_era,
        analyzerVersion: input.analyzer_version ?? "2.0.0",
        // T10: Groove fingerprint + log drum syncopation map
        grooveFingerprint: input.groove_fingerprint
          ? JSON.stringify(input.groove_fingerprint)
          : undefined,
        logDrumSyncopationMap: input.log_drum_syncopation_map
          ? JSON.stringify(input.log_drum_syncopation_map)
          : undefined,
        // T11: Contrast Score
        contrastScore: input.contrast_score,
      });

      // Update track duration (was set to 0 on upload)
      if (input.duration_sec > 0) {
        await djDb.updateDJTrackDuration(input.track_id, input.duration_sec);
      }

      return { success: true, trackId: input.track_id };
    }),

  /**
   * Webhook: Stem separation complete (26-stem Amapiano ontology)
   *
   * Modal sends a map of all separated stems. Priority stems are stored in
   * individual columns for fast access; the full map is stored in stemMap JSON.
   */
  stemsComplete: publicProcedure
    .input(
      z.object({
        track_id: z.number(),
        model_version: z.string(), // "htdemucs_6s" | "htdemucs_ft" | "mdx_net_voc_ft"
        separation_pass_count: z.number().default(1),
        processing_time_sec: z.number().optional(),
        avg_sdr_db: z.number().optional(),
        // Full stem map — keys are StemId values from shared/stems.ts
        // e.g., { "log_drum": { url, key, sdr_db }, "piano_chords": { url, key }, ... }
        stem_map: z.record(z.string(), stemResultSchema),
      })
    )
    .mutation(async ({ input }) => {
      const { stem_map } = input;
      console.log(`[Webhook] Stems complete for track ${input.track_id}, model: ${input.model_version}, stems: ${Object.keys(stem_map).length}`);

      const get = (id: string) => stem_map[id];

      await djDb.saveDJStems({
        trackId: input.track_id,
        modelVersion: input.model_version,
        separationPassCount: input.separation_pass_count,
        processingTimeSec: input.processing_time_sec,
        avgSdrDb: input.avg_sdr_db,
        stemsCompleted: Object.keys(stem_map).length,

        // Priority stem columns
        logDrumUrl: get("log_drum")?.url,
        logDrumKey: get("log_drum")?.key,
        logDrumSdrDb: get("log_drum")?.sdr_db,

        kickUrl: get("kick")?.url,
        kickKey: get("kick")?.key,
        kickSdrDb: get("kick")?.sdr_db,

        pianoChordUrl: get("piano_chords")?.url,
        pianoChordKey: get("piano_chords")?.key,
        pianoChordSdrDb: get("piano_chords")?.sdr_db,

        bassSynthUrl: get("bass_synth")?.url,
        bassSynthKey: get("bass_synth")?.key,
        bassSynthSdrDb: get("bass_synth")?.sdr_db,

        leadVocalUrl: get("lead_vocal")?.url,
        leadVocalKey: get("lead_vocal")?.key,
        leadVocalSdrDb: get("lead_vocal")?.sdr_db,

        fluteUrl: get("flute")?.url,
        fluteKey: get("flute")?.key,
        fluteSdrDb: get("flute")?.sdr_db,

        // Full map as JSON
        stemMap: JSON.stringify(stem_map),
      });

      return { success: true, trackId: input.track_id, stemsStored: Object.keys(stem_map).length };
    }),

  /**
   * Webhook: DJ Set render complete
   */
  renderComplete: publicProcedure
    .input(
      z.object({
        plan_id: z.number(),
        mix_url: z.string(),
        mix_key: z.string(),
        cue_sheet_url: z.string().optional(),
        cue_sheet_key: z.string().optional(),
        render_time_sec: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      console.log(`[Webhook] Render complete for plan ${input.plan_id}`);

      await djDb.updateRenderComplete({
        planId: input.plan_id,
        mixUrl: input.mix_url,
        mixKey: input.mix_key,
        cueSheetUrl: input.cue_sheet_url,
        cueSheetKey: input.cue_sheet_key,
        renderTimeSec: input.render_time_sec,
      });

      return { success: true, planId: input.plan_id };
    }),
});
