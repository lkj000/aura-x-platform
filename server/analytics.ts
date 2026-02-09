import * as db from './db';
import { sql } from 'drizzle-orm';

interface GenerationAnalytics {
  totalGenerations: number;
  completedGenerations: number;
  failedGenerations: number;
  successRate: number;
  averageCompletionTime: number;
  totalDuration: number;
  generationsByStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

export async function getGenerationAnalytics(userId: number): Promise<GenerationAnalytics> {
  const database = await db.getDb();
  if (!database) {
    throw new Error('Database not available');
  }

  // Get all generations for user
  const generations = await db.getUserGenerations(userId, 1000, 0);

  // Calculate metrics
  const totalGenerations = generations.length;
  const completedGenerations = generations.filter(g => g.status === 'completed').length;
  const failedGenerations = generations.filter(g => g.status === 'failed').length;
  const successRate = totalGenerations > 0 ? (completedGenerations / totalGenerations) * 100 : 0;

  // Calculate average completion time (for completed generations)
  const completedWithTimes = generations.filter(g => 
    g.status === 'completed' && g.createdAt && g.completedAt
  );
  
  const totalCompletionTime = completedWithTimes.reduce((sum, g) => {
    const start = new Date(g.createdAt).getTime();
    const end = new Date(g.completedAt!).getTime();
    return sum + (end - start);
  }, 0);

  const averageCompletionTime = completedWithTimes.length > 0 
    ? totalCompletionTime / completedWithTimes.length / 1000 // Convert to seconds
    : 0;

  // Calculate total audio duration
  const totalDuration = generations.reduce((sum, g) => {
    return sum + (g.duration || 0);
  }, 0);

  // Count by status
  const generationsByStatus = {
    pending: generations.filter(g => g.status === 'pending').length,
    processing: generations.filter(g => g.status === 'processing').length,
    completed: completedGenerations,
    failed: failedGenerations,
  };

  return {
    totalGenerations,
    completedGenerations,
    failedGenerations,
    successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal
    averageCompletionTime: Math.round(averageCompletionTime),
    totalDuration,
    generationsByStatus,
  };
}

export async function trackGenerationEvent(
  userId: number,
  generationId: number,
  event: 'started' | 'completed' | 'failed',
  metadata?: Record<string, any>
) {
  console.log(`[Analytics] Generation ${generationId} ${event} for user ${userId}`, metadata);
  
  // In a production system, this would send to an analytics service
  // For now, we just log it
  
  // Could integrate with services like:
  // - Google Analytics
  // - Mixpanel
  // - Amplitude
  // - Custom analytics backend
}

export async function getGenerationTrends(
  userId: number,
  days: number = 30
): Promise<Array<{ date: string; count: number; successRate: number }>> {
  const database = await db.getDb();
  if (!database) {
    throw new Error('Database not available');
  }

  // Get generations from last N days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const generations = await db.getUserGenerations(userId, 1000, 0);
  const recentGenerations = generations.filter(g => 
    new Date(g.createdAt) >= cutoffDate
  );

  // Group by date
  const byDate = new Map<string, { total: number; completed: number }>();
  
  recentGenerations.forEach(g => {
    const date = new Date(g.createdAt).toISOString().split('T')[0];
    const existing = byDate.get(date) || { total: 0, completed: 0 };
    existing.total++;
    if (g.status === 'completed') {
      existing.completed++;
    }
    byDate.set(date, existing);
  });

  // Convert to array and calculate success rate
  return Array.from(byDate.entries())
    .map(([date, stats]) => ({
      date,
      count: stats.total,
      successRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
