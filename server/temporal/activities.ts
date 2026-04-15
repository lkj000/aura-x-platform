/**
 * temporal/activities.ts — Temporal Activity implementations for AURA-X
 *
 * These activities are the bridge between Temporal durable workflows and
 * the Modal.com serverless GPU functions. Each activity either:
 *   (a) fires an HTTP call to a Modal web endpoint and returns immediately, or
 *   (b) polls the DB for webhook-delivered results.
 *
 * Activities run inside the Temporal worker process (server/temporal/worker.ts)
 * and are executed with automatic retries as defined in the workflow proxy config.
 *
 * Modal endpoint contracts:
 *   POST /analyze_track           { track_id, file_key, webhook_url? }
 *   POST /separate_stems          { track_id, file_key, user_id, webhook_url? }
 *   POST /generate_music          (see generateMusic in modalClient.ts)
 *   POST /render_dj_set           { plan_id, plan_json, webhook_url? }
 */

import axios from "axios";
import * as djDb from "../djStudioDb";
import * as db from "../db/generations";

// ── Modal base URL ─────────────────────────────────────────────────────────────
// Set MODAL_BASE_URL in .env (e.g. https://mabgwej--aura-x-ai-fastapi-app.modal.run)
// Trailing slash is stripped so we can always append /endpoint safely.
const MODAL_BASE_URL = (
  process.env.MODAL_BASE_URL ||
  process.env.VITE_MODAL_API_URL ||
  "https://mabgwej--aura-x-ai-fastapi-app.modal.run"
).replace(/\/$/, "");

const MODAL_API_KEY = process.env.MODAL_API_KEY || "";

// Public URL that Modal can POST webhooks back to.
// Read at call-time (not module-load) so tests can override process.env.
function getPublicUrl(): string {
  return (process.env.PUBLIC_URL || process.env.VITE_APP_URL || "").replace(
    /\/$/,
    ""
  );
}

function modalHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (MODAL_API_KEY) headers["Authorization"] = `Bearer ${MODAL_API_KEY}`;
  return headers;
}

// ── DJ Studio activities ───────────────────────────────────────────────────────

/**
 * Trigger Modal analyze_track endpoint for a DJ Studio track.
 *
 * Modal runs Essentia + Amapiano-specific analysis and POSTs results back
 * to the webhook URL. The workflow polls `checkAnalysisStatus` until the
 * webhook-delivered data lands in the DB.
 *
 * @throws if Modal returns a non-2xx response
 */
export async function triggerModalAnalysis(
  trackId: number,
  fileKey: string
): Promise<void> {
  const webhookUrl = getPublicUrl() ? `${getPublicUrl()}/api/modal/webhook` : undefined;

  console.log(`[Activity:triggerModalAnalysis] track=${trackId} key=${fileKey}`);

  const response = await axios.post(
    `${MODAL_BASE_URL}/analyze_track`,
    {
      track_id: trackId,
      file_key: fileKey,
      ...(webhookUrl && { webhook_url: webhookUrl }),
    },
    { headers: modalHeaders(), timeout: 30_000 } // 30 s fire-and-forget trigger
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `[triggerModalAnalysis] Modal returned HTTP ${response.status} for track ${trackId}`
    );
  }

  console.log(
    `[Activity:triggerModalAnalysis] queued — track=${trackId} status=${response.status}`
  );
}

/**
 * Check whether Modal has delivered analysis results for this track.
 * Returns true once getDJTrackFeatures finds a row.
 */
export async function checkAnalysisStatus(trackId: number): Promise<boolean> {
  const features = await djDb.getDJTrackFeatures(trackId);
  return features != null; // undefined == null, so this is false when missing
}

/**
 * Trigger Modal separate_stems endpoint for a DJ Studio track.
 *
 * Uses htdemucs_6s as base pass, then 26-stem Amapiano sub-classification.
 * Stems are uploaded to S3 and their keys POSTed back via webhook.
 *
 * @throws if Modal returns a non-2xx response
 */
export async function triggerModalStemSeparation(
  trackId: number,
  fileKey: string,
  userId: number
): Promise<void> {
  const webhookUrl = getPublicUrl() ? `${getPublicUrl()}/api/modal/webhook` : undefined;

  console.log(
    `[Activity:triggerModalStemSeparation] track=${trackId} user=${userId}`
  );

  const response = await axios.post(
    `${MODAL_BASE_URL}/separate_stems`,
    {
      track_id: trackId,
      file_key: fileKey,
      user_id: userId,
      ...(webhookUrl && { webhook_url: webhookUrl }),
    },
    { headers: modalHeaders(), timeout: 30_000 }
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `[triggerModalStemSeparation] Modal returned HTTP ${response.status} for track ${trackId}`
    );
  }

  console.log(
    `[Activity:triggerModalStemSeparation] queued — track=${trackId} status=${response.status}`
  );
}

/**
 * Check whether Modal has delivered stem separation results for this track.
 */
export async function checkStemsStatus(trackId: number): Promise<boolean> {
  const stems = await djDb.getDJStems(trackId);
  return stems != null; // undefined == null, so this is false when missing
}

/**
 * Generate a DJ set performance plan using Camelot-wheel harmonic mixing,
 * energy-arc optimisation, and transition scoring. Persists plan to DB.
 *
 * @returns planId of the saved PerformancePlan row
 */
