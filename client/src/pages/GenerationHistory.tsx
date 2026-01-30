import React, { useState, useEffect, useRef } from 'react';
import AudioVisualizer from '@/components/AudioVisualizer';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  Download, 
  Copy, 
  Heart, 
  Trash2, 
  Clock, 
  Music, 
  Sparkles,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { StarRating } from '@/components/StarRating';
import { useFeedback, useFeedbackStats } from '@/hooks/useFeedback';
import { Award } from 'lucide-react';

// Rating Widget Component
function GenerationRatingWidget({ generationId }: { generationId: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rating, setRating] = useState(0);
  const { submitFeedback, isSubmitting, quickRate } = useFeedback();
  const { stats } = useFeedbackStats(generationId);

  const handleQuickRate = async (value: number) => {
    setRating(value);
    await quickRate(generationId, value);
  };

  const isGoldStandard = stats && stats.avgCulturalRating >= 4 && stats.avgSwingRating >= 4;

  return (
    <div className="border-t pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Rate This Pattern:</span>
          <StarRating
            value={rating}
            onChange={handleQuickRate}
            size="sm"
          />
          {isGoldStandard && (
            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-xs">
              <Award className="h-3 w-3 mr-1" />
              Gold Standard
            </Badge>
          )}
        </div>
        {stats && stats.totalFeedbackCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {stats.totalFeedbackCount} {stats.totalFeedbackCount === 1 ? 'rating' : 'ratings'}
          </Button>
        )}
      </div>

      {isExpanded && stats && (
        <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Cultural Authenticity</span>
            <StarRating
              value={Math.round(stats.avgCulturalRating)}
              readonly
              size="sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Rhythmic Swing</span>
            <StarRating
              value={Math.round(stats.avgSwingRating)}
              readonly
              size="sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Favorite Rate</span>
            <span className="font-medium">{stats.favoriteRate.toFixed(0)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GenerationHistory() {
  const { toast } = useToast();
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'favorites' | 'recent'>('all');

  const historyQuery = trpc.aiStudio.listGenerations.useQuery({ limit: 100 });
  const separateStemsMutation = trpc.aiStudio.separateStems.useMutation();
  const toggleFavoriteMutation = trpc.generationHistory.toggleFavorite.useMutation();
  const deleteHistoryMutation = trpc.generationHistory.delete.useMutation();
  const utils = trpc.useUtils();

  const filteredHistory = historyQuery.data?.filter(item => {
    if (filter === 'favorites') return item.isFavorite;
    if (filter === 'recent') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return new Date(item.createdAt) > oneDayAgo;
    }
    return true;
  }) || [];

  const handleToggleFavorite = async (id: number) => {
    await toggleFavoriteMutation.mutateAsync({ id });
    utils.generationHistory.list.invalidate();
    toast({
      title: 'Updated',
      description: 'Generation favorite status updated',
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this generation?')) return;
    
    await deleteHistoryMutation.mutateAsync({ id });
    utils.generationHistory.list.invalidate();
    toast({
      title: 'Deleted',
      description: 'Generation removed from history',
    });
  };

  const handleSeparateStems = async (generationId: number) => {
    try {
      toast({
        title: "Separating stems...",
        description: "This may take a few minutes",
      });
      
      await separateStemsMutation.mutateAsync({ generationId });
      
      toast({
        title: "Stems separated!",
        description: "Stems are ready for download",
      });
      
      utils.aiStudio.listGenerations.invalidate();
    } catch (error) {
      toast({
        title: "Stem separation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const importToDAWMutation = trpc.aiStudio.importStemsToDAW.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Imported to DAW!",
        description: `Created ${data.tracksCreated} tracks in project. Open Studio to view.`,
      });
      // Navigate to studio after short delay
      setTimeout(() => {
        window.location.href = '/studio';
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImportToDAW = (generation: any) => {
    if (!generation.stemsUrl || generation.stemsUrl === '[]') {
      toast({
        title: "No stems available",
        description: "Please separate stems first",
        variant: "destructive",
      });
      return;
    }
    
    importToDAWMutation.mutate({ generationId: generation.id });
  };

  const handleReplay = (item: any) => {
    // Navigate to Instruments page with preset parameters
    const params = new URLSearchParams({
      prompt: item.prompt || '',
      tempo: item.parameters?.tempo || '112',
      key: item.parameters?.key || 'F min',
      seed: item.seed?.toString() || '',
      temperature: item.temperature?.toString() || '',
      topK: item.topK?.toString() || '',
      topP: item.topP?.toString() || '',
      cfgScale: item.cfgScale?.toString() || '',
    });
    
    window.location.href = `/instruments?${params.toString()}`;
  };

  const handleRemix = (item: any) => {
    // Navigate to Instruments page with modified parameters (randomize seed)
    const params = new URLSearchParams({
      prompt: item.prompt || '',
      tempo: item.parameters?.tempo || '112',
      key: item.parameters?.key || 'F min',
      seed: Math.floor(Math.random() * 1000000).toString(),
      temperature: item.temperature?.toString() || '',
      topK: item.topK?.toString() || '',
      topP: item.topP?.toString() || '',
      cfgScale: item.cfgScale?.toString() || '',
    });
    
    window.location.href = `/instruments?${params.toString()}`;
  };

  const handleDownload = async (audioUrl: string, filename: string) => {
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Downloaded',
        description: 'Track downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download track',
        variant: 'destructive',
      });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Generation History</h1>
          <p className="text-muted-foreground">
            Track your creative evolution, replay successful generations, and learn from your production journey
          </p>
        </div>

        <Tabs defaultValue="all" onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">
              <Music className="h-4 w-4 mr-2" />
              All Generations
            </TabsTrigger>
            <TabsTrigger value="favorites">
              <Heart className="h-4 w-4 mr-2" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="recent">
              <Clock className="h-4 w-4 mr-2" />
              Recent (24h)
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-6 space-y-4">
            {historyQuery.isLoading && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading generation history...</p>
              </div>
            )}

            {filteredHistory.length === 0 && !historyQuery.isLoading && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">No generations yet</p>
                  <p className="text-muted-foreground mb-4">
                    Start creating music in the Instruments page to build your history
                  </p>
                  <Button onClick={() => window.location.href = '/instruments'}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Music
                  </Button>
                </CardContent>
              </Card>
            )}

            {filteredHistory.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Music className="h-5 w-5" />
                        Generation #{item.id}
                        {item.isFavorite && (
                          <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(item.createdAt), 'MMM d, yyyy h:mm a')}
                        </span>
                        {item.duration && (
                          <span>{item.duration}s</span>
                        )}
                        <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleFavorite(item.id)}
                      >
                        <Heart className={item.isFavorite ? 'h-4 w-4 fill-red-500 text-red-500' : 'h-4 w-4'} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Prompt */}
                  {item.prompt && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm font-medium mb-1">Prompt</p>
                      <p className="text-sm text-muted-foreground">{item.prompt}</p>
                    </div>
                  )}

                  {/* Parameters */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {item.style && (
                      <div>
                        <p className="text-muted-foreground">Style</p>
                        <p className="font-medium">{item.style}</p>
                      </div>
                    )}
                    {item.mood && (
                      <div>
                        <p className="text-muted-foreground">Mood</p>
                        <p className="font-medium">{item.mood}</p>
                      </div>
                    )}
                    {item.bpm && (
                      <div>
                        <p className="text-muted-foreground">BPM</p>
                        <p className="font-medium">{item.bpm}</p>
                      </div>
                    )}
                    {item.key && (
                      <div>
                        <p className="text-muted-foreground">Key</p>
                        <p className="font-medium">{item.key}</p>
                      </div>
                    )}
                  </div>

                  {/* Audio Visualizer */}
                  {item.status === 'completed' && item.resultUrl && (
                    <AudioVisualizer 
                      audioUrl={item.resultUrl} 
                      isPlaying={playingId === item.id}
                      showMetrics={true}
                      bands={16}
                      height={150}
                    />
                  )}

                  {/* Community Rating Widget */}
                  {item.status === 'completed' && (
                    <GenerationRatingWidget generationId={item.id} />
                  )}

                  {/* Audio Player & Actions */}
                  {item.status === 'completed' && item.resultUrl && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const audio = new Audio(item.resultUrl!);
                          if (playingId === item.id) {
                            audio.pause();
                            setPlayingId(null);
                          } else {
                            audio.play();
                            setPlayingId(item.id);
                            audio.onended = () => setPlayingId(null);
                          }
                        }}
                      >
                        {playingId === item.id ? (
                          <Pause className="h-4 w-4 mr-2" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        {playingId === item.id ? 'Pause' : 'Play'}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReplay(item)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Replay
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemix(item)}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Remix
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(item.resultUrl!, `generation-${item.id}.mp3`)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      
                      {!item.stemsUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSeparateStems(item.id)}
                        >
                          <Music className="h-4 w-4 mr-2" />
                          Separate Stems
                        </Button>
                      )}
                      
                      {(item.stemsUrl && typeof item.stemsUrl === 'string' && item.stemsUrl !== '[]') ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleImportToDAW(item)}
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Import to DAW
                        </Button>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Stats Card */}
        {historyQuery.data && historyQuery.data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Your Creative Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold">{historyQuery.data.length}</p>
                  <p className="text-sm text-muted-foreground">Total Generations</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {historyQuery.data.filter(i => i.status === 'completed').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {historyQuery.data.filter(i => i.isFavorite).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Favorites</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {Math.round(
                      (historyQuery.data
                        .filter(i => i.duration)
                        .reduce((sum, i) => sum + (Number(i.duration) || 0), 0) / 60)
                    )}m
                  </p>
                  <p className="text-sm text-muted-foreground">Total Duration</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

