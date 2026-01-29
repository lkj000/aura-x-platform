import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { communityFeedback, modelPerformanceMetrics, generations } from "../drizzle/schema";
import { getDb } from "./db";
import { eq, and, desc, gte, sql } from "drizzle-orm";

/**
 * Community Feedback Router
 * 
 * Implements the AI-native feedback loop for continuous model improvement.
 * This router handles:
 * - Feedback submission (Ground Truth data collection)
 * - Feedback retrieval and aggregation
 * - Model performance monitoring (MLOps)
 * - Gold Standard dataset curation
 */

export const communityFeedbackRouter = router({
  /**
   * Submit feedback for a generation
   * Creates "Ground Truth" data for model retraining
   */
  submit: protectedProcedure
    .input(
      z.object({
        generationId: z.number(),
        culturalAuthenticityRating: z.number().min(1).max(5).optional(),
        rhythmicSwingRating: z.number().min(1).max(5).optional(),
        linguisticAlignmentRating: z.number().min(1).max(5).optional(),
        productionQualityRating: z.number().min(1).max(5).optional(),
        creativityRating: z.number().min(1).max(5).optional(),
        isFavorite: z.boolean().optional(),
        textFeedback: z.string().optional(),
        feedbackTags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Get generation details to extract model metadata
      const generation = await db.query.generations.findFirst({
        where: eq(generations.id, input.generationId),
      });

      if (!generation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Generation not found",
        });
      }

      // Determine if this should be marked as Gold Standard
      // (High ratings across all dimensions)
      const isGoldStandard =
        (input.culturalAuthenticityRating || 0) >= 4 &&
        (input.rhythmicSwingRating || 0) >= 4 &&
        (input.productionQualityRating || 0) >= 4;

      // Extract model version from generation metadata
      // In a real implementation, this would come from the generation parameters
      const modelVersion = "si-v1.0-baseline"; // TODO: Extract from generation.parameters

      // Insert feedback
      const [feedback] = await db.insert(communityFeedback).values({
        userId: ctx.user.id,
        generationId: input.generationId,
        culturalAuthenticityRating: input.culturalAuthenticityRating,
        rhythmicSwingRating: input.rhythmicSwingRating,
        linguisticAlignmentRating: input.linguisticAlignmentRating,
        productionQualityRating: input.productionQualityRating,
        creativityRating: input.creativityRating,
        isFavorite: input.isFavorite || false,
        isGoldStandard,
        textFeedback: input.textFeedback,
        feedbackTags: input.feedbackTags ? JSON.stringify(input.feedbackTags) : null,
        modelVersion,
        generationParams: generation.parameters,
        culturalParams: generation.parameters, // TODO: Extract cultural-specific params
      });

      return {
        success: true,
        feedbackId: feedback.insertId,
        isGoldStandard,
      };
    }),

  /**
   * Toggle favorite status for a generation
   */
  toggleFavorite: protectedProcedure
    .input(
      z.object({
        generationId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check if feedback already exists
      const existing = await db.query.communityFeedback.findFirst({
        where: and(
          eq(communityFeedback.userId, ctx.user.id),
          eq(communityFeedback.generationId, input.generationId)
        ),
      });

      if (existing) {
        // Toggle existing favorite
        await db
          .update(communityFeedback)
          .set({ isFavorite: !existing.isFavorite })
          .where(eq(communityFeedback.id, existing.id));

        return { isFavorite: !existing.isFavorite };
      } else {
        // Create new feedback with favorite
        const generation = await db.query.generations.findFirst({
          where: eq(generations.id, input.generationId),
        });

        if (!generation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Generation not found",
          });
        }

        await db.insert(communityFeedback).values({
          userId: ctx.user.id,
          generationId: input.generationId,
          isFavorite: true,
          modelVersion: "si-v1.0-baseline",
          generationParams: generation.parameters,
          culturalParams: generation.parameters,
        });

        return { isFavorite: true };
      }
    }),

  /**
   * Get all feedback for a specific generation
   */
  getByGeneration: publicProcedure
    .input(
      z.object({
        generationId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const feedback = await db.query.communityFeedback.findMany({
        where: eq(communityFeedback.generationId, input.generationId),
        orderBy: desc(communityFeedback.createdAt),
      });

      return feedback;
    }),

  /**
   * Get aggregated feedback statistics
   * Used for displaying community consensus
   */
  getStats: publicProcedure
    .input(
      z.object({
        generationId: z.number().optional(),
        modelVersion: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      let whereClause;
      if (input.generationId) {
        whereClause = eq(communityFeedback.generationId, input.generationId);
      } else if (input.modelVersion) {
        whereClause = eq(communityFeedback.modelVersion, input.modelVersion);
      }

      if (!whereClause) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either generationId or modelVersion must be provided",
        });
      }

      const stats = await db
        .select({
          avgCulturalRating: sql<number>`AVG(${communityFeedback.culturalAuthenticityRating})`,
          avgSwingRating: sql<number>`AVG(${communityFeedback.rhythmicSwingRating})`,
          avgProductionRating: sql<number>`AVG(${communityFeedback.productionQualityRating})`,
          avgCreativityRating: sql<number>`AVG(${communityFeedback.creativityRating})`,
          totalFeedbackCount: sql<number>`COUNT(*)`,
          favoriteCount: sql<number>`SUM(CASE WHEN ${communityFeedback.isFavorite} THEN 1 ELSE 0 END)`,
          goldStandardCount: sql<number>`SUM(CASE WHEN ${communityFeedback.isGoldStandard} THEN 1 ELSE 0 END)`,
        })
        .from(communityFeedback)
        .where(whereClause);

      const result = stats[0];
      const favoriteRate =
        result.totalFeedbackCount > 0
          ? (result.favoriteCount / result.totalFeedbackCount) * 100
          : 0;

      return {
        avgCulturalRating: result.avgCulturalRating || 0,
        avgSwingRating: result.avgSwingRating || 0,
        avgProductionRating: result.avgProductionRating || 0,
        avgCreativityRating: result.avgCreativityRating || 0,
        totalFeedbackCount: result.totalFeedbackCount || 0,
        favoriteRate,
        goldStandardCount: result.goldStandardCount || 0,
      };
    }),

  /**
   * Get model performance metrics over time
   * Used for MLOps monitoring and drift detection
   */
  getModelPerformance: publicProcedure
    .input(
      z.object({
        modelVersion: z.string(),
        days: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const metrics = await db.query.modelPerformanceMetrics.findMany({
        where: and(
          eq(modelPerformanceMetrics.modelVersion, input.modelVersion),
          gte(modelPerformanceMetrics.metricDate, startDate)
        ),
        orderBy: desc(modelPerformanceMetrics.metricDate),
      });

      return metrics;
    }),

  /**
   * Get Gold Standard dataset for model retraining
   * Returns high-quality feedback (ratings >= 4) for ML training
   */
  getGoldStandard: protectedProcedure
    .input(
      z.object({
        modelVersion: z.string().optional(),
        culturalRegion: z.string().optional(),
        language: z.string().optional(),
        limit: z.number().default(1000),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const conditions = [eq(communityFeedback.isGoldStandard, true)];

      if (input.modelVersion) {
        conditions.push(eq(communityFeedback.modelVersion, input.modelVersion));
      }

      const goldStandard = await db.query.communityFeedback.findMany({
        where: and(...conditions),
        orderBy: desc(communityFeedback.createdAt),
        limit: input.limit,
      });

      return goldStandard;
    }),

  /**
   * Get user's own feedback history
   */
  getMyFeedback: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const feedback = await db.query.communityFeedback.findMany({
        where: eq(communityFeedback.userId, ctx.user.id),
        orderBy: desc(communityFeedback.createdAt),
        limit: input.limit,
      });

      return feedback;
    }),
});
