import React, { useState, useEffect } from 'react';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useInterval } from '@/hooks/useInterval';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { AudioEngine } from '@/services/AudioEngine';
import Layout from '@/components/Layout';
import PianoRoll from '@/components/daw/PianoRoll';
import Mixer from '@/components/daw/Mixer';
import TimelineV2 from '@/components/daw/TimelineV2';
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  Save, 
  Download,
  Share2,
  Settings2
} from 'lucide-react';
import InstrumentSelector from '@/components/daw/InstrumentSelector';
import CulturalInspector from '@/components/daw/CulturalInspector';
import SampleBrowser from '@/components/SampleBrowser';
import AudioEffectsChain, { type Effect } from '@/components/AudioEffectsChain';
import GenerationHistory from '@/components/GenerationHistory';
import { ExportDialog } from '@/components/ExportDialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { History, Library } from 'lucide-react';

export default function Home() {
  const { 
    isPlaying, 
    togglePlay, 
    stop, 
    tempo, 
    setTempo: setEngineTempo,
    currentPosition 
  } = useAudioEngine();
  
  const [activeView, setActiveView] = useState('timeline');
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(1); // Default to project 1
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSampleBrowser, setShowSampleBrowser] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [trackEffects, setTrackEffects] = useState<Record<number, Effect[]>>({});
  const [masterEffects, setMasterEffects] = useState<Effect[]>([]);
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  // Query all tracks and clips for playback
  const tracksQuery = trpc.tracks.list.useQuery({ projectId: currentProjectId || 1 });
  const [allClips, setAllClips] = useState<any[]>([]);
  
  // Load clips when tracks change
  useEffect(() => {
    if (!tracksQuery.data) return;
    
    const loadAllClips = async () => {
      const clips: any[] = [];
      for (const track of tracksQuery.data) {
        const trackClips = await trpc.audioClips.list.useQuery({ trackId: track.id }).refetch();
        if (trackClips.data) {
          clips.push(...trackClips.data.map(clip => ({
            ...clip,
            trackId: track.id,
            gain: clip.gain || 1.0,
          })));
        }
      }
      setAllClips(clips);
    };
    
    loadAllClips();
  }, [tracksQuery.data]);
  
  // Custom play handler that uses AudioEngine.playTimeline()
  const handlePlay = async () => {
    if (isPlaying) {
      stop();
    } else {
      try {
        await AudioEngine.playTimeline(allClips, currentPosition);
      } catch (error) {
        console.error('[Home] Playback failed:', error);
        toast.error('Playback failed');
      }
    }
  };

  // Load real samples from media library
  const samplesQuery = trpc.mediaLibrary.list.useQuery({ type: 'audio' });
  const samples = samplesQuery.data || [];

  // Mock data for Generation History (replace with actual tRPC query)
  const mockHistory = [
    {
      id: '1',
      timestamp: new Date(),
      params: {
        seed: 42,
        temperature: 0.8,
        topK: 50,
        topP: 0.95,
        cfgScale: 7.5,
        steps: 50,
        prompt: 'Amapiano log drum pattern',
        subgenre: 'Private School',
        mood: 'energetic',
      },
      audioUrl: '/generated/track-1.mp3',
      duration: 180,
      status: 'completed' as const,
      isFavorite: true,
      modelVersion: 'v1.0.0',
    },
  ];

  const handleRegenerate = (params: any) => {
    console.log('Regenerating with params:', params);
    toast.success('Starting regeneration...');
  };

  const handleSampleSelect = (sample: any) => {
    console.log('Sample selected:', sample);
    toast.info(`Selected: ${sample.name}`);
  };

  const handleSampleDragStart = (sample: any) => {
    console.log('Dragging sample:', sample);
  };

  // Auto-save functionality
  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => {
      setHasUnsavedChanges(false);
      setIsSaving(false);
    },
    onError: (error) => {
      setIsSaving(false);
      console.error('[Auto-save] Failed:', error);
    },
  });

  // Auto-save every 30 seconds if there are unsaved changes
  useInterval(
    () => {
      if (hasUnsavedChanges && currentProjectId && !isSaving) {
        setIsSaving(true);
        updateProject.mutate({
          id: currentProjectId,
          tempo,
        });
      }
    },
    hasUnsavedChanges ? 30000 : null
  );

  // Mark as having unsaved changes when tempo changes
  useEffect(() => {
    if (currentProjectId) {
      setHasUnsavedChanges(true);
    }
  }, [tempo, currentProjectId]);
  
  // Audio samples will be loaded dynamically when clips are added to timeline
  // No need to preload placeholder samples

  return (
    <Layout>
      <div className="flex flex-col h-full gap-4">
        {/* Top Transport Bar */}
        <div className="h-14 bg-card border border-border rounded-lg flex items-center justify-between px-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border border-border">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button 
                size="icon" 
                className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handlePlay}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={stop}>
                <Square className="h-4 w-4 fill-current" />
              </Button>
            </div>

            <div className="flex items-center gap-4 px-4 border-l border-r border-border h-8">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground font-mono uppercase">Tempo</span>
                <span className="text-lg font-bold font-mono leading-none text-primary">{tempo}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground font-mono uppercase">Key</span>
                <span className="text-lg font-bold font-mono leading-none text-secondary">F min</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground font-mono uppercase">Time</span>
                <span className="text-lg font-bold font-mono leading-none">00:00:00</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button 
              size="sm" 
              className="gap-2 bg-gradient-to-r from-primary to-secondary text-white border-0"
              onClick={() => setShowExportDialog(true)}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Main Workspace with Sample Browser */}
        <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border border-border overflow-hidden shadow-xl bg-card/30 backdrop-blur-sm">
          
          {/* Left Sidebar: Sample Browser */}
          {showSampleBrowser && (
            <>
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                <div className="h-full">
                  <SampleBrowser
                    samples={samples as any}
                    onSampleSelect={handleSampleSelect}
                    onSampleDragStart={handleSampleDragStart}
                    onToggleFavorite={(id) => console.log('Toggle favorite:', id)}
                  />
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          {/* Main DAW Area */}
          <ResizablePanel defaultSize={showSampleBrowser ? 80 : 100}>
            <ResizablePanelGroup direction="vertical" className="h-full">
          
          {/* Top Panel: Timeline / Arrangement */}
          <ResizablePanel defaultSize={60} minSize={30}>
            <div className="h-full flex flex-col">
              <div className="h-10 border-b border-border bg-muted/30 flex items-center px-4 justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-muted-foreground">ARRANGEMENT</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <TimelineV2 
                  projectId={currentProjectId || 1}
                  isPlaying={isPlaying}
                  currentTime={currentPosition}
                  onTimeChange={(time) => {
                    // Seek to new position
                    AudioEngine.setPosition(time);
                  }}
                />
              </div>
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Bottom Panel: Piano Roll / Mixer */}
          <ResizablePanel defaultSize={40} minSize={20}>
            <Tabs defaultValue="pianoroll" className="h-full flex flex-col">
              <div className="border-b border-border bg-muted/30 px-4">
                <TabsList className="h-10 bg-transparent p-0">
                  <TabsTrigger 
                    value="pianoroll" 
                    className="data-[state=active]:bg-background data-[state=active]:border-t-2 data-[state=active]:border-primary rounded-none h-full px-4"
                  >
                    Piano Roll
                  </TabsTrigger>
                  <TabsTrigger 
                    value="mixer" 
                    className="data-[state=active]:bg-background data-[state=active]:border-t-2 data-[state=active]:border-primary rounded-none h-full px-4"
                  >
                    Mixer
                  </TabsTrigger>
                  <TabsTrigger 
                    value="instruments" 
                    className="data-[state=active]:bg-background data-[state=active]:border-t-2 data-[state=active]:border-primary rounded-none h-full px-4"
                  >
                    Instruments
                  </TabsTrigger>
                  <TabsTrigger 
                    value="inspector" 
                    className="data-[state=active]:bg-background data-[state=active]:border-t-2 data-[state=active]:border-primary rounded-none h-full px-4"
                  >
                    Inspector
                  </TabsTrigger>
                  <TabsTrigger 
                    value="effects" 
                    className="data-[state=active]:bg-background data-[state=active]:border-t-2 data-[state=active]:border-primary rounded-none h-full px-4"
                  >
                    Effects
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="pianoroll" className="flex-1 m-0 p-0 overflow-hidden">
                <PianoRoll />
              </TabsContent>
              
              <TabsContent value="mixer" className="flex-1 m-0 p-4 overflow-hidden bg-background/50">
                <Mixer />
              </TabsContent>

              <TabsContent value="instruments" className="flex-1 m-0 p-0 overflow-hidden bg-background/50">
                <InstrumentSelector />
              </TabsContent>

              <TabsContent value="inspector" className="flex-1 m-0 p-0 overflow-hidden bg-background/50">
                <CulturalInspector />
              </TabsContent>

              <TabsContent value="effects" className="flex-1 m-0 p-4 overflow-auto bg-background/50">
                <div className="space-y-4">
                  <AudioEffectsChain
                    isMaster
                    effects={masterEffects}
                    onChange={setMasterEffects}
                  />
                  {/* Track-specific effects would go here based on selected track */}
                </div>
              </TabsContent>
            </Tabs>
          </ResizablePanel>

            </ResizablePanelGroup>
          </ResizablePanel>

        </ResizablePanelGroup>

        {/* Generation History Drawer */}
        <Sheet open={showHistory} onOpenChange={setShowHistory}>
          <SheetContent side="right" className="w-[600px] sm:w-[700px] p-0">
            <SheetHeader className="p-6 pb-4">
              <SheetTitle>Generation History</SheetTitle>
            </SheetHeader>
            <div className="px-6 pb-6 h-[calc(100vh-80px)] overflow-hidden">
              <GenerationHistory
                history={mockHistory}
                onRegenerate={handleRegenerate}
                onPlay={(item) => console.log('Play:', item)}
                onDownload={(item) => console.log('Download:', item)}
                onDelete={(id) => console.log('Delete:', id)}
                onToggleFavorite={(id) => console.log('Toggle favorite:', id)}
                maxHeight="calc(100vh - 150px)"
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-2">
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={() => setShowSampleBrowser(!showSampleBrowser)}
          >
            <Library className="h-5 w-5" />
          </Button>
        </div>

        {/* Export Dialog */}
        <ExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          clips={allClips.map(clip => ({
            id: clip.id,
            trackId: clip.trackId,
            audioUrl: clip.audioUrl,
            startTime: clip.startTime,
            duration: clip.duration,
            volume: clip.gain || 1.0,
            offset: clip.offset || 0,
          }))}
          projectName="My Project"
        />
      </div>
    </Layout>
  );
}
