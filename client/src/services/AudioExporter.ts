/**
 * AudioExporter - Web Audio API-based audio export service
 * Handles mix-down of timeline tracks to WAV/MP3 format
 */

import * as Tone from 'tone';
// @ts-ignore - lamejs doesn't have TypeScript definitions
import lamejs from 'lamejs';

export interface ExportOptions {
  format: 'wav' | 'mp3';
  bitrate?: number; // For MP3: 128, 192, 256, 320 kbps
  sampleRate?: number; // Default: 44100
  duration?: number; // In seconds, if not specified, auto-detect from clips
}

export interface AudioClip {
  id: number;
  trackId: number;
  audioUrl: string;
  startTime: number; // In seconds
  duration: number; // In seconds
  volume: number; // 0-1
  offset?: number; // Trim start, in seconds
}

export class AudioExporter {
  private offlineContext: OfflineAudioContext | null = null;
  private progressCallback: ((progress: number) => void) | null = null;

  /**
   * Set progress callback for export operation
   */
  setProgressCallback(callback: (progress: number) => void) {
    this.progressCallback = callback;
  }

  /**
   * Export timeline clips to audio file
   */
  async exportTimeline(
    clips: AudioClip[],
    options: ExportOptions = { format: 'wav' }
  ): Promise<Blob> {
    const sampleRate = options.sampleRate || 44100;
    const duration = options.duration || this.calculateDuration(clips);

    // Create offline context for rendering
    const length = Math.ceil(duration * sampleRate);
    this.offlineContext = new OfflineAudioContext(2, length, sampleRate);

    this.reportProgress(0.1);

    // Load and schedule all clips
    await this.scheduleClips(clips);

    this.reportProgress(0.3);

    // Render audio
    const renderedBuffer = await this.offlineContext.startRendering();

    this.reportProgress(0.7);

    // Convert to desired format
    let blob: Blob;
    if (options.format === 'mp3') {
      blob = await this.bufferToMP3(renderedBuffer, options.bitrate || 192);
    } else {
      blob = this.bufferToWAV(renderedBuffer);
    }

    this.reportProgress(1.0);

    return blob;
  }

  /**
   * Calculate total duration from clips
   */
  private calculateDuration(clips: AudioClip[]): number {
    if (clips.length === 0) return 0;
    
    const maxEndTime = Math.max(
      ...clips.map(clip => clip.startTime + clip.duration)
    );
    
    return maxEndTime;
  }

  /**
   * Load and schedule all clips in offline context
   */
  private async scheduleClips(clips: AudioClip[]): Promise<void> {
    if (!this.offlineContext) throw new Error('Offline context not initialized');

    const loadPromises = clips.map(async (clip) => {
      try {
        // Fetch audio file
        const response = await fetch(clip.audioUrl);
        const arrayBuffer = await response.arrayBuffer();

        // Decode audio data
        const audioBuffer = await this.offlineContext!.decodeAudioData(arrayBuffer);

        // Create buffer source
        const source = this.offlineContext!.createBufferSource();
        source.buffer = audioBuffer;

        // Create gain node for volume control
        const gainNode = this.offlineContext!.createGain();
        gainNode.gain.value = clip.volume;

        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(this.offlineContext!.destination);

        // Schedule playback
        const offset = clip.offset || 0;
        const duration = Math.min(clip.duration, audioBuffer.duration - offset);
        source.start(clip.startTime, offset, duration);

      } catch (error) {
        console.error(`Failed to load clip ${clip.id}:`, error);
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Convert AudioBuffer to WAV Blob
   */
  private bufferToWAV(buffer: AudioBuffer): Blob {
    const length = buffer.length * buffer.numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    // Write WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true); // byte rate
    view.setUint16(32, buffer.numberOfChannels * 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    this.writeString(view, 36, 'data');
    view.setUint32(40, length, true);

    // Write audio data
    const channels: Float32Array[] = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * Convert AudioBuffer to MP3 Blob using lamejs
   */
  private async bufferToMP3(buffer: AudioBuffer, bitrate: number): Promise<Blob> {
    const mp3encoder = new lamejs.Mp3Encoder(buffer.numberOfChannels, buffer.sampleRate, bitrate);
    const mp3Data: Uint8Array[] = [];

    const sampleBlockSize = 1152; // LAME encoding block size
    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : leftChannel;

    // Convert float samples to 16-bit PCM
    const left = new Int16Array(leftChannel.length);
    const right = new Int16Array(rightChannel.length);

    for (let i = 0; i < leftChannel.length; i++) {
      left[i] = this.floatTo16BitPCM(leftChannel[i]);
      right[i] = this.floatTo16BitPCM(rightChannel[i]);
    }

    // Encode in blocks
    for (let i = 0; i < left.length; i += sampleBlockSize) {
      const leftChunk = left.subarray(i, i + sampleBlockSize);
      const rightChunk = right.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    // Flush remaining data
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }

    return new Blob(mp3Data as any, { type: 'audio/mp3' });
  }

  /**
   * Convert float sample to 16-bit PCM
   */
  private floatTo16BitPCM(input: number): number {
    const s = Math.max(-1, Math.min(1, input));
    return s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  /**
   * Write string to DataView
   */
  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Report progress to callback
   */
  private reportProgress(progress: number) {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Cancel ongoing export
   */
  cancel() {
    if (this.offlineContext) {
      // Note: OfflineAudioContext doesn't have a cancel method
      // We can only prevent the blob from being created
      this.offlineContext = null;
    }
  }
}

// Export singleton instance
export const audioExporter = new AudioExporter();
