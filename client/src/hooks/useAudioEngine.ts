import { useEffect, useState, useCallback } from 'react';
import { AudioEngine, type TransportState } from '@/services/AudioEngine';

/**
 * React hook for managing the AudioEngine
 * Provides transport controls and playback state
 */
export function useAudioEngine() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [transportState, setTransportState] = useState<TransportState>('stopped');
  const [currentPosition, setCurrentPosition] = useState(0);
  const [tempo, setTempoState] = useState(112);

  // Initialize audio engine on mount
  useEffect(() => {
    const init = async () => {
      try {
        await AudioEngine.initialize();
        setIsInitialized(true);
        setTempoState(AudioEngine.getTempo());
      } catch (error) {
        console.error('[useAudioEngine] Initialization failed:', error);
      }
    };

    init();

    // Update position periodically when playing
    const interval = setInterval(() => {
      if (AudioEngine.getState() === 'started') {
        setCurrentPosition(AudioEngine.getPosition());
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Transport controls
  const play = useCallback(() => {
    if (!isInitialized) {
      console.warn('[useAudioEngine] Cannot play: not initialized');
      return;
    }
    AudioEngine.play();
    setTransportState('started');
  }, [isInitialized]);

  const pause = useCallback(() => {
    AudioEngine.pause();
    setTransportState('paused');
  }, []);

  const stop = useCallback(() => {
    AudioEngine.stop();
    setTransportState('stopped');
    setCurrentPosition(0);
  }, []);

  const togglePlay = useCallback(() => {
    const state = AudioEngine.getState();
    if (state === 'started') {
      pause();
    } else {
      play();
    }
  }, [play, pause]);

  const setTempo = useCallback((bpm: number) => {
    AudioEngine.setTempo(bpm);
    setTempoState(bpm);
  }, []);

  const seek = useCallback((seconds: number) => {
    AudioEngine.setPosition(seconds);
    setCurrentPosition(seconds);
  }, []);

  // Automation recording controls
  const startAutomationRecording = useCallback(
    (
      trackId: string,
      parameter: 'volume' | 'pan' | 'eq_low' | 'eq_mid' | 'eq_high' | 'reverb_wet' | 'delay_wet',
      mode: 'replace' | 'overdub' = 'replace'
    ) => {
      if (!isInitialized) {
        console.warn('[useAudioEngine] Cannot start recording: not initialized');
        return;
      }
      AudioEngine.startAutomationRecording(trackId, parameter, mode);
    },
    [isInitialized]
  );

  const recordAutomationPoint = useCallback((value: number) => {
    AudioEngine.recordAutomationPoint(value);
  }, []);

  const stopAutomationRecording = useCallback(() => {
    return AudioEngine.stopAutomationRecording();
  }, []);

  const isRecordingAutomation = useCallback(() => {
    return AudioEngine.isRecordingAutomation();
  }, []);

  const getAutomationRecordingState = useCallback(() => {
    return AudioEngine.getAutomationRecordingState();
  }, []);

  const getParameterValue = useCallback(
    (
      trackId: string,
      parameter: 'volume' | 'pan' | 'eq_low' | 'eq_mid' | 'eq_high' | 'reverb_wet' | 'delay_wet'
    ) => {
      return AudioEngine.getParameterValue(trackId, parameter);
    },
    []
  );

  return {
    isInitialized,
    transportState,
    isPlaying: transportState === 'started',
    currentPosition,
    tempo,
    play,
    pause,
    stop,
    togglePlay,
    setTempo,
    seek,
    startAutomationRecording,
    recordAutomationPoint,
    stopAutomationRecording,
    isRecordingAutomation,
    getAutomationRecordingState,
    getParameterValue,
  };
}
