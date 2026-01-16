import { mysqlTable, int, varchar, mysqlEnum, timestamp, json } from "drizzle-orm/mysql-core";

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
