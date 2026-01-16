import * as Tone from 'tone';

/**
 * AudioEngine - Complete audio playback, recording, and processing service
 * Handles transport controls, audio file loading, effects, and real-time visualization
 */

export interface Note {
  pitch: string; // e.g., "C4", "F#5"
  time: number; // in seconds
  duration: number; // in seconds
  velocity: number; // 0-1
}

export interface AudioClip {
  id: string;
  startTime: number; // Position in timeline (seconds)
  duration: number; // Clip duration (seconds)
  offset: number; // Offset into the audio file (seconds)
  fileUrl: string; // URL to audio file
  buffer: Tone.ToneAudioBuffer | null;
}

export interface AutomationPoint {
  time: number; // in seconds
  value: number; // normalized 0-1
}

export interface AutomationLane {
  parameter: 'volume' | 'pan' | 'eq_low' | 'eq_mid' | 'eq_high' | 'reverb_wet' | 'delay_wet';
  points: AutomationPoint[];
  enabled: boolean;
}

export interface Track {
  id: string;
  name: string;
  type: 'midi' | 'audio';
  instrument?: string; // For MIDI tracks
  clips: AudioClip[]; // For audio tracks
  notes: Note[]; // For MIDI tracks
  volume: number; // -60 to 0 dB
  pan: number; // -1 to 1
  muted: boolean;
  solo: boolean;
  effects: EffectChain;
  automation: AutomationLane[]; // Automation lanes
}

export interface EffectChain {
  reverb?: { wet: number; decay: number };
  delay?: { wet: number; time: string; feedback: number };
  eq?: { low: number; mid: number; high: number };
  compressor?: { threshold: number; ratio: number; attack: number; release: number };
}

export type TransportState = 'started' | 'stopped' | 'paused';

export interface WaveformData {
  peaks: Float32Array;
  length: number;
  duration: number;
}

class AudioEngineService {
  private samplers: Map<string, Tone.Sampler> = new Map();
  private audioPlayers: Map<string, Tone.Player[]> = new Map(); // Track ID -> Players
  private tracks: Map<string, Track> = new Map();
  private trackChannels: Map<string, Tone.Channel> = new Map();
  private trackEffects: Map<string, any[]> = new Map();
  private isInitialized = false;
  private metronome: Tone.Synth | null = null;
  private metronomeEnabled = false;
  private masterChannel: Tone.Channel | null = null;
  private limiter: Tone.Limiter | null = null;
  private analyzer: Tone.Analyser | null = null;
  private recorder: Tone.Recorder | null = null;
  private audioBufferCache: Map<string, Tone.ToneAudioBuffer> = new Map();

  /**
   * Initialize the audio context (required for user interaction)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    await Tone.start();
    console.log('[AudioEngine] Initialized. Audio context state:', Tone.getContext().state);
    
    // Create master channel with limiter
    this.masterChannel = new Tone.Channel({ volume: 0, pan: 0 }).toDestination();
    this.limiter = new Tone.Limiter(-1).connect(this.masterChannel);
    
    // Create analyzer for visualization
    this.analyzer = new Tone.Analyser('waveform', 1024);
    this.masterChannel.connect(this.analyzer);
    
    // Create recorder
    this.recorder = new Tone.Recorder();
    this.masterChannel.connect(this.recorder);
    
    // Create metronome
    this.metronome = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    }).toDestination();
    
    this.isInitialized = true;
  }

  /**
   * Load audio file and return buffer
   */
  async loadAudioFile(url: string): Promise<Tone.ToneAudioBuffer> {
    // Check cache first
    if (this.audioBufferCache.has(url)) {
      return this.audioBufferCache.get(url)!;
    }

    return new Promise((resolve, reject) => {
      const buffer = new Tone.ToneAudioBuffer(url, () => {
        console.log(`[AudioEngine] Loaded audio file: ${url}`);
        this.audioBufferCache.set(url, buffer);
        resolve(buffer);
      }, reject);
    });
  }

