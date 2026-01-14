import * as Tone from 'tone';

/**
 * AudioEngine - Centralized audio playback and scheduling service using Tone.js
 * Handles transport controls, sample loading, and real-time audio scheduling
 */

export interface Note {
  pitch: string; // e.g., "C4", "F#5"
  time: number; // in seconds
  duration: number; // in seconds
  velocity: number; // 0-1
}

export interface Track {
  id: string;
  name: string;
  instrument: string;
  notes: Note[];
  volume: number; // -60 to 0 dB
  pan: number; // -1 to 1
  muted: boolean;
  solo: boolean;
}

export type TransportState = 'started' | 'stopped' | 'paused';

class AudioEngineService {
  private samplers: Map<string, Tone.Sampler> = new Map();
  private tracks: Map<string, Track> = new Map();
  private isInitialized = false;
  private metronome: Tone.Synth | null = null;
  private metronomeEnabled = false;

  /**
   * Initialize the audio context (required for user interaction)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    await Tone.start();
    console.log('[AudioEngine] Initialized. Audio context state:', Tone.getContext().state);
    
    // Create metronome
    this.metronome = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    }).toDestination();
    
    this.isInitialized = true;
  }

  /**
   * Load audio samples for a specific instrument
   */
  async loadInstrument(instrumentId: string, samples: { [note: string]: string }): Promise<void> {
    if (this.samplers.has(instrumentId)) {
      console.log(`[AudioEngine] Instrument ${instrumentId} already loaded`);
      return;
    }

    return new Promise((resolve, reject) => {
      const sampler = new Tone.Sampler({
        urls: samples,
        onload: () => {
          console.log(`[AudioEngine] Loaded instrument: ${instrumentId}`);
          this.samplers.set(instrumentId, sampler);
          resolve();
        },
        onerror: (error) => {
          console.error(`[AudioEngine] Failed to load instrument ${instrumentId}:`, error);
          reject(error);
        },
      }).toDestination();
    });
  }

  /**
   * Add or update a track
   */
  setTrack(track: Track): void {
    this.tracks.set(track.id, track);
    console.log(`[AudioEngine] Track set: ${track.name}`);
  }

  /**
   * Remove a track
   */
  removeTrack(trackId: string): void {
    this.tracks.delete(trackId);
    console.log(`[AudioEngine] Track removed: ${trackId}`);
  }

  /**
   * Schedule all tracks for playback
   */
  private scheduleAllTracks(): void {
    Tone.getTransport().cancel(); // Clear existing events

    const soloTracks = Array.from(this.tracks.values()).filter(t => t.solo);
    const tracksToPlay = soloTracks.length > 0 ? soloTracks : Array.from(this.tracks.values());

    tracksToPlay.forEach(track => {
      if (track.muted) return;

      const sampler = this.samplers.get(track.instrument);
      if (!sampler) {
        console.warn(`[AudioEngine] No sampler found for instrument: ${track.instrument}`);
        return;
      }

      // Apply track-level volume and pan
      sampler.volume.value = track.volume;
      // Note: Tone.Sampler doesn't have a built-in pan, you'd need a Tone.Panner

      track.notes.forEach(note => {
        Tone.getTransport().schedule((time) => {
          sampler.triggerAttackRelease(note.pitch, note.duration, time, note.velocity);
        }, note.time);
      });
    });

    // Schedule metronome if enabled
    if (this.metronomeEnabled && this.metronome) {
      const bpm = Tone.getTransport().bpm.value;
      const beatDuration = 60 / bpm;
      const totalDuration = this.getTotalDuration();
      
      for (let beat = 0; beat < totalDuration / beatDuration; beat++) {
        Tone.getTransport().schedule((time) => {
          this.metronome!.triggerAttackRelease(beat % 4 === 0 ? 'C5' : 'C4', '16n', time, 0.5);
        }, beat * beatDuration);
      }
    }
  }

  /**
   * Get the total duration of all tracks
   */
  private getTotalDuration(): number {
    let maxDuration = 0;
    this.tracks.forEach(track => {
      track.notes.forEach(note => {
        const endTime = note.time + note.duration;
        if (endTime > maxDuration) maxDuration = endTime;
      });
    });
    return maxDuration;
  }

  /**
   * Play from current position
   */
  play(): void {
    if (!this.isInitialized) {
      console.warn('[AudioEngine] Not initialized. Call initialize() first.');
      return;
    }

    this.scheduleAllTracks();
    Tone.getTransport().start();
    console.log('[AudioEngine] Playback started');
  }

  /**
   * Pause playback
   */
  pause(): void {
    Tone.getTransport().pause();
    console.log('[AudioEngine] Playback paused');
  }

  /**
   * Stop playback and reset to beginning
   */
  stop(): void {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    console.log('[AudioEngine] Playback stopped');
  }

  /**
   * Get current transport state
   */
  getState(): TransportState {
    return Tone.getTransport().state;
  }

  /**
   * Set tempo (BPM)
   */
  setTempo(bpm: number): void {
    Tone.getTransport().bpm.value = bpm;
    console.log(`[AudioEngine] Tempo set to ${bpm} BPM`);
  }

  /**
   * Get current tempo
   */
  getTempo(): number {
    return Tone.getTransport().bpm.value;
  }

  /**
   * Set playback position (in seconds)
   */
  setPosition(seconds: number): void {
    Tone.getTransport().seconds = seconds;
  }

  /**
   * Get current playback position (in seconds)
   */
  getPosition(): number {
    return Tone.getTransport().seconds;
  }

  /**
   * Toggle metronome
   */
  toggleMetronome(enabled: boolean): void {
    this.metronomeEnabled = enabled;
    console.log(`[AudioEngine] Metronome ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Cleanup and dispose of all audio resources
   */
  dispose(): void {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    
    this.samplers.forEach(sampler => sampler.dispose());
    this.samplers.clear();
    
    if (this.metronome) {
      this.metronome.dispose();
      this.metronome = null;
    }
    
    this.tracks.clear();
    this.isInitialized = false;
    console.log('[AudioEngine] Disposed');
  }
}

// Export singleton instance
export const AudioEngine = new AudioEngineService();
