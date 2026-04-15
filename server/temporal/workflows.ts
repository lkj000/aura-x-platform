/**
 * temporal/workflows.ts — Temporal Workflow definitions for AURA-X
 *
 * Workflows are durable, restartable execution plans. They coordinate
 * activities (Modal HTTP triggers + DB polls) and survive process crashes,
 * deployments, and network blips via Temporal's event sourcing.
 *
 * Task queues:
 *   aura-x-music-generation   — AI Studio: MusicGenerationWorkflow, StemSeparationWorkflow
 *   aura-x-dj-studio          — DJ Studio: analyzeTrackWorkflow, separateStemsWorkflow, generateDJSetWorkflow
 *
 * Polling strategy: all workflows use a sleep + DB poll loop. Temporal's
 * `sleep` is durable (survives worker restarts); `setTimeout` is not.
 */

import { proxyActivities, sleep } from "@temporalio/workflow";
import type * as activities from "./activities";

// ── Activity proxies ───────────────────────────────────────────────────────────

// DJ Studio activities — longer timeouts for GPU stem separation
const {
  triggerModalAnalysis,
  triggerModalStemSeparation,
  checkAnalysisStatus,
  checkStemsStatus,
  generateSetPlan,
  renderDJSet,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "10 minutes",
  retry: {
    initialInterval: "5s",
    backoffCoefficient: 2,
    maximumInterval: "60s",
    maximumAttempts: 3,
  },
});

// Music generation activities — Modal trigger is fast; generation can take 5+ min
const {
  triggerMusicGeneration,
  checkMusicGenerationStatus,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "15 minutes",
  retry: {
    initialInterval: "10s",
    backoffCoefficient: 2,
    maximumInterval: "120s",
    maximumAttempts: 3,
  },
});

// ── AI Studio Workflows ────────────────────────────────────────────────────────

export interface MusicGenerationWorkflowParams {
  generation_id: number;
  user_id: number;
  prompt: string;
  lyrics?: string;
  duration?: number;
  temperature?: number;
  seed?: number;
  modal_base_url?: string; // unused in activity (activities read env), kept for traceability
  modal_api_key?: string;
}

/**
 * MusicGenerationWorkflow
 *
 * 1. Trigger Modal generate_music (fire-and-forget HTTP POST)
 * 2. Poll DB every 10 s for up to 10 min until audioUrl is set by webhook
 * 3. Throw on timeout so Temporal marks the workflow as failed
 */
export async function MusicGenerationWorkflow(
  params: MusicGenerationWorkflowParams
): Promise<void> {
  const { generation_id, prompt, duration, temperature, seed } = params;

  await triggerMusicGeneration({ generationId: generation_id, prompt, duration, temperature, seed });

  const maxAttempts = 60; // 10 s × 60 = 10 min
  for (let i = 0; i < maxAttempts; i++) {
    await sleep("10s");
    const done = await checkMusicGenerationStatus(generation_id);
    if (done) return;
  }

  throw new Error(`MusicGenerationWorkflow timed out for generation ${generation_id}`);
}

/**
 * StemSeparationWorkflow (AI Studio stems for a completed generation)
 *
 * Uses the same separate_stems Modal endpoint but keyed off generationId
 * rather than a DJ track.  The file_key is the S3 key of the generated audio.
 */
export async function StemSeparationWorkflow(params: {
  generation_id: number;
  user_id: number;
  audio_url: string;
  modal_base_url?: string;
  modal_api_key?: string;
}): Promise<void> {
  const { generation_id, user_id, audio_url } = params;

  // Reuse DJ triggerModalStemSeparation; audio_url is treated as the file_key
  await triggerModalStemSeparation(generation_id, audio_url, user_id);

  const maxAttempts = 180; // 5 s × 180 = 15 min
  for (let i = 0; i < maxAttempts; i++) {
    await sleep("5s");
    const done = await checkStemsStatus(generation_id);
    if (done) return;
  }

  throw new Error(`StemSeparationWorkflow timed out for generation ${generation_id}`);
}

// ── DJ Studio Workflows ────────────────────────────────────────────────────────

/**
 * analyzeTrackWorkflow
 *
 * 1. Trigger Modal analyze_track (fire-and-forget)
 * 2. Poll DB every 5 s until features land via webhook (max 5 min)
 */
export async function analyzeTrackWorkflow(
  trackId: number,
  fileKey: string
): Promise<void> {
  await triggerModalAnalysis(trackId, fileKey);

  const maxAttempts = 60; // 5 s × 60 = 5 min
  for (let i = 0; i < maxAttempts; i++) {
    await sleep("5s");
    if (await checkAnalysisStatus(trackId)) return;
  }

  throw new Error(`analyzeTrackWorkflow timed out for track ${trackId}`);
}

/**
 * separateStemsWorkflow
 *
 * 1. Trigger Modal separate_stems (GPU A10G, can take up to 10 min)
 * 2. Poll DB every 5 s until stems land via webhook (max 15 min)
 */
export async function separateStemsWorkflow(
  trackId: number,
  fileKey: string,
  userId: number
): Promise<void> {
  await triggerModalStemSeparation(trackId, fileKey, userId);

  const maxAttempts = 180; // 5 s × 180 = 15 min
  for (let i = 0; i < maxAttempts; i++) {
    await sleep("5s");
    if (await checkStemsStatus(trackId)) return;
  }

  throw new Error(`separateStemsWorkflow timed out for track ${trackId}`);
}

/**
 * generateDJSetWorkflow
 *
 * Multi-step DJ set generation:
 * 1. Build an energy-arc ordered performance plan from analysed tracks
 * 2. Trigger Modal render_dj_set and await the rendered mix URL
 *
 * @returns { planId, mixUrl }
 */
export async function generateDJSetWorkflow(
  userId: number,
  trackIds: number[],
  config: {
    durationMinutes: number;
    vibePreset: string;
    riskLevel: number;
    allowVocalOverlay: boolean;
  }
): Promise<{ planId: number; mixUrl: string }> {
  const planId = await generateSetPlan(userId, trackIds, config);
  const mixUrl = await renderDJSet(planId);
  return { planId, mixUrl };
}
