/**
 * generation.ts — All AI generation routers
 *
 * Covers: music generation (modal proxy), autonomous generation loop,
 *         generation history, stem separation, AI Studio (Suno-style).
 */
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import * as modalClient from "../modalClient";
import { getQueuePosition, getQueueStats } from "../queueManager";
import { executeMusicGenerationWorkflow, executeStemSeparationWorkflow } from "../temporalClient";
import { invokeLLM } from "../_core/llm";
import { storageDelete } from "../storage";
import { ALL_STEM_IDS, SEPARATION_MODEL_CAPABILITIES } from "../../shared/stems";

const generationParams = z.object({
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
  generationMode: z.enum(["creative", "production"]).optional(),
});

// ── generate router ──────────────────────────────────────────────────────────

export const generateRouter = router({
  music: protectedProcedure
    .input(z.object({ prompt: z.string(), projectId: z.number().optional(), parameters: generationParams.optional() }))
    .mutation(async ({ ctx, input }) => {
      const generation = await db.createGeneration({
        userId: ctx.user.id,
        projectId: input.projectId,
        type: "music",
        prompt: input.prompt,
        parameters: input.parameters as any,
        status: "pending",
      });

      try {
        const p = input.parameters;
        const modalResponse = await modalClient.generateMusic({
          prompt: input.prompt,
          tempo: p?.tempo,
          key: p?.key,
          mode: p?.mode,
          instruments: p?.instruments,
          duration: p?.duration,
          seed: p?.seed,
          temperature: p?.temperature,
          topK: p?.topK,
          topP: p?.topP,
          cfgScale: p?.cfgScale,
          generationMode: p?.generationMode || "creative",
        }, generation.id);

        await db.updateGeneration(generation.id, { workflowId: modalResponse.jobId, status: "processing" });
        console.log("[AI Generate] Started Modal job:", modalResponse.jobId);
        return { generationId: generation.id, jobId: modalResponse.jobId, status: "processing" };
      } catch (error) {
        await db.updateGeneration(generation.id, {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    }),

  autonomous: protectedProcedure
    .input(z.object({
      prompt: z.string(),
      projectId: z.number().optional(),
      parameters: generationParams.optional(),
      maxAttempts: z.number().default(3),
      targetScore: z.number().default(80),
    }))
    .mutation(async ({ ctx, input }) => {
      const { scoreCulturalAuthenticity, generateImprovementPrompt } = await import("../culturalScoring");

      // NOTE T-new: This procedure runs in the tRPC request handler.
      // Per-attempt polling keeps Phase 1 working with the fire-and-forget Modal
      // pattern, but the correct Phase 2 architecture is a dedicated Temporal
      // workflow (AutonomousGenerationWorkflow) so that crashes and timeouts do
      // not lose in-progress attempts. Refactor before Phase 2.
      //
      // Poll interval / ceiling aligned with MusicGenerationWorkflow (10 s × 60 = 10 min).
      const POLL_INTERVAL_MS = 10_000;
      const POLL_MAX_MS      = 600_000; // 10 min per attempt

      /**
       * Wait for the webhook handler to set resultUrl on the generation row.
       * Returns the URL or null if the attempt failed / timed out.
       */
      async function pollForResultUrl(generationId: number): Promise<string | null> {
        const deadline = Date.now() + POLL_MAX_MS;
        while (Date.now() < deadline) {
          await new Promise<void>(r => setTimeout(r, POLL_INTERVAL_MS));
          const row = await db.getGenerationById(generationId);
          if (row?.resultUrl) return row.resultUrl;
          if (row?.status === "failed") return null;
        }
        return null; // timed out
      }

      let attempt = 0;
      let bestGeneration: any = null;
      let bestScore = 0;
      let currentPrompt = input.prompt;
      const allScores: any[] = [];
      const allPrompts: string[] = [input.prompt];

      console.log("[Autonomous] Starting — target:", input.targetScore, "max attempts:", input.maxAttempts);

      while (attempt < input.maxAttempts) {
        attempt++;
        console.log(`[Autonomous] Attempt ${attempt}/${input.maxAttempts}`);

        const generation = await db.createGeneration({
          userId: ctx.user.id,
          projectId: input.projectId,
          type: "music",
          prompt: currentPrompt,
          parameters: input.parameters as any,
          status: "pending",
        });

        try {
          const p = input.parameters;
          const modalResponse = await modalClient.generateMusic({
            prompt: currentPrompt,
            tempo: p?.tempo,
            key: p?.key,
            mode: p?.mode,
            instruments: p?.instruments,
            duration: p?.duration,
            seed: p?.seed ? p.seed + attempt : undefined,
            temperature: p?.temperature,
            topK: p?.topK,
            topP: p?.topP,
            cfgScale: p?.cfgScale,
            generationMode: p?.generationMode || "creative",
          }, generation.id);

          await db.updateGeneration(generation.id, {
            workflowId: modalResponse.jobId,
            status: modalResponse.status === "completed" ? "completed" : "processing",
            resultUrl: modalResponse.audioUrl,
            completedAt: modalResponse.status === "completed" ? new Date() : undefined,
          });

          // Resolve audioUrl: synchronous (Modal returned inline) or polled (fire-and-forget)
          const audioUrl: string | null =
            modalResponse.audioUrl ?? await pollForResultUrl(generation.id);

          if (audioUrl) {
            const score = await scoreCulturalAuthenticity(audioUrl, currentPrompt, input.parameters || {});
            console.log(`[Autonomous] Attempt ${attempt} score:`, score.overall,
              `— weakest: ${Object.entries(score.breakdown)
                .sort(([,a],[,b]) => a - b)[0][0]}`);

            await db.updateGeneration(generation.id, {
              status: "completed",
              resultUrl: audioUrl,
              completedAt: new Date(),
              culturalScore: score.overall.toString(),
              culturalScoreBreakdown: score,
            });
            allScores.push(score);

            if (score.overall > bestScore) {
              bestScore = score.overall;
              bestGeneration = { ...generation, resultUrl: audioUrl, culturalScore: score.overall.toString(), score };
            }

            if (score.overall >= input.targetScore) {
              console.log("[Autonomous] Target score achieved!");
              return { success: true, generationId: generation.id, attempts: attempt, finalScore: score.overall, audioUrl, score, allScores, allPrompts, finalPrompt: currentPrompt };
            }

            if (attempt < input.maxAttempts) {
              currentPrompt = generateImprovementPrompt(input.prompt, score, input.parameters || {});
              allPrompts.push(currentPrompt);
              console.log(`[Autonomous] Improvement prompt set for attempt ${attempt + 1}`);
            }
          } else {
            // Timed out or generation failed during polling
            console.warn(`[Autonomous] Attempt ${attempt} produced no audio — skipping`);
            await db.updateGeneration(generation.id, { status: "failed", errorMessage: "No audio produced within 10 minutes" });
          }
        } catch (error) {
          console.error(`[Autonomous] Attempt ${attempt} failed:`, error);
          await db.updateGeneration(generation.id, { status: "failed", errorMessage: error instanceof Error ? error.message : "Unknown error" });
        }
      }

      console.log("[Autonomous] Max attempts reached. Best score:", bestScore);
      return { success: false, generationId: bestGeneration?.id, attempts: input.maxAttempts, finalScore: bestScore, audioUrl: bestGeneration?.resultUrl, score: bestGeneration?.score, allScores, allPrompts, finalPrompt: currentPrompt, message: `Target score not achieved. Best score: ${bestScore}/${input.targetScore}` };
    }),

  status: protectedProcedure
    .input(z.object({ generationId: z.number() }))
    .query(async ({ input }) => {
      const generation = await db.getGenerationById(input.generationId);
      if (!generation) throw new Error("Generation not found");

      if (generation.status === "processing" && generation.workflowId) {
        try {
          const modalStatus = await modalClient.checkJobStatus(generation.workflowId);
          const audioUrl = "audioUrl" in modalStatus ? modalStatus.audioUrl : undefined;

          if (modalStatus.status === "completed" && audioUrl) {
            const culturalScore = "culturalScore" in modalStatus ? modalStatus.culturalScore : undefined;
            const processingTime = "processingTime" in modalStatus ? modalStatus.processingTime : undefined;
            await db.updateGeneration(generation.id, { status: "completed", resultUrl: audioUrl, culturalScore: culturalScore?.toString(), processingTime, completedAt: new Date() });
            return db.getGenerationById(input.generationId);
          } else if (modalStatus.status === "failed") {
            await db.updateGeneration(generation.id, { status: "failed", errorMessage: modalStatus.error || "Generation failed" });
            return db.getGenerationById(input.generationId);
          }
        } catch (error) {
          console.error("[API] Failed to check Modal status:", error);
        }
      }

      return generation;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserGenerations(ctx.user.id);
  }),

  webhook: publicProcedure
    .input(z.object({
      generationId: z.number(),
      jobId: z.string(),
      status: z.enum(["completed", "failed"]),
      audioUrl: z.string().optional(),
      error: z.string().optional(),
      culturalScore: z.number().optional(),
      processingTime: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log("[Webhook] Modal completion callback:", input);
      await db.updateGeneration(input.generationId, {
        status: input.status,
        resultUrl: input.audioUrl,
        errorMessage: input.error,
        culturalScore: input.culturalScore?.toString(),
        processingTime: input.processingTime,
        completedAt: input.status === "completed" ? new Date() : undefined,
      });

      // T7: Auto-trigger cultural scoring when Modal completes without a score.
      // Fire-and-forget — webhook must respond immediately. Failures are logged,
      // not surfaced, since the generation is already stored.
      if (input.status === "completed" && input.audioUrl && !input.culturalScore) {
        db.getGenerationById(input.generationId).then(async (gen) => {
          if (!gen) return;
          try {
            const { scoreCulturalAuthenticity } = await import("../culturalScoring");
            const score = await scoreCulturalAuthenticity(input.audioUrl!, gen.prompt, {});
            await db.updateGeneration(input.generationId, { culturalScore: score.overall.toString(), culturalScoreBreakdown: score });
            console.log("[T7] Auto-scored generation", input.generationId, "→", score.overall);
          } catch (err) {
            console.error("[T7] Auto-scoring failed for generation", input.generationId, err);
          }
        }).catch(err => console.error("[T7] getGenerationById failed:", err));
      }

      return { success: true };
    }),

  getJobStatus: protectedProcedure
    .input(z.object({ generationId: z.number() }))
    .query(async ({ input }) => {
      const generation = await db.getGenerationById(input.generationId);
      if (!generation) throw new Error("Generation not found");
      return {
        generationId: generation.id,
        status: generation.status,
        audioUrl: generation.resultUrl,
        culturalScore: generation.culturalScore ? parseFloat(generation.culturalScore) : undefined,
        processingTime: generation.processingTime,
        errorMessage: generation.errorMessage,
        createdAt: generation.createdAt,
        completedAt: generation.completedAt,
      };
    }),

  retryGeneration: protectedProcedure
    .input(z.object({ generationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const originalGeneration = await db.getGenerationById(input.generationId);
      if (!originalGeneration) throw new TRPCError({ code: "NOT_FOUND", message: "Generation not found" });
      if (originalGeneration.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });

      const retryCount = await db.getGenerationRetryCount(input.generationId);
      if (retryCount >= 3) throw new TRPCError({ code: "BAD_REQUEST", message: "Maximum retry attempts (3) reached" });

      const newGeneration = await db.createGeneration({
        userId: ctx.user.id,
        projectId: originalGeneration.projectId,
        type: originalGeneration.type,
        prompt: originalGeneration.prompt,
        parameters: originalGeneration.parameters as any,
        status: "pending",
        parentId: originalGeneration.id,
      });

      try {
        const params = originalGeneration.parameters as any;
        const modalResponse = await modalClient.generateMusic({
          prompt: originalGeneration.prompt,
          tempo: params?.tempo, key: params?.key, mode: params?.mode,
          instruments: params?.instruments, duration: params?.duration, seed: params?.seed,
          temperature: params?.temperature, topK: params?.topK, topP: params?.topP,
          cfgScale: params?.cfgScale, generationMode: params?.generationMode || "creative",
        }, newGeneration.id);

        await db.updateGeneration(newGeneration.id, { workflowId: modalResponse.jobId, status: "processing" });
        return { generationId: newGeneration.id, jobId: modalResponse.jobId, status: "processing", retryCount: retryCount + 1 };
      } catch (error) {
        await db.updateGeneration(newGeneration.id, { status: "failed", errorMessage: error instanceof Error ? error.message : "Unknown error" });
        throw error;
      }
    }),

  getQueuePosition: protectedProcedure
    .input(z.object({ generationId: z.number() }))
    .query(async ({ input }) => getQueuePosition(input.generationId)),

  getQueueStats: protectedProcedure.query(async () => getQueueStats()),

  failGeneration: protectedProcedure
    .input(z.object({ generationId: z.number(), errorMessage: z.string().default("Generation timeout: exceeded 15 minutes") }))
    .mutation(async ({ ctx, input }) => {
      const generation = await db.getGenerationById(input.generationId);
      if (!generation) throw new TRPCError({ code: "NOT_FOUND", message: "Generation not found" });
      if (generation.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });

      if (generation.status === "pending" || generation.status === "processing") {
        await db.updateGeneration(input.generationId, { status: "failed", errorMessage: input.errorMessage });
        console.log("[Fail Generation] Auto-failed generation:", input.generationId);
        return { success: true, generationId: input.generationId };
      }
      return { success: false, message: "Generation already completed or failed" };
    }),
});

// ── generationHistory router ──────────────────────────────────────────────────

export const generationHistoryRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number().optional(), limit: z.number().default(50) }))
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
      return db.createGenerationHistory({ userId: ctx.user.id, ...input });
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
});

