import { eq, and, desc, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, projects, tracks, generations, mediaLibrary, generationHistory,
  audioClips, midiNotes, samples,
  type Project, type Track, type Generation, type InsertProject, type InsertTrack, type InsertGeneration, 
  type GenerationHistory, type InsertGenerationHistory, type AudioClip, type InsertAudioClip,
  type MidiNote, type InsertMidiNote, type Sample, type MediaLibraryItem, type InsertMediaLibraryItem
} from "../drizzle/schema";
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

// Audio Clips queries
export async function createAudioClip(clip: InsertAudioClip): Promise<AudioClip> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(audioClips).values(clip);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(audioClips).where(eq(audioClips.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function getTrackAudioClips(trackId: number): Promise<AudioClip[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(audioClips).where(eq(audioClips.trackId, trackId));
}

export async function updateAudioClip(clipId: number, updates: Partial<InsertAudioClip>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(audioClips).set(updates).where(eq(audioClips.id, clipId));
}

export async function deleteAudioClip(clipId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(audioClips).where(eq(audioClips.id, clipId));
}

// MIDI Notes queries
export async function createMidiNote(note: InsertMidiNote): Promise<MidiNote> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(midiNotes).values(note);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(midiNotes).where(eq(midiNotes.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function createMidiNotesBatch(trackId: number, notes: Omit<InsertMidiNote, 'trackId'>[]): Promise<MidiNote[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const notesWithTrackId = notes.map(note => ({ ...note, trackId }));
  await db.insert(midiNotes).values(notesWithTrackId);
  
  // Return all notes for this track
  return getTrackMidiNotes(trackId);
}

export async function getTrackMidiNotes(trackId: number): Promise<MidiNote[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(midiNotes).where(eq(midiNotes.trackId, trackId));
}

export async function updateMidiNote(noteId: number, updates: Partial<InsertMidiNote>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(midiNotes).set(updates).where(eq(midiNotes.id, noteId));
}

export async function deleteMidiNote(noteId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(midiNotes).where(eq(midiNotes.id, noteId));
}

export async function deleteMidiNotesBatch(noteIds: number[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(midiNotes).where(inArray(midiNotes.id, noteIds));
}

// Samples queries
export async function getSamples(filters: {
  category?: string;
  key?: string;
  bpm?: number;
  search?: string;
  limit?: number;
}): Promise<Sample[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(samples);
  
  const conditions = [];
  if (filters.category) {
    conditions.push(eq(samples.category, filters.category as any));
  }
  if (filters.key) {
    conditions.push(eq(samples.key, filters.key));
  }
  if (filters.bpm) {
    conditions.push(eq(samples.bpm, filters.bpm));
  }
  if (filters.search) {
    conditions.push(like(samples.name, `%${filters.search}%`));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.limit(filters.limit || 50);
}

export async function getSampleById(sampleId: number): Promise<Sample | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(samples).where(eq(samples.id, sampleId)).limit(1);
  return result[0];
}

// Media Library queries
export async function getUserMediaLibrary(userId: number, filters: {
  type?: string;
  search?: string;
  limit?: number;
}): Promise<MediaLibraryItem[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(mediaLibrary).where(eq(mediaLibrary.userId, userId));
  
  const conditions = [eq(mediaLibrary.userId, userId)];
  if (filters.type) {
    conditions.push(eq(mediaLibrary.type, filters.type));
  }
  if (filters.search) {
    conditions.push(like(mediaLibrary.name, `%${filters.search}%`));
  }

  if (conditions.length > 1) {
    query = db.select().from(mediaLibrary).where(and(...conditions)) as any;
  }

  return query.orderBy(desc(mediaLibrary.createdAt)).limit(filters.limit || 50);
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
