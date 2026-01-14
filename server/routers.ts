import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Projects router
  projects: router({
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
        return db.createProject({
          userId: ctx.user.id,
          ...input,
        });
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
  }),

  // Tracks router
  tracks: router({
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
  }),

  // AI Generation router (Modal.com proxy)
  generate: router({
    music: protectedProcedure
      .input(z.object({
        prompt: z.string(),
        projectId: z.number().optional(),
        parameters: z.object({
          tempo: z.number().optional(),
          key: z.string().optional(),
          mode: z.string().optional(),
          instruments: z.array(z.string()).optional(),
          duration: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Create generation record
        const generation = await db.createGeneration({
          userId: ctx.user.id,
          projectId: input.projectId,
          type: "music",
          prompt: input.prompt,
          parameters: input.parameters as any,
          status: "pending",
        });

        // TODO: Call Modal.com API to start generation
        // This will be implemented in the next step
        console.log('[AI Generate] Created generation request:', generation.id);

        return {
          generationId: generation.id,
          status: "pending",
        };
      }),

    status: protectedProcedure
      .input(z.object({ generationId: z.number() }))
      .query(async ({ input }) => {
        const generation = await db.getGenerationById(input.generationId);
        if (!generation) {
          throw new Error("Generation not found");
        }
        return generation;
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserGenerations(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
