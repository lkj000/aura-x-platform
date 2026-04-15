/**
 * DJ Studio Database Helper Functions
 * 
 * Provides database operations for DJ Set Generator:
 * - Track management (upload, list, delete)
 * - Track features (analysis results)
 * - Stems (separated audio stems)
 * - Performance plans (generated DJ sets)
 * - Renders (final mix outputs)
 */

import { getDb } from "./db";
import { 
  djTracks, 
  djTrackFeatures, 
  djStems, 
  djPerformancePlans, 
  djRenders,
  djVibePresets,
  type DJTrack,
  type InsertDJTrack,
  type DJTrackFeatures,
  type InsertDJTrackFeatures,
  type DJStems,
  type InsertDJStems,
  type DJPerformancePlan,
  type InsertDJPerformancePlan,
  type DJRender,
  type InsertDJRender,
  type DJVibePreset,
  type InsertDJVibePreset,
} from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

// Helper to get database instance
const getDatabase = async () => {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db;
};

// ============================================================================
// TRACK MANAGEMENT
// ============================================================================

/**
 * Create a new DJ track record
 */
export async function createDJTrack(track: InsertDJTrack): Promise<DJTrack> {
  const db = await getDatabase();
  const [newTrack] = await db.insert(djTracks).values(track).$returningId();
  const [created] = await db.select().from(djTracks).where(eq(djTracks.id, newTrack.id));
  return created;
}

/**
 * Get all tracks for a user
 */
export async function getUserDJTracks(userId: number): Promise<DJTrack[]> {
  const db = await getDatabase();
  return db.select().from(djTracks).where(eq(djTracks.userId, userId)).orderBy(desc(djTracks.createdAt));
}

/**
 * Get a single track by ID
 */
export async function getDJTrackById(trackId: number): Promise<DJTrack | undefined> {
  const db = await getDatabase();
  const [track] = await db.select().from(djTracks).where(eq(djTracks.id, trackId));
  return track;
}

/**
 * Delete a track and its associated data
 */
export async function deleteDJTrack(trackId: number): Promise<void> {
  const db = await getDatabase();
  // Delete associated features, stems, etc. (cascading delete)
  await db.delete(djTrackFeatures).where(eq(djTrackFeatures.trackId, trackId));
  await db.delete(djStems).where(eq(djStems.trackId, trackId));
  await db.delete(djTracks).where(eq(djTracks.id, trackId));
}

/**
 * Update the duration of a track (set after analysis completes — uploaded as 0).
 */
export async function updateDJTrackDuration(trackId: number, durationSec: number): Promise<void> {
  const db = await getDatabase();
  await db.update(djTracks).set({ durationSec }).where(eq(djTracks.id, trackId));
}

/**
 * Check if a track with the same SHA256 hash already exists for this user
 */
export async function findDJTrackByHash(userId: number, sha256: string): Promise<DJTrack | undefined> {
  const db = await getDatabase();
  const [track] = await db
    .select()
    .from(djTracks)
    .where(and(eq(djTracks.userId, userId), eq(djTracks.sha256, sha256)));
  return track;
}

// ============================================================================
// TRACK FEATURES (ANALYSIS)
// ============================================================================

/**
 * Save track analysis results
 */
export async function saveDJTrackFeatures(features: InsertDJTrackFeatures): Promise<DJTrackFeatures> {
  const db = await getDatabase();
  const [newFeatures] = await db.insert(djTrackFeatures).values(features).$returningId();
  const [created] = await db.select().from(djTrackFeatures).where(eq(djTrackFeatures.id, newFeatures.id));
  return created;
}

/**
 * Get track features by track ID
 */
export async function getDJTrackFeatures(trackId: number): Promise<DJTrackFeatures | undefined> {
  const db = await getDatabase();
  const [features] = await db.select().from(djTrackFeatures).where(eq(djTrackFeatures.trackId, trackId));
  return features;
}

/**
 * Update track features
 */
export async function updateDJTrackFeatures(trackId: number, features: Partial<DJTrackFeatures>): Promise<void> {
  const db = await getDatabase();
  await db.update(djTrackFeatures).set(features).where(eq(djTrackFeatures.trackId, trackId));
}

// ============================================================================
// STEMS
// ============================================================================

/**
 * Save separated stems for a track
 */
export async function saveDJStems(stems: InsertDJStems): Promise<DJStems> {
  const db = await getDatabase();
  const [newStems] = await db.insert(djStems).values(stems).$returningId();
  const [created] = await db.select().from(djStems).where(eq(djStems.id, newStems.id));
  return created;
}

/**
 * Get stems for a track
 */
