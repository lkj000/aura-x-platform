import React, { useState, useEffect } from 'react';
import QuickTip, { type Tip } from '@/components/QuickTip';
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

const SA_LANGUAGES = [
  { value: 'zulu', label: 'Zulu (55% swing)' },
  { value: 'xhosa', label: 'Xhosa (52% swing, clicks)' },
  { value: 'tsonga', label: 'Tsonga (58% swing)' },
  { value: 'tswana', label: 'Tswana (54% swing)' },
  { value: 'sotho_north', label: 'Sotho North (53% swing)' },
  { value: 'sotho_south', label: 'Sotho South (53% swing)' },
  { value: 'english_sa', label: 'English SA (50% swing)' },
  { value: 'afrikaans', label: 'Afrikaans (48% swing)' },
  { value: 'venda', label: 'Venda (56% swing, tonal)' },
  { value: 'ndebele', label: 'Ndebele (54% swing, clicks)' },
  { value: 'swazi', label: 'Swazi (55% swing)' },
];

const SA_REGIONS = [
  { value: 'gauteng_jhb', label: 'Gauteng JHB (58.3% - THE ORIGINAL)' },
  { value: 'gauteng_pretoria', label: 'Gauteng Pretoria (57%)' },
  { value: 'kzn_durban', label: 'KZN Durban (52% - Gqom)' },
  { value: 'western_cape', label: 'Western Cape (50% - House)' },
  { value: 'eastern_cape', label: 'Eastern Cape (55.5%)' },
  { value: 'free_state', label: 'Free State (56%)' },
  { value: 'limpopo', label: 'Limpopo (60% - Traditional)' },
  { value: 'mpumalanga', label: 'Mpumalanga (59%)' },
  { value: 'north_west', label: 'North West (56.5%)' },
  { value: 'northern_cape', label: 'Northern Cape (54%)' },
];

const GASP_TYPES = [
  { value: 'classic', label: 'Classic Gasp (Beat 1)' },
  { value: 'double', label: 'Double Gasp (Sgija)' },
  { value: 'half_bar', label: 'Half-Bar Gasp (Soulful)' },
  { value: 'full_bar', label: 'Full-Bar Gasp (Experimental)' },
  { value: 'stutter', label: 'Stutter Gasp (Glitchy)' },
  { value: 'reverse', label: 'Reverse Gasp (Minimal)' },
  { value: 'progressive', label: 'Progressive Gasp (Private School)' },
  { value: 'selective', label: 'Selective Gasp (Jazz)' },
  { value: 'echo', label: 'Echo Gasp (Spiritual)' },
  { value: 'buildup', label: 'Build-Up Gasp (Festival)' },
];

const GASP_INTENSITIES = [
  { value: 'full', label: 'Full (100%)' },
  { value: 'heavy', label: 'Heavy (75%)' },
  { value: 'moderate', label: 'Moderate (50%)' },
  { value: 'light', label: 'Light (25%)' },
  { value: 'subtle', label: 'Subtle (10%)' },
];

