/**
 * db/marketplace.ts — Marketplace Packs, Purchases, Reviews, Downloads, Bundles repositories
 */
import { eq, and, like, or, desc, sql } from "drizzle-orm";
import { getDb } from "./core";
import {
  marketplaceSamplePacks, marketplacePurchases, marketplaceReviews,
  marketplaceDownloads, marketplaceBundles, marketplaceBundlePacks,
} from "../../drizzle/schema";

// ── Sample Packs ──────────────────────────────────────────────────────────────

export async function listMarketplacePacks(filters: {
  search?: string;
  category?: string;
  sellerId?: number;
  sortBy?: "popular" | "recent" | "price_low" | "price_high";
  limit?: number;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters.search) conditions.push(or(like(marketplaceSamplePacks.title, `%${filters.search}%`), like(marketplaceSamplePacks.description, `%${filters.search}%`)));
  if (filters.category) conditions.push(eq(marketplaceSamplePacks.category, filters.category));
  if (filters.sellerId !== undefined) conditions.push(eq(marketplaceSamplePacks.sellerId, filters.sellerId));

  let query = db.select().from(marketplaceSamplePacks);
  if (conditions.length > 0) query = query.where(and(...conditions)) as any;

  switch (filters.sortBy) {
    case "recent": query = query.orderBy(desc(marketplaceSamplePacks.createdAt)) as any; break;
    case "price_low": query = query.orderBy(marketplaceSamplePacks.price) as any; break;
    case "price_high": query = query.orderBy(desc(marketplaceSamplePacks.price)) as any; break;
    default: query = query.orderBy(desc(marketplaceSamplePacks.createdAt)) as any; break;
  }

  return query.limit(filters.limit || 50);
}

export async function getMarketplacePack(id: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(marketplaceSamplePacks).where(eq(marketplaceSamplePacks.id, id)).limit(1);
  return result[0] || null;
}

export async function createMarketplacePack(pack: any): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(marketplaceSamplePacks).values(pack);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(marketplaceSamplePacks).where(eq(marketplaceSamplePacks.id, insertedId)).limit(1);
  return inserted[0]!;
}

// ── Purchases ─────────────────────────────────────────────────────────────────