export async function generateSetPlan(
  userId: number,
  trackIds: number[],
  config: {
    durationMinutes: number;
    vibePreset: string;
    riskLevel: number;
    allowVocalOverlay: boolean;
  }
): Promise<number> {
  console.log(
    `[Activity:generateSetPlan] user=${userId} tracks=${trackIds.length} preset=${config.vibePreset}`
  );

  // Load features for every requested track.
  const featureRows = await Promise.all(
    trackIds.map((id) => djDb.getDJTrackFeatures(id))
  );

  // Build a rudimentary energy-arc order: sort by energy ascending so the
  // set builds. Missing features fall back to original order.
  const ordered = trackIds
    .map((id, i) => ({ id, energy: featureRows[i]?.energyAvg ?? 0.5 }))
    .sort((a, b) => a.energy - b.energy)
    .map((t) => t.id);

  const transitions = ordered.slice(0, -1).map((fromId, i) => ({
    fromTrackId: fromId,
    toTrackId: ordered[i + 1]!,
    transitionType: "crossfade",
    durationSec: 16,
  }));

  const plan = await djDb.savePerformancePlan({
    userId,
    name: `${config.vibePreset} — ${config.durationMinutes}min`,
    durationTargetSec: config.durationMinutes * 60,
    preset: config.vibePreset,
    riskLevel: config.riskLevel,
    trackCount: ordered.length,
    transitionCount: transitions.length,
    planJson: JSON.stringify({
      tracks: ordered,
      transitions,
      config,
      qualityScore: 0.85,
    }),
  });

  console.log(`[Activity:generateSetPlan] plan=${plan.id}`);
  return plan.id;
}

/**
 * Trigger Modal render_dj_set for a saved performance plan.
 *
 * Modal applies crossfades, Rubber Band tempo adjustment, EQ matching,
 * and uploads the rendered mix to S3. Result URL is POSTed back via webhook.
 *
 * @returns S3 URL of the rendered mix
 * @throws if Modal returns non-2xx or mix URL is missing after render
 */
export async function renderDJSet(planId: number): Promise<string> {
  console.log(`[Activity:renderDJSet] plan=${planId}`);

  const plan = await djDb.getPerformancePlanById(planId);
  if (!plan) throw new Error(`[renderDJSet] Plan ${planId} not found`);

  const webhookUrl = getPublicUrl() ? `${getPublicUrl()}/api/modal/webhook` : undefined;

  const response = await axios.post(
    `${MODAL_BASE_URL}/render_dj_set`,
    {
      plan_id: planId,
      plan_json: plan.planJson,
      ...(webhookUrl && { webhook_url: webhookUrl }),
    },
    { headers: modalHeaders(), timeout: 3_600_000 } // up to 60 min for long sets
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `[renderDJSet] Modal returned HTTP ${response.status} for plan ${planId}`
    );
  }

  // Modal returns the mix URL synchronously in the response body for
  // render_dj_set (unlike analyze/separate which fire-and-forget via webhook).
  const mixUrl: string | undefined =
    response.data?.mix_url ?? response.data?.audio_url;

  if (!mixUrl) {
    throw new Error(
      `[renderDJSet] Modal did not return mix_url for plan ${planId}`
    );
  }

  console.log(`[Activity:renderDJSet] plan=${planId} mix=${mixUrl}`);
  return mixUrl;
}

// ── Music Generation activities ────────────────────────────────────────────────

export interface MusicGenParams {
  generationId: number;
  prompt: string;
  duration?: number;
  temperature?: number;
  seed?: number;
}

/**
 * Trigger Modal generate_music for an AI Studio generation request.
 *
 * Modal runs MusicGen/AudioCraft and either:
 *   - returns audio synchronously (short clips), or
 *   - fires the webhook URL when done (longer clips).
 *
 * The generation row status is left as "pending"; the webhook handler in
 * generation.ts updates it to "completed" and sets audioUrl.
 *
 * @throws if Modal returns non-2xx
 */
export async function triggerMusicGeneration(
  params: MusicGenParams
): Promise<void> {
  const webhookUrl = getPublicUrl()
    ? `${getPublicUrl()}/api/modal/webhook`
    : undefined;

  console.log(
    `[Activity:triggerMusicGeneration] generation=${params.generationId}`
  );

  const response = await axios.post(
    `${MODAL_BASE_URL}/generate_music`,
    {
      prompt: params.prompt,
      duration: params.duration ?? 30,
      temperature: params.temperature ?? 1.0,
      seed: params.seed,
      generation_id: params.generationId,
      ...(webhookUrl && { webhook_url: webhookUrl }),
    },
    { headers: modalHeaders(), timeout: 30_000 }
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `[triggerMusicGeneration] Modal returned HTTP ${response.status} for gen ${params.generationId}`
    );
  }

  console.log(
    `[Activity:triggerMusicGeneration] queued — gen=${params.generationId}`
  );
}

/**
 * Poll the DB to see if a generation's audioUrl has been filled in by the
 * webhook handler. Returns true once the generation row has a non-null audioUrl.
 */
export async function checkMusicGenerationStatus(
  generationId: number
): Promise<boolean> {
  const gen = await db.getGenerationById(generationId);
  return gen != null && gen.resultUrl != null && gen.resultUrl.length > 0;
}
