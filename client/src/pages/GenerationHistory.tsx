import { useState } from 'react';
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

export default function GenerationHistory() {
  const { toast } = useToast();
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'favorites' | 'recent'>('all');

  const historyQuery = trpc.generationHistory.list.useQuery({ limit: 100 });
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
                    {item.subgenre && (
                      <div>
                        <p className="text-muted-foreground">Style</p>
                        <p className="font-medium">{item.subgenre}</p>
                      </div>
                    )}
                    {item.mood && (
                      <div>
                        <p className="text-muted-foreground">Mood</p>
                        <p className="font-medium">{item.mood}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">Seed</p>
                      <p className="font-mono text-xs">{item.seed}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Temperature</p>
                      <p className="font-medium">{item.temperature}</p>
                    </div>
                  </div>

                  {/* Audio Player & Actions */}
                  {item.status === 'completed' && item.audioUrl && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const audio = new Audio(item.audioUrl!);
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
                        onClick={() => handleDownload(item.audioUrl!, `generation-${item.id}.mp3`)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
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
                      historyQuery.data
                        .filter(i => i.duration)
                        .reduce((sum, i) => sum + (i.duration || 0), 0) / 60
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
