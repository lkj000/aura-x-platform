import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, Download, Loader2, Shuffle } from "lucide-react";

interface Track {
  id: number;
  name: string;
  bpm: number;
  key: string;  // Camelot notation
}

interface MashupFeatureProps {
  tracks: Track[];
}

/**
 * Mashup Feature UI Component
 * 
 * User interface for blending two tracks with:
 * - Track A/B selection
 * - Stem blend ratio sliders (vocals/drums/bass/other)
 * - Visual blend indicators
 * - Transition style selector
 * - Preview player for 3 variations
 * - Key/tempo matching info
 */
export default function MashupFeature({ tracks }: MashupFeatureProps) {
  const [trackA, setTrackA] = useState<number | null>(null);
  const [trackB, setTrackB] = useState<number | null>(null);
  const [vocalsBlend, setVocalsBlend] = useState<number>(0);  // 0 = A, 100 = B
  const [drumsBlend, setDrumsBlend] = useState<number>(100);
  const [bassBlend, setBassBlend] = useState<number>(100);
  const [otherBlend, setOtherBlend] = useState<number>(100);
  const [transitionStyle, setTransitionStyle] = useState<string>("crossfade");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [variations, setVariations] = useState<any[]>([]);

  const selectedTrackA = tracks.find(t => t.id === trackA);
  const selectedTrackB = tracks.find(t => t.id === trackB);

  const handleGenerate = async () => {
    if (!trackA || !trackB) return;
    
    setIsGenerating(true);
    
    try {
      // Call backend tRPC procedure
      // const result = await trpc.djStudio.mashupTracks.mutate({
      //   trackAId: trackA,
      //   trackBId: trackB,
      //   blendConfig: {
      //     vocals: vocalsBlend / 100,
      //     drums: drumsBlend / 100,
      //     bass: bassBlend / 100,
      //     other: otherBlend / 100,
      //   },
      //   transitionStyle,
      // });
      
      // setVariations(result.variations);
      
      // Mock for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      setVariations([
        {
          id: 1,
          name: "Vocals A + Instrumental B",
          url: "/mock/mashup_v1.mp3",
          blendConfig: { vocals: 0, drums: 1, bass: 1, other: 1 },
        },
        {
          id: 2,
          name: "Vocals B + Instrumental A",
          url: "/mock/mashup_v2.mp3",
          blendConfig: { vocals: 1, drums: 0, bass: 0, other: 0 },
        },
        {
          id: 3,
          name: "50/50 Blend",
          url: "/mock/mashup_v3.mp3",
          blendConfig: { vocals: 0.5, drums: 0.5, bass: 0.5, other: 0.5 },
        },
      ]);
    } catch (error) {
      console.error("Mashup generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderBlendIndicator = (value: number) => {
    const aPercent = 100 - value;
    const bPercent = value;
    
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-purple-400 font-mono w-8 text-right">{aPercent}%</span>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
            style={{ width: `${bPercent}%` }}
          />
        </div>
        <span className="text-pink-400 font-mono w-8">{bPercent}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Mashup Tracks</h2>
        <p className="text-muted-foreground">
          Blend two tracks with stem-based mixing
        </p>
      </div>

      {/* Track Selection */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Track A */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label>Track A</Label>
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
              Source
            </Badge>
          </div>
          <Select
            value={trackA?.toString() || ""}
            onValueChange={(val) => setTrackA(parseInt(val))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select track..." />
            </SelectTrigger>
            <SelectContent>
              {tracks.map((track) => (
                <SelectItem key={track.id} value={track.id.toString()}>
                  {track.name} ({track.bpm} BPM, {track.key})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTrackA && (
            <div className="text-sm text-muted-foreground">
              {selectedTrackA.bpm} BPM • {selectedTrackA.key} key
            </div>
          )}
        </Card>

        {/* Track B */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label>Track B</Label>
            <Badge variant="secondary" className="bg-pink-500/20 text-pink-400">
              Target
            </Badge>
          </div>
          <Select
            value={trackB?.toString() || ""}
            onValueChange={(val) => setTrackB(parseInt(val))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select track..." />
            </SelectTrigger>
            <SelectContent>
              {tracks.map((track) => (
                <SelectItem key={track.id} value={track.id.toString()}>
                  {track.name} ({track.bpm} BPM, {track.key})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTrackB && (
            <div className="text-sm text-muted-foreground">
              {selectedTrackB.bpm} BPM • {selectedTrackB.key} key
            </div>
          )}
        </Card>
      </div>

      {/* Key/Tempo Matching Info */}
      {selectedTrackA && selectedTrackB && (
        <Card className="p-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">Automatic Matching</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Tempo: {selectedTrackA.bpm} BPM → {selectedTrackB.bpm} BPM
                ({Math.abs(selectedTrackB.bpm - selectedTrackA.bpm)} BPM shift)
              </p>
              <p className="text-xs text-muted-foreground">
                Key: {selectedTrackA.key} → {selectedTrackB.key}
                (Camelot wheel matching)
              </p>
            </div>
            <Badge variant="default">
              Auto-matched
            </Badge>
          </div>
        </Card>
      )}

      {/* Stem Blend Controls */}
      {trackA && trackB && (
        <Card className="p-6 space-y-6">
          <h3 className="font-semibold">Stem Blend Ratios</h3>
          
          {/* Vocals */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Vocals</Label>
              {renderBlendIndicator(vocalsBlend)}
            </div>
            <Slider
              value={[vocalsBlend]}
              onValueChange={([val]) => setVocalsBlend(val)}
              max={100}
              step={1}
              className="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-purple-500 [&_[role=slider]]:to-pink-500"
            />
          </div>

          {/* Drums */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Drums</Label>
              {renderBlendIndicator(drumsBlend)}
            </div>
            <Slider
              value={[drumsBlend]}
              onValueChange={([val]) => setDrumsBlend(val)}
              max={100}
              step={1}
              className="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-purple-500 [&_[role=slider]]:to-pink-500"
            />
          </div>

          {/* Bass */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Bass</Label>
              {renderBlendIndicator(bassBlend)}
            </div>
            <Slider
              value={[bassBlend]}
              onValueChange={([val]) => setBassBlend(val)}
              max={100}
              step={1}
              className="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-purple-500 [&_[role=slider]]:to-pink-500"
            />
          </div>

          {/* Other */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Other (Melody/FX)</Label>
              {renderBlendIndicator(otherBlend)}
            </div>
            <Slider
              value={[otherBlend]}
              onValueChange={([val]) => setOtherBlend(val)}
              max={100}
              step={1}
              className="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-purple-500 [&_[role=slider]]:to-pink-500"
            />
          </div>

          {/* Transition Style */}
          <div className="space-y-2">
            <Label>Transition Style</Label>
            <Select value={transitionStyle} onValueChange={setTransitionStyle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="crossfade">Crossfade (Smooth)</SelectItem>
                <SelectItem value="cut">Hard Cut (Instant)</SelectItem>
                <SelectItem value="echo">Echo Out (Delay Tail)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !trackA || !trackB}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating Mashup Variations...
              </>
            ) : (
              <>
                <Shuffle className="h-5 w-5 mr-2" />
                Generate Mashup Variations
              </>
            )}
          </Button>
        </Card>
      )}

      {/* Variations */}
      {variations.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Generated Variations</h3>
          <div className="grid gap-4">
            {variations.map((variation) => (
              <Card key={variation.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{variation.name}</h4>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>V: {Math.round(variation.blendConfig.vocals * 100)}%</span>
                      <span>D: {Math.round(variation.blendConfig.drums * 100)}%</span>
                      <span>B: {Math.round(variation.blendConfig.bass * 100)}%</span>
                      <span>O: {Math.round(variation.blendConfig.other * 100)}%</span>
                    </div>
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
