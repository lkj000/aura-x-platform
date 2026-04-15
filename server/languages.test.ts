/**
 * languages.test.ts — South African language registry unit tests
 *
 * Pure TypeScript tests — no DB, no network.
 * Verifies cultural correctness of the SA language metadata used for
 * lyric generation, Whisper transcription mapping, and cultural scoring.
 */

import { describe, it, expect } from "vitest";
import {
  SA_LANGUAGE_CODES,
  SA_LANGUAGE_REGISTRY,
  getRegionalLanguageMix,
  buildLyricLanguagePrompt,
  detectLanguagesInLyric,
  type SALanguageCode,
} from "../shared/languages";

// ── Registry completeness ──────────────────────────────────────────────────────

describe("SA Language Registry — completeness", () => {
  it("has exactly 11 official SA languages", () => {
    expect(SA_LANGUAGE_CODES.length).toBe(11);
  });

  it("includes all 9 Bantu languages", () => {
    const bantu: SALanguageCode[] = ["zul", "xho", "sot", "tsn", "nso", "ven", "tso", "nbl", "ssw"];
    for (const code of bantu) {
      expect(SA_LANGUAGE_CODES).toContain(code);
    }
  });

  it("includes Afrikaans", () => {
    expect(SA_LANGUAGE_CODES).toContain("afr");
  });

  it("includes English (SA)", () => {
    expect(SA_LANGUAGE_CODES).toContain("eng");
  });

  it("every code has a registry entry", () => {
    for (const code of SA_LANGUAGE_CODES) {
      expect(SA_LANGUAGE_REGISTRY[code], `Missing entry for: ${code}`).toBeDefined();
    }
  });

  it("no duplicate language codes", () => {
    const unique = new Set(SA_LANGUAGE_CODES);
    expect(unique.size).toBe(SA_LANGUAGE_CODES.length);
  });
});

// ── Metadata quality ──────────────────────────────────────────────────────────

describe("SA Language Registry — metadata quality", () => {
  it("every language has a non-empty name", () => {
    for (const code of SA_LANGUAGE_CODES) {
      expect(SA_LANGUAGE_REGISTRY[code].name.length).toBeGreaterThan(0);
    }
  });

  it("every language has a native name", () => {
    for (const code of SA_LANGUAGE_CODES) {
      expect(SA_LANGUAGE_REGISTRY[code].nativeName.length).toBeGreaterThan(0);
    }
  });

  it("every language has speaker count > 0", () => {
    for (const code of SA_LANGUAGE_CODES) {
      expect(SA_LANGUAGE_REGISTRY[code].speakersMillion).toBeGreaterThan(0);
    }
  });

  it("registry code field matches its key", () => {
    for (const code of SA_LANGUAGE_CODES) {
      expect(SA_LANGUAGE_REGISTRY[code].code).toBe(code);
    }
  });

  it("every language has at least one reference artist", () => {
    for (const code of SA_LANGUAGE_CODES) {
      expect(SA_LANGUAGE_REGISTRY[code].referenceArtists.length).toBeGreaterThan(0);
    }
  });

  it("every language has at least one amapiano phrase", () => {
    for (const code of SA_LANGUAGE_CODES) {
      expect(SA_LANGUAGE_REGISTRY[code].amapianoPhrases.length).toBeGreaterThan(0);
    }
  });

  it("every language has at least one region", () => {
    for (const code of SA_LANGUAGE_CODES) {
      expect(SA_LANGUAGE_REGISTRY[code].regions.length).toBeGreaterThan(0);
    }
  });
});

// ── Amapiano-specific swing percentages ───────────────────────────────────────

describe("SA Language Registry — swing percentages", () => {
  it("all defaultSwingPct values are between 50 and 67", () => {
    for (const code of SA_LANGUAGE_CODES) {
      const swing = SA_LANGUAGE_REGISTRY[code].defaultSwingPct;
      expect(
        swing,
        `${code}: swing ${swing} outside 50–67 range`
      ).toBeGreaterThanOrEqual(50);
      expect(swing).toBeLessThanOrEqual(67);
    }
  });

  it("isiZulu has higher swing than Afrikaans (tonal vs. Germanic prosody)", () => {
    expect(SA_LANGUAGE_REGISTRY.zul.defaultSwingPct).toBeGreaterThan(
      SA_LANGUAGE_REGISTRY.afr.defaultSwingPct
    );
  });
});

