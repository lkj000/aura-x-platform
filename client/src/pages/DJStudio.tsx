import { useState } from "react";
import DJTrackUploader from "@/components/dj/DJTrackUploader";
import DJTrackLibrary from "@/components/dj/DJTrackLibrary";
import DJSetGenerator from "@/components/dj/DJSetGenerator";
import DJSetPlayer from "@/components/dj/DJSetPlayer";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
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
  Settings2,
  Loader2
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
  const [selectedTrackIds, setSelectedTrackIds] = useState<number[]>([]);
  
  // Fetch tracks from backend
  const { data: tracks = [], refetch: refetchTracks } = trpc.djStudio.getTracks.useQuery();
  
  // Mutations
  const analyzeMutation = trpc.djStudio.analyzeTrack.useMutation();
  const stemsMutation = trpc.djStudio.separateStems.useMutation();
  const deleteMutation = trpc.djStudio.deleteTrack.useMutation();
  const generateSetMutation = trpc.djStudio.generateSet.useMutation();
  
  // Fetch generated sets for Player tab
  const { data: generatedSets = [] } = trpc.djStudio.getPerformancePlans.useQuery();

  const handleUploadComplete = async (trackIds: number[]) => {
    console.log("Uploaded track IDs:", trackIds);
    // Refresh track library
    await refetchTracks();
    toast.success(`${trackIds.length} track(s) uploaded successfully`);
  };

  const handleAnalyze = async (trackIds: number[]) => {
    try {
      for (const trackId of trackIds) {
        await analyzeMutation.mutateAsync({ trackId });
      }
      toast.success(`Analysis started for ${trackIds.length} track(s)`);
      await refetchTracks();
    } catch (error) {
      toast.error("Failed to start analysis");
    }
  };

  const handleSeparateStems = async (trackIds: number[]) => {
    try {
      for (const trackId of trackIds) {
        await stemsMutation.mutateAsync({ trackId });
      }
      toast.success(`Stem separation started for ${trackIds.length} track(s)`);
      await refetchTracks();
    } catch (error) {
      toast.error("Failed to start stem separation");
    }
  };

  const handleDelete = async (trackIds: number[]) => {
    try {
      for (const trackId of trackIds) {
        await deleteMutation.mutateAsync({ trackId });
      }
      toast.success(`${trackIds.length} track(s) deleted`);
      await refetchTracks();
      setSelectedTrackIds([]);
    } catch (error) {
      toast.error("Failed to delete tracks");
    }
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
            {tracks.length === 0 ? (
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
            ) : (
              <DJSetGenerator
                selectedTrackIds={selectedTrackIds}
                onGenerate={async (config) => {
                  try {
                    await generateSetMutation.mutateAsync({
                      trackIds: selectedTrackIds.length > 0 ? selectedTrackIds : tracks.map(t => t.id),
                      durationTargetSec: config.durationTargetSec,
                      preset: config.preset,
                      riskLevel: config.riskLevel,
                      allowVocalOverlay: config.allowVocalOverlay
                    });
                    toast.success("DJ set generation started! Check back in a few minutes.");
                    setActiveTab("player");
                  } catch (error) {
                    toast.error("Failed to generate set");
                    console.error(error);
                  }
                }}
              />
            )}
          </TabsContent>

          {/* Player Tab */}
          <TabsContent value="player" className="flex-1 mt-6">
            {generatedSets.length === 0 ? (
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
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Generated Sets</h2>
                  <p className="text-muted-foreground">{generatedSets.length} set{generatedSets.length !== 1 ? 's' : ''} available</p>
                </div>
                {generatedSets.map((set: any) => {
                  // Find the best render (highest quality score)
                  const bestRender = set.renders?.length > 0
                    ? set.renders.reduce((best: any, current: any) => 
                        (current.qualityScore ?? 0) > (best.qualityScore ?? 0) ? current : best
                      )
                    : null;

                  return (
                    <Card key={set.id} className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{set.name || `${set.preset} Set`}</h3>
                          <p className="text-sm text-muted-foreground">
                            {set.preset} • {Math.round(set.durationTargetSec / 60)} minutes • {set.renders?.length || 0} variation{set.renders?.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {bestRender && (
                          <Button size="sm" variant="outline" className="gap-2">
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        )}
                      </div>

                      {bestRender ? (
                        <div className="space-y-4">
                          {/* Render quality info */}
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Quality Score:</span>
                              <span className="ml-2 font-semibold text-primary">
                                {(bestRender.qualityScore * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Transitions:</span>
                              <span className="ml-2 font-semibold">
                                {bestRender.cueSheetData?.length || 0}
                              </span>
                            </div>
                          </div>

                          {/* Render variations */}
                          {set.renders && set.renders.length > 1 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Available Variations:</p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                {set.renders.map((render: any, idx: number) => (
                                  <Button
                                    key={render.id}
                                    variant={render.id === bestRender.id ? "default" : "outline"}
                                    size="sm"
                                    className="text-xs"
                                  >
                                    v{idx + 1} ({(render.qualityScore * 100).toFixed(0)}%)
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Set generation in progress... Check back soon for playback.
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
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
