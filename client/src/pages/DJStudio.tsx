import { useState } from "react";
import DJTrackUploader from "@/components/dj/DJTrackUploader";
import DJTrackLibrary from "@/components/dj/DJTrackLibrary";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Music2, 
  Upload, 
  Play, 
  Pause,
  SkipBack,
  SkipForward,
  Download,
  Sparkles,
  Library,
  Settings2
} from "lucide-react";

/**
 * DJ Studio - Level-5 Autonomous DJ Set Generator
 * 
 * Features:
 * - Track upload and library management
 * - Automatic track analysis (BPM, key, energy curve, segments)
 * - Stem separation for advanced transitions
 * - AI-powered set planning with energy arc templates
 * - Autonomous mixing with Extend, Mashup, Cover, Remix capabilities
 * - Real-time preview and cue sheet generation
 */
export default function DJStudio() {
  const [activeTab, setActiveTab] = useState("library");
  const [tracks, setTracks] = useState<any[]>([]); // Will be typed properly with tRPC
  const [selectedTrackIds, setSelectedTrackIds] = useState<number[]>([]);

  const handleUploadComplete = (trackIds: number[]) => {
    // TODO: Fetch uploaded tracks from backend
    console.log("Uploaded track IDs:", trackIds);
  };

  const handleAnalyze = (trackIds: number[]) => {
    // TODO: Trigger analysis via tRPC
    console.log("Analyze tracks:", trackIds);
  };

  const handleSeparateStems = (trackIds: number[]) => {
    // TODO: Trigger stem separation via tRPC
    console.log("Separate stems:", trackIds);
  };

  const handleDelete = (trackIds: number[]) => {
    // TODO: Delete tracks via tRPC
    console.log("Delete tracks:", trackIds);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              DJ Studio
            </h1>
            <p className="text-muted-foreground mt-1">
              Level-5 Autonomous DJ Set Generator
            </p>
          </div>
          <Button className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            <Sparkles className="h-4 w-4" />
            Generate Set
          </Button>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0">
            <TabsTrigger 
              value="library" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-6"
            >
              <Library className="h-4 w-4 mr-2" />
              Library
            </TabsTrigger>
            <TabsTrigger 
              value="generator" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-6"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generator
            </TabsTrigger>
            <TabsTrigger 
              value="player" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-6"
            >
              <Play className="h-4 w-4 mr-2" />
              Player
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-6"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Library Tab */}
          <TabsContent value="library" className="flex-1 mt-6">
            <div className="grid gap-6">
              {/* Upload Section */}
              <DJTrackUploader onUploadComplete={handleUploadComplete} />

              {/* Track Library */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Your Library</h2>
                <DJTrackLibrary
                  tracks={tracks}
                  selectedTrackIds={selectedTrackIds}
                  onSelectionChange={setSelectedTrackIds}
                  onAnalyze={handleAnalyze}
                  onSeparateStems={handleSeparateStems}
                  onDelete={handleDelete}
                />
              </div>
            </div>
          </TabsContent>

          {/* Generator Tab */}
          <TabsContent value="generator" className="flex-1 mt-6">
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Set Generator</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Upload tracks to your library first, then generate autonomous DJ sets with AI-powered transitions
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Player Tab */}
          <TabsContent value="player" className="flex-1 mt-6">
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                  <Play className="h-10 w-10 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">DJ Set Player</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Generate your first DJ set to preview it here with waveform visualization and cue points
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="flex-1 mt-6">
            <Card className="p-8">
              <h3 className="text-lg font-semibold mb-4">Analysis Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-analyze on upload</p>
                    <p className="text-sm text-muted-foreground">Automatically analyze BPM, key, and energy when tracks are uploaded</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Enable
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-separate stems</p>
                    <p className="text-sm text-muted-foreground">Automatically separate vocals, drums, bass, and other stems</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Enable
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
