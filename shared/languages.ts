/**
 * shared/languages.ts — South African Language Registry for AURA-X
 *
 * Amapiano is fundamentally a multilingual art form. Authentic tracks freely
 * code-switch between 2–4 SA languages in a single sentence. This registry
 * provides the canonical language metadata for lyric generation, transcription,
 * phoneme modelling, and cultural scoring.
 *
 * All 11 official South African languages are supported plus township slang.
 */

// ── Language codes (ISO 639-3 where applicable) ───────────────────────────────

export const SA_LANGUAGE_CODES = [
  "zul", // isiZulu
  "xho", // isiXhosa
  "sot", // Sesotho (Southern Sotho)
  "tsn", // Setswana
  "nso", // Sepedi / Northern Sotho
  "ven", // Tshivenda
  "tso", // Xitsonga
  "nbl", // isiNdebele
  "ssw", // siSwati
  "afr", // Afrikaans
  "eng", // English (SA/Kasi)
] as const;

export type SALanguageCode = typeof SA_LANGUAGE_CODES[number];

// ── Language families ─────────────────────────────────────────────────────────

export type LanguageFamily = "nguni" | "sotho" | "germanic" | "venda" | "tsonga";

// ── Per-language metadata ─────────────────────────────────────────────────────

export interface SALanguageMeta {
  code: SALanguageCode;
  name: string;              // English name
  nativeName: string;        // Endonym
  family: LanguageFamily;
  speakersMillion: number;   // Approximate SA speaker count
  /**
   * Typical swing percentage when this language's phonemes are used.
   * Tonal languages like Zulu and Tsonga tend toward higher swing due to
   * natural prosodic patterns aligning with groove.
   */
  defaultSwingPct: number;
  /**
   * Primary provinces / regions where this language dominates.
   * Used for regional style auto-detection.
   */
  regions: string[];
  /**
   * Reference Amapiano artists who primarily sing/rap in this language.
   * Useful for calibrating lyric generation prompts.
   */
  referenceArtists: string[];
  /**
   * Common greeting / exclamation in this language that appears in Amapiano tracks.
   * These are culturally load-bearing phrases — do not mistranslate.
   */
  amapianoPhrases: string[];
  /** Whether the language has click consonants (critical for TTS/ASR) */
  hasClicks: boolean;
  /** Whether the language is tonal */
  isTonal: boolean;
}

