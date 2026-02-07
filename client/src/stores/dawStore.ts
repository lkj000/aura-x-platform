import { create } from 'zustand';

export interface AudioClip {
  id: string;
  trackId: string;
  sampleId?: number;
  name: string;
  url: string;
  startTime: number; // in seconds
  duration: number; // in seconds
  volume: number; // 0-1
  pan: number; // -1 to 1
  muted: boolean;
  solo: boolean;
  color: string;
  waveformData?: number[];
}

export interface Track {
  id: string;
  name: string;
  clips: AudioClip[];
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  color: string;
  type: 'audio' | 'midi' | 'master';
}

export interface DAWState {
  tracks: Track[];
  selectedTrackId: string | null;
  selectedClipId: string | null;
  playheadPosition: number; // in seconds
  isPlaying: boolean;
  tempo: number;
  timeSignature: [number, number]; // [numerator, denominator]
  zoom: number; // pixels per second
  
  // Actions
  addTrack: (track: Omit<Track, 'id' | 'clips'>) => string;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  
  addClip: (trackId: string, clip: Omit<AudioClip, 'id' | 'trackId'>) => string;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<AudioClip>) => void;
  moveClip: (clipId: string, newTrackId: string, newStartTime: number) => void;
  
  setSelectedTrack: (trackId: string | null) => void;
  setSelectedClip: (clipId: string | null) => void;
  setPlayheadPosition: (position: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setTempo: (tempo: number) => void;
  setZoom: (zoom: number) => void;
  
  // Utility functions
  getTrack: (trackId: string) => Track | undefined;
  getClip: (clipId: string) => { track: Track; clip: AudioClip } | undefined;
  snapToGrid: (time: number, gridSize: number) => number;
}

export const useDAWStore = create<DAWState>((set, get) => ({
  tracks: [
    {
      id: 'master',
      name: 'Master',
      clips: [],
      volume: 1,
      pan: 0,
      muted: false,
      solo: false,
      color: '#8b5cf6',
      type: 'master',
    },
  ],
  selectedTrackId: null,
  selectedClipId: null,
  playheadPosition: 0,
  isPlaying: false,
  tempo: 112, // Default Amapiano tempo
  timeSignature: [4, 4],
  zoom: 100, // 100 pixels per second

  addTrack: (track) => {
    const id = `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTrack: Track = {
      ...track,
      id,
      clips: [],
    };
    set((state) => ({
      tracks: [...state.tracks, newTrack],
    }));
    return id;
  },

  removeTrack: (trackId) => {
    set((state) => ({
      tracks: state.tracks.filter((t) => t.id !== trackId),
      selectedTrackId: state.selectedTrackId === trackId ? null : state.selectedTrackId,
    }));
  },

  updateTrack: (trackId, updates) => {
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, ...updates } : t
      ),
    }));
  },

  addClip: (trackId, clip) => {
    const id = `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newClip: AudioClip = {
      ...clip,
      id,
      trackId,
    };
    
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId
          ? { ...t, clips: [...t.clips, newClip] }
          : t
      ),
    }));
    
    return id;
  },

  removeClip: (clipId) => {
    set((state) => ({
      tracks: state.tracks.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => c.id !== clipId),
      })),
      selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
    }));
  },

  updateClip: (clipId, updates) => {
    set((state) => ({
      tracks: state.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) =>
          c.id === clipId ? { ...c, ...updates } : c
        ),
      })),
    }));
  },

  moveClip: (clipId, newTrackId, newStartTime) => {
    const { getClip } = get();
    const result = getClip(clipId);
    if (!result) return;

    const { clip } = result;
    
    set((state) => ({
      tracks: state.tracks.map((t) => {
        // Remove from old track
        if (t.clips.some((c) => c.id === clipId)) {
          return {
            ...t,
            clips: t.clips.filter((c) => c.id !== clipId),
          };
        }
        // Add to new track
        if (t.id === newTrackId) {
          return {
            ...t,
            clips: [...t.clips, { ...clip, trackId: newTrackId, startTime: newStartTime }],
          };
        }
        return t;
      }),
    }));
  },

  setSelectedTrack: (trackId) => set({ selectedTrackId: trackId }),
  setSelectedClip: (clipId) => set({ selectedClipId: clipId }),
  setPlayheadPosition: (position) => set({ playheadPosition: position }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setTempo: (tempo) => set({ tempo }),
  setZoom: (zoom) => set({ zoom }),

  getTrack: (trackId) => {
    return get().tracks.find((t) => t.id === trackId);
  },

  getClip: (clipId) => {
    const tracks = get().tracks;
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) {
        return { track, clip };
      }
    }
    return undefined;
  },

  snapToGrid: (time, gridSize) => {
    // Grid size is in beats
    const { tempo } = get();
    const secondsPerBeat = 60 / tempo;
    const gridSizeInSeconds = gridSize * secondsPerBeat;
    return Math.round(time / gridSizeInSeconds) * gridSizeInSeconds;
  },
}));
