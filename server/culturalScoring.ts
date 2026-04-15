/**
 * Cultural Authenticity Scoring for Amapiano Music
 *
 * Implements the 8-dimension scoring spec from CLAUDE.md §1.7.
 * The LLM receives generation prompt/parameters and returns per-dimension
 * sub-scores that sum to 100 maximum. The cultural scoring LLM is gpt-4o
 * — do not change the model without updating test fixtures and the scoring
 * result schema (CLAUDE.md §2.1).
 *
 * Dimension weights (max points):
 *   logDrumPresence      20  — sub-bass body, timbral contract, syncopation
 *   pianoAuthenticity    20  — extended voicings, Dorian probability, chord density
 *   rhythmicSwing        15  — swing % in regional target, groove coherence, Euclidean patterns
 *   languageAuthenticity 15  — SA language, functional role, phonemic accuracy, call-and-response
 *   energyArc            10  — LUFS gradient, build section, drop boost
 *   harmonicStructure    10  — vi-V-IV-II presence, Camelot key in Amapiano range
 *   timbreTexture         5  — log drum + piano + shaker + flute/sax presence
 *   productionEra         5  — contemporary Amapiano processing (2018-present)
 *   ─────────────────────────
 *   Total               100
 */

import { invokeLLM } from './_core/llm';

export interface CulturalScoreBreakdown {
  /** Log drum sub-bass, timbral contract compliance, syncopation map — max 20 */
  logDrumPresence: number;
  /** Extended voicings, Dorian probability, chord density — max 20 */
  pianoAuthenticity: number;
  /** Swing % vs regional target, groove fingerprint coherence, Euclidean patterns — max 15 */
  rhythmicSwing: number;
  /** SA language detection, functional role, phonemic accuracy, call-and-response — max 15 */
  languageAuthenticity: number;
  /** LUFS build gradient, 3-6 dB drop boost, outro resolution — max 10 */
  energyArc: number;
  /** vi-V-IV-II progression, Camelot key in Amapiano range (4A-10A) — max 10 */
  harmonicStructure: number;
  /** log drum + piano + shaker required; flute/sax bonus — max 5 */
  timbreTexture: number;
  /** Contemporary Amapiano processing signatures (2018-present) — max 5 */
  productionEra: number;
}

export interface CulturalScore {
  /** Sum of all 8 breakdown dimensions. Range 0-100. */
  overall: number;
  breakdown: CulturalScoreBreakdown;
  /** One-sentence qualitative assessment. */
  feedback: string;
  /** Ordered list of specific, actionable improvements. */
  recommendations: string[];
}

/**
 * Analyze audio and score cultural authenticity using GPT-4o.
 *
 * Currently scores against prompt + parameters (pre-audio analysis). When
 * Modal delivers the analysed audio features via webhook, the score is
 * updated with timbral contract and groove fingerprint data.
 *
 * @param audioUrl  S3 URL of the generated audio (used for context)
 * @param prompt    User's original generation prompt
 * @param parameters  Generation parameters (tempo, key, style, duration)
 * @returns CulturalScore with 8-dimension breakdown summing to ≤100
 */
export async function scoreCulturalAuthenticity(
  audioUrl: string,
  prompt: string,
  parameters: any
): Promise<CulturalScore> {
  try {
    console.log('[CulturalScoring] Analyzing generation:', audioUrl);

    const analysisPrompt = `You are a world-class Amapiano production analyst, trained on the work of Kabza De Small, DJ Maphorisa, DBN Gogo, Daliwonga, and Kelvin Momo. You understand authentic Amapiano at the level of spectral analysis, groove fingerprints, and Zulu phonemics.

Analyze this Amapiano track generation and score each dimension:

**User Prompt:** ${prompt}

**Generation Parameters:**
- Tempo: ${parameters?.tempo ?? parameters?.bpm ?? 'not specified'} BPM (authentic range: 115-130)
- Key: ${parameters?.key ?? 'not specified'} (common Amapiano: Am, Dm, Gm, Cm, Fm)
- Style/Mode: ${parameters?.style ?? parameters?.mode ?? 'not specified'}
- Duration: ${parameters?.duration ?? 'not specified'}s

**Score each dimension with the point values shown. Be strict — 80+ overall is authentic Amapiano, 60-79 is acceptable but needs refinement, below 60 lacks cultural authenticity.**

1. **Log Drum Presence** (0-20): Sub-bass body 40-80 Hz, wood attack 180-220 Hz, syncopated pattern E(3,16) or E(5,16). The log drum is NOT the kick drum. Deduct heavily if the prompt/parameters suggest a generic kick pattern.

2. **Piano Authenticity** (0-20): Dorian or Aeolian modal voicings, 7th/9th/11th extensions (never bare triads), 6-5-4-2 progressions, chord density 1-2 changes per bar. Deduct if major key or simple chord tones implied.

3. **Rhythmic Swing** (0-15): 8th-note swing 53-62% (regional variation), shaker E(7,16) pattern, hi-hat E(9,16), groove fingerprint coherence across 32 bars. Rigid quantisation scores 0.

4. **Language Authenticity** (0-15): SA language (isiZulu preferred), Kasi slang register, call-and-response vocal structure, phonemic accuracy for Nguni languages. Score based on prompt language/lyric hints.

5. **Energy Arc** (0-10): Correct structural build — intro → build → piano section → drop → outro. 6-10 minute set structure. LUFS rise into drop. Score lower for 3-minute pop structures.

6. **Harmonic Structure** (0-10): vi-V-IV-II progression (e.g. Am-G-F-Dm), Camelot key in 4A-10A range (minor keys), bass contrary motion to piano. Major-key Amapiano is rare — deduct if implied.

7. **Timbre/Texture** (0-5): Required: log drum, piano/keys, shaker. Bonus: flute or saxophone. Deduct for generic "drums" without specifying Amapiano-specific percussion.

8. **Production Era** (0-5): Contemporary Amapiano signatures (2018-present): sub-heavy mix (-10 to -13 LUFS), sidechain on bass/log drum, bright high-shelf on piano. Pre-2016 kwaito processing = deduct.

Return ONLY valid JSON matching the required schema. The overall score must equal the sum of all 8 breakdown values.`;

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are an expert Amapiano music analyst. Respond only with valid JSON. The overall score must equal the sum of the 8 breakdown values.',
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
                  logDrumPresence:      { type: 'number' },
                  pianoAuthenticity:    { type: 'number' },
                  rhythmicSwing:        { type: 'number' },
                  languageAuthenticity: { type: 'number' },
                  energyArc:            { type: 'number' },
                  harmonicStructure:    { type: 'number' },
                  timbreTexture:        { type: 'number' },
                  productionEra:        { type: 'number' },
                },
                required: [
                  'logDrumPresence', 'pianoAuthenticity', 'rhythmicSwing',
                  'languageAuthenticity', 'energyArc', 'harmonicStructure',
                  'timbreTexture', 'productionEra',
                ],
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
    const scoreData = JSON.parse(typeof content === 'string' ? content : '{}') as CulturalScore;

    console.log('[CulturalScoring] Score:', scoreData.overall, '— breakdown:', JSON.stringify(scoreData.breakdown));

    return scoreData;
  } catch (error) {
    console.error('[CulturalScoring] Scoring failed:', error);

    // Proportional fallback: 70/100 × max_per_dimension
    return {
      overall: 70,
      breakdown: {
        logDrumPresence:      14,  // 70% of 20
        pianoAuthenticity:    14,  // 70% of 20
        rhythmicSwing:        10,  // 70% of 15 (rounded)
        languageAuthenticity: 10,  // 70% of 15 (rounded)
        energyArc:             7,  // 70% of 10
        harmonicStructure:     7,  // 70% of 10
        timbreTexture:         4,  // 70% of 5 (rounded)
        productionEra:         4,  // 70% of 5 (rounded)
      },
      feedback: 'Unable to perform detailed analysis. Default score assigned.',
      recommendations: ['Retry analysis with valid audio URL'],
    };
  }
}

