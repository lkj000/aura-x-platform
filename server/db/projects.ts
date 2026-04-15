/**
 * db/projects.ts — Project, Track, AudioClip, MidiNote, Automation repositories
 *
 * All entities that live inside a DAW project session.
 */
import { eq, inArray } from "drizzle-orm";
import { getDb } from "./core";
import {
  projects, tracks, audioClips, midiNotes,
  automationLanes, automationPoints,
  type Project, type InsertProject,
  type Track, type InsertTrack,
  type AudioClip, type InsertAudioClip,
  type MidiNote, type InsertMidiNote,
  type AutomationLane, type InsertAutomationLane,
  type AutomationPoint, type InsertAutomationPoint,
} from "../../drizzle/schema";

// ── Projects ──────────────────────────────────────────────────────────────────

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
  await db.delete(tracks).where(eq(tracks.projectId, projectId));
  await db.delete(projects).where(eq(projects.id, projectId));
}

// ── Tracks ────────────────────────────────────────────────────────────────────

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

// ── Audio Clips ───────────────────────────────────────────────────────────────

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

// ── MIDI Notes ────────────────────────────────────────────────────────────────

export async function createMidiNote(note: InsertMidiNote): Promise<MidiNote> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(midiNotes).values(note);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(midiNotes).where(eq(midiNotes.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function createMidiNotesBatch(trackId: number, notes: Omit<InsertMidiNote, "trackId">[]): Promise<MidiNote[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(midiNotes).values(notes.map(n => ({ ...n, trackId })));
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

// ── Automation ────────────────────────────────────────────────────────────────

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
  return db.select().from(automationLanes).where(eq(automationLanes.trackId, trackId));
}

export async function updateAutomationLane(id: number, updates: Partial<InsertAutomationLane>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(automationLanes).set(updates).where(eq(automationLanes.id, id));
}

export async function deleteAutomationLane(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(automationPoints).where(eq(automationPoints.laneId, id));
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
  return db.select().from(automationPoints).where(eq(automationPoints.laneId, laneId)).orderBy(automationPoints.time);
}

export async function updateAutomationPoint(id: number, updates: Partial<InsertAutomationPoint>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(automationPoints).set(updates).where(eq(automationPoints.id, id));
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
