import { getDb } from './db';
import { generations } from '../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

interface QueuePosition {
  position: number;
  totalInQueue: number;
  estimatedWaitTime: number; // in seconds
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

/**
 * Get queue position for a specific generation
 */
export async function getQueuePosition(generationId: number): Promise<QueuePosition> {
  const database = await getDb();
  if (!database) {
    throw new Error('Database not available');
  }

  // Get the target generation
  const [targetGeneration] = await database
    .select()
    .from(generations)
    .where(eq(generations.id, generationId));

  if (!targetGeneration) {
    throw new Error('Generation not found');
  }

  // If already completed or failed, return final status
  if (targetGeneration.status === 'completed' || targetGeneration.status === 'failed') {
    return {
      position: 0,
      totalInQueue: 0,
      estimatedWaitTime: 0,
      status: targetGeneration.status,
    };
  }

  // If processing, return processing status
  if (targetGeneration.status === 'processing') {
    // Estimate remaining time based on average completion time (60 seconds)
    const elapsedTime = Date.now() - new Date(targetGeneration.createdAt).getTime();
    const estimatedTotalTime = 60000; // 60 seconds in milliseconds
    const remainingTime = Math.max(0, (estimatedTotalTime - elapsedTime) / 1000);

    return {
      position: 1,
      totalInQueue: 1,
      estimatedWaitTime: Math.round(remainingTime),
      status: 'processing',
    };
  }

  // Count pending generations created before this one
  const [queueCount] = await database
    .select({ count: sql<number>`count(*)` })
    .from(generations)
    .where(
      and(
        eq(generations.status, 'pending'),
        sql`${generations.createdAt} < ${targetGeneration.createdAt}`
      )
    );

  const position = (queueCount?.count || 0) + 1;

  // Count total pending generations
  const [totalCount] = await database
    .select({ count: sql<number>`count(*)` })
    .from(generations)
    .where(eq(generations.status, 'pending'));

  const totalInQueue = totalCount?.count || 0;

  // Estimate wait time
  // Assumptions:
  // - Average generation time: 60 seconds
  // - Modal free tier: 1 concurrent job
  const avgGenerationTime = 60; // seconds
  const estimatedWaitTime = (position - 1) * avgGenerationTime;

  return {
    position,
    totalInQueue,
    estimatedWaitTime,
    status: 'queued',
  };
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  totalPending: number;
  totalProcessing: number;
  avgWaitTime: number;
}> {
  const database = await getDb();
  if (!database) {
    throw new Error('Database not available');
  }

  // Count pending
  const [pendingCount] = await database
    .select({ count: sql<number>`count(*)` })
    .from(generations)
    .where(eq(generations.status, 'pending'));

  // Count processing
  const [processingCount] = await database
    .select({ count: sql<number>`count(*)` })
    .from(generations)
    .where(eq(generations.status, 'processing'));

  // Calculate average wait time (pending * avg generation time)
  const avgWaitTime = (pendingCount?.count || 0) * 60; // 60 seconds per generation

  return {
    totalPending: pendingCount?.count || 0,
    totalProcessing: processingCount?.count || 0,
    avgWaitTime,
  };
}
