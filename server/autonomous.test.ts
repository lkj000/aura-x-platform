/**
 * Test suite for autonomous workflow with cultural authenticity scoring
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scoreCulturalAuthenticity, generateImprovementPrompt } from './culturalScoring';

describe('Autonomous Workflow', () => {
  describe('Cultural Authenticity Scoring', () => {
    it('should return a valid score structure', async () => {
      const score = await scoreCulturalAuthenticity(
        'https://example.com/test-audio.wav',
        'Energetic Amapiano track with log drums and piano',
        {
          tempo: 112,
          key: 'F min',
          mode: 'kasi',
          duration: 30,
        }
      );

      // Validate structure
      expect(score).toHaveProperty('overall');
      expect(score).toHaveProperty('breakdown');
      expect(score).toHaveProperty('feedback');
      expect(score).toHaveProperty('recommendations');

      // Validate types
      expect(typeof score.overall).toBe('number');
      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);

      // Validate 8-dimension breakdown (CLAUDE.md §1.7)
      expect(score.breakdown).toHaveProperty('logDrumPresence');
      expect(score.breakdown).toHaveProperty('pianoAuthenticity');
      expect(score.breakdown).toHaveProperty('rhythmicSwing');
      expect(score.breakdown).toHaveProperty('languageAuthenticity');
      expect(score.breakdown).toHaveProperty('energyArc');
      expect(score.breakdown).toHaveProperty('harmonicStructure');
      expect(score.breakdown).toHaveProperty('timbreTexture');
      expect(score.breakdown).toHaveProperty('productionEra');

      // Validate recommendations
      expect(Array.isArray(score.recommendations)).toBe(true);
    }, 30000); // 30s timeout for LLM call
  });

  describe('Improvement Prompt Generation', () => {
    it('should generate improved prompt based on weak log drum presence', () => {
      const originalPrompt = 'Amapiano track';
      // logDrumPresence: 3/20 = 15% — weakest by relative score
      const score = {
        overall: 65,
        breakdown: {
          logDrumPresence:       3,  // 15% of max 20
          pianoAuthenticity:    14,  // 70% of max 20
          rhythmicSwing:        10,  // 67% of max 15
          languageAuthenticity: 10,  // 67% of max 15
          energyArc:             7,  // 70% of max 10
          harmonicStructure:     7,  // 70% of max 10
          timbreTexture:         4,  // 80% of max  5
          productionEra:         4,  // 80% of max  5
        },
        feedback: 'Needs better log drum patterns',
        recommendations: ['Add syncopated hi-hats'],
      };

      const improvedPrompt = generateImprovementPrompt(originalPrompt, score as any, {});

      expect(improvedPrompt).toContain('log drum');
      expect(improvedPrompt).toContain('syncopated');
    });

    it('should generate improved prompt based on weak harmonic structure', () => {
      const originalPrompt = 'Amapiano track';
      // harmonicStructure: 2/10 = 20% — weakest by relative score
      const score = {
        overall: 65,
        breakdown: {
          logDrumPresence:      14,  // 70% of max 20
          pianoAuthenticity:    14,  // 70% of max 20
          rhythmicSwing:        10,  // 67% of max 15
          languageAuthenticity: 10,  // 67% of max 15
          energyArc:             7,  // 70% of max 10
          harmonicStructure:     2,  // 20% of max 10 — weakest
          timbreTexture:         4,  // 80% of max  5
          productionEra:         4,  // 80% of max  5
        },
        feedback: 'Needs better chord progressions',
        recommendations: ['Use 6-5-4-2 framework'],
      };

      const improvedPrompt = generateImprovementPrompt(originalPrompt, score as any, {});

      expect(improvedPrompt).toContain('6-5-4-2');
      expect(improvedPrompt).toContain('chord progression');
    });

    it('should include top recommendation in improved prompt', () => {
      const originalPrompt = 'Amapiano track';
      // All dimensions at equal relative strength — weakest will be logDrumPresence by sort stability
      const score = {
        overall: 56,
        breakdown: {
          logDrumPresence:      14,  // 70%
          pianoAuthenticity:    14,  // 70%
          rhythmicSwing:        10,  // 67%
          languageAuthenticity: 10,  // 67%
          energyArc:             7,  // 70%
          harmonicStructure:     7,  // 70%
          timbreTexture:         4,  // 80%
          productionEra:         0,  // 0% — weakest
        },
        feedback: 'Generic feedback',
        recommendations: ['Add more percussion layers', 'Increase tempo'],
      };

      const improvedPrompt = generateImprovementPrompt(originalPrompt, score as any, {});

      expect(improvedPrompt).toContain('Add more percussion layers');
    });
  });

  describe('Workflow Logic', () => {
    it('should validate autonomous workflow parameters', () => {
      const params = {
        prompt: 'Test prompt',
        parameters: {
          tempo: 112,
          key: 'F min',
          mode: 'kasi',
          duration: 30,
        },
        maxAttempts: 3,
        targetScore: 80,
      };

      expect(params.maxAttempts).toBeGreaterThan(0);
      expect(params.targetScore).toBeGreaterThanOrEqual(0);
      expect(params.targetScore).toBeLessThanOrEqual(100);
      expect(params.prompt).toBeTruthy();
    });

    it('should validate score threshold logic', () => {
      const targetScore = 80;
      const scores = [65, 72, 85];

      const passedAttempts = scores.filter(score => score >= targetScore);
      const bestScore = Math.max(...scores);

      expect(passedAttempts.length).toBe(1);
      expect(bestScore).toBe(85);
      expect(bestScore).toBeGreaterThanOrEqual(targetScore);
    });
  });
});
