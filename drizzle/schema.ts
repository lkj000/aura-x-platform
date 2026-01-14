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
  volume: decimal("volume", { precision: 5, scale: 2 }).default("1.00").notNull(), // 0.00 to 2.00
  pan: decimal("pan", { precision: 3, scale: 2 }).default("0.00").notNull(), // -1.00 to 1.00
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