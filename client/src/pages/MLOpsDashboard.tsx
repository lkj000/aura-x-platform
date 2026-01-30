import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Database, 
  Award, 
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  LineChart,
  Users
} from 'lucide-react';
import { format } from 'date-fns';

/**
 * MLOps Dashboard - Model Performance Monitoring & Drift Detection
 * 
 * This page provides real-time insights into the AI model's performance evolution,
 * enabling data-driven decisions for model retraining and continuous improvement.
 * 
 * Key Features:
 * - Performance metrics tracking (cultural authenticity, swing accuracy, etc.)
 * - Drift detection alerts when model quality degrades
 * - Gold Standard dataset curation interface
 * - Training batch preparation and export
 */

export default function MLOpsDashboard() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  // Fetch model performance metrics
  const { data: metrics, isLoading: metricsLoading } = trpc.communityFeedback.getModelPerformanceMetrics.useQuery({
    timeRange,
  });

  // Fetch Gold Standard dataset
  const { data: goldStandard, isLoading: goldStandardLoading } = trpc.communityFeedback.getGoldStandardDataset.useQuery({
    minRating: 4,
    limit: 100,
  });

  const calculateTrend = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-yellow-500" />;
  };

  const getDriftStatus = (trend: number) => {
    if (trend < -10) return { status: 'critical', label: 'Critical Drift', color: 'text-red-500' };
    if (trend < -5) return { status: 'warning', label: 'Drift Detected', color: 'text-yellow-500' };
    return { status: 'healthy', label: 'Healthy', color: 'text-green-500' };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                MLOps Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Monitor model performance and detect quality drift
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={timeRange === '7d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('7d')}
              >
                7 Days
              </Button>
              <Button
                variant={timeRange === '30d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('30d')}
              >
                30 Days
              </Button>
              <Button
                variant={timeRange === '90d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('90d')}
              >
                90 Days
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cultural Authenticity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <div className="text-center text-muted-foreground">Loading...</div>
              ) : metrics && metrics.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">
                      {Number(metrics[0].avgCulturalAuthenticityRating || 0).toFixed(2)}
                    </span>
                    {getTrendIcon(
                      calculateTrend(
                        Number(metrics[0].avgCulturalAuthenticityRating || 0),
                        Number(metrics[1]?.avgCulturalAuthenticityRating || 0)
                      )
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {calculateTrend(
                      Number(metrics[0].avgCulturalAuthenticityRating || 0),
                      Number(metrics[1]?.avgCulturalAuthenticityRating || 0)
                    ).toFixed(1)}% vs previous period
                  </p>
                </>
              ) : (
                <div className="text-center text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rhythmic Swing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <div className="text-center text-muted-foreground">Loading...</div>
              ) : metrics && metrics.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">
                      {Number(metrics[0].avgRhythmicSwingRating || 0).toFixed(2)}
                    </span>
                    {getTrendIcon(
                      calculateTrend(
                        Number(metrics[0].avgRhythmicSwingRating || 0),
                        Number(metrics[1]?.avgRhythmicSwingRating || 0)
                      )
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {calculateTrend(
                      Number(metrics[0].avgRhythmicSwingRating || 0),
                      Number(metrics[1]?.avgRhythmicSwingRating || 0)
                    ).toFixed(1)}% vs previous period
                  </p>
                </>
              ) : (
                <div className="text-center text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <div className="text-center text-muted-foreground">Loading...</div>
              ) : metrics && metrics.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">
                      {metrics[0].totalFeedbackCount}
                    </span>
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Community contributions
                  </p>
                </>
              ) : (
                <div className="text-center text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gold Standard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {goldStandardLoading ? (
                <div className="text-center text-muted-foreground">Loading...</div>
              ) : goldStandard ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">
                      {goldStandard.length}
                    </span>
                    <Award className="h-5 w-5 text-yellow-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    High-quality training samples
                  </p>
                </>
              ) : (
                <div className="text-center text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="drift" className="space-y-6">
          <TabsList>
            <TabsTrigger value="drift">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Drift Detection
            </TabsTrigger>
            <TabsTrigger value="performance">
              <BarChart3 className="h-4 w-4 mr-2" />
              Performance Trends
            </TabsTrigger>
            <TabsTrigger value="dataset">
              <Database className="h-4 w-4 mr-2" />
              Training Dataset
            </TabsTrigger>
          </TabsList>

          {/* Drift Detection Tab */}
          <TabsContent value="drift" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Model Drift Analysis</CardTitle>
                <CardDescription>
                  Detect when model performance degrades and requires retraining
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading drift analysis...
                  </div>
                ) : metrics && metrics.length > 1 ? (
                  <div className="space-y-4">
                    {/* Cultural Authenticity Drift */}
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Cultural Authenticity</h3>
                        {(() => {
                          const trend = calculateTrend(
                            Number(metrics[0].avgCulturalAuthenticityRating || 0),
                            Number(metrics[1].avgCulturalAuthenticityRating || 0)
                          );
                          const drift = getDriftStatus(trend);
                          return (
                            <Badge variant="secondary" className={drift.color}>
                              {drift.label}
                            </Badge>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Current:</span>
                          <span className="ml-2 font-medium">
                            {Number(metrics[0].avgCulturalAuthenticityRating || 0).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Previous:</span>
                          <span className="ml-2 font-medium">
                            {Number(metrics[1].avgCulturalAuthenticityRating || 0).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Change:</span>
                          <span className="ml-2 font-medium">
                            {calculateTrend(
                              Number(metrics[0].avgCulturalAuthenticityRating || 0),
                              Number(metrics[1].avgCulturalAuthenticityRating || 0)
                            ).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Rhythmic Swing Drift */}
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Rhythmic Swing</h3>
                        {(() => {
                          const trend = calculateTrend(
                            Number(metrics[0].avgRhythmicSwingRating || 0),
                            Number(metrics[1].avgRhythmicSwingRating || 0)
                          );
                          const drift = getDriftStatus(trend);
                          return (
                            <Badge variant="secondary" className={drift.color}>
                              {drift.label}
                            </Badge>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Current:</span>
                          <span className="ml-2 font-medium">
                            {Number(metrics[0].avgRhythmicSwingRating || 0).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Previous:</span>
                          <span className="ml-2 font-medium">
                            {Number(metrics[1].avgRhythmicSwingRating || 0).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Change:</span>
                          <span className="ml-2 font-medium">
                            {calculateTrend(
                              Number(metrics[0].avgRhythmicSwingRating || 0),
                              Number(metrics[1].avgRhythmicSwingRating || 0)
                            ).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/50">
                      <h3 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        Recommendations
                      </h3>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Monitor drift trends over the next 7 days</li>
                        <li>• Collect more feedback from underrepresented regions</li>
                        <li>• Consider retraining if drift exceeds -15%</li>
                        <li>• Export Gold Standard dataset for model fine-tuning</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Not enough data for drift analysis. Collect more feedback to enable monitoring.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Trends Tab */}
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Over Time</CardTitle>
                <CardDescription>
                  Track model quality metrics across different time periods
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading performance data...
                  </div>
                ) : metrics && metrics.length > 0 ? (
                  <div className="space-y-6">
                    {metrics.map((metric, index) => (
                      <div key={index} className="p-4 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">
                            Period {index + 1}
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {metric.totalFeedbackCount} ratings
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Cultural Auth.</p>
                            <p className="text-lg font-bold">
                              {Number(metric.avgCulturalAuthenticityRating || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Rhythmic Swing</p>
                            <p className="text-lg font-bold">
                              {Number(metric.avgRhythmicSwingRating || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Creativity</p>
                            <p className="text-lg font-bold">
                              {Number(metric.avgCreativityRating || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Production</p>
                            <p className="text-lg font-bold">
                              {Number(metric.avgProductionQualityRating || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No performance data available yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training Dataset Tab */}
          <TabsContent value="dataset" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gold Standard Training Dataset</CardTitle>
                    <CardDescription>
                      High-quality patterns curated for model retraining
                    </CardDescription>
                  </div>
                  <Button disabled>
                    <Database className="h-4 w-4 mr-2" />
                    Export Dataset
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {goldStandardLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading dataset...
                  </div>
                ) : goldStandard && goldStandard.length > 0 ? (
                  <div className="space-y-3">
                    {goldStandard.map((item) => (
                      <div key={item.id} className="p-4 rounded-lg border border-border hover:border-yellow-500/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Award className="h-4 w-4 text-yellow-400" />
                              <h3 className="font-semibold">
                                Generation #{item.generationId}
                              </h3>
                              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-xs">
                                Gold Standard
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Cultural: {Number(item.avgCulturalRating || 0).toFixed(1)}/5</span>
                              <span>Swing: {Number(item.avgSwingRating || 0).toFixed(1)}/5</span>
                              <span>{item.feedbackCount} ratings</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No Gold Standard samples yet. Patterns with ratings ≥ 4/5 are automatically added.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
