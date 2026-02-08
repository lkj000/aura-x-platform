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

      // Validate breakdown
      expect(score.breakdown).toHaveProperty('rhythmicAuthenticity');
      expect(score.breakdown).toHaveProperty('harmonicStructure');
      expect(score.breakdown).toHaveProperty('productionQuality');
      expect(score.breakdown).toHaveProperty('culturalElements');

      // Validate recommendations
      expect(Array.isArray(score.recommendations)).toBe(true);
    }, 30000); // 30s timeout for LLM call
  });

  describe('Improvement Prompt Generation', () => {
    it('should generate improved prompt based on weak rhythmic authenticity', () => {
      const originalPrompt = 'Amapiano track';
      const score = {
        overall: 65,
        breakdown: {
          rhythmicAuthenticity: 50,
          harmonicStructure: 70,
          productionQuality: 70,
          culturalElements: 70,
        },
        feedback: 'Needs better log drum patterns',
        recommendations: ['Add syncopated hi-hats'],
      };

      const improvedPrompt = generateImprovementPrompt(originalPrompt, score, {});

      expect(improvedPrompt).toContain('log drum patterns');
      expect(improvedPrompt).toContain('syncopated');
    });

    it('should generate improved prompt based on weak harmonic structure', () => {
      const originalPrompt = 'Amapiano track';
      const score = {
        overall: 65,
        breakdown: {
          rhythmicAuthenticity: 70,
          harmonicStructure: 50,
          productionQuality: 70,
          culturalElements: 70,
        },
        feedback: 'Needs better chord progressions',
        recommendations: ['Use 6-5-4-2 framework'],
      };

      const improvedPrompt = generateImprovementPrompt(originalPrompt, score, {});

      expect(improvedPrompt).toContain('6-5-4-2');
      expect(improvedPrompt).toContain('chord progression');
    });

    it('should include top recommendation in improved prompt', () => {
      const originalPrompt = 'Amapiano track';
      const score = {
        overall: 65,
        breakdown: {
          rhythmicAuthenticity: 60,
          harmonicStructure: 60,
          productionQuality: 60,
          culturalElements: 60,
        },
        feedback: 'Generic feedback',
        recommendations: ['Add more percussion layers', 'Increase tempo'],
      };

      const improvedPrompt = generateImprovementPrompt(originalPrompt, score, {});

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
