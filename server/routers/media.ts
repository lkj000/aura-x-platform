/**
 * media.ts — Media library and samples routers
 *
 * Covers: user media library, sample browser.
 */
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const samplesRouter = router({
  list: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      key: z.string().optional(),
      bpm: z.number().optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      return db.getSamples(input);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getSampleById(input.id);
    }),
});

export const mediaLibraryRouter = router({
  list: protectedProcedure
    .input(z.object({
      type: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      return db.getUserMediaLibrary(ctx.user.id, input);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      type: z.string(),
      fileUrl: z.string(),
      fileSize: z.number(),
      duration: z.number().optional(),
      format: z.string(),
      sampleRate: z.number().optional(),
      generationId: z.number().optional(),
      metadata: z.any().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.createMediaLibraryItem({ userId: ctx.user.id, ...input });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteMediaLibraryItem(input.id);
      return { success: true };
    }),
});
