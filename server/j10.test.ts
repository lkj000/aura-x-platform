/**
 * J10: MIDI Controller Persistence — integration tests
 *
 * Covers:
 *   1. midi.saveMappings creates a new row for a new (userId, deviceId) pair
 *   2. midi.saveMappings overwrites mappings on repeat calls (upsert semantics)
 *   3. midi.getMappings returns all persisted mappings for the current user
 *   4. midi.getMappings returns empty array when no mappings exist
 *   5. midi.deleteMappings removes mappings for a specific deviceId
 *   6. midi.deleteMappings is a no-op when no row exists
 *   7. midi.saveMappings validates mapping schema (controller 0-127)
 *   8. midi.saveMappings validates curve enum ("linear" | "exponential" | "logarithmic")
 *   9. midi.getMappings is protected (unauthenticated call throws)
 *  10. midi.saveMappings preserves deviceName across upserts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

// ── In-memory MIDI mapping store ──────────────────────────────────────────────

interface MidiRow {
  id: number;
  userId: number;
  deviceId: string;
  deviceName?: string;
  mappings: unknown[];
  updatedAt: Date;
  createdAt: Date;
}

let midiStore: MidiRow[] = [];
let nextId = 1;

vi.mock('./db', () => ({
  saveMidiMappings: vi.fn(async (params: {
    userId: number;
    deviceId: string;
    deviceName?: string;
    mappings: unknown[];
  }) => {
    const existing = midiStore.find(
      r => r.userId === params.userId && r.deviceId === params.deviceId
    );
    if (existing) {
      existing.mappings = params.mappings;
      if (params.deviceName !== undefined) existing.deviceName = params.deviceName;
      existing.updatedAt = new Date();
    } else {
      midiStore.push({
        id: nextId++,
        userId: params.userId,
        deviceId: params.deviceId,
        deviceName: params.deviceName,
        mappings: params.mappings,
        updatedAt: new Date(),
        createdAt: new Date(),
      });
    }
  }),
  getMidiMappings: vi.fn(async (userId: number) =>
    midiStore.filter(r => r.userId === userId)
  ),
  deleteMidiMappings: vi.fn(async (userId: number, deviceId: string) => {
    midiStore = midiStore.filter(
      r => !(r.userId === userId && r.deviceId === deviceId)
    );
  }),
  // Other DB functions used by auth procedures
  getUserById: vi.fn(async (id: number) => ({ id, email: 'test@example.com', role: 'producer' })),
}));

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeCtx(userId = 1): TrpcContext {
  return {
    user: { id: userId, email: 'test@example.com', role: 'producer' },
    req: {} as any,
    res: {} as any,
  };
}

const DEVICE_ID = 'akai-mpk-mini-01';
const DEVICE_NAME = 'Akai MPK Mini';

const MAPPING_VOLUME: Record<string, unknown> = {
  id: 'mapping-1',
  deviceId: DEVICE_ID,
  controller: 7,   // CC 7 = volume
  parameter: 'track:abc123:volume',
  min: 0,
  max: 1,
  curve: 'linear',
};

const MAPPING_PAN: Record<string, unknown> = {
  id: 'mapping-2',
  deviceId: DEVICE_ID,
  controller: 10,  // CC 10 = pan
  parameter: 'track:abc123:pan',
  min: -1,
  max: 1,
  curve: 'linear',
};

const MAPPING_TEMPO: Record<string, unknown> = {
  id: 'mapping-3',
  deviceId: DEVICE_ID,
  controller: 14,
  parameter: 'tempo',
  min: 115,
  max: 130,
  curve: 'logarithmic',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('midi.saveMappings', () => {
  beforeEach(() => {
    midiStore = [];
    nextId = 1;
    vi.clearAllMocks();
  });

  it('creates a new row for a new (userId, deviceId) pair', async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.midi.saveMappings({
      deviceId: DEVICE_ID,
      deviceName: DEVICE_NAME,
      mappings: [MAPPING_VOLUME],
    });
    expect(result.success).toBe(true);
    expect(midiStore).toHaveLength(1);
    expect(midiStore[0].deviceId).toBe(DEVICE_ID);
    expect(midiStore[0].deviceName).toBe(DEVICE_NAME);
    expect(midiStore[0].mappings).toHaveLength(1);
  });

  it('overwrites mappings on repeat call (upsert semantics)', async () => {
    const caller = appRouter.createCaller(makeCtx());
    await caller.midi.saveMappings({
      deviceId: DEVICE_ID,
      deviceName: DEVICE_NAME,
      mappings: [MAPPING_VOLUME],
    });
    await caller.midi.saveMappings({
      deviceId: DEVICE_ID,
      deviceName: DEVICE_NAME,
      mappings: [MAPPING_VOLUME, MAPPING_PAN, MAPPING_TEMPO],
    });
    // Still only one row
    expect(midiStore).toHaveLength(1);
    expect(midiStore[0].mappings).toHaveLength(3);
  });

  it('preserves deviceName across upserts when provided', async () => {
    const caller = appRouter.createCaller(makeCtx());
    await caller.midi.saveMappings({ deviceId: DEVICE_ID, deviceName: 'First Name', mappings: [] });
    await caller.midi.saveMappings({ deviceId: DEVICE_ID, deviceName: 'Updated Name', mappings: [MAPPING_VOLUME] });
    expect(midiStore[0].deviceName).toBe('Updated Name');
  });

  it('creates separate rows for different devices', async () => {
    const caller = appRouter.createCaller(makeCtx());
    await caller.midi.saveMappings({ deviceId: 'device-a', mappings: [MAPPING_VOLUME] });
    await caller.midi.saveMappings({ deviceId: 'device-b', mappings: [MAPPING_PAN] });
    expect(midiStore).toHaveLength(2);
  });

  it('rejects controller value > 127 (out of MIDI CC range)', async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.midi.saveMappings({
        deviceId: DEVICE_ID,
        mappings: [{ ...MAPPING_VOLUME, controller: 128 }],
      })
    ).rejects.toThrow();
  });

  it('rejects controller value < 0', async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.midi.saveMappings({
        deviceId: DEVICE_ID,
        mappings: [{ ...MAPPING_VOLUME, controller: -1 }],
      })
    ).rejects.toThrow();
  });

  it('rejects invalid curve enum value', async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.midi.saveMappings({
        deviceId: DEVICE_ID,
        mappings: [{ ...MAPPING_VOLUME, curve: 'quadratic' }],
      })
    ).rejects.toThrow();
  });
});

describe('midi.getMappings', () => {
  beforeEach(() => {
    midiStore = [];
    nextId = 1;
    vi.clearAllMocks();
  });

  it('returns empty array when no mappings exist for user', async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.midi.getMappings();
    expect(result).toEqual([]);
  });

  it('returns all persisted mappings for the current user', async () => {
    const caller = appRouter.createCaller(makeCtx());
    await caller.midi.saveMappings({
      deviceId: DEVICE_ID,
      deviceName: DEVICE_NAME,
      mappings: [MAPPING_VOLUME, MAPPING_PAN],
    });
    const result = await caller.midi.getMappings();
    expect(result).toHaveLength(1);
    expect(result[0].deviceId).toBe(DEVICE_ID);
    expect(result[0].deviceName).toBe(DEVICE_NAME);
    expect((result[0].mappings as unknown[]).length).toBe(2);
  });

  it('does not return mappings belonging to a different user', async () => {
    const callerA = appRouter.createCaller(makeCtx(1));
    const callerB = appRouter.createCaller(makeCtx(2));
    await callerA.midi.saveMappings({ deviceId: DEVICE_ID, mappings: [MAPPING_VOLUME] });
    const resultB = await callerB.midi.getMappings();
    expect(resultB).toHaveLength(0);
  });

  it('returns updatedAt timestamp on each device row', async () => {
    const caller = appRouter.createCaller(makeCtx());
    await caller.midi.saveMappings({ deviceId: DEVICE_ID, mappings: [MAPPING_VOLUME] });
    const result = await caller.midi.getMappings();
    expect(result[0].updatedAt).toBeDefined();
  });

  it('is protected — throws when called without auth', async () => {
    const unauthCtx: TrpcContext = { user: null as any, req: {} as any, res: {} as any };
    const caller = appRouter.createCaller(unauthCtx);
    await expect(caller.midi.getMappings()).rejects.toThrow();
  });
});

describe('midi.deleteMappings', () => {
  beforeEach(() => {
    midiStore = [];
    nextId = 1;
    vi.clearAllMocks();
  });

  it('removes mappings for a specific deviceId', async () => {
    const caller = appRouter.createCaller(makeCtx());
    await caller.midi.saveMappings({ deviceId: DEVICE_ID, mappings: [MAPPING_VOLUME] });
    await caller.midi.saveMappings({ deviceId: 'other-device', mappings: [MAPPING_PAN] });
    await caller.midi.deleteMappings({ deviceId: DEVICE_ID });
    expect(midiStore.find(r => r.deviceId === DEVICE_ID)).toBeUndefined();
    expect(midiStore.find(r => r.deviceId === 'other-device')).toBeDefined();
  });

  it('returns success: true even when no row exists (idempotent)', async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.midi.deleteMappings({ deviceId: 'nonexistent-device' });
    expect(result.success).toBe(true);
  });

  it('does not remove mappings belonging to a different user', async () => {
    const callerA = appRouter.createCaller(makeCtx(1));
    const callerB = appRouter.createCaller(makeCtx(2));
    await callerA.midi.saveMappings({ deviceId: DEVICE_ID, mappings: [MAPPING_VOLUME] });
    // User B tries to delete user A's device
    await callerB.midi.deleteMappings({ deviceId: DEVICE_ID });
    // User A's row should still exist
    expect(midiStore.find(r => r.userId === 1 && r.deviceId === DEVICE_ID)).toBeDefined();
  });
});
