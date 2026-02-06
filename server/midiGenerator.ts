/**
 * MIDI Generation Service
 * Converts Euclidean rhythm patterns to MIDI data for MusicGen conditioning
 */

import { generateCompleteRhythm, type RhythmConfig } from '../shared/euclideanRhythm.js';

export interface MIDINote {
  pitch: number;
  velocity: number;
  startTime: number; // in seconds
  duration: number; // in seconds
}

export interface MIDITrack {
  name: string;
  notes: MIDINote[];
  instrument: string;
}

export interface MIDIData {
  tracks: MIDITrack[];
  tempo: number;
  timeSignature: { numerator: number; denominator: number };
  duration: number; // total duration in seconds
}

export interface GaspMarker {
  time: number; // in seconds
  intensity: number; // 0.0 to 1.0
  type: string;
}

/**
 * Generate MIDI data from Euclidean rhythm configuration
 */
export function generateMIDIFromEuclidean(config: RhythmConfig): MIDIData {
  const rhythm = generateCompleteRhythm(config);
  
  // Calculate timing parameters
  const bpm = config.bpm || 112;
  const bars = config.bars || 16;
  const beatsPerBar = 4;
  const secondsPerBeat = 60 / bpm;
  const secondsPerBar = secondsPerBeat * beatsPerBar;
  const totalDuration = secondsPerBar * bars;
  
  // Calculate step duration based on pattern length
  const stepsPerBar = config.euclidean.n;
  const secondsPerStep = secondsPerBar / stepsPerBar;
  
  // Generate kick drum pattern from Euclidean rhythm
  const kickNotes: MIDINote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    rhythm.pattern.forEach((hit: number, stepIndex: number) => {
      if (hit === 1) {
        const baseTime = bar * secondsPerBar + stepIndex * secondsPerStep;
        
        // Apply swing to off-beats
        // Swing percentage represents how much to delay the off-beat
        // 50% = straight, 60% = swung
        let swingOffset = 0;
        if (stepIndex % 2 === 1) {
          // Convert swing percent to timing offset
          // At 50%, off-beat is exactly halfway (no offset)
          // At 60%, off-beat is delayed by 20% of step duration
          const swingRatio = (rhythm.swingPercent - 50) / 50; // -1 to 1 range
          swingOffset = secondsPerStep * swingRatio * 0.2; // Max 20% offset
        }
        
        // Apply micro-timing jitter
        const jitter = (Math.random() - 0.5) * (rhythm.microTimingJitter / 1000);
        
        // Clamp start time to prevent negative values
        const startTime = Math.max(0, baseTime + swingOffset + jitter);
        
        kickNotes.push({
          pitch: 36, // C1 - Kick drum
          velocity: 100 + Math.floor(Math.random() * 27), // 100-127 for variation
          startTime,
          duration: secondsPerStep * 0.8, // 80% of step duration
        });
      }
    });
  }
  
  // Generate bass pattern (follows kick with octave variations)
  const bassNotes: MIDINote[] = kickNotes.map((kick, index) => {
    // Amapiano bass typically plays on kick hits
    const bassPitch = index % 4 === 0 ? 40 : 43; // E1 or G1 for variation
    return {
      pitch: bassPitch,
      velocity: 80 + Math.floor(Math.random() * 20),
      startTime: kick.startTime,
      duration: secondsPerStep * 1.5, // Longer duration for bass
    };
  });
  
  // Generate log drum pattern (syncopated, between kicks)
  const logDrumNotes: MIDINote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    // Log drums typically play on off-beats and syncopated positions
    for (let step = 0; step < stepsPerBar; step++) {
      if (rhythm.pattern[step] === 0 && step % 2 === 1) {
        // Play on empty off-beats
        const baseTime = bar * secondsPerBar + step * secondsPerStep;
        logDrumNotes.push({
          pitch: 50, // D2 - Log drum
          velocity: 70 + Math.floor(Math.random() * 30),
          startTime: baseTime,
          duration: secondsPerStep * 0.6,
        });
      }
    }
  }
  
  // Generate hi-hat pattern (16th notes with velocity variation)
  const hiHatNotes: MIDINote[] = [];
  const hiHatStepsPerBar = 16; // 16th notes
  const hiHatSecondsPerStep = secondsPerBar / hiHatStepsPerBar;
  for (let bar = 0; bar < bars; bar++) {
    for (let step = 0; step < hiHatStepsPerBar; step++) {
      const baseTime = bar * secondsPerBar + step * hiHatSecondsPerStep;
      // Velocity pattern: strong on beats, weak on off-beats
      const velocity = step % 4 === 0 ? 90 : 60;
      hiHatNotes.push({
        pitch: 42, // F#1 - Closed hi-hat
        velocity: velocity + Math.floor(Math.random() * 10),
        startTime: baseTime,
        duration: hiHatSecondsPerStep * 0.5,
      });
    }
  }
  
  return {
    tracks: [
      {
        name: 'Kick',
        notes: kickNotes,
        instrument: 'kick_drum',
      },
      {
        name: 'Bass',
        notes: bassNotes,
        instrument: 'bass',
      },
      {
        name: 'Log Drum',
        notes: logDrumNotes,
        instrument: 'log_drum',
      },
      {
        name: 'Hi-Hat',
        notes: hiHatNotes,
        instrument: 'hi_hat',
      },
    ],
    tempo: bpm,
    timeSignature: { numerator: 4, denominator: 4 },
    duration: totalDuration,
  };
}

