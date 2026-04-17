/**
 * db/core.ts — Database connection factory and user repository
 *
 * getDb() is the single source of truth for the Drizzle instance.
 * All domain repositories import from here.
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import path from "path";
import { fileURLToPath } from "url";
import * as schema from "../../drizzle/schema";
import { users, type InsertUser } from "../../drizzle/schema";
import { ENV } from "../_core/env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL, { schema, mode: "default" });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Run any pending Drizzle migrations at startup.
 * Safe to call multiple times — Drizzle tracks applied migrations in __drizzle_migrations.
 * Called once from server/_core/index.ts before the server starts accepting requests.
 */
export async function runMigrations(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Skipping migrations: no DATABASE_URL configured");
    return;
  }
  try {
    const migrationsFolder = path.resolve(__dirname, "../../drizzle");
    await migrate(db, { migrationsFolder });
    console.log("[Database] Migrations applied successfully");
  } catch (error) {
    console.error("[Database] Migration failed:", error);
    throw error; // Crash startup — a failed migration must not be silently ignored
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      (values as any)[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.email && user.email === ENV.ownerEmail) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}
