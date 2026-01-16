import { eq, and, desc, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, projects, tracks, generations, mediaLibrary, generationHistory,
  audioClips, midiNotes, samples, presetFavorites, customPresets,
  projectCollaborators, projectActivityLog, projectInvitations,
  automationLanes, automationPoints,
  marketplaceSamplePacks, marketplacePurchases, marketplaceReviews, marketplaceDownloads,
  marketplaceBundles, marketplaceBundlePacks,
  type Project, type Track, type Generation, type InsertProject, type InsertTrack, type InsertGeneration, 
  type GenerationHistory, type InsertGenerationHistory, type AudioClip, type InsertAudioClip,
  type MidiNote, type InsertMidiNote, type Sample, type MediaLibraryItem, type InsertMediaLibraryItem,
  type PresetFavorite, type InsertPresetFavorite, type CustomPreset, type InsertCustomPreset,
  type ProjectCollaborator, type InsertProjectCollaborator,
  type ProjectActivityLog, type InsertProjectActivityLog,
  type ProjectInvitation, type InsertProjectInvitation,
  type AutomationLane, type InsertAutomationLane,
  type AutomationPoint, type InsertAutomationPoint
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

// ========================================
// Preset Favorites
// ========================================

export async function getUserPresetFavorites(userId: number): Promise<PresetFavorite[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(presetFavorites).where(eq(presetFavorites.userId, userId)).orderBy(desc(presetFavorites.createdAt));
}

export async function addPresetFavorite(userId: number, presetId: string): Promise<PresetFavorite> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if already favorited
  const existing = await db.select().from(presetFavorites)
    .where(and(eq(presetFavorites.userId, userId), eq(presetFavorites.presetId, presetId)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0]!;
  }

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

  const result = await db.select().from(presetFavorites)
    .where(and(eq(presetFavorites.userId, userId), eq(presetFavorites.presetId, presetId)))
    .limit(1);

  return result.length > 0;
}

// ========================================
// Custom Presets
// ========================================

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
    await db.update(customPresets)
      .set({ usageCount: (preset.usageCount || 0) + 1 })
      .where(eq(customPresets.id, presetId));
  }
}

// ========================================
// Project Collaboration
// ========================================

export async function getProjectCollaborators(projectId: number): Promise<ProjectCollaborator[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(projectCollaborators)
    .where(and(
      eq(projectCollaborators.projectId, projectId),
      eq(projectCollaborators.status, 'accepted')
    ))
    .orderBy(desc(projectCollaborators.invitedAt));
}

export async function addProjectCollaborator(collab: InsertProjectCollaborator): Promise<ProjectCollaborator> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projectCollaborators).values(collab);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(projectCollaborators).where(eq(projectCollaborators.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function updateCollaboratorRole(collabId: number, role: 'owner' | 'admin' | 'editor' | 'viewer'): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(projectCollaborators).set({ role }).where(eq(projectCollaborators.id, collabId));
}

export async function removeProjectCollaborator(collabId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(projectCollaborators)
    .set({ status: 'revoked' })
    .where(eq(projectCollaborators.id, collabId));
}

export async function getUserProjectRole(userId: number, projectId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(projectCollaborators)
    .where(and(
      eq(projectCollaborators.userId, userId),
      eq(projectCollaborators.projectId, projectId),
      eq(projectCollaborators.status, 'accepted')
    ))
    .limit(1);

  return result[0]?.role || null;
}

// ========================================
// Project Activity Log
// ========================================

export async function logProjectActivity(activity: InsertProjectActivityLog): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(projectActivityLog).values(activity);
}

export async function getProjectActivity(projectId: number, limit: number = 50): Promise<ProjectActivityLog[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(projectActivityLog)
    .where(eq(projectActivityLog.projectId, projectId))
    .orderBy(desc(projectActivityLog.timestamp))
    .limit(limit);
}

// ========================================
// Project Invitations
// ========================================

