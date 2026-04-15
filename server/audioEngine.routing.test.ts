/**
 * audioEngine.routing.test.ts — AudioEngine signal routing correctness tests
 *
 * Verifies that:
 *  1. The effect chain is wired in the correct direction (source → effects → limiter)
 *  2. scheduleClip routes through the track channel (not directly to destination)
 *  3. Audio players connect to channel head, not destination
 *
 * Uses Vitest with vi.mock to stub Tone.js so no Web Audio API is needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Tone.js mock factory (no top-level variable references — hoisting-safe) ───

vi.mock("tone", () => {
  function makeNode(label: string) {
    const node: any = {
      _label: label,
      _connections: [] as any[],
    };
    // All AudioNode-like methods return `this` for chaining
    node.connect = vi.fn((dest: any) => {
      node._connections.push(dest);
      return node;
    });
    node.toDestination = vi.fn(() => node);
    node.disconnect = vi.fn(() => node);
    node.dispose = vi.fn(() => node);
    node.start = vi.fn(() => node);
    node.stop = vi.fn(() => node);
    return node;
  }

  const destinationInstance = makeNode("destination");

  return {
    Channel: vi.fn(() => makeNode("channel")),
    EQ3: vi.fn(() => makeNode("eq3")),
    Compressor: vi.fn(() => makeNode("compressor")),
    FeedbackDelay: vi.fn(() => makeNode("delay")),
    Reverb: vi.fn(() => makeNode("reverb")),
    Limiter: vi.fn(() => makeNode("limiter")),
    Analyser: vi.fn(() => makeNode("analyser")),
    Recorder: vi.fn(() => makeNode("recorder")),
    Synth: vi.fn(() => makeNode("synth")),
    Sampler: vi.fn(() => makeNode("sampler")),
    Destination: destinationInstance,
    Player: vi.fn(() => makeNode("player")),
    Transport: {
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      seconds: 0,
      bpm: { value: 120 },
      scheduleRepeat: vi.fn(),
      cancel: vi.fn(),
    },
    ToneAudioBuffer: vi.fn((_url: any, onload?: any) => {
      const buf = makeNode("buffer");
      buf.get = vi.fn(() => null);
      buf.getChannelData = vi.fn(() => new Float32Array(0));
      buf.duration = 0;
      if (typeof onload === "function") setTimeout(onload, 0);
      return buf;
    }),
    ToneAudioNode: vi.fn(),
    gainToDb: vi.fn((v: number) => v),
    dbToGain: vi.fn((v: number) => v),
    getDestination: vi.fn(() => destinationInstance),
    getDuration: vi.fn(() => 0),
    start: vi.fn(),
    getContext: vi.fn(() => ({ state: "running" })),
    context: { state: "running" },
  };
});

import * as Tone from "tone";
// AudioEngine is a singleton instance of AudioEngineService
import { AudioEngine as engine } from "../client/src/services/AudioEngine";

// ── Helpers to retrieve mock instances created during test ───────────────────

function lastMockResult(mockFn: any) {
  const results = (mockFn as any).mock.results;
  return results[results.length - 1]?.value;
}

function makeTrack(overrides: Record<string, any> = {}): any {
  return {
    id: "track-1",
    name: "Log Drum",
    type: "audio",
    clips: [],
    notes: [],
    volume: -6,
    pan: 0,
    muted: false,
    solo: false,
    effects: {},
    automation: [],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AudioEngine — effect chain direction", () => {
  // Uses the exported singleton

  beforeEach(async () => {
    vi.clearAllMocks();
    await engine.initialize();
  });

  it("channel connects to limiter when there are no effects", async () => {
    await engine.setTrack(makeTrack({ effects: {} }));

    const channel = lastMockResult(Tone.Channel);
    const limiter = lastMockResult(Tone.Limiter);

    const channelTargets = (channel._connections as any[]).map((n: any) => n._label);
    expect(channelTargets).toContain("limiter");
  });

  it("with EQ: channel→EQ→limiter — channel does NOT go directly to limiter", async () => {
    await engine.setTrack(makeTrack({
      effects: { eq: { low: 0, mid: 0, high: 0 } },
    }));

    const channel = lastMockResult(Tone.Channel);
    const eq = lastMockResult(Tone.EQ3);

    const channelTargets = (channel._connections as any[]).map((n: any) => n._label);
    const eqTargets = (eq._connections as any[]).map((n: any) => n._label);

    // channel → EQ (first effect)
    expect(channelTargets).toContain("eq3");
    // EQ → limiter (last node in chain)
    expect(eqTargets).toContain("limiter");
    // channel must NOT bypass effects and go directly to limiter
    expect(channelTargets).not.toContain("limiter");
  });

  it("with EQ+Compressor: channel→EQ→Compressor→limiter", async () => {
    await engine.setTrack(makeTrack({
      effects: {
        eq: { low: 2, mid: 0, high: -2 },
        compressor: { threshold: -12, ratio: 4 },
      },
    }));

    const channel = lastMockResult(Tone.Channel);
    const eq = lastMockResult(Tone.EQ3);
    const comp = lastMockResult(Tone.Compressor);

    expect((channel._connections as any[]).map((n: any) => n._label)).toContain("eq3");
    expect((eq._connections as any[]).map((n: any) => n._label)).toContain("compressor");
    expect((comp._connections as any[]).map((n: any) => n._label)).toContain("limiter");
    // No shortcircuiting
    expect((channel._connections as any[]).map((n: any) => n._label)).not.toContain("compressor");
    expect((channel._connections as any[]).map((n: any) => n._label)).not.toContain("limiter");
  });

  it("with all 4 effects: full chain channel→EQ→Compressor→Delay→Reverb→limiter", async () => {
    await engine.setTrack(makeTrack({
      effects: {
        eq: { low: 0, mid: 0, high: 0 },
        compressor: { threshold: -18, ratio: 3 },
        delay: { time: 0.25, feedback: 0.3, wet: 0.2 },
        reverb: { decay: 1.5, wet: 0.15 },
      },
    }));

    const channel = lastMockResult(Tone.Channel);
    const eq = lastMockResult(Tone.EQ3);
    const comp = lastMockResult(Tone.Compressor);
    const delay = lastMockResult(Tone.FeedbackDelay);
    const reverb = lastMockResult(Tone.Reverb);

    expect((channel._connections as any[]).map((n: any) => n._label)).toContain("eq3");
    expect((eq._connections as any[]).map((n: any) => n._label)).toContain("compressor");
    expect((comp._connections as any[]).map((n: any) => n._label)).toContain("delay");
    expect((delay._connections as any[]).map((n: any) => n._label)).toContain("reverb");
    expect((reverb._connections as any[]).map((n: any) => n._label)).toContain("limiter");
  });
});

describe("AudioEngine — audio player routing", () => {
  // Uses the exported singleton

  beforeEach(async () => {
    vi.clearAllMocks();
    await engine.initialize();
  });

  it("audio player connects to channel head (not directly to destination or limiter)", async () => {
    const fakeBuffer = { duration: 4 } as any;
    const track = makeTrack({
      type: "audio",
      effects: {},
      clips: [
        { id: "c1", startTime: 0, duration: 4, offset: 0, fileUrl: "https://s3/ld.wav", buffer: fakeBuffer },
      ],
    });

    await engine.setTrack(track);

    const player = lastMockResult(Tone.Player);
    const playerTargets = (player._connections as any[]).map((n: any) => n._label);

    // Player → channel (not destination or limiter)
    expect(playerTargets).toContain("channel");
    expect(playerTargets).not.toContain("destination");
    expect(playerTargets).not.toContain("limiter");
  });
});

describe("AudioEngine — scheduleClip routing", () => {
  // Uses the exported singleton

  beforeEach(async () => {
    vi.clearAllMocks();
    await engine.initialize();
  });

  it("scheduleClip routes through existing track channel", async () => {
    // Register track first
    await engine.setTrack(makeTrack({ id: "t99", effects: {} }));
    vi.clearAllMocks(); // Reset counts, keep the channel registered

    await engine.scheduleClip("clip-1", "https://s3/snare.wav", 1.0, 3.0, "t99", 0.8);

    const player = lastMockResult(Tone.Player);
    const targets = (player._connections as any[]).map((n: any) => n._label);

    // Should go through channel (and on to limiter via the chain)
    expect(targets).toContain("channel");
    expect(targets).not.toContain("destination");
  });

  it("scheduleClip falls back to limiter for unknown track", async () => {
    await engine.scheduleClip("clip-x", "https://s3/kick.wav", 0, 2.0, "nonexistent", 1.0);

    const player = lastMockResult(Tone.Player);
    const targets = (player._connections as any[]).map((n: any) => n._label);

    expect(targets).toContain("limiter");
  });
});
