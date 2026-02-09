import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Pause, Download, Trash2, RefreshCw } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface BatchGeneration {
  id: number;
  prompt: string;
  tempo: number;
  key: string;
  style: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  audioUrl?: string;
  createdAt: Date;
}

export default function BatchGenerationDashboard() {
  const [batchGenerations, setBatchGenerations] = useState<BatchGeneration[]>([]);
  const queueQuery = trpc.queue.getUserQueue.useQuery(undefined, {
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'processing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      default:
        return 'Queued';
    }
  };

  const handleDownload = (audioUrl: string, prompt: string) => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `${prompt.substring(0, 30)}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  };

  const handleRetry = (id: number) => {
    toast.info('Retrying generation...');
    // TODO: Implement retry logic
  };

  const handleDelete = (id: number) => {
    setBatchGenerations(prev => prev.filter(gen => gen.id !== id));
    toast.success('Generation removed from dashboard');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Batch Generation Dashboard</span>
          <Badge variant="outline" className="ml-2">
            {queueQuery.data?.length || 0} in queue
          </Badge>
        </CardTitle>
        <CardDescription>
          Monitor progress for all your generation requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {queueQuery.data && queueQuery.data.length > 0 ? (
            <div className="space-y-4">
              {queueQuery.data.map((gen: any) => (
                <Card key={gen.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getStatusColor(gen.status)}>
                          {getStatusText(gen.status)}
                        </Badge>
                        {gen.queuePosition && (
                          <Badge variant="outline">
                            Position: {gen.queuePosition}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium line-clamp-2">{gen.prompt}</p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{gen.tempo} BPM</span>
                        <span>{gen.key}</span>
                        <span>{gen.style}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {gen.status === 'completed' && gen.audioUrl && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              const audio = new Audio(gen.audioUrl);
                              audio.play();
                            }}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDownload(gen.audioUrl, gen.prompt)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {gen.status === 'failed' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRetry(gen.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(gen.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {(gen.status === 'processing' || gen.status === 'pending') && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {gen.status === 'processing' 
                            ? '🎵 Generating Audio...' 
                            : '⏳ Waiting in queue...'}
                        </span>
                        <span>
                          {gen.estimatedWaitTime 
                            ? `~${Math.ceil(gen.estimatedWaitTime / 60)} min` 
                            : 'Calculating...'}
                        </span>
                      </div>
                      <Progress value={gen.progress || 0} className="h-2" />
                    </div>
                  )}

                  {gen.status === 'failed' && gen.error && (
                    <p className="text-xs text-red-500 mt-2">{gen.error}</p>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="text-muted-foreground mb-4">
                <Play className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-lg font-medium">No generations in progress</p>
                <p className="text-sm mt-1">
                  Start generating tracks to see them here
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
