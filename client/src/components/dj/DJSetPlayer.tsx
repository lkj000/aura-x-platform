import { useState, useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  Share2,
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react";

interface CuePoint {
  time: number;
  label: string;
  from_track?: string;
  to_track?: string;
  type: string;
}

interface DJSetPlayerProps {
  mixUrl: string;
  cuePoints: CuePoint[];
  totalDuration: number;
  planName: string;
}

/**
 * DJ Set Player Component
 * 
 * Professional DJ set playback interface with:
 * - Full waveform visualization
 * - Cue point markers and navigation
 * - Playback controls
 * - Volume control
 * - Download and share functionality
 */
export default function DJSetPlayer({
  mixUrl,
  cuePoints,
  totalDuration,
  planName,
}: DJSetPlayerProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [activeCuePoint, setActiveCuePoint] = useState<number | null>(null);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#9333ea",
      progressColor: "#ec4899",
      cursorColor: "#f97316",
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 120,
      normalize: true,
      backend: "WebAudio",
      interact: true,
    });

    wavesurferRef.current = wavesurfer;

    // Load audio
    wavesurfer.load(mixUrl);

    // Event listeners
    wavesurfer.on("ready", () => {
      setIsLoading(false);
      wavesurfer.setVolume(volume);
    });

    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));
    
    wavesurfer.on("audioprocess", (time) => {
      setCurrentTime(time);
      
      // Update active cue point
      const currentCue = cuePoints.findIndex(
        (cue, idx) => {
          const nextCue = cuePoints[idx + 1];
          return time >= cue.time && (!nextCue || time < nextCue.time);
        }
      );
      setActiveCuePoint(currentCue >= 0 ? currentCue : null);
    });

    wavesurfer.on("seeking", (progress: number) => {
      const time = progress * wavesurfer.getDuration();
      setCurrentTime(time);
    });

    // Cleanup
    return () => {
      wavesurfer.destroy();
    };
  }, [mixUrl]);

  // Volume control
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  const togglePlayPause = () => {
    wavesurferRef.current?.playPause();
  };

  const skipToCue = (cueIndex: number) => {
    if (!wavesurferRef.current) return;
    const cue = cuePoints[cueIndex];
    const duration = wavesurferRef.current.getDuration();
    wavesurferRef.current.seekTo(cue.time / duration);
  };

  const skipBackward = () => {
    if (!wavesurferRef.current) return;
    const currentTime = wavesurferRef.current.getCurrentTime();
    wavesurferRef.current.seekTo(Math.max(0, currentTime - 10) / wavesurferRef.current.getDuration());
  };

  const skipForward = () => {
    if (!wavesurferRef.current) return;
    const currentTime = wavesurferRef.current.getCurrentTime();
    const duration = wavesurferRef.current.getDuration();
    wavesurferRef.current.seekTo(Math.min(duration, currentTime + 10) / duration);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = mixUrl;
    link.download = `${planName.replace(/\s+/g, "_")}.mp3`;
    link.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: planName,
          text: `Check out this DJ set: ${planName}`,
          url: mixUrl,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(mixUrl);
      alert("Mix URL copied to clipboard!");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">{planName}</h3>
          <p className="text-sm text-muted-foreground">
            {cuePoints.length} transitions • {formatTime(totalDuration)} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Waveform */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <div ref={waveformRef} className="rounded overflow-hidden" />
        
        {/* Cue point markers */}
        {!isLoading && cuePoints.map((cue, idx) => {
          const position = (cue.time / totalDuration) * 100;
          return (
            <div
              key={idx}
              className="absolute top-0 bottom-0 w-0.5 bg-orange-500 cursor-pointer hover:bg-orange-400 transition-colors"
              style={{ left: `${position}%` }}
              onClick={() => skipToCue(idx)}
              title={cue.label}
            />
          );
        })}
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={skipBackward}
            disabled={isLoading}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button
            size="icon"
            onClick={togglePlayPause}
            disabled={isLoading}
            className="h-12 w-12"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-0.5" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={skipForward}
            disabled={isLoading}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Time Display */}
        <div className="flex-1 text-center">
          <div className="text-2xl font-mono font-bold">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>
          {activeCuePoint !== null && (
            <div className="text-xs text-muted-foreground mt-1">
              {cuePoints[activeCuePoint].label}
            </div>
          )}
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2 w-32">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            onValueChange={([val]) => {
              setVolume(val / 100);
              setIsMuted(false);
            }}
            max={100}
            step={1}
            className="flex-1"
          />
        </div>
      </div>

      {/* Cue Points List */}
      <div className="space-y-2">
        <h4 className="font-semibold text-sm">Transitions</h4>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {cuePoints.map((cue, idx) => (
            <button
              key={idx}
              onClick={() => skipToCue(idx)}
              className={`w-full text-left p-2 rounded text-sm transition-colors ${
                activeCuePoint === idx
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{formatTime(cue.time)}</span>
                  <Badge variant={cue.type === "stem_based" ? "default" : "secondary"} className="text-xs">
                    {cue.type}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-xs">
                  {cue.from_track} → {cue.to_track}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
