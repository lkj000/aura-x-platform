import React, { useState, useEffect } from 'react';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { AudioEngine } from '@/services/AudioEngine';
import Layout from '@/components/Layout';
import PianoRoll from '@/components/daw/PianoRoll';
import Mixer from '@/components/daw/Mixer';
import Timeline from '@/components/daw/Timeline';
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
  
  // Load sample instruments on mount
  useEffect(() => {
    const loadSamples = async () => {
      // TODO: Load actual Amapiano samples
      // For now, using Tone.js built-in samples as placeholders
      await AudioEngine.loadInstrument('piano', {
        'C4': 'https://tonejs.github.io/audio/salamander/C4.mp3',
        'D4': 'https://tonejs.github.io/audio/salamander/D4.mp3',
        'E4': 'https://tonejs.github.io/audio/salamander/E4.mp3',
      });
    };
    loadSamples();
  }, []);

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
                onClick={togglePlay}
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
            <Button size="sm" className="gap-2 bg-gradient-to-r from-primary to-secondary text-white border-0">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Main Workspace */}
        <ResizablePanelGroup direction="vertical" className="flex-1 rounded-lg border border-border overflow-hidden shadow-xl bg-card/30 backdrop-blur-sm">
          
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
                <Timeline />
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
            </Tabs>
          </ResizablePanel>

        </ResizablePanelGroup>
      </div>
    </Layout>
  );
}
