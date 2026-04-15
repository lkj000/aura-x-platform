/**
 * stems.test.ts — Amapiano 26-stem ontology unit tests
 *
 * Pure TypeScript tests — no DB, no network.
 * These tests verify the stem registry is internally consistent and
 * culturally correct for Amapiano production.
 */

import { describe, it, expect } from "vitest";
import {
  ALL_STEM_IDS,
  PERCUSSION_STEMS,
  BASS_STEMS,
  HARMONIC_STEMS,
  VOCAL_STEMS,
  FX_STEMS,
  STEM_REGISTRY,
  stemS3Key,
  stemsForModel,
  type StemId,
} from "../shared/stems";

// ── Ontology completeness ──────────────────────────────────────────────────────

describe("Stem ontology — completeness", () => {
  it("has exactly 26 stems in total", () => {
    expect(ALL_STEM_IDS.length).toBe(26);
  });

  it("has 8 percussion stems", () => {
    expect(PERCUSSION_STEMS.length).toBe(8);
  });

  it("has 2 bass stems", () => {
    expect(BASS_STEMS.length).toBe(2);
  });

  it("has 9 harmonic stems", () => {
    expect(HARMONIC_STEMS.length).toBe(9);
  });

  it("has 5 vocal stems", () => {
    expect(VOCAL_STEMS.length).toBe(5);
  });

  it("has 2 FX stems", () => {
    expect(FX_STEMS.length).toBe(2);
  });

  it("no duplicate stem IDs", () => {
    const ids = [...ALL_STEM_IDS];
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("every stem ID has a registry entry", () => {
    for (const id of ALL_STEM_IDS) {
      expect(STEM_REGISTRY[id], `Missing registry entry for: ${id}`).toBeDefined();
    }
  });
});

// ── Cultural authenticity constraints ─────────────────────────────────────────

describe("Stem ontology — cultural authenticity", () => {
  it("log_drum is category percussion", () => {
    expect(STEM_REGISTRY.log_drum.category).toBe("percussion");
  });

  it("log_drum is culture-load-bearing (it IS Amapiano)", () => {
    expect(STEM_REGISTRY.log_drum.cultureLoadBearing).toBe(true);
  });

  it("log_drum frequency range is sub-bass (40–200 Hz)", () => {
    expect(STEM_REGISTRY.log_drum.freqRangeLow).toBeLessThanOrEqual(40);
    expect(STEM_REGISTRY.log_drum.freqRangeHigh).toBeGreaterThanOrEqual(200);
  });

  it("kick drum is NOT the same as log_drum (architecturally distinct)", () => {
    // These MUST be different stems — conflating them is a domain error
    expect(STEM_REGISTRY.log_drum.id).not.toBe(STEM_REGISTRY.kick.id);
    // Kick is a separate stem with different frequency profile
    expect(STEM_REGISTRY.kick.freqRangeLow).toBeGreaterThan(
      STEM_REGISTRY.log_drum.freqRangeLow
    );
  });

  it("piano_chords is culture-load-bearing (the 'yanos' sound)", () => {
    expect(STEM_REGISTRY.piano_chords.cultureLoadBearing).toBe(true);
  });

  it("flute is in harmonic category (characteristic Amapiano instrument)", () => {
    expect(STEM_REGISTRY.flute.category).toBe("harmonic");
  });

  it("shaker_cabasa is culture-load-bearing (quintessential amapiano texture)", () => {
    expect(STEM_REGISTRY.shaker_cabasa.cultureLoadBearing).toBe(true);
  });

  it("lead_vocal is culture-load-bearing", () => {
    expect(STEM_REGISTRY.lead_vocal.cultureLoadBearing).toBe(true);
  });

  it("all priority-1 stems have cultureLoadBearing=true", () => {
    const priority1 = Object.values(STEM_REGISTRY).filter(
      (s) => s.authenticityPriority === 1
    );
    expect(priority1.length).toBeGreaterThan(0);
    for (const stem of priority1) {
      expect(
        stem.cultureLoadBearing,
        `Priority-1 stem ${stem.id} must be culture-load-bearing`
      ).toBe(true);
    }
  });

  it("every culture-load-bearing stem has authenticityPriority ≤ 3", () => {
    const loadBearing = Object.values(STEM_REGISTRY).filter(
      (s) => s.cultureLoadBearing
    );
    for (const stem of loadBearing) {
      expect(
        stem.authenticityPriority,
        `Culture-bearing stem ${stem.id} should have high priority`
      ).toBeLessThanOrEqual(3);
    }
  });
});

// ── Frequency range constraints ────────────────────────────────────────────────

describe("Stem ontology — frequency ranges", () => {
  it("every stem has freqRangeLow < freqRangeHigh", () => {
    for (const id of ALL_STEM_IDS) {
      const stem = STEM_REGISTRY[id];
      expect(
        stem.freqRangeLow,
        `${id}: freqRangeLow must be < freqRangeHigh`
      ).toBeLessThan(stem.freqRangeHigh);
    }
  });

  it("every stem has freqRangeLow ≥ 20 Hz (audible range)", () => {
    for (const id of ALL_STEM_IDS) {
      expect(
        STEM_REGISTRY[id].freqRangeLow,
        `${id}: below audible range`
      ).toBeGreaterThanOrEqual(20);
    }
  });

  it("every stem has freqRangeHigh ≤ 20000 Hz (audible ceiling)", () => {
    for (const id of ALL_STEM_IDS) {
      expect(
        STEM_REGISTRY[id].freqRangeHigh,
        `${id}: above audible range`
      ).toBeLessThanOrEqual(20000);
    }
  });

  it("bass stems are in sub-bass / bass frequency ranges (≤ 500 Hz)", () => {
    for (const id of BASS_STEMS) {
      expect(
        STEM_REGISTRY[id].freqRangeLow,
        `Bass stem ${id} should be sub-500 Hz`
      ).toBeLessThan(500);
    }
  });

  it("hi-hat stems are above 5kHz", () => {
    expect(STEM_REGISTRY.hi_hat_closed.freqRangeLow).toBeGreaterThanOrEqual(5000);
    expect(STEM_REGISTRY.hi_hat_open.freqRangeLow).toBeGreaterThanOrEqual(5000);
  });
});

// ── Registry metadata quality ─────────────────────────────────────────────────

describe("Stem ontology — registry metadata quality", () => {
  it("every stem has a label", () => {
    for (const id of ALL_STEM_IDS) {
      expect(STEM_REGISTRY[id].label.length).toBeGreaterThan(0);
    }
  });

  it("every stem has a valid hex color", () => {
    const hexPattern = /^#[0-9a-f]{6}$/i;
    for (const id of ALL_STEM_IDS) {
      expect(
        STEM_REGISTRY[id].color,
        `${id}: invalid color`
      ).toMatch(hexPattern);
    }
  });

  it("registry id field matches the key", () => {
    for (const id of ALL_STEM_IDS) {
      expect(STEM_REGISTRY[id].id).toBe(id);
    }
  });

  it("authenticityPriority values are 1–5", () => {
    for (const id of ALL_STEM_IDS) {
      const p = STEM_REGISTRY[id].authenticityPriority;
      expect(p).toBeGreaterThanOrEqual(1);
      expect(p).toBeLessThanOrEqual(5);
    }
  });
});

// ── S3 key helper ─────────────────────────────────────────────────────────────

describe("stemS3Key", () => {
  it("builds correct S3 key", () => {
    expect(stemS3Key(42, "log_drum")).toBe("stems/42/log_drum.wav");
  });

  it("uses .wav extension", () => {
    expect(stemS3Key(1, "piano_chords")).toContain(".wav");
  });
});

// ── stemsForModel ─────────────────────────────────────────────────────────────

describe("stemsForModel", () => {
  it("htdemucs_6s model returns at least 6 stems", () => {
    const stems = stemsForModel("htdemucs_6s");
    expect(stems.length).toBeGreaterThanOrEqual(6);
  });

  it("returns a subset of ALL_STEM_IDS", () => {
    const allSet = new Set<string>(ALL_STEM_IDS);
    const stems = stemsForModel("htdemucs_6s");
    for (const s of stems) {
      expect(allSet.has(s), `Unknown stem: ${s}`).toBe(true);
    }
  });

  it("htdemucs_ft (fine-tuned) model returns all 26 stems", () => {
    const stems = stemsForModel("htdemucs_ft");
    expect(stems.length).toBe(26);
  });
});
