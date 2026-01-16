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
  type: varchar("type", { length: 50 }).notNull(), // "music", "stem_separation", "mastering", "lyrics"
  prompt: text("prompt").notNull(), // User's generation prompt
  parameters: json("parameters"), // JSON object with generation parameters
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  resultUrl: text("resultUrl"), // S3 URL to generated audio
  culturalScore: decimal("culturalScore", { precision: 5, scale: 2 }), // 0.00 to 100.00
  processingTime: int("processingTime"), // Time in milliseconds
  errorMessage: text("errorMessage"),
  workflowId: varchar("workflowId", { length: 255 }), // Temporal workflow ID
  // Suno-style fields
  lyrics: text("lyrics"), // Generated or user-provided lyrics
  style: varchar("style", { length: 100 }), // Genre/style tags
  title: varchar("title", { length: 255 }), // Track title
  stemsUrl: json("stemsUrl"), // URLs to separated stems {drums, bass, vocals, other}
  parentId: int("parentId"), // For variations/versions
  variationType: varchar("variationType", { length: 50 }), // "remix", "variation", "extend"
  duration: int("duration"), // Duration in seconds
  bpm: int("bpm"),
  key: varchar("key", { length: 10 }),
  mood: varchar("mood", { length: 100 }),
  vocalStyle: varchar("vocalStyle", { length: 100 }), // "male", "female", "none"
  isFavorite: boolean("isFavorite").default(false).notNull(),
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
  format: varchar("format", { length: 20 }).default("mp3").notNull(), // "mp3", "wav", etc.
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

/**
 * Audio Clips table - Clips placed on timeline tracks
 */
