import { describe, it, expect } from 'vitest';
import { 
  amapianoPresets, 
  getPresetsByCategory, 
  getPresetsByStyle, 
  getPresetById, 
  searchPresets 
} from '../client/src/data/amapianoPresets';

describe('Amapiano Presets Library', () => {
  it('should have at least 9 presets defined', () => {
    expect(amapianoPresets.length).toBeGreaterThanOrEqual(9);
  });

  it('should have all required preset fields', () => {
    amapianoPresets.forEach(preset => {
      expect(preset).toHaveProperty('id');
      expect(preset).toHaveProperty('name');
      expect(preset).toHaveProperty('description');
      expect(preset).toHaveProperty('category');
      expect(preset).toHaveProperty('style');
      expect(preset).toHaveProperty('icon');
      expect(preset).toHaveProperty('prompt');
      expect(preset).toHaveProperty('parameters');
      expect(preset).toHaveProperty('culturalElements');
      expect(preset).toHaveProperty('tags');
    });
  });

  it('should have valid parameter ranges', () => {
    amapianoPresets.forEach(preset => {
      const { tempo, temperature, topK, topP, cfgScale } = preset.parameters;
      
      // Tempo should be in typical Amapiano range (100-130 BPM)
      expect(tempo).toBeGreaterThanOrEqual(100);
      expect(tempo).toBeLessThanOrEqual(130);
      
      // Temperature should be between 0 and 1
      expect(temperature).toBeGreaterThan(0);
      expect(temperature).toBeLessThanOrEqual(1);
      
      // TopK should be positive
      expect(topK).toBeGreaterThan(0);
      
      // TopP should be between 0 and 1
      expect(topP).toBeGreaterThan(0);
      expect(topP).toBeLessThanOrEqual(1);
      
      // CFG scale should be reasonable (typically 1-15)
      expect(cfgScale).toBeGreaterThan(0);
      expect(cfgScale).toBeLessThanOrEqual(15);
    });
  });

  it('should filter presets by category correctly', () => {
    const productionPresets = getPresetsByCategory('production');
    const creativePresets = getPresetsByCategory('creative');
    
    expect(productionPresets.length).toBeGreaterThan(0);
    expect(creativePresets.length).toBeGreaterThan(0);
    
    productionPresets.forEach(preset => {
      expect(preset.category).toBe('production');
    });
    
    creativePresets.forEach(preset => {
      expect(preset.category).toBe('creative');
    });
  });

  it('should filter presets by style correctly', () => {
    const kasiPresets = getPresetsByStyle('kasi');
    const privateSchoolPresets = getPresetsByStyle('private-school');
    const bacardiPresets = getPresetsByStyle('bacardi');
    const sgijaPresets = getPresetsByStyle('sgija');
    
    expect(kasiPresets.length).toBeGreaterThan(0);
    expect(privateSchoolPresets.length).toBeGreaterThan(0);
    expect(bacardiPresets.length).toBeGreaterThan(0);
    expect(sgijaPresets.length).toBeGreaterThan(0);
  });

  it('should find preset by ID', () => {
    const preset = getPresetById('log-drum-heavy-kasi');
    expect(preset).toBeDefined();
    expect(preset?.id).toBe('log-drum-heavy-kasi');
    expect(preset?.name).toContain('Log Drum Heavy');
  });

  it('should return undefined for non-existent ID', () => {
    const preset = getPresetById('non-existent-preset');
    expect(preset).toBeUndefined();
  });

  it('should search presets by name', () => {
    const results = searchPresets('piano');
    expect(results.length).toBeGreaterThan(0);
    results.forEach(preset => {
      const matchesName = preset.name.toLowerCase().includes('piano');
      const matchesDescription = preset.description.toLowerCase().includes('piano');
      const matchesTags = preset.tags.some(tag => tag.includes('piano'));
      const matchesCultural = preset.culturalElements.some(el => el.toLowerCase().includes('piano'));
      
      expect(matchesName || matchesDescription || matchesTags || matchesCultural).toBe(true);
    });
  });

  it('should search presets by tags', () => {
    const results = searchPresets('log-drums');
    expect(results.length).toBeGreaterThan(0);
    results.forEach(preset => {
      const hasDrumTag = preset.tags.some(tag => tag.includes('log-drums') || tag.includes('drum'));
      expect(hasDrumTag).toBe(true);
    });
  });

  it('should have culturally authentic elements', () => {
    amapianoPresets.forEach(preset => {
      expect(preset.culturalElements.length).toBeGreaterThan(0);
      
      // Check that cultural elements are descriptive
      preset.culturalElements.forEach(element => {
        expect(element.length).toBeGreaterThan(5);
      });
    });
  });

  it('should have appropriate keys for Amapiano', () => {
    const validKeys = ['C min', 'D min', 'E min', 'F min', 'G min', 'A min', 'B min'];
    
    amapianoPresets.forEach(preset => {
      expect(validKeys).toContain(preset.parameters.key);
    });
  });

  it('should have Log Drum Heavy presets', () => {
    const logDrumPresets = amapianoPresets.filter(p => 
      p.name.toLowerCase().includes('log drum heavy')
    );
    expect(logDrumPresets.length).toBeGreaterThanOrEqual(2);
  });

  it('should have Piano Chords Focus presets', () => {
    const pianoPresets = amapianoPresets.filter(p => 
      p.name.toLowerCase().includes('piano chords focus')
    );
    expect(pianoPresets.length).toBeGreaterThanOrEqual(2);
  });

  it('should have Vocal Texture presets', () => {
    const vocalPresets = amapianoPresets.filter(p => 
      p.name.toLowerCase().includes('vocal texture')
    );
    expect(vocalPresets.length).toBeGreaterThanOrEqual(2);
  });

  it('should have unique preset IDs', () => {
    const ids = amapianoPresets.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have descriptive prompts', () => {
    amapianoPresets.forEach(preset => {
      expect(preset.prompt.length).toBeGreaterThan(50);
      expect(preset.prompt.toLowerCase()).toContain('amapiano');
    });
  });
});
