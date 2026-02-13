import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingDown, Calculator, Zap, Check, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

interface PricingTier {
  name: string;
  platform: string;
  model: 'pay-per-use' | 'subscription' | 'self-hosted';
  costPerGeneration: number;
  monthlyBase?: number;
  includedGenerations?: number;
  features: string[];
  limitations: string[];
  color: string;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'AURA-X Pro',
    platform: 'AURA-X',
    model: 'pay-per-use',
    costPerGeneration: 0.15,
    features: [
      'Level 5 autonomous operation',
      'Self-healing error recovery',
      'Real-time progress tracking',
      'Cultural intelligence (Amapiano)',
      'Webhook delivery',
      'Priority GPU allocation',
      'Analytics dashboard',
      'API access',
    ],
    limitations: [],
    color: 'from-purple-500 to-pink-500',
  },
  {
    name: 'Suno Pro',
    platform: 'Suno AI',
    model: 'subscription',
    costPerGeneration: 0.25,
    monthlyBase: 24,
    includedGenerations: 500,
    features: [
      'AI music generation',
      'Manual parameter tuning',
      'Basic progress tracking',
      'Download access',
    ],
    limitations: [
      'Manual intervention required',
      'Limited error recovery',
      'No API access',
      'No webhook delivery',
    ],
    color: 'from-orange-500 to-orange-600',
  },
  {
    name: 'Udio Standard',
    platform: 'Udio',
    model: 'subscription',
    costPerGeneration: 0.30,
    monthlyBase: 30,
    includedGenerations: 1200,
    features: [
      'Text-to-music generation',
      'Iterative refinement',
      'Basic download access',
    ],
    limitations: [
      'Manual workflow management',
      'No automation',
      'Limited API access',
      'No webhook support',
    ],
    color: 'from-orange-500 to-orange-600',
  },
  {
    name: 'MusicGen (Self-Hosted)',
    platform: 'MusicGen',
    model: 'self-hosted',
    costPerGeneration: 0.08,
    features: [
      'Open-source model',
      'Full control',
      'No usage limits',
    ],
    limitations: [
      'Manual deployment required',
      'No managed infrastructure',
      'No error recovery',
      'Technical expertise needed',
      'GPU costs not included',
    ],
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    name: 'Stable Audio',
    platform: 'Stable Audio',
    model: 'pay-per-use',
    costPerGeneration: 0.20,
    features: [
      'Diffusion-based generation',
      'High-quality audio',
      'API access',
    ],
    limitations: [
      'Manual workflow',
      'No automation',
      'Limited error handling',
    ],
    color: 'from-cyan-500 to-cyan-600',
  },
];

