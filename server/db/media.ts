/**
 * db/media.ts — Samples and Media Library repositories
 */
import { eq, and, like, desc } from "drizzle-orm";
import { getDb } from "./core";
import {
  samples, mediaLibrary,
  type Sample, type MediaLibraryItem, type InsertMediaLibraryItem,
} from "../../drizzle/schema";

// ── Samples ───────────────────────────────────────────────────────────────────

export async function getSamples(filters: {
  category?: string;
  key?: string;
  bpm?: number;
  search?: string;
  limit?: number;
}): Promise<Sample[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters.category) conditions.push(eq(samples.category, filters.category as any));
  if (filters.key) conditions.push(eq(samples.key, filters.key));
  if (filters.bpm) conditions.push(eq(samples.bpm, filters.bpm));
  if (filters.search) conditions.push(like(samples.name, `%${filters.search}%`));

  let query = db.select().from(samples);
  if (conditions.length > 0) query = query.where(and(...conditions)) as any;
  return query.limit(filters.limit || 50);
}

export async function getSampleById(sampleId: number): Promise<Sample | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(samples).where(eq(samples.id, sampleId)).limit(1);
  return result[0];
}

// ── Media Library ─────────────────────────────────────────────────────────────

export async function getUserMediaLibrary(userId: number, filters: {
  type?: string;
  search?: string;
  limit?: number;
}): Promise<MediaLibraryItem[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(mediaLibrary.userId, userId)];
  if (filters.type) conditions.push(eq(mediaLibrary.type, filters.type));
  if (filters.search) conditions.push(like(mediaLibrary.name, `%${filters.search}%`));

  return db.select().from(mediaLibrary).where(and(...conditions)).orderBy(desc(mediaLibrary.createdAt)).limit(filters.limit || 50);
}

export async function createMediaLibraryItem(item: InsertMediaLibraryItem): Promise<MediaLibraryItem> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(mediaLibrary).values(item);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(mediaLibrary).where(eq(mediaLibrary.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function deleteMediaLibraryItem(itemId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(mediaLibrary).where(eq(mediaLibrary.id, itemId));
}
