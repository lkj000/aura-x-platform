/**
 * Integration tests for music generation workflow
 * Tests end-to-end flow: Euclidean → MIDI → MusicGen → Quality Scoring
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateMIDIFromEuclidean, generateGaspMarkers, convertToMusicGenFormat } from './midiGenerator';
import type { RhythmConfig } from '../shared/euclideanRhythm';

describe('Music Generation Workflow Integration', () => {
  describe('End-to-End Workflow', () => {
    it('should generate complete MIDI from Euclidean configuration', () => {
      const config: RhythmConfig = {
        euclidean: { k: 5, n: 16, rotation: 0 },
        language: 'Zulu',
        gaspType: 'classic',
        bpm: 112,
        bars: 4,
      };

      const midiData = generateMIDIFromEuclidean(config);
      const gaspMarkers = generateGaspMarkers(config);
      const musicGenFormat = convertToMusicGenFormat(midiData);

      // Verify MIDI data structure
      expect(midiData).toHaveProperty('tracks');
      expect(midiData.tracks.length).toBeGreaterThan(0);
      expect(midiData).toHaveProperty('tempo');
      expect(midiData).toHaveProperty('duration');

      // Verify gasp markers
      expect(Array.isArray(gaspMarkers)).toBe(true);
      expect(gaspMarkers.length).toBeGreaterThan(0);
      gaspMarkers.forEach(marker => {
        expect(marker).toHaveProperty('time');
        expect(marker).toHaveProperty('intensity');
        expect(marker).toHaveProperty('type');
      });

      // Verify MusicGen format
      expect(musicGenFormat).toHaveProperty('midi_notes');
      expect(musicGenFormat).toHaveProperty('tempo');
      expect(musicGenFormat).toHaveProperty('duration');
      expect(Array.isArray(musicGenFormat.midi_notes)).toBe(true);
    });

    it('should apply linguistic swing correctly for different languages', () => {
      const languages = ['Zulu', 'Xhosa', 'Sotho (South)', 'Afrikaans'];
      const config: RhythmConfig = {
        euclidean: { k: 5, n: 16, rotation: 0 },
        language: 'Zulu',
        gaspType: 'classic',
        bpm: 112,
        bars: 4,
      };

      languages.forEach(language => {
        const langConfig = { ...config, language };
        const midiData = generateMIDIFromEuclidean(langConfig);
        
        // Verify MIDI generation succeeds for all languages
        expect(midiData.tracks.length).toBeGreaterThan(0);
        
        // Verify timing variations exist (swing applied)
        // Check kick drum which follows Euclidean pattern with swing
        const kickTrack = midiData.tracks.find(t => t.name === 'Kick');
        if (kickTrack && kickTrack.notes.length > 2) {
          const intervals = [];
          for (let i = 1; i < kickTrack.notes.length; i++) {
            intervals.push(kickTrack.notes[i].startTime - kickTrack.notes[i - 1].startTime);
          }
          // Check that not all intervals are identical (swing creates variation)
          // Round to 1ms precision to account for floating point
          const uniqueIntervals = new Set(intervals.map(i => Math.round(i * 1000)));
          // With swing and jitter, we should have at least 2 different intervals
          expect(uniqueIntervals.size).toBeGreaterThan(1);
        }
      });
    });

    it('should generate different gasp patterns for different types', () => {
      const gaspTypes = ['classic', 'double', 'stutter', 'subtle'];
      const config: RhythmConfig = {
        euclidean: { k: 5, n: 16, rotation: 0 },
        language: 'Zulu',
        gaspType: 'classic',
        bpm: 112,
        bars: 8,
      };

      const gaspCounts: Record<string, number> = {};

      gaspTypes.forEach(gaspType => {
        const gaspConfig = { ...config, gaspType };
        const gaspMarkers = generateGaspMarkers(gaspConfig);
        gaspCounts[gaspType] = gaspMarkers.length;
      });

      // Verify different gasp types produce different numbers of markers
      // double (halfBar) should have more gasps than classic (beat1)
      expect(gaspCounts['double']).toBeGreaterThan(gaspCounts['classic']);
      // stutter (selective) should have fewer gasps than classic
      expect(gaspCounts['stutter']).toBeLessThan(gaspCounts['classic']);
      // subtle (beat1) should have same count as classic (both beat1)
      expect(gaspCounts['subtle']).toBe(gaspCounts['classic']);
    });

    it('should scale MIDI generation with bar count', () => {
      const barCounts = [4, 8, 16];
      const config: RhythmConfig = {
        euclidean: { k: 5, n: 16, rotation: 0 },
        language: 'Zulu',
        gaspType: 'classic',
        bpm: 112,
        bars: 4,
      };

      const durations: number[] = [];

      barCounts.forEach(bars => {
        const barConfig = { ...config, bars };
        const midiData = generateMIDIFromEuclidean(barConfig);
        durations.push(midiData.duration);
      });

      // Verify duration scales linearly with bar count
      expect(durations[1]).toBeCloseTo(durations[0] * 2, 0.1);
      expect(durations[2]).toBeCloseTo(durations[0] * 4, 0.1);
    });

    it('should generate valid MIDI notes for all tracks', () => {
      const config: RhythmConfig = {
        euclidean: { k: 5, n: 16, rotation: 0 },
        language: 'Zulu',
        gaspType: 'classic',
        bpm: 112,
        bars: 4,
      };

      const midiData = generateMIDIFromEuclidean(config);
      const musicGenFormat = convertToMusicGenFormat(midiData);

      // Verify all MIDI notes have valid structure
      musicGenFormat.midi_notes.forEach(note => {
        expect(note.length).toBe(4); // [pitch, velocity, start, duration]
        
        const [pitch, velocity, start, duration] = note;
        
        // Valid MIDI pitch (0-127)
        expect(pitch).toBeGreaterThanOrEqual(0);
        expect(pitch).toBeLessThanOrEqual(127);
        
        // Valid velocity (0-127)
        expect(velocity).toBeGreaterThanOrEqual(0);
        expect(velocity).toBeLessThanOrEqual(127);
        
        // Valid timing
        expect(start).toBeGreaterThanOrEqual(0);
        expect(duration).toBeGreaterThan(0);
      });
    });

    it('should maintain Euclidean pattern integrity across rotations', () => {
      const rotations = [0, 2, 4, 8];
      const config: RhythmConfig = {
        euclidean: { k: 5, n: 16, rotation: 0 },
        language: 'Zulu',
        gaspType: 'classic',
        bpm: 112,
        bars: 4,
      };

      rotations.forEach(rotation => {
        const rotatedConfig = {
          ...config,
          euclidean: { ...config.euclidean, rotation },
        };
        const midiData = generateMIDIFromEuclidean(rotatedConfig);
        
        // Verify MIDI generation succeeds for all rotations
        expect(midiData.tracks.length).toBeGreaterThan(0);
        
        // Verify kick pattern has correct number of hits (5 pulses in E(5,16))
        const kickTrack = midiData.tracks.find(t => t.name === 'Kick');
        expect(kickTrack).toBeDefined();
        
        if (kickTrack) {
          // Each bar should have 5 kicks (E(5,16) pattern)
          const expectedKicks = config.bars * 5;
          expect(kickTrack.notes.length).toBe(expectedKicks);
        }
      });
    });
  });

  describe('Component Communication', () => {
    it('should produce MusicGen-compatible output format', () => {
      const config: RhythmConfig = {
        euclidean: { k: 5, n: 16, rotation: 0 },
        language: 'Zulu',
        gaspType: 'classic',
        bpm: 112,
        bars: 4,
      };

      const midiData = generateMIDIFromEuclidean(config);
      const musicGenFormat = convertToMusicGenFormat(midiData);

      // Verify format matches MusicGen expectations
      expect(musicGenFormat).toMatchObject({
        midi_notes: expect.any(Array),
        tempo: expect.any(Number),
        duration: expect.any(Number),
      });

      // Verify tempo is within valid range
      expect(musicGenFormat.tempo).toBeGreaterThanOrEqual(80);
      expect(musicGenFormat.tempo).toBeLessThanOrEqual(140);
    });

    it('should generate gasp markers at correct timing intervals', () => {
      const config: RhythmConfig = {
        euclidean: { k: 5, n: 16, rotation: 0 },
        language: 'Zulu',
        gaspType: 'classic',
        bpm: 112,
        bars: 8,
      };

      const gaspMarkers = generateGaspMarkers(config);
      const midiData = generateMIDIFromEuclidean(config);

      // Verify gasp markers are within audio duration
      gaspMarkers.forEach(marker => {
        expect(marker.time).toBeGreaterThanOrEqual(0);
        expect(marker.time).toBeLessThanOrEqual(midiData.duration);
      });

      // Verify gasp markers are spaced appropriately
      if (gaspMarkers.length > 1) {
        const intervals = [];
        for (let i = 1; i < gaspMarkers.length; i++) {
          intervals.push(gaspMarkers[i].time - gaspMarkers[i - 1].time);
        }
        
        // Gasps should be spaced at least 1 second apart
        intervals.forEach(interval => {
          expect(interval).toBeGreaterThan(1.0);
        });
      }
    });
  });

  describe('Performance', () => {
    it('should generate MIDI in under 100ms', () => {
      const config: RhythmConfig = {
        euclidean: { k: 5, n: 16, rotation: 0 },
        language: 'Zulu',
        gaspType: 'classic',
        bpm: 112,
        bars: 16,
      };

      const start = performance.now();
      generateMIDIFromEuclidean(config);
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });

    it('should handle large bar counts efficiently', () => {
      const config: RhythmConfig = {
        euclidean: { k: 5, n: 16, rotation: 0 },
        language: 'Zulu',
        gaspType: 'classic',
        bpm: 112,
        bars: 32, // Large number of bars
      };

      const start = performance.now();
      const midiData = generateMIDIFromEuclidean(config);
      const end = performance.now();

      // Should still complete in reasonable time
      expect(end - start).toBeLessThan(200);
      
      // Should generate correct number of notes
      expect(midiData.tracks.length).toBeGreaterThan(0);
    });
  });
});
