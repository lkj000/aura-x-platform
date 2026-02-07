import { useEffect, useRef, useState, useCallback } from 'react';
import { useDAWStore } from '@/stores/dawStore';
import { getDAWPlaybackEngine } from '@/services/DAWPlaybackEngine';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Volume2,
  VolumeX,
  Trash2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface TimelineWithStoreProps {
  className?: string;
}

export default function TimelineWithStore({ className }: TimelineWithStoreProps) {
  const {
    tracks,
    playheadPosition,
    isPlaying,
    zoom,
    selectedClipId,
    setSelectedClip,
    setPlayheadPosition,
    setZoom,
    setIsPlaying,
    updateClip,
    removeClip,
    addTrack,
  } = useDAWStore();

  const playbackEngine = useRef(getDAWPlaybackEngine());

  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDraggingClip, setIsDraggingClip] = useState(false);
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);

  // Handle playback
  const handlePlay = async () => {
    try {
      setIsPlaying(true);
      await playbackEngine.current.playTimeline(
        tracks,
        playheadPosition,
        (position) => setPlayheadPosition(position)
      );
    } catch (error) {
      console.error('[Timeline] Playback failed:', error);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    playbackEngine.current.stopTimeline();
    setIsPlaying(false);
    setPlayheadPosition(0);
  };

  // Sync playback state
  useEffect(() => {
    if (!isPlaying && playbackEngine.current.getIsPlaying()) {
      playbackEngine.current.stopTimeline();
    }
  }, [isPlaying]);

  // Calculate timeline dimensions
  const maxDuration = Math.max(
    60, // Minimum 60 seconds
    ...tracks.flatMap(track => 
      track.clips.map(clip => clip.startTime + clip.duration)
    )
  );
  const timelineWidth = maxDuration * zoom;

  // Format time display (seconds to MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle playhead click
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingClip) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / zoom;
    setPlayheadPosition(time);
  };

  // Handle clip drag start
  const handleClipDragStart = (e: React.MouseEvent, clipId: string, currentStartTime: number) => {
    e.stopPropagation();
    setIsDraggingClip(true);
    setDraggedClipId(clipId);
    setDragStartX(e.clientX);
    setDragStartTime(currentStartTime);
  };

  // Handle clip drag
  useEffect(() => {
    if (!isDraggingClip || !draggedClipId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const deltaTime = deltaX / zoom;
      const newStartTime = Math.max(0, dragStartTime + deltaTime);
      
      updateClip(draggedClipId, { startTime: newStartTime });
    };

    const handleMouseUp = () => {
      setIsDraggingClip(false);
      setDraggedClipId(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingClip, draggedClipId, dragStartX, dragStartTime, zoom, updateClip]);

  // Handle add track
  const handleAddTrack = () => {
    const trackNumber = tracks.filter(t => t.type === 'audio').length + 1;
    addTrack({
      name: `Audio ${trackNumber}`,
      volume: 1,
      pan: 0,
      muted: false,
      solo: false,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      type: 'audio',
    });
  };

  // Render waveform placeholder
  const renderWaveform = (clip: any) => {
    if (clip.waveformData && clip.waveformData.length > 0) {
      // Render actual waveform data
      const width = clip.duration * zoom;
      const height = 60;
      const points = clip.waveformData.map((value: number, index: number) => {
        const x = (index / clip.waveformData.length) * width;
        const y = height / 2 + (value * height) / 2;
        return `${x},${y}`;
      }).join(' ');

      return (
        <svg width={width} height={height} className="absolute inset-0">
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.6"
          />
        </svg>
      );
    } else {
      // Placeholder waveform
      return (
        <div className="absolute inset-0 flex items-center justify-center opacity-50">
          <div className="text-xs">🎵</div>
        </div>
      );
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Timeline Header */}
      <div className="h-12 border-b border-border bg-muted/30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-muted-foreground">TIMELINE</span>
          <span className="text-xs text-muted-foreground">
            {formatTime(playheadPosition)} / {formatTime(maxDuration)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom(Math.max(20, zoom - 20))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[60px] text-center">
            {zoom}px/s
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom(Math.min(200, zoom + 20))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleAddTrack}
          >
            <Plus className="h-4 w-4" />
            Add Track
          </Button>
        </div>
      </div>

      {/* Timeline Content */}
      <ScrollArea className="flex-1">
        <div className="relative" style={{ minHeight: '400px' }}>
          {/* Track List */}
          {tracks.filter(t => t.type !== 'master').map((track, trackIndex) => (
            <div
              key={track.id}
              className="h-24 border-b border-border flex"
            >
              {/* Track Header */}
              <div className="w-48 border-r border-border bg-muted/20 p-3 flex flex-col justify-between">
                <div>
                  <div className="font-semibold text-sm truncate">{track.name}</div>
                  <div className="text-xs text-muted-foreground">{track.clips.length} clips</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => updateClip(track.id, { muted: !track.muted })}
                  >
                    {track.muted ? (
                      <VolumeX className="h-3 w-3" />
                    ) : (
                      <Volume2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Track Timeline */}
              <div
                className="flex-1 relative bg-background/50 cursor-pointer"
                onClick={handleTimelineClick}
                ref={trackIndex === 0 ? timelineRef : undefined}
              >
                {/* Grid lines (every 5 seconds) */}
                {Array.from({ length: Math.ceil(maxDuration / 5) }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-border/30"
                    style={{ left: `${i * 5 * zoom}px` }}
                  />
                ))}

                {/* Clips */}
                {track.clips.map((clip) => (
                  <div
                    key={clip.id}
                    className={cn(
                      "absolute top-2 bottom-2 rounded-md border-2 cursor-move overflow-hidden",
                      "transition-all hover:brightness-110",
                      selectedClipId === clip.id ? "ring-2 ring-primary" : ""
                    )}
                    style={{
                      left: `${clip.startTime * zoom}px`,
                      width: `${clip.duration * zoom}px`,
                      backgroundColor: clip.color,
                      borderColor: clip.color,
                    }}
                    onMouseDown={(e) => {
                      setSelectedClip(clip.id);
                      handleClipDragStart(e, clip.id, clip.startTime);
                    }}
                  >
                    <div className="relative h-full p-2">
                      <div className="text-xs font-semibold text-white truncate">
                        {clip.name}
                      </div>
                      {renderWaveform(clip)}
                    </div>
                    
                    {/* Clip actions */}
                    {selectedClipId === clip.id && (
                      <div className="absolute top-1 right-1 flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 bg-background/80 hover:bg-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeClip(clip.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
                  style={{ left: `${playheadPosition * zoom}px` }}
                >
                  <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-primary rounded-full" />
                </div>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {tracks.filter(t => t.type !== 'master').length === 0 && (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <p className="mb-2">No tracks yet</p>
                <Button onClick={handleAddTrack} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Track
                </Button>
              </div>
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Time Ruler */}
      <div className="h-8 border-t border-border bg-muted/20 relative overflow-hidden">
        <div className="absolute left-48 right-0 top-0 bottom-0">
          {Array.from({ length: Math.ceil(maxDuration / 5) }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 flex flex-col items-center"
              style={{ left: `${i * 5 * zoom}px` }}
            >
              <div className="text-[10px] text-muted-foreground font-mono">
                {formatTime(i * 5)}
              </div>
              <div className="w-px h-2 bg-border" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
