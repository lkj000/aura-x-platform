import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Music2,
  Play,
  Pause,
  MoreVertical,
  Trash2,
  Download,
  Activity,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DJTrack {
  id: number;
  name: string;
  fileUrl: string;
  fileType: string;
  durationSec: number;
  // Features (from analysis)
  bpm?: number;
  bpmConfidence?: number;
  key?: string;
  camelotKey?: string;
  energyAvg?: number;
  lufs?: number;
  // Analysis status
  isAnalyzed: boolean;
  isAnalyzing: boolean;
  // Stems status
  hasStemsSeparated: boolean;
  isSeparatingStems: boolean;
}

interface DJTrackLibraryProps {
  tracks: DJTrack[];
  selectedTrackIds: number[];
  onSelectionChange: (trackIds: number[]) => void;
  onAnalyze: (trackIds: number[]) => void;
  onSeparateStems: (trackIds: number[]) => void;
  onDelete: (trackIds: number[]) => void;
  onPlay?: (trackId: number) => void;
}

export default function DJTrackLibrary({
  tracks,
  selectedTrackIds,
  onSelectionChange,
  onAnalyze,
  onSeparateStems,
  onDelete,
  onPlay,
}: DJTrackLibraryProps) {
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null);

  const handleSelectAll = () => {
    if (selectedTrackIds.length === tracks.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(tracks.map((t) => t.id));
    }
  };

  const handleSelectTrack = (trackId: number) => {
    if (selectedTrackIds.includes(trackId)) {
      onSelectionChange(selectedTrackIds.filter((id) => id !== trackId));
    } else {
      onSelectionChange([...selectedTrackIds, trackId]);
    }
  };

  const handlePlayTrack = (trackId: number) => {
    if (playingTrackId === trackId) {
      setPlayingTrackId(null);
    } else {
      setPlayingTrackId(trackId);
      onPlay?.(trackId);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getEnergyColor = (energy: number): string => {
    if (energy >= 0.7) return "text-red-500";
    if (energy >= 0.4) return "text-yellow-500";
    return "text-green-500";
  };

  if (tracks.length === 0) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <Music2 className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">No tracks yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Upload your first tracks to start generating AI-powered DJ sets with
              Level-5 autonomy
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedTrackIds.length === tracks.length}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedTrackIds.length > 0
              ? `${selectedTrackIds.length} selected`
              : `${tracks.length} tracks`}
          </span>
        </div>

        {selectedTrackIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAnalyze(selectedTrackIds)}
            >
              Analyze Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSeparateStems(selectedTrackIds)}
            >
              Separate Stems
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(selectedTrackIds)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Track Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tracks.map((track) => (
          <Card key={track.id} className="p-4 hover:border-primary/50 transition-colors">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedTrackIds.includes(track.id)}
                  onCheckedChange={() => handleSelectTrack(track.id)}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{track.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {track.fileType.toUpperCase()} • {formatDuration(track.durationSec)}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onAnalyze([track.id])}>
                      Analyze
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSeparateStems([track.id])}>
                      Separate Stems
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete([track.id])}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Waveform Placeholder */}
              <div className="h-16 bg-muted rounded flex items-center justify-center">
                <Music2 className="h-8 w-8 text-muted-foreground" />
              </div>

              {/* Analysis Status */}
              {track.isAnalyzing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing track...
                </div>
              )}

              {track.isSeparatingStems && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Separating stems...
                </div>
              )}

              {/* Track Features */}
              {track.isAnalyzed && (
                <div className="grid grid-cols-2 gap-2">
                  {track.bpm && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">BPM</span>
                      <span className="text-sm font-medium">
                        {track.bpm.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {track.key && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Key</span>
                      <span className="text-sm font-medium">{track.key}</span>
                    </div>
                  )}
                  {track.camelotKey && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Camelot</span>
                      <span className="text-sm font-medium">{track.camelotKey}</span>
                    </div>
                  )}
                  {track.energyAvg !== undefined && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Energy</span>
                      <span
                        className={`text-sm font-medium ${getEnergyColor(
                          track.energyAvg
                        )}`}
                      >
                        <Activity className="h-3 w-3 inline mr-1" />
                        {(track.energyAvg * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {!track.isAnalyzed && !track.isAnalyzing && (
                  <Badge variant="outline" className="text-xs">
                    Not Analyzed
                  </Badge>
                )}
                {track.hasStemsSeparated && (
                  <Badge variant="secondary" className="text-xs">
                    Stems Ready
                  </Badge>
                )}
              </div>

              {/* Play Button */}
              <Button
                variant={playingTrackId === track.id ? "default" : "outline"}
                size="sm"
                className="w-full gap-2"
                onClick={() => handlePlayTrack(track.id)}
              >
                {playingTrackId === track.id ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Play
                  </>
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
