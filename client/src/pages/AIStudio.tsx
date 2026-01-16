import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { Loader2, Sparkles, Music, Mic, Wand2, Play, Pause, Download, Heart, Share2, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

/**
 * AIStudio - Suno-style AI music generation interface
 * 
 * Features:
 * - Text-to-music generation with genre/style controls
 * - Lyrics input with AI-powered generation
 * - Custom mode with detailed parameters (BPM, key, mood, vocals)
 * - Generation history with playback
 * - Stem separation integration
 * - Direct DAW import
 */

const AMAPIANO_STYLES = [
  'Amapiano',
  'Private School Piano',
  'Bacardi Piano',
  'Soulful Piano',
  'Vocal Piano',
  'Deep House',
  'Afro House',
  'Kwaito',
  'Gqom',
];

const MOODS = [
  'Energetic',
  'Chill',
  'Romantic',
  'Melancholic',
  'Uplifting',
  'Dark',
  'Groovy',
  'Spiritual',
];

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const VOCAL_STYLES = [
  { value: 'none', label: 'Instrumental' },
  { value: 'male', label: 'Male Vocals' },
  { value: 'female', label: 'Female Vocals' },
  { value: 'choir', label: 'Choir' },
];

export default function AIStudio() {
  const [mode, setMode] = useState<'simple' | 'custom'>('simple');
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [title, setTitle] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['Amapiano']);
  const [selectedMood, setSelectedMood] = useState('Energetic');
  const [bpm, setBpm] = useState([112]);
  const [selectedKey, setSelectedKey] = useState('F');
  const [vocalStyle, setVocalStyle] = useState('male');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeGenerationId, setActiveGenerationId] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  const generateMusic = trpc.aiStudio.generateMusic.useMutation();
  const generateLyrics = trpc.aiStudio.generateLyrics.useMutation();
  const checkJobStatus = trpc.aiStudio.checkJobStatus.useQuery(
    { jobId: activeJobId!, generationId: activeGenerationId! },
    { 
      enabled: !!activeJobId && !!activeGenerationId,
      refetchInterval: 5000, // Poll every 5 seconds
    }
  );

  // Update progress and handle completion
  useEffect(() => {
    if (checkJobStatus.data) {
      const status = checkJobStatus.data.status;
      
      if (status === 'completed') {
        setIsGenerating(false);
        setActiveJobId(null);
        setActiveGenerationId(null);
        setProgress(100);
        toast.success('Music generated successfully!');
      } else if (status === 'failed') {
        setIsGenerating(false);
        setActiveJobId(null);
        setActiveGenerationId(null);
        setProgress(0);
        toast.error('Generation failed');
      } else if (status === 'processing') {
        // Simulate progress (real progress would come from Modal)
        setProgress(prev => Math.min(prev + 5, 90));
      }
    }
  }, [checkJobStatus.data]);

  const handleGenerate = async () => {
    if (!prompt && !lyrics) {
      toast.error('Please provide a prompt or lyrics');
      return;
    }

    setIsGenerating(true);

    try {
      const result = await generateMusic.mutateAsync({
        prompt,
        lyrics: lyrics || undefined,
        title: title || undefined,
        style: selectedStyles.join(', '),
        mood: selectedMood,
        bpm: bpm[0],
        key: selectedKey,
        vocalStyle,
        mode,
      });

      // Start polling for job status
      if (result.jobId && result.generationId) {
        setActiveJobId(result.jobId);
        setActiveGenerationId(result.generationId);
        setProgress(10);
        toast.success('Music generation started! Polling for completion...');
      } else {
        toast.success('Music generation started!');
        setIsGenerating(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Generation failed');
      setIsGenerating(false);
    }
  };

  const handleGenerateLyrics = async () => {
    if (!prompt) {
      toast.error('Please provide a prompt for lyrics generation');
      return;
    }

    try {
      const result = await generateLyrics.mutateAsync({
        prompt,
        language: 'zulu', // Default to Zulu for Amapiano
        style: selectedStyles.join(', '),
        mood: selectedMood,
      });

      setLyrics(result.lyrics);
      toast.success('Lyrics generated!');
    } catch (error: any) {
      toast.error(error.message || 'Lyrics generation failed');
    }
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles(prev =>
      prev.includes(style)
        ? prev.filter(s => s !== style)
        : [...prev, style]
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              AI Studio
            </h1>
            <p className="text-muted-foreground mt-2">
              Generate Amapiano tracks with AI - from prompt to production
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Music className="h-4 w-4" />
            View History
          </Button>
        </div>

        {/* Mode Selector */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'simple' | 'custom')} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="simple">Simple Mode</TabsTrigger>
            <TabsTrigger value="custom">Custom Mode</TabsTrigger>
          </TabsList>

          {/* Simple Mode */}
          <TabsContent value="simple" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Describe Your Track</CardTitle>
                <CardDescription>
                  Tell us what kind of Amapiano track you want to create
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="prompt">Prompt</Label>
                  <Textarea
                    id="prompt"
                    placeholder="e.g., A soulful Amapiano track with deep log drums, smooth piano chords, and romantic vocals about love in Johannesburg"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Style Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {AMAPIANO_STYLES.map(style => (
                      <Badge
                        key={style}
                        variant={selectedStyles.includes(style) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleStyle(style)}
                      >
                        {style}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="mood">Mood</Label>
                  <Select value={selectedMood} onValueChange={setSelectedMood}>
                    <SelectTrigger id="mood" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOODS.map(mood => (
                        <SelectItem key={mood} value={mood}>{mood}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isGenerating && progress > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Generating...</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating... {progress > 0 && `${progress}%`}
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-5 w-5" />
                      Generate Track
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Mode */}
          <TabsContent value="custom" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Prompt & Lyrics */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Track Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title (Optional)</Label>
                      <Input
                        id="title"
                        placeholder="My Amapiano Track"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="custom-prompt">Prompt</Label>
                      <Textarea
                        id="custom-prompt"
                        placeholder="Describe the vibe, instruments, and feel of your track..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={3}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="lyrics">Lyrics (Optional)</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleGenerateLyrics}
                          disabled={!prompt || generateLyrics.isPending}
                          className="gap-2"
                        >
                          {generateLyrics.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              Generate Lyrics
                            </>
                          )}
                        </Button>
                      </div>
                      <Textarea
                        id="lyrics"
                        placeholder="Write or generate lyrics in Zulu, English, or any language..."
                        value={lyrics}
                        onChange={(e) => setLyrics(e.target.value)}
                        rows={8}
                        className="font-mono"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Parameters */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Music Parameters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>Style Tags</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {AMAPIANO_STYLES.map(style => (
                          <Badge
                            key={style}
                            variant={selectedStyles.includes(style) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleStyle(style)}
                          >
                            {style}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="custom-mood">Mood</Label>
                      <Select value={selectedMood} onValueChange={setSelectedMood}>
                        <SelectTrigger id="custom-mood" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MOODS.map(mood => (
                            <SelectItem key={mood} value={mood}>{mood}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>BPM</Label>
                        <span className="text-sm font-mono text-muted-foreground">{bpm[0]}</span>
                      </div>
                      <Slider
                        value={bpm}
                        onValueChange={setBpm}
                        min={80}
                        max={140}
                        step={1}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="key">Key</Label>
                      <Select value={selectedKey} onValueChange={setSelectedKey}>
                        <SelectTrigger id="key" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {KEYS.map(key => (
                            <SelectItem key={key} value={key}>{key}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="vocal">Vocal Style</Label>
                      <Select value={vocalStyle} onValueChange={setVocalStyle}>
                        <SelectTrigger id="vocal" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VOCAL_STYLES.map(vocal => (
                            <SelectItem key={vocal.value} value={vocal.value}>
                              {vocal.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {isGenerating && progress > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Generating...</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating... {progress > 0 && `${progress}%`}
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-5 w-5" />
                      Generate Track
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Generation Result Placeholder */}
        {isGenerating && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Generating your track...</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    This usually takes 30-60 seconds
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
