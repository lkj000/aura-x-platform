/**
 * db/generations.ts — Generation and GenerationHistory repositories
 *
 * Also owns gold_standard_generations writes — the T7 feedback loop kernel.
 * When a producer rates a generation ≥ 4/5, upsertGoldStandard() is called
 * and the row that makes the OS loop real is written.
 */
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./core";
import {
  generations, generationHistory, goldStandardGenerations,
  type Generation, type InsertGeneration,
  type GenerationHistory, type InsertGenerationHistory,
  type GoldStandardGeneration,
} from "../../drizzle/schema";

// ── Generations ───────────────────────────────────────────────────────────────

export async function createGeneration(generation: InsertGeneration): Promise<Generation> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(generations).values(generation);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(generations).where(eq(generations.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function getUserGenerations(userId: number, limit = 50, offset = 0): Promise<Generation[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(generations).where(eq(generations.userId, userId)).orderBy(desc(generations.createdAt)).limit(limit).offset(offset);
}

export async function getGenerationById(generationId: number): Promise<Generation | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(generations).where(eq(generations.id, generationId)).limit(1);
  return result[0];
}

export async function updateGeneration(generationId: number, updates: Partial<InsertGeneration>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(generations).set(updates).where(eq(generations.id, generationId));
}

export async function getGenerationRetryCount(generationId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(generations).where(eq(generations.parentId, generationId));
  return result.length;
}

export async function toggleGenerationFavorite(generationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [gen] = await db.select().from(generations).where(eq(generations.id, generationId)).limit(1);
  if (!gen) throw new Error("Generation not found");
  await db.update(generations).set({ isFavorite: !(gen as any).isFavorite }).where(eq(generations.id, generationId));
}

export async function deleteGeneration(generationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(generations).where(eq(generations.id, generationId));
}

// ── Generation History ────────────────────────────────────────────────────────

export async function createGenerationHistory(history: InsertGenerationHistory): Promise<GenerationHistory> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(generationHistory).values(history);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(generationHistory).where(eq(generationHistory.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function getUserGenerationHistory(userId: number, projectId?: number, limit = 50): Promise<GenerationHistory[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = projectId
    ? and(eq(generationHistory.userId, userId), eq(generationHistory.projectId, projectId))
    : eq(generationHistory.userId, userId);
  return db.select().from(generationHistory).where(conditions).orderBy(desc(generationHistory.createdAt)).limit(limit);
}

export async function getGenerationHistoryById(id: number): Promise<GenerationHistory | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(generationHistory).where(eq(generationHistory.id, id)).limit(1);
  return result[0];
}

export async function updateGenerationHistory(id: number, updates: Partial<InsertGenerationHistory>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(generationHistory).set(updates).where(eq(generationHistory.id, id));
}

export async function toggleGenerationHistoryFavorite(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getGenerationHistoryById(id);
  if (!current) throw new Error("Generation history not found");
  await db.update(generationHistory).set({ isFavorite: !current.isFavorite }).where(eq(generationHistory.id, id));
}

export async function deleteGenerationHistory(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(generationHistory).where(eq(generationHistory.id, id));
}

// ── Gold Standard (T7 feedback loop kernel) ───────────────────────────────────

/**
 * Store a 1–5 star rating on the generation record.
 * Callers must separately call upsertGoldStandard() when rating >= 4.
 */
export async function setGenerationRating(generationId: number, rating: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(generations).set({ userRating: rating }).where(eq(generations.id, generationId));
}

/**
 * Upsert a gold standard record for a generation.
 *
 * On first call: INSERT with feedbackCount=1.
 * On subsequent calls: UPDATE with running weighted average.
 *
 * This is the write that makes the OS feedback loop real. Called only when
 * a producer rates a generation >= 4/5. The Phase 0 exit criterion is
 * that this table has at least one row after the first test generation.
 */
export async function upsertGoldStandard(params: {
  generationId: number;
  culturalRating: number;
  swingRating: number;
  linguisticRating?: number;
  productionRating?: number;
  // Full feature vector (PRD §5.3) — denormalised so fine-tuning needs no join
  featureVector?: {
    audioUrl?: string | null;
    prompt?: string | null;
    culturalScore?: string | number | null;
    culturalScoreBreakdown?: Record<string, unknown> | null;
    bpm?: number | null;
    key?: string | null;
    contrastScore?: string | number | null;
    grooveFingerprint?: unknown | null;
    timbralContractScore?: string | number | null;
    style?: string | null;
    parameters?: unknown | null;
  };
}): Promise<GoldStandardGeneration> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(goldStandardGenerations)
    .where(eq(goldStandardGenerations.generationId, params.generationId))
    .limit(1);

  if (existing.length > 0) {
    const prev = existing[0]!;
    const n = prev.feedbackCount;
    // Weighted running average: newAvg = (prevAvg * n + newVal) / (n + 1)
    const avg = (prev: string | number, next: number) =>
      ((Number(prev) * n + next) / (n + 1)).toFixed(2);

    const fv = params.featureVector;
    await db
      .update(goldStandardGenerations)
      .set({
        avgCulturalRating: avg(prev.avgCulturalRating, params.culturalRating) as any,
        avgSwingRating: avg(prev.avgSwingRating, params.swingRating) as any,
        avgLinguisticRating: params.linguisticRating != null
          ? (avg(prev.avgLinguisticRating ?? params.linguisticRating, params.linguisticRating) as any)
          : prev.avgLinguisticRating,
        avgProductionRating: params.productionRating != null
          ? (avg(prev.avgProductionRating ?? params.productionRating, params.productionRating) as any)
          : prev.avgProductionRating,
        feedbackCount: n + 1,
        // Refresh feature vector fields if caller provides them (idempotent on re-rate)
        ...(fv && {
          audioUrl: fv.audioUrl ?? prev.audioUrl,
          prompt: fv.prompt ?? prev.prompt,
          culturalScore: fv.culturalScore != null ? String(fv.culturalScore) as any : prev.culturalScore,
          culturalScoreBreakdown: fv.culturalScoreBreakdown ?? prev.culturalScoreBreakdown,
          bpm: fv.bpm ?? prev.bpm,
          key: fv.key ?? prev.key,
          contrastScore: fv.contrastScore != null ? String(fv.contrastScore) as any : prev.contrastScore,
          grooveFingerprint: fv.grooveFingerprint ?? prev.grooveFingerprint,
          timbralContractScore: fv.timbralContractScore != null ? String(fv.timbralContractScore) as any : prev.timbralContractScore,
          style: fv.style ?? prev.style,
          parameters: fv.parameters ?? prev.parameters,
        }),
      })
      .where(eq(goldStandardGenerations.id, prev.id));

    const updated = await db
      .select()
      .from(goldStandardGenerations)
      .where(eq(goldStandardGenerations.id, prev.id))
      .limit(1);
    return updated[0]!;
  }

  const fv = params.featureVector;
  const result = await db.insert(goldStandardGenerations).values({
    generationId: params.generationId,
    avgCulturalRating: params.culturalRating.toFixed(2) as any,
    avgSwingRating: params.swingRating.toFixed(2) as any,
    avgLinguisticRating: params.linguisticRating?.toFixed(2) as any,
    avgProductionRating: params.productionRating?.toFixed(2) as any,
    feedbackCount: 1,
    favoriteCount: 0,
    isGoldStandard: true,
    // Full feature vector — denormalised copy from generation_history
    audioUrl: fv?.audioUrl ?? null,
    prompt: fv?.prompt ?? null,
    culturalScore: fv?.culturalScore != null ? String(fv.culturalScore) as any : null,
    culturalScoreBreakdown: fv?.culturalScoreBreakdown ?? null,
    bpm: fv?.bpm ?? null,
    key: fv?.key ?? null,
    contrastScore: fv?.contrastScore != null ? String(fv.contrastScore) as any : null,
    grooveFingerprint: fv?.grooveFingerprint ?? null,
    timbralContractScore: fv?.timbralContractScore != null ? String(fv.timbralContractScore) as any : null,
    style: fv?.style ?? null,
    parameters: fv?.parameters ?? null,
  });

  const inserted = await db
    .select()
    .from(goldStandardGenerations)
    .where(eq(goldStandardGenerations.id, Number(result[0].insertId)))
    .limit(1);
  return inserted[0]!;
}

/**
 * Retrieve the gold standard record for a generation, if it exists.
 */
export async function getGoldStandardByGenerationId(
  generationId: number
): Promise<GoldStandardGeneration | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(goldStandardGenerations)
    .where(eq(goldStandardGenerations.generationId, generationId))
    .limit(1);
  return result[0];
}
