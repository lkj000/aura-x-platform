/**
 * Sample Pack Database Schema
 * Supports bulk folder uploads with nested structure preservation
 */

import { mysqlTable, varchar, int, text, timestamp, decimal, boolean } from 'drizzle-orm/mysql-core';

/**
 * Sample Packs table
 * Represents a collection of samples (e.g., "AP_Private Skool Vol 1_Drum Pack")
 */
export const samplePacks = mysqlTable('sample_packs', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  version: varchar('version', { length: 50 }),
  category: varchar('category', { length: 100 }), // Drums, Bass, FX, Vocals, etc.
  uploadedBy: int('uploaded_by').notNull(), // user_id
  totalSamples: int('total_samples').default(0),
  totalSizeMB: decimal('total_size_mb', { precision: 10, scale: 2 }),
  coverImageUrl: text('cover_image_url'),
  isPublic: boolean('is_public').default(false),
  tags: text('tags'), // JSON array of tags
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

/**
 * Sample Pack Folders table
 * Represents folder structure within a pack (FX, Loops, One Shot, etc.)
 */
export const samplePackFolders = mysqlTable('sample_pack_folders', {
  id: int('id').primaryKey().autoincrement(),
  packId: int('pack_id').notNull(), // Foreign key to sample_packs
  name: varchar('name', { length: 255 }).notNull(), // FX, Loops, One Shot
  parentFolderId: int('parent_folder_id'), // For nested folders
  path: text('path'), // Full path from pack root
  sampleCount: int('sample_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Samples table (extended to support pack association)
 */
export const samples = mysqlTable('samples', {
  id: int('id').primaryKey().autoincrement(),
  packId: int('pack_id'), // Foreign key to sample_packs (null for standalone samples)
  folderId: int('folder_id'), // Foreign key to sample_pack_folders
  name: varchar('name', { length: 255 }).notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  fileUrl: text('file_url').notNull(),
  fileKey: varchar('file_key', { length: 500 }).notNull(), // S3 key
  
  // Audio metadata
  duration: decimal('duration', { precision: 10, scale: 3 }), // seconds
  bpm: int('bpm'),
  key: varchar('key', { length: 10 }), // C, D#, etc.
  sampleRate: int('sample_rate'), // 44100, 48000, etc.
  bitDepth: int('bit_depth'), // 16, 24, 32
  channels: int('channels'), // 1 (mono), 2 (stereo)
  fileSizeBytes: int('file_size_bytes'),
  
  // Categorization
  category: varchar('category', { length: 100 }), // Kick, Snare, Hi-Hat, Bass, etc.
  subcategory: varchar('subcategory', { length: 100 }), // One Shot, Loop, FX
  tags: text('tags'), // JSON array of tags
  
  // Waveform data
  waveformUrl: text('waveform_url'), // Pre-generated waveform image
  peaksData: text('peaks_data'), // JSON array of peak values for visualization
  
  // User metadata
  uploadedBy: int('uploaded_by').notNull(), // user_id
  isPublic: boolean('is_public').default(false),
  isFavorite: boolean('is_favorite').default(false),
  playCount: int('play_count').default(0),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

/**
 * Sample Pack Downloads table
 * Track who downloaded which packs
 */
export const samplePackDownloads = mysqlTable('sample_pack_downloads', {
  id: int('id').primaryKey().autoincrement(),
  packId: int('pack_id').notNull(),
  userId: int('user_id').notNull(),
  downloadedAt: timestamp('downloaded_at').defaultNow(),
});
