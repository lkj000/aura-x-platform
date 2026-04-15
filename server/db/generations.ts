/**
 * db/generations.ts — Generation and GenerationHistory repositories
 */
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./core";
import {
  generations, generationHistory,
  type Generation, type InsertGeneration,
  type GenerationHistory, type InsertGenerationHistory,
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
