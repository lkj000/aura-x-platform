import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Cultural Authenticity Router
 * 
 * Provides endpoints for South African linguistic alignment,
 * regional swing variations, and Amapiano gasp taxonomy.
 */

// Input schemas
const GeneratePatternInput = z.object({
  language: z.enum(['zulu', 'xhosa', 'tsonga', 'tswana', 'sotho_north', 'sotho_south', 'english_sa', 'afrikaans', 'venda', 'ndebele', 'swazi']),
  region: z.enum(['gauteng_jhb', 'gauteng_pretoria', 'kzn_durban', 'western_cape', 'eastern_cape', 'free_state', 'limpopo', 'mpumalanga', 'north_west', 'northern_cape']),
  gaspType: z.enum(['classic', 'double', 'half_bar', 'full_bar', 'stutter', 'reverse', 'progressive', 'selective', 'echo', 'buildup']),
  gaspIntensity: z.enum(['full', 'heavy', 'moderate', 'light', 'subtle']),
  bars: z.number().int().min(1).max(16).default(4),
});

const ScoreAuthenticityInput = z.object({
  notes: z.array(z.number()),
  timing: z.array(z.number()),
  velocity: z.array(z.number()),
  duration: z.array(z.number()),
  language: z.string(),
  region: z.string(),
  gaspType: z.string(),
});

/**
 * Execute Python script and return JSON result
 */
async function executePythonScript(scriptName: string, args: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'python', scriptName);
    const pythonProcess = spawn('python3', [scriptPath, JSON.stringify(args)]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${stderr}`));
      } else {
        try {
          // Extract JSON from stdout (may have other output)
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            resolve(JSON.parse(jsonMatch[0]));
          } else {
            reject(new Error(`No JSON output from Python script: ${stdout}`));
          }
        } catch (err) {
          reject(new Error(`Failed to parse JSON: ${err}`));
        }
      }
    });
  });
}

export const culturalRouter = router({
  /**
   * Generate culturally authentic Amapiano pattern
   */
  generatePattern: publicProcedure
    .input(GeneratePatternInput)
    .mutation(async ({ input }) => {
      try {
        const result = await executePythonScript('generate_authentic_pattern.py', {
          language: input.language,
          region: input.region,
          gasp_type: input.gaspType,
          gasp_intensity: input.gaspIntensity,
          bars: input.bars,
        });
        
        return {
          success: true,
          pattern: result.pattern,
          authenticity: result.authenticity,
          recommendations: result.recommendations || [],
        };
      } catch (error) {
        console.error('[Cultural] Pattern generation failed:', error);
        throw new Error(`Pattern generation failed: ${error}`);
      }
    }),

  /**
   * Score cultural authenticity of existing pattern
   */
  scoreAuthenticity: publicProcedure
    .input(ScoreAuthenticityInput)
    .mutation(async ({ input }) => {
      try {
        const result = await executePythonScript('authenticity_scorer.py', {
          notes: input.notes,
          timing: input.timing,
          velocity: input.velocity,
          duration: input.duration,
          language: input.language,
          region: input.region,
          gasp_type: input.gaspType,
        });
        
        return {
          success: true,
          score: result.overall_score,
          grade: result.grade,
          linguistic_score: result.linguistic_score,
          regional_score: result.regional_score,
          gasp_score: result.gasp_score,
          recommendations: result.recommendations || [],
        };
      } catch (error) {
        console.error('[Cultural] Authenticity scoring failed:', error);
        throw new Error(`Authenticity scoring failed: ${error}`);
      }
    }),

  /**
   * Get language profile details
   */
  getLanguageProfile: publicProcedure
    .input(z.object({ language: z.string() }))
    .query(async ({ input }) => {
      try {
        const result = await executePythonScript('linguistic_alignment.py', {
          action: 'get_profile',
          language: input.language,
        });
        
        return {
          success: true,
          profile: result,
        };
      } catch (error) {
        console.error('[Cultural] Language profile fetch failed:', error);
        throw new Error(`Language profile fetch failed: ${error}`);
      }
    }),

  /**
   * Get regional swing profile details
   */
  getRegionalProfile: publicProcedure
    .input(z.object({ region: z.string() }))
    .query(async ({ input }) => {
      try {
        const result = await executePythonScript('regional_swing.py', {
          action: 'get_profile',
          region: input.region,
        });
        
        return {
          success: true,
          profile: result,
        };
      } catch (error) {
        console.error('[Cultural] Regional profile fetch failed:', error);
        throw new Error(`Regional profile fetch failed: ${error}`);
      }
    }),

  /**
   * Get gasp type profile details
   */
  getGaspProfile: publicProcedure
    .input(z.object({ gaspType: z.string() }))
    .query(async ({ input }) => {
      try {
        const result = await executePythonScript('gasp_taxonomy.py', {
          action: 'get_profile',
          gasp_type: input.gaspType,
        });
        
        return {
          success: true,
          profile: result,
        };
      } catch (error) {
        console.error('[Cultural] Gasp profile fetch failed:', error);
        throw new Error(`Gasp profile fetch failed: ${error}`);
      }
    }),
});
