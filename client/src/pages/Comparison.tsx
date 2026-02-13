import React, { useState } from 'react';
import PerformanceMetricsChart from '@/components/comparison/PerformanceMetricsChart';
import VideoDemo from '@/components/comparison/VideoDemo';
import PricingComparison from '@/components/comparison/PricingComparison';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Check, 
  X, 
  Zap, 
  Brain, 
  Shield, 
  TrendingUp,
  Cpu,
  Database,
  Network,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Platform {
  name: string;
  level: number;
  logo?: string;
  description: string;
  features: {
    endToEnd: boolean;
    realTimeAdaptive: boolean;
    selfHealing: boolean;
    multiSystem: boolean;
    predictiveAnalytics: boolean;
    zeroTouch: boolean;
    safetyValidation: boolean;
    culturalIntelligence: boolean;
  };
  limitations: string[];
  architecture: string[];
}

const platforms: Platform[] = [
  {
    name: 'AURA-X (Amapiano AI)',
    level: 5,
    description: 'Fully autonomous AI music production platform with zero human intervention required',
    features: {
      endToEnd: true,
      realTimeAdaptive: true,
      selfHealing: true,
      multiSystem: true,
      predictiveAnalytics: true,
      zeroTouch: true,
      safetyValidation: true,
      culturalIntelligence: true
    },
    limitations: [],
    architecture: [
      'Modal.com GPU Compute (MusicGen)',
      'AWS S3 Distributed Storage',
      'MySQL/TiDB Transactional DB',
      'WebSocket Real-time Communication',
      'tRPC Type-safe API',
      'React Query Optimistic UI'
    ]
  },
  {
    name: 'Suno AI',
    level: 3,
    description: 'AI music generation with manual parameter tuning and limited error recovery',
    features: {
      endToEnd: true,
      realTimeAdaptive: false,
      selfHealing: false,
      multiSystem: true,
      predictiveAnalytics: false,
      zeroTouch: false,
      safetyValidation: true,
      culturalIntelligence: false
    },
    limitations: [
      'Requires manual retry on failures',
      'No queue position visibility',
      'Limited genre-specific intelligence',
      'No automatic timeout handling',
      'Manual progress monitoring required'
    ],
    architecture: [
      'Proprietary AI Model',
      'Cloud Storage (unspecified)',
      'REST API',
      'Manual polling for status'
    ]
  },
  {
    name: 'Udio',
    level: 3,
    description: 'Text-to-music generation with iterative refinement but limited autonomy',
    features: {
      endToEnd: true,
      realTimeAdaptive: false,
      selfHealing: false,
      multiSystem: false,
      predictiveAnalytics: false,
      zeroTouch: false,
      safetyValidation: true,
      culturalIntelligence: false
    },
    limitations: [
      'Requires user intervention for refinements',
      'No automatic error recovery',
      'Limited to single-system architecture',
      'No predictive wait time estimation',
      'Manual quality validation needed'
    ],
    architecture: [
      'Custom Diffusion Model',
      'Cloud Infrastructure',
      'Web Interface Only'
    ]
  },
  {
    name: 'MusicGen (Meta)',
    level: 2,
    description: 'Open-source model requiring manual deployment and orchestration',
    features: {
      endToEnd: false,
      realTimeAdaptive: false,
      selfHealing: false,
      multiSystem: false,
      predictiveAnalytics: false,
      zeroTouch: false,
      safetyValidation: false,
      culturalIntelligence: false
    },
    limitations: [
      'Requires manual GPU setup',
      'No built-in storage management',
      'No error handling infrastructure',
      'Manual model caching required',
      'No queue management',
      'Developer intervention needed for failures'
    ],
    architecture: [
      'PyTorch Model (manual deployment)',
      'User-provided infrastructure',
      'No built-in API'
    ]
  },
  {
    name: 'Stable Audio',
    level: 2,
    description: 'Diffusion-based audio generation with manual workflow management',
    features: {
      endToEnd: false,
      realTimeAdaptive: false,
      selfHealing: false,
      multiSystem: false,
      predictiveAnalytics: false,
      zeroTouch: false,
      safetyValidation: false,
      culturalIntelligence: false
    },
    limitations: [
      'Manual prompt engineering required',
      'No automatic retry logic',
      'Limited to API-level interaction',
      'No progress tracking',
      'Manual file management',
      'No cultural genre optimization'
    ],
    architecture: [
      'Stable Diffusion Audio Model',
      'API-only access',
      'Manual integration required'
    ]
  }
];

