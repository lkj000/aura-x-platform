/**
 * shared/stems.ts — Canonical 26-stem Amapiano ontology
 *
 * This is the authoritative definition of every stem AURA-X can separate,
 * generate, or reference. A generic 4-stem model (drums/bass/other/vocals)
 * is architecturally insufficient for Amapiano — the log drum, piano, and
 * flute are each culturally load-bearing and must be individually addressable.
 *
 * Used by: modal_backend/ (separation), server/routers/ (DB write),
 *          client/src/ (DAW track labels), drizzle/schema.ts (DB columns)
 */

// ── Stem category classification ─────────────────────────────────────────────

export type StemCategory =
  | "percussion"
  | "bass"
  | "harmonic"
  | "vocal"
  | "fx";

// ── Individual stem IDs (snake_case, used as DB keys and S3 path segments) ───

export const PERCUSSION_STEMS = [
  "log_drum",       // The defining Amapiano sub-bass syncopated drum — NOT the kick
  "kick",           // 4-on-floor or 2-and-4 kick drum
  "snare_clap",     // Usually a clap in amapiano, not an acoustic snare
  "hi_hat_closed",  // 16th-note closed hi-hat patterns
  "hi_hat_open",    // Accent open hi-hats
  "shaker_cabasa",  // Constant 16th-note shaker drive — quintessential amapiano texture
  "congas_bongos",  // Call-and-response hand percussion
  "tambourine",     // 8th or 16th note accents
] as const;

export const BASS_STEMS = [
  "bass_synth",     // Sub-bass melodic line (808-style), separate from log drum
  "bass_walk",      // Jazz walking bass lines in slower/bridge sections
] as const;

export const HARMONIC_STEMS = [
  "piano_chords",   // Primary jazz chords — 6-5-4-2 voicings; the "yanos" sound
  "piano_melody",   // Piano runs, riffs, fills (separate layer from chords)
  "rhodes",         // Fender Rhodes / electric piano — warm, slightly overdriven
  "pad_strings",    // Atmospheric background pads; long attack and sustain
  "flute",          // Highly characteristic of Amapiano (DBN Gogo, Daliwonga style)
  "saxophone",      // Jazz melodic lines — alto or tenor
  "guitar",         // Acoustic strumming OR funky electric rhythm guitar
  "kalimba_mbira",  // African thumb piano — Limpopo / traditional flavour
  "marimba",        // Melodic wood percussion — township and traditional texture
] as const;

export const VOCAL_STEMS = [
  "lead_vocal",     // Primary singer or rapper
  "backing_vocals", // Harmonies, response parts, echo vocals
  "vocal_chops",    // Chopped and pitch-shifted vocal samples
  "ad_libs",        // Freestyle additions: "Yanos!", whistles, shouts, hype
  "choir",          // Choral harmonies — spiritual amapiano sub-genre
] as const;

export const FX_STEMS = [
  "whistle_fx",     // Referee whistle (party marker), sweeps, risers, impacts
  "room_ambience",  // Venue noise, crowd energy — gives tracks a "live" feel
] as const;

export const ALL_STEM_IDS = [
  ...PERCUSSION_STEMS,
  ...BASS_STEMS,
  ...HARMONIC_STEMS,
  ...VOCAL_STEMS,
  ...FX_STEMS,
] as const;

export type StemId = typeof ALL_STEM_IDS[number];

// ── Stem metadata (display, frequency guidance, separation priority) ──────────

export interface StemMeta {
  id: StemId;
  label: string;
  category: StemCategory;
  /** Typical fundamental frequency range in Hz */
  freqRangeLow: number;
  freqRangeHigh: number;
  /** 1 = most critical for amapiano authenticity, 5 = least */
  authenticityPriority: 1 | 2 | 3 | 4 | 5;
  /** If true, this stem MUST be separated correctly for cultural scoring */
  cultureLoadBearing: boolean;
  /** Default DAW track colour (hex) */
  color: string;
}

