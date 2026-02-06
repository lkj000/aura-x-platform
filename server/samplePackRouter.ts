import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { samplePacks, samplePackFolders, samples } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { storagePut } from "./storage";
import { getDb } from "./db";

/**
 * Sample Pack Router
 * Handles folder upload, metadata extraction, and pack management
 */

export const samplePackRouter = router({
  /**
   * Create a new sample pack
   */
  createPack: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        version: z.string().default("1.0.0"),
        genre: z.string().default("amapiano"),
        subgenre: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const [pack] = await db.insert(samplePacks).values({
        name: input.name,
        description: input.description,
        version: input.version,
        author: ctx.user.name || "Unknown",
        genre: input.genre,
        subgenre: input.subgenre,
        totalSamples: 0,
        totalSizeMb: "0",
      });

      return { packId: pack.insertId };
    }),

  /**
   * Upload a single sample file to S3 and create database record
   */
  uploadSample: protectedProcedure
    .input(
      z.object({
        packId: z.number(),
        folderId: z.number().optional(),
        name: z.string(),
        filename: z.string(),
        fileData: z.string(), // Base64 encoded file data
        category: z.enum([
          "log-drum",
          "shaker",
          "chord",
          "bass",
          "saxophone",
          "vocal",
          "percussion",
          "fx",
          "loop",
          "one-shot",
        ]),
        metadata: z
          .object({
            duration: z.string().optional(),
            bpm: z.number().optional(),
            key: z.string().optional(),
            sampleRate: z.number().optional(),
            bitDepth: z.number().optional(),
            fileSize: z.number(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      try {
        // Decode base64 file data
        const fileBuffer = Buffer.from(input.fileData, "base64");

        // Generate unique S3 key
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileKey = `sample-packs/${input.packId}/${input.folderId || "root"}/${timestamp}-${randomSuffix}-${input.filename}`;

        // Upload to S3
        const { url: fileUrl } = await storagePut(
          fileKey,
          fileBuffer,
          "audio/wav" // Default to WAV, could be detected from filename
        );

        // Insert sample record
        const [sample] = await db.insert(samples).values({
          packId: input.packId,
          name: input.name,
          category: input.category,
          fileUrl,
          duration: input.metadata?.duration,
          bpm: input.metadata?.bpm,
          key: input.metadata?.key,
          sampleRate: input.metadata?.sampleRate || 44100,
          bitDepth: input.metadata?.bitDepth || 24,
          fileSize: input.metadata?.fileSize,
          format: input.filename.split(".").pop() || "wav",
        });

        // Update pack total samples count
        await db
          .update(samplePacks)
          .set({
            totalSamples: db
              .select({ count: samples.id })
              .from(samples)
              .where(eq(samples.packId, input.packId)) as any,
          })
          .where(eq(samplePacks.id, input.packId));

        return {
          sampleId: sample.insertId,
          fileUrl,
        };
      } catch (error) {
        console.error("Sample upload failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload sample",
        });
      }
    }),

  /**
   * Create a folder within a sample pack
   */
  createFolder: protectedProcedure
    .input(
      z.object({
        packId: z.number(),
        name: z.string(),
        parentFolderId: z.number().optional(),
        path: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const [folder] = await db.insert(samplePackFolders).values({
        packId: input.packId,
        name: input.name,
        parentFolderId: input.parentFolderId,
        path: input.path,
        sampleCount: 0,
      });

      return { folderId: folder.insertId };
    }),

  /**
   * Get all sample packs for current user
   */
  getMyPacks: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

    const packs = await db
      .select()
      .from(samplePacks)
      .orderBy(desc(samplePacks.createdAt));

    return packs;
  }),

  /**
   * Get pack details with folder structure
   */
  getPackDetails: protectedProcedure
    .input(z.object({ packId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      // Get pack
      const [pack] = await db
        .select()
        .from(samplePacks)
        .where(eq(samplePacks.id, input.packId));

      if (!pack) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pack not found",
        });
      }

      // Get folders
      const folders = await db
        .select()
        .from(samplePackFolders)
        .where(eq(samplePackFolders.packId, input.packId));

      // Get samples
      const packSamples = await db
        .select()
        .from(samples)
        .where(eq(samples.packId, input.packId));

      return {
        pack,
        folders,
        samples: packSamples,
      };
    }),

  /**
   * Get samples in a specific folder
   */
  getFolderSamples: protectedProcedure
    .input(z.object({ folderId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const folderSamples = await db
        .select()
        .from(samples)
        .where(eq(samples.packId, input.folderId));

      return folderSamples;
    }),

  /**
   * Delete a sample pack
   */
  deletePack: protectedProcedure
    .input(z.object({ packId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      // Delete all samples in pack
      await db.delete(samples).where(eq(samples.packId, input.packId));

      // Delete all folders in pack
      await db
        .delete(samplePackFolders)
        .where(eq(samplePackFolders.packId, input.packId));

      // Delete pack
      await db.delete(samplePacks).where(eq(samplePacks.id, input.packId));

      return { success: true };
    }),
});
