/**
 * Kabza De Small's 6-5-4-2 Chord Progression Framework
 * Based on emotional narrative structure from YouTube analysis
 * 
 * Emotional Framework:
 * - 6 (vi): Vulnerability, introspection, melancholy
 * - 5 (V): Tension, anticipation, rising energy
 * - 4 (IV): Shattering, emotional release, catharsis
 * - 2 (ii): Integration, resolution, acceptance
 */

export interface ChordVoicing {
  notes: string[]; // MIDI note names (e.g., ["C4", "E4", "G4"])
  midiNotes: number[]; // MIDI note numbers
  intervals: string[]; // Interval names from root
  voicingType: 'close' | 'open' | 'spread';
}

export interface Chord {
  degree: string; // Roman numeral (vi, V, IV, ii)
  symbol: string; // Chord symbol (Am7, G, F, Dm9)
  root: string; // Root note name
  quality: string; // Major, minor, dominant, etc.
  extensions: string[]; // 7th, 9th, 11th, 13th, sus2, sus4
  emotion: string; // Emotional quality
  function: string; // Harmonic function
  voicings: ChordVoicing[];
}

export interface ChordProgression {
  id: string;
  name: string;
  key: string;
  chords: Chord[];
  tempo: number;
  timeSignature: [number, number];
  emotionalArc: string;
  culturalContext: string;
  usage: string;
}