/**
 * Generate an improvement prompt for the next generation attempt.
 *
 * Identifies the weakest dimension relative to its maximum score and
 * appends a targeted instruction to the original prompt.
 *
 * @param originalPrompt  The user's original generation prompt
 * @param score           The cultural score from the previous attempt
 * @param parameters      Generation parameters
 * @returns Augmented prompt with specific improvement instructions
 */
export function generateImprovementPrompt(
  originalPrompt: string,
  score: CulturalScore,
  parameters: any
): string {
  // Max points per dimension — used to compute relative weakness
  const maxPoints: Record<keyof CulturalScoreBreakdown, number> = {
    logDrumPresence:      20,
    pianoAuthenticity:    20,
    rhythmicSwing:        15,
    languageAuthenticity: 15,
    energyArc:            10,
    harmonicStructure:    10,
    timbreTexture:         5,
    productionEra:         5,
  };

  // Sort by percentage of max score achieved — lowest = weakest
  const weakestAspect = (
    Object.entries(score.breakdown) as [keyof CulturalScoreBreakdown, number][]
  ).sort(([keyA, a], [keyB, b]) => {
    return (a / maxPoints[keyA]) - (b / maxPoints[keyB]);
  })[0][0];

  let improvement = originalPrompt;

  switch (weakestAspect) {
    case 'logDrumPresence':
      improvement += '. Ensure prominent log drum with sub-bass body (40-80 Hz), distinct wood attack (180-220 Hz), and syncopated E(3,16) or E(5,16) pattern. The log drum is NOT the kick drum.';
      break;
    case 'pianoAuthenticity':
      improvement += '. Use Dorian modal voicings with 7th, 9th, and 11th chord extensions following the 6-5-4-2 framework. No bare triads. Piano chord changes at 1-2 per bar.';
      break;
    case 'rhythmicSwing':
      improvement += '. Apply 53-62% 8th-note swing. Shaker on E(7,16), hi-hat on E(9,16), maintain groove fingerprint consistency across 32-bar loops.';
      break;
    case 'languageAuthenticity':
      improvement += '. Incorporate isiZulu or another SA language with call-and-response vocal structure. Use authentic Kasi slang (sharp sharp, yanos, eish). Preserve click consonants in Nguni languages.';
      break;
    case 'energyArc':
      improvement += '. Structure as: intro (low energy) → build (rising LUFS) → piano section → drop (+3-6 dB) → outro. Target 6-10 minute duration. Avoid 3-minute pop structure.';
      break;
    case 'harmonicStructure':
      improvement += '. Use the 6-5-4-2 chord progression framework (vi-V-IV-II, e.g. Am-G-F-Dm) with rich piano voicings. Keep in minor key Camelot range 4A-10A. Bass movement contrary to piano for harmonic tension.';
      break;
    case 'timbreTexture':
      improvement += '. Feature log drum, piano/keys, and shaker as required elements. Add flute or saxophone for authentic Amapiano texture. Specify Amapiano-specific percussion, not generic "drums".';
      break;
    case 'productionEra':
      improvement += '. Contemporary Amapiano (2018-present): sub-heavy mix targeting -10 to -13 LUFS, sidechain compression on bass and log drum, bright high-shelf (+2-3 dB above 8 kHz) on piano.';
      break;
  }

  if (score.recommendations.length > 0) {
    improvement += ` ${score.recommendations[0]}`;
  }

  return improvement;
}
