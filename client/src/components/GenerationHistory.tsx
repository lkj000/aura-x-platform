import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  History,
  Play,
  Download,
  RefreshCw,
  Copy,
  Trash2,
  Clock,
  Settings2,
  Check,
  ChevronDown,
  ChevronUp,
  Star,
  StarOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface GenerationParams {
  seed: number;
  temperature: number;
  topK: number;
  topP: number;
  cfgScale: number;
  steps: number;
  prompt?: string;
  subgenre?: string;
  mood?: string;
}

interface GenerationHistoryItem {
  id: string;
  timestamp: Date;
  params: GenerationParams;
  audioUrl?: string;
  duration?: number;
  status: 'completed' | 'failed' | 'processing';
  isFavorite: boolean;
  modelVersion?: string;
}

interface GenerationHistoryProps {
  history: GenerationHistoryItem[];
  onRegenerate: (params: GenerationParams) => void;
  onPlay?: (item: GenerationHistoryItem) => void;
  onDownload?: (item: GenerationHistoryItem) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  maxHeight?: string;
}

export default function GenerationHistory({
  history,
  onRegenerate,
  onPlay,
  onDownload,
  onDelete,
  onToggleFavorite,
  maxHeight = '600px',
}: GenerationHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyParams = (item: GenerationHistoryItem) => {
    const paramsText = JSON.stringify(item.params, null, 2);
    navigator.clipboard.writeText(paramsText);
    setCopiedId(item.id);
    toast.success('Parameters copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerate = (item: GenerationHistoryItem) => {
    onRegenerate(item.params);
    toast.success('Regenerating with exact same parameters');
  };

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const sortedHistory = [...history].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Generation History
            </CardTitle>
            <CardDescription>
              {history.length} generations • Click to reproduce
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/50">
            Reproducible
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea style={{ maxHeight }}>
          {sortedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <History className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-sm">No generation history yet</p>
              <p className="text-xs">Your generations will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedHistory.map((item) => (
                <HistoryItem
                  key={item.id}
                  item={item}
                  isExpanded={expandedId === item.id}
                  isCopied={copiedId === item.id}
                  onToggleExpand={() => toggleExpanded(item.id)}
                  onRegenerate={() => handleRegenerate(item)}
                  onCopyParams={() => handleCopyParams(item)}
                  onPlay={() => onPlay?.(item)}
                  onDownload={() => onDownload?.(item)}
                  onDelete={() => onDelete?.(item.id)}
                  onToggleFavorite={() => onToggleFavorite?.(item.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function HistoryItem({
  item,
  isExpanded,
  isCopied,
  onToggleExpand,
  onRegenerate,
  onCopyParams,
  onPlay,
  onDownload,
  onDelete,
  onToggleFavorite,
}: {
  item: GenerationHistoryItem;
  isExpanded: boolean;
  isCopied: boolean;
  onToggleExpand: () => void;
  onRegenerate: () => void;
  onCopyParams: () => void;
  onPlay: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const getStatusColor = (status: GenerationHistoryItem['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/50';
      case 'failed':
        return 'bg-red-500/10 text-red-500 border-red-500/50';
      case 'processing':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50';
    }
  };

  return (
    <div
      className={cn(
        'border border-border rounded-lg overflow-hidden transition-all',
        isExpanded && 'border-primary/50 shadow-lg'
      )}
    >
      {/* Header */}
      <div className="p-3 bg-card hover:bg-muted/30 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={getStatusColor(item.status)}>
                {item.status}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(item.timestamp, { addSuffix: true })}
              </span>
              {item.isFavorite && (
                <Star className="h-3 w-3 fill-current text-yellow-500" />
              )}
            </div>
            
            {item.params.prompt && (
              <p className="text-sm font-medium truncate mb-1">{item.params.prompt}</p>
            )}
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="font-mono">Seed: {item.params.seed}</span>
              {item.params.subgenre && (
                <Badge variant="secondary" className="text-xs py-0">
                  {item.params.subgenre}
                </Badge>
              )}
              {item.params.mood && (
                <Badge variant="outline" className="text-xs py-0">
                  {item.params.mood}
                </Badge>
              )}
              {item.duration && <span>• {item.duration}s</span>}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onToggleFavorite}
                >
                  {item.isFavorite ? (
                    <Star className="h-4 w-4 fill-current text-yellow-500" />
                  ) : (
                    <StarOff className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onToggleExpand}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isExpanded ? 'Hide details' : 'Show details'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <>
          <Separator />
          <div className="p-3 bg-muted/20 space-y-3">
            {/* Parameters Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Temperature:</span>
                <span className="font-mono">{item.params.temperature}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CFG Scale:</span>
                <span className="font-mono">{item.params.cfgScale}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Top-K:</span>
                <span className="font-mono">{item.params.topK}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Top-P:</span>
                <span className="font-mono">{item.params.topP}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Steps:</span>
                <span className="font-mono">{item.params.steps}</span>
              </div>
              {item.modelVersion && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model:</span>
                  <span className="font-mono text-xs">{item.modelVersion}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={onRegenerate}
                className="flex-1 bg-gradient-to-r from-primary to-secondary"
                disabled={item.status === 'processing'}
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Regenerate
              </Button>

              {item.status === 'completed' && item.audioUrl && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={onPlay}>
                        <Play className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Play audio</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={onDownload}>
                        <Download className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download</TooltipContent>
                  </Tooltip>
                </>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={onCopyParams}>
                    {isCopied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy parameters</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDelete}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </div>

            {/* Full Parameters JSON */}
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground mb-2">
                View full parameters JSON
              </summary>
              <pre className="bg-background/50 p-2 rounded border border-border overflow-x-auto">
                {JSON.stringify(item.params, null, 2)}
              </pre>
            </details>
          </div>
        </>
      )}
    </div>
  );
}
