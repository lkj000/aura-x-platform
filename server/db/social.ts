/**
 * db/social.ts — Producer Profiles, Follows, Activity Feed repositories
 */
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "./core";
import {
  producerProfiles, followers, activityFeed,
  type InsertProducerProfile,
  type InsertActivityFeedItem,
} from "../../drizzle/schema";

// ── Producer Profiles ─────────────────────────────────────────────────────────

export async function getOrCreateProducerProfile(userId: number): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db.select().from(producerProfiles).where(eq(producerProfiles.userId, userId));
  if (existing) return existing;

  const [profile] = await db.insert(producerProfiles).values({ userId }).$returningId();
  return db.select().from(producerProfiles).where(eq(producerProfiles.id, profile.id)).then(rows => rows[0]);
}

export async function updateProducerProfile(userId: number, data: Partial<InsertProducerProfile>): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(producerProfiles).set(data).where(eq(producerProfiles.userId, userId));
  return db.select().from(producerProfiles).where(eq(producerProfiles.userId, userId)).then(rows => rows[0]);
}

// ── Follows ───────────────────────────────────────────────────────────────────

export async function followUser(followerId: number, followingId: number): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db.select().from(followers)
    .where(and(eq(followers.followerId, followerId), eq(followers.followingId, followingId)));
  if (existing) return existing;

  const [follow] = await db.insert(followers).values({ followerId, followingId }).$returningId();

  await db.insert(activityFeed).values({
    userId: followerId,
    actionType: "followed_user",
    targetId: followingId,
    targetType: "user",
  });

  return db.select().from(followers).where(eq(followers.id, follow.id)).then(rows => rows[0]);
}

export async function unfollowUser(followerId: number, followingId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(followers).where(and(eq(followers.followerId, followerId), eq(followers.followingId, followingId)));
  return true;
}

export async function getFollowerCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(followers).where(eq(followers.followingId, userId));
  return result[0]?.count || 0;
}

export async function getFollowingCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(followers).where(eq(followers.followerId, userId));
  return result[0]?.count || 0;
}

export async function isFollowing(followerId: number, followingId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [result] = await db.select().from(followers)
    .where(and(eq(followers.followerId, followerId), eq(followers.followingId, followingId)));
  return !!result;
}

// ── Activity Feed ─────────────────────────────────────────────────────────────

export async function getActivityFeed(userId: number, limit = 50): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const following = await db.select({ followingId: followers.followingId })
    .from(followers).where(eq(followers.followerId, userId));
  const followingIds = following.map(f => f.followingId);
  if (followingIds.length === 0) return [];

  return db.select().from(activityFeed)
    .where(sql`${activityFeed.userId} IN (${sql.join(followingIds.map(id => sql`${id}`), sql`, `)})`)
    .orderBy(desc(activityFeed.createdAt))
    .limit(limit);
}

export async function addActivity(data: InsertActivityFeedItem): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [activity] = await db.insert(activityFeed).values(data).$returningId();
  return db.select().from(activityFeed).where(eq(activityFeed.id, activity.id)).then(rows => rows[0]);
}
