/**
 * useMIDIPersistence — wires the MIDIControllerService to the DB-backed
 * midi.saveMappings / getMappings tRPC procedures.
 *
 * Amapiano production context: producers bind hardware controllers (Akai MPC,
 * Arturia KeyLab, Native Instruments controllers) to DAW parameters —
 * volume/pan per track and global tempo. Mappings must survive page reloads
 * without requiring the user to redo MIDI learn on every session.
 *
 * Lifecycle:
 *   1. On mount: fetch all persisted mappings for the current user and load
 *      them into MIDIControllerService in-memory state.
 *   2. Register a save callback on the service so that any subsequent
 *      addMapping / removeMapping triggers a debounced DB persist (500 ms
 *      window, coalesced per device — see MIDIControllerService.triggerDebouncedSave).
 *   3. On unmount: clear the save callback to prevent writes after the DAW
 *      component tree has unmounted.
 *
 * Usage: call once at the DAW root (e.g., DAW.tsx) — not per-track.
 */

import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { midiController } from "@/services/MIDIController";
import type { MIDIMapping } from "@/services/MIDIController";

export function useMIDIPersistence() {
  const utils = trpc.useUtils();
  const saveMappingsMutation = trpc.midi.saveMappings.useMutation();
  // Stable ref so the save callback closure never stales
  const saveMutationRef = useRef(saveMappingsMutation);
  saveMutationRef.current = saveMappingsMutation;

  // Load persisted mappings on mount
  const { data: persistedMappings } = trpc.midi.getMappings.useQuery(undefined, {
    staleTime: Infinity, // only re-fetch on explicit invalidation
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!persistedMappings) return;
    const all: MIDIMapping[] = persistedMappings.flatMap(
      row => row.mappings as MIDIMapping[]
    );
    midiController.loadMappings(all);
  }, [persistedMappings]);

  // Register the debounced save callback
  useEffect(() => {
    const saveCallback = (deviceId: string, mappings: MIDIMapping[]) => {
      const device = persistedMappings?.find(r => r.deviceId === deviceId);
      saveMutationRef.current.mutate(
        {
          deviceId,
          deviceName: device?.deviceName ?? deviceId,
          mappings,
        },
        {
          onSuccess: () => {
            // Invalidate so getMappings reflects the latest state on next read
            utils.midi.getMappings.invalidate();
          },
        }
      );
    };

    midiController.setSaveCallback(saveCallback);
    return () => {
      midiController.setSaveCallback(null);
    };
  }, [persistedMappings, utils]);
}