const autonomyLevels = [
  {
    level: 0,
    name: 'No Automation',
    description: 'Manual music production with traditional DAWs',
    color: 'bg-gray-500'
  },
  {
    level: 1,
    name: 'Driver Assistance',
    description: 'AI-powered plugins and effects (auto-tune, smart EQ)',
    color: 'bg-blue-500'
  },
  {
    level: 2,
    name: 'Partial Automation',
    description: 'AI generates music but requires manual setup and monitoring',
    color: 'bg-cyan-500'
  },
  {
    level: 3,
    name: 'Conditional Automation',
    description: 'AI handles generation but needs human intervention for errors',
    color: 'bg-yellow-500'
  },
  {
    level: 4,
    name: 'High Automation',
    description: 'AI manages most tasks with minimal human oversight',
    color: 'bg-orange-500'
  },
  {
    level: 5,
    name: 'Full Autonomy',
    description: 'Zero human intervention - complete end-to-end autonomous operation',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500'
  }
];

const featureDescriptions = {
  endToEnd: 'Handles entire pipeline from prompt to playback without intermediate decisions',
  realTimeAdaptive: 'Dynamically adjusts to GPU availability, queue position, and system load',
  selfHealing: 'Automatically recovers from webhook failures, upload errors, and timeouts',
  multiSystem: 'Orchestrates multiple distributed systems (GPU, storage, database, WebSocket)',
  predictiveAnalytics: 'Tracks success rates, completion times, and predicts optimal timing',
  zeroTouch: 'Operates continuously without maintenance or developer intervention',
  safetyValidation: 'Input validation, auth guards, rate limiting, and audit trails',
  culturalIntelligence: 'Genre-specific parameters and cultural authenticity scoring'
};

