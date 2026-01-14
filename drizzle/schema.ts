import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects table - Represents a music project/session
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Foreign key to users
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  tempo: int("tempo").default(112).notNull(),
  key: varchar("key", { length: 10 }).default("C").notNull(),
  mode: varchar("mode", { length: 50 }).default("kasi").notNull(), // Amapiano subgenre
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Tracks table - Individual audio tracks within a project
 */
export const tracks = mysqlTable("tracks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(), // Foreign key to projects
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // e.g., "log_drum", "shakers", "chords"
  audioUrl: text("audioUrl"), // S3 URL to audio file
  duration: int("duration"), // Duration in milliseconds
  volume: decimal("volume", { precision: 5, scale: 2 }).$type<number>().notNull(), // 0.00 to 2.00
  pan: decimal("pan", { precision: 3, scale: 2 }).$type<number>().notNull(), // -1.00 to 1.00
  muted: boolean("muted").default(false).notNull(),
  solo: boolean("solo").default(false).notNull(),
  orderIndex: int("orderIndex").default(0).notNull(), // Display order
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Track = typeof tracks.$inferSelect;
export type InsertTrack = typeof tracks.$inferInsert;

/**
 * Generations table - AI generation requests and results
 */
export const generations = mysqlTable("generations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Foreign key to users
  projectId: int("projectId"), // Optional: link to a project
  type: varchar("type", { length: 50 }).notNull(), // "music", "stem_separation", "mastering"
  prompt: text("prompt").notNull(), // User's generation prompt
  parameters: json("parameters"), // JSON object with generation parameters
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  resultUrl: text("resultUrl"), // S3 URL to generated audio
  culturalScore: decimal("culturalScore", { precision: 5, scale: 2 }), // 0.00 to 100.00
  processingTime: int("processingTime"), // Time in milliseconds
  errorMessage: text("errorMessage"),
  workflowId: varchar("workflowId", { length: 255 }), // Temporal workflow ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Generation = typeof generations.$inferSelect;
export type InsertGeneration = typeof generations.$inferInsert;

/**
 * Media Library table - User's uploaded/generated audio files
 */
export const mediaLibrary = mysqlTable("media_library", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Foreign key to users
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // "sample", "loop", "track", "generated"
  fileUrl: text("fileUrl").notNull(), // S3 URL
  fileSize: int("fileSize").notNull(), // Size in bytes
  duration: int("duration"), // Duration in milliseconds
  format: varchar("format", { length: 20 }).notNull(), // "mp3", "wav", etc.
  sampleRate: int("sampleRate"), // e.g., 44100
  generationId: int("generationId"), // Optional: link to generation
  metadata: json("metadata"), // Additional metadata
  tags: json("tags"), // Array of tags
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MediaLibraryItem = typeof mediaLibrary.$inferSelect;
export type InsertMediaLibraryItem = typeof mediaLibrary.$inferInsert;
/**
 * Sample Packs table - Collections of samples
 */
export const samplePacks = mysqlTable("sample_packs", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  version: varchar("version", { length: 50 }).default("1.0.0"),
  author: varchar("author", { length: 255 }),
  genre: varchar("genre", { length: 100 }).default("amapiano"),
  subgenre: varchar("subgenre", { length: 100 }),
  coverImageUrl: text("coverImageUrl"),
  totalSamples: int("totalSamples").default(0),
  totalSizeMb: varchar("totalSizeMb", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SamplePack = typeof samplePacks.$inferSelect;
export type InsertSamplePack = typeof samplePacks.$inferInsert;

/**
 * Samples table - Individual audio samples
 */
export const samples = mysqlTable("samples", {
  id: int("id").autoincrement().primaryKey(),
  packId: int("packId"), // Foreign key to sample_packs
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", [
    "log-drum",
    "shaker",
    "chord",
    "bass",
    "saxophone",
    "vocal",
    "percussion",
    "fx",
    "loop",
    "one-shot"
  ]).notNull(),
  instrument: varchar("instrument", { length: 100 }),
  key: varchar("key", { length: 10 }),
  bpm: int("bpm"),
  duration: varchar("duration", { length: 50 }),
  fileUrl: text("fileUrl").notNull(),
  waveformUrl: text("waveformUrl"),
  fileSize: int("fileSize"),
  format: varchar("format", { length: 20 }).default("wav"),
  sampleRate: int("sampleRate").default(44100),
  bitDepth: int("bitDepth").default(24),
  tags: json("tags"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Sample = typeof samples.$inferSelect;
export type InsertSample = typeof samples.$inferInsert;

/**
 * Generation History table - Tracks all AI generations with exact parameters for reproducibility
 */
export const generationHistory = mysqlTable("generation_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Foreign key to users
  projectId: int("projectId"), // Optional: link to a project
  generationId: int("generationId"), // Link to original generation
  prompt: text("prompt"),
  subgenre: varchar("subgenre", { length: 100 }),
  mood: varchar("mood", { length: 100 }),
  // Reproducibility parameters
  seed: int("seed").notNull(),
  temperature: decimal("temperature", { precision: 3, scale: 2 }).$type<number>().notNull(),
  topK: int("topK").notNull(),
  topP: decimal("topP", { precision: 3, scale: 2 }).$type<number>().notNull(),
  cfgScale: decimal("cfgScale", { precision: 4, scale: 2 }).$type<number>().notNull(),
  steps: int("steps").notNull(),
  // Results
  audioUrl: text("audioUrl"),
  duration: int("duration"), // Duration in seconds
  status: mysqlEnum("status", ["completed", "failed", "processing"]).default("processing").notNull(),
  isFavorite: boolean("isFavorite").default(false).notNull(),
  modelVersion: varchar("modelVersion", { length: 100 }),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GenerationHistory = typeof generationHistory.$inferSelect;
export type InsertGenerationHistory = typeof generationHistory.$inferInsert;
