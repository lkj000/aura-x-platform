import React, { useState, useEffect } from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip
} from 'recharts';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Info, 
  CheckCircle2,
  Activity,
  Zap,
  Waves
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface Metric {
  name: string;
  value: number; // 0-100
  threshold: number;
  status: 'optimal' | 'warning' | 'critical';
  description: string;
}

interface AnalysisResult {
  overallScore: number;
  metrics: Metric[];
  recommendations: string[];
}

// Mock Data
const MOCK_DATA: Metric[] = [
  { name: 'Log Drum Presence', value: 85, threshold: 70, status: 'optimal', description: 'Intensity and clarity of the log drum bassline.' },
  { name: 'Shaker Groove', value: 92, threshold: 80, status: 'optimal', description: 'Rhythmic consistency and swing of the shakers.' },
  { name: 'Chord Voicing', value: 65, threshold: 75, status: 'warning', description: 'Jazz-influenced chord extensions and progressions.' },
  { name: 'Arrangement Flow', value: 78, threshold: 70, status: 'optimal', description: 'Structural progression typical of Amapiano.' },
  { name: 'Vocal Integration', value: 45, threshold: 60, status: 'critical', description: 'Presence and mix of ad-libs and hooks.' },
];

// ============================================================================
// Main Component
// ============================================================================

export default function CulturalInspector() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [score, setScore] = useState(0);
  const [metrics, setMetrics] = useState<Metric[]>(MOCK_DATA);

  // Simulate real-time analysis
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(m => ({
        ...m,
        value: Math.min(100, Math.max(0, m.value + (Math.random() * 10 - 5)))
      })));
      
      // Calculate overall score
      const avg = metrics.reduce((acc, curr) => acc + curr.value, 0) / metrics.length;
      setScore(avg);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col bg-background/50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Cultural Authenticity Inspector
          </h2>
          <p className="text-muted-foreground text-sm">
            Real-time validation against Amapiano genre standards.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase font-bold">Authenticity Score</p>
            <p className={cn(
              "text-3xl font-mono font-bold",
              score >= 80 ? "text-green-500" : score >= 60 ? "text-yellow-500" : "text-red-500"
            )}>
              {Math.round(score)}%
            </p>
          </div>
          <div className="h-12 w-12 rounded-full border-4 border-muted flex items-center justify-center relative">
            <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray={`${score}, 100`}
                className={cn(
                  score >= 80 ? "text-green-500" : score >= 60 ? "text-yellow-500" : "text-red-500"
                )}
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Radar Chart */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Genre Fingerprint
          </h3>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={metrics}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Current Track"
                  dataKey="value"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Metrics List */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col lg:col-span-2">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-secondary" />
            Detailed Analysis
          </h3>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {metrics.map((metric, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {metric.status === 'optimal' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {metric.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                      {metric.status === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      <span className="font-medium">{metric.name}</span>
                    </div>
                    <span className="font-mono text-sm">{Math.round(metric.value)}/100</span>
                  </div>
                  <Progress 
                    value={metric.value} 
                    className={cn(
                      "h-2",
                      metric.status === 'optimal' ? "[&>div]:bg-green-500" : 
                      metric.status === 'warning' ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"
                    )} 
                  />
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                  
                  {/* Recommendation */}
                  {metric.status !== 'optimal' && (
                    <div className="bg-muted/30 p-2 rounded text-xs flex gap-2 items-start mt-1">
                      <Info className="h-3 w-3 mt-0.5 flex-shrink-0 text-primary" />
                      <span>
                        {metric.name === 'Chord Voicing' && "Try adding 7th and 9th extensions to your chords for a jazzier feel."}
                        {metric.name === 'Vocal Integration' && "Consider adding rhythmic vocal chops or ad-libs to fill the space."}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
