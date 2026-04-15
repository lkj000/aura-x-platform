/**
 * db/collaboration.ts — Project Collaboration, Activity Log, Invitations repositories
 */
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./core";
import {
  projectCollaborators, projectActivityLog, projectInvitations,
  type ProjectCollaborator, type InsertProjectCollaborator,
  type ProjectActivityLog, type InsertProjectActivityLog,
  type ProjectInvitation, type InsertProjectInvitation,
} from "../../drizzle/schema";

// ── Project Collaborators ─────────────────────────────────────────────────────

export async function getProjectCollaborators(projectId: number): Promise<ProjectCollaborator[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectCollaborators)
    .where(and(eq(projectCollaborators.projectId, projectId), eq(projectCollaborators.status, "accepted")))
    .orderBy(desc(projectCollaborators.invitedAt));
}

export async function addProjectCollaborator(collab: InsertProjectCollaborator): Promise<ProjectCollaborator> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectCollaborators).values(collab);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(projectCollaborators).where(eq(projectCollaborators.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function updateCollaboratorRole(collabId: number, role: "owner" | "admin" | "editor" | "viewer"): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projectCollaborators).set({ role }).where(eq(projectCollaborators.id, collabId));
}

export async function removeProjectCollaborator(collabId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projectCollaborators).set({ status: "revoked" }).where(eq(projectCollaborators.id, collabId));
}

export async function getUserProjectRole(userId: number, projectId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(projectCollaborators)
    .where(and(eq(projectCollaborators.userId, userId), eq(projectCollaborators.projectId, projectId), eq(projectCollaborators.status, "accepted")))
    .limit(1);
  return result[0]?.role || null;
}

// ── Project Activity Log ──────────────────────────────────────────────────────

export async function logProjectActivity(activity: InsertProjectActivityLog): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(projectActivityLog).values(activity);
}

export async function getProjectActivity(projectId: number, limit = 50): Promise<ProjectActivityLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectActivityLog)
    .where(eq(projectActivityLog.projectId, projectId))
    .orderBy(desc(projectActivityLog.timestamp))
    .limit(limit);
}

// ── Project Invitations ───────────────────────────────────────────────────────

export async function createProjectInvitation(invitation: InsertProjectInvitation): Promise<ProjectInvitation> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectInvitations).values(invitation);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(projectInvitations).where(eq(projectInvitations.id, insertedId)).limit(1);
  return inserted[0]!;
}

export async function getProjectInvitationByToken(token: string): Promise<ProjectInvitation | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(projectInvitations).where(eq(projectInvitations.token, token)).limit(1);
  return result[0] || null;
}

export async function acceptProjectInvitation(invitationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projectInvitations).set({ status: "accepted", acceptedAt: new Date() }).where(eq(projectInvitations.id, invitationId));
}

export async function getPendingInvitations(userId: number): Promise<ProjectInvitation[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectInvitations)
    .where(and(eq(projectInvitations.inviteeUserId, userId), eq(projectInvitations.status, "pending")))
    .orderBy(desc(projectInvitations.createdAt));
}
