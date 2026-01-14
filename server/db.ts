import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, projects, tracks, generations, mediaLibrary, generationHistory, type Project, type Track, type Generation, type InsertProject, type InsertTrack, type InsertGeneration, type GenerationHistory, type InsertGenerationHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Project queries
export async function createProject(project: InsertProject): Promise<Project> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projects).values(project);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(projects).where(eq(projects.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function getUserProjects(userId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(projects).where(eq(projects.userId, userId));
}

export async function getProjectById(projectId: number): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return result[0];
}

export async function updateProject(projectId: number, updates: Partial<InsertProject>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(projects).set(updates).where(eq(projects.id, projectId));
}

export async function deleteProject(projectId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete associated tracks first
  await db.delete(tracks).where(eq(tracks.projectId, projectId));
  // Then delete the project
  await db.delete(projects).where(eq(projects.id, projectId));
}

// Track queries
export async function createTrack(track: InsertTrack): Promise<Track> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(tracks).values(track);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(tracks).where(eq(tracks.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function getProjectTracks(projectId: number): Promise<Track[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(tracks).where(eq(tracks.projectId, projectId));
}

export async function updateTrack(trackId: number, updates: Partial<InsertTrack>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(tracks).set(updates).where(eq(tracks.id, trackId));
}

export async function deleteTrack(trackId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(tracks).where(eq(tracks.id, trackId));
}

// Generation queries
export async function createGeneration(generation: InsertGeneration): Promise<Generation> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(generations).values(generation);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(generations).where(eq(generations.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function getUserGenerations(userId: number): Promise<Generation[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(generations).where(eq(generations.userId, userId));
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

// Generation History queries
export async function createGenerationHistory(history: InsertGenerationHistory): Promise<GenerationHistory> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(generationHistory).values(history);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(generationHistory).where(eq(generationHistory.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function getUserGenerationHistory(
  userId: number,
  projectId?: number,
  limit: number = 50
): Promise<GenerationHistory[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = projectId
    ? and(eq(generationHistory.userId, userId), eq(generationHistory.projectId, projectId))
    : eq(generationHistory.userId, userId);

  return db
    .select()
    .from(generationHistory)
    .where(conditions)
    .orderBy(desc(generationHistory.createdAt))
    .limit(limit);
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
