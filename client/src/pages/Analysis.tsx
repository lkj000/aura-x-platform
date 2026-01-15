import { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  BarChart3, 
  Music, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Info,
  Loader2,
  Upload
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface QualityScore {
  overall_score: number;
  lufs: number;
  peak_db: number;
  dynamic_range: number;
  cultural_score: number;
  spectral_balance: string;
  tempo?: number;
  key?: string;
  recommendations: string[];
}

export default function Analysis() {
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);

  const mediaLibraryQuery = trpc.mediaLibrary.list.useQuery({
    limit: 50,
  });

  const analyzeMutation = trpc.qualityScoring.analyze.useMutation();

  const handleAnalyze = async (trackUrl: string, trackName?: string) => {
    setIsAnalyzing(true);
    
    try {
      // Call quality scoring service via tRPC
      const result = await analyzeMutation.mutateAsync({
        audioUrl: trackUrl,
        trackName: trackName,
      });

      setQualityScore(result);
    } catch (error) {
      console.error('[Analysis] Failed:', error);
      alert('Quality analysis failed. Make sure quality scoring service is running on port 8001.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500">Good</Badge>;
    return <Badge variant="destructive">Needs Improvement</Badge>;
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Quality Analysis
            </h1>
            <p className="text-muted-foreground mt-2">
              Analyze audio quality, cultural authenticity, and technical metrics
            </p>
          </div>
          <Activity className="h-12 w-12 text-primary" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Track Selection */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Select Track
              </CardTitle>
              <CardDescription>
                Choose a track from your media library
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mediaLibraryQuery.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}

              {mediaLibraryQuery.data && mediaLibraryQuery.data.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tracks in media library</p>
                </div>
              )}

              {mediaLibraryQuery.data?.map((track) => (
                <Card
                  key={track.id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    selectedTrackId === track.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setSelectedTrackId(track.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium truncate">{track.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {track.duration ? `${Math.floor(track.duration / 60)}:${String(Math.floor(track.duration % 60)).padStart(2, '0')}` : 'N/A'}
                        </p>
                      </div>
                      {selectedTrackId === track.id && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {selectedTrackId && (
                <Button
                  className="w-full"
                  onClick={() => {
                    const track = mediaLibraryQuery.data?.find(t => t.id === selectedTrackId);
                    if (track) handleAnalyze(track.fileUrl);
                  }}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Activity className="mr-2 h-4 w-4" />
                      Analyze Track
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Quality Scores */}
          <div className="lg:col-span-2 space-y-6">
            {!qualityScore && !isAnalyzing && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Select a track and click "Analyze Track" to view quality metrics
                  </p>
                </CardContent>
              </Card>
            )}

            {isAnalyzing && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Analyzing audio quality...</p>
                </CardContent>
              </Card>
            )}

            {qualityScore && (
              <>
                {/* Overall Score */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Overall Quality Score</span>
                      {getScoreBadge(qualityScore.overall_score)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className={`text-6xl font-bold ${getScoreColor(qualityScore.overall_score)}`}>
                          {qualityScore.overall_score}
                        </span>
                        <span className="text-2xl text-muted-foreground">/100</span>
                      </div>
                      <Progress value={qualityScore.overall_score} className="h-3" />
                    </div>
                  </CardContent>
                </Card>

                {/* Technical Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Technical Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">LUFS</span>
                        <span className="font-bold">{qualityScore.lufs.toFixed(1)} dB</span>
                      </div>
                      <Progress 
                        value={Math.min(100, Math.max(0, (qualityScore.lufs + 20) * 5))} 
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Peak</span>
                        <span className="font-bold">{qualityScore.peak_db.toFixed(1)} dB</span>
                      </div>
                      <Progress 
                        value={Math.min(100, Math.max(0, (qualityScore.peak_db + 10) * 10))} 
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Dynamic Range</span>
                        <span className="font-bold">{qualityScore.dynamic_range.toFixed(1)} dB</span>
                      </div>
                      <Progress 
                        value={Math.min(100, qualityScore.dynamic_range * 5)} 
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Spectral Balance</span>
                        <Badge variant="outline">{qualityScore.spectral_balance}</Badge>
                      </div>
                    </div>

                    {qualityScore.tempo && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Tempo</span>
                          <span className="font-bold">{qualityScore.tempo} BPM</span>
                        </div>
                      </div>
                    )}

                    {qualityScore.key && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Key</span>
                          <span className="font-bold">{qualityScore.key}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cultural Authenticity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="h-5 w-5" />
                      Cultural Authenticity
                    </CardTitle>
                    <CardDescription>
                      Amapiano-specific characteristics and authenticity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Authenticity Score</span>
                        <span className={`text-2xl font-bold ${getScoreColor(qualityScore.cultural_score)}`}>
                          {qualityScore.cultural_score}%
                        </span>
                      </div>
                      <Progress value={qualityScore.cultural_score} className="h-3" />
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                {qualityScore.recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {qualityScore.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