export const STEM_REGISTRY: Record<StemId, StemMeta> = {
  // ── Percussion ──────────────────────────────────────────────────────────────
  log_drum: {
    id: "log_drum", label: "Log Drum", category: "percussion",
    freqRangeLow: 40, freqRangeHigh: 200,
    authenticityPriority: 1, cultureLoadBearing: true,
    color: "#ef4444", // red
  },
  kick: {
    id: "kick", label: "Kick Drum", category: "percussion",
    freqRangeLow: 60, freqRangeHigh: 4000,
    authenticityPriority: 1, cultureLoadBearing: true,
    color: "#f97316", // orange
  },
  snare_clap: {
    id: "snare_clap", label: "Snare / Clap", category: "percussion",
    freqRangeLow: 200, freqRangeHigh: 8000,
    authenticityPriority: 2, cultureLoadBearing: false,
    color: "#eab308", // yellow
  },
  hi_hat_closed: {
    id: "hi_hat_closed", label: "Closed Hi-Hat", category: "percussion",
    freqRangeLow: 8000, freqRangeHigh: 16000,
    authenticityPriority: 3, cultureLoadBearing: false,
    color: "#84cc16",
  },
  hi_hat_open: {
    id: "hi_hat_open", label: "Open Hi-Hat", category: "percussion",
    freqRangeLow: 6000, freqRangeHigh: 14000,
    authenticityPriority: 3, cultureLoadBearing: false,
    color: "#22c55e",
  },
  shaker_cabasa: {
    id: "shaker_cabasa", label: "Shaker / Cabasa", category: "percussion",
    freqRangeLow: 5000, freqRangeHigh: 15000,
    authenticityPriority: 2, cultureLoadBearing: true,
    color: "#10b981",
  },
  congas_bongos: {
    id: "congas_bongos", label: "Congas / Bongos", category: "percussion",
    freqRangeLow: 200, freqRangeHigh: 5000,
    authenticityPriority: 3, cultureLoadBearing: false,
    color: "#06b6d4",
  },
  tambourine: {
    id: "tambourine", label: "Tambourine", category: "percussion",
    freqRangeLow: 5000, freqRangeHigh: 18000,
    authenticityPriority: 4, cultureLoadBearing: false,
    color: "#3b82f6",
  },

  // ── Bass ────────────────────────────────────────────────────────────────────
  bass_synth: {
    id: "bass_synth", label: "Bass Synth / 808", category: "bass",
    freqRangeLow: 30, freqRangeHigh: 250,
    authenticityPriority: 1, cultureLoadBearing: true,
    color: "#8b5cf6",
  },
  bass_walk: {
    id: "bass_walk", label: "Bass Walk", category: "bass",
    freqRangeLow: 40, freqRangeHigh: 500,
    authenticityPriority: 3, cultureLoadBearing: false,
    color: "#a855f7",
  },

  // ── Harmonic / Melodic ───────────────────────────────────────────────────────
  piano_chords: {
    id: "piano_chords", label: "Piano Chords", category: "harmonic",
    freqRangeLow: 80, freqRangeHigh: 4000,
    authenticityPriority: 1, cultureLoadBearing: true,
    color: "#f43f5e",
  },
  piano_melody: {
    id: "piano_melody", label: "Piano Melody / Runs", category: "harmonic",
    freqRangeLow: 200, freqRangeHigh: 6000,
    authenticityPriority: 2, cultureLoadBearing: true,
    color: "#ec4899",
  },
  rhodes: {
    id: "rhodes", label: "Rhodes / E-Piano", category: "harmonic",
    freqRangeLow: 100, freqRangeHigh: 5000,
    authenticityPriority: 2, cultureLoadBearing: false,
    color: "#d946ef",
  },
  pad_strings: {
    id: "pad_strings", label: "Pads / Strings", category: "harmonic",
    freqRangeLow: 80, freqRangeHigh: 8000,
    authenticityPriority: 3, cultureLoadBearing: false,
    color: "#6366f1",
  },
  flute: {
    id: "flute", label: "Flute", category: "harmonic",
    freqRangeLow: 300, freqRangeHigh: 8000,
    authenticityPriority: 1, cultureLoadBearing: true,
    color: "#0ea5e9",
  },
  saxophone: {
    id: "saxophone", label: "Saxophone", category: "harmonic",
    freqRangeLow: 100, freqRangeHigh: 6000,
    authenticityPriority: 2, cultureLoadBearing: false,
    color: "#14b8a6",
  },
  guitar: {
    id: "guitar", label: "Guitar", category: "harmonic",
    freqRangeLow: 80, freqRangeHigh: 8000,
    authenticityPriority: 3, cultureLoadBearing: false,
    color: "#f59e0b",
  },
  kalimba_mbira: {
    id: "kalimba_mbira", label: "Kalimba / Mbira", category: "harmonic",
    freqRangeLow: 200, freqRangeHigh: 6000,
    authenticityPriority: 2, cultureLoadBearing: true,
    color: "#78716c",
  },
  marimba: {
    id: "marimba", label: "Marimba / Xylophone", category: "harmonic",
    freqRangeLow: 150, freqRangeHigh: 5000,
    authenticityPriority: 3, cultureLoadBearing: true,
    color: "#71717a",
  },

  // ── Vocals ───────────────────────────────────────────────────────────────────
  lead_vocal: {
    id: "lead_vocal", label: "Lead Vocal", category: "vocal",
    freqRangeLow: 80, freqRangeHigh: 8000,
    authenticityPriority: 2, cultureLoadBearing: true,
    color: "#fb7185",
  },
  backing_vocals: {
    id: "backing_vocals", label: "Backing Vocals", category: "vocal",
    freqRangeLow: 150, freqRangeHigh: 8000,
    authenticityPriority: 3, cultureLoadBearing: false,
    color: "#fda4af",
  },
  vocal_chops: {
    id: "vocal_chops", label: "Vocal Chops", category: "vocal",
    freqRangeLow: 100, freqRangeHigh: 10000,
    authenticityPriority: 2, cultureLoadBearing: true,
    color: "#fdba74",
  },
  ad_libs: {
    id: "ad_libs", label: "Ad-libs / Hype", category: "vocal",
    freqRangeLow: 200, freqRangeHigh: 10000,
    authenticityPriority: 3, cultureLoadBearing: false,
    color: "#fcd34d",
  },
  choir: {
    id: "choir", label: "Choir", category: "vocal",
    freqRangeLow: 80, freqRangeHigh: 8000,
    authenticityPriority: 3, cultureLoadBearing: false,
    color: "#a3e635",
  },

  // ── FX ───────────────────────────────────────────────────────────────────────
  whistle_fx: {
    id: "whistle_fx", label: "Whistle / FX", category: "fx",
    freqRangeLow: 2000, freqRangeHigh: 16000,
    authenticityPriority: 4, cultureLoadBearing: false,
    color: "#34d399",
  },
  room_ambience: {
    id: "room_ambience", label: "Room / Crowd", category: "fx",
    freqRangeLow: 20, freqRangeHigh: 20000,
    authenticityPriority: 5, cultureLoadBearing: false,
    color: "#94a3b8",
  },
};

