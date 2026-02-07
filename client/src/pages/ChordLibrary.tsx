import { useState } from 'react';
import { kabzaProgressions, progressionToMIDI, type ChordProgression } from '@shared/kabzaChordLibrary';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Play, Pause, Music } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ChordLibrary() {
  const [selectedProgression, setSelectedProgression] = useState<ChordProgression | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleExportMIDI = (progression: ChordProgression) => {
    const midiData = progressionToMIDI(progression);
    
    // Create downloadable MIDI file (simplified - would need proper MIDI library)
    const dataStr = JSON.stringify(midiData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${progression.name.replace(/\s+/g, '_')}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    
    toast({
      title: 'MIDI Exported',
      description: `${progression.name} exported as JSON (convert to MIDI in DAW)`,
    });
  };

  const handlePlayProgression = (progressionId: string) => {
    if (playingId === progressionId) {
      setPlayingId(null);
      toast({
        title: 'Playback Stopped',
        description: 'Chord progression playback stopped',
      });
    } else {
      setPlayingId(progressionId);
      toast({
        title: 'Playing Progression',
        description: 'Chord progression playback started (Web Audio API integration needed)',
      });
      
      // Auto-stop after 16 beats (4 chords × 4 beats)
      setTimeout(() => setPlayingId(null), 16 * (60 / 112) * 1000);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Kabza's Chord Library</h1>
          <p className="text-muted-foreground">
            6-5-4-2 Emotional Progression Framework for Authentic Amapiano Production
          </p>
        </div>

        {/* Emotional Framework Explanation */}
        <Card className="p-6 mb-8 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <h2 className="text-2xl font-bold mb-4">The 6-5-4-2 Framework</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-background/50 rounded-lg">
              <div className="text-3xl font-bold text-purple-400 mb-2">6 (vi)</div>
              <div className="font-semibold mb-1">Vulnerability</div>
              <p className="text-sm text-muted-foreground">
                Introspection, melancholy, emotional openness. Sets the emotional tone.
              </p>
            </div>
            <div className="p-4 bg-background/50 rounded-lg">
              <div className="text-3xl font-bold text-blue-400 mb-2">5 (V)</div>
              <div className="font-semibold mb-1">Tension</div>
              <p className="text-sm text-muted-foreground">
                Anticipation, rising energy, unresolved longing. Builds emotional pressure.
              </p>
            </div>
            <div className="p-4 bg-background/50 rounded-lg">
              <div className="text-3xl font-bold text-pink-400 mb-2">4 (IV)</div>
              <div className="font-semibold mb-1">Shattering</div>
              <p className="text-sm text-muted-foreground">
                Emotional release, catharsis, breakthrough moment. Peak intensity.
              </p>
            </div>
            <div className="p-4 bg-background/50 rounded-lg">
              <div className="text-3xl font-bold text-green-400 mb-2">2 (ii)</div>
              <div className="font-semibold mb-1">Integration</div>
              <p className="text-sm text-muted-foreground">
                Resolution, acceptance, grounding. Emotional closure and peace.
              </p>
            </div>
          </div>
        </Card>

        {/* Progression List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {kabzaProgressions.map((progression) => (
            <Card
              key={progression.id}
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                selectedProgression?.id === progression.id
                  ? 'ring-2 ring-primary'
                  : ''
              }`}
              onClick={() => setSelectedProgression(progression)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold mb-1">{progression.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {progression.key} Major • {progression.tempo} BPM
                  </p>
                </div>
                <Music className="h-6 w-6 text-primary" />
              </div>

              <div className="mb-4">
                <div className="text-sm font-semibold mb-2">Emotional Arc:</div>
                <p className="text-sm text-muted-foreground">{progression.emotionalArc}</p>
              </div>

              <div className="mb-4">
                <div className="text-sm font-semibold mb-2">Chord Progression:</div>
                <div className="flex flex-wrap gap-2">
                  {progression.chords.map((chord, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1 bg-primary/10 rounded-md text-sm font-mono"
                    >
                      {chord.symbol}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-semibold mb-2">Usage:</div>
                <p className="text-sm text-muted-foreground">{progression.usage}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayProgression(progression.id);
                  }}
                >
                  {playingId === progression.id ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Preview
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportMIDI(progression);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export MIDI
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Detailed View */}
        {selectedProgression && (
          <Card className="mt-8 p-6">
            <h2 className="text-2xl font-bold mb-6">
              {selectedProgression.name} - Detailed Analysis
            </h2>

            <div className="space-y-6">
              {selectedProgression.chords.map((chord, idx) => (
                <div key={idx} className="border-l-4 border-primary pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-2xl font-bold">{chord.symbol}</span>
                      <span className="ml-3 text-muted-foreground">
                        {chord.degree} • {chord.quality}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {chord.function}
                    </div>
                  </div>

                  <div className="mb-2">
                    <span className="font-semibold">Emotion: </span>
                    <span className="text-muted-foreground">{chord.emotion}</span>
                  </div>

                  {chord.extensions.length > 0 && (
                    <div className="mb-2">
                      <span className="font-semibold">Extensions: </span>
                      <span className="text-muted-foreground">
                        {chord.extensions.join(', ')}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="font-semibold">Voicing: </span>
                    <span className="text-muted-foreground font-mono">
                      {chord.voicings[0].notes.join(' - ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
