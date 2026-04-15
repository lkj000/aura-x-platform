/**
 * server/routers/midi.ts — MIDI controller mapping persistence
 *
 * Provides two procedures consumed by MIDIController.ts + MIDIMapping.tsx:
 *
 *   saveMappings — upsert the full mapping set for a (user, device) pair.
 *     Called via a 500 ms debounce after any addMapping/removeMapping in the
 *     MIDIControllerService. This keeps DB writes coalesced rather than
 *     firing on every CC event during MIDI learn.
 *
 *   getMappings — load all persisted mappings for the current user (all devices).
 *     Called once on DAW mount to restore mappings without requiring the user
 *     to run MIDI learn again.
 *
 *   deleteMappings — remove all mappings for a specific device.
 *
 * The MIDIMapping shape is:
 *   { id, deviceId, controller, parameter, min, max, curve }
 * where `parameter` follows the DAW store dispatch convention:
 *   "track:{trackId}:volume" | "track:{trackId}:pan" | "tempo"
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

const midiMappingSchema = z.object({
  id: z.string(),
  deviceId: z.string(),
  controller: z.number().int().min(0).max(127),
  parameter: z.string(), // "track:{id}:volume" | "track:{id}:pan" | "tempo"
  min: z.number(),
  max: z.number(),
  curve: z.enum(["linear", "exponential", "logarithmic"]),
});

export const midiRouter = router({
  /**
   * Persist all mappings for a specific device.
   * Replace-all semantics: the full current mapping array replaces any prior
   * row for this (userId, deviceId) pair.
   */
  saveMappings: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
      deviceName: z.string().optional(),
      mappings: z.array(midiMappingSchema),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.saveMidiMappings({
        userId: ctx.user.id,
        deviceId: input.deviceId,
        deviceName: input.deviceName,
        mappings: input.mappings,
      });
      return { success: true };
    }),

  /**
   * Load all persisted mappings for the current user (across all devices).
   * Returns an array of { deviceId, deviceName, mappings } objects so the
   * frontend can restore mappings for whichever device is currently connected.
   */
  getMappings: protectedProcedure
    .query(async ({ ctx }) => {
      const rows = await db.getMidiMappings(ctx.user.id);
      return rows.map(r => ({
        deviceId: r.deviceId,
        deviceName: r.deviceName ?? r.deviceId,
        mappings: r.mappings as z.infer<typeof midiMappingSchema>[],
        updatedAt: r.updatedAt,
      }));
    }),

  /**
   * Remove all mappings for a specific device (e.g. when user clicks "Clear").
   */
  deleteMappings: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteMidiMappings(ctx.user.id, input.deviceId);
      return { success: true };
    }),
});
