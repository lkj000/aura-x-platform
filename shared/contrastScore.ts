/**
 * shared/contrastScore.ts — Contrast Score formula (T11)
 *
 * The Contrast Score quantifies a track's position on the Soulful↔Sgija axis,
 * the two dominant Amapiano sub-genre poles. It is the authoritative sub-genre
 * metric — use it consistently everywhere.
 *
 * Score interpretation:
 *   0–75   → Soulful / Private School (Kelvin Momo, slow spiritual Kabza)
 *   76–149 → Mainstream Amapiano (radio, Major League DJz)
 *   150–200→ Sgija / Underground (East Rand, DJ Maphorisa hard cuts)
 *
 * See CLAUDE.md §1.10 for the full formula and variable definitions.
 * The Python equivalent lives in modal_backend/amapiano_analyzer.py
 * (compute_contrast_score). Both must stay in sync.
 */

export interface ContrastScoreInputs {
  /** 8th-note swing percentage, e.g. 57.3 */
  swingPercent: number;
  /** Track BPM */
  bpm: number;
  /**
   * Spectral centroid of the log drum attack transient, in Hz.
   * 180 Hz = fully woody/wooden (soulful), 600 Hz = metallic/sharp (sgija).
   */
  logDrumAttackCentroidHz: number;
  /**
   * Average note count per detected piano chord.
   * 1 note = no chord, 7 notes = rich jazz voicing.
   */
  avgPianoChordNoteCount: number;
}

/** Classification result */
export type ContrastScoreLabel =
  | "soulful"      // 0–75
  | "mainstream"   // 76–149
  | "sgija";       // 150–200

export interface ContrastScoreResult {
  score: number;
  label: ContrastScoreLabel;
  /** Breakdown of each variable's contribution for diagnostic display */
  breakdown: {
    swingDeviation: number;     // 0–1
    bpmNormalized: number;      // 0–1
    logDrumAttackSharpness: number; // 0–1
    pianoChordDensity: number;  // 0–1
    swingContrib: number;       // × 100
    bpmContrib: number;         // × 50
    logDrumContrib: number;     // × 30
    pianoContrib: number;       // × 20
  };
}

/**
 * Compute the Contrast Score from raw analysis values.
 *
 * Formula:
 *   score = (swing_deviation × 100)
 *         + (bpm_normalized  × 50)
 *         + (log_drum_attack_sharpness × 30)
 *         + (piano_chord_density × 20)
 *
 * Where:
 *   swing_deviation          = clamp((swingPercent - 53) / 14, 0, 1)
 *   bpm_normalized           = clamp((bpm - 112) / 20, 0, 1)
 *   log_drum_attack_sharpness = clamp((centroidHz - 180) / 420, 0, 1)
 *   piano_chord_density      = clamp((noteCount - 1) / 6, 0, 1)
 *
 * @param inputs - Raw analysis values from the Modal analysis pipeline
 * @returns Contrast score (0–200) with label and diagnostic breakdown
 */
export function computeContrastScore(
  inputs: ContrastScoreInputs
): ContrastScoreResult {
  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));

  const swingDeviation = clamp((inputs.swingPercent - 53) / 14, 0, 1);
  const bpmNormalized = clamp((inputs.bpm - 112) / 20, 0, 1);
  // 180 Hz = woody (0), 600 Hz = sharp/metallic (1); range = 420 Hz
  const logDrumAttackSharpness = clamp(
    (inputs.logDrumAttackCentroidHz - 180) / 420,
    0,
    1
  );
  // 1 note = no chord (0), 7 notes = full jazz voicing (1); range = 6
  const pianoChordDensity = clamp(
    (inputs.avgPianoChordNoteCount - 1) / 6,
    0,
    1
  );

  const swingContrib = swingDeviation * 100;
  const bpmContrib = bpmNormalized * 50;
  const logDrumContrib = logDrumAttackSharpness * 30;
  const pianoContrib = pianoChordDensity * 20;

  const score = swingContrib + bpmContrib + logDrumContrib + pianoContrib;

  let label: ContrastScoreLabel;
  if (score <= 75) label = "soulful";
  else if (score <= 149) label = "mainstream";
  else label = "sgija";

  return {
    score: Math.round(score * 100) / 100,
    label,
    breakdown: {
      swingDeviation,
      bpmNormalized,
      logDrumAttackSharpness,
      pianoChordDensity,
      swingContrib,
      bpmContrib,
      logDrumContrib,
      pianoContrib,
    },
  };
}

/**
 * Classify a pre-computed score into its sub-genre label.
 */
export function classifyContrastScore(score: number): ContrastScoreLabel {
  if (score <= 75) return "soulful";
  if (score <= 149) return "mainstream";
  return "sgija";
}
