import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, Download } from 'lucide-react';
import { AudioEngine } from '@/services/AudioEngine';

interface StemWaveformProps {
  stemName: string;
  stemUrl: string;
  color: string;
  icon?: React.ReactNode;
}

export function StemWaveform({ stemName, stemUrl, color, icon }: StemWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([75]);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    loadWaveform();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [stemUrl]);

  const loadWaveform = async () => {
    try {
      setIsLoading(true);
      await AudioEngine.initialize();
      const buffer = await AudioEngine.loadAudioFile(stemUrl);
      const waveform = AudioEngine.generateWaveform(buffer, 200);
      setWaveformData(Array.from(waveform.peaks));
      setDuration(buffer.duration);
      drawWaveform(Array.from(waveform.peaks), 0);
    } catch (error) {
      console.error('[StemWaveform] Failed to load:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const drawWaveform = (peaks: number[], progress: number = 0) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / peaks.length;
    const progressX = width * progress;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw waveform bars
    peaks.forEach((peak, i) => {
      const barHeight = peak * height * 0.8;
      const x = i * barWidth;
      const y = (height - barHeight) / 2;

      // Use different color for played portion
      if (x < progressX) {
        ctx.fillStyle = color;
      } else {
        ctx.fillStyle = `${color}40`; // 25% opacity
      }

      ctx.fillRect(x, y, Math.max(barWidth - 1, 1), barHeight);
    });

    // Draw progress line
    if (progress > 0) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(stemUrl);
      audioRef.current.volume = volume[0] / 100;
      
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          const progress = audioRef.current.currentTime / audioRef.current.duration;
          setCurrentTime(audioRef.current.currentTime);
          drawWaveform(waveformData, progress);
        }
      });

      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        drawWaveform(waveformData, 0);
        setCurrentTime(0);
      });
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value[0] / 100;
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = stemUrl;
    a.download = `${stemName.toLowerCase()}_stem.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            {icon}
            <span>{stemName}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleDownload}
            title="Download stem"
          >
            <Download className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Waveform Canvas */}
        <div className="relative bg-muted/30 rounded-lg overflow-hidden" style={{ height: '80px' }}>
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-xs text-muted-foreground">Loading waveform...</div>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={800}
              height={80}
              className="w-full h-full cursor-pointer"
              onClick={(e) => {
                if (audioRef.current && duration > 0) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const progress = x / rect.width;
                  audioRef.current.currentTime = progress * duration;
                }
              }}
            />
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={togglePlay}
            disabled={isLoading}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>

          <div className="text-xs text-muted-foreground min-w-[80px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          <div className="flex items-center gap-2 flex-1">
            <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider
              value={volume}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground min-w-[35px]">
              {volume[0]}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
