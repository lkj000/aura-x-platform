import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, Zap, Mic2, Play } from "lucide-react";

interface VibePreset {
  id: number;
  name: string;
  displayName: string;
  description: string;
  category: string;
  icon: string;
  usageCount: number;
}

interface DJSetGeneratorProps {
  selectedTrackIds: number[];
  onGenerate: (config: {
    trackIds: number[];
    preset: string;
    durationTargetSec: number;
    riskLevel: number;
    allowVocalOverlay: boolean;
  }) => void;
}

// Built-in vibe presets (will be fetched from backend in real implementation)
const BUILT_IN_PRESETS: VibePreset[] = [
  {
    id: 1,
    name: "private_school_3am",
    displayName: "Private School 3AM Peak",
    description: "High-energy peak-time set with tight harmonic mixing and vocal overlays",
    category: "amapiano",
    icon: "🔥",
    usageCount: 0,
  },
  {
    id: 2,
    name: "deep_soulful",
    displayName: "Deep & Soulful",
    description: "Smooth, soulful journey with gradual energy build and long transitions",
    category: "amapiano",
    icon: "🌊",
    usageCount: 0,
  },
  {
    id: 3,
    name: "sunrise_cooldown",
    displayName: "Sunrise Cooldown",
    description: "Gentle energy descent for closing sets, emphasizing melodic elements",
    category: "amapiano",
    icon: "🌅",
    usageCount: 0,
  },
  {
    id: 4,
    name: "experimental_wild",
    displayName: "Experimental & Wild",
    description: "Bold key jumps, tempo shifts, and unexpected transitions for adventurous crowds",
    category: "experimental",
    icon: "⚡",
    usageCount: 0,
  },
  {
    id: 5,
    name: "warm_up",
    displayName: "Warm-Up Set",
    description: "Gradual energy build from chill to mid-tempo, setting the mood",
    category: "general",
    icon: "🎵",
    usageCount: 0,
  },
];

const DURATION_OPTIONS = [
  { value: 1800, label: "30 minutes" },
  { value: 2700, label: "45 minutes" },
  { value: 3600, label: "60 minutes" },
];

export default function DJSetGenerator({
  selectedTrackIds,
  onGenerate,
}: DJSetGeneratorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("private_school_3am");
  const [durationTargetSec, setDurationTargetSec] = useState<number>(3600);
  const [riskLevel, setRiskLevel] = useState<number>(0.3);
  const [allowVocalOverlay, setAllowVocalOverlay] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleGenerate = () => {
    if (selectedTrackIds.length === 0) {
      return;
    }

    setIsGenerating(true);

    onGenerate({
      trackIds: selectedTrackIds,
      preset: selectedPreset,
      durationTargetSec,
      riskLevel,
      allowVocalOverlay,
    });

    // Reset generating state after a delay (will be handled by actual job status)
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  };

  const selectedPresetData = BUILT_IN_PRESETS.find((p) => p.name === selectedPreset);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Generate DJ Set</h2>
        <p className="text-muted-foreground mt-1">
          Configure your autonomous DJ set with vibe presets and energy arc templates
        </p>
      </div>

      {/* Track Selection Status */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Play className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">
              {selectedTrackIds.length} track{selectedTrackIds.length !== 1 ? "s" : ""} selected
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedTrackIds.length === 0
                ? "Select tracks from your library to generate a set"
                : "Ready to generate autonomous DJ set"}
            </p>
          </div>
        </div>
      </Card>

      {/* Vibe Preset Selector */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Vibe Preset</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {BUILT_IN_PRESETS.map((preset) => (
            <Card
              key={preset.id}
              className={`p-4 cursor-pointer transition-all hover:border-primary/50 ${
                selectedPreset === preset.name
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
              onClick={() => setSelectedPreset(preset.name)}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{preset.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm">{preset.displayName}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {preset.description}
                  </p>
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {preset.category}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {selectedPresetData && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="text-3xl">{selectedPresetData.icon}</div>
              <div>
                <h4 className="font-semibold">{selectedPresetData.displayName}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedPresetData.description}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Duration Selector */}
      <div className="space-y-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Set Duration
        </Label>
        <Select
          value={durationTargetSec.toString()}
          onValueChange={(value) => setDurationTargetSec(parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Risk Level Slider */}
      <div className="space-y-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Risk Level
        </Label>
        <div className="space-y-2">
          <Slider
            value={[riskLevel]}
            onValueChange={(values) => setRiskLevel(values[0])}
            min={0}
            max={1}
            step={0.1}
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Safe (0.0)</span>
            <span className="font-medium">{riskLevel.toFixed(1)}</span>
            <span className="text-muted-foreground">Wild (1.0)</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {riskLevel < 0.3
              ? "Conservative mixing with safe key/BPM transitions"
              : riskLevel < 0.7
              ? "Balanced approach with some creative transitions"
              : "Adventurous mixing with bold key jumps and tempo shifts"}
          </p>
        </div>
      </div>

      {/* Vocal Overlay Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Mic2 className="h-4 w-4" />
              Allow Vocal Overlay
            </Label>
            <p className="text-sm text-muted-foreground">
              Enable simultaneous vocal tracks during transitions
            </p>
          </div>
          <Switch
            checked={allowVocalOverlay}
            onCheckedChange={setAllowVocalOverlay}
          />
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex items-center gap-3">
        <Button
          className="flex-1 gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          size="lg"
          onClick={handleGenerate}
          disabled={selectedTrackIds.length === 0 || isGenerating}
        >
          <Sparkles className="h-5 w-5" />
          {isGenerating ? "Generating..." : "Generate DJ Set (3 Variations)"}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-muted/30">
        <p className="text-sm text-muted-foreground">
          <strong>Level-5 Autonomy:</strong> The AI will analyze your tracks, plan an optimal
          energy arc, select the best transitions, and generate 3 variations (v1/v2/v3) with
          different quality scores. No manual intervention required.
        </p>
      </Card>
    </div>
  );
}
