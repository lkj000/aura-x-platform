import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { 
  Plus, 
  MoreHorizontal, 
  Volume2,
  VolumeX,
  Trash2,
  Copy,
  Scissors,
  Activity
} from 'lucide-react';
import AutomationLaneRenderer from './AutomationLaneRenderer';
import { trpc } from '@/lib/trpc';
import { AudioEngine } from '@/services/AudioEngine';
import type { Track, AudioClip } from '@/../../drizzle/schema';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { STEM_REGISTRY } from '@/../../shared/stems';
import { AddAudioClipCommand, DeleteAudioClipCommand, UpdateClipPositionCommand } from '@/services/UndoRedoManager';

interface TimelineProps {
  projectId: number;
  isPlaying: boolean;
  currentTime: number; // in seconds
  onTimeChange: (time: number) => void;
}

interface ClipWithTrack extends AudioClip {
  trackName: string;
  trackColor: string;
}

export default function TimelineV2({ 
  projectId, 
  isPlaying, 
  currentTime,
  onTimeChange 
}: TimelineProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [clips, setClips] = useState<ClipWithTrack[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<number | null>(null);
  const [zoom, setZoom] = useState(40); // px per second
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [automationEnabled, setAutomationEnabled] = useState<Record<number, boolean>>({});
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);

  // Queries
  const tracksQuery = trpc.tracks.list.useQuery({ projectId });
  const createTrackMutation = trpc.tracks.create.useMutation();
  const createClipMutation = trpc.audioClips.create.useMutation();
  const updateClipMutation = trpc.audioClips.update.useMutation();
  const deleteClipMutation = trpc.audioClips.delete.useMutation();
  const utils = trpc.useUtils();
  const { executeCommand } = useUndoRedo();

  // Load tracks and clips
  useEffect(() => {
    if (tracksQuery.data) {
      setTracks(tracksQuery.data);
      
      // Load clips for all tracks
      const loadClips = async () => {
        const allClips: ClipWithTrack[] = [];
        
        for (const track of tracksQuery.data) {
          try {
            const trackClips = await utils.client.audioClips.list.query({ trackId: track.id });
            allClips.push(...trackClips.map((clip: AudioClip) => ({
              ...clip,
              trackName: track.name,
              trackColor: getTrackColor(track.type),
            })));
          } catch (error) {
            console.error(`Failed to load clips for track ${track.id}:`, error);
          }
        }
        
        setClips(allClips);
      };
      
      loadClips();
    }
  }, [tracksQuery.data, utils.client]);

  // Handle drop from media library
  const handleDrop = useCallback(async (e: React.DragEvent, trackId: number) => {
    e.preventDefault();
    
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    
    try {
      const item = JSON.parse(data);
      
      // Calculate drop position in timeline
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = e.clientX - rect.left - 200; // Account for header width
      const startTime = Math.max(0, x / zoom);
      
      // Load audio to get duration
      await AudioEngine.initialize();
      const buffer = await AudioEngine.loadAudioFile(item.fileUrl);
      const duration = buffer.duration;
      
      // Create audio clip with undo/redo support
      const clipData = {
        trackId,
        name: item.name,
        fileUrl: item.fileUrl,
        startTime,
        duration,
        offset: 0,
        fadeIn: 0,
        fadeOut: 0,
        gain: 1.0,
      };
      
      const track = tracks.find(t => t.id === trackId);
      
      const command = new AddAudioClipCommand(
        clipData,
        async (data) => {
          const clip = await createClipMutation.mutateAsync(data);
          // Add to local state
          if (track) {
            setClips(prev => [...prev, {
              ...clip,
              trackName: track.name,
              trackColor: getTrackColor(track.type),
            }]);
          }
          return clip.id;
        },
        async (id) => {
          await deleteClipMutation.mutateAsync({ id });
          setClips(prev => prev.filter(c => c.id !== id));
        }
      );
      
      await executeCommand(command);
      
      // Load audio into engine
      await AudioEngine.loadAudioFile(item.fileUrl);
      
    } catch (error) {
      console.error('[Timeline] Drop failed:', error);
    }
  }, [tracks, zoom, createClipMutation]);

  // Handle clip drag
  const handleClipMouseDown = useCallback((e: React.MouseEvent, clipId: number, currentStartTime: number) => {
    e.stopPropagation();
    setSelectedClipId(clipId);
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartTime(currentStartTime);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || selectedClipId === null) return;
    
    const deltaX = e.clientX - dragStartX;
    const deltaTime = deltaX / zoom;
    const newStartTime = Math.max(0, dragStartTime + deltaTime);
    
    // Update clip position locally
    setClips(prev => prev.map(clip => 
      clip.id === selectedClipId 
        ? { ...clip, startTime: newStartTime }
        : clip
    ));
  }, [isDragging, selectedClipId, dragStartX, dragStartTime, zoom]);

  const handleMouseUp = useCallback(async () => {
    if (!isDragging || selectedClipId === null) return;
    
    const clip = clips.find(c => c.id === selectedClipId);
    if (clip && clip.startTime !== dragStartTime) {
      // Save to database with undo/redo support
      const command = new UpdateClipPositionCommand(
        selectedClipId,
        dragStartTime,
        clip.startTime,
        async (id, position) => {
          await updateClipMutation.mutateAsync({ id, startTime: position });
          setClips(prev => prev.map(c => c.id === id ? { ...c, startTime: position } : c));
        }
      );
      
      await executeCommand(command);
    }
    
    setIsDragging(false);
  }, [isDragging, selectedClipId, clips, updateClipMutation, dragStartTime, executeCommand]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle timeline click to seek
  const handleTimelineClick = (e: React.MouseEvent) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left - 200; // Account for header width
    const time = Math.max(0, x / zoom);
    onTimeChange(time);
  };

  // Handle clip delete with undo/redo support
  const handleDeleteClip = async (clipId: number) => {
    const command = new DeleteAudioClipCommand(
      clipId,
      async (data) => {
        const clip = await createClipMutation.mutateAsync(data);
        const track = tracks.find(t => t.id === data.trackId);
        if (track) {
          setClips(prev => [...prev, {
            ...clip,
            trackName: track.name,
            trackColor: getTrackColor(track.type),
          }]);
        }
        return clip.id;
      },
      async (id) => {
        await deleteClipMutation.mutateAsync({ id });
        setClips(prev => prev.filter(c => c.id !== id));
      },
      async (id) => {
        const clip = clips.find(c => c.id === id);
        if (!clip) throw new Error('Clip not found');
        return {
          trackId: clip.trackId,
          name: clip.name,
          fileUrl: clip.fileUrl,
          startTime: clip.startTime,
          duration: clip.duration,
          offset: clip.offset,
          fadeIn: clip.fadeIn,
          fadeOut: clip.fadeOut,
          gain: clip.gain,
        };
      }
    );
    
    await executeCommand(command);
    setSelectedClipId(null);
  };

  // Add new track
  const handleAddTrack = async () => {
    const newTrack = await createTrackMutation.mutateAsync({
      projectId,
      name: `Track ${tracks.length + 1}`,
      type: 'audio',
      volume: 1.0,
      pan: 0.0,
      orderIndex: tracks.length,
    });
    
    setTracks(prev => [...prev, newTrack]);
  };

  // Helper functions
  const getTrackColor = (type: string): string => {
    // Single source of truth: colors come from STEM_REGISTRY in shared/stems.ts.
    // Adding or renaming a stem updates color everywhere automatically.
    const registryColor = STEM_REGISTRY[type as keyof typeof STEM_REGISTRY]?.color;
    if (registryColor) return registryColor;
    // Fallbacks for legacy/generic track types not in the 26-stem ontology
    const legacyColors: Record<string, string> = {
      'drums':  '#8b5cf6',
      'bass':   '#ef4444',
      'vocals': '#ec4899',
      'other':  '#64748b',
      'audio':  '#64748b',
    };
    return legacyColors[type] ?? '#64748b';
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const TRACK_HEIGHT = 80;
  const HEADER_WIDTH = 200;
  const RULER_HEIGHT = 40;

  return (
    <div className="flex flex-col h-full bg-background border border-border rounded-lg overflow-hidden">
      {/* Timeline Ruler */}
      <div 
        className="h-[40px] bg-muted/30 border-b border-border flex cursor-pointer"
        onClick={handleTimelineClick}
      >
        <div className="w-[200px] flex-shrink-0 border-r border-border bg-muted/50 flex items-center justify-center">
          <span className="text-xs font-medium text-muted-foreground">TRACKS</span>
        </div>
        <div className="flex-1 overflow-hidden relative" ref={timelineRef}>
          {/* Time markers */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className="border-l border-border/50"
                style={{ width: `${zoom}px` }}
              >
                <span className="text-xs text-muted-foreground ml-1">
                  {formatTime(i)}
                </span>
              </div>
            ))}
          </div>
          
          {/* Playhead */}
          <div
            ref={playheadRef}
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
            style={{ left: `${currentTime * zoom}px` }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full" />
          </div>
        </div>
      </div>

      {/* Tracks Area */}
      <ScrollArea className="flex-1">
        <div className="min-h-full">
          {tracks.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <p>No tracks yet</p>
                <Button
                  onClick={handleAddTrack}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Track
                </Button>
              </div>
            </div>
          ) : (
            tracks.map((track, index) => (
              <div
                key={track.id}
                className="flex border-b border-border"
                style={{ height: `${TRACK_HEIGHT}px` }}
                onDrop={(e) => handleDrop(e, track.id)}
                onDragOver={(e) => e.preventDefault()}
              >
                {/* Track Header */}
                <div
                  className="flex-shrink-0 border-r border-border bg-muted/20 p-3 flex flex-col justify-between"
                  style={{ width: `${HEADER_WIDTH}px` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate flex-1">
                      {track.name}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </div>
                  {/* Log drum timbral contract score badge — shown when stem SDR available */}
                  {track.type === 'log_drum' && (track as any).metadata?.sdrDb != null && (
                    <div
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded w-fit ${
                        (track as any).metadata.sdrDb >= 8
                          ? 'bg-green-100 text-green-700'
                          : (track as any).metadata.sdrDb >= 6
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                      title="Log drum SDR (signal-to-distortion ratio) — target ≥ 8 dB per CLAUDE.md §4"
                    >
                      SDR {(track as any).metadata.sdrDb.toFixed(1)} dB
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        // TODO: Toggle mute
                      }}
                    >
                      {track.muted ? (
                        <VolumeX className="h-3 w-3" />
                      ) : (
                        <Volume2 className="h-3 w-3" />
                      )}
                    </Button>
                    
                    <Button
                      variant={automationEnabled[track.id] ? "default" : "ghost"}
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setAutomationEnabled(prev => ({
                          ...prev,
                          [track.id]: !prev[track.id]
                        }));
                      }}
                      title="Toggle Automation"
                    >
                      <Activity className="h-3 w-3" />
                    </Button>
                    
                    <div className="flex-1">
                      <Slider
                        value={[track.volume * 100]}
                        max={100}
                        step={1}
                        className="w-full"
                        onValueChange={([value]) => {
                          // TODO: Update volume
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Track Timeline */}
                <div className="flex-1 relative bg-background/50">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: 60 }).map((_, i) => (
                      <div
                        key={i}
                        className="border-l border-border/30"
                        style={{ width: `${zoom}px` }}
                      />
                    ))}
                  </div>

                  {/* Audio Clips */}
                  {clips
                    .filter(clip => clip.trackId === track.id)
                    .map(clip => (
                      <div
                        key={clip.id}
                        className={cn(
                          "absolute top-2 bottom-2 rounded cursor-move",
                          "border-2 transition-all",
                          selectedClipId === clip.id
                            ? "border-primary shadow-lg z-10"
                            : "border-transparent hover:border-primary/50"
                        )}
                        style={{
                          left: `${clip.startTime * zoom}px`,
                          width: `${clip.duration * zoom}px`,
                          backgroundColor: `${getTrackColor(track.type)}40`,
                        }}
                        onMouseDown={(e) => handleClipMouseDown(e, clip.id, clip.startTime)}
                      >
                        <div className="h-full p-2 flex flex-col justify-between">
                          <span className="text-xs font-medium truncate">
                            {clip.name}
                          </span>
                          
                          {selectedClipId === clip.id && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClip(clip.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {/* Waveform placeholder */}
                        <div className="absolute inset-0 opacity-30 pointer-events-none">
                          <svg width="100%" height="100%" className="overflow-hidden">
                            {Array.from({ length: 50 }).map((_, i) => (
                              <rect
                                key={i}
                                x={`${(i / 50) * 100}%`}
                                y="40%"
                                width="1"
                                height={`${Math.random() * 20}%`}
                                fill="currentColor"
                              />
                            ))}
                          </svg>
                        </div>
                      </div>
                    ))}
                </div>
                
                {/* Automation Lane */}
                {automationEnabled[track.id] && (
                  <AutomationLaneRenderer
                    trackId={track.id}
                    projectId={projectId}
                    parameter="volume"
                    zoom={zoom}
                    timelineWidth={60 * zoom}
                    pixelsPerSecond={zoom}
                    isPlaying={isPlaying}
                  />
                )}
              </div>
            ))
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Bottom Controls */}
      <div className="h-12 border-t border-border bg-muted/20 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleAddTrack}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Track
          </Button>
          
          <span className="text-sm text-muted-foreground">
            {tracks.length} tracks • {clips.length} clips
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Zoom:</span>
          <Slider
            value={[zoom]}
            min={20}
            max={100}
            step={5}
            className="w-32"
            onValueChange={([value]) => setZoom(value)}
          />
        </div>
      </div>
    </div>
  );
}
