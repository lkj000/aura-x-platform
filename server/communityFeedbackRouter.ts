import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { 
  communityFeedback, 
  goldStandardGenerations,
  modelPerformanceMetrics,
  type InsertCommunityFeedback,
  type InsertGoldStandardGeneration,
  type InsertModelPerformanceMetric
} from "../drizzle/schema";

/**
 * Community Feedback Router
 * 
 * Implements the AI-native PDLC feedback loop:
 * 1. Collect community ratings on generated patterns
 * 2. Aggregate feedback into ground truth datasets
 * 3. Monitor model performance and detect drift
 * 4. Export Gold Standard datasets for retraining
 */

export const communityFeedbackRouter = router({
  /**
   * Submit feedback on a generated pattern
   * Core of the feedback loop - captures user ratings
   */
  submitFeedback: protectedProcedure
    .input(
      z.object({
        generationId: z.number(),
        culturalAuthenticityRating: z.number().min(1).max(5),
        rhythmicSwingRating: z.number().min(1).max(5),
        linguisticAlignmentRating: z.number().min(1).max(5).optional(),
        productionQualityRating: z.number().min(1).max(5).optional(),
        textFeedback: z.string().optional(),
        isFavorite: z.boolean().default(false),
        region: z.string().optional(),
        language: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const feedbackData: InsertCommunityFeedback = {
        userId: ctx.user.id,
        generationId: input.generationId,
        modelVersion: 'si-v1.0', // Default model version
        culturalAuthenticityRating: input.culturalAuthenticityRating,
        rhythmicSwingRating: input.rhythmicSwingRating,
        linguisticAlignmentRating: input.linguisticAlignmentRating || null,
        productionQualityRating: input.productionQualityRating || null,
        textFeedback: input.textFeedback || null,
        isFavorite: input.isFavorite,
      };

      const result = await db.insert(communityFeedback).values(feedbackData);
      const insertedId = Number(result[0].insertId);

      // Check if this feedback qualifies the generation for Gold Standard
      await checkAndAddToGoldStandard(db, input.generationId);

      return { id: insertedId, success: true };
    }),

  /**
   * Quick rating (simplified feedback)
   * For one-click rating without detailed breakdown
   */
  quickRate: protectedProcedure
    .input(
      z.object({
        generationId: z.number(),
        rating: z.number().min(1).max(5),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Use the same rating for both cultural and rhythmic dimensions
      const feedbackData: InsertCommunityFeedback = {
        userId: ctx.user.id,
        generationId: input.generationId,
        modelVersion: 'si-v1.0',
        culturalAuthenticityRating: input.rating,
        rhythmicSwingRating: input.rating,
        linguisticAlignmentRating: null,
        productionQualityRating: null,
        textFeedback: null,
        isFavorite: input.rating >= 4,
      };

      const result = await db.insert(communityFeedback).values(feedbackData);
      const insertedId = Number(result[0].insertId);

      await checkAndAddToGoldStandard(db, input.generationId);

      return { id: insertedId, success: true };
    }),

  /**
   * Get all feedback for a generation
   * Used for displaying community ratings
   */
  getFeedback: publicProcedure
    .input(
      z.object({
        generationId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const feedback = await db
        .select()
        .from(communityFeedback)
        .where(eq(communityFeedback.generationId, input.generationId))
        .orderBy(desc(communityFeedback.createdAt));

      return feedback;
    }),

  /**
   * Get aggregated feedback statistics
   * Used for displaying community consensus
   */
  getStats: publicProcedure
    .input(
      z.object({
        generationId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const stats = await db
        .select({
          avgCulturalRating: sql<number>`AVG(${communityFeedback.culturalAuthenticityRating})`,
          avgSwingRating: sql<number>`AVG(${communityFeedback.rhythmicSwingRating})`,
          avgLinguisticRating: sql<number>`AVG(${communityFeedback.linguisticAlignmentRating})`,
          avgProductionRating: sql<number>`AVG(${communityFeedback.productionQualityRating})`,
          totalFeedbackCount: sql<number>`COUNT(*)`,
          favoriteCount: sql<number>`SUM(CASE WHEN ${communityFeedback.isFavorite} = 1 THEN 1 ELSE 0 END)`,
        })
        .from(communityFeedback)
        .where(eq(communityFeedback.generationId, input.generationId));

      if (!stats || stats.length === 0) {
        return {
          avgCulturalRating: 0,
          avgSwingRating: 0,
          avgLinguisticRating: 0,
          avgProductionRating: 0,
          totalFeedbackCount: 0,
          favoriteRate: 0,
        };
      }

      const result = stats[0];
      return {
        avgCulturalRating: Number(result.avgCulturalRating) || 0,
        avgSwingRating: Number(result.avgSwingRating) || 0,
        avgLinguisticRating: Number(result.avgLinguisticRating) || 0,
        avgProductionRating: Number(result.avgProductionRating) || 0,
        totalFeedbackCount: Number(result.totalFeedbackCount) || 0,
        favoriteRate: result.totalFeedbackCount > 0 
          ? (Number(result.favoriteCount) / Number(result.totalFeedbackCount)) * 100 
          : 0,
      };
    }),

  /**
   * Get Gold Standard dataset
   * High-quality patterns for model retraining
   */
  getGoldStandardDataset: publicProcedure
    .input(
      z.object({
        minRating: z.number().min(1).max(5).default(4),
        limit: z.number().min(1).max(1000).default(100),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const goldStandard = await db
        .select()
        .from(goldStandardGenerations)
        .where(
          and(
            gte(goldStandardGenerations.avgCulturalRating, input.minRating.toString()),
            gte(goldStandardGenerations.avgSwingRating, input.minRating.toString())
          )
        )
        .orderBy(desc(goldStandardGenerations.updatedAt))
        .limit(input.limit);

      return goldStandard;
    }),

  /**
   * Get model performance metrics
   * Used for drift detection and MLOps monitoring
   */
  getModelPerformanceMetrics: publicProcedure
    .input(
      z.object({
        timeRange: z.enum(['7d', '30d', '90d']).default('30d'),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Calculate date threshold
      const daysAgo = input.timeRange === '7d' ? 7 : input.timeRange === '30d' ? 30 : 90;
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - daysAgo);

      const metrics = await db
        .select()
        .from(modelPerformanceMetrics)
        .where(gte(modelPerformanceMetrics.metricDate, threshold))
        .orderBy(desc(modelPerformanceMetrics.metricDate));

      return metrics;
    }),

  /**
   * Record model performance metric
   * Called periodically to track model quality over time
   */
  recordPerformanceMetric: protectedProcedure
    .input(
      z.object({
        modelVersion: z.string(),
        metricDate: z.date().default(() => new Date()),
        avgCulturalAuthenticityRating: z.number(),
        avgRhythmicSwingRating: z.number(),
        avgProductionQualityRating: z.number(),
        totalGenerations: z.number(),
        totalFeedbackCount: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Only admins can record metrics (this is typically done by automated jobs)
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const metricData: InsertModelPerformanceMetric = {
        modelVersion: input.modelVersion,
        metricDate: input.metricDate,
        avgCulturalAuthenticityRating: input.avgCulturalAuthenticityRating.toString(),
        avgRhythmicSwingRating: input.avgRhythmicSwingRating.toString(),
        avgProductionQualityRating: input.avgProductionQualityRating.toString(),
        avgCreativityRating: null,
        totalGenerations: input.totalGenerations,
        totalFeedbackCount: input.totalFeedbackCount,
        favoriteRate: null,
        culturalDriftScore: null,
        performanceTrend: null,
      };

      const result = await db.insert(modelPerformanceMetrics).values(metricData);
      const insertedId = Number(result[0].insertId);

      return { id: insertedId, success: true };
    }),
});

/**
 * Helper: Check if generation qualifies for Gold Standard
 * Automatically adds high-quality patterns to training dataset
 */
async function checkAndAddToGoldStandard(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  generationId: number
): Promise<void> {
  // Calculate average ratings for this generation
  const stats = await db
    .select({
      avgCultural: sql<number>`AVG(${communityFeedback.culturalAuthenticityRating})`,
      avgSwing: sql<number>`AVG(${communityFeedback.rhythmicSwingRating})`,
      avgLinguistic: sql<number>`AVG(${communityFeedback.linguisticAlignmentRating})`,
      avgProduction: sql<number>`AVG(${communityFeedback.productionQualityRating})`,
      feedbackCount: sql<number>`COUNT(*)`,
      favoriteCount: sql<number>`SUM(CASE WHEN ${communityFeedback.isFavorite} = 1 THEN 1 ELSE 0 END)`,
    })
    .from(communityFeedback)
    .where(eq(communityFeedback.generationId, generationId));

  if (!stats || stats.length === 0) return;

  const result = stats[0];
  const avgCultural = Number(result.avgCultural) || 0;
  const avgSwing = Number(result.avgSwing) || 0;
  const feedbackCount = Number(result.feedbackCount) || 0;

  // Gold Standard criteria: avg rating >= 4 and at least 3 feedback entries
  if (avgCultural >= 4 && avgSwing >= 4 && feedbackCount >= 3) {
    // Check if already in dataset
    const existing = await db
      .select()
      .from(goldStandardGenerations)
      .where(eq(goldStandardGenerations.generationId, generationId))
      .limit(1);

    const datasetEntry: InsertGoldStandardGeneration = {
      generationId,
      avgCulturalRating: avgCultural.toString(),
      avgSwingRating: avgSwing.toString(),
      avgLinguisticRating: (Number(result.avgLinguistic) || 0).toString(),
      avgProductionRating: (Number(result.avgProduction) || 0).toString(),
      feedbackCount,
      favoriteCount: Number(result.favoriteCount) || 0,
      isGoldStandard: true,
    };

    if (existing.length === 0) {
      // Insert new entry
      await db.insert(goldStandardGenerations).values(datasetEntry);
    } else {
      // Update existing entry
      await db
        .update(goldStandardGenerations)
        .set(datasetEntry)
        .where(eq(goldStandardGenerations.generationId, generationId));
    }
  }
}
