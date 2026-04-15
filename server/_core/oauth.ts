/**
 * oauth.ts — Legacy Manus OAuth route (no longer registered).
 *
 * Authentication is now handled by server/_core/auth.ts (email/password).
 * This file is retained to avoid breaking any stale imports but exports
 * a no-op stub so the project continues to type-check.
 */
import type { Express } from "express";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function registerOAuthRoutes(_app: Express): void {
  // No-op: Manus OAuth has been replaced by local email/password auth.
}
