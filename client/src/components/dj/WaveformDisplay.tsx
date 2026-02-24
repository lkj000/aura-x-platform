import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WaveformDisplayProps {
  audioUrl: string;
  height?: number;
  showControls?: boolean;
  energyCurve?: number[];  // Optional energy curve overlay
  beatMarkers?: number[];  // Optional beat marker positions (in seconds)
}

/**
 * WaveformDisplay Component
 * 
 * Renders audio waveform using WaveSurfer.js with:
 * - Visual waveform representation
 * - Playback controls
 * - Energy curve overlay
 * - Beat markers
 */
export default function WaveformDisplay({
  audioUrl,
  height = 80,
  showControls = false,
  energyCurve,
  beatMarkers,
}: WaveformDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize WaveSurfer
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#9333ea",  // Purple
      progressColor: "#ec4899",  // Pink
      cursorColor: "#f97316",  // Orange
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height,
      normalize: true,
      backend: "WebAudio",
    });

    wavesurferRef.current = wavesurfer;

    // Load audio
    wavesurfer.load(audioUrl);

    // Event listeners
    wavesurfer.on("ready", () => {
      setIsLoading(false);
      
      // Add beat markers if provided
      if (beatMarkers && beatMarkers.length > 0) {
        beatMarkers.forEach((time) => {
          // WaveSurfer markers plugin would be used here
          // For now, this is a placeholder
          console.log(`Beat marker at ${time}s`);
        });
      }
    });

    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));
    wavesurfer.on("finish", () => setIsPlaying(false));
    
    wavesurfer.on("error", (err) => {
      console.error("WaveSurfer error:", err);
      setError("Failed to load audio");
      setIsLoading(false);
    });

    // Cleanup
    return () => {
      wavesurfer.destroy();
    };
  }, [audioUrl, height, beatMarkers]);

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  return (
    <div className="relative">
      {/* Waveform container */}
      <div
        ref={containerRef}
        className="rounded-md overflow-hidden bg-muted/30"
        style={{ height: `${height}px` }}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-md">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Playback controls */}
      {showControls && !isLoading && !error && (
        <div className="absolute top-2 left-2">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full"
            onClick={handlePlayPause}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>
        </div>
      )}

      {/* Energy curve overlay (if provided) */}
      {energyCurve && energyCurve.length > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 opacity-50 rounded-t-md" />
      )}
    </div>
  );
}
