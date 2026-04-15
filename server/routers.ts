/**
 * routers.ts — App router index
 *
 * This file is intentionally thin. Each domain lives in its own module under
 * server/routers/. Add new domains there, then wire them in here.
 *
 * Domain → file mapping:
 *   auth            → inline (cookie clear only)
 *   DAW (projects, tracks, clips, midi, automation) → routers/daw.ts
 *   generation, aiStudio, stemSeparation, history   → routers/generation.ts
 *   media, samples                                   → routers/media.ts
 *   presets, presetFavorites                         → routers/presets.ts
 *   collaboration                                    → routers/collaboration.ts
 *   marketplace, bundles                             → routers/marketplace.ts
 *   social, qualityScoring                           → routers/social.ts
 *   admin, queue, preferences                        → routers/admin.ts
 *   cultural                                         → routers/cultural.ts  (pre-existing)
 *   djStudio                                         → routers/djStudio.ts  (pre-existing)
 *   djStudioWebhooks                                 → routers/djStudioWebhooks.ts (pre-existing)
 *   communityFeedback                                → communityFeedbackRouter.ts (pre-existing)
 *   musicGeneration                                  → musicGenerationRouter.ts   (pre-existing)
 *   samplePacks                                      → samplePackRouter.ts        (pre-existing)
 */
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

// DAW
import { projectsRouter, tracksRouter, audioClipsRouter, midiNotesRouter, automationRouter } from "./routers/daw";
import { midiRouter } from "./routers/midi";

// Generation / AI
import { generateRouter, generationHistoryRouter, stemSeparationRouter, aiStudioRouter } from "./routers/generation";

// Media
import { samplesRouter, mediaLibraryRouter } from "./routers/media";

// Presets
import { presetFavoritesRouter, customPresetsRouter } from "./routers/presets";

// Collaboration
import { collaborationRouter } from "./routers/collaboration";

// Marketplace
import { marketplaceRouter, bundlesRouter } from "./routers/marketplace";

// Social / Quality
import { socialRouter, qualityScoringRouter } from "./routers/social";

// Admin / Queue / Preferences
import { adminRouter, queueRouter, preferencesRouter } from "./routers/admin";

// Training data pipeline
import { trainingRouter } from "./routers/training";

// Pre-existing domain routers
import { culturalRouter } from "./routers/cultural";
import { communityFeedbackRouter } from "./communityFeedbackRouter";
import { musicGenerationRouter } from "./musicGenerationRouter";
import { samplePackRouter } from "./samplePackRouter";
import { djStudioRouter } from "./routers/djStudio";
import { djStudioWebhooksRouter } from "./routers/djStudioWebhooks";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // DAW
  projects: projectsRouter,
  tracks: tracksRouter,
  audioClips: audioClipsRouter,
  midiNotes: midiNotesRouter,
  automation: automationRouter,
  midi: midiRouter,

  // Generation / AI
  generate: generateRouter,
  generationHistory: generationHistoryRouter,
  stemSeparation: stemSeparationRouter,
  aiStudio: aiStudioRouter,

  // Media
  samples: samplesRouter,
  mediaLibrary: mediaLibraryRouter,

  // Presets
  presetFavorites: presetFavoritesRouter,
  customPresets: customPresetsRouter,

  // Collaboration
  collaboration: collaborationRouter,

  // Marketplace
  marketplace: marketplaceRouter,
  bundles: bundlesRouter,

  // Social / Quality
  social: socialRouter,
  qualityScoring: qualityScoringRouter,

  // Admin / Queue / Preferences
  admin: adminRouter,
  queue: queueRouter,
  preferences: preferencesRouter,

  // Training data pipeline
  training: trainingRouter,

  // Pre-existing domain routers
  djStudio: djStudioRouter,
  djStudioWebhooks: djStudioWebhooksRouter,
  cultural: culturalRouter,
  communityFeedback: communityFeedbackRouter,
  musicGeneration: musicGenerationRouter,
  samplePacks: samplePackRouter,
});

export type AppRouter = typeof appRouter;
