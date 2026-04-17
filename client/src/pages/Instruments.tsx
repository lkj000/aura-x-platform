import { useState, useRef, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Loader2, Play, Pause, Download, Save, Sparkles, Music, AlertCircle, Lightbulb, Lock, Edit, Trash2, Share2, Copy, Check, Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { AudioEngine } from '@/services/AudioEngine';
import { amapianoPresets, getPresetsByCategory, type AmapianoPreset } from '@/data/amapianoPresets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

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
  const [generationPhase, setGenerationPhase] = useState<'idle' | 'loading' | 'generating' | 'uploading' | 'finalizing'>('idle');
  const [generatedAudio, setGeneratedAudio] = useState<{
    url: string;
    duration: number;
    generationId: number;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [autonomousProgress, setAutonomousProgress] = useState<{
    attempt: number;
    maxAttempts: number;
    scores: Array<{
      attempt: number;
      overall: number;
      breakdown: { rhythmicAuthenticity: number; harmonicStructure: number; productionQuality: number; culturalElements: number };
      feedback: string;
      recommendations: string[];
    }>;
    currentPrompt: string;
  } | null>(null);
  const [stems, setStems] = useState<Array<{ type: string; url: string }> | null>(null);
  const [isSeparatingStems, setIsSeparatingStems] = useState(false);

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

  // Auto-load latest generation on mount
  const latestGenerationQuery = trpc.aiStudio.listGenerations.useQuery(
    { limit: 1, offset: 0 },
    { enabled: !generatedAudio } // Only fetch if no audio is loaded
  );

  useEffect(() => {
    if (!latestGenerationQuery.data || latestGenerationQuery.data.length === 0) return;
    if (generatedAudio) return; // Don't override if audio is already loaded

    const latest = latestGenerationQuery.data[0];
    if (latest.status === 'completed' && latest.resultUrl) {
      setGeneratedAudio({
        url: latest.resultUrl,
        duration: latest.duration || 30,
        generationId: latest.id,
      });
      toast({
        title: 'Latest generation loaded',
        description: `Loaded generation #${latest.id}`,
      });
    }
  }, [latestGenerationQuery.data, generatedAudio, toast]);

  // Preset favorites
  const presetFavoritesQuery = trpc.presetFavorites.list.useQuery();
  const addFavoriteMutation = trpc.presetFavorites.add.useMutation();
  const removeFavoriteMutation = trpc.presetFavorites.remove.useMutation();

  // Queue management
  const userQueueQuery = trpc.queue.getUserQueue.useQuery(undefined, {
    refetchInterval: 5000, // Poll every 5 seconds
    enabled: isGenerating, // Only poll when generating
  });
  const queueStatsQuery = trpc.queue.getUserStats.useQuery();
  const cancelQueueMutation = trpc.queue.cancelQueuedGeneration.useMutation();

  // Custom presets
  const customPresetsQuery = trpc.customPresets.list.useQuery();
  
  // User preferences
  const preferencesQuery = trpc.preferences.get.useQuery();
  const createPresetMutation = trpc.customPresets.create.useMutation();
  const updatePresetMutation = trpc.customPresets.update.useMutation();
  const deletePresetMutation = trpc.customPresets.delete.useMutation();
  const sharePresetMutation = trpc.customPresets.generateShareLink.useMutation();
  const unsharePresetMutation = trpc.customPresets.unsharePreset.useMutation();
  const communityPresetsQuery = trpc.customPresets.listPublicPresets.useQuery({ limit: 20, offset: 0 });
  const importPresetMutation = trpc.customPresets.importSharedPreset.useMutation();
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);
  const [showEditPresetDialog, setShowEditPresetDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<number | null>(null);
  const [deletingPresetId, setDeletingPresetId] = useState<number | null>(null);
  const [sharingPresetId, setSharingPresetId] = useState<number | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [presetIsPublic, setPresetIsPublic] = useState(false);
  const [communitySearch, setCommunitySearch] = useState('');
  const [communitySort, setCommunitySort] = useState<'popular' | 'recent' | 'imports'>('popular');

  // Filter and sort community presets
  const filteredCommunityPresets = useMemo(() => {
    if (!communityPresetsQuery.data) return [];

    let filtered = communityPresetsQuery.data;

    // Apply search filter
    if (communitySearch.trim()) {
      const searchLower = communitySearch.toLowerCase();
      filtered = filtered.filter(
        (preset) =>
          preset.name.toLowerCase().includes(searchLower) ||
          (preset.description && preset.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply sort
    const sorted = [...filtered];
    if (communitySort === 'popular') {
      sorted.sort((a, b) => (b.importCount || 0) - (a.importCount || 0));
    } else if (communitySort === 'recent') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (communitySort === 'imports') {
      sorted.sort((a, b) => (b.importCount || 0) - (a.importCount || 0));
    }

    return sorted;
  }, [communityPresetsQuery.data, communitySearch, communitySort]);

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      toast({
        title: 'Preset Name Required',
        description: 'Please enter a name for your preset',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createPresetMutation.mutateAsync({
        name: presetName,
        description: presetDescription,
        category: params.generationMode,
        style: params.mode,
        icon: '🎵',
        prompt: params.prompt,
        parameters: {
          tempo: params.tempo,
          key: params.key,
          duration: params.duration,
          seed: params.seed,
          temperature: params.temperature,
          topK: params.topK,
          topP: params.topP,
          cfgScale: params.cfgScale,
        },
        culturalElements: [],
        tags: [params.mode, params.generationMode],
      });

      toast({
        title: 'Preset Saved',
        description: `"${presetName}" has been saved to your custom presets`,
      });

      setShowSavePresetDialog(false);
      setPresetName('');
      setPresetDescription('');
      utils.customPresets.list.invalidate();
    } catch (error) {
      toast({
        title: 'Failed to Save Preset',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleEditPreset = async () => {
    if (!editingPresetId || !presetName.trim()) {
      toast({
        title: 'Preset Name Required',
        description: 'Please enter a name for your preset',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updatePresetMutation.mutateAsync({
        id: editingPresetId,
        name: presetName,
        description: presetDescription,
        isPublic: presetIsPublic,
      });

      toast({
        title: 'Preset Updated',
        description: `"${presetName}" has been updated successfully`,
      });

      setShowEditPresetDialog(false);
      setEditingPresetId(null);
      setPresetName('');
      setPresetDescription('');
      setPresetIsPublic(false);
      utils.customPresets.list.invalidate();
    } catch (error) {
      toast({
        title: 'Failed to Update Preset',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePreset = async () => {
    if (!deletingPresetId) return;

    try {
      await deletePresetMutation.mutateAsync({ id: deletingPresetId });

      toast({
        title: 'Preset Deleted',
        description: 'Preset has been deleted successfully',
      });

      setShowDeleteConfirmDialog(false);
      setDeletingPresetId(null);
      utils.customPresets.list.invalidate();
    } catch (error) {
      toast({
        title: 'Failed to Delete Preset',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleSharePreset = async () => {
    if (!sharingPresetId) return;

    try {
      const result = await sharePresetMutation.mutateAsync({ id: sharingPresetId });
      setShareUrl(result.shareUrl);
      setShowShareDialog(true);
      utils.customPresets.list.invalidate();
    } catch (error) {
      toast({
        title: 'Failed to Share Preset',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Link Copied!',
      description: 'Share link copied to clipboard',
    });
  };

  const handleImportPreset = async (shareCode: string) => {
    try {
      await importPresetMutation.mutateAsync({ shareCode });
      toast({
        title: 'Preset Imported!',
        description: 'Community preset has been added to your library',
      });
      utils.customPresets.list.invalidate();
    } catch (error) {
      toast({
        title: 'Failed to Import Preset',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const isFavorite = (presetId: string) => {
    return presetFavoritesQuery.data?.some(fav => fav.presetId === presetId) || false;
  };

  // Queue notifications
  const prevQueuePositionRef = useRef<number | null>(null);
  const prevGenerationStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userQueueQuery.data || userQueueQuery.data.length === 0) return;

    const currentQueue = userQueueQuery.data[0];
    const currentPosition = currentQueue.queuePosition;
    const currentStatus = currentQueue.status;

    // Queue position changed
    if (prevQueuePositionRef.current !== null && prevQueuePositionRef.current !== currentPosition) {
      toast({
        title: 'Queue Position Updated',
        description: `You are now #${currentPosition} in the queue`,
      });
    }

    // Generation completed
    if (prevGenerationStatusRef.current === 'processing' && currentStatus === 'completed') {
      toast({
        title: 'Generation Complete! 🎉',
        description: 'Your Amapiano track is ready to play',
      });
      
      // Play notification sound if enabled
      if (preferencesQuery.data?.notificationSoundEnabled) {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(err => console.log('Could not play notification sound:', err));
      }
    }

    // Generation failed
    if (prevGenerationStatusRef.current === 'processing' && currentStatus === 'failed') {
      toast({
        title: 'Generation Failed',
        description: currentQueue.errorMessage || 'An error occurred during generation',
        variant: 'destructive',
      });
    }

    prevQueuePositionRef.current = currentPosition;
    prevGenerationStatusRef.current = currentStatus;
  }, [userQueueQuery.data, toast]);

  const toggleFavorite = async (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavorite(presetId)) {
      await removeFavoriteMutation.mutateAsync({ presetId });
    } else {
      await addFavoriteMutation.mutateAsync({ presetId });
    }
    utils.presetFavorites.list.invalidate();
  };

  const generateAutonomousMutation = trpc.generate.autonomous.useMutation({
    onMutate: () => {
      setAutonomousProgress(null); // Reset progress
    },
    onSuccess: (data) => {
      console.log('[Instruments] Autonomous workflow complete:', data);
      setIsGenerating(false);
      setGenerationProgress(100);
      
      // Update final progress state
      if (data.allScores && data.allScores.length > 0) {
        setAutonomousProgress({
          attempt: data.attempts,
          maxAttempts: data.attempts,
          scores: data.allScores.map((score: any, index: number) => ({
            attempt: index + 1,
            overall: score.overall,
            breakdown: score.breakdown,
            feedback: score.feedback,
            recommendations: score.recommendations,
          })),
          currentPrompt: data.finalPrompt || '',
        });
      }
      
      if (data.audioUrl) {
        setGeneratedAudio({
          url: data.audioUrl,
          duration: 30,
          generationId: data.generationId || 0,
        });
        loadWaveform(data.audioUrl);
      }
      
      toast({
        title: data.success ? 'Autonomous Generation Complete!' : 'Best Attempt Complete',
        description: `Score: ${data.finalScore}/100 after ${data.attempts} attempts`,
        variant: data.success ? 'default' : 'destructive',
      });
    },
    onError: (error) => {
      setIsGenerating(false);
      setAutonomousProgress(null);
      toast({
        title: 'Autonomous Workflow Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Route through aiStudio.generateMusic (Temporal-backed durable path).
  // generate.music is deprecated and will throw METHOD_NOT_SUPPORTED.
  const generateMusicMutation = trpc.aiStudio.generateMusic.useMutation({
    onSuccess: (data) => {
      console.log('[Instruments] Generation started:', data);
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

  const separateStemsMutation = trpc.aiStudio.separateStems.useMutation({
    onSuccess: (data: any) => {
      setIsSeparatingStems(false);
      if (data.status === 'completed' && data.stems) {
        setStems(data.stems);
        toast({
          title: 'Stem Separation Complete!',
          description: `Extracted ${data.stems.length} stems: drums, bass, vocals, other`,
        });
      }
    },
    onError: (error: any) => {
      setIsSeparatingStems(false);
      toast({
        title: 'Stem Separation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const pollGenerationStatus = async (generationId: number) => {
    const maxAttempts = 180; // 15 minutes max (5s intervals) - Modal generation takes 7-10 minutes
    let attempts = 0;

    const poll = async () => {
      try {
        const generation = await utils.client.generate.getJobStatus.query({ generationId });

        if (!generation) {
          throw new Error('Generation not found');
        }

        if (generation.status === 'completed' && generation.audioUrl) {
          setIsGenerating(false);
          setGenerationProgress(100);
          setGeneratedAudio({
            url: generation.audioUrl,
            duration: 30, // TODO: Get from generation
            generationId: generation.generationId,
          });
          
          // Load waveform
          loadWaveform(generation.audioUrl);

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
          // Calculate progress based on Modal's actual timing:
          // - Model download: 21 seconds (0-35% progress)
          // - Audio generation: 40 seconds (35-90% progress)
          // - S3 upload: 0.35 seconds (90-100% progress)
          // Total: ~62 seconds
          const elapsedSeconds = attempts * 5; // 5 second intervals
          const estimatedTotalSeconds = 62; // Based on Modal logs: 21s + 40s + 0.35s
          
          let progressPercent: number;
          let phase: 'loading' | 'generating' | 'uploading' | 'finalizing';
          let timeRemaining: number;
          
          if (elapsedSeconds <= 21) {
            // Model download phase (0-21s)
            progressPercent = (elapsedSeconds / 21) * 35;
            phase = 'loading';
            timeRemaining = 62 - elapsedSeconds;
          } else if (elapsedSeconds <= 61) {
            // Generation phase (21-61s)
            progressPercent = 35 + ((elapsedSeconds - 21) / 40) * 55;
            phase = 'generating';
            timeRemaining = 62 - elapsedSeconds;
          } else {
            // Upload/finalize phase (61-62s)
            progressPercent = 90 + ((elapsedSeconds - 61) / 1) * 10;
            phase = 'uploading';
            timeRemaining = Math.max(0, 62 - elapsedSeconds);
          }
          
          // Cap progress at 95% until actually completed
          progressPercent = Math.min(95, progressPercent);
          
          setGenerationPhase(phase);
          setGenerationProgress(progressPercent);
          
          // Update estimated time remaining (convert to minutes if > 60s)
          const timeRemainingDisplay = timeRemaining > 60 
            ? `${Math.ceil(timeRemaining / 60)} min`
            : `${Math.ceil(timeRemaining)}s`;
          
          console.log(`[Instruments] Progress: ${progressPercent.toFixed(1)}% | Phase: ${phase} | Time remaining: ${timeRemainingDisplay}`);

          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            // Timeout reached - auto-fail the generation
            setIsGenerating(false);
            
            try {
              await utils.client.generate.failGeneration.mutate({
                generationId,
                errorMessage: 'Generation timeout: exceeded 15 minutes (900 seconds)',
              });
              
              toast({
                title: 'Generation Timeout',
                description: 'Generation exceeded 15 minutes and was automatically cancelled',
                variant: 'destructive',
              });
            } catch (error) {
              console.error('[Instruments] Failed to auto-fail generation:', error);
              toast({
                title: 'Generation Timeout',
                description: 'Generation is taking longer than expected',
                variant: 'destructive',
              });
            }
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
    setGenerationPhase('loading');
    setGeneratedAudio(null);

    if (autonomousMode) {
      // Call autonomous workflow with quality scoring loop
      generateAutonomousMutation.mutate({
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
        maxAttempts: 3,
        targetScore: 80,
      });
    } else {
      // Manual mode: route through durable Temporal path via aiStudio.generateMusic
      generateMusicMutation.mutate({
        prompt: params.prompt,
        style: params.mode || 'Amapiano',
        mood: 'Energetic',
        bpm: params.tempo || 120,
        key: params.key || 'A min',
        vocalStyle: 'none',
        mode: 'custom',
        duration: params.duration,
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

  const handleSeparateStems = async () => {
    if (!generatedAudio) return;
    
    setIsSeparatingStems(true);
    separateStemsMutation.mutate({ generationId: generatedAudio.generationId });
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

              {/* Preset Library */}
              <div className="space-y-3">
                <Label>Amapiano Presets</Label>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="production">Production</TabsTrigger>
                    <TabsTrigger value="creative">Creative</TabsTrigger>
                    <TabsTrigger value="custom">My Presets</TabsTrigger>
                    <TabsTrigger value="community">Community</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
                    {amapianoPresets.map((preset) => (
                      <button
                        key={preset.id}
                        className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent transition-colors disabled:opacity-50 relative group"
                        onClick={() => {
                          setParams({
                            ...params,
                            ...preset.parameters,
                            prompt: preset.prompt,
                            mode: preset.style,
                          });
                        }}
                        disabled={isGenerating}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-2xl">{preset.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{preset.name}</div>
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {preset.description}
                            </div>
                          </div>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isGenerating) toggleFavorite(preset.id, e);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-background rounded cursor-pointer"
                          >
                            <span className={isFavorite(preset.id) ? 'text-yellow-500' : 'text-muted-foreground'}>
                              {isFavorite(preset.id) ? '★' : '☆'}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </TabsContent>
                  <TabsContent value="production" className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
                    {getPresetsByCategory('production').map((preset) => (
                      <button
                        key={preset.id}
                        className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent transition-colors disabled:opacity-50"
                        onClick={() => {
                          setParams({
                            ...params,
                            ...preset.parameters,
                            prompt: preset.prompt,
                            mode: preset.style,
                          });
                        }}
                        disabled={isGenerating}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-2xl">{preset.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{preset.name}</div>
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {preset.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </TabsContent>
                  <TabsContent value="creative" className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
                    {getPresetsByCategory('creative').map((preset) => (
                      <button
                        key={preset.id}
                        className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent transition-colors disabled:opacity-50"
                        onClick={() => {
                          setParams({
                            ...params,
                            ...preset.parameters,
                            prompt: preset.prompt,
                            mode: preset.style,
                          });
                        }}
                        disabled={isGenerating}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-2xl">{preset.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{preset.name}</div>
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {preset.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </TabsContent>
                  <TabsContent value="custom" className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
                    {customPresetsQuery.data && customPresetsQuery.data.length > 0 ? (
                      customPresetsQuery.data.map((preset) => (
                        <div
                          key={preset.id}
                          className="w-full p-3 rounded-lg border bg-card hover:bg-accent transition-colors group relative"
                        >
                          <button
                            className="w-full text-left"
                            onClick={() => {
                              const presetParams = preset.parameters as any;
                              setParams({
                                ...params,
                                prompt: preset.prompt,
                                mode: preset.style,
                                tempo: presetParams.tempo || params.tempo,
                                key: presetParams.key || params.key,
                                duration: presetParams.duration || params.duration,
                                seed: presetParams.seed || params.seed,
                                temperature: presetParams.temperature || params.temperature,
                                topK: presetParams.topK || params.topK,
                                topP: presetParams.topP || params.topP,
                                cfgScale: presetParams.cfgScale || params.cfgScale,
                              });
                            }}
                            disabled={isGenerating}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-2xl">{preset.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{preset.name}</div>
                                {preset.description && (
                                  <div className="text-xs text-muted-foreground line-clamp-2">
                                    {preset.description}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1">
                                  Used {preset.usageCount} times
                                </div>
                              </div>
                            </div>
                          </button>
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSharingPresetId(preset.id);
                                handleSharePreset();
                              }}
                            >
                              <Share2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPresetId(preset.id);
                                setPresetName(preset.name);
                                setPresetDescription(preset.description || '');
                                setPresetIsPublic(preset.isPublic || false);
                                setShowEditPresetDialog(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingPresetId(preset.id);
                                setShowDeleteConfirmDialog(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        <p>No custom presets yet</p>
                        <p className="text-xs mt-1">Save your favorite settings as presets!</p>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="community" className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search community presets..."
                          value={communitySearch}
                          onChange={(e) => setCommunitySearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select value={communitySort} onValueChange={(value: any) => setCommunitySort(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="popular">Most Popular</SelectItem>
                          <SelectItem value="recent">Recently Added</SelectItem>
                          <SelectItem value="imports">Most Imported</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {filteredCommunityPresets.length > 0 ? (
                        filteredCommunityPresets.map((preset) => (
                        <div
                          key={preset.id}
                          className="w-full p-3 rounded-lg border bg-card hover:bg-accent transition-colors group relative"
                        >
                          <button
                            className="w-full text-left"
                            onClick={() => {
                              if (preset.shareCode) {
                                handleImportPreset(preset.shareCode);
                              }
                            }}
                            disabled={isGenerating}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-2xl">{preset.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{preset.name}</div>
                                {preset.description && (
                                  <div className="text-xs text-muted-foreground line-clamp-2">
                                    {preset.description}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1">
                                  {preset.importCount || 0} imports
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>
                      ))
                      ) : (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          <p>{communitySearch ? 'No presets match your search' : 'No community presets available'}</p>
                          <p className="text-xs mt-1">{communitySearch ? 'Try a different search term' : 'Be the first to share a preset!'}</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
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
              <div className="flex gap-2">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !params.prompt}
                  className="flex-1"
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
                <Button
                  onClick={() => setShowSavePresetDialog(true)}
                  disabled={isGenerating || !params.prompt}
                  variant="outline"
                  size="lg"
                  title="Save current parameters as preset"
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>

              {/* Save Preset Dialog */}
              {showSavePresetDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md space-y-4">
                    <h3 className="text-lg font-semibold">Save as Custom Preset</h3>
                    <div className="space-y-2">
                      <Label>Preset Name *</Label>
                      <Input
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        placeholder="e.g., My Kasi Groove"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description (Optional)</Label>
                      <Textarea
                        value={presetDescription}
                        onChange={(e) => setPresetDescription(e.target.value)}
                        placeholder="Describe this preset..."
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSavePreset} className="flex-1">
                        Save Preset
                      </Button>
                      <Button
                        onClick={() => {
                          setShowSavePresetDialog(false);
                          setPresetName('');
                          setPresetDescription('');
                        }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Preset Dialog */}
              {showEditPresetDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md space-y-4">
                    <h3 className="text-lg font-semibold">Edit Preset</h3>
                    <div className="space-y-2">
                      <Label>Preset Name *</Label>
                      <Input
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        placeholder="e.g., My Kasi Groove"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description (Optional)</Label>
                      <Textarea
                        value={presetDescription}
                        onChange={(e) => setPresetDescription(e.target.value)}
                        placeholder="Describe this preset..."
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="space-y-0.5">
                        <Label htmlFor="preset-public">Make Public</Label>
                        <p className="text-xs text-muted-foreground">
                          Public presets appear in the Community tab for others to import
                        </p>
                      </div>
                      <Switch
                        id="preset-public"
                        checked={presetIsPublic}
                        onCheckedChange={setPresetIsPublic}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleEditPreset} className="flex-1">
                        Update Preset
                      </Button>
                      <Button
                        onClick={() => {
                          setShowEditPresetDialog(false);
                          setEditingPresetId(null);
                          setPresetName('');
                          setPresetDescription('');
                          setPresetIsPublic(false);
                        }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Preset Confirmation Dialog */}
              {showDeleteConfirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md space-y-4">
                    <h3 className="text-lg font-semibold">Delete Preset</h3>
                    <p className="text-sm text-muted-foreground">
                      Are you sure you want to delete this preset? This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <Button onClick={handleDeletePreset} variant="destructive" className="flex-1">
                        Delete Preset
                      </Button>
                      <Button
                        onClick={() => {
                          setShowDeleteConfirmDialog(false);
                          setDeletingPresetId(null);
                        }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Share Preset Dialog */}
              {showShareDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md space-y-4">
                    <h3 className="text-lg font-semibold">Share Preset</h3>
                    <p className="text-sm text-muted-foreground">
                      Anyone with this link can import your preset to their library.
                    </p>
                    <div className="flex gap-2">
                      <Input value={shareUrl} readOnly className="flex-1" />
                      <Button onClick={handleCopyShareLink} variant="outline" size="icon">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setShowShareDialog(false);
                          setSharingPresetId(null);
                          setShareUrl('');
                          setCopied(false);
                        }}
                        className="flex-1"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {isGenerating && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">
                        {generationPhase === 'loading' && '🔄 Loading Model Weights...'}
                        {generationPhase === 'generating' && '🎵 Generating Audio with AI...'}
                        {generationPhase === 'uploading' && '☁️ Uploading to S3...'}
                        {generationPhase === 'finalizing' && '✨ Finalizing Track...'}
                        {generationPhase === 'idle' && 'Initializing...'}
                      </span>
                      <span className="font-medium">{Math.round(generationProgress)}%</span>
                    </div>
                    <Progress value={generationProgress} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>
                        {generationProgress < 90
                          ? `Estimated time remaining: ${Math.ceil((540 - (generationProgress / 100 * 540)) / 60)} min`
                          : 'Almost done...'}
                      </span>
                    </div>
                    {autonomousMode && (
                      <span className="text-purple-400 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Autonomous Mode
                      </span>
                    )}
                  </div>

                  {/* Queue Status */}
                  {userQueueQuery.data && userQueueQuery.data.length > 0 && (
                    <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Queue Position:</span>
                        <span className="font-medium">#{userQueueQuery.data[0].queuePosition}</span>
                      </div>
                      {userQueueQuery.data[0].estimatedWaitTime && (
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-muted-foreground">Estimated Wait:</span>
                          <span className="font-medium">{Math.ceil(userQueueQuery.data[0].estimatedWaitTime / 60)} min</span>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 h-7 text-xs"
                        onClick={() => {
                          if (userQueueQuery.data && userQueueQuery.data[0]) {
                            cancelQueueMutation.mutate({ queueId: userQueueQuery.data[0].id });
                            setIsGenerating(false);
                          }
                        }}
                      >
                        Cancel Generation
                      </Button>
                    </div>
                  )}
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

              {/* Autonomous Workflow Progress */}
              {autonomousProgress && (
                <div className="space-y-4 border border-border rounded-lg p-4 bg-card">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Autonomous Workflow Progress</h3>
                    <span className="text-sm text-muted-foreground">
                      {autonomousProgress.attempt}/{autonomousProgress.maxAttempts} attempts
                    </span>
                  </div>
                  
                  {/* Attempt-by-Attempt Scores */}
                  <div className="space-y-3">
                    {autonomousProgress.scores.map((scoreData, index) => (
                      <div key={index} className="border border-border rounded-lg p-3 bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Attempt {scoreData.attempt}</span>
                          <span className="text-lg font-bold">
                            {scoreData.overall}/100
                          </span>
                        </div>
                        
                        {/* Breakdown Scores */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Rhythmic:</span>
                            <span className="ml-2 font-medium">{scoreData.breakdown.rhythmicAuthenticity}/100</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Harmonic:</span>
                            <span className="ml-2 font-medium">{scoreData.breakdown.harmonicStructure}/100</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Production:</span>
                            <span className="ml-2 font-medium">{scoreData.breakdown.productionQuality}/100</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cultural:</span>
                            <span className="ml-2 font-medium">{scoreData.breakdown.culturalElements}/100</span>
                          </div>
                        </div>
                        
                        {/* Feedback */}
                        <p className="text-sm text-muted-foreground mt-2">
                          {scoreData.feedback}
                        </p>
                        
                        {/* Recommendations */}
                        {scoreData.recommendations.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Improvements:</p>
                            <ul className="text-xs space-y-1">
                              {scoreData.recommendations.slice(0, 2).map((rec, recIndex) => (
                                <li key={recIndex} className="text-muted-foreground">• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Final Prompt */}
                  {autonomousProgress.currentPrompt && (
                    <div className="border-t border-border pt-3">
                      <p className="text-sm font-medium mb-1">Final Optimized Prompt:</p>
                      <p className="text-sm text-muted-foreground">{autonomousProgress.currentPrompt}</p>
                    </div>
                  )}
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

                  {/* Stem Separation Button */}
                  <Button
                    onClick={handleSeparateStems}
                    variant="outline"
                    className="w-full"
                    disabled={isSeparatingStems}
                  >
                    {isSeparatingStems ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Separating Stems...
                      </>
                    ) : (
                      <>
                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        Separate Stems
                      </>
                    )}
                  </Button>

                  {/* Stems Display */}
                  {stems && stems.length > 0 && (
                    <div className="border border-border rounded-lg p-4 space-y-3">
                      <h4 className="font-semibold">Extracted Stems</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {stems.map((stem, index) => (
                          <a
                            key={index}
                            href={stem.url}
                            download
                            className="flex items-center gap-2 p-2 border border-border rounded hover:bg-muted transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            <span className="text-sm capitalize">{stem.type}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

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