export async function getDJStems(trackId: number): Promise<DJStems | undefined> {
  const db = await getDatabase();
  const [stems] = await db.select().from(djStems).where(eq(djStems.trackId, trackId));
  return stems;
}

// ============================================================================
// PERFORMANCE PLANS
// ============================================================================

/**
 * Save a generated performance plan
 */
export async function savePerformancePlan(plan: InsertDJPerformancePlan): Promise<DJPerformancePlan> {
  const db = await getDatabase();
  const [newPlan] = await db.insert(djPerformancePlans).values(plan).$returningId();
  const [created] = await db.select().from(djPerformancePlans).where(eq(djPerformancePlans.id, newPlan.id));
  return created;
}

/**
 * Get all performance plans for a user
 */
export async function getUserPerformancePlans(userId: number): Promise<DJPerformancePlan[]> {
  const db = await getDatabase();
  return db.select().from(djPerformancePlans).where(eq(djPerformancePlans.userId, userId)).orderBy(desc(djPerformancePlans.createdAt));
}

/**
 * Get a single performance plan by ID
 */
export async function getPerformancePlanById(planId: number): Promise<DJPerformancePlan | undefined> {
  const db = await getDatabase();
  const [plan] = await db.select().from(djPerformancePlans).where(eq(djPerformancePlans.id, planId));
  return plan;
}

// ============================================================================
// RENDERS
// ============================================================================

/**
 * Create a new render job
 */
export async function createDJRender(render: InsertDJRender): Promise<DJRender> {
  const db = await getDatabase();
  const [newRender] = await db.insert(djRenders).values(render).$returningId();
  const [created] = await db.select().from(djRenders).where(eq(djRenders.id, newRender.id));
  return created;
}

/**
 * Mark a render as complete from a Modal webhook callback.
 * Finds the pending render for this plan and updates it.
 */
export async function updateRenderComplete(data: {
  planId: number;
  mixUrl: string;
  mixKey: string;
  cueSheetUrl?: string;
  cueSheetKey?: string;
  renderTimeSec?: number;
}): Promise<void> {
  const db = await getDatabase();
  // Find the most recent pending/processing render for this plan
  const [render] = await db.select().from(djRenders)
    .where(and(eq(djRenders.planId, data.planId)))
    .orderBy(desc(djRenders.createdAt)).limit(1);
  if (!render) {
    console.warn(`[DJStudioDb] No render found for plan ${data.planId}`);
    return;
  }
  await db.update(djRenders).set({
    status: "completed",
    mixUrl: data.mixUrl,
    mixKey: data.mixKey,
    cueSheetUrl: data.cueSheetUrl,
    cueSheetKey: data.cueSheetKey,
    renderTimeSec: data.renderTimeSec,
    completedAt: new Date(),
  }).where(eq(djRenders.id, render.id));
}

/**
 * Update render status
 */
export async function updateDJRenderStatus(
  renderId: number,
  status: "pending" | "processing" | "completed" | "failed",
  data?: {
    mixUrl?: string;
    mixKey?: string;
    cueSheetUrl?: string;
    cueSheetKey?: string;
    errorMessage?: string;
    renderTimeSec?: number;
    completedAt?: Date;
  }
): Promise<void> {
  const db = await getDatabase();
  await db.update(djRenders).set({ status, ...data }).where(eq(djRenders.id, renderId));
}

/**
 * Get render by ID
 */
export async function getDJRenderById(renderId: number): Promise<DJRender | undefined> {
  const db = await getDatabase();
  const [render] = await db.select().from(djRenders).where(eq(djRenders.id, renderId));
  return render;
}

/**
 * Get all renders for a performance plan
 */
export async function getPlanRenders(planId: number): Promise<DJRender[]> {
  const db = await getDatabase();
  return db.select().from(djRenders).where(eq(djRenders.planId, planId)).orderBy(desc(djRenders.createdAt));
}

// ============================================================================
// VIBE PRESETS
// ============================================================================

/**
 * Get all vibe presets
 */
export async function getAllVibePresets(): Promise<DJVibePreset[]> {
  const db = await getDatabase();
  return db.select().from(djVibePresets).orderBy(djVibePresets.usageCount);
}

/**
 * Get a vibe preset by name
 */
export async function getVibePresetByName(name: string): Promise<DJVibePreset | undefined> {
  const db = await getDatabase();
  const [preset] = await db.select().from(djVibePresets).where(eq(djVibePresets.name, name));
  return preset;
}

/**
 * Increment usage count for a preset
 */
export async function incrementPresetUsage(presetId: number): Promise<void> {
  const db = await getDatabase();
  await db.execute(`UPDATE dj_vibe_presets SET usage_count = usage_count + 1 WHERE id = ${presetId}`);
}
