/**
 * Euclidean Rhythm Generator
 * Implements Bjorklund's algorithm for generating maximally even distributions
 * Used for authentic Amapiano rhythm patterns
 */

// ============================================================================
// Types
// ============================================================================

export interface EuclideanPattern {
  k: number; // Number of pulses (onsets)
  n: number; // Total steps
  rotation: number; // Pattern rotation offset
  pattern: number[]; // Binary pattern (1 = hit, 0 = rest)
}

export interface GaspConfig {
  type: 'classic' | 'double' | 'stutter' | 'reverse' | 'buildup' | 'breakdown' | 'selective' | 'layered' | 'delayed' | 'subtle';
  timing: 'beat1' | 'halfBar' | 'fullBar' | 'selective' | 'buildup';
  intensity: 'subtle' | 'light' | 'moderate' | 'full';
}

export interface RhythmConfig {
  euclidean: {
    k: number;
    n: number;
    rotation?: number;
  };
  language: string;
  gaspType?: string;
  bpm?: number;
  bars?: number;
}

export interface CompleteRhythm {
  pattern: number[];
  swingPercent: number;
  microTimingJitter: number; // in milliseconds
  gaspTimings: number[]; // in seconds from start
  gaspIntensity: number; // 0.0 to 1.0
}

// ============================================================================
// Linguistic Swing Mappings
// ============================================================================

export const LINGUISTIC_SWING: Record<string, { swing: number; jitter: number; stress: string }> = {
  'Zulu': { swing: 55, jitter: 8, stress: 'iambic' },
  'Xhosa': { swing: 52, jitter: 10, stress: 'trochaic' },
  'Tsonga': { swing: 58, jitter: 6, stress: 'dactylic' },
  'Sotho (North)': { swing: 54, jitter: 7, stress: 'iambic' },
  'Sotho (South)': { swing: 53, jitter: 7, stress: 'iambic' },
  'Tswana': { swing: 56, jitter: 8, stress: 'trochaic' },
  'Venda': { swing: 60, jitter: 5, stress: 'anapestic' },
  'Ndebele': { swing: 54, jitter: 9, stress: 'trochaic' },
  'Swazi': { swing: 55, jitter: 8, stress: 'iambic' },
  'English (SA)': { swing: 50, jitter: 12, stress: 'mixed' },
  'Afrikaans': { swing: 48, jitter: 10, stress: 'trochaic' },
};

// ============================================================================
// Gasp Configuration Presets
// ============================================================================

export const GASP_PRESETS: Record<string, GaspConfig> = {
  classic: { type: 'classic', timing: 'beat1', intensity: 'moderate' },
  double: { type: 'double', timing: 'halfBar', intensity: 'full' },
  stutter: { type: 'stutter', timing: 'selective', intensity: 'light' },
  reverse: { type: 'reverse', timing: 'fullBar', intensity: 'moderate' },
  buildup: { type: 'buildup', timing: 'buildup', intensity: 'full' },
  breakdown: { type: 'breakdown', timing: 'fullBar', intensity: 'subtle' },
  selective: { type: 'selective', timing: 'selective', intensity: 'light' },
  layered: { type: 'layered', timing: 'halfBar', intensity: 'full' },
  delayed: { type: 'delayed', timing: 'beat1', intensity: 'moderate' },
  subtle: { type: 'subtle', timing: 'beat1', intensity: 'subtle' },
};

// ============================================================================
// Bjorklund's Algorithm
// ============================================================================

/**
 * Bjorklund's algorithm for generating Euclidean rhythms
 * Distributes k pulses across n steps with maximal evenness
 * 
 * @param k - Number of pulses (onsets)
 * @param n - Total number of steps
 * @returns Binary pattern array (1 = hit, 0 = rest)
 */
