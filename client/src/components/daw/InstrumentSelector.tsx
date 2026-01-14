import React, { useState } from 'react';
import { 
  Plus, 
  X, 
  Settings, 
  Wand2, 
  Sparkles,
  Music,
  Mic2,
  Guitar,
  Drum,
  Piano
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface Instrument {
  id: string;
  name: string;
  category: 'bass' | 'percussion' | 'keys' | 'strings' | 'brass' | 'synth' | 'vocal';
  description: string;
  isCore: boolean;
  icon: React.ElementType;
}

export interface InstrumentSpec {
  instrument: Instrument;
  presence: number; // 0.0 to 1.0
  style: string;
  processing: Record<string, number>;
}

// Mock Data
const AVAILABLE_INSTRUMENTS: Instrument[] = [
  { id: 'log_drum', name: 'Log Drum', category: 'bass', description: 'The signature Amapiano bass sound', isCore: true, icon: Drum },
  { id: 'shakers', name: 'Shakers', category: 'percussion', description: 'Continuous rolling groove', isCore: true, icon: Music },
  { id: 'rhodes', name: 'Rhodes', category: 'keys', description: 'Jazzy electric piano chords', isCore: true, icon: Piano },
  { id: 'sax', name: 'Saxophone', category: 'brass', description: 'Soulful jazz leads', isCore: false, icon: Mic2 },
  { id: 'guitar', name: 'Electric Guitar', category: 'strings', description: 'Clean, honeyed licks', isCore: false, icon: Guitar },
  { id: 'vocals', name: 'Vocals', category: 'vocal', description: 'Ad-libs and hooks', isCore: false, icon: Mic2 },
];

// ============================================================================
// Main Component
// ============================================================================

export default function InstrumentSelector() {
  const [selectedInstruments, setSelectedInstruments] = useState<InstrumentSpec[]>([
    { instrument: AVAILABLE_INSTRUMENTS[0], presence: 1.0, style: 'Punchy', processing: { reverb: 0.2 } },
    { instrument: AVAILABLE_INSTRUMENTS[1], presence: 0.8, style: 'Loose', processing: { reverb: 0.1 } },
    { instrument: AVAILABLE_INSTRUMENTS[2], presence: 0.9, style: 'Jazzy', processing: { reverb: 0.4 } },
  ]);
  const [isAutoMode, setIsAutoMode] = useState(false);

  const addInstrument = (instrument: Instrument) => {
    const newSpec: InstrumentSpec = {
      instrument,
      presence: 0.8,
      style: 'Standard',
      processing: { reverb: 0.2 },
    };
    setSelectedInstruments([...selectedInstruments, newSpec]);
  };

  const removeInstrument = (index: number) => {
    setSelectedInstruments(selectedInstruments.filter((_, i) => i !== index));
  };

  const updateInstrument = (index: number, updates: Partial<InstrumentSpec>) => {
    setSelectedInstruments(selectedInstruments.map((spec, i) => 
      i === index ? { ...spec, ...updates } : spec
    ));
  };

  // Autonomous Agent Simulation
  const triggerAutoSelection = () => {
    setIsAutoMode(true);
    // Simulate AI thinking
    setTimeout(() => {
      const autoSelection: InstrumentSpec[] = [
        { instrument: AVAILABLE_INSTRUMENTS[0], presence: 1.0, style: 'Aggressive', processing: { distortion: 0.3, reverb: 0.1 } },
        { instrument: AVAILABLE_INSTRUMENTS[1], presence: 0.7, style: 'Tight', processing: { reverb: 0.1 } },
        { instrument: AVAILABLE_INSTRUMENTS[3], presence: 0.9, style: 'Soulful', processing: { reverb: 0.5 } },
      ];
      setSelectedInstruments(autoSelection);
      setIsAutoMode(false);
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col bg-background/50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Music className="h-6 w-6 text-primary" />
            Instrument Agent
          </h2>
          <p className="text-muted-foreground text-sm">
            Configure your ensemble or let the AI decide.
          </p>
        </div>
        
        <Button 
          onClick={triggerAutoSelection}
          disabled={isAutoMode}
          className={cn(
            "gap-2 transition-all duration-500",
            isAutoMode ? "bg-primary/20 text-primary animate-pulse" : "bg-gradient-to-r from-primary to-secondary text-white"
          )}
        >
          {isAutoMode ? (
            <>
              <Sparkles className="h-4 w-4 animate-spin" />
              AI Configuring...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              Auto-Configure
            </>
          )}
        </Button>
      </div>

      {/* Instrument Grid */}
      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
          {selectedInstruments.map((spec, index) => (
            <InstrumentCard
              key={index}
              spec={spec}
              onRemove={() => removeInstrument(index)}
              onChange={(updates) => updateInstrument(index, updates)}
            />
          ))}
          
          {/* Add New Card */}
          <button 
            className="h-[200px] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all group"
            onClick={() => addInstrument(AVAILABLE_INSTRUMENTS[4])} // Simplified for demo
          >
            <div className="h-12 w-12 rounded-full bg-muted group-hover:bg-primary/20 flex items-center justify-center transition-colors">
              <Plus className="h-6 w-6" />
            </div>
            <span className="font-medium">Add Instrument</span>
          </button>
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Instrument Card Component
// ============================================================================

interface InstrumentCardProps {
  spec: InstrumentSpec;
  onRemove: () => void;
  onChange: (updates: Partial<InstrumentSpec>) => void;
}

function InstrumentCard({ spec, onRemove, onChange }: InstrumentCardProps) {
  const Icon = spec.instrument.icon;

  return (
    <div className="bg-card border border-border rounded-xl p-4 relative group hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-none mb-1">{spec.instrument.name}</h3>
            <Badge variant="secondary" className="text-[10px] h-5">
              {spec.instrument.category}
            </Badge>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Presence Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-muted-foreground">
            <span>Presence</span>
            <span>{Math.round(spec.presence * 100)}%</span>
          </div>
          <Slider
            value={[spec.presence * 100]}
            max={100}
            step={1}
            onValueChange={([v]) => onChange({ presence: v / 100 })}
            className="[&_.range-thumb]:h-4 [&_.range-thumb]:w-4"
          />
        </div>

        {/* Style Selector */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Style</span>
          <Select 
            value={spec.style} 
            onValueChange={(v) => onChange({ style: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Standard">Standard</SelectItem>
              <SelectItem value="Soulful">Soulful</SelectItem>
              <SelectItem value="Aggressive">Aggressive</SelectItem>
              <SelectItem value="Punchy">Punchy</SelectItem>
              <SelectItem value="Loose">Loose</SelectItem>
              <SelectItem value="Jazzy">Jazzy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Core Badge */}
      {spec.instrument.isCore && (
        <div className="absolute -top-2 -right-2">
          <span className="flex h-4 w-4 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-primary"></span>
          </span>
        </div>
      )}
    </div>
  );
}

function Badge({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
      variant === 'secondary' 
        ? "bg-secondary/10 text-secondary ring-secondary/20" 
        : "bg-primary/10 text-primary ring-primary/20",
      className
    )}>
      {children}
    </span>
  );
}
