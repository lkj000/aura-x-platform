/**
 * server/db.ts — Re-export barrel for all database repositories.
 *
 * Domain modules:
 *   core        — getDb, upsertUser, getUserByOpenId, getUserByEmail
 *   projects    — projects, tracks, audioClips, midiNotes, automationLanes/Points
 *   generations — generations, generationHistory
 *   media       — samples, mediaLibrary
 *   presets     — presetFavorites, customPresets
 *   collaboration — projectCollaborators, projectActivityLog, projectInvitations
 *   marketplace — samplePacks, purchases, reviews, downloads, bundles
 *   social      — producerProfiles, followers, activityFeed
 */

export * from "./db/core";
export * from "./db/projects";
export * from "./db/generations";
export * from "./db/media";
export * from "./db/presets";
export * from "./db/collaboration";
export * from "./db/marketplace";
export * from "./db/social";
export * from "./db/training";
export * from "./db/midi";
