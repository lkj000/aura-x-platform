import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search,
  Play,
  Pause,
  Star,
  StarOff,
  Grid3x3,
  List,
  Music,
  Clock,
  Disc,
  Filter,
  Download,
  MoreVertical,
  Volume2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Sample {
  id: string;
  name: string;
  category: string;
  bpm?: number;
  key?: string;
  duration: number;
  fileUrl: string;
  waveformUrl?: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: Date;
}

interface SampleBrowserProps {
  samples: Sample[];
  onSampleSelect?: (sample: Sample) => void;
  onSampleDragStart?: (sample: Sample) => void;
  onToggleFavorite?: (sampleId: string) => void;
}

export default function SampleBrowser({
  samples,
  onSampleSelect,
  onSampleDragStart,
  onToggleFavorite,
}: SampleBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const [filterBPM, setFilterBPM] = useState<string>('all');
  const [filterKey, setFilterKey] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Extract unique categories, BPMs, and keys from samples
  const categories = ['all', ...Array.from(new Set(samples.map((s) => s.category).filter(Boolean)))];
  const bpms = ['all', ...Array.from(new Set(samples.map((s) => s.bpm?.toString()).filter(Boolean)))];
  const keys = ['all', ...Array.from(new Set(samples.map((s) => s.key).filter((k): k is string => Boolean(k))))];

  // Filter samples based on search and filters
  const filteredSamples = samples.filter((sample) => {
    const matchesSearch =
      sample.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sample.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || sample.category === selectedCategory;
    const matchesBPM = filterBPM === 'all' || sample.bpm?.toString() === filterBPM;
    const matchesKey = filterKey === 'all' || sample.key === filterKey;
    const matchesFavorite = !showFavoritesOnly || sample.isFavorite;

    return matchesSearch && matchesCategory && matchesBPM && matchesKey && matchesFavorite;
  });

  const handlePlayPause = (sample: Sample) => {
    if (playingSampleId === sample.id) {
      audioRef.current?.pause();
      setPlayingSampleId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = sample.fileUrl;
        audioRef.current.play();
        setPlayingSampleId(sample.id);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, sample: Sample) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(sample));
    onSampleDragStart?.(sample);
    toast.info(`Dragging: ${sample.name}`);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    audio.addEventListener('ended', () => {
      setPlayingSampleId(null);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              Sample Library
            </CardTitle>
            <CardDescription>
              {filteredSamples.length} samples available
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showFavoritesOnly ? 'default' : 'outline'}
              size="icon"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Star className={cn('h-4 w-4', showFavoritesOnly && 'fill-current')} />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search samples by name or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterBPM} onValueChange={setFilterBPM}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="BPM" />
              </SelectTrigger>
              <SelectContent>
                {bpms.map((bpm) => (
                  <SelectItem key={bpm} value={bpm || 'unknown'}>
                    {bpm === 'all' ? 'All BPMs' : `${bpm} BPM`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterKey} onValueChange={setFilterKey}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Key" />
              </SelectTrigger>
              <SelectContent>
                {keys.map((key) => (
                  <SelectItem key={key} value={key || 'unknown'}>
                    {key === 'all' ? 'All Keys' : key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchQuery || selectedCategory !== 'all' || filterBPM !== 'all' || filterKey !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setFilterBPM('all');
                  setFilterKey('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Sample Grid/List */}
        <ScrollArea className="flex-1">
          {filteredSamples.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Music className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-sm">No samples found</p>
              <p className="text-xs">Try adjusting your filters</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-1">
              {filteredSamples.map((sample) => (
                <SampleCard
                  key={sample.id}
                  sample={sample}
                  isPlaying={playingSampleId === sample.id}
                  onPlayPause={() => handlePlayPause(sample)}
                  onDragStart={(e) => handleDragStart(e, sample)}
                  onToggleFavorite={() => onToggleFavorite?.(sample.id)}
                  onSelect={() => onSampleSelect?.(sample)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2 p-1">
              {filteredSamples.map((sample) => (
                <SampleListItem
                  key={sample.id}
                  sample={sample}
                  isPlaying={playingSampleId === sample.id}
                  onPlayPause={() => handlePlayPause(sample)}
                  onDragStart={(e) => handleDragStart(e, sample)}
                  onToggleFavorite={() => onToggleFavorite?.(sample.id)}
                  onSelect={() => onSampleSelect?.(sample)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Sample Card Component (Grid View)
function SampleCard({
  sample,
  isPlaying,
  onPlayPause,
  onDragStart,
  onToggleFavorite,
  onSelect,
}: {
  sample: Sample;
  isPlaying: boolean;
  onPlayPause: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onToggleFavorite: () => void;
  onSelect: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      className="group relative bg-card border border-border rounded-lg p-3 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
    >
      {/* Waveform Preview */}
      <div className="h-16 bg-muted/30 rounded-md mb-2 flex items-center justify-center overflow-hidden">
        {sample.waveformUrl ? (
          <img src={sample.waveformUrl} alt="Waveform" className="w-full h-full object-cover" />
        ) : (
          <Volume2 className="h-6 w-6 text-muted-foreground/30" />
        )}
      </div>

      {/* Sample Info */}
      <div className="space-y-1">
        <p className="text-sm font-medium truncate">{sample.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {sample.bpm && (
                  <span className="flex items-center gap-1">
                    <Disc className="h-3 w-3" />
                    {sample.bpm}
                  </span>
                )}
                {sample.key && <Badge variant="outline" className="text-xs py-0">{sample.key}</Badge>}
                <span className="flex items-center gap-1 ml-auto">
                  <Clock className="h-3 w-3" />
                  {Math.floor(sample.duration)}s
                </span>
              </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onPlayPause();
          }}
        >
          {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
        >
          {sample.isFavorite ? (
            <Star className="h-3 w-3 fill-current text-yellow-500" />
          ) : (
            <StarOff className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Category Badge */}
      <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs">
        {sample.category}
      </Badge>
    </div>
  );
}

// Sample List Item Component (List View)
function SampleListItem({
  sample,
  isPlaying,
  onPlayPause,
  onDragStart,
  onToggleFavorite,
  onSelect,
}: {
  sample: Sample;
  isPlaying: boolean;
  onPlayPause: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onToggleFavorite: () => void;
  onSelect: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      className="group flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
    >
      {/* Waveform Thumbnail */}
      <div className="w-20 h-12 bg-muted/30 rounded flex items-center justify-center flex-shrink-0">
        {sample.waveformUrl ? (
          <img src={sample.waveformUrl} alt="Waveform" className="w-full h-full object-cover rounded" />
        ) : (
          <Volume2 className="h-5 w-5 text-muted-foreground/30" />
        )}
      </div>

      {/* Sample Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{sample.name}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <Badge variant="secondary" className="text-xs">{sample.category}</Badge>
          {sample.bpm && (
            <span className="flex items-center gap-1">
              <Disc className="h-3 w-3" />
              {sample.bpm} BPM
            </span>
          )}
          {sample.key && <span>{sample.key}</span>}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {Math.floor(sample.duration)}s
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onPlayPause();
          }}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
        >
          {sample.isFavorite ? (
            <Star className="h-4 w-4 fill-current text-yellow-500" />
          ) : (
            <StarOff className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