export const SA_LANGUAGE_REGISTRY: Record<SALanguageCode, SALanguageMeta> = {
  zul: {
    code: "zul",
    name: "isiZulu",
    nativeName: "isiZulu",
    family: "nguni",
    speakersMillion: 12.1,
    defaultSwingPct: 55,
    regions: ["KwaZulu-Natal", "Gauteng", "Mpumalanga"],
    referenceArtists: ["Daliwonga", "Kabza De Small", "Young Stunna", "Zakes Bantwini"],
    amapianoPhrases: [
      "Yebo",           // Yes / Affirmation
      "Siyabonga",      // We thank you
      "Ngiyakuthanda",  // I love you
      "Asikhulume",     // Let's talk
      "Amapiano",       // The genre name itself (plural of "piano" in Zulu)
      "Yanos",          // Township contraction of Amapiano
      "Siyakhala",      // We are crying (emotional expression)
      "Nangu umlilo",   // Here is the fire (energy phrase)
    ],
    hasClicks: false,
    isTonal: true,
  },

  xho: {
    code: "xho",
    name: "isiXhosa",
    nativeName: "isiXhosa",
    family: "nguni",
    speakersMillion: 8.2,
    defaultSwingPct: 52,
    regions: ["Eastern Cape", "Western Cape", "Gauteng"],
    referenceArtists: ["Nakhane", "Blaq Diamond", "Zahara"],
    amapianoPhrases: [
      "Ewe",            // Yes
      "Molo",           // Hello (singular)
      "Molweni",        // Hello (plural)
      "Ndiyakuthanda",  // I love you
      "Qha",            // Just / Only
      "Inene",          // Indeed / Truly
    ],
    hasClicks: true,
    isTonal: true,
  },

  sot: {
    code: "sot",
    name: "Sesotho",
    nativeName: "Sesotho",
    family: "sotho",
    speakersMillion: 3.8,
    defaultSwingPct: 50,
    regions: ["Free State", "Gauteng", "Lesotho border areas"],
    referenceArtists: ["Morena Leraba", "Kelvin Momo (influence)"],
    amapianoPhrases: [
      "Ke a go rata",   // I love you
      "Lumela",         // Hello
      "Eya",            // Yes
      "Haeba",          // If
      "Ke mang",        // Who is it
    ],
    hasClicks: false,
    isTonal: true,
  },

  tsn: {
    code: "tsn",
    name: "Setswana",
    nativeName: "Setswana",
    family: "sotho",
    speakersMillion: 4.1,
    defaultSwingPct: 50,
    regions: ["North West", "Gauteng", "Botswana crossover"],
    referenceArtists: ["Focalistic (partial)", "Lady Du (partial)"],
    amapianoPhrases: [
      "Dumela",         // Hello
      "Ke a go rata",   // I love you
      "Ee",             // Yes
      "Ntse",           // Still / Yet
    ],
    hasClicks: false,
    isTonal: true,
  },

  nso: {
    code: "nso",
    name: "Sepedi / Northern Sotho",
    nativeName: "Sesotho sa Leboa",
    family: "sotho",
    speakersMillion: 4.7,
    defaultSwingPct: 51,
    regions: ["Limpopo", "Gauteng"],
    referenceArtists: ["Focalistic", "Tshego AMG"],
    amapianoPhrases: [
      "O sharp",        // You're good (Pedi-English hybrid)
      "Ke a go rata",   // I love you
      "Nna le wena",    // Me and you
      "Gape",           // Again / Also
      "Bjale",          // Now
    ],
    hasClicks: false,
    isTonal: true,
  },

  ven: {
    code: "ven",
    name: "Tshivenda",
    nativeName: "Tshivenḓa",
    family: "venda",
    speakersMillion: 1.3,
    defaultSwingPct: 58,
    regions: ["Limpopo (Venda region)"],
    referenceArtists: ["Makhadzi (closest reference)", "King Monada (Pedi but Limpopo)"],
    amapianoPhrases: [
      "Aa",             // Yes
      "Ndi a ni funa",  // I love you (plural)
      "Ndaa",           // Greetings (respectful)
    ],
    hasClicks: false,
    isTonal: true,
  },

  tso: {
    code: "tso",
    name: "Xitsonga",
    nativeName: "Xitsonga",
    family: "tsonga",
    speakersMillion: 2.3,
    defaultSwingPct: 58,
    regions: ["Limpopo (Tzaneen/Giyani)", "Mpumalanga", "Mozambique border"],
    referenceArtists: ["DJ Maphorisa (Tsonga roots)", "Sho Madjozi", "Masterpiece YVK"],
    amapianoPhrases: [
      "Awe",            // Let's go / Come on (exclamation)
      "Ndzi ku rhandza", // I love you
      "Tanganani",      // Welcome / Greetings
      "Sweswi",         // Now
      "Ngopfu",         // Very much / A lot
    ],
    hasClicks: false,
    isTonal: true,
  },

  nbl: {
    code: "nbl",
    name: "isiNdebele",
    nativeName: "isiNdebele",
    family: "nguni",
    speakersMillion: 1.1,
    defaultSwingPct: 54,
    regions: ["Mpumalanga", "Gauteng"],
    referenceArtists: ["(emerging artists)"],
    amapianoPhrases: [
      "Yebo",           // Yes (shared with Zulu)
      "Ngiyakuthanda",  // I love you (Nguni shared)
    ],
    hasClicks: true,
    isTonal: true,
  },

  ssw: {
    code: "ssw",
    name: "siSwati",
    nativeName: "siSwati",
    family: "nguni",
    speakersMillion: 1.3,
    defaultSwingPct: 53,
    regions: ["Mpumalanga", "Eswatini crossover"],
    referenceArtists: ["MaWhoo"],
    amapianoPhrases: [
      "Yebo",           // Yes
      "Ngiyakutsandza",  // I love you (siSwati variant)
      "Siyabonga",      // We thank you
    ],
    hasClicks: false,
    isTonal: true,
  },

  afr: {
    code: "afr",
    name: "Afrikaans",
    nativeName: "Afrikaans",
    family: "germanic",
    speakersMillion: 6.9,
    defaultSwingPct: 50,
    regions: ["Western Cape", "Northern Cape", "Gauteng"],
    referenceArtists: ["Lefa (partial)", "Cape Town artists"],
    amapianoPhrases: [
      "Lekker",         // Nice / Great (township borrowed)
      "Braai",          // BBQ (cultural reference)
      "Jislaaik",       // Exclamation (surprise/excitement)
      "Sharp",          // OK / Cool (shared with English SA)
    ],
    hasClicks: false,
    isTonal: false,
  },

  eng: {
    code: "eng",
    name: "English (SA / Kasi)",
    nativeName: "English",
    family: "germanic",
    speakersMillion: 5.0,
    defaultSwingPct: 50,
    regions: ["All provinces"],
    referenceArtists: ["All artists (code-switching)"],
    amapianoPhrases: [
      "Sharp sharp",    // All good / Cool (universally used)
      "Eish",           // Exclamation (difficulty/surprise) — borrowed into SA English
      "Chisa",          // Hot / On fire (from Zulu via township)
      "Log drum",       // The drum itself — English term
      "Yanos",          // Contracted from Amapiano
      "Piano man",      // DJ/producer epithet
      "Private school", // Upmarket Amapiano sub-style reference
    ],
    hasClicks: false,
    isTonal: false,
  },
};

