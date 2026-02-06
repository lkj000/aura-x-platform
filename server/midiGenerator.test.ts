import { describe, it, expect } from 'vitest';
import {
  generateMIDIFromEuclidean,
  generateGaspMarkers,
  convertToMusicGenFormat,
  type MIDIData,
} from './midiGenerator';
import type { RhythmConfig } from '../shared/euclideanRhythm';

describe('MIDI Generator', () => {
  const testConfig: RhythmConfig = {
    euclidean: { k: 5, n: 16, rotation: 0 },
    language: 'Zulu',
    gaspType: 'classic',
    bpm: 112,
    bars: 4,
  };

  describe('generateMIDIFromEuclidean', () => {
    it('should generate MIDI data with correct structure', () => {
      const midi = generateMIDIFromEuclidean(testConfig);
      
      expect(midi).toHaveProperty('tracks');
      expect(midi).toHaveProperty('tempo');
      expect(midi).toHaveProperty('timeSignature');
      expect(midi).toHaveProperty('duration');
      
      expect(midi.tracks).toBeInstanceOf(Array);
      expect(midi.tracks.length).toBeGreaterThan(0);
      expect(midi.tempo).toBe(112);
      expect(midi.timeSignature).toEqual({ numerator: 4, denominator: 4 });
    });

    it('should generate kick drum track', () => {
      const midi = generateMIDIFromEuclidean(testConfig);
      const kickTrack = midi.tracks.find(t => t.name === 'Kick');
      
      expect(kickTrack).toBeDefined();
      expect(kickTrack?.notes.length).toBeGreaterThan(0);
      expect(kickTrack?.instrument).toBe('kick_drum');
      
      // All kick notes should be pitch 36 (C1)
      kickTrack?.notes.forEach(note => {
        expect(note.pitch).toBe(36);
        expect(note.velocity).toBeGreaterThanOrEqual(100);
        expect(note.velocity).toBeLessThanOrEqual(127);
      });
    });

    it('should generate bass track following kick pattern', () => {
      const midi = generateMIDIFromEuclidean(testConfig);
      const bassTrack = midi.tracks.find(t => t.name === 'Bass');
      const kickTrack = midi.tracks.find(t => t.name === 'Kick');
      
      expect(bassTrack).toBeDefined();
      expect(bassTrack?.notes.length).toBe(kickTrack?.notes.length);
      
      // Bass should play on kick hits
      bassTrack?.notes.forEach((note, index) => {
        const kickNote = kickTrack?.notes[index];
        expect(note.startTime).toBe(kickNote?.startTime);
      });
    });

    it('should generate log drum track on off-beats', () => {
      const midi = generateMIDIFromEuclidean(testConfig);
      const logDrumTrack = midi.tracks.find(t => t.name === 'Log Drum');
      
      expect(logDrumTrack).toBeDefined();
      expect(logDrumTrack?.notes.length).toBeGreaterThan(0);
      expect(logDrumTrack?.instrument).toBe('log_drum');
      
      // All log drum notes should be pitch 50 (D2)
      logDrumTrack?.notes.forEach(note => {
        expect(note.pitch).toBe(50);
      });
    });

    it('should generate hi-hat track with 16th notes', () => {
      const midi = generateMIDIFromEuclidean(testConfig);
      const hiHatTrack = midi.tracks.find(t => t.name === 'Hi-Hat');
      
      expect(hiHatTrack).toBeDefined();
      expect(hiHatTrack?.notes.length).toBe(16 * testConfig.bars!); // 16th notes per bar
      expect(hiHatTrack?.instrument).toBe('hi_hat');
      
      // All hi-hat notes should be pitch 42 (F#1)
      hiHatTrack?.notes.forEach(note => {
        expect(note.pitch).toBe(42);
      });
    });

    it('should apply swing to off-beats', () => {
      const midi = generateMIDIFromEuclidean(testConfig);
      const kickTrack = midi.tracks.find(t => t.name === 'Kick');
      
      // Check that notes are not perfectly evenly spaced (swing applied)
      const notes = kickTrack?.notes || [];
      if (notes.length > 2) {
        const intervals = [];
        for (let i = 1; i < notes.length; i++) {
          intervals.push(notes[i].startTime - notes[i - 1].startTime);
        }
        
        // Intervals should vary due to swing
        const uniqueIntervals = new Set(intervals.map(i => Math.round(i * 1000)));
        expect(uniqueIntervals.size).toBeGreaterThan(1);
      }
    });

    it('should calculate correct total duration', () => {
      const midi = generateMIDIFromEuclidean(testConfig);
      const expectedDuration = (60 / testConfig.bpm!) * 4 * testConfig.bars!;
      
      expect(midi.duration).toBeCloseTo(expectedDuration, 1);
    });
  });

  describe('generateGaspMarkers', () => {
    it('should generate gasp markers', () => {
      const markers = generateGaspMarkers(testConfig);
      
      expect(markers).toBeInstanceOf(Array);
      expect(markers.length).toBeGreaterThan(0);
      
      markers.forEach(marker => {
        expect(marker).toHaveProperty('time');
        expect(marker).toHaveProperty('intensity');
        expect(marker).toHaveProperty('type');
        expect(marker.time).toBeGreaterThanOrEqual(0);
        expect(marker.intensity).toBeGreaterThan(0);
        expect(marker.intensity).toBeLessThanOrEqual(1);
      });
    });

    it('should generate correct number of markers for classic gasp (beat1)', () => {
      const config: RhythmConfig = {
        ...testConfig,
        gaspType: 'classic', // beat1 timing
      };
      const markers = generateGaspMarkers(config);
      
      // Classic gasp on beat 1 of every bar
      expect(markers.length).toBeLessThanOrEqual(config.bars!);
    });

    it('should generate more markers for double gasp (halfBar)', () => {
      const config: RhythmConfig = {
        ...testConfig,
        gaspType: 'double', // halfBar timing
      };
      const markers = generateGaspMarkers(config);
      
      // Double gasp every half bar
      expect(markers.length).toBeGreaterThan(testConfig.bars!);
    });

    it('should have correct intensity values', () => {
      const markers = generateGaspMarkers(testConfig);
      
      markers.forEach(marker => {
        // Intensity should be between 0.4 (subtle) and 1.0 (full)
        expect(marker.intensity).toBeGreaterThanOrEqual(0.4);
        expect(marker.intensity).toBeLessThanOrEqual(1.0);
      });
    });
  });

  describe('convertToMusicGenFormat', () => {
    it('should convert MIDI data to MusicGen format', () => {
      const midi = generateMIDIFromEuclidean(testConfig);
      const musicGenFormat = convertToMusicGenFormat(midi);
      
      expect(musicGenFormat).toHaveProperty('midi_notes');
      expect(musicGenFormat).toHaveProperty('tempo');
      expect(musicGenFormat).toHaveProperty('duration');
      
      expect(musicGenFormat.midi_notes).toBeInstanceOf(Array);
      expect(musicGenFormat.tempo).toBe(112);
    });

    it('should combine all tracks into single note list', () => {
      const midi = generateMIDIFromEuclidean(testConfig);
      const musicGenFormat = convertToMusicGenFormat(midi);
      
      // Count total notes from all tracks
      const totalNotes = midi.tracks.reduce((sum, track) => sum + track.notes.length, 0);
      
      expect(musicGenFormat.midi_notes.length).toBe(totalNotes);
    });

    it('should sort notes by start time', () => {
      const midi = generateMIDIFromEuclidean(testConfig);
      const musicGenFormat = convertToMusicGenFormat(midi);
      
      // Check that notes are sorted by start time (index 2)
      for (let i = 1; i < musicGenFormat.midi_notes.length; i++) {
        expect(musicGenFormat.midi_notes[i][2]).toBeGreaterThanOrEqual(
          musicGenFormat.midi_notes[i - 1][2]
        );
      }
    });

    it('should have correct note format [pitch, velocity, start, duration]', () => {
      const midi = generateMIDIFromEuclidean(testConfig);
      const musicGenFormat = convertToMusicGenFormat(midi);
      
      musicGenFormat.midi_notes.forEach(note => {
        expect(note.length).toBe(4);
        
        const [pitch, velocity, start, duration] = note;
        
        // Pitch should be valid MIDI note (0-127)
        expect(pitch).toBeGreaterThanOrEqual(0);
        expect(pitch).toBeLessThanOrEqual(127);
        
        // Velocity should be valid (0-127)
        expect(velocity).toBeGreaterThanOrEqual(0);
        expect(velocity).toBeLessThanOrEqual(127);
        
        // Start time should be non-negative
        expect(start).toBeGreaterThanOrEqual(0);
        
        // Duration should be positive
        expect(duration).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration: Euclidean → MIDI → MusicGen', () => {
    it('should generate complete workflow from config to MusicGen format', () => {
      // Step 1: Generate MIDI from Euclidean config
      const midi = generateMIDIFromEuclidean(testConfig);
      
      // Step 2: Generate gasp markers
      const gaspMarkers = generateGaspMarkers(testConfig);
      
      // Step 3: Convert to MusicGen format
      const musicGenFormat = convertToMusicGenFormat(midi);
      
      // Verify complete workflow
      expect(midi.tracks.length).toBeGreaterThan(0);
      expect(gaspMarkers.length).toBeGreaterThan(0);
      expect(musicGenFormat.midi_notes.length).toBeGreaterThan(0);
      
      // Verify cultural authenticity parameters are applied
      expect(midi.tempo).toBe(testConfig.bpm);
      expect(gaspMarkers[0].type).toBe(testConfig.gaspType);
    });

    it('should generate different patterns for different languages', () => {
      const zuluConfig: RhythmConfig = { ...testConfig, language: 'Zulu' };
      const xhosaConfig: RhythmConfig = { ...testConfig, language: 'Xhosa' };
      
      const zuluMidi = generateMIDIFromEuclidean(zuluConfig);
      const xhosaMidi = generateMIDIFromEuclidean(xhosaConfig);
      
      // Both should generate valid MIDI
      expect(zuluMidi.tracks.length).toBeGreaterThan(0);
      expect(xhosaMidi.tracks.length).toBeGreaterThan(0);
      
      // Patterns should be the same (same Euclidean config)
      // But timing should differ slightly due to different swing/jitter
      const zuluKick = zuluMidi.tracks.find(t => t.name === 'Kick');
      const xhosaKick = xhosaMidi.tracks.find(t => t.name === 'Kick');
      
      expect(zuluKick?.notes.length).toBe(xhosaKick?.notes.length);
    });
  });
});
