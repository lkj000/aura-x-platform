import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Cpu, Clock } from 'lucide-react';

interface AudioVisualizerProps {
  audioUrl?: string;
  isPlaying?: boolean;
  showMetrics?: boolean;
  bands?: number; // Number of frequency bands (default: 16)
  height?: number; // Canvas height in pixels
}

interface PerformanceMetrics {
  cpu: number;
  latency: number;
  bufferHealth: number;
}

export default function AudioVisualizer({
  audioUrl,
  isPlaying = false,
  showMetrics = true,
  bands = 16,
  height = 200
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cpu: 0,
    latency: 0,
    bufferHealth: 100
  });
  
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Web Audio API
  useEffect(() => {
    if (!audioUrl) return;

    const initAudio = async () => {
      try {
        // Create audio context
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        // Create audio element
        const audio = new Audio(audioUrl);
        audio.crossOrigin = 'anonymous';
        audioElementRef.current = audio;

        // Create analyser node
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = bands * 2; // FFT size must be power of 2
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        // Create source and connect nodes
        const source = audioContext.createMediaElementSource(audio);
        sourceRef.current = source;
        
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        setIsInitialized(true);
      } catch (error) {
        console.error('[AudioVisualizer] Initialization failed:', error);
      }
    };

    initAudio();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, [audioUrl, bands]);

  // Control playback
  useEffect(() => {
    if (!audioElementRef.current || !isInitialized) return;

    if (isPlaying) {
      audioElementRef.current.play();
    } else {
      audioElementRef.current.pause();
    }
  }, [isPlaying, isInitialized]);

  // Render visualization
  useEffect(() => {
    if (!isInitialized || !analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let frameCount = 0;
    let lastTime = performance.now();

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      // Get frequency data
      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)'; // Dark blue with transparency for trail effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate bar width
      const barWidth = canvas.width / bands;
      const barGap = 2;

      // Draw 3D bars with gradient and shadow
      for (let i = 0; i < bands; i++) {
        // Sample frequency data (map bands to frequency bins)
        const binIndex = Math.floor((i / bands) * bufferLength);
        const value = dataArray[binIndex];
        
        // Normalize to 0-1 range
        const normalizedValue = value / 255;
        
        // Calculate bar height with smooth animation
        const barHeight = normalizedValue * canvas.height * 0.9;
        
        // Calculate x position
        const x = i * barWidth;
        
        // Calculate y position (bars grow from bottom)
        const y = canvas.height - barHeight;

        // Create gradient for 3D effect
        const gradient = ctx.createLinearGradient(x, y, x, canvas.height);
        
        // Color based on frequency (low=purple, mid=pink, high=orange)
        const hue = 270 + (i / bands) * 60; // 270 (purple) to 330 (pink) to 30 (orange)
        const saturation = 70 + normalizedValue * 30; // More vibrant when louder
        const lightness = 50 + normalizedValue * 20; // Brighter when louder
        
        gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, 1)`);
        gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness - 20}%, 0.6)`);

        // Draw shadow for 3D depth
        ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.5)`;
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Draw bar with rounded top
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(
          x + barGap / 2,
          y,
          barWidth - barGap,
          barHeight,
          [4, 4, 0, 0] // Rounded top corners only
        );
        ctx.fill();

        // Add highlight on top for extra 3D effect
        if (barHeight > 10) {
          ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness + 20}%, 0.8)`;
          ctx.fillRect(x + barGap / 2, y, barWidth - barGap, 3);
        }
      }

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Update performance metrics every 30 frames (~0.5s at 60fps)
      frameCount++;
      if (frameCount % 30 === 0) {
        const currentTime = performance.now();
        const deltaTime = currentTime - lastTime;
        const fps = (30 / deltaTime) * 1000;
        
        // Calculate CPU usage (approximation based on frame time)
        const cpuUsage = Math.min(100, Math.max(0, 100 - (fps / 60) * 100));
        
        // Calculate latency (approximation based on audio context)
        const latency = audioContextRef.current
          ? Math.round(audioContextRef.current.baseLatency * 1000)
          : 0;
        
        // Calculate buffer health (based on frequency data variance)
        const variance = dataArray.reduce((sum, val) => sum + val, 0) / bufferLength;
        const bufferHealth = Math.min(100, Math.round(variance / 2.55));

        setMetrics({
          cpu: Math.round(cpuUsage),
          latency,
          bufferHealth
        });

        lastTime = currentTime;
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isInitialized, bands]);

  // Set canvas size
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas resolution (2x for retina displays)
    canvas.width = rect.width * 2;
    canvas.height = height * 2;
    
    // Scale context to match
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(2, 2);
    }
  }, [height]);

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-border">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Audio Visualization</span>
            {isPlaying && (
              <Badge variant="default" className="text-xs">
                Live
              </Badge>
            )}
          </div>
          
          {showMetrics && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Cpu className="h-3 w-3" />
                <span>{metrics.cpu}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{metrics.latency}ms</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                <span>{metrics.bufferHealth}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full rounded-md bg-slate-900/50"
          style={{ height: `${height}px` }}
        />

        {/* Status */}
        {!isInitialized && audioUrl && (
          <div className="text-xs text-muted-foreground text-center py-2">
            Initializing audio engine...
          </div>
        )}
        
        {!audioUrl && (
          <div className="text-xs text-muted-foreground text-center py-2">
            No audio source loaded
          </div>
        )}
      </div>
    </Card>
  );
}