// ── Code-switching helpers ────────────────────────────────────────────────────

/**
 * Returns the languages typically mixed together in a given regional style.
 * Amapiano lyrics are rarely monolingual — code-switching is authentic.
 */
export function getRegionalLanguageMix(region: string): SALanguageCode[] {
  const mixes: Record<string, SALanguageCode[]> = {
    "Gauteng":       ["zul", "nso", "tsn", "eng", "sot"],
    "KwaZulu-Natal": ["zul", "eng"],
    "Cape Town":     ["xho", "afr", "eng"],
    "Limpopo":       ["nso", "ven", "tso", "eng"],
    "Mpumalanga":    ["tso", "nbl", "ssw", "zul", "eng"],
    "Free State":    ["sot", "tsn", "eng"],
    "East Rand":     ["zul", "nso", "tsn", "eng"],
  };
  return mixes[region] ?? ["zul", "eng"];
}

/**
 * For lyric generation prompts — returns a phrase indicating the target language
 * and style, including code-switching instructions.
 */
export function buildLyricLanguagePrompt(
  primaryLanguage: SALanguageCode,
  secondaryLanguages: SALanguageCode[] = [],
  codeSwitchingIntensity: "low" | "medium" | "high" = "medium",
): string {
  const primary = SA_LANGUAGE_REGISTRY[primaryLanguage];
  const secondaryNames = secondaryLanguages.map(c => SA_LANGUAGE_REGISTRY[c].name);

  const switchDesc = {
    low: "Primarily in the target language with occasional English phrases",
    medium: "Mix between the primary language and 1–2 others naturally mid-sentence",
    high: "Freely alternate between all listed languages within phrases (authentic township style)",
  };

  return [
    `Primary language: ${primary.name} (${primary.nativeName})`,
    secondaryLanguages.length > 0
      ? `Additional languages: ${secondaryNames.join(", ")}`
      : "",
    `Code-switching intensity: ${switchDesc[codeSwitchingIntensity]}`,
    `Reference artists for style: ${primary.referenceArtists.slice(0, 2).join(", ")}`,
    primary.hasClicks
      ? "Note: Include authentic click consonants (c, q, x in orthography) where appropriate."
      : "",
  ].filter(Boolean).join("\n");
}

/**
 * Detects which SA languages are likely present in a lyric string
 * based on known phrases and orthographic patterns.
 * (Heuristic — for production use, feed to a real language detection model.)
 */
export function detectLanguagesInLyric(lyric: string): SALanguageCode[] {
  const lower = lyric.toLowerCase();
  const detected: SALanguageCode[] = [];

  for (const [code, meta] of Object.entries(SA_LANGUAGE_REGISTRY) as [SALanguageCode, SALanguageMeta][]) {
    const hasPhrase = meta.amapianoPhrases.some(p => lower.includes(p.toLowerCase()));
    if (hasPhrase) detected.push(code);
  }

  // Fallback: if nothing detected, assume Zulu + English (most common)
  return detected.length > 0 ? detected : ["zul", "eng"];
}
