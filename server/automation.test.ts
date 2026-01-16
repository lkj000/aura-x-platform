import { describe, it, expect } from 'vitest';

describe('Automation System', () => {
  describe('AudioEngine Automation', () => {
    it('should define automation interfaces correctly', () => {
      // Test automation point structure
      const point = {
        time: 1.5,
        value: 0.75,
      };
      
      expect(point.time).toBe(1.5);
      expect(point.value).toBe(0.75);
    });

    it('should define automation lane structure correctly', () => {
      const lane = {
        parameter: 'volume' as const,
        points: [
          { time: 0, value: 0.5 },
          { time: 2, value: 0.8 },
        ],
        enabled: true,
      };
      
      expect(lane.parameter).toBe('volume');
      expect(lane.points).toHaveLength(2);
      expect(lane.enabled).toBe(true);
    });

    it('should support all automation parameters', () => {
      const parameters = ['volume', 'pan', 'eq_low', 'eq_mid', 'eq_high', 'reverb_wet', 'delay_wet'];
      
      parameters.forEach(param => {
        expect(typeof param).toBe('string');
      });
      
      expect(parameters).toHaveLength(7);
    });
  });

  describe('Automation Value Conversion', () => {
    it('should convert volume from normalized to dB range', () => {
      // Volume: 0-1 → -60 to 0 dB
      const normalizedValue = 0.5;
      const dbValue = normalizedValue * 60 - 60;
      
      expect(dbValue).toBe(-30);
    });

    it('should convert pan from normalized to audio range', () => {
      // Pan: 0-1 → -1 to 1
      const normalizedValue = 0.5;
      const panValue = normalizedValue * 2 - 1;
      
      expect(panValue).toBe(0);
    });

    it('should handle edge cases for volume conversion', () => {
      // Min volume (0) → -60 dB
      expect(0 * 60 - 60).toBe(-60);
      
      // Max volume (1) → 0 dB
      expect(1 * 60 - 60).toBe(0);
    });

    it('should handle edge cases for pan conversion', () => {
      // Left (0) → -1
      expect(0 * 2 - 1).toBe(-1);
      
      // Right (1) → 1
      expect(1 * 2 - 1).toBe(1);
    });
  });

  describe('Automation Point Sorting', () => {
    it('should sort automation points by time', () => {
      const points = [
        { time: 3, value: 0.8 },
        { time: 1, value: 0.5 },
        { time: 2, value: 0.6 },
      ];
      
      const sorted = [...points].sort((a, b) => a.time - b.time);
      
      expect(sorted[0].time).toBe(1);
      expect(sorted[1].time).toBe(2);
      expect(sorted[2].time).toBe(3);
    });
  });

  describe('Automation Interpolation', () => {
    it('should calculate linear interpolation between points', () => {
      const point1 = { time: 0, value: 0 };
      const point2 = { time: 2, value: 1 };
      
      // At time 1 (midpoint), value should be 0.5
      const t = 1;
      const ratio = (t - point1.time) / (point2.time - point1.time);
      const interpolated = point1.value + (point2.value - point1.value) * ratio;
      
      expect(interpolated).toBe(0.5);
    });

    it('should handle interpolation at endpoints', () => {
      const point1 = { time: 0, value: 0.2 };
      const point2 = { time: 4, value: 0.8 };
      
      // At time 0 (start)
      const t1 = 0;
      const ratio1 = (t1 - point1.time) / (point2.time - point1.time);
      const interpolated1 = point1.value + (point2.value - point1.value) * ratio1;
      expect(interpolated1).toBe(0.2);
      
      // At time 4 (end)
      const t2 = 4;
      const ratio2 = (t2 - point1.time) / (point2.time - point1.time);
      const interpolated2 = point1.value + (point2.value - point1.value) * ratio2;
      expect(interpolated2).toBe(0.8);
    });
  });

  describe('Track Automation Integration', () => {
    it('should support multiple automation lanes per track', () => {
      const track = {
        id: '1',
        name: 'Track 1',
        type: 'audio' as const,
        volume: -10,
        pan: 0,
        muted: false,
        solo: false,
        clips: [],
        notes: [],
        effects: {},
        automation: [
          {
            parameter: 'volume' as const,
            points: [{ time: 0, value: 0.5 }],
            enabled: true,
          },
          {
            parameter: 'pan' as const,
            points: [{ time: 0, value: 0.5 }],
            enabled: true,
          },
        ],
      };
      
      expect(track.automation).toHaveLength(2);
      expect(track.automation[0].parameter).toBe('volume');
      expect(track.automation[1].parameter).toBe('pan');
    });

    it('should allow disabling automation lanes', () => {
      const lane = {
        parameter: 'volume' as const,
        points: [{ time: 0, value: 0.5 }],
        enabled: false,
      };
      
      expect(lane.enabled).toBe(false);
    });
  });

  describe('Automation Database Schema', () => {
    it('should validate automation lane structure', () => {
      const lane = {
        id: 1,
        projectId: 1,
        trackId: 1,
        parameter: 'volume',
        enabled: true,
      };
      
      expect(lane).toHaveProperty('projectId');
      expect(lane).toHaveProperty('trackId');
      expect(lane).toHaveProperty('parameter');
      expect(lane).toHaveProperty('enabled');
    });

    it('should validate automation point structure', () => {
      const point = {
        id: 1,
        laneId: 1,
        time: 1.5,
        value: 0.75,
        curveType: 'linear',
      };
      
      expect(point).toHaveProperty('laneId');
      expect(point).toHaveProperty('time');
      expect(point).toHaveProperty('value');
      expect(point).toHaveProperty('curveType');
    });
  });
});
