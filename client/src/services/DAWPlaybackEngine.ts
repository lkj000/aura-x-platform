/**
 * DAW Playback Engine using Web Audio API
 * Handles real-time audio playback for timeline clips
 */

import type { AudioClip, Track } from '@/stores/dawStore';

export class DAWPlaybackEngine {
  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();
  private gainNodes: Map<string, GainNode> = new Map();
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private pauseTime: number = 0;

  constructor() {
    // Initialize audio context on first interaction
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Resume audio context (required after user interaction)
   */
  async resumeContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Load audio file and decode to AudioBuffer
   */
  async loadAudioClip(url: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    // Check cache first
    if (this.audioBuffers.has(url)) {
      return this.audioBuffers.get(url)!;
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Cache the buffer
      this.audioBuffers.set(url, audioBuffer);
      
      return audioBuffer;
    } catch (error) {
      console.error('[DAWPlaybackEngine] Failed to load audio clip:', url, error);
      throw error;
    }
  }

  /**
   * Generate waveform data from AudioBuffer
   */
  generateWaveformData(audioBuffer: AudioBuffer, samples: number = 100): number[] {
    const channelData = audioBuffer.getChannelData(0); // Use first channel
    const blockSize = Math.floor(channelData.length / samples);
    const waveformData: number[] = [];

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      const end = start + blockSize;
      let sum = 0;

      for (let j = start; j < end && j < channelData.length; j++) {
        sum += Math.abs(channelData[j]);
      }

      waveformData.push(sum / blockSize);
    }

    return waveformData;
  }

  /**
   * Play all clips in the timeline from a specific position
   */
  async playTimeline(
    tracks: Track[],
    startPosition: number = 0,
    onPositionUpdate?: (position: number) => void
  ): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    await this.resumeContext();

    // Stop any existing playback
    this.stopTimeline();

    this.isPlaying = true;
    this.startTime = this.audioContext.currentTime - startPosition;
    this.pauseTime = 0;

    // Collect all clips from all tracks
    const allClips = tracks.flatMap(track => 
      track.clips.map(clip => ({ clip, track }))
    );

    // Load and schedule all clips
    for (const clipWithTrack of allClips) {
      const { clip, track } = clipWithTrack;

      // Skip muted tracks or clips
      if (track.muted || clip.muted) continue;

      try {
        // Load audio buffer
        const audioBuffer = await this.loadAudioClip(clip.url);

        // Create source node
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;

        // Create gain node for volume control
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = clip.volume * track.volume;

        // Connect: source → gain → destination
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Calculate when to start this clip
        const clipStartTime = this.audioContext.currentTime + (clip.startTime - startPosition);
        
        // Only play clips that haven't passed yet
        if (clipStartTime >= this.audioContext.currentTime) {
          source.start(clipStartTime);
          
          // Store references
          this.activeSources.set(clip.id, source);
          this.gainNodes.set(clip.id, gainNode);

          // Clean up when finished
          source.onended = () => {
            this.activeSources.delete(clip.id);
            this.gainNodes.delete(clip.id);
          };
        }
      } catch (error) {
        console.error('[DAWPlaybackEngine] Failed to play clip:', clip.name, error);
      }
    }

    // Update position periodically
    if (onPositionUpdate) {
      const updateInterval = setInterval(() => {
        if (!this.isPlaying) {
          clearInterval(updateInterval);
          return;
        }

        const currentPosition = this.audioContext!.currentTime - this.startTime;
        onPositionUpdate(currentPosition);
      }, 50); // Update every 50ms
    }
  }

  /**
   * Stop all playback
   */
  stopTimeline(): void {
    // Stop all active sources
    this.activeSources.forEach(source => {
      try {
        source.stop();
      } catch (error) {
        // Source may have already stopped
      }
    });

    // Clear references
    this.activeSources.clear();
    this.gainNodes.clear();
    
    this.isPlaying = false;
    this.startTime = 0;
    this.pauseTime = 0;
  }

  /**
   * Pause playback (not implemented - Web Audio API doesn't support pause)
   * Instead, we stop and remember the position
   */
  pauseTimeline(): number {
    if (!this.audioContext || !this.isPlaying) return 0;

    const currentPosition = this.audioContext.currentTime - this.startTime;
    this.stopTimeline();
    this.pauseTime = currentPosition;
    
    return currentPosition;
  }

  /**
   * Update clip volume in real-time
   */
  updateClipVolume(clipId: string, volume: number): void {
    const gainNode = this.gainNodes.get(clipId);
    if (gainNode) {
      gainNode.gain.value = volume;
    }
  }

  /**
   * Get current playback position
   */
  getCurrentPosition(): number {
    if (!this.audioContext || !this.isPlaying) {
      return this.pauseTime;
    }

    return this.audioContext.currentTime - this.startTime;
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopTimeline();
    this.audioBuffers.clear();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
let playbackEngineInstance: DAWPlaybackEngine | null = null;

export function getDAWPlaybackEngine(): DAWPlaybackEngine {
  if (!playbackEngineInstance) {
    playbackEngineInstance = new DAWPlaybackEngine();
  }
  return playbackEngineInstance;
}
