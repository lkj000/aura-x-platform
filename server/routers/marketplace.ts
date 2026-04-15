/**
 * marketplace.ts — Marketplace and bundle routers
 *
 * Covers: sample pack listing/purchase/reviews, bundles with Stripe checkout.
 */
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const marketplaceRouter = router({
  listPacks: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      category: z.string().optional(),
      sellerId: z.number().optional(),
      sortBy: z.enum(["popular", "recent", "price_low", "price_high"]).default("popular"),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      return db.listMarketplacePacks(input);
    }),

  getPack: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getMarketplacePack(input.id);
    }),

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
      return db.createMarketplacePack({ sellerId: ctx.user.id, ...input });
    }),

  createCheckoutSession: protectedProcedure
    .input(z.object({ packId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const pack = await db.getMarketplacePack(input.packId);
      if (!pack) throw new Error("Sample pack not found");

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" as any });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
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
            unit_amount: Math.round(Number(pack.price) * 100),
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${ctx.req.headers.origin}/marketplace?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${ctx.req.headers.origin}/marketplace?canceled=true`,
        customer_email: ctx.user.email || undefined,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          pack_id: pack.id.toString(),
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || "",
        },
        allow_promotion_codes: true,
      });

      return { sessionId: session.id, url: session.url };
    }),

  purchasePack: protectedProcedure
    .input(z.object({ packId: z.number(), paymentIntentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return db.createMarketplacePurchase({ userId: ctx.user.id, packId: input.packId, paymentIntentId: input.paymentIntentId });
    }),

  getUserPurchases: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserMarketplacePurchases(ctx.user.id);
  }),

  createDownload: protectedProcedure
    .input(z.object({ purchaseId: z.number(), packId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const purchases = await db.getUserMarketplacePurchases(ctx.user.id);
      const purchase = purchases.find(p => p.id === input.purchaseId);
      if (!purchase) throw new Error("Purchase not found");

      const pack = await db.getMarketplacePack(input.packId);
      if (!pack) throw new Error("Pack not found");

      await db.createMarketplaceDownload({ userId: ctx.user.id, packId: input.packId, purchaseId: input.purchaseId });
      return { downloadUrl: pack.fileUrl };
    }),

  addReview: protectedProcedure
    .input(z.object({ packId: z.number(), rating: z.number().min(1).max(5), comment: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return db.createMarketplaceReview({ userId: ctx.user.id, ...input });
    }),

  getPackReviews: publicProcedure
    .input(z.object({ packId: z.number() }))
    .query(async ({ input }) => {
      return db.getMarketplaceReviews(input.packId);
    }),

  getSellerAnalytics: protectedProcedure.query(async ({ ctx }) => {
    return db.getSellerAnalytics(ctx.user.id);
  }),
});

export const bundlesRouter = router({
  createBundle: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string().optional(),
      packIds: z.array(z.number()).min(2),
      discountPercent: z.number().min(1).max(99),
      coverImage: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const packs = await Promise.all(input.packIds.map(id => db.getMarketplacePack(id)));
      const originalPrice = packs.reduce((sum, pack) => sum + Number(pack?.price || 0), 0);
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

  listBundles: publicProcedure
    .input(z.object({ sellerId: z.number().optional(), isActive: z.boolean().optional(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      return db.listMarketplaceBundles(input);
    }),

  getBundle: publicProcedure
    .input(z.object({ bundleId: z.number() }))
    .query(async ({ input }) => {
      return db.getMarketplaceBundle(input.bundleId);
    }),

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

  createBundleCheckout: protectedProcedure
    .input(z.object({ bundleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const bundle = await db.getMarketplaceBundle(input.bundleId);
      if (!bundle) throw new Error("Bundle not found");

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" as any });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: bundle.title, description: `Bundle with ${bundle.packs.length} sample packs` },
            unit_amount: Math.round(Number(bundle.bundlePrice) * 100),
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${ctx.req.headers.origin}/marketplace?success=true`,
        cancel_url: `${ctx.req.headers.origin}/marketplace?canceled=true`,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          bundle_id: input.bundleId.toString(),
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || "",
          type: "bundle",
        },
        allow_promotion_codes: true,
      });

      return { checkoutUrl: session.url };
    }),
});
