import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Lock, 
  Unlock, 
  RefreshCw, 
  Copy, 
  Check, 
  History,
  Settings2,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GenerationParams {
  seed: number | null;
  temperature: number;
  topK: number;
  topP: number;
  cfgScale: number;
  steps: number;
}

interface GenerationControlsProps {
  onGenerate: (params: GenerationParams) => void;
  isGenerating?: boolean;
}

export default function GenerationControls({ onGenerate, isGenerating = false }: GenerationControlsProps) {
  const [seedLocked, setSeedLocked] = useState(false);
  const [customSeed, setCustomSeed] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [params, setParams] = useState<GenerationParams>({
    seed: null,
    temperature: 0.8,
    topK: 50,
    topP: 0.95,
    cfgScale: 7.5,
    steps: 50,
  });

  const generateRandomSeed = () => {
    return Math.floor(Math.random() * 2147483647);
  };

  const handleGenerateSeed = () => {
    const newSeed = generateRandomSeed();
    setCustomSeed(newSeed.toString());
    setParams({ ...params, seed: newSeed });
  };

  const handleToggleSeedLock = () => {
    if (!seedLocked && !customSeed) {
      handleGenerateSeed();
    }
    setSeedLocked(!seedLocked);
  };

  const handleSeedInput = (value: string) => {
    setCustomSeed(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 2147483647) {
      setParams({ ...params, seed: numValue });
    } else if (value === '') {
      setParams({ ...params, seed: null });
    }
  };

  const handleCopySeed = () => {
    if (customSeed) {
      navigator.clipboard.writeText(customSeed);
      setCopied(true);
      toast.success('Seed copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerate = () => {
    const finalParams = {
      ...params,
      seed: seedLocked && customSeed ? parseInt(customSeed) : generateRandomSeed(),
    };
    
    if (!seedLocked) {
      setCustomSeed(finalParams.seed!.toString());
    }
    
    onGenerate(finalParams);
  };

  const handleRegenerateWithSameSettings = () => {
    if (!customSeed) {
      toast.error('No previous generation to reproduce');
      return;
    }
    
    onGenerate({
      ...params,
      seed: parseInt(customSeed),
    });
    
    toast.success('Regenerating with exact same parameters');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generation Controls
            </CardTitle>
            <CardDescription>
              Configure AI generation parameters for reproducible results
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/50">
            Deterministic Mode
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seed Control Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-semibold">Seed Control</Label>
              <p className="text-xs text-muted-foreground">
                Lock seed for exact reproducibility
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleSeedLock}
                    className={seedLocked ? 'text-primary' : 'text-muted-foreground'}
                  >
                    {seedLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {seedLocked ? 'Unlock seed' : 'Lock seed'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Random seed (0-2147483647)"
                value={customSeed}
                onChange={(e) => handleSeedInput(e.target.value)}
                disabled={!seedLocked}
                min={0}
                max={2147483647}
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleGenerateSeed}
                  disabled={!seedLocked}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generate random seed</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopySeed}
                  disabled={!customSeed}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy seed</TooltipContent>
            </Tooltip>
          </div>

          {seedLocked && customSeed && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Lock className="h-4 w-4 text-primary" />
              <p className="text-xs text-primary font-medium">
                Seed locked: All generations will use seed {customSeed}
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Advanced Parameters */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Advanced Parameters</Label>
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature" className="text-sm">
                Temperature
                <span className="text-muted-foreground ml-2">{params.temperature}</span>
              </Label>
              <Input
                id="temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={params.temperature}
                onChange={(e) => setParams({ ...params, temperature: parseFloat(e.target.value) })}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Controls randomness (0=deterministic, 2=creative)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cfg-scale" className="text-sm">
                CFG Scale
                <span className="text-muted-foreground ml-2">{params.cfgScale}</span>
              </Label>
              <Input
                id="cfg-scale"
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={params.cfgScale}
                onChange={(e) => setParams({ ...params, cfgScale: parseFloat(e.target.value) })}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                How closely to follow the prompt
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="top-k" className="text-sm">
                Top-K
                <span className="text-muted-foreground ml-2">{params.topK}</span>
              </Label>
              <Input
                id="top-k"
                type="range"
                min="1"
                max="100"
                step="1"
                value={params.topK}
                onChange={(e) => setParams({ ...params, topK: parseInt(e.target.value) })}
                className="cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="top-p" className="text-sm">
                Top-P
                <span className="text-muted-foreground ml-2">{params.topP}</span>
              </Label>
              <Input
                id="top-p"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={params.topP}
                onChange={(e) => setParams({ ...params, topP: parseFloat(e.target.value) })}
                className="cursor-pointer"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1 bg-gradient-to-r from-primary to-secondary"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Music
              </>
            )}
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRegenerateWithSameSettings}
                disabled={!customSeed || isGenerating}
              >
                <History className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Regenerate with same settings</TooltipContent>
          </Tooltip>
        </div>

        {customSeed && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs font-mono text-muted-foreground">
              <span className="font-semibold">Last Generation Parameters:</span>
              <br />
              Seed: {customSeed} | Temp: {params.temperature} | CFG: {params.cfgScale} | Steps: {params.steps}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
