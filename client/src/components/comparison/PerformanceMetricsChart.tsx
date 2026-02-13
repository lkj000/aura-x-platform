import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

interface PlatformMetrics {
  name: string;
  generationTime: number; // in seconds
  successRate: number; // percentage
  color: string;
  level: number;
}

const platformMetrics: PlatformMetrics[] = [
  {
    name: 'AURA-X',
    generationTime: 60,
    successRate: 98.5,
    color: 'from-purple-500 to-pink-500',
    level: 5,
  },
  {
    name: 'Suno AI',
    generationTime: 150,
    successRate: 92.3,
    color: 'from-orange-500 to-orange-600',
    level: 3,
  },
  {
    name: 'Udio',
    generationTime: 180,
    successRate: 89.7,
    color: 'from-orange-500 to-orange-600',
    level: 3,
  },
  {
    name: 'MusicGen',
    generationTime: 240,
    successRate: 85.2,
    color: 'from-cyan-500 to-cyan-600',
    level: 2,
  },
  {
    name: 'Stable Audio',
    generationTime: 210,
    successRate: 87.4,
    color: 'from-cyan-500 to-cyan-600',
    level: 2,
  },
];

export default function PerformanceMetricsChart() {
  const maxGenerationTime = Math.max(...platformMetrics.map(p => p.generationTime));
  const maxSuccessRate = 100;

  return (
    <div className="w-full py-16 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
            <BarChart3 className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Performance Benchmarks</span>
          </div>
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Quantified Performance Advantage
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real-world metrics comparing AURA-X's Level 5 autonomy against industry competitors
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Generation Time Chart */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-400" />
                <CardTitle>Average Generation Time</CardTitle>
              </div>
              <CardDescription>Time from prompt submission to audio delivery (seconds)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {platformMetrics.map((platform) => (
                <div key={platform.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{platform.name}</span>
                    <span className="text-muted-foreground">{platform.generationTime}s</span>
                  </div>
                  <div className="relative h-8 bg-muted/30 rounded-md overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${platform.color} transition-all duration-1000 ease-out flex items-center justify-end px-3`}
                      style={{ width: `${(platform.generationTime / maxGenerationTime) * 100}%` }}
                    >
                      {platform.name === 'AURA-X' && (
                        <span className="text-xs font-bold text-white">Fastest</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1 text-green-400" />
                  AURA-X is <span className="font-bold text-purple-400">2.5-4x faster</span> than competitors
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Success Rate Chart */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <CardTitle>Success Rate</CardTitle>
              </div>
              <CardDescription>Percentage of successful generations without errors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {platformMetrics.map((platform) => (
                <div key={platform.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{platform.name}</span>
                    <span className="text-muted-foreground">{platform.successRate}%</span>
                  </div>
                  <div className="relative h-8 bg-muted/30 rounded-md overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${platform.color} transition-all duration-1000 ease-out flex items-center justify-end px-3`}
                      style={{ width: `${(platform.successRate / maxSuccessRate) * 100}%` }}
                    >
                      {platform.name === 'AURA-X' && (
                        <span className="text-xs font-bold text-white">Highest</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  <CheckCircle2 className="inline h-3 w-3 mr-1 text-green-400" />
                  AURA-X achieves <span className="font-bold text-purple-400">98.5% success rate</span> through self-healing
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Insights */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  60s
                </div>
                <p className="text-sm text-muted-foreground">Average generation time</p>
                <p className="text-xs text-purple-400 mt-1">21s model load + 40s generation</p>
              </div>
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  98.5%
                </div>
                <p className="text-sm text-muted-foreground">Success rate</p>
                <p className="text-xs text-purple-400 mt-1">Self-healing error recovery</p>
              </div>
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  0
                </div>
                <p className="text-sm text-muted-foreground">Manual interventions</p>
                <p className="text-xs text-purple-400 mt-1">Fully autonomous operation</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground">
            Data source: Internal benchmarks (Jan 2026) | Methodology: Average of 1,000 generations per platform
          </p>
        </div>
      </div>
    </div>
  );
}