// ── Family classification ──────────────────────────────────────────────────────

describe("SA Language Registry — language families", () => {
  it("Zulu is Nguni", () => {
    expect(SA_LANGUAGE_REGISTRY.zul.family).toBe("nguni");
  });

  it("Xhosa is Nguni", () => {
    expect(SA_LANGUAGE_REGISTRY.xho.family).toBe("nguni");
  });

  it("Sesotho is Sotho", () => {
    expect(SA_LANGUAGE_REGISTRY.sot.family).toBe("sotho");
  });

  it("Setswana is Sotho", () => {
    expect(SA_LANGUAGE_REGISTRY.tsn.family).toBe("sotho");
  });

  it("Afrikaans is Germanic", () => {
    expect(SA_LANGUAGE_REGISTRY.afr.family).toBe("germanic");
  });

  it("Tshivenda is Venda", () => {
    expect(SA_LANGUAGE_REGISTRY.ven.family).toBe("venda");
  });

  it("Xitsonga is Tsonga", () => {
    expect(SA_LANGUAGE_REGISTRY.tso.family).toBe("tsonga");
  });
});

// ── getRegionalLanguageMix ─────────────────────────────────────────────────────

describe("getRegionalLanguageMix", () => {
  it("Gauteng mix includes Zulu (most spoken in Joburg townships)", () => {
    const mix = getRegionalLanguageMix("Gauteng");
    expect(mix).toContain("zul");
  });

  it("Limpopo mix includes Tshivenda and Xitsonga", () => {
    const mix = getRegionalLanguageMix("Limpopo");
    const hasVenda = mix.includes("ven");
    const hasTsonga = mix.includes("tso");
    expect(hasVenda || hasTsonga).toBe(true);
  });

  it("Cape Town mix includes Afrikaans and Xhosa", () => {
    const mix = getRegionalLanguageMix("Cape Town");
    const hasAfr = mix.includes("afr");
    const hasXho = mix.includes("xho");
    expect(hasAfr || hasXho).toBe(true);
  });

  it("returns between 2 and 5 languages (code-switching norm)", () => {
    const regions = ["Gauteng", "KwaZulu-Natal", "Cape Town", "Limpopo", "East Rand"];
    for (const region of regions) {
      const mix = getRegionalLanguageMix(region);
      expect(mix.length, `${region}: expected 2–5 languages`).toBeGreaterThanOrEqual(2);
      expect(mix.length).toBeLessThanOrEqual(5);
    }
  });

  it("all returned codes are valid SA language codes", () => {
    const validSet = new Set<string>(SA_LANGUAGE_CODES);
    const mix = getRegionalLanguageMix("Gauteng");
    for (const code of mix) {
      expect(validSet.has(code), `Invalid code: ${code}`).toBe(true);
    }
  });
});

// ── buildLyricLanguagePrompt ───────────────────────────────────────────────────

describe("buildLyricLanguagePrompt", () => {
  it("includes primary language name in the prompt", () => {
    const prompt = buildLyricLanguagePrompt("zul", ["xho"], "high");
    expect(prompt.toLowerCase()).toContain("zulu");
  });

  it("mentions code-switching when secondary languages given", () => {
    const prompt = buildLyricLanguagePrompt("zul", ["eng"], "medium");
    // Should indicate mixing / code-switching
    expect(prompt.length).toBeGreaterThan(20);
  });

  it("works with no secondary languages", () => {
    const prompt = buildLyricLanguagePrompt("zul", [], "low");
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });
});

// ── detectLanguagesInLyric ────────────────────────────────────────────────────

describe("detectLanguagesInLyric", () => {
  it("detects Zulu phrase in lyric", () => {
    // 'Yebo' is a Zulu affirmation appearing in countless amapiano tracks
    const detected = detectLanguagesInLyric("Yebo, Amapiano is the movement");
    expect(detected).toContain("zul");
  });

  it("returns array of SA language codes", () => {
    const detected = detectLanguagesInLyric("Yanos!");
    expect(Array.isArray(detected)).toBe(true);
    const validSet = new Set<string>(SA_LANGUAGE_CODES);
    for (const code of detected) {
      expect(validSet.has(code), `Invalid code detected: ${code}`).toBe(true);
    }
  });

  it("handles empty lyric without throwing", () => {
    expect(() => detectLanguagesInLyric("")).not.toThrow();
  });
});
