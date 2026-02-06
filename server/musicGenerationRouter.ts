/**
 * Music Generation Router with Cultural Authentication
 * Connects Euclidean rhythm patterns to MusicGen via MIDI conditioning
 */

import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import { generateMIDIFromEuclidean, generateGaspMarkers, convertToMusicGenFormat } from './midiGenerator';
import type { RhythmConfig } from '../shared/euclideanRhythm';

// ============================================================================
// Input Schemas
// ============================================================================

const CulturalGenerationInput = z.object({
  // Euclidean rhythm configuration
  euclidean: z.object({
    k: z.number().min(0).max(16).describe('Number of pulses'),
    n: z.number().min(1).max(32).describe('Total steps'),
    rotation: z.number().optional().describe('Pattern rotation offset'),
  }),
  
  // Cultural parameters
  language: z.enum([
    'Zulu', 'Xhosa', 'Tsonga', 'Sotho (North)', 'Sotho (South)',
    'Tswana', 'Venda', 'Ndebele', 'Swazi', 'English (SA)', 'Afrikaans'
  ]).describe('South African language for swing characteristics'),
  
  gaspType: z.enum([
    'classic', 'double', 'stutter', 'reverse', 'buildup',
    'breakdown', 'selective', 'layered', 'delayed', 'subtle'
  ]).optional().default('classic').describe('Gasp type'),
  
  // Music parameters
  bpm: z.number().min(80).max(140).optional().default(112).describe('Tempo in BPM'),
  bars: z.number().min(4).max(32).optional().default(16).describe('Number of bars'),
  
  // Generation parameters
  prompt: z.string().min(10).max(500).describe('Text description of the music'),
  duration: z.number().min(10).max(120).optional().default(30).describe('Duration in seconds'),
  
  // Optional advanced parameters
  temperature: z.number().min(0).max(2).optional().default(1.0).describe('Creativity level'),
  topK: z.number().min(0).max(500).optional().default(250).describe('Sampling diversity'),
  topP: z.number().min(0).max(1).optional().default(0.9).describe('Nucleus sampling'),
});

// ============================================================================
// Router
// ============================================================================