// Helper function to convert note name to MIDI number
function noteToMidi(note: string): number {
  const noteMap: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
  };
  
  const match = note.match(/^([A-G][#b]?)(\d+)$/);
  if (!match) return 60; // Default to C4
  
  const [, noteName, octave] = match;
  return (parseInt(octave) + 1) * 12 + noteMap[noteName];
}

// Generate open voicings (wider intervals, more spacious)
function generateOpenVoicing(root: string, intervals: number[]): ChordVoicing {
  const rootNote = noteToMidi(root);
  const midiNotes = intervals.map((interval, i) => {
    // Spread voicing across octaves
    const octaveOffset = i > 1 ? 12 : 0;
    return rootNote + interval + octaveOffset;
  });
  
  const noteNames = midiNotes.map(midi => {
    const noteIndex = midi % 12;
    const octave = Math.floor(midi / 12) - 1;
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return `${notes[noteIndex]}${octave}`;
  });
  
  return {
    notes: noteNames,
    midiNotes,
    intervals: intervals.map(i => {
      const intervalNames = ['R', 'm2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', 'R'];
      return intervalNames[i] || `+${i}`;
    }),
    voicingType: 'open',
  };
}

// Kabza's signature 6-5-4-2 progressions in different keys
export const kabzaProgressions: ChordProgression[] = [
  {
    id: 'kabza-classic-c',
    name: 'Classic 6-5-4-2 (C Major)',
    key: 'C',
    tempo: 112,
    timeSignature: [4, 4],
    emotionalArc: 'Vulnerability → Tension → Shattering → Integration',
    culturalContext: 'Kabza De Small signature progression',
    usage: 'Emotional storytelling, introspective tracks',
    chords: [
      {
        degree: 'vi',
        symbol: 'Am9',
        root: 'A3',
        quality: 'minor',
        extensions: ['9th'],
        emotion: 'Vulnerability, introspection',
        function: 'Tonic minor (relative minor)',
        voicings: [
          generateOpenVoicing('A3', [0, 3, 7, 10, 14]), // A C E G B (root, m3, P5, m7, M9)
        ],
      },
      {
        degree: 'V',
        symbol: 'G',
        root: 'G3',
        quality: 'major',
        extensions: [],
        emotion: 'Tension, anticipation',
        function: 'Dominant',
        voicings: [
          generateOpenVoicing('G3', [0, 4, 7]), // G B D
        ],
      },
      {
        degree: 'IV',
        symbol: 'Fmaj13',
        root: 'F3',
        quality: 'major',
        extensions: ['maj7', '9th', '13th'],
        emotion: 'Shattering, emotional release',
        function: 'Subdominant',
        voicings: [
          generateOpenVoicing('F3', [0, 4, 7, 11, 14, 21]), // F A C E G D
        ],
      },
      {
        degree: 'ii',
        symbol: 'Dm9',
        root: 'D3',
        quality: 'minor',
        extensions: ['9th'],
        emotion: 'Integration, resolution',
        function: 'Subdominant minor',
        voicings: [
          generateOpenVoicing('D3', [0, 3, 7, 10, 14]), // D F A C E
        ],
      },
    ],
  },
  {
    id: 'kabza-classic-f',
    name: 'Classic 6-5-4-2 (F Major)',
    key: 'F',
    tempo: 112,
    timeSignature: [4, 4],
    emotionalArc: 'Vulnerability → Tension → Shattering → Integration',
    culturalContext: 'Kabza De Small signature progression',
    usage: 'Warmer, more soulful feel',
    chords: [
      {
        degree: 'vi',
        symbol: 'Dm9',
        root: 'D3',
        quality: 'minor',
        extensions: ['9th'],
        emotion: 'Vulnerability, introspection',
        function: 'Tonic minor (relative minor)',
        voicings: [
          generateOpenVoicing('D3', [0, 3, 7, 10, 14]),
        ],
      },
      {
        degree: 'V',
        symbol: 'C',
        root: 'C3',
        quality: 'major',
        extensions: [],
        emotion: 'Tension, anticipation',
        function: 'Dominant',
        voicings: [
          generateOpenVoicing('C3', [0, 4, 7]),
        ],
      },
      {
        degree: 'IV',
        symbol: 'Bbmaj13',
        root: 'Bb2',
        quality: 'major',
        extensions: ['maj7', '9th', '13th'],
        emotion: 'Shattering, emotional release',
        function: 'Subdominant',
        voicings: [
          generateOpenVoicing('Bb2', [0, 4, 7, 11, 14, 21]),
        ],
      },
      {
        degree: 'ii',
        symbol: 'Gm9',
        root: 'G2',
        quality: 'minor',
        extensions: ['9th'],
        emotion: 'Integration, resolution',
        function: 'Subdominant minor',
        voicings: [
          generateOpenVoicing('G2', [0, 3, 7, 10, 14]),
        ],
      },
    ],
  },
  {
    id: 'kabza-sus-variant',
    name: 'Suspended 6-5-4-2 (C Major)',
    key: 'C',
    tempo: 115,
    timeSignature: [4, 4],
    emotionalArc: 'Floating → Tension → Release → Grounding',
    culturalContext: 'Modern Amapiano variation',
    usage: 'Atmospheric, dreamy tracks',
    chords: [
      {
        degree: 'vi',
        symbol: 'Am11',
        root: 'A3',
        quality: 'minor',
        extensions: ['11th'],
        emotion: 'Floating, suspended',
        function: 'Tonic minor',
        voicings: [
          generateOpenVoicing('A3', [0, 3, 7, 10, 17]), // A C E G D
        ],
      },
      {
        degree: 'V',
        symbol: 'Gsus4',
        root: 'G3',
        quality: 'suspended',
        extensions: ['sus4'],
        emotion: 'Unresolved tension',
        function: 'Dominant suspended',
        voicings: [
          generateOpenVoicing('G3', [0, 5, 7]), // G C D
        ],
      },
      {
        degree: 'IV',
        symbol: 'Fmaj9',
        root: 'F3',
        quality: 'major',
        extensions: ['maj7', '9th'],
        emotion: 'Bright release',
        function: 'Subdominant',
        voicings: [
          generateOpenVoicing('F3', [0, 4, 7, 11, 14]),
        ],
      },
      {
        degree: 'ii',
        symbol: 'Dm7',
        root: 'D3',
        quality: 'minor',
        extensions: ['7th'],
        emotion: 'Grounding, stability',
        function: 'Subdominant minor',
        voicings: [
          generateOpenVoicing('D3', [0, 3, 7, 10]),
        ],
      },
    ],
  },
];

// Export MIDI data for a progression
export function progressionToMIDI(progression: ChordProgression): {
  tracks: Array<{
    name: string;
    notes: Array<{
      midi: number;
      time: number; // in beats
      duration: number; // in beats
      velocity: number;
    }>;
  }>;
} {
  const beatsPerChord = 4; // Each chord lasts 4 beats
  
  return {
    tracks: [
      {
        name: `${progression.name} - ${progression.key}`,
        notes: progression.chords.flatMap((chord, chordIndex) => {
          const startTime = chordIndex * beatsPerChord;
          const voicing = chord.voicings[0]; // Use first voicing
          
          return voicing.midiNotes.map(midi => ({
            midi,
            time: startTime,
            duration: beatsPerChord,
            velocity: 80,
          }));
        }),
      },
    ],
  };
}