export default function Comparison() {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  const getLevelColor = (level: number) => {
    const levelData = autonomyLevels.find(l => l.level === level);
    return levelData?.color || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
            <Zap className="w-4 h-4 mr-2" />
            Industry Comparison
          </Badge>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            Level 5 Autonomous AI
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            AURA-X is the world's first Level 5 autonomous AI music production platform,
            comparable to fully self-driving vehicles—operating end-to-end without human intervention
          </p>
        </div>

        {/* Autonomy Levels Overview */}
        <Card className="mb-12 bg-slate-900/50 border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-400" />
              Understanding Autonomy Levels
            </CardTitle>
            <CardDescription>
              Modeled after self-driving car classification (SAE J3016 standard)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {autonomyLevels.map((level) => (
                <Card 
                  key={level.level}
                  className={`${level.level === 5 ? 'border-purple-500 border-2' : 'border-slate-700'} bg-slate-800/50`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge className={`${level.color} text-white border-0`}>
                        Level {level.level}
                      </Badge>
                      {level.level === 5 && (
                        <Badge variant="outline" className="border-purple-500 text-purple-400">
                          AURA-X
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{level.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-400">{level.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Platform Comparison Table */}
        <Card className="mb-12 bg-slate-900/50 border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-purple-400" />
              Platform Comparison Matrix
            </CardTitle>
            <CardDescription>
              Click on any platform to see detailed capabilities and limitations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-4 text-gray-300">Platform</th>
                    <th className="text-center p-4 text-gray-300">Autonomy Level</th>
                    <th className="text-center p-4 text-gray-300">End-to-End</th>
                    <th className="text-center p-4 text-gray-300">Adaptive</th>
                    <th className="text-center p-4 text-gray-300">Self-Healing</th>
                    <th className="text-center p-4 text-gray-300">Multi-System</th>
                    <th className="text-center p-4 text-gray-300">Analytics</th>
                    <th className="text-center p-4 text-gray-300">Zero-Touch</th>
                    <th className="text-center p-4 text-gray-300">Safety</th>
                    <th className="text-center p-4 text-gray-300">Cultural AI</th>
                  </tr>
                </thead>
                <tbody>
                  {platforms.map((platform) => (
                    <tr 
                      key={platform.name}
                      className={`border-b border-slate-700 hover:bg-slate-800/30 cursor-pointer transition-colors ${
                        selectedPlatform === platform.name ? 'bg-purple-900/20' : ''
                      }`}
                      onClick={() => setSelectedPlatform(selectedPlatform === platform.name ? null : platform.name)}
                    >
                      <td className="p-4">
                        <div>
                          <div className="font-semibold text-white">{platform.name}</div>
                          <div className="text-sm text-gray-400">{platform.description}</div>
                        </div>
                      </td>
                      <td className="text-center p-4">
                        <Badge className={`${getLevelColor(platform.level)} text-white border-0`}>
                          Level {platform.level}
                        </Badge>
                      </td>
                      <td className="text-center p-4">
                        {platform.features.endToEnd ? (
                          <Check className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="text-center p-4">
                        {platform.features.realTimeAdaptive ? (
                          <Check className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="text-center p-4">
                        {platform.features.selfHealing ? (
                          <Check className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="text-center p-4">
                        {platform.features.multiSystem ? (
                          <Check className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="text-center p-4">
                        {platform.features.predictiveAnalytics ? (
                          <Check className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="text-center p-4">
                        {platform.features.zeroTouch ? (
                          <Check className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="text-center p-4">
                        {platform.features.safetyValidation ? (
                          <Check className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="text-center p-4">
                        {platform.features.culturalIntelligence ? (
                          <Check className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Selected Platform Details */}
            {selectedPlatform && (
              <div className="mt-6 p-6 bg-slate-800/50 rounded-lg border border-purple-500/20">
                {platforms.filter(p => p.name === selectedPlatform).map(platform => (
                  <div key={platform.name}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-white">{platform.name}</h3>
                      <Badge className={`${getLevelColor(platform.level)} text-white border-0 text-lg px-4 py-2`}>
                        Level {platform.level} Autonomy
                      </Badge>
                    </div>

                    {platform.architecture.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
                          <Cpu className="w-5 h-5" />
                          Technical Architecture
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {platform.architecture.map((tech, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-gray-300">
                              <Network className="w-4 h-4 text-purple-400" />
                              {tech}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {platform.limitations.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-orange-400 mb-3 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          Limitations & Manual Intervention Required
                        </h4>
                        <ul className="space-y-2">
                          {platform.limitations.map((limitation, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-gray-400">
                              <X className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                              {limitation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {platform.limitations.length === 0 && (
                      <div className="text-center py-8">
                        <Shield className="w-16 h-16 text-green-400 mx-auto mb-4" />
                        <p className="text-xl font-semibold text-green-400">
                          Zero Limitations - Fully Autonomous Operation
                        </p>
                        <p className="text-gray-400 mt-2">
                          No manual intervention required at any stage
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature Deep Dive */}
        <Card className="mb-12 bg-slate-900/50 border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-6 h-6 text-purple-400" />
              Level 5 Capabilities Explained
            </CardTitle>
            <CardDescription>
              Click on any feature to learn more about what makes it autonomous
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(featureDescriptions).map(([key, description]) => (
                <Card 
                  key={key}
                  className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 cursor-pointer transition-all"
                  onClick={() => setExpandedFeature(expandedFeature === key ? null : key)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </CardTitle>
                      {expandedFeature === key ? (
                        <ChevronUp className="w-5 h-5 text-purple-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-400">{description}</p>
                    {expandedFeature === key && (
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <p className="text-sm text-purple-400 font-semibold mb-2">
                          AURA-X Implementation:
                        </p>
                        <ul className="text-sm text-gray-300 space-y-1">
                          {key === 'endToEnd' && (
                            <>
                              <li>• Prompt → Parameter Extraction → GPU Allocation</li>
                              <li>• Model Inference → S3 Upload → Webhook Delivery</li>
                              <li>• Zero intermediate human decisions required</li>
                            </>
                          )}
                          {key === 'realTimeAdaptive' && (
                            <>
                              <li>• Queue position tracking with wait time estimation</li>
                              <li>• Dynamic timeout adjustment based on GPU load</li>
                              <li>• Automatic retry with exponential backoff</li>
                            </>
                          )}
                          {key === 'selfHealing' && (
                            <>
                              <li>• Webhook retry with format compatibility detection</li>
                              <li>• S3 upload error recovery (ACL, bucket policy)</li>
                              <li>• Database consistency auto-correction</li>
                            </>
                          )}
                          {key === 'multiSystem' && (
                            <>
                              <li>• Modal.com GPU compute orchestration</li>
                              <li>• AWS S3 distributed storage management</li>
                              <li>• MySQL/TiDB transactional coordination</li>
                              <li>• WebSocket real-time event streaming</li>
                            </>
                          )}
                          {key === 'predictiveAnalytics' && (
                            <>
                              <li>• Success rate trending with anomaly detection</li>
                              <li>• Completion time moving average calculation</li>
                              <li>• Optimal generation timing prediction</li>
                            </>
                          )}
                          {key === 'zeroTouch' && (
                            <>
                              <li>• Automatic model caching (musicgen-small 1.5GB)</li>
                              <li>• OAuth token auto-refresh via Manus platform</li>
                              <li>• Failed generation auto-expiration</li>
                            </>
                          )}
                          {key === 'safetyValidation' && (
                            <>
                              <li>• Zod schema input validation at API boundaries</li>
                              <li>• protectedProcedure authentication guards</li>
                              <li>• Queue-based rate limiting</li>
                              <li>• Complete audit trail with timestamps</li>
                            </>
                          )}
                          {key === 'culturalIntelligence' && (
                            <>
                              <li>• Auto-set 112 BPM for authentic Amapiano</li>
                              <li>• F minor key signature optimization</li>
                              <li>• Log drum pattern recognition</li>
                              <li>• South African house music style consistency</li>
                            </>
                          )}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <PerformanceMetricsChart />

        {/* Video Demo */}
        <VideoDemo />

        {/* Pricing Comparison */}
        <PricingComparison />

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-purple-500/50">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Experience Level 5 Autonomy
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join the future of AI music production. Generate authentic Amapiano tracks
              with zero manual intervention—just like a self-driving car takes you from A to B.
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
              >
                <Zap className="w-5 h-5 mr-2" />
                Start Generating
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
              >
                <Clock className="w-5 h-5 mr-2" />
                View Analytics Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