// ── stemSeparation router ─────────────────────────────────────────────────────

export const stemSeparationRouter = router({
  separate: protectedProcedure
    .input(z.object({
      audioUrl: z.string(),
      trackName: z.string().optional(),
      // Optional — pass the generation DB ID when called from AIStudio so the
      // Temporal workflow can correlate completion events back to the row.
      // Callers that only have an audioUrl (e.g. Analysis.tsx) may omit this.
      generationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log("[Stem Separation] Starting 26-stem separation for:", input.audioUrl);
      // Use htdemucs_6s as the first-pass model; the secondary classification
      // pipeline on Modal expands the 6 stems into the full 26-stem ontology.
      // When the fine-tuned model is available, switch to "htdemucs_ft" which
      // natively produces all 26 stems in a single pass.
      try {
        const workflowHandle = await executeStemSeparationWorkflow({
          generationId: input.generationId ?? 0,
          userId: ctx.user.id,
          audioUrl: input.audioUrl,
          modalBaseUrl: process.env.MODAL_BASE_URL || "",
          modalApiKey: process.env.MODAL_API_KEY || "",
        });
        console.log("[Stem Separation] StemSeparationWorkflow started:", workflowHandle.workflowId);
        return { jobId: workflowHandle.workflowId, workflowId: workflowHandle.workflowId, status: "processing" as const };
      } catch (temporalErr) {
        // T3 fallback: direct Modal call until Temporal is wired in all environments
        console.warn("[Stem Separation] Temporal unavailable, falling back to direct Modal:", temporalErr);
        const result = await modalClient.separateStems({
          audioUrl: input.audioUrl,
          stemTypes: SEPARATION_MODEL_CAPABILITIES["htdemucs_6s"] as string[],
        });
        return result;
      }
    }),

  status: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await modalClient.checkJobStatus(input.jobId);
      } catch (error) {
        console.error("[Stem Separation] Status check error:", error);
        throw new Error("Failed to check stem separation status");
      }
    }),
});