export async function createProjectInvitation(invitation: InsertProjectInvitation): Promise<ProjectInvitation> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projectInvitations).values(invitation);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(projectInvitations).where(eq(projectInvitations.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function getProjectInvitationByToken(token: string): Promise<ProjectInvitation | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(projectInvitations)
    .where(eq(projectInvitations.token, token))
    .limit(1);

  return result[0] || null;
}

export async function acceptProjectInvitation(invitationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(projectInvitations)
    .set({ 
      status: 'accepted',
      acceptedAt: new Date()
    })
    .where(eq(projectInvitations.id, invitationId));
}

export async function getPendingInvitations(userId: number): Promise<ProjectInvitation[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(projectInvitations)
    .where(and(
      eq(projectInvitations.inviteeUserId, userId),
      eq(projectInvitations.status, 'pending')
    ))
    .orderBy(desc(projectInvitations.createdAt));
}

// ========================================
// Automation Lanes & Points
// ========================================

export async function createAutomationLane(lane: InsertAutomationLane): Promise<AutomationLane> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(automationLanes).values(lane);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(automationLanes).where(eq(automationLanes.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function getAutomationLanesByTrack(trackId: number): Promise<AutomationLane[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(automationLanes)
    .where(eq(automationLanes.trackId, trackId));
}

export async function updateAutomationLane(id: number, updates: Partial<InsertAutomationLane>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(automationLanes)
    .set(updates)
    .where(eq(automationLanes.id, id));
}

export async function deleteAutomationLane(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete all points first
  await db.delete(automationPoints).where(eq(automationPoints.laneId, id));
  
  // Delete lane
  await db.delete(automationLanes).where(eq(automationLanes.id, id));
}

export async function createAutomationPoint(point: InsertAutomationPoint): Promise<AutomationPoint> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(automationPoints).values(point);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(automationPoints).where(eq(automationPoints.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function getAutomationPointsByLane(laneId: number): Promise<AutomationPoint[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(automationPoints)
    .where(eq(automationPoints.laneId, laneId))
    .orderBy(automationPoints.time);
}

export async function updateAutomationPoint(id: number, updates: Partial<InsertAutomationPoint>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(automationPoints)
    .set(updates)
    .where(eq(automationPoints.id, id));
}

export async function deleteAutomationPoint(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(automationPoints).where(eq(automationPoints.id, id));
}

export async function bulkCreateAutomationPoints(points: InsertAutomationPoint[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (points.length === 0) return;

  await db.insert(automationPoints).values(points);
}

export async function deleteAutomationPointsByLane(laneId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(automationPoints).where(eq(automationPoints.laneId, laneId));
}

// ========================================
// Marketplace Sample Packs
// ========================================

export async function listMarketplacePacks(filters: {
  search?: string;
  category?: string;
  sortBy?: 'popular' | 'recent' | 'price_low' | 'price_high';
  limit?: number;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  // Build conditions
  const conditions = [];
  if (filters.search) {
    conditions.push(
      or(
        like(marketplaceSamplePacks.title, `%${filters.search}%`),
        like(marketplaceSamplePacks.description, `%${filters.search}%`)
      )
    );
  }
  if (filters.category) {
    conditions.push(eq(marketplaceSamplePacks.category, filters.category));
  }

  // Build query
  let baseQuery = db.select().from(marketplaceSamplePacks);
  
  if (conditions.length > 0) {
    baseQuery = baseQuery.where(and(...conditions)) as any;
  }

  // Apply sorting
  switch (filters.sortBy) {
    case 'recent':
      baseQuery = baseQuery.orderBy(desc(marketplaceSamplePacks.createdAt)) as any;
      break;
    case 'price_low':
      baseQuery = baseQuery.orderBy(marketplaceSamplePacks.price) as any;
      break;
    case 'price_high':
      baseQuery = baseQuery.orderBy(desc(marketplaceSamplePacks.price)) as any;
      break;
    case 'popular':
    default:
      baseQuery = baseQuery.orderBy(desc(marketplaceSamplePacks.createdAt)) as any; // Use createdAt as fallback
      break;
  }

  const results = await baseQuery.limit(filters.limit || 50);
  return results;
}

export async function getMarketplacePack(id: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(marketplaceSamplePacks)
    .where(eq(marketplaceSamplePacks.id, id))
    .limit(1);

  return result[0] || null;
}

export async function createMarketplacePack(pack: any): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(marketplaceSamplePacks).values(pack);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(marketplaceSamplePacks)
    .where(eq(marketplaceSamplePacks.id, insertedId))
    .limit(1);
  return inserted[0]!;
}

// ========================================
// Marketplace Purchases
// ========================================

export async function createMarketplacePurchase(purchase: {
  userId: number;
  packId: number;
  paymentIntentId: string;
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get pack price
  const pack = await getMarketplacePack(purchase.packId);
  if (!pack) throw new Error("Pack not found");

  const result = await db.insert(marketplacePurchases).values({
    ...purchase,
    amount: pack.price,
  });
  const insertedId = Number(result[0].insertId);

  // Increment purchase count (if field exists)
  // Note: purchaseCount field may need to be added to schema
  try {
    await db.update(marketplaceSamplePacks)
      .set({ 
        updatedAt: new Date()
      })
      .where(eq(marketplaceSamplePacks.id, purchase.packId));
  } catch (error) {
    console.warn('[Marketplace] Could not update pack after purchase:', error);
  }
  
  const inserted = await db.select().from(marketplacePurchases)
    .where(eq(marketplacePurchases.id, insertedId))
    .limit(1);
  return inserted[0]!;
}

export async function getUserMarketplacePurchases(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const purchases = await db.select().from(marketplacePurchases)
    .where(eq(marketplacePurchases.userId, userId))
    .orderBy(desc(marketplacePurchases.purchasedAt));

  // Enrich with pack details and download count
  const enriched = await Promise.all(purchases.map(async (purchase) => {
    const pack = await getMarketplacePack(purchase.packId);
    const downloads = await getMarketplaceDownloadsByPurchase(purchase.id);
    return {
      ...purchase,
      pack,
      downloadCount: downloads.length,
      downloads,
    };
  }));

  return enriched;
}

// ========================================
// Marketplace Reviews
// ========================================

export async function createMarketplaceReview(review: {
  userId: number;
  packId: number;
  rating: number;
  comment?: string;
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(marketplaceReviews).values(review);
  const insertedId = Number(result[0].insertId);

  // Update pack average rating
  const reviews = await getMarketplaceReviews(review.packId);
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  
  await db.update(marketplaceSamplePacks)
    .set({ rating: avgRating })
    .where(eq(marketplaceSamplePacks.id, review.packId));
  
  const inserted = await db.select().from(marketplaceReviews)
    .where(eq(marketplaceReviews.id, insertedId))
    .limit(1);
  return inserted[0]!;
}

export async function getMarketplaceReviews(packId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(marketplaceReviews)
    .where(eq(marketplaceReviews.packId, packId))
    .orderBy(desc(marketplaceReviews.createdAt));
}

export async function createMarketplaceDownload(data: {
  userId: number;
  packId: number;
  purchaseId: number;
  ipAddress?: string;
  userAgent?: string;
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [download] = await db.insert(marketplaceDownloads).values(data).$returningId();
  return download;
}

export async function getMarketplaceDownloadsByPurchase(purchaseId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(marketplaceDownloads).where(eq(marketplaceDownloads.purchaseId, purchaseId));
}

export async function getSellerAnalytics(sellerId: number): Promise<any> {
  const db = await getDb();
  if (!db) return null;

  // Get all packs by seller
  const packs = await db.select().from(marketplaceSamplePacks)
    .where(eq(marketplaceSamplePacks.sellerId, sellerId));

  // Get all purchases for seller's packs
  const packIds = packs.map(p => p.id);
  const purchases = packIds.length > 0
    ? await db.select().from(marketplacePurchases)
        .where(sql`${marketplacePurchases.packId} IN (${sql.join(packIds.map(id => sql`${id}`), sql`, `)})`)
    : [];

  // Get all reviews for seller's packs
  const reviews = packIds.length > 0
    ? await db.select().from(marketplaceReviews)
        .where(sql`${marketplaceReviews.packId} IN (${sql.join(packIds.map(id => sql`${id}`), sql`, `)})`)
    : [];

  // Get all downloads for seller's packs
  const downloads = packIds.length > 0
    ? await db.select().from(marketplaceDownloads)
        .where(sql`${marketplaceDownloads.packId} IN (${sql.join(packIds.map(id => sql`${id}`), sql`, `)})`)
    : [];

  // Calculate metrics
  const totalRevenue = purchases.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalSales = purchases.length;
  const activePacks = packs.length;
  const totalDownloads = downloads.length;
  const totalReviews = reviews.length;
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // Find top-selling pack
  const packSales = new Map<number, number>();
  purchases.forEach(p => {
    packSales.set(p.packId, (packSales.get(p.packId) || 0) + 1);
  });
  const topPackId = packSales.size > 0
    ? Array.from(packSales.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : null;
  const topPack = topPackId ? packs.find(p => p.id === topPackId) : null;

  // Sales by day (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentPurchases = purchases.filter(p => 
    new Date(p.purchasedAt!) >= thirtyDaysAgo
  );

  const salesByDay = new Map<string, { date: string; sales: number; revenue: number }>();
  recentPurchases.forEach(p => {
    const date = new Date(p.purchasedAt!).toISOString().split('T')[0];
    const existing = salesByDay.get(date) || { date, sales: 0, revenue: 0 };
    existing.sales += 1;
    existing.revenue += Number(p.amount || 0);
    salesByDay.set(date, existing);
  });

  const revenueChart = Array.from(salesByDay.values()).sort((a, b) => 
    a.date.localeCompare(b.date)
  );

  // Pack performance
  const packPerformance = packs.map(pack => {
    const packPurchases = purchases.filter(p => p.packId === pack.id);
    const packReviews = reviews.filter(r => r.packId === pack.id);
    const packDownloads = downloads.filter(d => d.packId === pack.id);
    
    return {
      id: pack.id,
      title: pack.title,
      sales: packPurchases.length,
      revenue: packPurchases.reduce((sum, p) => sum + Number(p.amount || 0), 0),
      downloads: packDownloads.length,
      rating: packReviews.length > 0
        ? packReviews.reduce((sum, r) => sum + r.rating, 0) / packReviews.length
        : 0,
      reviewCount: packReviews.length,
    };
  }).sort((a, b) => b.sales - a.sales);

  return {
    totalRevenue,
    totalSales,
    activePacks,
    totalDownloads,
    totalReviews,
    averageRating,
    topPack: topPack ? {
      id: topPack.id,
      title: topPack.title,
      sales: packSales.get(topPack.id) || 0,
    } : null,
    revenueChart,
    packPerformance,
  };
}

// ========================================
// Marketplace Bundles
// ========================================

export async function createMarketplaceBundle(bundle: {
  sellerId: number;
  title: string;
  description?: string;
  originalPrice: number;
  bundlePrice: number;
  discountPercent: number;
  coverImage?: string;
  packIds: number[];
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { packIds, ...bundleData } = bundle;

  // Create bundle
  const [insertedBundle] = await db.insert(marketplaceBundles).values(bundleData).$returningId();
  const bundleId = insertedBundle.id;

  // Add packs to bundle
  if (packIds.length > 0) {
    await db.insert(marketplaceBundlePacks).values(
      packIds.map(packId => ({ bundleId, packId }))
    );
  }

  return { id: bundleId, ...bundleData };
}

export async function getMarketplaceBundle(bundleId: number): Promise<any> {
  const db = await getDb();
  if (!db) return null;

  const [bundle] = await db.select().from(marketplaceBundles)
    .where(eq(marketplaceBundles.id, bundleId))
    .limit(1);

  if (!bundle) return null;

  // Get packs in bundle
  const bundlePacks = await db.select().from(marketplaceBundlePacks)
    .where(eq(marketplaceBundlePacks.bundleId, bundleId));

  const packIds = bundlePacks.map(bp => bp.packId);
  const packs = packIds.length > 0
    ? await db.select().from(marketplaceSamplePacks)
        .where(sql`${marketplaceSamplePacks.id} IN (${sql.join(packIds.map(id => sql`${id}`), sql`, `)})`)
    : [];

  return {
    ...bundle,
    packs,
  };
}

export async function listMarketplaceBundles(filters: {
  sellerId?: number;
  isActive?: boolean;
  limit?: number;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(marketplaceBundles);

  if (filters.sellerId !== undefined) {
    query = query.where(eq(marketplaceBundles.sellerId, filters.sellerId)) as any;
  }

  if (filters.isActive !== undefined) {
    query = query.where(eq(marketplaceBundles.isActive, filters.isActive)) as any;
  }

  if (filters.limit) {
    query = query.limit(filters.limit) as any;
  }

  const bundles = await query;

  // Enrich with pack count
  const enriched = await Promise.all(bundles.map(async (bundle) => {
    const bundlePacks = await db.select().from(marketplaceBundlePacks)
      .where(eq(marketplaceBundlePacks.bundleId, bundle.id));
    
    return {
      ...bundle,
      packCount: bundlePacks.length,
    };
  }));

  return enriched;
}

export async function updateMarketplaceBundle(bundleId: number, updates: {
  title?: string;
  description?: string;
  bundlePrice?: number;
  discountPercent?: number;
  isActive?: boolean;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(marketplaceBundles)
    .set(updates)
    .where(eq(marketplaceBundles.id, bundleId));
}
