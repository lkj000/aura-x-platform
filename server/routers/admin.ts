/**
 * admin.ts — Admin, queue management, and user preferences routers
 *
 * Covers: admin user/tier management, queue analytics, user preferences.
 */
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { users, userQueueStats, userPreferences } from "../../drizzle/schema";
import { getDb } from "../db";
import { getMaxConcurrentJobs } from "../../shared/tierConfig";
import type { UserTier } from "../../shared/tierConfig";

export const adminRouter = router({
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    return db.select().from(users).orderBy(desc(users.createdAt));
  }),

  updateUserTier: protectedProcedure
    .input(z.object({ userId: z.number(), tier: z.enum(["free", "pro", "enterprise"]) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.update(users).set({ tier: input.tier }).where(eq(users.id, input.userId));

      const maxConcurrentJobs = getMaxConcurrentJobs(input.tier as UserTier);
      await db.update(userQueueStats).set({ maxConcurrentJobs }).where(eq(userQueueStats.userId, input.userId));

      return { success: true };
    }),

  createTierUpgradeCheckout: protectedProcedure
    .input(z.object({ tier: z.enum(["pro", "enterprise"]) }))
    .mutation(async ({ ctx, input }) => {
      const { TIER_PRODUCTS, getStripePriceId } = await import("../products");
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" as any });

      const origin = ctx.req.headers.origin || "http://localhost:3000";
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: getStripePriceId(input.tier), quantity: 1 }],
        success_url: `${origin}/queue?upgrade=success`,
        cancel_url: `${origin}/queue?upgrade=cancelled`,
        customer_email: ctx.user.email || undefined,
        client_reference_id: ctx.user.id.toString(),
        metadata: { userId: ctx.user.id.toString(), tier: input.tier, userEmail: ctx.user.email || "", userName: ctx.user.name || "" },
        allow_promotion_codes: true,
      });

      return { checkoutUrl: session.url, sessionId: session.id };
    }),
});

export const queueRouter = router({
  getAnalytics: protectedProcedure.query(async () => {
    const queueDb = await import("../queueDb");
    return queueDb.getQueueAnalytics();
  }),

  getUserStats: protectedProcedure.query(async ({ ctx }) => {
    const queueDb = await import("../queueDb");
    return queueDb.getUserQueueStats(ctx.user.id);
  }),

  getUserQueue: protectedProcedure.query(async ({ ctx }) => {
    const queueDb = await import("../queueDb");
    return queueDb.getUserQueueItems(ctx.user.id);
  }),

  getQueuePosition: protectedProcedure
    .input(z.object({ generationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const queueDb = await import("../queueDb");
      return queueDb.getUserQueuePosition(ctx.user.id, input.generationId);
    }),

  cancelQueuedGeneration: protectedProcedure
    .input(z.object({ queueId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const queueDb = await import("../queueDb");
      await queueDb.cancelQueuedGeneration(input.queueId);
      return { success: true };
    }),
});

export const preferencesRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

    const [preference] = await db.select().from(userPreferences).where(eq(userPreferences.userId, ctx.user.id)).limit(1);

    if (!preference) {
      const [newPref] = await db.insert(userPreferences).values({ userId: ctx.user.id }).$returningId();
      const [created] = await db.select().from(userPreferences).where(eq(userPreferences.id, newPref.id)).limit(1);
      return created;
    }

    return preference;
  }),

  update: protectedProcedure
    .input(z.object({
      notificationSoundEnabled: z.boolean().optional(),
      emailNotifications: z.boolean().optional(),
      theme: z.enum(["light", "dark", "system"]).optional(),
      defaultGenerationMode: z.enum(["creative", "production"]).optional(),
      defaultTempo: z.number().optional(),
      defaultKey: z.string().optional(),
      defaultDuration: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const [existing] = await db.select().from(userPreferences).where(eq(userPreferences.userId, ctx.user.id)).limit(1);

      if (!existing) {
        await db.insert(userPreferences).values({ userId: ctx.user.id, ...input });
      } else {
        await db.update(userPreferences).set(input).where(eq(userPreferences.userId, ctx.user.id));
      }

      return { success: true };
    }),
});
