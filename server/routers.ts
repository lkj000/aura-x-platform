import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as modalClient from './modalClient';
import { users, userQueueStats } from '../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { getMaxConcurrentJobs } from '../shared/tierConfig';
import type { UserTier } from '../shared/tierConfig';
import { TRPCError } from '@trpc/server';
import { getDb } from './db';
import { executeMusicGenerationWorkflow, executeStemSeparationWorkflow, queryWorkflowStatus } from './temporalClient';
import Stripe from 'stripe';
import { invokeLLM } from './_core/llm';
import { culturalRouter } from './routers/cultural';
import { communityFeedbackRouter } from './communityFeedbackRouter';
import { musicGenerationRouter } from './musicGenerationRouter';
import { samplePackRouter } from './samplePackRouter';

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
          seed: z.number().optional(),
          temperature: z.number().optional(),
          topK: z.number().optional(),
          topP: z.number().optional(),
          cfgScale: z.number().optional(),
          generationMode: z.enum(['creative', 'production']).optional(),
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
            seed: input.parameters?.seed,
            temperature: input.parameters?.temperature,
            topK: input.parameters?.topK,
            topP: input.parameters?.topP,
            cfgScale: input.parameters?.cfgScale,
            generationMode: input.parameters?.generationMode || 'creative',
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

  // Stem Separation router
  stemSeparation: router({
    separate: protectedProcedure
      .input(z.object({
        audioUrl: z.string(),
        trackName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          console.log('[Stem Separation] Starting separation for:', input.audioUrl);
          
          // Call Modal Demucs endpoint
          const result = await modalClient.separateStems({
            audioUrl: input.audioUrl,
            stemTypes: ['vocals', 'drums', 'bass', 'other'],
          });
          
          return result;
        } catch (error) {
          console.error('[Stem Separation] Error:', error);
          throw new Error('Stem separation failed. Make sure Modal AI services are deployed.');
        }
      }),

    status: protectedProcedure
      .input(z.object({ jobId: z.string() }))
      .query(async ({ input }) => {
        try {
          const status = await modalClient.checkJobStatus(input.jobId);
          return status;
        } catch (error) {
          console.error('[Stem Separation] Status check error:', error);
          throw new Error('Failed to check stem separation status');
        }
      }),
  }),

  // Preset Favorites router
  presetFavorites: router({
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
  }),

  // Custom Presets router
  customPresets: router({
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
        return db.createCustomPreset({
          userId: ctx.user.id,
          ...input,
        });
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
  }),

  // Collaboration router
  collaboration: router({
    // Get collaborators for a project
    listCollaborators: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectCollaborators(input.projectId);
      }),

    // Invite user to project
    invite: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        inviteeEmail: z.string().email(),
        role: z.enum(['admin', 'editor', 'viewer']).default('viewer'),
      }))
      .mutation(async ({ ctx, input }) => {
        // Generate unique invitation token
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const invitation = await db.createProjectInvitation({
          projectId: input.projectId,
          inviterUserId: ctx.user.id,
          inviteeEmail: input.inviteeEmail,
          role: input.role,
          token,
          expiresAt,
        });

        // Log activity
        await db.logProjectActivity({
          projectId: input.projectId,
          userId: ctx.user.id,
          action: 'invited',
          entityType: 'collaborator',
          details: { email: input.inviteeEmail, role: input.role },
        });

        return { invitation, inviteUrl: `/invite/${token}` };
      }),

    // Accept invitation
    acceptInvitation: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const invitation = await db.getProjectInvitationByToken(input.token);
        
        if (!invitation) {
          throw new Error('Invitation not found');
        }
        
        if (invitation.status !== 'pending') {
          throw new Error('Invitation already processed');
        }
        
        if (new Date() > new Date(invitation.expiresAt)) {
          throw new Error('Invitation expired');
        }

        // Add as collaborator
        await db.addProjectCollaborator({
          projectId: invitation.projectId,
          userId: ctx.user.id,
          role: invitation.role,
          invitedBy: invitation.inviterUserId,
          status: 'accepted',
          acceptedAt: new Date(),
        });

        // Update invitation
        await db.acceptProjectInvitation(invitation.id);

        // Log activity
        await db.logProjectActivity({
          projectId: invitation.projectId,
          userId: ctx.user.id,
          action: 'joined',
          entityType: 'collaborator',
          details: { role: invitation.role },
        });

        return { success: true, projectId: invitation.projectId };
      }),

    // Update collaborator role
    updateRole: protectedProcedure
      .input(z.object({
        collabId: z.number(),
        role: z.enum(['owner', 'admin', 'editor', 'viewer']),
      }))
      .mutation(async ({ input }) => {
        await db.updateCollaboratorRole(input.collabId, input.role);
        return { success: true };
      }),

    // Remove collaborator
    remove: protectedProcedure
      .input(z.object({ collabId: z.number() }))
      .mutation(async ({ input }) => {
        await db.removeProjectCollaborator(input.collabId);
        return { success: true };
      }),

    // Get project activity log
    getActivity: protectedProcedure
      .input(z.object({ 
        projectId: z.number(),
        limit: z.number().default(50),
      }))
      .query(async ({ input }) => {
        return db.getProjectActivity(input.projectId, input.limit);
      }),

    // Get pending invitations for current user
    getPendingInvitations: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getPendingInvitations(ctx.user.id);
      }),

    // Check user's role in project
    getRole: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getUserProjectRole(ctx.user.id, input.projectId);
      }),
  }),

  // Automation router
  automation: router({
    // Create automation lane
    createLane: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        trackId: z.number(),
        parameter: z.enum(['volume', 'pan', 'eq_low', 'eq_mid', 'eq_high', 'reverb_wet', 'delay_wet']),
        enabled: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        return db.createAutomationLane(input);
      }),

    // Get automation lanes for track
    getByTrack: protectedProcedure
      .input(z.object({ trackId: z.number() }))
      .query(async ({ input }) => {
        return db.getAutomationLanesByTrack(input.trackId);
      }),

    // Update automation lane
    updateLane: protectedProcedure
      .input(z.object({
        id: z.number(),
        enabled: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return db.updateAutomationLane(id, updates);
      }),

    // Delete automation lane
    deleteLane: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteAutomationLane(input.id);
      }),

    // Create automation point
    createPoint: protectedProcedure
      .input(z.object({
        laneId: z.number(),
        time: z.number(),
        value: z.number(),
        curveType: z.enum(['linear', 'bezier', 'step']).optional(),
        handleInX: z.number().optional(),
        handleInY: z.number().optional(),
        handleOutX: z.number().optional(),
        handleOutY: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createAutomationPoint(input);
      }),

    // Get automation points for lane
    getPoints: protectedProcedure
      .input(z.object({ laneId: z.number() }))
      .query(async ({ input }) => {
        return db.getAutomationPointsByLane(input.laneId);
      }),

    // Update automation point
    updatePoint: protectedProcedure
      .input(z.object({
        id: z.number(),
        time: z.number().optional(),
        value: z.number().optional(),
        curveType: z.enum(['linear', 'bezier', 'step']).optional(),
        handleInX: z.number().optional(),
        handleInY: z.number().optional(),
        handleOutX: z.number().optional(),
        handleOutY: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return db.updateAutomationPoint(id, updates);
      }),

    // Delete automation point
    deletePoint: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteAutomationPoint(input.id);
      }),

    // Bulk create automation points
    bulkCreatePoints: protectedProcedure
      .input(z.object({
        laneId: z.number(),
        points: z.array(z.object({
          time: z.number(),
          value: z.number(),
          curveType: z.enum(['linear', 'bezier', 'step']).optional(),
          handleInX: z.number().optional(),
          handleInY: z.number().optional(),
          handleOutX: z.number().optional(),
          handleOutY: z.number().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const pointsWithLaneId = input.points.map(p => ({
          laneId: input.laneId,
          ...p,
        }));
        return db.bulkCreateAutomationPoints(pointsWithLaneId);
      }),

    // Delete all points for a lane
    deleteAllPoints: protectedProcedure
      .input(z.object({ laneId: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteAutomationPointsByLane(input.laneId);
      }),
  }),

  // Marketplace router
  marketplace: router({  
    // List sample packs with filters
    listPacks: publicProcedure
      .input(z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        sellerId: z.number().optional(),
        sortBy: z.enum(['popular', 'recent', 'price_low', 'price_high']).default('popular'),
        limit: z.number().default(50),
      }))
      .query(async ({ input }) => {
        return db.listMarketplacePacks(input);
      }),

    // Get single pack details
    getPack: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getMarketplacePack(input.id);
      }),

    // Create sample pack (seller)
    createPack: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string(),
        price: z.number(),
        category: z.string(),
        tags: z.array(z.string()).optional(),
        coverImage: z.string().optional(),
        previewAudio: z.string().optional(),
        fileUrl: z.string(),
        fileSize: z.number().optional(),
        sampleCount: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createMarketplacePack({
          sellerId: ctx.user.id,
          ...input,
        });
      }),

    // Create checkout session for pack purchase
    createCheckoutSession: protectedProcedure
      .input(z.object({
        packId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const pack = await db.getMarketplacePack(input.packId);
        if (!pack) {
          throw new Error('Sample pack not found');
        }

        // Import Stripe
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2025-12-15.clover',
        });

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: pack.title,
                  description: pack.description || undefined,
                  images: pack.coverImage ? [pack.coverImage] : undefined,
                  metadata: {
                    pack_id: pack.id.toString(),
                    category: pack.category,
                    seller_id: pack.sellerId.toString(),
                  },
                },
                unit_amount: Math.round(Number(pack.price) * 100), // Convert to cents
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${ctx.req.headers.origin}/marketplace?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${ctx.req.headers.origin}/marketplace?canceled=true`,
          customer_email: ctx.user.email || undefined,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            pack_id: pack.id.toString(),
            customer_email: ctx.user.email || '',
            customer_name: ctx.user.name || '',
          },
          allow_promotion_codes: true,
        });

        return {
          sessionId: session.id,
          url: session.url,
        };
      }),

    // Purchase pack (called by webhook after successful payment)
    purchasePack: protectedProcedure
      .input(z.object({
        packId: z.number(),
        paymentIntentId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createMarketplacePurchase({
          userId: ctx.user.id,
          packId: input.packId,
          paymentIntentId: input.paymentIntentId,
        });
      }),

    // Get user purchases
    getUserPurchases: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getUserMarketplacePurchases(ctx.user.id);
      }),

    // Create download and return presigned URL
    createDownload: protectedProcedure
      .input(z.object({
        purchaseId: z.number(),
        packId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify purchase belongs to user
        const purchases = await db.getUserMarketplacePurchases(ctx.user.id);
        const purchase = purchases.find(p => p.id === input.purchaseId);
        
        if (!purchase) {
          throw new Error('Purchase not found');
        }

        // Get pack details
        const pack = await db.getMarketplacePack(input.packId);
        if (!pack) {
          throw new Error('Pack not found');
        }

        // Record download
        await db.createMarketplaceDownload({
          userId: ctx.user.id,
          packId: input.packId,
          purchaseId: input.purchaseId,
        });

        // Return file URL (already public from S3)
        return {
          downloadUrl: pack.fileUrl,
        };
      }),

    // Add review
    addReview: protectedProcedure
      .input(z.object({
        packId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createMarketplaceReview({
          userId: ctx.user.id,
          ...input,
        });
      }),

    // Get pack reviews
    getPackReviews: publicProcedure
      .input(z.object({ packId: z.number() }))
      .query(async ({ input }) => {
        return db.getMarketplaceReviews(input.packId);
      }),

    // Get seller analytics
    getSellerAnalytics: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getSellerAnalytics(ctx.user.id);
      }),
  }),

  // Quality Scoring router
  qualityScoring: router({
    analyze: protectedProcedure
      .input(z.object({
        audioUrl: z.string(),
        trackName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const response = await fetch('http://localhost:8001/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio_url: input.audioUrl,
              track_name: input.trackName,
            }),
          });

          if (!response.ok) {
            throw new Error(`Quality scoring service returned ${response.status}`);
          }

          return await response.json();
        } catch (error) {
          console.error('[Quality Scoring] Error:', error);
          throw new Error('Quality analysis failed. Make sure quality scoring service is running on port 8001.');
        }
      }),

    health: publicProcedure.query(async () => {
      try {
        const response = await fetch('http://localhost:8001/health');
        return await response.json();
      } catch (error) {
        return { status: 'unavailable', error: 'Quality scoring service not reachable' };
      }
    }),
  }),

  // Marketplace Bundles router
  bundles: router({
    // Create bundle
    createBundle: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        packIds: z.array(z.number()).min(2),
        discountPercent: z.number().min(1).max(99),
        coverImage: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Calculate prices
        const packs = await Promise.all(
          input.packIds.map(id => db.getMarketplacePack(id))
        );
        
        const originalPrice = packs.reduce((sum, pack) => 
          sum + Number(pack?.price || 0), 0
        );
        
        const bundlePrice = originalPrice * (1 - input.discountPercent / 100);

        return db.createMarketplaceBundle({
          sellerId: ctx.user.id,
          title: input.title,
          description: input.description,
          originalPrice,
          bundlePrice,
          discountPercent: input.discountPercent,
          coverImage: input.coverImage,
          packIds: input.packIds,
        });
      }),

    // List bundles
    listBundles: publicProcedure
      .input(z.object({
        sellerId: z.number().optional(),
        isActive: z.boolean().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return db.listMarketplaceBundles(input);
      }),

    // Get bundle details
    getBundle: publicProcedure
      .input(z.object({ bundleId: z.number() }))
      .query(async ({ input }) => {
        return db.getMarketplaceBundle(input.bundleId);
      }),

    // Update bundle
    updateBundle: protectedProcedure
      .input(z.object({
        bundleId: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        bundlePrice: z.number().optional(),
        discountPercent: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { bundleId, ...updates } = input;
        return db.updateMarketplaceBundle(bundleId, updates);
      }),

    // Create bundle checkout session
    createBundleCheckout: protectedProcedure
      .input(z.object({
        bundleId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const bundle = await db.getMarketplaceBundle(input.bundleId);
        if (!bundle) {
          throw new Error('Bundle not found');
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2025-12-15.clover' as any,
        });

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: bundle.title,
                  description: `Bundle with ${bundle.packs.length} sample packs`,
                },
                unit_amount: Math.round(Number(bundle.bundlePrice) * 100),
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${ctx.req.headers.origin}/marketplace?success=true`,
          cancel_url: `${ctx.req.headers.origin}/marketplace?canceled=true`,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            bundle_id: input.bundleId.toString(),
            customer_email: ctx.user.email || '',
            customer_name: ctx.user.name || '',
            type: 'bundle',
          },
          allow_promotion_codes: true,
        });

        return { checkoutUrl: session.url };
      }),
  }),

  // Social Features router
  social: router({
    // Get or create producer profile
    getProfile: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return db.getOrCreateProducerProfile(input.userId);
      }),

    // Update producer profile
    updateProfile: protectedProcedure
      .input(z.object({
        displayName: z.string().optional(),
        bio: z.string().optional(),
        avatar: z.string().optional(),
        coverImage: z.string().optional(),
        location: z.string().optional(),
        website: z.string().optional(),
        twitter: z.string().optional(),
        instagram: z.string().optional(),
        soundcloud: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.updateProducerProfile(ctx.user.id, input);
      }),

    // Follow a user
    followUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.followUser(ctx.user.id, input.userId);
      }),

    // Unfollow a user
    unfollowUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.unfollowUser(ctx.user.id, input.userId);
      }),

    // Get follower count
    getFollowerCount: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return db.getFollowerCount(input.userId);
      }),

    // Get following count
    getFollowingCount: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return db.getFollowingCount(input.userId);
      }),

    // Check if following
    isFollowing: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.isFollowing(ctx.user.id, input.userId);
      }),

    // Get activity feed
    getActivityFeed: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        return db.getActivityFeed(ctx.user.id, input.limit);
      }),
  }),

  // AI Studio router - Suno-style music generation
  aiStudio: router({
    // Generate music from prompt
    generateMusic: protectedProcedure
      .input(z.object({
        prompt: z.string(),
        lyrics: z.string().optional(),
        title: z.string().optional(),
        style: z.string(),
        mood: z.string(),
        bpm: z.number().min(80).max(140),
        key: z.string(),
        vocalStyle: z.string(),
        mode: z.enum(['simple', 'custom']),
        duration: z.number().optional().default(30),
      }))
      .mutation(async ({ ctx, input }) => {
        // Create generation record
        const generation = await db.createGeneration({
          userId: ctx.user.id,
          type: 'music',
          prompt: input.prompt,
          lyrics: input.lyrics,
          title: input.title,
          style: input.style,
          mood: input.mood,
          bpm: input.bpm,
          key: input.key,
          vocalStyle: input.vocalStyle,
          parameters: input,
          status: 'pending',
        });

        // Execute Temporal workflow for music generation (Level 5 autonomous architecture)
        try {
          const workflowHandle = await executeMusicGenerationWorkflow({
            generationId: generation.id,
            userId: ctx.user.id,
            prompt: input.prompt,
            lyrics: input.lyrics,
            duration: input.duration || 30,
            temperature: 1.0,
            modalBaseUrl: process.env.MODAL_BASE_URL || '',
            modalApiKey: process.env.MODAL_API_KEY || '',
          });

          // Update generation with workflow ID
          await db.updateGeneration(generation.id, {
            status: 'processing',
          });

          return { 
            generationId: generation.id, 
            workflowId: workflowHandle.workflowId,
            status: 'processing' 
          };
        } catch (error) {
          // Update generation with error
          await db.updateGeneration(generation.id, {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        }
      }),

    // Generate lyrics using LLM
    generateLyrics: protectedProcedure
      .input(z.object({
        prompt: z.string(),
        language: z.string().default('zulu'),
        style: z.string(),
        mood: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Use LLM to generate lyrics
        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: `You are a professional ${input.language} songwriter specializing in ${input.style} music. Generate authentic, culturally appropriate lyrics that match the mood: ${input.mood}. Output only the lyrics, no explanations.`,
            },
            {
              role: 'user',
              content: input.prompt,
            },
          ],
        });

        const lyrics = typeof response.choices[0].message.content === 'string' 
          ? response.choices[0].message.content 
          : '';

        // Save lyrics generation to history
        await db.createGeneration({
          userId: ctx.user.id,
          type: 'lyrics',
          prompt: input.prompt,
          lyrics,
          style: input.style,
          mood: input.mood,
          parameters: input,
          status: 'completed',
        });

        return { lyrics };
      }),

    // Get generation status
    getGeneration: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getGenerationById(input.id);
      }),

    // List user's generations
    listGenerations: protectedProcedure
      .input(z.object({
        type: z.enum(['music', 'lyrics', 'stem_separation']).optional(),
        limit: z.number().default(50),
      }))
      .query(async ({ ctx, input }) => {
        return db.getUserGenerations(ctx.user.id);
      }),

    // Toggle favorite
    toggleFavorite: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // TODO: Add toggleGenerationFavorite function to db.ts
        return { success: true };
      }),

    // Delete generation
    deleteGeneration: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // TODO: Add deleteGeneration function to db.ts
        return { success: true };
      }),

    // Separate stems from generated audio
    separateStems: protectedProcedure
      .input(z.object({ generationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        try {
          const generation = await db.getGenerationById(input.generationId);
          
          if (!generation || !generation.resultUrl) {
            throw new Error('Generation not found or not completed');
          }
          
          // Call Modal stem separation
          const stemResult = await modalClient.separateStems({
            audioUrl: generation.resultUrl,
            stemTypes: ['drums', 'bass', 'vocals', 'other'],
          });
          
          // Update generation with stems
          if (stemResult.status === 'completed' && stemResult.stems) {
            await db.updateGeneration(input.generationId, {
              stemsUrl: JSON.stringify(stemResult.stems),
            });
          }
          
          return stemResult;
        } catch (error) {
          console.error('[aiStudio] Stem separation failed:', error);
          throw error;
        }
      }),

    // Import stems to DAW timeline
    importStemsToDAW: protectedProcedure
      .input(z.object({ generationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const generation = await db.getGenerationById(input.generationId);
        
        if (!generation) {
          throw new Error('Generation not found');
        }
        
        if (!generation.stemsUrl) {
          throw new Error('No stems available for this generation');
        }
        
        // Parse stems
        let stems: Array<{ name: string; url: string }> = [];
        try {
          stems = typeof generation.stemsUrl === 'string' ? JSON.parse(generation.stemsUrl) : [];
        } catch (e) {
          throw new Error('Failed to parse stems data');
        }
        
        // Get user's active project or create a new one
        const userProjects = await db.getUserProjects(ctx.user.id);
        let activeProject = userProjects.find(p => p.status === 'active');
        
        if (!activeProject) {
          // Create a new project for imports
          activeProject = await db.createProject({
            userId: ctx.user.id,
            name: `AI Generated - ${generation.title || 'Untitled'}`,
            description: `Imported from AI Studio generation`,
            tempo: generation.bpm || 112,
            key: generation.key || 'C',
            mode: generation.style || 'amapiano',
          });
        }
        
        // Create tracks for each stem
        const createdTracks = [];
        const stemColors: Record<string, string> = {
          drums: '#ef4444',
          bass: '#3b82f6',
          vocals: '#8b5cf6',
          other: '#10b981',
        };
        
        for (const stem of stems) {
          const track = await db.createTrack({
            projectId: activeProject.id,
            name: `${generation.title || 'Generation'} - ${stem.name}`,
            type: 'audio',
            audioUrl: stem.url,
            duration: generation.duration || 30,
            volume: 0.8,
            pan: 0,
            orderIndex: createdTracks.length,
          });
          
          createdTracks.push(track);
        }
        
        return {
          success: true,
          projectId: activeProject.id,
          tracksCreated: createdTracks.length,
          tracks: createdTracks,
        };
      }),

    // Check Modal job status and update generation
    checkJobStatus: protectedProcedure
      .input(z.object({ jobId: z.string(), generationId: z.number() }))
      .query(async ({ ctx, input }) => {
        try {
          const jobStatus = await modalClient.checkJobStatus(input.jobId);
          
          // Update generation with results
          if (jobStatus.status === 'completed' && 'audioUrl' in jobStatus && jobStatus.audioUrl) {
            await db.updateGeneration(input.generationId, {
              status: 'completed',
              resultUrl: jobStatus.audioUrl,
              completedAt: new Date(),
            });
          } else if (jobStatus.status === 'failed') {
            await db.updateGeneration(input.generationId, {
              status: 'failed',
              errorMessage: jobStatus.error || 'Generation failed',
            });
          }
          
          return jobStatus;
        } catch (error) {
          console.error('[aiStudio] Job status check failed:', error);
          throw error;
        }
      }),
  }),

  // Admin router - Level 5 tier management
  admin: router({
    // Get all users (admin only)
    getAllUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      return db.select().from(users).orderBy(desc(users.createdAt));
    }),
    
    // Update user tier (admin only)
    updateUserTier: protectedProcedure
      .input(z.object({
        userId: z.number(),
        tier: z.enum(['free', 'pro', 'enterprise']),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        // Update user tier
        await db.update(users)
          .set({ tier: input.tier })
          .where(eq(users.id, input.userId));
        
        // Update user_queue_stats maxConcurrentJobs
        const maxConcurrentJobs = getMaxConcurrentJobs(input.tier as UserTier);
        await db.update(userQueueStats)
          .set({ maxConcurrentJobs })
          .where(eq(userQueueStats.userId, input.userId));
        
        return { success: true };
      }),
    
    // Create Stripe checkout session for tier upgrade
    createTierUpgradeCheckout: protectedProcedure
      .input(z.object({
        tier: z.enum(['pro', 'enterprise']),
      }))
      .mutation(async ({ ctx, input }) => {
        const { TIER_PRODUCTS, getStripePriceId } = await import('./products');
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2025-12-15.clover' as any,
        });
        
        const product = TIER_PRODUCTS[input.tier];
        const origin = ctx.req.headers.origin || 'http://localhost:3000';
        
        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [
            {
              price: getStripePriceId(input.tier),
              quantity: 1,
            },
          ],
          success_url: `${origin}/queue?upgrade=success`,
          cancel_url: `${origin}/queue?upgrade=cancelled`,
          customer_email: ctx.user.email || undefined,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            userId: ctx.user.id.toString(),
            tier: input.tier,
            userEmail: ctx.user.email || '',
            userName: ctx.user.name || '',
          },
          allow_promotion_codes: true,
        });
        
        return {
          checkoutUrl: session.url,
          sessionId: session.id,
        };
      }),
  }),

  // Queue Management router - Level 5 autonomous architecture
  queue: router({
    // Get queue analytics (admin only)
    getAnalytics: protectedProcedure
      .query(async ({ ctx }) => {
        const queueDb = await import('./queueDb');
        return queueDb.getQueueAnalytics();
      }),

    // Get user's queue stats
    getUserStats: protectedProcedure
      .query(async ({ ctx }) => {
        const queueDb = await import('./queueDb');
        return queueDb.getUserQueueStats(ctx.user.id);
      }),

    // Get user's queue items
    getUserQueue: protectedProcedure
      .query(async ({ ctx }) => {
        const queueDb = await import('./queueDb');
        return queueDb.getUserQueueItems(ctx.user.id);
      }),

    // Get queue position for a generation
    getQueuePosition: protectedProcedure
      .input(z.object({ generationId: z.number() }))
      .query(async ({ ctx, input }) => {
        const queueDb = await import('./queueDb');
        return queueDb.getUserQueuePosition(ctx.user.id, input.generationId);
      }),

    // Cancel queued generation
    cancelQueuedGeneration: protectedProcedure
      .input(z.object({ queueId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const queueDb = await import('./queueDb');
        await queueDb.cancelQueuedGeneration(input.queueId);
        return { success: true };
       }),
  }),
  // Cultural Authenticity router - South African linguistic & regional features
  cultural: culturalRouter,
  communityFeedback: communityFeedbackRouter,
  musicGeneration: musicGenerationRouter,
  samplePacks: samplePackRouter,
});
export type AppRouter = typeof appRouter;
