import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, Video, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkflowStep {
  step: number;
  title: string;
  auraX: {
    status: 'automated' | 'manual' | 'not-required';
    description: string;
    duration: string;
  };
  competitor: {
    status: 'automated' | 'manual' | 'not-required';
    description: string;
    duration: string;
  };
}

const workflowSteps: WorkflowStep[] = [
  {
    step: 1,
    title: 'Prompt Submission',
    auraX: {
      status: 'automated',
      description: 'User enters prompt, system auto-validates and queues',
      duration: '< 1s',
    },
    competitor: {
      status: 'manual',
      description: 'User enters prompt, manually selects parameters',
      duration: '30-60s',
    },
  },
  {
    step: 2,
    title: 'Parameter Configuration',
    auraX: {
      status: 'automated',
      description: 'AI extracts genre-specific parameters automatically',
      duration: '< 1s',
    },
    competitor: {
      status: 'manual',
      description: 'User manually adjusts BPM, key, duration, style',
      duration: '60-120s',
    },
  },
  {
    step: 3,
    title: 'GPU Allocation',
    auraX: {
      status: 'automated',
      description: 'Queue manager auto-allocates GPU based on availability',
      duration: '< 1s',
    },
    competitor: {
      status: 'manual',
      description: 'User waits in queue, may need to retry manually',
      duration: '30-300s',
    },
  },
  {
    step: 4,
    title: 'Model Inference',
    auraX: {
      status: 'automated',
      description: 'MusicGen generates audio, progress tracked automatically',
      duration: '40s',
    },
    competitor: {
      status: 'automated',
      description: 'Model generates audio, user monitors manually',
      duration: '60-180s',
    },
  },
  {
    step: 5,
    title: 'Error Handling',
    auraX: {
      status: 'automated',
      description: 'Self-healing: auto-retry on webhook/upload failures',
      duration: '0s (if no errors)',
    },
    competitor: {
      status: 'manual',
      description: 'User manually retries failed generations',
      duration: '60-300s (if errors)',
    },
  },
  {
    step: 6,
    title: 'Storage & Delivery',
    auraX: {
      status: 'automated',
      description: 'Auto-upload to S3, webhook delivery, instant playback',
      duration: '< 1s',
    },
    competitor: {
      status: 'manual',
      description: 'User manually downloads, uploads to storage',
      duration: '30-60s',
    },
  },
];

export default function VideoDemo() {
  const [isPlaying, setIsPlaying] = useState(false);

  const totalAuraXTime = workflowSteps.reduce((acc, step) => {
    const time = parseInt(step.auraX.duration) || 0;
    return acc + time;
  }, 0);

  const totalCompetitorTime = workflowSteps.reduce((acc, step) => {
    const maxTime = step.competitor.duration.includes('-') 
      ? parseInt(step.competitor.duration.split('-')[1]) 
      : parseInt(step.competitor.duration) || 0;
    return acc + maxTime;
  }, 0);

  return (
    <div className="w-full py-16 px-4 bg-gradient-to-b from-background to-purple-950/10">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
            <Video className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Workflow Comparison</span>
          </div>
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Zero-Touch vs Manual Workflows
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how AURA-X's Level 5 autonomy eliminates manual intervention at every step
          </p>
        </div>

        {/* Video Placeholder */}
        <div className="mb-12">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
            <div className="relative aspect-video bg-gradient-to-br from-purple-900/20 to-pink-900/20 flex items-center justify-center">
              <div className="absolute inset-0 bg-grid-white/5" />
              <div className="relative z-10 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-500/20 border-2 border-purple-500/50 mb-4">
                  {isPlaying ? (
                    <Pause className="h-8 w-8 text-purple-400" />
                  ) : (
                    <Play className="h-8 w-8 text-purple-400 ml-1" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Side-by-side workflow demonstration
                </p>
                <Button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {isPlaying ? 'Pause Demo' : 'Play Demo'}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Workflow Steps Comparison */}
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-bold text-purple-300">AURA-X (Level 5)</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Fully Autonomous Workflow</p>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                ~{totalAuraXTime}s
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total time (zero manual steps)</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-orange-400" />
                <h3 className="text-lg font-bold text-orange-300">Competitors (Level 2-3)</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Manual Workflow</p>
              <div className="text-3xl font-bold text-orange-400">
                ~{totalCompetitorTime}s
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total time (6 manual steps)</p>
            </div>
          </div>

          {workflowSteps.map((workflow, index) => (
            <Card key={workflow.step} className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-bold text-sm">
                    {workflow.step}
                  </div>
                  <CardTitle className="text-lg">{workflow.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* AURA-X */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      {workflow.auraX.status === 'automated' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-xs font-bold text-purple-300 uppercase">
                        {workflow.auraX.status === 'automated' ? 'Automated' : 'Not Required'}
                      </span>
                      <span className="ml-auto text-xs text-purple-400 font-mono">
                        {workflow.auraX.duration}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{workflow.auraX.description}</p>
                  </div>

                  {/* Competitor */}
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      {workflow.competitor.status === 'manual' ? (
                        <XCircle className="h-4 w-4 text-orange-400" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      )}
                      <span className="text-xs font-bold text-orange-300 uppercase">
                        {workflow.competitor.status === 'automated' ? 'Automated' : 'Manual'}
                      </span>
                      <span className="ml-auto text-xs text-orange-400 font-mono">
                        {workflow.competitor.duration}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{workflow.competitor.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <Card className="mt-8 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                The Level 5 Difference
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold text-purple-400 mb-2">6/6</div>
                  <p className="text-sm text-muted-foreground">Steps automated</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-400 mb-2">10x</div>
                  <p className="text-sm text-muted-foreground">Faster workflow</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-400 mb-2">0</div>
                  <p className="text-sm text-muted-foreground">Manual decisions</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
