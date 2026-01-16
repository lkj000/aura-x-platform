/**
 * Generation Queue Database Functions
 * Level 5 Autonomous Agent Architecture
 * 
 * Manages priority queue for AI generation requests with rate limiting
 */

import { getDb } from './db';
import { generationQueue, userQueueStats, users } from '../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getMaxConcurrentJobs, getPriority, getMaxRetries } from '../shared/tierConfig';
import type { UserTier } from '../shared/tierConfig';

/**
 * Add generation to queue
 */
export async function enqueueGeneration(params: {
  userId: number;
  generationId: number;
  workflowId?: string;
  userTier?: UserTier;
}): Promise<typeof generationQueue.$inferSelect> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Get user tier if not provided
  let userTier = params.userTier;
  if (!userTier) {
    const [user] = await db.select().from(users).where(eq(users.id, params.userId));
    userTier = (user?.tier as UserTier) || 'free';
  }
  
  // Get tier-based configuration
  const priority = getPriority(userTier);
  const maxRetries = getMaxRetries(userTier);
  
  await db.insert(generationQueue).values({
    userId: params.userId,
    generationId: params.generationId,
    workflowId: params.workflowId,
    priority,
    maxRetries,
    retryCount: 0,
    status: 'queued',
  });
  
  // Get the inserted item
  const [queueItem] = await db.select().from(generationQueue)
    .where(and(
      eq(generationQueue.userId, params.userId),
      eq(generationQueue.generationId, params.generationId)
    ))
    .orderBy(sql`${generationQueue.createdAt} DESC`)
    .limit(1);
  
  // Update user stats
  await incrementUserQueueStats(params.userId, 'totalJobsQueued');
  
  // Calculate queue position
  await updateQueuePositions();
  
  return queueItem;
}

/**
 * Get user's queue stats
 */
export async function getUserQueueStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [stats] = await db.select().from(userQueueStats).where(eq(userQueueStats.userId, userId));
  
  if (!stats) {
    // Get user tier to set appropriate limits
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const userTier = (user?.tier as UserTier) || 'free';
    const maxConcurrentJobs = getMaxConcurrentJobs(userTier);
    
    // Create default stats with tier-based limits
    await db.insert(userQueueStats).values({
      userId,
      concurrentJobs: 0,
      maxConcurrentJobs,
      totalJobsQueued: 0,
      totalJobsCompleted: 0,
      totalJobsFailed: 0,
    });
    
    const [newStats] = await db.select().from(userQueueStats).where(eq(userQueueStats.userId, userId));
    return newStats!;
  }
  
  return stats;
}

/**
 * Check if user can queue more jobs (rate limiting)
 */
export async function canUserQueueJob(userId: number): Promise<boolean> {
  const stats = await getUserQueueStats(userId);
  return stats.concurrentJobs < stats.maxConcurrentJobs;
}

/**
 * Get user's current concurrent jobs count
 */
export async function getUserConcurrentJobs(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [result] = await db.select({ count: sql<number>`count(*)` })
    .from(generationQueue)
    .where(and(
      eq(generationQueue.userId, userId),
      eq(generationQueue.status, 'processing')
    ));
  
  return result?.count || 0;
}

/**
 * Start processing a queued generation
 */
export async function startQueuedGeneration(queueId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.update(generationQueue)
    .set({
      status: 'processing',
      startedAt: new Date(),
    })
    .where(eq(generationQueue.id, queueId));
  
  // Update user concurrent jobs
  const [item] = await db.select().from(generationQueue).where(eq(generationQueue.id, queueId));
  if (item) {
    await db.update(userQueueStats)
      .set({
        concurrentJobs: sql`${userQueueStats.concurrentJobs} + 1`,
        lastJobAt: new Date(),
      })
      .where(eq(userQueueStats.userId, item.userId));
  }
}

/**
 * Complete a queued generation
 */