// ── aiStudio router ───────────────────────────────────────────────────────────

export const aiStudioRouter = router({
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
      mode: z.enum(["simple", "custom"]),
      duration: z.number().optional().default(30),
    }))
    .mutation(async ({ ctx, input }) => {
      const generation = await db.createGeneration({
        userId: ctx.user.id,
        type: "music",
        prompt: input.prompt,
        lyrics: input.lyrics,
        title: input.title,
        style: input.style,
        mood: input.mood,
        bpm: input.bpm,
        key: input.key,
        vocalStyle: input.vocalStyle,
        parameters: input,
        status: "pending",
      });

      try {
        const workflowHandle = await executeMusicGenerationWorkflow({
          generationId: generation.id,
          userId: ctx.user.id,
          prompt: input.prompt,
          lyrics: input.lyrics,
          duration: input.duration || 30,
          temperature: 1.0,
          modalBaseUrl: process.env.MODAL_BASE_URL || "",
          modalApiKey: process.env.MODAL_API_KEY || "",
        });

        await db.updateGeneration(generation.id, { status: "processing" });
        return { generationId: generation.id, workflowId: workflowHandle.workflowId, status: "processing" };
      } catch (error) {
        await db.updateGeneration(generation.id, { status: "failed", errorMessage: error instanceof Error ? error.message : "Unknown error" });
        throw error;
      }
    }),

  generateLyrics: protectedProcedure
    .input(z.object({ prompt: z.string(), language: z.string().default("zulu"), style: z.string(), mood: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: `You are a professional ${input.language} songwriter specializing in ${input.style} music. Generate authentic, culturally appropriate lyrics that match the mood: ${input.mood}. Output only the lyrics, no explanations.` },
          { role: "user", content: input.prompt },
        ],
      });

      const lyrics = typeof response.choices[0].message.content === "string" ? response.choices[0].message.content : "";

      await db.createGeneration({ userId: ctx.user.id, type: "lyrics", prompt: input.prompt, lyrics, style: input.style, mood: input.mood, parameters: input, status: "completed" });
      return { lyrics };
    }),

  getGeneration: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getGenerationById(input.id);
    }),

  listGenerations: protectedProcedure
    .input(z.object({ type: z.enum(["music", "lyrics", "stem_separation"]).optional(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      return db.getUserGenerations(ctx.user.id, input.limit, input.offset);
    }),

  toggleFavorite: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const gen = await db.getGenerationById(input.id);
      if (!gen || gen.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await db.toggleGenerationFavorite(input.id);
      return { success: true };
    }),

  deleteGeneration: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const gen = await db.getGenerationById(input.id);
      if (!gen || gen.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

      // Delete S3 assets before removing DB record
      const s3Deletes: Promise<void>[] = [];
      if (gen.resultUrl) {
        // resultUrl is a full URL; derive the key by stripping the bucket hostname
        try {
          const key = new URL(gen.resultUrl).pathname.replace(/^\//, "");
          s3Deletes.push(storageDelete(key));
        } catch { /* ignore malformed URLs */ }
      }
      if (gen.stemsUrl) {
        const stems = typeof gen.stemsUrl === "string" ? JSON.parse(gen.stemsUrl) : gen.stemsUrl;
        if (Array.isArray(stems)) {
          for (const stem of stems) {
            const url = typeof stem === "string" ? stem : stem?.url;
            if (url) {
              try {
                const key = new URL(url).pathname.replace(/^\//, "");
                s3Deletes.push(storageDelete(key));
              } catch { /* ignore */ }
            }
          }
        }
      }
      await Promise.allSettled(s3Deletes);
      await db.deleteGeneration(input.id);
      return { success: true };
    }),

  separateStems: protectedProcedure
    .input(z.object({ generationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const generation = await db.getGenerationById(input.generationId);
      if (!generation || !generation.resultUrl) throw new Error("Generation not found or not completed");

      // Use Temporal StemSeparationWorkflow for durable execution — crash recovery
      // and per-stem progress events. Falls back to direct Modal call if Temporal
      // is unavailable (T3 not yet resolved for all environments).
      try {
        const workflowHandle = await executeStemSeparationWorkflow({
          generationId: input.generationId,
          userId: ctx.user.id,
          audioUrl: generation.resultUrl,
          modalBaseUrl: process.env.MODAL_BASE_URL || "",
          modalApiKey: process.env.MODAL_API_KEY || "",
        });
        await db.updateGeneration(input.generationId, { status: "processing" });
        console.log("[J3] StemSeparationWorkflow started:", workflowHandle.workflowId);
        return { workflowId: workflowHandle.workflowId, status: "processing" as const };
      } catch (temporalError) {
        // T3 fallback: direct Modal call until Temporal is wired in all environments
        console.warn("[J3] Temporal unavailable — falling back to direct Modal call:", temporalError);
        const stemResult = await modalClient.separateStems({
          audioUrl: generation.resultUrl,
          stemTypes: SEPARATION_MODEL_CAPABILITIES["htdemucs_6s"] as string[],
        });
        if (stemResult.status === "completed" && stemResult.stems) {
          await db.updateGeneration(input.generationId, {
            // stemsUrl holds the full 26-stem map: { [stemId]: { url, key, sdr_db } }
            stemsUrl: JSON.stringify(stemResult.stems),
          });
        }
        return stemResult;
      }
    }),

  importStemsToDAW: protectedProcedure
    .input(z.object({ generationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const generation = await db.getGenerationById(input.generationId);
      if (!generation) throw new Error("Generation not found");
      if (!generation.stemsUrl) throw new Error("No stems available for this generation");

      // stemsUrl may be either:
      //   - Legacy 4-stem array:  [{ name: "drums", url: "..." }, ...]
      //   - 26-stem ontology map: { "log_drum": { url, key, sdr_db }, ... }
      // Normalise both to [{ stemId, url, sdrDb? }] for track creation.
      type StemEntry = { stemId: string; url: string; sdrDb?: number };
      let stems: StemEntry[] = [];
      try {
        const raw = typeof generation.stemsUrl === "string"
          ? JSON.parse(generation.stemsUrl)
          : generation.stemsUrl;

        if (Array.isArray(raw)) {
          // Legacy format
          stems = (raw as Array<{ name: string; url: string }>)
            .filter(s => s.url)
            .map(s => ({ stemId: s.name, url: s.url }));
        } else if (raw && typeof raw === "object") {
          // 26-stem map format
          stems = Object.entries(raw as Record<string, { url?: string; key?: string; sdr_db?: number }>)
            .filter(([, v]) => v?.url)
            .map(([stemId, v]) => ({ stemId, url: v.url!, sdrDb: v.sdr_db }));
        }
      } catch {
        throw new Error("Failed to parse stems data");
      }

      const userProjects = await db.getUserProjects(ctx.user.id);
      let activeProject = userProjects.find(p => p.status === "active");

      if (!activeProject) {
        activeProject = await db.createProject({
          userId: ctx.user.id,
          name: `AI Generated - ${generation.title || "Untitled"}`,
          description: "Imported from AI Studio generation",
          tempo: generation.bpm || 112,
          key: generation.key || "C",
          mode: generation.style || "amapiano",
        });
      }

      const createdTracks: any[] = [];
      await Promise.all(stems.map(async (stem, idx) => {
        const track = await db.createTrack({
          projectId: activeProject.id,
          name: `${generation.title || "Generation"} — ${stem.stemId.replace(/_/g, " ")}`,
          type: stem.stemId,          // stem ID is the track type — drives color in DAW
          audioUrl: stem.url,
          duration: generation.duration || 30,
          volume: 0.8,
          pan: 0,
          orderIndex: idx,
          // Store per-stem quality data for display in track header
          metadata: stem.sdrDb != null ? { sdrDb: stem.sdrDb } : undefined,
        });
        createdTracks.push(track);
      }));

      return { success: true, projectId: activeProject.id, tracksCreated: createdTracks.length, tracks: createdTracks };
    }),

  /**
   * rateGeneration — T7 feedback loop entry point.
   *
   * A 1–5 star rating from the producer. When rating ≥ 4:
   *   1. Scores the generation culturally if not already scored.
   *   2. Writes a row to gold_standard_generations.
   *
   * This is the write that activates the OS feedback loop. The Phase 0
   * exit criterion requires at least one row in gold_standard_generations
   * after the first test generation is rated.
   */
  rateGeneration: protectedProcedure
    .input(z.object({
      generationId: z.number(),
      rating: z.number().int().min(1).max(5),
      swingRating: z.number().int().min(1).max(5).optional(),
      linguisticRating: z.number().int().min(1).max(5).optional(),
      productionRating: z.number().int().min(1).max(5).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const gen = await db.getGenerationById(input.generationId);
      if (!gen || gen.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Generation not found" });
      }

      await db.setGenerationRating(input.generationId, input.rating);

      if (input.rating >= 4) {
        // Ensure cultural score exists; auto-score now if not already computed.
        if (!gen.culturalScore && gen.resultUrl) {
          try {
            const { scoreCulturalAuthenticity } = await import("../culturalScoring");
            const score = await scoreCulturalAuthenticity(gen.resultUrl, gen.prompt, {});
            await db.updateGeneration(input.generationId, { culturalScore: score.overall.toString(), culturalScoreBreakdown: score });
          } catch (err) {
            console.error("[T7] Auto-scoring failed during rating:", err);
            // Non-fatal: gold standard still written without score; score will arrive via webhook
          }
        }

        // Write the gold standard row — this is the OS kernel activation.
        const goldStandard = await db.upsertGoldStandard({
          generationId: input.generationId,
          culturalRating: input.rating,
          swingRating: input.swingRating ?? input.rating,
          linguisticRating: input.linguisticRating,
          productionRating: input.productionRating,
        });

        console.log("[T7] Gold standard written for generation", input.generationId, "id:", goldStandard.id);
        return { success: true, isGoldStandard: true, goldStandardId: goldStandard.id };
      }

      return { success: true, isGoldStandard: false };
    }),

  checkJobStatus: protectedProcedure
    .input(z.object({ jobId: z.string(), generationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [jobStatus, gen] = await Promise.all([
        modalClient.checkJobStatus(input.jobId),
        db.getGenerationById(input.generationId),
      ]);

      if (jobStatus.status === "completed" && "audioUrl" in jobStatus && jobStatus.audioUrl) {
        if (!gen?.culturalScore) {
          // First time hitting completed — score and store breakdown
          const { scoreCulturalAuthenticity } = await import("../culturalScoring");
          const score = await scoreCulturalAuthenticity(
            jobStatus.audioUrl,
            gen?.prompt ?? "",
            gen?.parameters ?? {}
          );
          await db.updateGeneration(input.generationId, {
            status: "completed",
            resultUrl: jobStatus.audioUrl,
            completedAt: new Date(),
            culturalScore: score.overall.toString(),
            culturalScoreBreakdown: score,
          });
          return {
            status: "completed" as const,
            audioUrl: jobStatus.audioUrl,
            culturalScore: score.overall,
            culturalScoreBreakdown: score,
          };
        }
        // Already scored — ensure DB is updated but skip re-scoring
        await db.updateGeneration(input.generationId, {
          status: "completed",
          resultUrl: jobStatus.audioUrl,
          completedAt: new Date(),
        });
      } else if (jobStatus.status === "failed") {
        await db.updateGeneration(input.generationId, {
          status: "failed",
          errorMessage: ("error" in jobStatus ? jobStatus.error : undefined) || "Generation failed",
        });
      }

      // Return current state from DB (handles already-scored and non-completed cases)
      const updated = await db.getGenerationById(input.generationId);
      return {
        status: updated?.status ?? jobStatus.status,
        audioUrl: updated?.resultUrl ?? undefined,
        culturalScore: updated?.culturalScore ? parseFloat(updated.culturalScore as string) : undefined,
        culturalScoreBreakdown: updated?.culturalScoreBreakdown as import("../culturalScoring").CulturalScore | undefined,
        error: updated?.errorMessage ?? undefined,
      };
    }),
});
