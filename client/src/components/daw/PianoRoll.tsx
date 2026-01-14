import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  ZoomIn, 
  ZoomOut, 
  Wand2, 
  Music2,
  Grid3X3,
  Eraser,
  Pencil
} from 'lucide-react';

interface Note {
  id: string;
  pitch: number; // MIDI pitch (0-127)
  startTime: number; // In beats
  duration: number; // In beats
  velocity: number; // 0-127
  selected?: boolean;
}

interface PianoRollProps {
  notes?: Note[];
  duration?: number; // Total duration in beats
  height?: number;
  onNotesChange?: (notes: Note[]) => void;
}

export default function PianoRoll({ 
  notes: initialNotes = [], 
  duration = 16, 
  height = 400,
  onNotesChange 
}: PianoRollProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [zoom, setZoom] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tool, setTool] = useState<'pencil' | 'eraser' | 'select'>('pencil');
  const [playbackPosition, setPlaybackPosition] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Constants
  const NOTE_HEIGHT = 20;
  const BEAT_WIDTH = 40 * zoom;
  const KEY_WIDTH = 60;
  const HEADER_HEIGHT = 30;

  // Mock playback animation
  useEffect(() => {
    let animationFrame: number;
    if (isPlaying) {
      const startTime = Date.now();
      const startPos = playbackPosition;
      
      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000; // seconds
        const beatsPerSecond = 120 / 60; // 120 BPM
        const newPos = (startPos + elapsed * beatsPerSecond) % duration;
        setPlaybackPosition(newPos);
        animationFrame = requestAnimationFrame(animate);
      };
      
      animationFrame = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, duration]);

  // Draw Piano Roll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background Grid
    ctx.fillStyle = '#1a1a2e'; // Dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Rows (Keys)
    for (let i = 0; i < 128; i++) {
      const y = height - (i * NOTE_HEIGHT);
      const isBlackKey = [1, 3, 6, 8, 10].includes(i % 12);
      
      // Row background
      ctx.fillStyle = isBlackKey ? '#161625' : '#1e1e36';
      ctx.fillRect(0, y, canvas.width, NOTE_HEIGHT);
      
      // Horizontal lines
      ctx.strokeStyle = '#2a2a40';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw Vertical Grid (Beats)
    for (let i = 0; i <= duration; i++) {
      const x = i * BEAT_WIDTH;
      ctx.strokeStyle = i % 4 === 0 ? '#4a4a60' : '#2a2a40';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw Notes
    notes.forEach(note => {
      const x = note.startTime * BEAT_WIDTH;
      const y = height - ((note.pitch + 1) * NOTE_HEIGHT);
      const w = note.duration * BEAT_WIDTH;
      const h = NOTE_HEIGHT - 1;

      // Note body
      const gradient = ctx.createLinearGradient(x, y, x, y + h);
      gradient.addColorStop(0, '#8b5cf6'); // Primary color
      gradient.addColorStop(1, '#7c3aed');
      
      ctx.fillStyle = note.selected ? '#f59e0b' : gradient;
      ctx.fillRect(x, y, w, h);

      // Note border
      ctx.strokeStyle = note.selected ? '#fbbf24' : '#a78bfa';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
    });

    // Draw Playhead
    const playheadX = playbackPosition * BEAT_WIDTH;
    ctx.strokeStyle = '#ef4444'; // Red playhead
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    // Playhead Triangle
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(playheadX - 6, 0);
    ctx.lineTo(playheadX + 6, 0);
    ctx.lineTo(playheadX, 10);
    ctx.fill();

  }, [notes, zoom, height, duration, playbackPosition]);

  // Handle Canvas Click (Add/Remove Note)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const beat = Math.floor(x / BEAT_WIDTH);
    const pitch = Math.floor((height - y) / NOTE_HEIGHT);

    if (tool === 'pencil') {
      const newNote: Note = {
        id: Math.random().toString(36).substr(2, 9),
        pitch,
        startTime: beat,
        duration: 1,
        velocity: 100
      };
      const updatedNotes = [...notes, newNote];
      setNotes(updatedNotes);
      onNotesChange?.(updatedNotes);
    } else if (tool === 'eraser') {
      const updatedNotes = notes.filter(n => 
        !(n.pitch === pitch && n.startTime <= beat && n.startTime + n.duration > beat)
      );
      setNotes(updatedNotes);
      onNotesChange?.(updatedNotes);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden shadow-lg">
      {/* Toolbar */}
      <div className="h-12 border-b border-border bg-muted/30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn("hover:text-primary", isPlaying && "text-primary")}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          
          <div className="h-6 w-px bg-border mx-2" />
          
          <div className="flex bg-background/50 rounded-md p-1 border border-border">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-7 w-7", tool === 'pencil' && "bg-primary text-primary-foreground")}
              onClick={() => setTool('pencil')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-7 w-7", tool === 'eraser' && "bg-primary text-primary-foreground")}
              onClick={() => setTool('eraser')}
            >
              <Eraser className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
            <Slider 
              value={[zoom]} 
              min={0.5} 
              max={2} 
              step={0.1} 
              onValueChange={([v]) => setZoom(v)}
              className="w-24"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <Button size="sm" variant="outline" className="gap-2 text-primary border-primary/20 hover:bg-primary/10">
            <Wand2 className="h-4 w-4" />
            AI Suggest
          </Button>
        </div>
      </div>

      {/* Piano Roll Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Piano Keys (Left Sidebar) */}
        <div className="w-[60px] flex-shrink-0 border-r border-border bg-background overflow-hidden relative">
          <div 
            className="absolute w-full"
            style={{ 
              height: 128 * NOTE_HEIGHT, 
              bottom: 0,
              transform: `translateY(${0}px)` // Sync scroll if needed
            }}
          >
            {Array.from({ length: 128 }).map((_, i) => {
              const pitch = 127 - i;
              const isBlack = [1, 3, 6, 8, 10].includes(pitch % 12);
              const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
              const noteName = noteNames[pitch % 12];
              const octave = Math.floor(pitch / 12) - 1;
              
              return (
                <div 
                  key={pitch}
                  className={cn(
                    "flex items-center justify-end pr-1 text-[10px] border-b border-border/50",
                    isBlack ? "bg-black text-gray-500" : "bg-white text-gray-800"
                  )}
                  style={{ height: NOTE_HEIGHT }}
                >
                  {noteName === 'C' && <span className="font-bold">{noteName}{octave}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid Canvas */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto bg-[#1a1a2e] relative cursor-crosshair"
        >
          <canvas
            ref={canvasRef}
            width={duration * BEAT_WIDTH}
            height={128 * NOTE_HEIGHT}
            onClick={handleCanvasClick}
            className="block"
          />
        </div>
      </div>
    </div>
  );
}
