/**
 * daw.ts — DAW session routers
 *
 * Covers: projects, tracks, audio clips, MIDI notes, automation lanes/points.
 * These are all tightly scoped to a single project session in the DAW.
 */
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const projectsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserProjects(ctx.user.id);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getProjectById(input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      tempo: z.number().default(112),
      key: z.string().default("C"),
      mode: z.string().default("kasi"),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.createProject({ userId: ctx.user.id, ...input });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      tempo: z.number().optional(),
      key: z.string().optional(),
      mode: z.string().optional(),
      status: z.enum(["active", "archived"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await db.updateProject(id, updates);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteProject(input.id);
      return { success: true };
    }),
});

export const tracksRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return db.getProjectTracks(input.projectId);
    }),

  create: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      name: z.string(),
      type: z.string(),
      audioUrl: z.string().optional(),
      duration: z.number().optional(),
      volume: z.number().default(1.0),
      pan: z.number().default(0.0),
      orderIndex: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      return db.createTrack(input);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      volume: z.number().optional(),
      pan: z.number().optional(),
      muted: z.boolean().optional(),
      solo: z.boolean().optional(),
      orderIndex: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await db.updateTrack(id, updates);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteTrack(input.id);
      return { success: true };
    }),
});

export const audioClipsRouter = router({
  list: protectedProcedure
    .input(z.object({ trackId: z.number() }))
    .query(async ({ input }) => {
      return db.getTrackAudioClips(input.trackId);
    }),

  create: protectedProcedure
    .input(z.object({
      trackId: z.number(),
      name: z.string(),
      fileUrl: z.string(),
      startTime: z.number(),
      duration: z.number(),
      offset: z.number().default(0),
      fadeIn: z.number().default(0),
      fadeOut: z.number().default(0),
      gain: z.number().default(1.0),
    }))
    .mutation(async ({ input }) => {
      return db.createAudioClip(input);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      startTime: z.number().optional(),
      duration: z.number().optional(),
      offset: z.number().optional(),
      fadeIn: z.number().optional(),
      fadeOut: z.number().optional(),
      gain: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await db.updateAudioClip(id, updates);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteAudioClip(input.id);
      return { success: true };
    }),
});

export const midiNotesRouter = router({
  list: protectedProcedure
    .input(z.object({ trackId: z.number() }))
    .query(async ({ input }) => {
      return db.getTrackMidiNotes(input.trackId);
    }),

  create: protectedProcedure
    .input(z.object({
      trackId: z.number(),
      pitch: z.string(),
      time: z.number(),
      duration: z.number(),
      velocity: z.number(),
    }))
    .mutation(async ({ input }) => {
      return db.createMidiNote(input);
    }),

  createBatch: protectedProcedure
    .input(z.object({
      trackId: z.number(),
      notes: z.array(z.object({
        pitch: z.string(),
        time: z.number(),
        duration: z.number(),
        velocity: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      return db.createMidiNotesBatch(input.trackId, input.notes);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      pitch: z.string().optional(),
      time: z.number().optional(),
      duration: z.number().optional(),
      velocity: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await db.updateMidiNote(id, updates);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteMidiNote(input.id);
      return { success: true };
    }),

  deleteBatch: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      await db.deleteMidiNotesBatch(input.ids);
      return { success: true };
    }),
});

const curveType = z.enum(["linear", "bezier", "step"]).optional();

export const automationRouter = router({
  createLane: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      trackId: z.number(),
      parameter: z.enum(["volume", "pan", "eq_low", "eq_mid", "eq_high", "reverb_wet", "delay_wet"]),
      enabled: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      return db.createAutomationLane(input);
    }),

  getByTrack: protectedProcedure
    .input(z.object({ trackId: z.number() }))
    .query(async ({ input }) => {
      return db.getAutomationLanesByTrack(input.trackId);
    }),

  updateLane: protectedProcedure
    .input(z.object({ id: z.number(), enabled: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return db.updateAutomationLane(id, updates);
    }),

  deleteLane: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return db.deleteAutomationLane(input.id);
    }),

  createPoint: protectedProcedure
    .input(z.object({
      laneId: z.number(),
      time: z.number(),
      value: z.number(),
      curveType,
      handleInX: z.number().optional(),
      handleInY: z.number().optional(),
      handleOutX: z.number().optional(),
      handleOutY: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return db.createAutomationPoint(input);
    }),

  getPoints: protectedProcedure
    .input(z.object({ laneId: z.number() }))
    .query(async ({ input }) => {
      return db.getAutomationPointsByLane(input.laneId);
    }),

  updatePoint: protectedProcedure
    .input(z.object({
      id: z.number(),
      time: z.number().optional(),
      value: z.number().optional(),
      curveType,
      handleInX: z.number().optional(),
      handleInY: z.number().optional(),
      handleOutX: z.number().optional(),
      handleOutY: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return db.updateAutomationPoint(id, updates);
    }),

  deletePoint: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return db.deleteAutomationPoint(input.id);
    }),

  bulkCreatePoints: protectedProcedure
    .input(z.object({
      laneId: z.number(),
      points: z.array(z.object({
        time: z.number(),
        value: z.number(),
        curveType,
        handleInX: z.number().optional(),
        handleInY: z.number().optional(),
        handleOutX: z.number().optional(),
        handleOutY: z.number().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const pointsWithLaneId = input.points.map(p => ({ laneId: input.laneId, ...p }));
      return db.bulkCreateAutomationPoints(pointsWithLaneId);
    }),

  deleteAllPoints: protectedProcedure
    .input(z.object({ laneId: z.number() }))
    .mutation(async ({ input }) => {
      return db.deleteAutomationPointsByLane(input.laneId);
    }),
});
