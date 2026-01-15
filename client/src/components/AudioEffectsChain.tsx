import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Power, ChevronDown, ChevronUp } from 'lucide-react';

export type EffectType = 'eq' | 'compressor' | 'reverb' | 'delay' | 'limiter' | 'distortion';

export interface Effect {
  id: string;
  type: EffectType;
  enabled: boolean;
  parameters: Record<string, number>;
}

interface AudioEffectsChainProps {
  trackId?: number;
  isMaster?: boolean;
  effects: Effect[];
  onChange: (effects: Effect[]) => void;
}

const effectTemplates: Record<EffectType, { name: string; icon: string; defaultParams: Record<string, number> }> = {
  eq: {
    name: 'Equalizer',
    icon: '🎚️',
    defaultParams: {
      lowGain: 0,
      midGain: 0,
      highGain: 0,
      lowFreq: 100,
      midFreq: 1000,
      highFreq: 8000,
    },
  },
  compressor: {
    name: 'Compressor',
    icon: '🎛️',
    defaultParams: {
      threshold: -24,
      ratio: 4,
      attack: 10,
      release: 100,
      makeupGain: 0,
    },
  },
  reverb: {
    name: 'Reverb',
    icon: '🌊',
    defaultParams: {
      roomSize: 0.5,
      damping: 0.5,
      wetLevel: 0.3,
      dryLevel: 0.7,
      width: 1.0,
    },
  },
  delay: {
    name: 'Delay',
    icon: '⏱️',
    defaultParams: {
      delayTime: 500,
      feedback: 0.3,
      wetLevel: 0.3,
      dryLevel: 0.7,
      pingPong: 0,
    },
  },
  limiter: {
    name: 'Limiter',
    icon: '🔒',
    defaultParams: {
      threshold: -1,
      release: 50,
      ceiling: 0,
    },
  },
  distortion: {
    name: 'Distortion',
    icon: '🔥',
    defaultParams: {
      drive: 0.5,
      tone: 0.5,
      wetLevel: 0.5,
      dryLevel: 0.5,
    },
  },
};

export default function AudioEffectsChain({ trackId, isMaster, effects, onChange }: AudioEffectsChainProps) {
  const [expandedEffect, setExpandedEffect] = useState<string | null>(null);

  const addEffect = (type: EffectType) => {
    const newEffect: Effect = {
      id: `${type}-${Date.now()}`,
      type,
      enabled: true,
      parameters: { ...effectTemplates[type].defaultParams },
    };
    onChange([...effects, newEffect]);
  };

  const removeEffect = (id: string) => {
    onChange(effects.filter(e => e.id !== id));
  };

  const toggleEffect = (id: string) => {
    onChange(effects.map(e => e.id === id ? { ...e, enabled: !e.enabled } : e));
  };

  const updateParameter = (id: string, param: string, value: number) => {
    onChange(effects.map(e => 
      e.id === id 
        ? { ...e, parameters: { ...e.parameters, [param]: value } }
        : e
    ));
  };

  const renderEffectControls = (effect: Effect) => {
    const template = effectTemplates[effect.type];
    
    return (
      <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
        {Object.entries(effect.parameters).map(([param, value]) => {
          // Determine parameter range and unit
          let min = 0, max = 1, step = 0.01, unit = '';
          
          if (param.includes('Gain') || param === 'threshold' || param === 'makeupGain') {
            min = -24; max = 24; step = 0.1; unit = ' dB';
          } else if (param.includes('Freq')) {
            min = 20; max = 20000; step = 1; unit = ' Hz';
          } else if (param === 'ratio') {
            min = 1; max = 20; step = 0.1; unit = ':1';
          } else if (param.includes('Time') || param.includes('attack') || param.includes('release')) {
            min = 0; max = 1000; step = 1; unit = ' ms';
          } else if (param === 'ceiling') {
            min = -12; max = 0; step = 0.1; unit = ' dB';
          }
          
          return (
            <div key={param} className="space-y-2">
              <div className="flex justify-between text-sm">
                <label className="text-muted-foreground capitalize">
                  {param.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <span className="font-mono text-primary">{value.toFixed(2)}{unit}</span>
              </div>
              <Slider
                value={[value]}
                onValueChange={([v]) => updateParameter(effect.id, param, v)}
                min={min}
                max={max}
                step={step}
                className="w-full"
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">
            {isMaster ? 'Master Effects' : `Track ${trackId} Effects`}
          </h3>
          <span className="text-xs text-muted-foreground">
            {effects.length} effect{effects.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <Select onValueChange={(value) => addEffect(value as EffectType)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Add Effect" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(effectTemplates).map(([type, template]) => (
              <SelectItem key={type} value={type}>
                <span className="flex items-center gap-2">
                  <span>{template.icon}</span>
                  <span>{template.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {effects.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No effects added yet</p>
          <p className="text-sm mt-2">Click "Add Effect" to start building your chain</p>
        </div>
      ) : (
        <div className="space-y-2">
          {effects.map((effect, index) => {
            const template = effectTemplates[effect.type];
            const isExpanded = expandedEffect === effect.id;
            
            return (
              <div key={effect.id} className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 p-3 bg-card hover:bg-muted/50 transition-colors">
                  <span className="text-2xl">{template.icon}</span>
                  
                  <div className="flex-1">
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Position {index + 1} in chain
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={effect.enabled ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleEffect(effect.id)}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setExpandedEffect(isExpanded ? null : effect.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeEffect(effect.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {isExpanded && renderEffectControls(effect)}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
