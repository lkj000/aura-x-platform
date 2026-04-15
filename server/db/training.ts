/**
 * db/training.ts — Training track ingestion and label repositories
 *
 * Manages the 150+ original Amapiano tracks used for model fine-tuning.
 * All operations are idempotent (re-running ingestion does not create
 * duplicate records — deduplication is SHA-256 based).
 */
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "./core";
import {
  trainingTracks, trainingLabels,
  type TrainingTrack, type InsertTrainingTrack,
  type TrainingLabel, type InsertTrainingLabel,
} from "../../drizzle/schema";

// ── Training Tracks ───────────────────────────────────────────────────────────

/**
 * Ingest a training track — idempotent by SHA-256.
 * Returns existing record if the file has already been ingested.
 */
export async function ingestTrainingTrack(
  track: InsertTrainingTrack
): Promise<{ track: TrainingTrack; isNew: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db.select().from(trainingTracks)
    .where(eq(trainingTracks.sha256, track.sha256)).limit(1);

  if (existing) return { track: existing, isNew: false };

  const result = await db.insert(trainingTracks).values(track);
  const insertedId = Number(result[0].insertId);
  const [inserted] = await db.select().from(trainingTracks)
    .where(eq(trainingTracks.id, insertedId)).limit(1);
  return { track: inserted!, isNew: true };
}

export async function getTrainingTrack(id: number): Promise<TrainingTrack | null> {
  const db = await getDb();
  if (!db) return null;
  const [track] = await db.select().from(trainingTracks).where(eq(trainingTracks.id, id)).limit(1);
  return track ?? null;
}

export async function updateTrainingTrackStatus(
  id: number,
  status: TrainingTrack["status"],
  extra?: Partial<InsertTrainingTrack>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(trainingTracks).set({ status, ...extra }).where(eq(trainingTracks.id, id));
}

export async function updateTrainingTrackFeatures(
  id: number,
  features: Partial<InsertTrainingTrack>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(trainingTracks).set(features).where(eq(trainingTracks.id, id));
}

export async function listTrainingTracks(filters: {
  status?: TrainingTrack["status"];
  isEligibleForTraining?: boolean;
  limit?: number;
  offset?: number;
}): Promise<TrainingTrack[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters.status !== undefined) conditions.push(eq(trainingTracks.status, filters.status));
  if (filters.isEligibleForTraining !== undefined)
    conditions.push(eq(trainingTracks.isEligibleForTraining, filters.isEligibleForTraining));

  let query = db.select().from(trainingTracks);
  if (conditions.length > 0) query = (query as any).where(and(...conditions));
  query = (query as any).orderBy(desc(trainingTracks.uploadedAt));
  if (filters.limit) query = (query as any).limit(filters.limit);
  if (filters.offset) query = (query as any).offset(filters.offset);

  return query;
}

export async function getTrainingPipelineStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  eligibleForTraining: number;
  avgCulturalScore: number | null;
}> {
  const db = await getDb();
  if (!db) return { total: 0, byStatus: {}, eligibleForTraining: 0, avgCulturalScore: null };

  const all = await db.select().from(trainingTracks);
  const byStatus: Record<string, number> = {};
  for (const t of all) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
  }

  const eligible = all.filter(t => t.isEligibleForTraining).length;
  const scored = all.filter(t => t.culturalScore !== null);
  const avgScore = scored.length > 0
    ? scored.reduce((s, t) => s + Number(t.culturalScore), 0) / scored.length
    : null;

  return {
    total: all.length,
    byStatus,
    eligibleForTraining: eligible,
    avgCulturalScore: avgScore,
  };
}

// ── Training Labels ───────────────────────────────────────────────────────────

export async function createTrainingLabel(label: InsertTrainingLabel): Promise<TrainingLabel> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(trainingLabels).values(label);
  const insertedId = Number(result[0].insertId);
  const [inserted] = await db.select().from(trainingLabels)
    .where(eq(trainingLabels.id, insertedId)).limit(1);

  // Mark track as labeled and update eligibility
  const isEligible = Number(label.avgStemQuality ?? 0) >= 0.7
    && Number(label.totalCulturalScore ?? 0) >= 60;

  await db.update(trainingTracks).set({
    isEligibleForTraining: isEligible,
    isVerifiedAmapiano: true,
    hasCleanStems: Number(label.avgStemQuality ?? 0) >= 0.7,
    status: "labeled",
    culturalScore: label.totalCulturalScore,
  }).where(eq(trainingTracks.id, label.trainingTrackId));

  return inserted!;
}

export async function getTrainingLabel(trainingTrackId: number): Promise<TrainingLabel | null> {
  const db = await getDb();
  if (!db) return null;
  const [label] = await db.select().from(trainingLabels)
    .where(eq(trainingLabels.trainingTrackId, trainingTrackId))
    .orderBy(desc(trainingLabels.reviewedAt)).limit(1);
  return label ?? null;
}