  /**
   * Generate waveform data from audio buffer
   */
  generateWaveform(buffer: Tone.ToneAudioBuffer, samples: number = 1000): WaveformData {
    const channelData = buffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samples);
    const peaks = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      const end = start + blockSize;
      let max = 0;

      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) max = abs;
      }

      peaks[i] = max;
    }

    return {
      peaks,
      length: samples,
      duration: buffer.duration,
    };
  }

  /**
   * Load audio samples for a specific instrument (MIDI)
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
      });
      
      // Don't connect to destination yet - will connect through track channel
      sampler.disconnect();
    });
  }

  /**
   * Create effect chain for a track
   */
  private createEffectChain(trackId: string, effects: EffectChain): any[] {
    const chain: any[] = [];

    if (effects.eq) {
      const eq = new Tone.EQ3({
        low: effects.eq.low,
        mid: effects.eq.mid,
        high: effects.eq.high,
      });
      chain.push(eq);
    }

    if (effects.compressor) {
      const compressor = new Tone.Compressor({
        threshold: effects.compressor.threshold,
        ratio: effects.compressor.ratio,
        attack: effects.compressor.attack,
        release: effects.compressor.release,
      });
      chain.push(compressor);
    }

    if (effects.delay) {
      const delay = new Tone.FeedbackDelay({
        delayTime: effects.delay.time,
        feedback: effects.delay.feedback,
        wet: effects.delay.wet,
      });
      chain.push(delay);
    }

    if (effects.reverb) {
      const reverb = new Tone.Reverb({
        decay: effects.reverb.decay,
        wet: effects.reverb.wet,
      });
      chain.push(reverb);
    }

    return chain;
  }

  /**
   * Add or update a track
   */
  async setTrack(track: Track): Promise<void> {
    // Dispose existing track resources
    if (this.tracks.has(track.id)) {
      this.removeTrack(track.id);
    }

    this.tracks.set(track.id, track);

    // Create track channel
    const channel = new Tone.Channel({
      volume: track.volume,
      pan: track.pan,
      mute: track.muted,
      solo: track.solo,
    }).connect(this.limiter!);

    this.trackChannels.set(track.id, channel);

    // Create and connect effect chain
    const effects = this.createEffectChain(track.id, track.effects);
    this.trackEffects.set(track.id, effects);

    // Connect effects in series
    let input: Tone.ToneAudioNode = channel;
    effects.forEach(effect => {
      effect.connect(input);
      input = effect;
    });

    // Load audio clips for audio tracks
    if (track.type === 'audio') {
      const players: Tone.Player[] = [];

      for (const clip of track.clips) {
        if (!clip.buffer) {
          clip.buffer = await this.loadAudioFile(clip.fileUrl);
        }

        const player = new Tone.Player(clip.buffer).connect(input);
        players.push(player);
      }

      this.audioPlayers.set(track.id, players);
    }

    // Connect MIDI instrument
    if (track.type === 'midi' && track.instrument) {
      const sampler = this.samplers.get(track.instrument);
      if (sampler) {
        sampler.connect(input);
      }
    }

    console.log(`[AudioEngine] Track set: ${track.name} (${track.type})`);
  }

  /**
   * Remove a track
   */
  removeTrack(trackId: string): void {
    // Dispose players
    const players = this.audioPlayers.get(trackId);
    if (players) {
      players.forEach(p => p.dispose());
      this.audioPlayers.delete(trackId);
    }

    // Dispose effects
    const effects = this.trackEffects.get(trackId);
    if (effects) {
      effects.forEach(e => e.dispose());
      this.trackEffects.delete(trackId);
    }

    // Dispose channel
    const channel = this.trackChannels.get(trackId);
    if (channel) {
      channel.dispose();
      this.trackChannels.delete(trackId);
    }

    this.tracks.delete(trackId);
    console.log(`[AudioEngine] Track removed: ${trackId}`);
  }

  /**
   * Schedule automation for a track parameter
   */
  private scheduleAutomation(trackId: string, lane: AutomationLane): void {
    if (!lane.enabled || lane.points.length === 0) return;

    const channel = this.trackChannels.get(trackId);
    if (!channel) return;

    // Get the audio param to automate
    let param: Tone.Param<any> | undefined;
    
    switch (lane.parameter) {
      case 'volume':
        param = channel.volume;
        break;
      case 'pan':
        param = channel.pan;
        break;
      // Add more parameters as needed
      default:
        console.warn(`[AudioEngine] Unsupported automation parameter: ${lane.parameter}`);
        return;
    }

    // Sort points by time
    const sortedPoints = [...lane.points].sort((a, b) => a.time - b.time);

    // Schedule automation points
    sortedPoints.forEach((point, index) => {
      const nextPoint = sortedPoints[index + 1];
      
      // Convert normalized value to parameter range
      let value: number;
      if (lane.parameter === 'volume') {
        // Volume: 0-1 → -60 to 0 dB
        value = point.value * 60 - 60;
      } else if (lane.parameter === 'pan') {
        // Pan: 0-1 → -1 to 1
        value = point.value * 2 - 1;
      } else {
        value = point.value;
      }

      if (nextPoint) {
        // Linear ramp to next point
        Tone.getTransport().schedule((time) => {
          param!.linearRampTo(value, nextPoint.time - point.time, time);
        }, point.time);
      } else {
        // Set value immediately for last point
        Tone.getTransport().schedule((time) => {
          param!.setValueAtTime(value, time);
        }, point.time);
      }
    });
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

      // Schedule automation
      if (track.automation && track.automation.length > 0) {
        track.automation.forEach(lane => {
          this.scheduleAutomation(track.id, lane);
        });
      }

      // Schedule MIDI notes
      if (track.type === 'midi' && track.instrument) {
        const sampler = this.samplers.get(track.instrument);
        if (!sampler) {
          console.warn(`[AudioEngine] No sampler found for instrument: ${track.instrument}`);
          return;
        }

        track.notes.forEach(note => {
          Tone.getTransport().schedule((time) => {
            sampler.triggerAttackRelease(note.pitch, note.duration, time, note.velocity);
          }, note.time);
        });
      }

      // Schedule audio clips
      if (track.type === 'audio') {
        const players = this.audioPlayers.get(track.id);
        if (!players) return;

        track.clips.forEach((clip, index) => {
          const player = players[index];
          if (!player) return;

          Tone.getTransport().schedule((time) => {
            player.start(time, clip.offset, clip.duration);
          }, clip.startTime);
        });
      }
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
      if (track.type === 'midi') {
        track.notes.forEach(note => {
          const endTime = note.time + note.duration;
          if (endTime > maxDuration) maxDuration = endTime;
        });
      } else if (track.type === 'audio') {
        track.clips.forEach(clip => {
          const endTime = clip.startTime + clip.duration;
          if (endTime > maxDuration) maxDuration = endTime;
        });
      }
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
   * Update track volume
   */
  setTrackVolume(trackId: string, volume: number): void {
    const channel = this.trackChannels.get(trackId);
    if (channel) {
      channel.volume.value = volume;
    }
  }

  /**
   * Update track pan
   */
  setTrackPan(trackId: string, pan: number): void {
    const channel = this.trackChannels.get(trackId);
    if (channel) {
      channel.pan.value = pan;
    }
  }

  /**
   * Toggle track mute
   */
  setTrackMute(trackId: string, muted: boolean): void {
    const channel = this.trackChannels.get(trackId);
    if (channel) {
      channel.mute = muted;
    }
  }

  /**
   * Toggle track solo
   */
  setTrackSolo(trackId: string, solo: boolean): void {
    const channel = this.trackChannels.get(trackId);
    if (channel) {
      channel.solo = solo;
    }
  }

  /**
   * Get waveform data for visualization
   */
  getWaveformData(): Float32Array | null {
    if (!this.analyzer) return null;
    const value = this.analyzer.getValue();
    return Array.isArray(value) ? value[0] : value;
  }

  /**
   * Schedule audio clip for playback on timeline
   */
  async scheduleClip(
    clipId: string,
    audioUrl: string,
    startTime: number,
    duration: number,
    trackId: string,
    volume: number = 1.0
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Load audio if not already loaded
      const buffer = await this.loadAudioFile(audioUrl);

      // Create player for this clip
      const player = new Tone.Player({
        url: buffer,
        volume: Tone.gainToDb(volume),
      }).toDestination();

      // Store player reference
      if (!this.audioPlayers.has(trackId)) {
        this.audioPlayers.set(trackId, []);
      }
      this.audioPlayers.get(trackId)!.push(player);

      // Schedule playback
      player.start(`+${startTime}`);
      player.stop(`+${startTime + duration}`);

      console.log(`[AudioEngine] Scheduled clip ${clipId} at ${startTime}s for ${duration}s`);
    } catch (error) {
      console.error(`[AudioEngine] Failed to schedule clip ${clipId}:`, error);
      throw error;
    }
  }

  /**
   * Clear all scheduled clips
   */
  clearScheduledClips(): void {
    this.audioPlayers.forEach((players) => {
      players.forEach((player) => {
        player.stop();
        player.dispose();
      });
    });
    this.audioPlayers.clear();
  }

  /**
   * Play timeline from current position
   */
  async playTimeline(
    clips: Array<{
      id: string;
      fileUrl: string;
      startTime: number;
      duration: number;
      trackId: string;
      gain: number;
    }>,
    currentTime: number = 0
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Clear existing scheduled clips
    this.clearScheduledClips();

    // Filter clips that should play from current time
    const activeClips = clips.filter(
      (clip) => clip.startTime + clip.duration > currentTime
    );

    // Schedule each clip
    for (const clip of activeClips) {
      const offsetTime = Math.max(0, clip.startTime - currentTime);
      const offsetDuration = clip.duration - Math.max(0, currentTime - clip.startTime);

      await this.scheduleClip(
        clip.id.toString(),
        clip.fileUrl,
        offsetTime,
        offsetDuration,
        clip.trackId.toString(),
        clip.gain
      );
    }

    // Start playback
    this.play();
  }

  /**
   * Stop timeline playback
   */
  stopTimeline(): void {
    this.stop();
    this.clearScheduledClips();
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    if (!this.recorder) {
      throw new Error('Recorder not initialized');
    }
    await this.recorder.start();
    console.log('[AudioEngine] Recording started');
  }

  /**
   * Stop recording and return audio blob
   */
  async stopRecording(): Promise<Blob> {
    if (!this.recorder) {
      throw new Error('Recorder not initialized');
    }
    const recording = await this.recorder.stop();
    console.log('[AudioEngine] Recording stopped');
    return recording;
  }

  /**
   * Export current mix to audio file
   */
  async exportToAudio(): Promise<Blob> {
    // Start recording
    await this.startRecording();
    
    // Play from beginning
    this.setPosition(0);
    this.play();
    
    // Wait for playback to complete
    const duration = this.getTotalDuration();
    await new Promise(resolve => setTimeout(resolve, duration * 1000 + 1000));
    
    // Stop and get recording
    this.stop();
    const blob = await this.stopRecording();
    
    return blob;
  }

  /**
   * Cleanup and dispose of all audio resources
   */
  dispose(): void {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    
    // Dispose all tracks
    Array.from(this.tracks.keys()).forEach(trackId => this.removeTrack(trackId));
    
    // Dispose samplers
    this.samplers.forEach(sampler => sampler.dispose());
    this.samplers.clear();
    
    // Dispose master channel and effects
    if (this.limiter) {
      this.limiter.dispose();
      this.limiter = null;
    }
    
    if (this.masterChannel) {
      this.masterChannel.dispose();
      this.masterChannel = null;
    }
    
    if (this.analyzer) {
      this.analyzer.dispose();
      this.analyzer = null;
    }
    
    if (this.recorder) {
      this.recorder.dispose();
      this.recorder = null;
    }
    
    if (this.metronome) {
      this.metronome.dispose();
      this.metronome = null;
    }
    
    this.audioBufferCache.clear();
    this.tracks.clear();
    this.isInitialized = false;
    console.log('[AudioEngine] Disposed');
  }
}

// Export singleton instance
export const AudioEngine = new AudioEngineService();