/**
 * Generate gasp markers from rhythm configuration
 */
export function generateGaspMarkers(config: RhythmConfig): GaspMarker[] {
  const rhythm = generateCompleteRhythm(config);
  const bpm = config.bpm || 112;
  const bars = config.bars || 16;
  const secondsPerBar = (60 / bpm) * 4;
  
  const markers: GaspMarker[] = [];
  
  rhythm.gaspTimings.forEach((timing: number) => {
    const bar = Math.floor(timing / secondsPerBar);
    if (bar < bars) {
      markers.push({
        time: timing,
        intensity: rhythm.gaspIntensity,
        type: config.gaspType || 'classic',
      });
    }
  });
  
  return markers;
}

/**
 * Convert MIDI data to MusicGen-compatible format
 */
export function convertToMusicGenFormat(midi: MIDIData): {
  midi_notes: Array<[number, number, number, number]>; // [pitch, velocity, start, duration]
  tempo: number;
  duration: number;
} {
  const allNotes: Array<[number, number, number, number]> = [];
  
  // Combine all tracks into single note list
  midi.tracks.forEach((track) => {
    track.notes.forEach((note) => {
      allNotes.push([
        note.pitch,
        note.velocity,
        note.startTime,
        note.duration,
      ]);
    });
  });
  
  // Sort by start time
  allNotes.sort((a, b) => a[2] - b[2]);
  
  return {
    midi_notes: allNotes,
    tempo: midi.tempo,
    duration: midi.duration,
  };
}

/**
 * Export MIDI data to standard MIDI file format (for download/DAW import)
 */
export function exportToMIDIFile(midi: MIDIData): Buffer {
  // This is a simplified MIDI file generator
  // For production, use a library like 'midi-writer-js'
  
  // MIDI file header
  const header = Buffer.from([
    0x4D, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // Header length
    0x00, 0x01, // Format 1 (multiple tracks)
    0x00, midi.tracks.length + 1, // Number of tracks (+ tempo track)
    0x01, 0xE0, // Ticks per quarter note (480)
  ]);
  
  // Tempo track
  const microsecondsPerQuarter = Math.floor(60000000 / midi.tempo);
  const tempoTrack = Buffer.concat([
    Buffer.from([0x4D, 0x54, 0x72, 0x6B]), // "MTrk"
    Buffer.from([0x00, 0x00, 0x00, 0x0B]), // Track length
    Buffer.from([0x00, 0xFF, 0x51, 0x03]), // Tempo meta event
    Buffer.from([
      (microsecondsPerQuarter >> 16) & 0xFF,
      (microsecondsPerQuarter >> 8) & 0xFF,
      microsecondsPerQuarter & 0xFF,
    ]),
    Buffer.from([0x00, 0xFF, 0x2F, 0x00]), // End of track
  ]);
  
  // Note tracks (simplified - just note on/off events)
  const noteTracks = midi.tracks.map((track) => {
    const events: number[] = [];
    
    track.notes.forEach((note) => {
      const ticksPerSecond = 480 * (midi.tempo / 60);
      const startTick = Math.floor(note.startTime * ticksPerSecond);
      const durationTicks = Math.floor(note.duration * ticksPerSecond);
      
      // Note on
      events.push(startTick & 0x7F);
      events.push(0x90); // Note on, channel 0
      events.push(note.pitch);
      events.push(note.velocity);
      
      // Note off
      events.push((startTick + durationTicks) & 0x7F);
      events.push(0x80); // Note off, channel 0
      events.push(note.pitch);
      events.push(0x40); // Release velocity
    });
    
    // End of track
    events.push(0x00, 0xFF, 0x2F, 0x00);
    
    const trackData = Buffer.from(events);
    const trackHeader = Buffer.concat([
      Buffer.from([0x4D, 0x54, 0x72, 0x6B]), // "MTrk"
      Buffer.from([
        (trackData.length >> 24) & 0xFF,
        (trackData.length >> 16) & 0xFF,
        (trackData.length >> 8) & 0xFF,
        trackData.length & 0xFF,
      ]),
    ]);
    
    return Buffer.concat([trackHeader, trackData]);
  });
  
  return Buffer.concat([header, tempoTrack, ...noteTracks]);
}
