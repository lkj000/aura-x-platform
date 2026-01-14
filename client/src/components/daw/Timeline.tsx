import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Plus, 
  MoreHorizontal, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff,
  Volume2,
  VolumeX
} from 'lucide-react';

interface Track {
  id: string;
  name: string;
  color: string;
  type: 'audio' | 'midi' | 'automation';
  muted: boolean;
  soloed: boolean;
  clips: Clip[];
}

interface Clip {
  id: string;
  name: string;
  startTime: number; // in bars
  duration: number; // in bars
  color?: string;
}

const MOCK_TRACKS: Track[] = [
  {
    id: '1',
    name: 'Log Drum',
    color: '#8b5cf6',
    type: 'midi',
    muted: false,
    soloed: false,
    clips: [
      { id: 'c1', name: 'Log Drum Main', startTime: 0, duration: 4 },
      { id: 'c2', name: 'Log Drum Variation', startTime: 4, duration: 4 },
      { id: 'c3', name: 'Log Drum Build', startTime: 8, duration: 4 },
    ]
  },
  {
    id: '2',
    name: 'Shakers',
    color: '#f59e0b',
    type: 'audio',
    muted: false,
    soloed: false,
    clips: [
      { id: 'c4', name: 'Shaker Loop', startTime: 0, duration: 8 },
      { id: 'c5', name: 'Shaker Loop', startTime: 8, duration: 8 },
    ]
  },
  {
    id: '3',
    name: 'Chords',
    color: '#3b82f6',
    type: 'midi',
    muted: false,
    soloed: false,
    clips: [
      { id: 'c6', name: 'Rhodes Jazz', startTime: 0, duration: 8 },
      { id: 'c7', name: 'Rhodes Jazz Var', startTime: 8, duration: 8 },
    ]
  },
  {
    id: '4',
    name: 'Saxophone',
    color: '#10b981',
    type: 'audio',
    muted: false,
    soloed: false,
    clips: [
      { id: 'c8', name: 'Sax Solo Intro', startTime: 4, duration: 4 },
      { id: 'c9', name: 'Sax Solo Main', startTime: 8, duration: 8 },
    ]
  },
];

export default function Timeline() {
  const [tracks, setTracks] = useState<Track[]>(MOCK_TRACKS);
  const [zoom, setZoom] = useState(40); // px per bar
  const [scrollPos, setScrollPos] = useState(0);
  
  const BAR_WIDTH = zoom;
  const TRACK_HEIGHT = 80;
  const HEADER_WIDTH = 200;

  return (
    <div className="flex flex-col h-full bg-background border border-border rounded-lg overflow-hidden">
      {/* Timeline Ruler */}
      <div className="h-8 bg-muted/30 border-b border-border flex">
        <div className="w-[200px] flex-shrink-0 border-r border-border bg-muted/50" />
        <div className="flex-1 overflow-hidden relative">
          <div 
            className="absolute inset-0 flex"
            style={{ transform: `translateX(-${scrollPos}px)` }}
          >
            {Array.from({ length: 100 }).map((_, i) => (
              <div 
                key={i} 
                className="flex-shrink-0 border-l border-border/50 text-[10px] text-muted-foreground pl-1 select-none"
                style={{ width: BAR_WIDTH }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tracks Area */}
      <ScrollArea className="flex-1">
        <div className="flex min-w-max">
          {/* Track Headers (Left) */}
          <div className="w-[200px] flex-shrink-0 flex flex-col border-r border-border bg-card z-10">
            {tracks.map(track => (
              <div 
                key={track.id}
                className="border-b border-border p-2 flex flex-col justify-between group hover:bg-accent/5 transition-colors"
                style={{ height: TRACK_HEIGHT }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div 
                      className="w-1 h-8 rounded-full" 
                      style={{ backgroundColor: track.color }}
                    />
                    <span className="font-medium text-sm truncate">{track.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  <Button 
                    size="sm" 
                    variant={track.muted ? "destructive" : "secondary"}
                    className="h-5 w-5 p-0 text-[10px]"
                  >
                    M
                  </Button>
                  <Button 
                    size="sm" 
                    variant={track.soloed ? "default" : "secondary"}
                    className={cn("h-5 w-5 p-0 text-[10px]", track.soloed && "bg-yellow-500 text-black hover:bg-yellow-600")}
                  >
                    S
                  </Button>
                  <div className="flex-1" />
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground">
                    <Volume2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            
            <Button variant="ghost" className="m-2 border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Track
            </Button>
          </div>

          {/* Clips Area (Right) */}
          <div className="flex-1 bg-[#1a1a2e] relative min-w-[1000px]">
            {/* Grid Background */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{ 
                backgroundImage: `linear-gradient(to right, #2a2a40 1px, transparent 1px)`,
                backgroundSize: `${BAR_WIDTH}px 100%`
              }}
            />

            {tracks.map(track => (
              <div 
                key={track.id}
                className="relative border-b border-border/10 hover:bg-white/5 transition-colors"
                style={{ height: TRACK_HEIGHT }}
              >
                {track.clips.map(clip => (
                  <div
                    key={clip.id}
                    className="absolute top-1 bottom-1 rounded-md border border-white/10 overflow-hidden cursor-pointer hover:brightness-110 transition-all group"
                    style={{
                      left: clip.startTime * BAR_WIDTH,
                      width: clip.duration * BAR_WIDTH,
                      backgroundColor: `${track.color}40`, // 25% opacity
                      borderLeft: `4px solid ${track.color}`
                    }}
                  >
                    <div className="p-1.5">
                      <p className="text-xs font-medium truncate text-white/90 drop-shadow-md">
                        {clip.name}
                      </p>
                    </div>
                    
                    {/* Waveform / MIDI visualization placeholder */}
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-50">
                      {track.type === 'audio' ? (
                        <div className="w-full h-full flex items-end gap-px px-1 pb-1">
                          {Array.from({ length: 20 }).map((_, i) => (
                            <div 
                              key={i} 
                              className="flex-1 bg-white/50 rounded-t-sm"
                              style={{ height: `${30 + Math.random() * 70}%` }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="w-full h-full p-1 flex flex-wrap gap-0.5 content-end">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div 
                              key={i}
                              className="h-1 w-4 bg-white/50 rounded-full"
                              style={{ marginLeft: `${Math.random() * 20}px` }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
