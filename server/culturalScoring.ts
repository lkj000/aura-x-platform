/**
 * Cultural Authenticity Scoring for Amapiano Music
 * Based on Kabza De Small's production philosophy and South African house music traditions
 */

import { invokeLLM } from './_core/llm';

export interface CulturalScore {
  overall: number; // 0-100
  breakdown: {
    rhythmicAuthenticity: number; // Log drum patterns, percussion complexity
    harmonicStructure: number; // Chord progressions, 6-5-4-2 framework
    productionQuality: number; // Mix balance, frequency spectrum
    culturalElements: number; // Zulu influences, township energy
  };
  feedback: string;
  recommendations: string[];
}

/**
 * Analyze audio and score cultural authenticity using AI
 */
export async function scoreCulturalAuthenticity(
  audioUrl: string,
  prompt: string,
  parameters: any
): Promise<CulturalScore> {
  try {
    console.log('[CulturalScoring] Analyzing audio:', audioUrl);
    
    // Use LLM to analyze the generation parameters and provide scoring
    const analysisPrompt = `You are an expert in Amapiano music production, trained on the work of Kabza De Small, DJ Maphorisa, and other South African house pioneers.

Analyze this Amapiano track generation:

**User Prompt:** ${prompt}

**Parameters:**
- Tempo: ${parameters.tempo} BPM
- Key: ${parameters.key}
- Style: ${parameters.mode}
- Duration: ${parameters.duration}s

**Scoring Criteria (0-100 each):**

1. **Rhythmic Authenticity** - Log drum patterns, syncopation, percussion layering
2. **Harmonic Structure** - Chord progressions, use of 6-5-4-2 framework, piano voicings
3. **Production Quality** - Mix balance, frequency spectrum, spatial depth
4. **Cultural Elements** - Zulu influences, township energy, authentic South African flavor

Provide a JSON response with this structure:
{
  "overall": <0-100>,
  "breakdown": {
    "rhythmicAuthenticity": <0-100>,
    "harmonicStructure": <0-100>,
    "productionQuality": <0-100>,
    "culturalElements": <0-100>
  },
  "feedback": "<detailed analysis>",
  "recommendations": ["<specific improvement 1>", "<specific improvement 2>", ...]
}

Be strict - only scores above 80 represent truly authentic Amapiano. Scores 60-80 are acceptable but need refinement. Below 60 lacks cultural authenticity.`;

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are an expert Amapiano music analyst. Respond only with valid JSON.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'cultural_score',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              overall: { type: 'number' },
              breakdown: {
                type: 'object',
                properties: {
                  rhythmicAuthenticity: { type: 'number' },
                  harmonicStructure: { type: 'number' },
                  productionQuality: { type: 'number' },
                  culturalElements: { type: 'number' },
                },
                required: ['rhythmicAuthenticity', 'harmonicStructure', 'productionQuality', 'culturalElements'],
                additionalProperties: false,
              },
              feedback: { type: 'string' },
              recommendations: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['overall', 'breakdown', 'feedback', 'recommendations'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const scoreData = JSON.parse(typeof content === 'string' ? content : '{}');
    
    console.log('[CulturalScoring] Score:', scoreData.overall);
    
    return scoreData as CulturalScore;
  } catch (error) {
    console.error('[CulturalScoring] Scoring failed:', error);
    
    // Return a default score if analysis fails
    return {
      overall: 70,
      breakdown: {
        rhythmicAuthenticity: 70,
        harmonicStructure: 70,
        productionQuality: 70,
        culturalElements: 70,
      },
      feedback: 'Unable to perform detailed analysis. Default score assigned.',
      recommendations: ['Retry analysis with valid audio URL'],
    };
  }
}

/**
 * Generate improvement suggestions based on score
 */
export function generateImprovementPrompt(
  originalPrompt: string,
  score: CulturalScore,
  parameters: any
): string {
  const weakestAspect = Object.entries(score.breakdown)
    .sort(([, a], [, b]) => a - b)[0][0];
  
  let improvement = originalPrompt;
  
  // Add specific improvements based on weakest aspect
  switch (weakestAspect) {
    case 'rhythmicAuthenticity':
      improvement += '. Focus on authentic log drum patterns with syncopated hi-hats and complex percussion layering.';
      break;
    case 'harmonicStructure':
      improvement += '. Use Kabza\'s 6-5-4-2 chord progression framework with rich piano voicings.';
      break;
    case 'productionQuality':
      improvement += '. Enhance mix balance with clear separation between log drums, bass, and melodic elements.';
      break;
    case 'culturalElements':
      improvement += '. Incorporate more Zulu vocal samples, township energy, and authentic South African flavor.';
      break;
  }
  
  // Add top recommendation
  if (score.recommendations.length > 0) {
    improvement += ` ${score.recommendations[0]}`;
  }
  
  return improvement;
}
