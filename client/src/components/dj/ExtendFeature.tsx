import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, Download, Loader2, Repeat } from "lucide-react";

interface ExtendFeatureProps {
  trackId: number;
  trackName: string;
  bpm: number;
  duration: number;
}

/**
 * Extend Feature UI Component
 * 
 * User interface for extending tracks by looping sections with:
 * - Loop bars selector (4/8/16/32)
 * - Loop count slider (2-8 repetitions)
 * - Tempo variation toggle and BPM range
 * - Energy build toggle and type selector
 * - Preview player for generated variations
 */
export default function ExtendFeature({
  trackId,
  trackName,
  bpm,
  duration,
}: ExtendFeatureProps) {
  const [loopBars, setLoopBars] = useState<number>(8);
  const [loopCount, setLoopCount] = useState<number>(4);
  const [tempoVariation, setTempoVariation] = useState<boolean>(false);
  const [startBpm, setStartBpm] = useState<number>(bpm);
  const [endBpm, setEndBpm] = useState<number>(bpm + 8);
  const [energyBuild, setEnergyBuild] = useState<boolean>(false);
  const [buildType, setBuildType] = useState<string>("volume");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [variations, setVariations] = useState<any[]>([]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      // Call backend tRPC procedure
      // const result = await trpc.djStudio.extendTrack.mutate({
      //   trackId,
      //   loopBars,
      //   loopCount,
      //   tempoVariation,
      //   startBpm: tempoVariation ? startBpm : undefined,
      //   endBpm: tempoVariation ? endBpm : undefined,
      //   energyBuild,
      //   buildType: energyBuild ? buildType : undefined,
      // });
      
      // setVariations(result.variations);
      
      // Mock for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      setVariations([
        {
          id: 1,
          name: "Standard Loop",
          url: "/mock/extended_v1.mp3",
          duration: duration * loopCount,
        },
        {
          id: 2,
          name: "With Tempo Build",
          url: "/mock/extended_v2.mp3",
          duration: duration * loopCount,
        },
        {
          id: 3,
          name: "With Energy Build",
          url: "/mock/extended_v3.mp3",
          duration: duration * loopCount,
        },
      ]);
    } catch (error) {
      console.error("Extend generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const estimatedDuration = () => {
    const beatsPerBar = 4;
    const loopDuration = (loopBars * beatsPerBar * 60) / bpm;
    return loopDuration * loopCount;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Extend Track</h2>
        <p className="text-muted-foreground">
          Loop sections with tempo and energy variation
        </p>
      </div>

      {/* Track Info */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{trackName}</h3>
            <p className="text-sm text-muted-foreground">
              {bpm} BPM • {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}
            </p>
          </div>
          <Badge variant="secondary">
            <Repeat className="h-3 w-3 mr-1" />
            {estimatedDuration().toFixed(0)}s output
          </Badge>
        </div>
      </Card>

      {/* Parameters */}
      <Card className="p-6 space-y-6">
        {/* Loop Bars */}
        <div className="space-y-3">
          <Label>Loop Section Length</Label>
          <Select
            value={loopBars.toString()}
            onValueChange={(val) => setLoopBars(parseInt(val))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">4 bars (16 beats)</SelectItem>
              <SelectItem value="8">8 bars (32 beats)</SelectItem>
              <SelectItem value="16">16 bars (64 beats)</SelectItem>
              <SelectItem value="32">32 bars (128 beats)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loop Count */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Loop Repetitions</Label>
            <span className="text-sm text-muted-foreground">{loopCount}x</span>
          </div>
          <Slider
            value={[loopCount]}
            onValueChange={([val]) => setLoopCount(val)}
            min={2}
            max={8}
            step={1}
          />
        </div>

        {/* Tempo Variation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Tempo Variation</Label>
            <Switch
              checked={tempoVariation}
              onCheckedChange={setTempoVariation}
            />
          </div>
          
          {tempoVariation && (
            <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary">
              <div className="space-y-2">
                <Label className="text-sm">Start BPM</Label>
                <Slider
                  value={[startBpm]}
                  onValueChange={([val]) => setStartBpm(val)}
                  min={bpm - 10}
                  max={bpm + 10}
                  step={1}
                />
                <span className="text-xs text-muted-foreground">{startBpm} BPM</span>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">End BPM</Label>
                <Slider
                  value={[endBpm]}
                  onValueChange={([val]) => setEndBpm(val)}
                  min={bpm - 10}
                  max={bpm + 20}
                  step={1}
                />
                <span className="text-xs text-muted-foreground">{endBpm} BPM</span>
              </div>
            </div>
          )}
        </div>

        {/* Energy Build */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Energy Build</Label>
            <Switch
              checked={energyBuild}
              onCheckedChange={setEnergyBuild}
            />
          </div>
          
          {energyBuild && (
            <div className="pl-4 border-l-2 border-primary">
              <Label className="text-sm">Build Type</Label>
              <Select value={buildType} onValueChange={setBuildType}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volume">Volume Ramp (Fade In)</SelectItem>
                  <SelectItem value="filter">Filter Sweep (Open Low End)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Generating Variations...
            </>
          ) : (
            <>
              <Repeat className="h-5 w-5 mr-2" />
              Generate Extended Versions
            </>
          )}
        </Button>
      </Card>

      {/* Variations */}
      {variations.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Generated Variations</h3>
          <div className="grid gap-4">
            {variations.map((variation) => (
              <Card key={variation.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{variation.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {Math.floor(variation.duration / 60)}:{String(Math.floor(variation.duration % 60)).padStart(2, "0")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Play className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