// ── Separation model tiers ────────────────────────────────────────────────────

/** Which stems each model version can produce */
export const SEPARATION_MODEL_CAPABILITIES: Record<string, StemId[]> = {
  "htdemucs": ["kick", "bass_synth", "piano_chords", "lead_vocal"], // 4-stem fallback (drums→kick, bass, other→piano, vocals)
  "htdemucs_6s": [
    "kick", "bass_synth", "piano_chords", "lead_vocal", "guitar", "pad_strings",
  ],
  "htdemucs_ft": [
    // Fine-tuned on amapiano training data — all 26 stems
    ...ALL_STEM_IDS,
  ],
  "mdx_net_voc_ft": [
    "lead_vocal", "backing_vocals", "vocal_chops", "ad_libs", "choir",
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getStemsByCategory(category: StemCategory): StemMeta[] {
  return Object.values(STEM_REGISTRY).filter(s => s.category === category);
}

export function getCultureLoadBearingStems(): StemMeta[] {
  return Object.values(STEM_REGISTRY).filter(s => s.cultureLoadBearing);
}

export function stemS3Key(trackId: number, stemId: StemId): string {
  return `stems/${trackId}/${stemId}.wav`;
}

/** Returns the stems a given model version can produce */
export function stemsForModel(modelVersion: string): StemId[] {
  return SEPARATION_MODEL_CAPABILITIES[modelVersion] ?? [];
}