const AI_STUDIO_TIPS: Tip[] = [
  {
    id: 'welcome',
    title: 'Welcome to AI Studio!',
    description: 'Generate professional Amapiano tracks with our AI-powered music engine. Start with Simple Mode for quick generations, or switch to Custom Mode for full creative control.',
  },
  {
    id: 'simple-mode',
    title: 'Simple Mode',
    description: 'Describe your track in natural language (e.g., "uplifting Amapiano with soulful piano and smooth bassline"). Our AI will handle the rest!',
  },
  {
    id: 'cultural-authenticity',
    title: 'Cultural Authenticity',
    description: 'Use Custom Mode to access our unique South African cultural authenticity system with 11 languages, 10 regional swing profiles, and 10 Amapiano gasp variations.',
  },
  {
    id: 'stem-separation',
    title: 'Stem Separation & DAW Import',
    description: 'After generation, separate your track into stems (drums, bass, vocals, other) and import directly into the DAW for further editing.',
  },
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
  const [selectedLanguage, setSelectedLanguage] = useState('zulu');
  const [selectedRegion, setSelectedRegion] = useState('gauteng_jhb');
  const [selectedGaspType, setSelectedGaspType] = useState('classic');
  const [gaspIntensity, setGaspIntensity] = useState('moderate');
  const [authenticityScore, setAuthenticityScore] = useState<number | null>(null);
  const [authenticityRecommendations, setAuthenticityRecommendations] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeGenerationId, setActiveGenerationId] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);

  const generateMusic = trpc.aiStudio.generateMusic.useMutation();
  const generateLyrics = trpc.aiStudio.generateLyrics.useMutation();
  
  // Fetch user queue stats
  const { data: userStats } = trpc.queue.getUserStats.useQuery();
  
  // Poll queue position during generation
  const { data: queuePos } = trpc.queue.getQueuePosition.useQuery(
    { generationId: activeGenerationId! },
    { 
      enabled: !!activeGenerationId && isGenerating,
      refetchInterval: 3000, // Poll every 3 seconds
    }
  );
  
  // Update queue position when data changes
  useEffect(() => {
    if (queuePos !== undefined) {
      setQueuePosition(queuePos);
    }
  }, [queuePos]);
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

      // Start polling for workflow status
      if (result.workflowId && result.generationId) {
        setActiveJobId(result.workflowId);
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
    <>
      <QuickTip 
        tips={AI_STUDIO_TIPS} 
        storageKey="ai-studio-tips-v1" 
        autoShow={true} 
        sequence={true} 
      />
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

                {/* Queue Position Indicator */}
                {isGenerating && queuePosition !== null && queuePosition > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">
                        Queue Position: #{queuePosition}
                      </span>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">
                      Your generation is queued. You have {userStats?.concurrentJobs || 0}/{userStats?.maxConcurrentJobs || 3} concurrent jobs running.
                    </p>
                  </div>
                )}

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

                {/* Cultural Authenticity Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle>Cultural Authenticity</CardTitle>
                    <CardDescription>
                      Fine-tune linguistic, regional, and rhythmic characteristics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="language">Language Influence</Label>
                      <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                        <SelectTrigger id="language" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SA_LANGUAGES.map(lang => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="region">Regional Swing</Label>
                      <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                        <SelectTrigger id="region" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SA_REGIONS.map(region => (
                            <SelectItem key={region.value} value={region.value}>
                              {region.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="gasp">Gasp Type</Label>
                      <Select value={selectedGaspType} onValueChange={setSelectedGaspType}>
                        <SelectTrigger id="gasp" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GASP_TYPES.map(gasp => (
                            <SelectItem key={gasp.value} value={gasp.value}>
                              {gasp.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="intensity">Gasp Intensity</Label>
                      <Select value={gaspIntensity} onValueChange={setGaspIntensity}>
                        <SelectTrigger id="intensity" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GASP_INTENSITIES.map(intensity => (
                            <SelectItem key={intensity.value} value={intensity.value}>
                              {intensity.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {authenticityScore !== null && (
                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Authenticity Score</span>
                          <span className="text-2xl font-bold text-primary">{authenticityScore.toFixed(1)}%</span>
                        </div>
                        {authenticityRecommendations.length > 0 && (
                          <div className="mt-3 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Recommendations:</p>
                            {authenticityRecommendations.map((rec, i) => (
                              <p key={i} className="text-xs text-muted-foreground">• {rec}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Queue Position Indicator */}
                {isGenerating && queuePosition !== null && queuePosition > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">
                        Queue Position: #{queuePosition}
                      </span>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">
                      Your generation is queued. You have {userStats?.concurrentJobs || 0}/{userStats?.maxConcurrentJobs || 3} concurrent jobs running.
                    </p>
                  </div>
                )}

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
    </>
  );
}
