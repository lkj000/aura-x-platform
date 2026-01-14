import React, { useState, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Loader2, Play, Pause, Download, Save, Sparkles, Music, AlertCircle, Lightbulb, Lock } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { AudioEngine } from '@/services/AudioEngine';

type GenerationMode = 'creative' | 'production';

interface GenerationParams {
  prompt: string;
  tempo: number;
  key: string;
  mode: string;
  duration: number;
  seed: number;
  temperature: number;
  topK: number;
  topP: number;
  cfgScale: number;
  generationMode: GenerationMode;
}

export default function Instruments() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedAudio, setGeneratedAudio] = useState<{
    url: string;
    duration: number;
    generationId: number;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [autonomousMode, setAutonomousMode] = useState(false);

  const [params, setParams] = useState<GenerationParams>({
    prompt: 'Energetic Amapiano track with log drums, shakers, and smooth piano chords in F minor at 112 BPM',
    tempo: 112,
    key: 'F min',
    mode: 'kasi',
    duration: 30,
    seed: Math.floor(Math.random() * 1000000),
    temperature: 0.8,
    topK: 50,
    topP: 0.95,
    cfgScale: 7.5,
    generationMode: 'creative',
  });

  // Regenerate seed when switching to creative mode
  const handleModeChange = (mode: GenerationMode) => {
    setParams(prev => ({
      ...prev,
      generationMode: mode,
      seed: mode === 'creative' ? Math.floor(Math.random() * 1000000) : prev.seed,
    }));
  };

  const utils = trpc.useUtils();

  const generateMusicMutation = trpc.generate.music.useMutation({
    onSuccess: (data) => {
      console.log('[Instruments] Generation started:', data);
      // Poll for status
      pollGenerationStatus(data.generationId);
    },
    onError: (error) => {
      setIsGenerating(false);
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const saveToMediaLibraryMutation = trpc.mediaLibrary.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Saved to Media Library',
        description: 'Track has been saved to your media library',
      });
    },
  });

  const pollGenerationStatus = async (generationId: number) => {
    const maxAttempts = 60; // 5 minutes max (5s intervals)
    let attempts = 0;

    const poll = async () => {
      try {
        const generation = await utils.client.generate.status.query({ generationId });

        if (!generation) {
          throw new Error('Generation not found');
        }

        if (generation.status === 'completed' && generation.resultUrl) {
          setIsGenerating(false);
          setGenerationProgress(100);
          setGeneratedAudio({
            url: generation.resultUrl,
            duration: 30, // TODO: Get from generation
            generationId: generation.id,
          });
          
          // Load waveform
          loadWaveform(generation.resultUrl);

          toast({
            title: 'Generation Complete!',
            description: 'Your Amapiano track is ready',
          });
        } else if (generation.status === 'failed') {
          setIsGenerating(false);
          toast({
            title: 'Generation Failed',
            description: generation.errorMessage || 'Unknown error',
            variant: 'destructive',
          });
        } else if (generation.status === 'processing') {
          // Update progress
          setGenerationProgress(Math.min(90, (attempts / maxAttempts) * 100));

          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            setIsGenerating(false);
            toast({
              title: 'Generation Timeout',
              description: 'Generation is taking longer than expected',
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        console.error('[Instruments] Poll error:', error);
        setIsGenerating(false);
        toast({
          title: 'Error',
          description: 'Failed to check generation status',
          variant: 'destructive',
        });
      }
    };

    poll();
  };

  const loadWaveform = async (audioUrl: string) => {
    try {
      await AudioEngine.initialize();
      const buffer = await AudioEngine.loadAudioFile(audioUrl);
      const waveform = AudioEngine.generateWaveform(buffer, 100);
      setWaveformData(Array.from(waveform.peaks));
    } catch (error) {
      console.error('[Instruments] Failed to load waveform:', error);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedAudio(null);

    if (autonomousMode) {
      // Call orchestration agent for Level 5 autonomous workflow
      try {
        const response = await fetch('http://localhost:8000/workflow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal: params.prompt,
            user_id: 1, // TODO: Get from auth context
            parameters: {
              tempo: params.tempo,
              key: params.key,
              mode: params.mode,
              duration: params.duration,
              seed: params.seed,
              temperature: params.temperature,
              topK: params.topK,
              topP: params.topP,
              cfgScale: params.cfgScale,
              generationMode: params.generationMode,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Orchestration agent request failed');
        }

        const result = await response.json();
        
        toast({
          title: 'Autonomous Workflow Started',
          description: `Workflow ID: ${result.workflow_id}`,
        });

        // TODO: Poll workflow status and update UI
        setIsGenerating(false);
        setGenerationProgress(100);
      } catch (error) {
        setIsGenerating(false);
        toast({
          title: 'Orchestration Failed',
          description: error instanceof Error ? error.message : 'Failed to start autonomous workflow. Make sure orchestration agent is running on port 8000.',
          variant: 'destructive',
        });
      }
    } else {
      // Manual mode: direct Modal generation
      generateMusicMutation.mutate({
        prompt: params.prompt,
        parameters: {
          tempo: params.tempo,
          key: params.key,
          mode: params.mode,
          duration: params.duration,
          seed: params.seed,
          temperature: params.temperature,
          topK: params.topK,
          topP: params.topP,
          cfgScale: params.cfgScale,
          generationMode: params.generationMode,
        },
      });
    }
  };

  const handlePlayPause = () => {
    if (!generatedAudio || !audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = async () => {
    if (!generatedAudio) return;

    // Create download link
    const link = document.createElement('a');
    link.href = generatedAudio.url;
    link.download = `aura-x-${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Download Started',
      description: 'Your track is being downloaded',
    });
  };

  const handleSaveToLibrary = async () => {
    if (!generatedAudio) return;

    saveToMediaLibraryMutation.mutate({
      name: `Generated Track ${new Date().toLocaleString()}`,
      type: 'generated',
      fileUrl: generatedAudio.url,
      fileSize: 0, // TODO: Get actual file size
      duration: generatedAudio.duration * 1000,
      format: 'mp3',
      sampleRate: 44100,
      generationId: generatedAudio.generationId,
      tags: [params.mode, params.key],
    });
  };

  useEffect(() => {
    if (generatedAudio && audioRef.current) {
      audioRef.current.src = generatedAudio.url;
    }
  }, [generatedAudio]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AI Music Generation
            </h1>
            <p className="text-muted-foreground mt-2">
              Generate culturally authentic Amapiano tracks with AI
            </p>
          </div>
          <Music className="h-12 w-12 text-primary" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Generation Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Generation Parameters
              </CardTitle>
              <CardDescription>
                Configure your Amapiano track generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Autonomous Mode Toggle */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Workflow Mode
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={!autonomousMode ? 'default' : 'outline'}
                    className="w-full justify-start gap-2"
                    onClick={() => setAutonomousMode(false)}
                    disabled={isGenerating}
                  >
                    <Music className="h-4 w-4" />
                    Manual
                  </Button>
                  <Button
                    variant={autonomousMode ? 'default' : 'outline'}
                    className="w-full justify-start gap-2 bg-gradient-to-r from-primary to-secondary"
                    onClick={() => setAutonomousMode(true)}
                    disabled={isGenerating}
                  >
                    <Sparkles className="h-4 w-4" />
                    Autonomous
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {autonomousMode
                    ? 'AI agent handles complete workflow: generate → analyze → master → export'
                    : 'Manual control over each production step'}
                </p>
              </div>

              {/* Generation Mode Toggle */}
              <div className="space-y-2">
                <Label>Generation Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={params.generationMode === 'creative' ? 'default' : 'outline'}
                    className="w-full justify-start gap-2"
                    onClick={() => handleModeChange('creative')}
                    disabled={isGenerating}
                  >
                    <Lightbulb className="h-4 w-4" />
                    Creative
                  </Button>
                  <Button
                    variant={params.generationMode === 'production' ? 'default' : 'outline'}
                    className="w-full justify-start gap-2"
                    onClick={() => handleModeChange('production')}
                    disabled={isGenerating}
                  >
                    <Lock className="h-4 w-4" />
                    Production
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {params.generationMode === 'creative'
                    ? 'Random seed for exploration and variety'
                    : 'Fixed seed for reproducible, deterministic results'}
                </p>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  value={params.prompt}
                  onChange={(e) => setParams({ ...params, prompt: e.target.value })}
                  placeholder="Describe the Amapiano track you want to generate..."
                  rows={4}
                  disabled={isGenerating}
                />
              </div>

              {/* Tempo */}
              <div className="space-y-2">
                <Label htmlFor="tempo">Tempo: {params.tempo} BPM</Label>
                <Slider
                  id="tempo"
                  min={100}
                  max={130}
                  step={1}
                  value={[params.tempo]}
                  onValueChange={([value]) => setParams({ ...params, tempo: value })}
                  disabled={isGenerating}
                />
              </div>

              {/* Key */}
              <div className="space-y-2">
                <Label htmlFor="key">Key</Label>
                <Select
                  value={params.key}
                  onValueChange={(value) => setParams({ ...params, key: value })}
                  disabled={isGenerating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C min">C minor</SelectItem>
                    <SelectItem value="D min">D minor</SelectItem>
                    <SelectItem value="E min">E minor</SelectItem>
                    <SelectItem value="F min">F minor</SelectItem>
                    <SelectItem value="G min">G minor</SelectItem>
                    <SelectItem value="A min">A minor</SelectItem>
                    <SelectItem value="B min">B minor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mode (Subgenre) */}
              <div className="space-y-2">
                <Label htmlFor="mode">Amapiano Style</Label>
                <Select
                  value={params.mode}
                  onValueChange={(value) => setParams({ ...params, mode: value })}
                  disabled={isGenerating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private-school">Private School</SelectItem>
                    <SelectItem value="kasi">Kasi</SelectItem>
                    <SelectItem value="bacardi">Bacardi</SelectItem>
                    <SelectItem value="sgija">Sgija</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Duration: {params.duration}s</Label>
                <Slider
                  id="duration"
                  min={10}
                  max={60}
                  step={5}
                  value={[params.duration]}
                  onValueChange={([value]) => setParams({ ...params, duration: value })}
                  disabled={isGenerating}
                />
              </div>

              {/* Advanced Parameters */}
              <details className="space-y-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Advanced Parameters
                </summary>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Seed: {params.seed}</Label>
                    <Input
                      type="number"
                      value={params.seed}
                      onChange={(e) => setParams({ ...params, seed: parseInt(e.target.value) })}
                      disabled={isGenerating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Temperature: {params.temperature}</Label>
                    <Slider
                      min={0.1}
                      max={1.5}
                      step={0.1}
                      value={[params.temperature]}
                      onValueChange={([value]) => setParams({ ...params, temperature: value })}
                      disabled={isGenerating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Top K: {params.topK}</Label>
                    <Slider
                      min={10}
                      max={100}
                      step={5}
                      value={[params.topK]}
                      onValueChange={([value]) => setParams({ ...params, topK: value })}
                      disabled={isGenerating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Top P: {params.topP}</Label>
                    <Slider
                      min={0.5}
                      max={1.0}
                      step={0.05}
                      value={[params.topP]}
                      onValueChange={([value]) => setParams({ ...params, topP: value })}
                      disabled={isGenerating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>CFG Scale: {params.cfgScale}</Label>
                    <Slider
                      min={1}
                      max={15}
                      step={0.5}
                      value={[params.cfgScale]}
                      onValueChange={([value]) => setParams({ ...params, cfgScale: value })}
                      disabled={isGenerating}
                    />
                  </div>
                </div>
              </details>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !params.prompt}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Track
                  </>
                )}
              </Button>

              {isGenerating && (
                <div className="space-y-2">
                  <Progress value={generationProgress} />
                  <p className="text-sm text-muted-foreground text-center">
                    {generationProgress < 10
                      ? 'Initializing AI model...'
                      : generationProgress < 50
                      ? 'Generating audio...'
                      : 'Finalizing track...'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generated Audio Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Track</CardTitle>
              <CardDescription>
                Preview and download your generated Amapiano track
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!generatedAudio && !isGenerating && (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                  <Music className="h-16 w-16 mb-4 opacity-50" />
                  <p>No track generated yet</p>
                  <p className="text-sm">Configure parameters and click Generate Track</p>
                </div>
              )}

              {isGenerating && (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Loader2 className="h-16 w-16 mb-4 animate-spin text-primary" />
                  <p className="font-medium">Generating your Amapiano track...</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    This may take 30-60 seconds
                  </p>
                </div>
              )}

              {generatedAudio && (
                <>
                  {/* Waveform Visualization */}
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-end justify-center h-32 gap-1">
                      {waveformData.length > 0 ? (
                        waveformData.map((value, index) => (
                          <div
                            key={index}
                            className="flex-1 bg-primary rounded-t"
                            style={{
                              height: `${value * 100}%`,
                              minHeight: '2px',
                            }}
                          />
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Loading waveform...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Audio Player */}
                  <audio ref={audioRef} className="hidden" />

                  {/* Playback Controls */}
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={handlePlayPause}
                      size="lg"
                      className="flex-1"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Play
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={handleDownload}
                      variant="outline"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      onClick={handleSaveToLibrary}
                      variant="outline"
                      disabled={saveToMediaLibraryMutation.isPending}
                    >
                      {saveToMediaLibraryMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save to Library
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Track Info */}
                  <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tempo:</span>
                      <span className="font-medium">{params.tempo} BPM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Key:</span>
                      <span className="font-medium">{params.key}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Style:</span>
                      <span className="font-medium capitalize">{params.mode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">{params.duration}s</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <AlertCircle className="h-5 w-5" />
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>1. Configure Parameters:</strong> Adjust tempo, key, and style to match your vision
            </p>
            <p>
              <strong>2. Write a Prompt:</strong> Describe the instruments, mood, and energy you want
            </p>
            <p>
              <strong>3. Generate:</strong> Click "Generate Track" and wait 30-60 seconds
            </p>
            <p>
              <strong>4. Preview & Save:</strong> Listen to your track, then save to library or download
            </p>
            <p>
              <strong>5. Import to DAW:</strong> Drag your saved track into the Studio timeline for further editing
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
