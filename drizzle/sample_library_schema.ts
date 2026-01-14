import { int, mysqlTable, text, timestamp, varchar, decimal, mysqlEnum } from "drizzle-orm/mysql-core";

/**
 * Sample Library Schema for AURA-X
 * Manages Amapiano instrument samples, packs, and categories
 */

export const samplePacks = mysqlTable("sample_packs", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  version: varchar("version", { length: 50 }).default("1.0.0"),
  author: varchar("author", { length: 255 }),
  genre: varchar("genre", { length: 100 }).default("amapiano"),
  subgenre: varchar("subgenre", { length: 100 }), // private-school, commercial, sgija, etc.
  coverImageUrl: text("cover_image_url"),
  totalSamples: int("total_samples").default(0),
  totalSizeMb: decimal("total_size_mb", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const samples = mysqlTable("samples", {
  id: int("id").autoincrement().primaryKey(),
  packId: int("pack_id").references(() => samplePacks.id),
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
  instrument: varchar("instrument", { length: 100 }), // specific instrument name
  key: varchar("key", { length: 10 }), // musical key (C, F#, etc.)
  bpm: int("bpm"), // original BPM for loops
  duration: decimal("duration", { precision: 10, scale: 3 }), // duration in seconds
  fileUrl: text("file_url").notNull(),
  waveformUrl: text("waveform_url"), // URL to waveform image
  fileSize: int("file_size"), // size in bytes
  format: varchar("format", { length: 20 }).default("wav"), // wav, mp3, etc.
  sampleRate: int("sample_rate").default(44100),
  bitDepth: int("bit_depth").default(24),
  tags: text("tags"), // JSON array of tags
  metadata: text("metadata"), // JSON object for additional metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userSampleFavorites = mysqlTable("user_sample_favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  sampleId: int("sample_id").references(() => samples.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sampleUsageHistory = mysqlTable("sample_usage_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  sampleId: int("sample_id").references(() => samples.id).notNull(),
  projectId: int("project_id"),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

export type SamplePack = typeof samplePacks.$inferSelect;
export type InsertSamplePack = typeof samplePacks.$inferInsert;
export type Sample = typeof samples.$inferSelect;
export type InsertSample = typeof samples.$inferInsert;