export async function createMarketplacePurchase(purchase: { userId: number; packId: number; paymentIntentId: string }): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const pack = await getMarketplacePack(purchase.packId);
  if (!pack) throw new Error("Pack not found");

  const result = await db.insert(marketplacePurchases).values({ ...purchase, amount: pack.price });
  const insertedId = Number(result[0].insertId);

  try {
    await db.update(marketplaceSamplePacks).set({ updatedAt: new Date() }).where(eq(marketplaceSamplePacks.id, purchase.packId));
  } catch (e) {
    console.warn("[Marketplace] Could not update pack after purchase:", e);
  }

  const inserted = await db.select().from(marketplacePurchases).where(eq(marketplacePurchases.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function getUserMarketplacePurchases(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const purchases = await db.select().from(marketplacePurchases).where(eq(marketplacePurchases.userId, userId)).orderBy(desc(marketplacePurchases.purchasedAt));

  return Promise.all(purchases.map(async (purchase) => {
    const pack = await getMarketplacePack(purchase.packId);
    const downloads = await getMarketplaceDownloadsByPurchase(purchase.id);
    return { ...purchase, pack, downloadCount: downloads.length, downloads };
  }));
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export async function createMarketplaceReview(review: { userId: number; packId: number; rating: number; comment?: string }): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(marketplaceReviews).values(review);
  const insertedId = Number(result[0].insertId);
  const reviews = await getMarketplaceReviews(review.packId);
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await db.update(marketplaceSamplePacks).set({ rating: avgRating }).where(eq(marketplaceSamplePacks.id, review.packId));
  const inserted = await db.select().from(marketplaceReviews).where(eq(marketplaceReviews.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function getMarketplaceReviews(packId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(marketplaceReviews).where(eq(marketplaceReviews.packId, packId)).orderBy(desc(marketplaceReviews.createdAt));
}

// ── Downloads ─────────────────────────────────────────────────────────────────

export async function createMarketplaceDownload(data: { userId: number; packId: number; purchaseId: number; ipAddress?: string; userAgent?: string }): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [download] = await db.insert(marketplaceDownloads).values(data).$returningId();
  return download;
}

export async function getMarketplaceDownloadsByPurchase(purchaseId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(marketplaceDownloads).where(eq(marketplaceDownloads.purchaseId, purchaseId));
}

export async function getSellerAnalytics(sellerId: number): Promise<any> {
  const db = await getDb();
  if (!db) return null;

  const packs = await db.select().from(marketplaceSamplePacks).where(eq(marketplaceSamplePacks.sellerId, sellerId));
  const packIds = packs.map(p => p.id);

  const [purchases, reviews, downloads] = await Promise.all([
    packIds.length > 0 ? db.select().from(marketplacePurchases).where(sql`${marketplacePurchases.packId} IN (${sql.join(packIds.map(id => sql`${id}`), sql`, `)})`) : Promise.resolve([]),
    packIds.length > 0 ? db.select().from(marketplaceReviews).where(sql`${marketplaceReviews.packId} IN (${sql.join(packIds.map(id => sql`${id}`), sql`, `)})`) : Promise.resolve([]),
    packIds.length > 0 ? db.select().from(marketplaceDownloads).where(sql`${marketplaceDownloads.packId} IN (${sql.join(packIds.map(id => sql`${id}`), sql`, `)})`) : Promise.resolve([]),
  ]);

  const totalRevenue = purchases.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  const packSales = new Map<number, number>();
  purchases.forEach(p => packSales.set(p.packId, (packSales.get(p.packId) || 0) + 1));
  const topPackId = packSales.size > 0 ? Array.from(packSales.entries()).sort((a, b) => b[1] - a[1])[0][0] : null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentPurchases = purchases.filter(p => new Date(p.purchasedAt!) >= thirtyDaysAgo);
  const salesByDay = new Map<string, { date: string; sales: number; revenue: number }>();
  recentPurchases.forEach(p => {
    const date = new Date(p.purchasedAt!).toISOString().split("T")[0];
    const e = salesByDay.get(date) || { date, sales: 0, revenue: 0 };
    e.sales++; e.revenue += Number(p.amount || 0);
    salesByDay.set(date, e);
  });

  return {
    totalRevenue,
    totalSales: purchases.length,
    activePacks: packs.length,
    totalDownloads: downloads.length,
    totalReviews: reviews.length,
    averageRating: avgRating,
    topPack: topPackId ? packs.find(p => p.id === topPackId) : null,
    salesByDay: Array.from(salesByDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
    packs,
  };
}

// ── Bundles ───────────────────────────────────────────────────────────────────

export async function createMarketplaceBundle(bundle: { sellerId: number; title: string; description?: string; originalPrice: number; bundlePrice: number; discountPercent: number; coverImage?: string; packIds: number[] }): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { packIds, ...bundleData } = bundle;
  const [insertedBundle] = await db.insert(marketplaceBundles).values(bundleData).$returningId();
  if (packIds.length > 0) await db.insert(marketplaceBundlePacks).values(packIds.map(packId => ({ bundleId: insertedBundle.id, packId })));
  return { id: insertedBundle.id, ...bundleData };
}

export async function getMarketplaceBundle(bundleId: number): Promise<any> {
  const db = await getDb();
  if (!db) return null;
  const [bundle] = await db.select().from(marketplaceBundles).where(eq(marketplaceBundles.id, bundleId)).limit(1);
  if (!bundle) return null;
  const bundlePacks = await db.select().from(marketplaceBundlePacks).where(eq(marketplaceBundlePacks.bundleId, bundleId));
  const packIds = bundlePacks.map(bp => bp.packId);
  const packs = packIds.length > 0 ? await db.select().from(marketplaceSamplePacks).where(sql`${marketplaceSamplePacks.id} IN (${sql.join(packIds.map(id => sql`${id}`), sql`, `)})`) : [];
  return { ...bundle, packs };
}

export async function listMarketplaceBundles(filters: { sellerId?: number; isActive?: boolean; limit?: number }): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(marketplaceBundles);
  if (filters.sellerId !== undefined) query = query.where(eq(marketplaceBundles.sellerId, filters.sellerId)) as any;
  if (filters.isActive !== undefined) query = query.where(eq(marketplaceBundles.isActive, filters.isActive)) as any;
  if (filters.limit) query = query.limit(filters.limit) as any;
  const bundles = await query;
  return Promise.all(bundles.map(async (b) => {
    const bp = await db.select().from(marketplaceBundlePacks).where(eq(marketplaceBundlePacks.bundleId, b.id));
    return { ...b, packCount: bp.length };
  }));
}

export async function updateMarketplaceBundle(bundleId: number, updates: { title?: string; description?: string; bundlePrice?: number; discountPercent?: number; isActive?: boolean }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(marketplaceBundles).set(updates).where(eq(marketplaceBundles.id, bundleId));
}
