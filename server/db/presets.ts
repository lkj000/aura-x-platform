/**
 * db/presets.ts — Preset Favorites and Custom Presets repositories
 */
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./core";
import {
  presetFavorites, customPresets,
  type PresetFavorite, type InsertPresetFavorite,
  type CustomPreset, type InsertCustomPreset,
} from "../../drizzle/schema";

// ── Preset Favorites ──────────────────────────────────────────────────────────

export async function getUserPresetFavorites(userId: number): Promise<PresetFavorite[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(presetFavorites).where(eq(presetFavorites.userId, userId)).orderBy(desc(presetFavorites.createdAt));
}

export async function addPresetFavorite(userId: number, presetId: string): Promise<PresetFavorite> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(presetFavorites).where(and(eq(presetFavorites.userId, userId), eq(presetFavorites.presetId, presetId))).limit(1);
  if (existing.length > 0) return existing[0]!;
  const result = await db.insert(presetFavorites).values({ userId, presetId });
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(presetFavorites).where(eq(presetFavorites.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function removePresetFavorite(userId: number, presetId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(presetFavorites).where(and(eq(presetFavorites.userId, userId), eq(presetFavorites.presetId, presetId)));
}

export async function isPresetFavorited(userId: number, presetId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(presetFavorites).where(and(eq(presetFavorites.userId, userId), eq(presetFavorites.presetId, presetId))).limit(1);
  return result.length > 0;
}

// ── Custom Presets ────────────────────────────────────────────────────────────

export async function getUserCustomPresets(userId: number): Promise<CustomPreset[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customPresets).where(eq(customPresets.userId, userId)).orderBy(desc(customPresets.createdAt));
}

export async function getCustomPresetById(presetId: number): Promise<CustomPreset | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customPresets).where(eq(customPresets.id, presetId)).limit(1);
  return result[0] || null;
}

export async function createCustomPreset(preset: InsertCustomPreset): Promise<CustomPreset> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customPresets).values(preset);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(customPresets).where(eq(customPresets.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function updateCustomPreset(presetId: number, updates: Partial<InsertCustomPreset>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(customPresets).set(updates).where(eq(customPresets.id, presetId));
}

export async function deleteCustomPreset(presetId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(customPresets).where(eq(customPresets.id, presetId));
}

export async function incrementCustomPresetUsage(presetId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const preset = await getCustomPresetById(presetId);
  if (preset) {
    await db.update(customPresets).set({ usageCount: (preset.usageCount || 0) + 1 }).where(eq(customPresets.id, presetId));
  }
}
