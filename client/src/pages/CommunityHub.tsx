import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { StarRating } from '@/components/StarRating';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFeedback, useGenerationFeedback, useFeedbackStats } from '@/hooks/useFeedback';
import { Heart, MessageSquare, Award, TrendingUp, Users } from 'lucide-react';
import AudioVisualizer from '@/components/AudioVisualizer';
import { toast } from 'sonner';

/**
 * Community Hub - Pattern Rating & Feedback Collection
 * 
 * This page implements the "Ground Truth" data collection interface for the AI-native feedback loop.
 * Producers rate generated patterns on cultural authenticity, rhythmic swing, and production quality.
 * High-quality ratings (>= 4/5) are automatically marked as "Gold Standard" for model retraining.
 */

export default function CommunityHub() {
  const [selectedGenerationId, setSelectedGenerationId] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [ratings, setRatings] = useState({
    culturalAuthenticity: 0,
    rhythmicSwing: 0,
    linguisticAlignment: 0,
    productionQuality: 0,
    creativity: 0,
  });

  // Fetch recent generations with community ratings
  const { data: allGenerations, isLoading: generationsLoading } = trpc.aiStudio.listGenerations.useQuery({
    limit: 50,
  });
  
  // Filter completed generations
  const generations = allGenerations?.filter(g => g.status === 'completed') || [];

  // Fetch feedback for selected generation
  const { feedback: selectedFeedback } = useGenerationFeedback(selectedGenerationId || 0);
  const { stats: selectedStats } = useFeedbackStats(selectedGenerationId || 0);

  // Feedback submission hook
  const { submitFeedback, isSubmitting } = useFeedback();

  const handleSubmitFeedback = async () => {
    if (!selectedGenerationId) {
      toast.error('Please select a generation to rate');
      return;
    }

    if (ratings.culturalAuthenticity === 0 && ratings.rhythmicSwing === 0) {
      toast.error('Please provide at least one rating');
      return;
    }

    const result = await submitFeedback({
      generationId: selectedGenerationId,
      culturalAuthenticityRating: ratings.culturalAuthenticity || undefined,
      rhythmicSwingRating: ratings.rhythmicSwing || undefined,
      linguisticAlignmentRating: ratings.linguisticAlignment || undefined,
      productionQualityRating: ratings.productionQuality || undefined,
      creativityRating: ratings.creativity || undefined,
      textFeedback: feedbackText || undefined,
    });

    if (result.success) {
      // Reset form
      setRatings({
        culturalAuthenticity: 0,
        rhythmicSwing: 0,
        linguisticAlignment: 0,
        productionQuality: 0,
        creativity: 0,
      });
      setFeedbackText('');
      toast.success('Thank you for your feedback!', {
        description: 'Your input helps improve the AI\'s cultural authenticity.',
      });
    }
  };

  const isGoldStandard = (gen: any) => {
    // Check if generation has high ratings (>= 4/5 across dimensions)
    return selectedStats && 
           selectedStats.avgCulturalRating >= 4 && 
           selectedStats.avgSwingRating >= 4;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Community Hub
              </h1>
              <p className="text-muted-foreground mt-1">
                Rate patterns to improve the AI's cultural authenticity
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-400" />
                  <span className="text-2xl font-bold">{generations?.length || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">Patterns</p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-400" />
                  <span className="text-2xl font-bold">
                    {generations?.filter(g => isGoldStandard(g)).length || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Gold Standard</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Pattern List */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Patterns</CardTitle>
                <CardDescription>
                  Select a pattern to rate and provide feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generationsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading patterns...
                  </div>
                ) : generations && generations.length > 0 ? (
                  <div className="space-y-3">
                    {generations.map((gen) => (
                      <button
                        key={gen.id}
                        onClick={() => setSelectedGenerationId(gen.id)}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${
                          selectedGenerationId === gen.id
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-border hover:border-purple-500/50 hover:bg-accent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold truncate">
                                {gen.title || `Generation #${gen.id}`}
                              </h3>
                              {isGoldStandard(gen) && (
                                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                                  <Award className="h-3 w-3 mr-1" />
                                  Gold Standard
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {gen.prompt || 'No description'}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>{gen.style || 'Amapiano'}</span>
                              <span>{gen.bpm || 112} BPM</span>
                              <span>{gen.key || 'F min'}</span>
                            </div>
                          </div>
                          {gen.resultUrl && (
                            <div className="w-32 h-16">
                              <AudioVisualizer
                                audioUrl={gen.resultUrl}
                                height={64}
                                bands={8}
                              />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No patterns available yet. Generate some patterns in AI Studio!
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Rating Interface */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rate This Pattern</CardTitle>
                <CardDescription>
                  Your feedback helps train the AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedGenerationId ? (
                  <>
                    {/* Cultural Authenticity Rating */}
                    <StarRating
                      label="Cultural Authenticity"
                      value={ratings.culturalAuthenticity}
                      onChange={(value) =>
                        setRatings({ ...ratings, culturalAuthenticity: value })
                      }
                      showLabel
                    />

                    {/* Rhythmic Swing Rating */}
                    <StarRating
                      label="Rhythmic Swing"
                      value={ratings.rhythmicSwing}
                      onChange={(value) =>
                        setRatings({ ...ratings, rhythmicSwing: value })
                      }
                      showLabel
                    />

                    {/* Linguistic Alignment Rating */}
                    <StarRating
                      label="Linguistic Alignment"
                      value={ratings.linguisticAlignment}
                      onChange={(value) =>
                        setRatings({ ...ratings, linguisticAlignment: value })
                      }
                      showLabel
                    />

                    {/* Production Quality Rating */}
                    <StarRating
                      label="Production Quality"
                      value={ratings.productionQuality}
                      onChange={(value) =>
                        setRatings({ ...ratings, productionQuality: value })
                      }
                      showLabel
                    />

                    {/* Creativity Rating */}
                    <StarRating
                      label="Creativity"
                      value={ratings.creativity}
                      onChange={(value) =>
                        setRatings({ ...ratings, creativity: value })
                      }
                      showLabel
                    />

                    {/* Text Feedback */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Additional Feedback (Optional)
                      </label>
                      <Textarea
                        placeholder="Share your thoughts on what works well or could be improved..."
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        rows={4}
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleSubmitFeedback}
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                    </Button>

                    {/* Community Stats */}
                    {selectedStats && selectedStats.totalFeedbackCount > 0 && (
                      <div className="pt-4 border-t border-border">
                        <h4 className="text-sm font-medium mb-3">Community Consensus</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Cultural Authenticity</span>
                            <StarRating
                              value={Math.round(selectedStats.avgCulturalRating)}
                              readonly
                              size="sm"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Rhythmic Swing</span>
                            <StarRating
                              value={Math.round(selectedStats.avgSwingRating)}
                              readonly
                              size="sm"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Total Ratings</span>
                            <span className="font-medium">{selectedStats.totalFeedbackCount}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select a pattern to rate
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Community Reviews */}
            {selectedGenerationId && selectedFeedback && selectedFeedback.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Community Reviews
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedFeedback.map((fb: any) => (
                      <div key={fb.id} className="p-3 rounded-lg bg-accent/50 border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <StarRating
                            value={fb.culturalAuthenticityRating || 0}
                            readonly
                            size="sm"
                          />
                          {fb.isGoldStandard && (
                            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-xs">
                              Gold Standard
                            </Badge>
                          )}
                        </div>
                        {fb.textFeedback && (
                          <p className="text-sm text-muted-foreground">
                            {fb.textFeedback}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
