import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Download, ChevronRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

/**
 * Pattern Library Browser
 * Showcases all Euclidean rhythm presets with interactive visualization and audio previews
 */

interface PatternPreset {
  id: string;
  name: string;
  euclidean: { k: number; n: number; rotation: number };
  language: string;
  gaspType: string;
  bpm: number;
  description: string;
}

export default function PatternLibrary() {
  const [, setLocation] = useLocation();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [playingPreset, setPlayingPreset] = useState<string | null>(null);
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [filterGaspType, setFilterGaspType] = useState<string>('all');

  // Fetch cultural presets
  const { data: presetsData, isLoading } = trpc.musicGeneration.getCulturalPresets.useQuery();

  const presets = presetsData?.presets || [];

  // Filter presets
  const filteredPresets = presets.filter((preset: PatternPreset) => {
    if (filterLanguage !== 'all' && preset.language !== filterLanguage) return false;
    if (filterGaspType !== 'all' && preset.gaspType !== filterGaspType) return false;
    return true;
  });

  // Get unique languages and gasp types for filters
  const languages = ['all', ...Array.from(new Set(presets.map((p: PatternPreset) => p.language)))];
  const gaspTypes = ['all', ...Array.from(new Set(presets.map((p: PatternPreset) => p.gaspType)))];

  const handlePlayPreview = (presetId: string) => {
    if (playingPreset === presetId) {
      setPlayingPreset(null);
      // Stop audio playback
    } else {
      setPlayingPreset(presetId);
      // Start audio playback (will be implemented with Web Audio API)
    }
  };

  const handleSelectPattern = (preset: PatternPreset) => {
    // Navigate to AI Studio with preset parameters
    setLocation(`/ai-studio?preset=${preset.id}`);
  };

  const renderEuclideanVisualization = (euclidean: { k: number; n: number; rotation: number }) => {
    // Generate Euclidean pattern visualization
    const pattern = generateEuclideanPattern(euclidean.k, euclidean.n, euclidean.rotation);
    
    return (
      <div className="flex items-center justify-center gap-1 py-4">
        {pattern.map((hit, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full transition-all ${
              hit === 1
                ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50'
                : 'bg-muted border border-border'
            }`}
            title={`Step ${index + 1}: ${hit === 1 ? 'Hit' : 'Rest'}`}
          />
        ))}
      </div>
    );
  };

  // Simple Bjorklund's algorithm implementation for visualization
  const generateEuclideanPattern = (k: number, n: number, rotation: number): number[] => {
    if (k === 0) return Array(n).fill(0);
    if (k >= n) return Array(n).fill(1);

    let groups: number[][] = [];
    for (let i = 0; i < k; i++) groups.push([1]);
    for (let i = 0; i < n - k; i++) groups.push([0]);

    while (groups.length > 1) {
      const lastGroupSize = groups[groups.length - 1].length;
      let lastGroupCount = 0;
      for (let i = groups.length - 1; i >= 0; i--) {
        if (groups[i].length === lastGroupSize) lastGroupCount++;
        else break;
      }

      const secondLastGroupSize = groups[groups.length - lastGroupCount - 1]?.length;
      if (!secondLastGroupSize) break;

      let secondLastGroupCount = 0;
      for (let i = groups.length - lastGroupCount - 1; i >= 0; i--) {
        if (groups[i].length === secondLastGroupSize) secondLastGroupCount++;
        else break;
      }

      if (lastGroupCount === 0 || secondLastGroupCount === 0) break;

      const appendableCount = Math.min(lastGroupCount, secondLastGroupCount);
      const newGroups: number[][] = [];

      for (let i = 0; i < groups.length - lastGroupCount - secondLastGroupCount; i++) {
        newGroups.push(groups[i]);
      }

      for (let i = 0; i < appendableCount; i++) {
        const secondLastGroup = groups[groups.length - lastGroupCount - secondLastGroupCount + i];
        const lastGroup = groups[groups.length - lastGroupCount + i];
        newGroups.push([...secondLastGroup, ...lastGroup]);
      }

      for (let i = appendableCount; i < secondLastGroupCount; i++) {
        newGroups.push(groups[groups.length - lastGroupCount - secondLastGroupCount + i]);
      }

      for (let i = appendableCount; i < lastGroupCount; i++) {
        newGroups.push(groups[groups.length - lastGroupCount + i]);
      }

      groups = newGroups;
    }

    let pattern = groups.flat();

    // Apply rotation
    if (rotation !== 0) {
      const normalizedRotation = ((rotation % n) + n) % n;
      pattern = [...pattern.slice(normalizedRotation), ...pattern.slice(0, normalizedRotation)];
    }

    return pattern;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading pattern library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Pattern Library
              </h1>
              <p className="text-muted-foreground mt-2">
                Explore {presets.length} authentic Amapiano rhythm patterns with cultural authenticity
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              {filteredPresets.length} patterns
            </Badge>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mt-6">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Language</label>
              <select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="bg-background border border-border rounded-md px-3 py-2 text-sm"
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang === 'all' ? 'All Languages' : lang}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Gasp Type</label>
              <select
                value={filterGaspType}
                onChange={(e) => setFilterGaspType(e.target.value)}
                className="bg-background border border-border rounded-md px-3 py-2 text-sm"
              >
                {gaspTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Gasp Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Pattern Grid */}
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPresets.map((preset: PatternPreset) => (
            <Card
              key={preset.id}
              className={`transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer ${
                selectedPreset === preset.id ? 'border-primary shadow-lg' : ''
              }`}
              onClick={() => setSelectedPreset(preset.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{preset.name}</CardTitle>
                    <CardDescription className="mt-1">
                      E({preset.euclidean.k},{preset.euclidean.n}) • {preset.bpm} BPM
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {preset.language}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                {/* Euclidean Pattern Visualization */}
                {renderEuclideanVisualization(preset.euclidean)}

                <p className="text-sm text-muted-foreground mt-4">
                  {preset.description}
                </p>

                <div className="flex gap-2 mt-4">
                  <Badge variant="outline" className="text-xs">
                    {preset.gaspType}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {preset.euclidean.k} pulses
                  </Badge>
                </div>
              </CardContent>

              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPreview(preset.id);
                  }}
                >
                  {playingPreset === preset.id ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Preview
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPattern(preset);
                  }}
                >
                  Use Pattern
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {filteredPresets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No patterns found matching your filters.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setFilterLanguage('all');
                setFilterGaspType('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