export const musicGenerationRouter = router({
  /**
   * Generate music with cultural authentication
   * Uses Euclidean patterns + linguistic swing + gasp markers
   */
  generateWithCulturalAuth: publicProcedure
    .input(CulturalGenerationInput)
    .mutation(async ({ input }) => {
      // Step 1: Generate MIDI from Euclidean configuration
      const rhythmConfig: RhythmConfig = {
        euclidean: input.euclidean,
        language: input.language,
        gaspType: input.gaspType,
        bpm: input.bpm,
        bars: input.bars,
      };
      
      const midiData = generateMIDIFromEuclidean(rhythmConfig);
      const gaspMarkers = generateGaspMarkers(rhythmConfig);
      const musicGenFormat = convertToMusicGenFormat(midiData);
      
      // Step 2: Call Modal.com orchestration agent for music generation
      // This will be implemented in Phase 2
      const modalEndpoint = process.env.MODAL_BASE_URL;
      const modalApiKey = process.env.MODAL_API_KEY;
      
      if (!modalEndpoint || !modalApiKey) {
        throw new Error('Modal.com configuration missing. Please set MODAL_BASE_URL and MODAL_API_KEY environment variables.');
      }
      
      try {
        // Call Modal.com endpoint with MIDI conditioning
        const response = await fetch(`${modalEndpoint}/generate-with-midi`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${modalApiKey}`,
          },
          body: JSON.stringify({
            prompt: input.prompt,
            midi_conditioning: musicGenFormat,
            gasp_markers: gaspMarkers,
            duration: input.duration,
            temperature: input.temperature,
            top_k: input.topK,
            top_p: input.topP,
            cultural_params: {
              language: input.language,
              swing_percent: midiData.tempo, // This will be extracted from rhythm
              gasp_type: input.gaspType,
            },
          }),
        });
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Modal.com generation failed: ${error}`);
        }
        
        const result = await response.json();
        
        return {
          success: true,
          audioUrl: result.audio_url,
          midiData: musicGenFormat,
          gaspMarkers,
          culturalParams: {
            language: input.language,
            euclideanPattern: `E(${input.euclidean.k},${input.euclidean.n})`,
            gaspType: input.gaspType,
            bpm: input.bpm,
          },
          qualityScore: result.quality_score,
          generationId: result.generation_id,
        };
      } catch (error) {
        console.error('[Cultural Generation Error]', error);
        throw new Error(`Failed to generate music: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
  
  /**
   * Get MIDI preview without full generation
   * Useful for pattern audition in Pattern Library
   */
  getMIDIPreview: publicProcedure
    .input(z.object({
      euclidean: z.object({
        k: z.number(),
        n: z.number(),
        rotation: z.number().optional(),
      }),
      language: z.string(),
      gaspType: z.string().optional(),
      bpm: z.number().optional(),
      bars: z.number().optional(),
    }))
    .query(({ input }) => {
      const rhythmConfig: RhythmConfig = {
        euclidean: input.euclidean,
        language: input.language,
        gaspType: input.gaspType,
        bpm: input.bpm || 112,
        bars: input.bars || 4,
      };
      
      const midiData = generateMIDIFromEuclidean(rhythmConfig);
      const gaspMarkers = generateGaspMarkers(rhythmConfig);
      const musicGenFormat = convertToMusicGenFormat(midiData);
      
      return {
        midiData: musicGenFormat,
        gaspMarkers,
        pattern: `E(${input.euclidean.k},${input.euclidean.n})`,
        totalNotes: musicGenFormat.midi_notes.length,
        duration: midiData.duration,
      };
    }),
  
  /**
   * Get all available cultural presets
   * Returns predefined Euclidean patterns for each subgenre/region
   */
  getCulturalPresets: publicProcedure
    .query(() => {
      return {
        presets: [
          {
            id: 'classic-amapiano',
            name: 'Classic Amapiano',
            euclidean: { k: 5, n: 16, rotation: 0 },
            language: 'Zulu',
            gaspType: 'classic',
            bpm: 112,
            description: 'Traditional Amapiano rhythm with Zulu swing',
          },
          {
            id: 'gauteng-deep',
            name: 'Gauteng Deep House',
            euclidean: { k: 3, n: 8, rotation: 0 },
            language: 'Sotho (South)',
            gaspType: 'subtle',
            bpm: 118,
            description: 'Deep house variation from Gauteng region',
          },
          {
            id: 'durban-gqom',
            name: 'Durban Gqom Fusion',
            euclidean: { k: 7, n: 16, rotation: 2 },
            language: 'Zulu',
            gaspType: 'stutter',
            bpm: 120,
            description: 'Gqom-influenced Amapiano from Durban',
          },
          {
            id: 'cape-town-soulful',
            name: 'Cape Town Soulful',
            euclidean: { k: 5, n: 16, rotation: 4 },
            language: 'Xhosa',
            gaspType: 'delayed',
            bpm: 110,
            description: 'Soulful Amapiano with Xhosa characteristics',
          },
          {
            id: 'pretoria-private-school',
            name: 'Pretoria Private School',
            euclidean: { k: 4, n: 12, rotation: 0 },
            language: 'Afrikaans',
            gaspType: 'selective',
            bpm: 115,
            description: 'Melodic Amapiano from Pretoria',
          },
          {
            id: 'limpopo-traditional',
            name: 'Limpopo Traditional',
            euclidean: { k: 6, n: 16, rotation: 1 },
            language: 'Venda',
            gaspType: 'layered',
            bpm: 108,
            description: 'Traditional rhythms from Limpopo',
          },
        ],
      };
    }),
});
