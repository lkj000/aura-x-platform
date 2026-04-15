/**
 * server/db/midi.ts — MIDI controller mapping persistence
 *
 * Stores and retrieves per-(user, device) MIDI CC → DAW parameter mappings.
 * One row per device per user; upsert on every save so there is no drift
 * between the in-memory MIDIControllerService state and the DB.
 *
 * Used by: server/routers/midi.ts (saveMappings, getMappings)
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./core";
import { midiMappings, type InsertMidiMapping, type MidiMappingRow } from "../../drizzle/schema";

/**
 * Upsert MIDI mappings for a (userId, deviceId) pair.
 * Creates the row on first save; overwrites mappings on subsequent saves.
 */
export async function saveMidiMappings(params: {
  userId: number;
  deviceId: string;
  deviceName?: string;
  mappings: unknown[]; // MIDIMapping[] from MIDIController.ts
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[MIDI] Cannot save mappings: database not available");
    return;
  }

  const existing = await db
    .select({ id: midiMappings.id })
    .from(midiMappings)
    .where(and(eq(midiMappings.userId, params.userId), eq(midiMappings.deviceId, params.deviceId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(midiMappings)
      .set({
        mappings: params.mappings as any,
        deviceName: params.deviceName,
      })
      .where(and(eq(midiMappings.userId, params.userId), eq(midiMappings.deviceId, params.deviceId)));
  } else {
    await db.insert(midiMappings).values({
      userId: params.userId,
      deviceId: params.deviceId,
      deviceName: params.deviceName,
      mappings: params.mappings as any,
    } as InsertMidiMapping);
  }
}

/**
 * Load all MIDI mappings for a user (all devices).
 */
export async function getMidiMappings(userId: number): Promise<MidiMappingRow[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[MIDI] Cannot load mappings: database not available");
    return [];
  }
  return db
    .select()
    .from(midiMappings)
    .where(eq(midiMappings.userId, userId));
}

/**
 * Delete all mappings for a specific (userId, deviceId) pair.
 */
export async function deleteMidiMappings(userId: number, deviceId: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[MIDI] Cannot delete mappings: database not available");
    return;
  }
  await db
    .delete(midiMappings)
    .where(and(eq(midiMappings.userId, userId), eq(midiMappings.deviceId, deviceId)));
}