export async function completeQueuedGeneration(queueId: number, success: boolean): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [item] = await db.select().from(generationQueue).where(eq(generationQueue.id, queueId));
  
  if (!item) return;
  
  await db.update(generationQueue)
    .set({
      status: success ? 'completed' : 'failed',
      completedAt: new Date(),
    })
    .where(eq(generationQueue.id, queueId));
  
  // Update user stats
  await db.update(userQueueStats)
    .set({
      concurrentJobs: sql`GREATEST(0, ${userQueueStats.concurrentJobs} - 1)`,
      totalJobsCompleted: success ? sql`${userQueueStats.totalJobsCompleted} + 1` : sql`${userQueueStats.totalJobsCompleted}`,
      totalJobsFailed: !success ? sql`${userQueueStats.totalJobsFailed} + 1` : sql`${userQueueStats.totalJobsFailed}`,
    })
    .where(eq(userQueueStats.userId, item.userId));
  
  // Update queue positions
  await updateQueuePositions();
}

/**
 * Get next queued generation to process
 */
export async function getNextQueuedGeneration() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [next] = await db.select()
    .from(generationQueue)
    .where(eq(generationQueue.status, 'queued'))
    .orderBy(sql`${generationQueue.priority} DESC, ${generationQueue.createdAt} ASC`)
    .limit(1);
  
  return next;
}

/**
 * Get user's queue position
 */
export async function getUserQueuePosition(userId: number, generationId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [item] = await db.select()
    .from(generationQueue)
    .where(and(
      eq(generationQueue.userId, userId),
      eq(generationQueue.generationId, generationId),
      eq(generationQueue.status, 'queued')
    ));
  
  return item?.queuePosition || null;
}

/**
 * Update queue positions for all queued items
 */
async function updateQueuePositions(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const queuedItems = await db.select()
    .from(generationQueue)
    .where(eq(generationQueue.status, 'queued'))
    .orderBy(sql`${generationQueue.priority} DESC, ${generationQueue.createdAt} ASC`);
  
  for (let i = 0; i < queuedItems.length; i++) {
    await db.update(generationQueue)
      .set({ queuePosition: i + 1 })
      .where(eq(generationQueue.id, queuedItems[i].id));
  }
}

/**
 * Increment user queue stats counter
 */
async function incrementUserQueueStats(userId: number, field: 'totalJobsQueued' | 'totalJobsCompleted' | 'totalJobsFailed'): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const stats = await getUserQueueStats(userId);
  
  await db.update(userQueueStats)
    .set({
      [field]: sql`${userQueueStats[field]} + 1`,
    })
    .where(eq(userQueueStats.userId, userId));
}

/**
 * Cancel queued generation
 */
export async function cancelQueuedGeneration(queueId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.update(generationQueue)
    .set({
      status: 'cancelled',
      completedAt: new Date(),
    })
    .where(eq(generationQueue.id, queueId));
  
  await updateQueuePositions();
}

/**
 * Get queue analytics
 */
export async function getQueueAnalytics() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [queuedCount] = await db.select({ count: sql<number>`count(*)` })
    .from(generationQueue)
    .where(eq(generationQueue.status, 'queued'));
  
  const [processingCount] = await db.select({ count: sql<number>`count(*)` })
    .from(generationQueue)
    .where(eq(generationQueue.status, 'processing'));
  
  const [avgWaitTime] = await db.select({ 
    avg: sql<number>`AVG(TIMESTAMPDIFF(SECOND, ${generationQueue.createdAt}, ${generationQueue.startedAt}))` 
  })
    .from(generationQueue)
    .where(eq(generationQueue.status, 'completed'));
  
  return {
    queuedCount: queuedCount?.count || 0,
    processingCount: processingCount?.count || 0,
    avgWaitTime: avgWaitTime?.avg || 0,
  };
}

/**
 * Get user's queue items
 */
export async function getUserQueueItems(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  return db.select()
    .from(generationQueue)
    .where(eq(generationQueue.userId, userId))
    .orderBy(sql`${generationQueue.createdAt} DESC`)
    .limit(50);
}