export default function PricingComparison() {
  const [monthlyGenerations, setMonthlyGenerations] = useState(100);

  const calculateMonthlyCost = (tier: PricingTier, generations: number) => {
    if (tier.model === 'subscription' && tier.monthlyBase && tier.includedGenerations) {
      if (generations <= tier.includedGenerations) {
        return tier.monthlyBase;
      }
      const overage = generations - tier.includedGenerations;
      return tier.monthlyBase + (overage * tier.costPerGeneration);
    }
    if (tier.model === 'self-hosted') {
      // Estimate GPU costs for self-hosted (A10G GPU ~$0.50/hr, assume 1min per generation)
      const gpuCost = (generations * 4) / 60 * 0.50; // 4min avg per generation
      const generationCost = generations * tier.costPerGeneration;
      return gpuCost + generationCost;
    }
    return generations * tier.costPerGeneration;
  };

  const auraXCost = calculateMonthlyCost(pricingTiers[0], monthlyGenerations);
  const sunoCost = calculateMonthlyCost(pricingTiers[1], monthlyGenerations);
  const udioCost = calculateMonthlyCost(pricingTiers[2], monthlyGenerations);
  const musicGenCost = calculateMonthlyCost(pricingTiers[3], monthlyGenerations);
  const stableAudioCost = calculateMonthlyCost(pricingTiers[4], monthlyGenerations);

  const monthlySavings = sunoCost - auraXCost;
  const annualSavings = monthlySavings * 12;
  const savingsPercentage = ((monthlySavings / sunoCost) * 100).toFixed(0);

  return (
    <div className="w-full py-16 px-4 bg-gradient-to-b from-purple-950/10 to-background">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
            <DollarSign className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Pricing Analysis</span>
          </div>
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Cost-Effective Level 5 Autonomy
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Compare total cost of ownership across platforms and pricing models
          </p>
        </div>

        {/* ROI Calculator */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-purple-400" />
              <CardTitle>ROI Calculator</CardTitle>
            </div>
            <CardDescription>Adjust monthly generation volume to see cost comparison</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium">Monthly Generations</label>
                <Badge variant="outline" className="text-lg font-bold">
                  {monthlyGenerations}
                </Badge>
              </div>
              <Slider
                value={[monthlyGenerations]}
                onValueChange={(value) => setMonthlyGenerations(value[0])}
                min={10}
                max={1000}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>10</span>
                <span>500</span>
                <span>1000</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-border/50">
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  ${auraXCost.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">AURA-X monthly cost</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  ${monthlySavings.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">Monthly savings vs Suno</p>
                <p className="text-xs text-green-400 mt-1">{savingsPercentage}% cheaper</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  ${annualSavings.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">Annual savings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Comparison Table */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {pricingTiers.map((tier) => {
            const monthlyCost = calculateMonthlyCost(tier, monthlyGenerations);
            const isAuraX = tier.platform === 'AURA-X';

            return (
              <Card
                key={tier.name}
                className={`${isAuraX ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/50 ring-2 ring-purple-500/20' : 'bg-card/50 backdrop-blur-sm border-border/50'}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                    {isAuraX && (
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
                        Best Value
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="capitalize">{tier.model} model</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4 border-y border-border/50">
                    <div className={`text-4xl font-bold mb-2 ${isAuraX ? 'bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent' : ''}`}>
                      ${monthlyCost.toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      per month ({monthlyGenerations} generations)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ${tier.costPerGeneration.toFixed(2)} per generation
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-muted-foreground">Features:</p>
                    {tier.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {tier.limitations.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-muted-foreground">Limitations:</p>
                      {tier.limitations.map((limitation, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <X className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <span>{limitation}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Cost Breakdown */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-green-400" />
              <CardTitle>Monthly Cost Comparison ({monthlyGenerations} generations)</CardTitle>
            </div>
            <CardDescription>Total cost including base fees and overage charges</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: 'AURA-X', cost: auraXCost, color: 'from-purple-500 to-pink-500' },
              { name: 'Suno AI', cost: sunoCost, color: 'from-orange-500 to-orange-600' },
              { name: 'Udio', cost: udioCost, color: 'from-orange-500 to-orange-600' },
              { name: 'MusicGen', cost: musicGenCost, color: 'from-cyan-500 to-cyan-600' },
              { name: 'Stable Audio', cost: stableAudioCost, color: 'from-cyan-500 to-cyan-600' },
            ].map((platform) => {
              const maxCost = Math.max(auraXCost, sunoCost, udioCost, musicGenCost, stableAudioCost);
              const isLowest = platform.cost === Math.min(auraXCost, sunoCost, udioCost, musicGenCost, stableAudioCost);

              return (
                <div key={platform.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{platform.name}</span>
                    <span className="text-muted-foreground">${platform.cost.toFixed(2)}/mo</span>
                  </div>
                  <div className="relative h-8 bg-muted/30 rounded-md overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${platform.color} transition-all duration-700 ease-out flex items-center justify-end px-3`}
                      style={{ width: `${(platform.cost / maxCost) * 100}%` }}
                    >
                      {isLowest && (
                        <span className="text-xs font-bold text-white">Lowest</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                <Zap className="inline h-3 w-3 mr-1 text-purple-400" />
                AURA-X offers the best value with Level 5 autonomy and {savingsPercentage}% cost savings vs Suno AI
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground">
            Pricing data as of Jan 2026 | MusicGen costs include estimated GPU infrastructure (A10G @ $0.50/hr)
          </p>
        </div>
      </div>
    </div>
  );
}
