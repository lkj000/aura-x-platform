import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Preset Favorites', () => {
  let testUserId: number;

  beforeAll(async () => {
    // Use a test user ID
    testUserId = 1;
  });

  it('should add a preset to favorites', async () => {
    const presetId = 'log-drum-heavy';
    const favorite = await db.addPresetFavorite(testUserId, presetId);
    
    expect(favorite).toBeDefined();
    expect(favorite.userId).toBe(testUserId);
    expect(favorite.presetId).toBe(presetId);
  });

  it('should check if preset is favorited', async () => {
    const presetId = 'log-drum-heavy';
    const isFavorited = await db.isPresetFavorited(testUserId, presetId);
    
    expect(isFavorited).toBe(true);
  });

  it('should list user favorites', async () => {
    const favorites = await db.getUserPresetFavorites(testUserId);
    
    expect(Array.isArray(favorites)).toBe(true);
    expect(favorites.length).toBeGreaterThan(0);
  });

  it('should remove preset from favorites', async () => {
    const presetId = 'log-drum-heavy';
    await db.removePresetFavorite(testUserId, presetId);
    
    const isFavorited = await db.isPresetFavorited(testUserId, presetId);
    expect(isFavorited).toBe(false);
  });
});

describe('Custom Presets', () => {
  let testUserId: number;
  let createdPresetId: number;

  beforeAll(async () => {
    testUserId = 1;
  });

  it('should create a custom preset', async () => {
    const preset = await db.createCustomPreset({
      userId: testUserId,
      name: 'Test Preset',
      description: 'A test preset for unit testing',
      category: 'production',
      style: 'kasi',
      icon: '🎵',
      prompt: 'Test prompt for Amapiano generation',
      parameters: {
        tempo: 112,
        key: 'F min',
        temperature: 0.8,
        topK: 50,
        topP: 0.95,
        cfgScale: 7.5,
        duration: 30,
      },
      culturalElements: ['log-drums', 'shakers', 'piano'],
      tags: ['test', 'kasi', 'energetic'],
    });

    expect(preset).toBeDefined();
    expect(preset.name).toBe('Test Preset');
    expect(preset.userId).toBe(testUserId);
    createdPresetId = preset.id;
  });

  it('should get custom preset by ID', async () => {
    const preset = await db.getCustomPresetById(createdPresetId);
    
    expect(preset).toBeDefined();
    expect(preset?.id).toBe(createdPresetId);
    expect(preset?.name).toBe('Test Preset');
  });

  it('should list user custom presets', async () => {
    const presets = await db.getUserCustomPresets(testUserId);
    
    expect(Array.isArray(presets)).toBe(true);
    expect(presets.length).toBeGreaterThan(0);
    expect(presets.some(p => p.id === createdPresetId)).toBe(true);
  });

  it('should update custom preset', async () => {
    await db.updateCustomPreset(createdPresetId, {
      name: 'Updated Test Preset',
      description: 'Updated description',
    });

    const preset = await db.getCustomPresetById(createdPresetId);
    expect(preset?.name).toBe('Updated Test Preset');
    expect(preset?.description).toBe('Updated description');
  });

  it('should increment preset usage count', async () => {
    const presetBefore = await db.getCustomPresetById(createdPresetId);
    const usageCountBefore = presetBefore?.usageCount || 0;

    await db.incrementCustomPresetUsage(createdPresetId);

    const presetAfter = await db.getCustomPresetById(createdPresetId);
    expect(presetAfter?.usageCount).toBe(usageCountBefore + 1);
  });

  it('should delete custom preset', async () => {
    await db.deleteCustomPreset(createdPresetId);

    const preset = await db.getCustomPresetById(createdPresetId);
    expect(preset).toBeNull();
  });
});
