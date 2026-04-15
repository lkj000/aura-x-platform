/**
 * presets.ts — Preset favorites and custom presets routers
 *
 * Covers: preset favorites, custom presets (CRUD, sharing, community browsing).
 */
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { customPresets } from "../../drizzle/schema";
import * as db from "../db";
import { getDb } from "../db";

export const presetFavoritesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserPresetFavorites(ctx.user.id);
  }),

  add: protectedProcedure
    .input(z.object({ presetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return db.addPresetFavorite(ctx.user.id, input.presetId);
    }),

  remove: protectedProcedure
    .input(z.object({ presetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.removePresetFavorite(ctx.user.id, input.presetId);
      return { success: true };
    }),

  check: protectedProcedure
    .input(z.object({ presetId: z.string() }))
    .query(async ({ ctx, input }) => {
      return db.isPresetFavorited(ctx.user.id, input.presetId);
    }),
});

export const customPresetsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserCustomPresets(ctx.user.id);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getCustomPresetById(input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      category: z.string(),
      style: z.string(),
      icon: z.string(),
      prompt: z.string(),
      parameters: z.any(),
      culturalElements: z.array(z.string()),
      tags: z.array(z.string()),
      basedOnGenerationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.createCustomPreset({ userId: ctx.user.id, ...input });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      style: z.string().optional(),
      icon: z.string().optional(),
      prompt: z.string().optional(),
      parameters: z.any().optional(),
      culturalElements: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await db.updateCustomPreset(id, updates);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteCustomPreset(input.id);
      return { success: true };
    }),

  incrementUsage: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.incrementCustomPresetUsage(input.id);
      return { success: true };
    }),

  generateShareLink: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const [preset] = await dbConn.select().from(customPresets).where(eq(customPresets.id, input.id)).limit(1);
      if (!preset || preset.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Preset not found or unauthorized" });
      }

      let shareCode = preset.shareCode;
      if (!shareCode) {
        shareCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        await dbConn.update(customPresets).set({ shareCode, isPublic: true }).where(eq(customPresets.id, input.id));
      } else {
        await dbConn.update(customPresets).set({ isPublic: true }).where(eq(customPresets.id, input.id));
      }

      const origin = ctx.req.headers.origin || "http://localhost:3000";
      return { shareUrl: `${origin}/preset/${shareCode}`, shareCode };
    }),

  unsharePreset: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const [preset] = await dbConn.select().from(customPresets).where(eq(customPresets.id, input.id)).limit(1);
      if (!preset || preset.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Preset not found or unauthorized" });
      }

      await dbConn.update(customPresets).set({ isPublic: false }).where(eq(customPresets.id, input.id));
      return { success: true };
    }),

  getSharedPreset: publicProcedure
    .input(z.object({ shareCode: z.string() }))
    .query(async ({ input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const [preset] = await dbConn.select().from(customPresets).where(eq(customPresets.shareCode, input.shareCode)).limit(1);
      if (!preset || !preset.isPublic) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shared preset not found" });
      }
      return preset;
    }),

  importSharedPreset: protectedProcedure
    .input(z.object({ shareCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const [sharedPreset] = await dbConn.select().from(customPresets).where(eq(customPresets.shareCode, input.shareCode)).limit(1);
      if (!sharedPreset || !sharedPreset.isPublic) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shared preset not found" });
      }

      const [newPreset] = await dbConn.insert(customPresets).values({
        userId: ctx.user.id,
        name: `${sharedPreset.name} (imported)`,
        description: sharedPreset.description,
        category: sharedPreset.category,
        style: sharedPreset.style,
        icon: sharedPreset.icon,
        prompt: sharedPreset.prompt,
        parameters: sharedPreset.parameters,
        culturalElements: sharedPreset.culturalElements,
        tags: sharedPreset.tags,
      }).$returningId();

      await dbConn.update(customPresets)
        .set({ importCount: (sharedPreset.importCount || 0) + 1 })
        .where(eq(customPresets.id, sharedPreset.id));

      return { success: true, presetId: newPreset.id };
    }),

  listPublicPresets: publicProcedure
    .input(z.object({ limit: z.number().optional().default(20), offset: z.number().optional().default(0) }))
    .query(async ({ input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      return dbConn.select()
        .from(customPresets)
        .where(eq(customPresets.isPublic, true))
        .orderBy(desc(customPresets.importCount))
        .limit(input.limit)
        .offset(input.offset);
    }),
});
