import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as modalClient from "./modalClient";

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

        // Call Modal.com API to start generation
        try {
          const modalResponse = await modalClient.generateMusic({
            prompt: input.prompt,
            tempo: input.parameters?.tempo,
            key: input.parameters?.key,
            mode: input.parameters?.mode,
            instruments: input.parameters?.instruments,
            duration: input.parameters?.duration,
          });

          // Update generation with Modal job ID
          await db.updateGeneration(generation.id, {
            workflowId: modalResponse.jobId,
            status: "processing",
          });

          console.log('[AI Generate] Started Modal job:', modalResponse.jobId);

          return {
            generationId: generation.id,
            jobId: modalResponse.jobId,
            status: "processing",
          };
        } catch (error) {
          // Update generation with error
          await db.updateGeneration(generation.id, {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });

          throw error;
        }
      }),

    status: protectedProcedure
      .input(z.object({ generationId: z.number() }))
      .query(async ({ input }) => {
        const generation = await db.getGenerationById(input.generationId);
        if (!generation) {
          throw new Error("Generation not found");
        }
        
        // If still processing, check Modal status
        if (generation.status === 'processing' && generation.workflowId) {
          try {
            const modalStatus = await modalClient.checkJobStatus(generation.workflowId);
            
            // Update database if status changed
            const audioUrl = 'audioUrl' in modalStatus ? modalStatus.audioUrl : undefined;
            if (modalStatus.status === 'completed' && audioUrl) {
              const culturalScore = 'culturalScore' in modalStatus ? modalStatus.culturalScore : undefined;
              const processingTime = 'processingTime' in modalStatus ? modalStatus.processingTime : undefined;
              
              await db.updateGeneration(generation.id, {
                status: 'completed',
                resultUrl: audioUrl,
                culturalScore: culturalScore?.toString(),
                processingTime,
                completedAt: new Date(),
              });
              
              // Return updated generation
              return await db.getGenerationById(input.generationId);
            } else if (modalStatus.status === 'failed') {
              await db.updateGeneration(generation.id, {
                status: 'failed',
                errorMessage: modalStatus.error || 'Generation failed',
              });
              
              return await db.getGenerationById(input.generationId);
            }
          } catch (error) {
            console.error('[API] Failed to check Modal status:', error);
            // Continue with database status
          }
        }
        
        return generation;
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserGenerations(ctx.user.id);
    }),
  }),

  // Generation History router
  generationHistory: router({
    list: protectedProcedure
      .input(z.object({
        projectId: z.number().optional(),
        limit: z.number().default(50),
      }))
      .query(async ({ ctx, input }) => {
        return db.getUserGenerationHistory(ctx.user.id, input.projectId, input.limit);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number().optional(),
        generationId: z.number().optional(),
        prompt: z.string().optional(),
        subgenre: z.string().optional(),
        mood: z.string().optional(),
        seed: z.number(),
        temperature: z.number(),
        topK: z.number(),
        topP: z.number(),
        cfgScale: z.number(),
        steps: z.number(),
        audioUrl: z.string().optional(),
        duration: z.number().optional(),
        status: z.enum(["completed", "failed", "processing"]).default("processing"),
        modelVersion: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createGenerationHistory({
          userId: ctx.user.id,
          ...input,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        audioUrl: z.string().optional(),
        duration: z.number().optional(),
        status: z.enum(["completed", "failed", "processing"]).optional(),
        errorMessage: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateGenerationHistory(id, updates);
        return { success: true };
      }),

    toggleFavorite: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.toggleGenerationHistoryFavorite(input.id);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteGenerationHistory(input.id);
        return { success: true };
      }),
  }),

  // Audio Clips router
  audioClips: router({
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
  }),

  // MIDI Notes router
  midiNotes: router({
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
  }),

  // Samples router
  samples: router({
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
  }),

  // Media Library router
  mediaLibrary: router({
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
        return db.createMediaLibraryItem({
          userId: ctx.user.id,
          ...input,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMediaLibraryItem(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