export function bjorklund(k: number, n: number): number[] {
  if (k === 0) return Array(n).fill(0);
  if (k >= n) return Array(n).fill(1);
  
  // Initialize with k ones and (n-k) zeros
  let groups: number[][] = [];
  for (let i = 0; i < k; i++) {
    groups.push([1]);
  }
  for (let i = 0; i < n - k; i++) {
    groups.push([0]);
  }
  
  // Bjorklund's algorithm: repeatedly concatenate smaller group to larger
  while (groups.length > 1) {
    const lastIndex = groups.length - 1;
    const secondLastIndex = groups.length - 2;
    
    // Count how many of the last group we can append to the second-to-last
    const lastGroupSize = groups[lastIndex].length;
    const secondLastGroupSize = groups[secondLastIndex].length;
    
    // Find how many complete last groups we have
    let lastGroupCount = 0;
    for (let i = groups.length - 1; i >= 0; i--) {
      if (groups[i].length === lastGroupSize) {
        lastGroupCount++;
      } else {
        break;
      }
    }
    
    // Find how many complete second-to-last groups we have
    let secondLastGroupCount = 0;
    for (let i = groups.length - lastGroupCount - 1; i >= 0; i--) {
      if (groups[i].length === secondLastGroupSize) {
        secondLastGroupCount++;
      } else {
        break;
      }
    }
    
    if (lastGroupCount === 0 || secondLastGroupCount === 0) break;
    
    // Append last groups to second-to-last groups
    const appendableCount = Math.min(lastGroupCount, secondLastGroupCount);
    const newGroups: number[][] = [];
    
    // Keep groups before the second-to-last group
    for (let i = 0; i < groups.length - lastGroupCount - secondLastGroupCount; i++) {
      newGroups.push(groups[i]);
    }
    
    // Append last groups to second-to-last groups
    for (let i = 0; i < appendableCount; i++) {
      const secondLastGroup = groups[groups.length - lastGroupCount - secondLastGroupCount + i];
      const lastGroup = groups[groups.length - lastGroupCount + i];
      newGroups.push([...secondLastGroup, ...lastGroup]);
    }
    
    // Add remaining second-to-last groups
    for (let i = appendableCount; i < secondLastGroupCount; i++) {
      newGroups.push(groups[groups.length - lastGroupCount - secondLastGroupCount + i]);
    }
    
    // Add remaining last groups
    for (let i = appendableCount; i < lastGroupCount; i++) {
      newGroups.push(groups[groups.length - lastGroupCount + i]);
    }
    
    groups = newGroups;
  }
  
  // Flatten the groups into a single pattern
  return groups.flat();
}

/**
 * Generate Euclidean pattern with rotation
 */
export function generateEuclideanPattern(k: number, n: number, rotation: number = 0): EuclideanPattern {
  let pattern = bjorklund(k, n);
  
  // Apply rotation
  if (rotation !== 0) {
    const normalizedRotation = ((rotation % n) + n) % n;
    pattern = [...pattern.slice(normalizedRotation), ...pattern.slice(0, normalizedRotation)];
  }
  
  return {
    k,
    n,
    rotation,
    pattern,
  };
}

// ============================================================================
// Gasp Timing Calculation
// ============================================================================

/**
 * Calculate gasp timings based on configuration
 * @param barLength - Length of one bar in seconds
 * @param totalBars - Total number of bars
 * @param gaspConfig - Gasp configuration
 * @returns Array of gasp timings in seconds
 */
export function calculateGaspTimings(
  barLength: number,
  totalBars: number,
  gaspConfig: GaspConfig
): number[] {
  const timings: number[] = [];
  
  switch (gaspConfig.timing) {
    case 'beat1':
      // Gasp on beat 1 of every bar
      for (let bar = 0; bar < totalBars; bar++) {
        timings.push(bar * barLength);
      }
      break;
      
    case 'halfBar':
      // Gasp every half bar
      for (let bar = 0; bar < totalBars; bar++) {
        timings.push(bar * barLength);
        timings.push(bar * barLength + barLength / 2);
      }
      break;
      
    case 'fullBar':
      // Gasp once per bar
      for (let bar = 0; bar < totalBars; bar++) {
        timings.push(bar * barLength);
      }
      break;
      
    case 'selective':
      // Gasp on selective bars (1, 5, 9, 13, etc.)
      for (let bar = 0; bar < totalBars; bar += 4) {
        timings.push(bar * barLength);
      }
      break;
      
    case 'buildup':
      // Increasing frequency towards the end
      const buildupStart = Math.floor(totalBars * 0.75);
      for (let bar = buildupStart; bar < totalBars; bar++) {
        timings.push(bar * barLength);
        if (bar > buildupStart + 2) {
          timings.push(bar * barLength + barLength / 2);
        }
      }
      break;
  }
  
  return timings;
}

/**
 * Get gasp intensity value
 */
export function getGaspIntensity(intensity: string): number {
  switch (intensity) {
    case 'subtle': return 0.4;
    case 'light': return 0.6;
    case 'moderate': return 0.8;
    case 'full': return 1.0;
    default: return 0.8;
  }
}

// ============================================================================
// Complete Rhythm Generation
// ============================================================================

/**
 * Generate complete rhythm with Euclidean pattern, swing, and gasp
 */
export function generateCompleteRhythm(config: RhythmConfig): CompleteRhythm {
  // Generate Euclidean pattern
  const pattern = generateEuclideanPattern(
    config.euclidean.k,
    config.euclidean.n,
    config.euclidean.rotation || 0
  );
  
  // Get linguistic swing parameters
  const linguisticData = LINGUISTIC_SWING[config.language] || LINGUISTIC_SWING['Zulu'];
  
  // Get gasp configuration
  const gaspPreset = GASP_PRESETS[config.gaspType || 'classic'];
  
  // Calculate gasp timings
  const bpm = config.bpm || 112;
  const bars = config.bars || 16;
  const barLength = (60 / bpm) * 4; // 4 beats per bar
  const gaspTimings = calculateGaspTimings(barLength, bars, gaspPreset);
  
  return {
    pattern: pattern.pattern,
    swingPercent: linguisticData.swing,
    microTimingJitter: linguisticData.jitter,
    gaspTimings,
    gaspIntensity: getGaspIntensity(gaspPreset.intensity),
  };
}
