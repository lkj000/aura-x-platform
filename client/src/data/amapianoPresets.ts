/**
 * Amapiano Generation Presets
 * Culturally authentic preset configurations for different Amapiano styles
 * Based on real production techniques from South African producers
 */

export interface AmapianoPreset {
  id: string;
  name: string;
  description: string;
  category: 'production' | 'creative';
  style: 'private-school' | 'kasi' | 'bacardi' | 'sgija';
  icon: string;
  prompt: string;
  parameters: {
    tempo: number;
    key: string;
    duration: number;
    temperature: number;
    topK: number;
    topP: number;
    cfgScale: number;
  };
  culturalElements: string[];
  tags: string[];
}

export const amapianoPresets: AmapianoPreset[] = [
  // Log Drum Heavy Presets
  {
    id: 'log-drum-heavy-kasi',
    name: 'Log Drum Heavy (Kasi)',
    description: 'Deep, punchy log drums with township energy. Perfect for dance floor bangers with authentic Kasi flavor.',
    category: 'production',
    style: 'kasi',
    icon: '🥁',
    prompt: 'Energetic Kasi Amapiano with dominant log drums, deep sub-bass, shakers, and minimal piano. Heavy percussion focus with township groove at 112 BPM in F minor.',
    parameters: {
      tempo: 112,
      key: 'F min',
      duration: 30,
      temperature: 0.7,
      topK: 40,
      topP: 0.9,
      cfgScale: 8.0,
    },
    culturalElements: [
      'Deep log drum patterns',
      'Township percussion',
      'Sub-bass emphasis',
      'Shaker rhythms',
      'Minimal melodic elements'
    ],
    tags: ['log-drums', 'kasi', 'heavy', 'percussion', 'dance-floor']
  },
  {
    id: 'log-drum-heavy-bacardi',
    name: 'Log Drum Heavy (Bacardi)',
    description: 'Fast-paced log drums with Bacardi energy. High-tempo rhythms for peak-time sets.',
    category: 'production',
    style: 'bacardi',
    icon: '🔥',
    prompt: 'High-energy Bacardi Amapiano with rapid log drum patterns, aggressive bass, syncopated shakers, and sparse melodics at 118 BPM in G minor.',
    parameters: {
      tempo: 118,
      key: 'G min',
      duration: 30,
      temperature: 0.8,
      topK: 50,
      topP: 0.95,
      cfgScale: 7.5,
    },
    culturalElements: [
      'Rapid log drum sequences',
      'Aggressive bass lines',
      'Syncopated percussion',
      'High-energy groove',
      'Peak-time intensity'
    ],
    tags: ['log-drums', 'bacardi', 'fast', 'aggressive', 'peak-time']
  },

  // Piano Chords Focus Presets
  {
    id: 'piano-chords-private-school',
    name: 'Piano Chords Focus (Private School)',
    description: 'Sophisticated piano progressions with smooth, jazzy chords. Refined and melodic with subtle log drums.',
    category: 'production',
    style: 'private-school',
    icon: '🎹',
    prompt: 'Sophisticated Private School Amapiano with rich piano chord progressions, jazzy harmonies, smooth bass, gentle log drums, and atmospheric pads at 110 BPM in A minor.',
    parameters: {
      tempo: 110,
      key: 'A min',
      duration: 30,
      temperature: 0.6,
      topK: 30,
      topP: 0.85,
      cfgScale: 9.0,
    },
    culturalElements: [
      'Complex piano progressions',
      'Jazzy chord voicings',
      'Smooth bass lines',
      'Subtle percussion',
      'Atmospheric textures'
    ],
    tags: ['piano', 'private-school', 'melodic', 'sophisticated', 'jazzy']
  },
  {
    id: 'piano-chords-soulful',
    name: 'Piano Chords Focus (Soulful)',
    description: 'Emotional piano melodies with soulful progressions. Deep, introspective vibes with balanced percussion.',
    category: 'creative',
    style: 'kasi',
    icon: '💫',
    prompt: 'Soulful Amapiano with emotive piano melodies, warm chord progressions, deep bass, balanced log drums, and subtle vocal textures at 108 BPM in D minor.',
    parameters: {
      tempo: 108,
      key: 'D min',
      duration: 30,
      temperature: 0.75,
      topK: 45,
      topP: 0.92,
      cfgScale: 8.5,
    },
    culturalElements: [
      'Emotive piano melodies',
      'Soulful progressions',
      'Warm harmonies',
      'Balanced percussion',
      'Vocal-inspired textures'
    ],
    tags: ['piano', 'soulful', 'emotional', 'melodic', 'introspective']
  },

  // Vocal Texture Presets
  {
    id: 'vocal-texture-zulu',
    name: 'Vocal Texture (Zulu Chants)',
    description: 'Traditional Zulu vocal samples and chants layered with modern Amapiano production. Cultural authenticity meets contemporary sound.',
    category: 'creative',
    style: 'kasi',
    icon: '🎤',
    prompt: 'Cultural Amapiano with Zulu vocal chants, traditional call-and-response patterns, log drums, piano stabs, and deep bass at 112 BPM in F minor.',
    parameters: {
      tempo: 112,
      key: 'F min',
      duration: 30,
      temperature: 0.85,
      topK: 55,
      topP: 0.95,
      cfgScale: 7.0,
    },
    culturalElements: [
      'Zulu vocal chants',
      'Call-and-response patterns',
      'Traditional harmonies',
      'Cultural authenticity',
      'Modern production blend'
    ],
    tags: ['vocals', 'zulu', 'cultural', 'traditional', 'chants']
  },
  {
    id: 'vocal-texture-soulful-hums',
    name: 'Vocal Texture (Soulful Hums)',
    description: 'Smooth vocal hums and ad-libs creating atmospheric depth. Perfect for late-night grooves.',
    category: 'creative',
    style: 'private-school',
    icon: '🌙',
    prompt: 'Atmospheric Amapiano with soulful vocal hums, smooth ad-libs, gentle piano, subtle log drums, and deep bass at 108 BPM in C minor.',
    parameters: {
      tempo: 108,
      key: 'C min',
      duration: 30,
      temperature: 0.7,
      topK: 40,
      topP: 0.88,
      cfgScale: 8.5,
    },
    culturalElements: [
      'Soulful vocal hums',
      'Smooth ad-libs',
      'Atmospheric depth',
      'Late-night vibe',
      'Gentle percussion'
    ],
    tags: ['vocals', 'soulful', 'atmospheric', 'smooth', 'late-night']
  },

  // Hybrid/Advanced Presets
  {
    id: 'sgija-fusion',
    name: 'Sgija Fusion',
    description: 'Experimental Sgija style blending traditional elements with modern electronic textures. Bold and innovative.',
    category: 'creative',
    style: 'sgija',
    icon: '⚡',
    prompt: 'Experimental Sgija Amapiano with unconventional rhythms, electronic textures, traditional elements, complex log drums, and innovative bass patterns at 115 BPM in E minor.',
    parameters: {
      tempo: 115,
      key: 'E min',
      duration: 30,
      temperature: 0.9,
      topK: 60,
      topP: 0.98,
      cfgScale: 6.5,
    },
    culturalElements: [
      'Unconventional rhythms',
      'Electronic textures',
      'Traditional fusion',
      'Complex percussion',
      'Innovative production'
    ],
    tags: ['sgija', 'experimental', 'fusion', 'innovative', 'electronic']
  },
  {
    id: 'classic-amapiano',
    name: 'Classic Amapiano Blueprint',
    description: 'The quintessential Amapiano sound - balanced piano, log drums, and bass. Perfect starting point for any production.',
    category: 'production',
    style: 'kasi',
    icon: '🎵',
    prompt: 'Classic Amapiano with balanced piano chords, prominent log drums, deep bass, shakers, and subtle atmospheric elements at 112 BPM in F minor.',
    parameters: {
      tempo: 112,
      key: 'F min',
      duration: 30,
      temperature: 0.75,
      topK: 45,
      topP: 0.9,
      cfgScale: 7.5,
    },
    culturalElements: [
      'Balanced production',
      'Classic log drum patterns',
      'Piano-bass interplay',
      'Shaker rhythms',
      'Atmospheric layers'
    ],
    tags: ['classic', 'balanced', 'essential', 'foundation', 'versatile']
  },
  {
    id: 'deep-house-amapiano',
    name: 'Deep House Amapiano',
    description: 'Fusion of deep house grooves with Amapiano elements. Smooth, hypnotic, and perfect for extended sets.',
    category: 'creative',
    style: 'private-school',
    icon: '🌊',
    prompt: 'Deep House-influenced Amapiano with hypnotic grooves, smooth piano, subtle log drums, deep bass, and atmospheric pads at 110 BPM in A minor.',
    parameters: {
      tempo: 110,
      key: 'A min',
      duration: 30,
      temperature: 0.65,
      topK: 35,
      topP: 0.87,
      cfgScale: 8.0,
    },
    culturalElements: [
      'Deep house grooves',
      'Hypnotic rhythms',
      'Smooth textures',
      'Extended arrangement',
      'Atmospheric depth'
    ],
    tags: ['deep-house', 'fusion', 'hypnotic', 'smooth', 'extended']
  }
];

// Helper functions
export function getPresetsByCategory(category: 'production' | 'creative'): AmapianoPreset[] {
  return amapianoPresets.filter(preset => preset.category === category);
}

export function getPresetsByStyle(style: string): AmapianoPreset[] {
  return amapianoPresets.filter(preset => preset.style === style);
}

export function getPresetById(id: string): AmapianoPreset | undefined {
  return amapianoPresets.find(preset => preset.id === id);
}

export function searchPresets(query: string): AmapianoPreset[] {
  const lowerQuery = query.toLowerCase();
  return amapianoPresets.filter(preset =>
    preset.name.toLowerCase().includes(lowerQuery) ||
    preset.description.toLowerCase().includes(lowerQuery) ||
    preset.tags.some(tag => tag.includes(lowerQuery)) ||
    preset.culturalElements.some(element => element.toLowerCase().includes(lowerQuery))
  );
}