export const audioClips = mysqlTable("audio_clips", {
  id: int("id").autoincrement().primaryKey(),
  trackId: int("trackId").notNull(), // Foreign key to tracks
  name: varchar("name", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(), // S3 URL to audio file
  startTime: decimal("startTime", { precision: 10, scale: 3 }).$type<number>().notNull(), // Position in timeline (seconds)
  duration: decimal("duration", { precision: 10, scale: 3 }).$type<number>().notNull(), // Clip duration (seconds)
  offset: decimal("offset", { precision: 10, scale: 3 }).$type<number>().notNull(), // Offset into audio file (seconds)
  fadeIn: decimal("fadeIn", { precision: 5, scale: 3 }).$type<number>().notNull(), // Fade in duration (seconds)
  fadeOut: decimal("fadeOut", { precision: 5, scale: 3 }).$type<number>().notNull(), // Fade out duration (seconds)
  gain: decimal("gain", { precision: 5, scale: 2 }).$type<number>().notNull(), // Clip gain multiplier
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AudioClip = typeof audioClips.$inferSelect;
export type InsertAudioClip = typeof audioClips.$inferInsert;

/**
 * MIDI Notes table - MIDI notes for piano roll
 */
export const midiNotes = mysqlTable("midi_notes", {
  id: int("id").autoincrement().primaryKey(),
  trackId: int("trackId").notNull(), // Foreign key to tracks
  pitch: varchar("pitch", { length: 10 }).notNull(), // e.g., "C4", "F#5"
  time: decimal("time", { precision: 10, scale: 3 }).$type<number>().notNull(), // Start time in seconds
  duration: decimal("duration", { precision: 10, scale: 3 }).$type<number>().notNull(), // Note duration in seconds
  velocity: decimal("velocity", { precision: 3, scale: 2 }).$type<number>().notNull(), // 0.00 to 1.00
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MidiNote = typeof midiNotes.$inferSelect;
export type InsertMidiNote = typeof midiNotes.$inferInsert;

/**
 * Preset Favorites table - User's favorited presets
 */
export const presetFavorites = mysqlTable("preset_favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Foreign key to users
  presetId: varchar("presetId", { length: 255 }).notNull(), // ID of the built-in preset
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PresetFavorite = typeof presetFavorites.$inferSelect;
export type InsertPresetFavorite = typeof presetFavorites.$inferInsert;

/**
 * Custom Presets table - User-created presets based on successful generations
 */
export const customPresets = mysqlTable("custom_presets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Foreign key to users
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(), // "production", "creative", "experimental"
  style: varchar("style", { length: 50 }).notNull(), // "kasi", "private-school", "bacardi", etc.
  icon: varchar("icon", { length: 50 }).notNull(), // Emoji or icon name
  prompt: text("prompt").notNull(),
  parameters: json("parameters").notNull(), // { tempo, temperature, topK, topP, cfgScale, key, duration }
  culturalElements: json("culturalElements").notNull(), // Array of cultural elements
  tags: json("tags").notNull(), // Array of tags
  basedOnGenerationId: int("basedOnGenerationId"), // Optional: link to generation that inspired this preset
  usageCount: int("usageCount").default(0).notNull(), // Track how often this preset is used
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomPreset = typeof customPresets.$inferSelect;
export type InsertCustomPreset = typeof customPresets.$inferInsert;

/**
 * Project Collaborators table - Users who have access to a project
 */
export const projectCollaborators = mysqlTable("project_collaborators", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(), // Foreign key to projects
  userId: int("userId").notNull(), // Foreign key to users
  role: mysqlEnum("role", ["owner", "admin", "editor", "viewer"]).default("viewer").notNull(),
  invitedBy: int("invitedBy").notNull(), // User ID who sent the invitation
  invitedAt: timestamp("invitedAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
  status: mysqlEnum("status", ["pending", "accepted", "declined", "revoked"]).default("pending").notNull(),
});

export type ProjectCollaborator = typeof projectCollaborators.$inferSelect;
export type InsertProjectCollaborator = typeof projectCollaborators.$inferInsert;

/**
 * Project Activity Log table - Track changes made to projects for collaboration
 */
export const projectActivityLog = mysqlTable("project_activity_log", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(), // Foreign key to projects
  userId: int("userId").notNull(), // User who performed the action
  action: varchar("action", { length: 50 }).notNull(), // "created", "updated", "deleted", "shared", "exported"
  entityType: varchar("entityType", { length: 50 }).notNull(), // "project", "track", "clip", "effect"
  entityId: int("entityId"), // ID of the affected entity
  details: json("details"), // Additional context about the action
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type ProjectActivityLog = typeof projectActivityLog.$inferSelect;
export type InsertProjectActivityLog = typeof projectActivityLog.$inferInsert;

/**
 * Project Invitations table - Pending invitations to collaborate
 */
export const projectInvitations = mysqlTable("project_invitations", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(), // Foreign key to projects
  inviterUserId: int("inviterUserId").notNull(), // User who sent the invitation
  inviteeEmail: varchar("inviteeEmail", { length: 320 }).notNull(), // Email of invitee
  inviteeUserId: int("inviteeUserId"), // User ID if they're already registered
  role: mysqlEnum("role", ["admin", "editor", "viewer"]).default("viewer").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(), // Unique invitation token
  status: mysqlEnum("status", ["pending", "accepted", "declined", "expired"]).default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
});

export type ProjectInvitation = typeof projectInvitations.$inferSelect;
export type InsertProjectInvitation = typeof projectInvitations.$inferInsert;

// Automation Lanes
export const automationLanes = mysqlTable('automation_lanes', {
  id: int('id').primaryKey().autoincrement(),
  projectId: int('projectId').notNull(),
  trackId: int('trackId'), // null for master automation
  parameter: varchar('parameter', { length: 255 }).notNull(),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
});

export const automationPoints = mysqlTable('automation_points', {
  id: int('id').primaryKey().autoincrement(),
  laneId: int('laneId').notNull(),
  time: decimal('time', { precision: 10, scale: 3 }).$type<number>().notNull(),
  value: decimal('value', { precision: 5, scale: 4 }).$type<number>().notNull(),
  curveType: varchar('curveType', { length: 50 }).default('linear'),
  handleInX: decimal('handleInX', { precision: 10, scale: 3 }).$type<number>(),
  handleInY: decimal('handleInY', { precision: 5, scale: 4 }).$type<number>(),
  handleOutX: decimal('handleOutX', { precision: 10, scale: 3 }).$type<number>(),
  handleOutY: decimal('handleOutY', { precision: 5, scale: 4 }).$type<number>(),
  createdAt: timestamp('createdAt').defaultNow(),
});

export type AutomationLane = typeof automationLanes.$inferSelect;
export type InsertAutomationLane = typeof automationLanes.$inferInsert;
export type AutomationPoint = typeof automationPoints.$inferSelect;
export type InsertAutomationPoint = typeof automationPoints.$inferInsert;

// Sample Pack Marketplace
export const marketplaceSamplePacks = mysqlTable('marketplace_sample_packs', {
  id: int('id').primaryKey().autoincrement(),
  sellerId: int('sellerId').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).$type<number>().notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  tags: json('tags'),
  coverImage: varchar('coverImage', { length: 500 }),
  previewAudio: varchar('previewAudio', { length: 500 }),
  fileUrl: varchar('fileUrl', { length: 500 }).notNull(),
  fileSize: int('fileSize'),
  sampleCount: int('sampleCount'),
  downloads: int('downloads').default(0),
  rating: decimal('rating', { precision: 3, scale: 2 }).$type<number>().default(0),
  reviewCount: int('reviewCount').default(0),
  status: mysqlEnum('status', ['active', 'pending', 'rejected']).default('active'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
});

export const marketplacePurchases = mysqlTable('marketplace_purchases', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('userId').notNull(),
  packId: int('packId').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).$type<number>().notNull(),
  status: mysqlEnum('status', ['completed', 'pending', 'refunded']).default('completed'),
  purchasedAt: timestamp('purchasedAt').defaultNow(),
});

export const marketplaceReviews = mysqlTable('marketplace_reviews', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('userId').notNull(),
  packId: int('packId').notNull(),
  rating: int('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
});

export const marketplaceDownloads = mysqlTable('marketplace_downloads', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('userId').notNull(),
  packId: int('packId').notNull(),
  purchaseId: int('purchaseId').notNull(),
  downloadedAt: timestamp('downloadedAt').defaultNow(),
  ipAddress: varchar('ipAddress', { length: 45 }),
  userAgent: text('userAgent'),
});

export const marketplaceBundles = mysqlTable('marketplace_bundles', {
  id: int('id').primaryKey().autoincrement(),
  sellerId: int('sellerId').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  originalPrice: decimal('originalPrice', { precision: 10, scale: 2 }).$type<number>().notNull(),
  bundlePrice: decimal('bundlePrice', { precision: 10, scale: 2 }).$type<number>().notNull(),
  discountPercent: int('discountPercent').notNull(),
  coverImage: varchar('coverImage', { length: 500 }),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
});

export const marketplaceBundlePacks = mysqlTable('marketplace_bundle_packs', {
  id: int('id').primaryKey().autoincrement(),
  bundleId: int('bundleId').notNull(),
  packId: int('packId').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
});

export type MarketplaceSamplePack = typeof marketplaceSamplePacks.$inferSelect;
export type InsertMarketplaceSamplePack = typeof marketplaceSamplePacks.$inferInsert;
export type MarketplacePurchase = typeof marketplacePurchases.$inferSelect;
export type MarketplaceReview = typeof marketplaceReviews.$inferSelect;

// Social Features
export const producerProfiles = mysqlTable('producer_profiles', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('userId').notNull().unique(),
  displayName: varchar('displayName', { length: 100 }),
  bio: text('bio'),
  avatar: varchar('avatar', { length: 500 }),
  coverImage: varchar('coverImage', { length: 500 }),
  location: varchar('location', { length: 100 }),
  website: varchar('website', { length: 255 }),
  twitter: varchar('twitter', { length: 100 }),
  instagram: varchar('instagram', { length: 100 }),
  soundcloud: varchar('soundcloud', { length: 100 }),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
});

export const followers = mysqlTable('followers', {
  id: int('id').primaryKey().autoincrement(),
  followerId: int('followerId').notNull(), // User who is following
  followingId: int('followingId').notNull(), // User being followed
  createdAt: timestamp('createdAt').defaultNow(),
});

export const activityFeed = mysqlTable('activity_feed', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('userId').notNull(),
  actionType: mysqlEnum('actionType', ['pack_uploaded', 'pack_purchased', 'review_posted', 'followed_user']).notNull(),
  targetId: int('targetId'), // ID of the target (pack, user, etc.)
  targetType: varchar('targetType', { length: 50 }), // 'pack', 'user', etc.
  metadata: json('metadata'), // Additional data about the action
  createdAt: timestamp('createdAt').defaultNow(),
});

export type ProducerProfile = typeof producerProfiles.$inferSelect;
export type InsertProducerProfile = typeof producerProfiles.$inferInsert;
export type Follower = typeof followers.$inferSelect;
export type InsertFollower = typeof followers.$inferInsert;
export type ActivityFeedItem = typeof activityFeed.$inferSelect;
export type InsertActivityFeedItem = typeof activityFeed.$inferInsert;
export type MarketplaceDownload = typeof marketplaceDownloads.$inferSelect;
export type MarketplaceBundle = typeof marketplaceBundles.$inferSelect;
export type InsertMarketplaceBundle = typeof marketplaceBundles.$inferInsert;
export type MarketplaceBundlePack = typeof marketplaceBundlePacks.$inferSelect;

/**
 * Generation Queue table - Manages priority queue for AI generation requests
 * Level 5 Autonomous Agent Architecture
 */
export const generationQueue = mysqlTable("generation_queue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Foreign key to users
  generationId: int("generationId").notNull(), // Foreign key to generations
  workflowId: varchar("workflowId", { length: 255 }), // Temporal workflow ID
  priority: int("priority").default(0).notNull(), // Higher = more priority (0-100)
  status: mysqlEnum("status", ["queued", "processing", "completed", "failed", "cancelled"]).default("queued").notNull(),
  queuePosition: int("queuePosition"), // Position in queue (1 = next)
  retryCount: int("retryCount").default(0).notNull(),
  maxRetries: int("maxRetries").default(3).notNull(),
  estimatedWaitTime: int("estimatedWaitTime"), // Estimated wait time in seconds
  parameters: json("parameters"), // Queue-specific parameters
  errorMessage: varchar("errorMessage", { length: 1000 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
});

export type GenerationQueue = typeof generationQueue.$inferSelect;
export type InsertGenerationQueue = typeof generationQueue.$inferInsert;

/**
 * User Queue Stats table - Tracks concurrent jobs per user for rate limiting
 */
export const userQueueStats = mysqlTable("user_queue_stats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // Foreign key to users
  concurrentJobs: int("concurrentJobs").default(0).notNull(), // Current running jobs
  maxConcurrentJobs: int("maxConcurrentJobs").default(3).notNull(), // Max allowed (tier-based)
  totalJobsQueued: int("totalJobsQueued").default(0).notNull(),
  totalJobsCompleted: int("totalJobsCompleted").default(0).notNull(),
  totalJobsFailed: int("totalJobsFailed").default(0).notNull(),
  lastJobAt: timestamp("lastJobAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserQueueStats = typeof userQueueStats.$inferSelect;
export type InsertUserQueueStats = typeof userQueueStats.$inferInsert;
