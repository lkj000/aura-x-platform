/**
 * social.ts — Social and quality scoring routers
 *
 * Covers: producer profiles, follows, activity feed, quality score analysis.
 */
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const socialRouter = router({
  getProfile: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return db.getOrCreateProducerProfile(input.userId);
    }),

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

  followUser: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return db.followUser(ctx.user.id, input.userId);
    }),

  unfollowUser: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return db.unfollowUser(ctx.user.id, input.userId);
    }),

  getFollowerCount: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return db.getFollowerCount(input.userId);
    }),

  getFollowingCount: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return db.getFollowingCount(input.userId);
    }),

  isFollowing: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.isFollowing(ctx.user.id, input.userId);
    }),

  getActivityFeed: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      return db.getActivityFeed(ctx.user.id, input.limit);
    }),
});

export const qualityScoringRouter = router({
  analyze: protectedProcedure
    .input(z.object({ audioUrl: z.string(), trackName: z.string().optional() }))
    .mutation(async ({ input }) => {
      try {
        const response = await fetch("http://localhost:8001/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio_url: input.audioUrl, track_name: input.trackName }),
        });

        if (!response.ok) {
          throw new Error(`Quality service responded with ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error("[qualityScoring] Analysis failed:", error);
        throw new Error("Quality scoring service unavailable. Ensure the Python quality service is running on port 8001.");
      }
    }),
});
