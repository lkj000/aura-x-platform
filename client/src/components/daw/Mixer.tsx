import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { 
  Mic2, 
  Volume2, 
  VolumeX, 
  Activity,
  MoreVertical,
  Power
} from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  volume: number; // 0-100
  pan: number; // -50 to 50
  muted: boolean;
  soloed: boolean;
  color: string;
  meterLevel: number; // 0-100 (simulated)
}

const INITIAL_CHANNELS: Channel[] = [
  { id: '1', name: 'Log Drum', volume: 85, pan: 0, muted: false, soloed: false, color: '#8b5cf6', meterLevel: 70 },
  { id: '2', name: 'Shakers', volume: 70, pan: -15, muted: false, soloed: false, color: '#f59e0b', meterLevel: 60 },
  { id: '3', name: 'Kick', volume: 90, pan: 0, muted: false, soloed: false, color: '#ef4444', meterLevel: 80 },
  { id: '4', name: 'Snare', volume: 75, pan: 10, muted: false, soloed: false, color: '#ec4899', meterLevel: 50 },
  { id: '5', name: 'Rhodes', volume: 65, pan: 25, muted: false, soloed: false, color: '#3b82f6', meterLevel: 40 },
  { id: '6', name: 'Sax', volume: 80, pan: -20, muted: false, soloed: false, color: '#10b981', meterLevel: 45 },
  { id: '7', name: 'Vocals', volume: 95, pan: 0, muted: false, soloed: false, color: '#6366f1', meterLevel: 85 },
  { id: '8', name: 'Master', volume: 90, pan: 0, muted: false, soloed: false, color: '#ffffff', meterLevel: 75 },
];

export default function Mixer() {
  const [channels, setChannels] = useState<Channel[]>(INITIAL_CHANNELS);

  const updateChannel = (id: string, updates: Partial<Channel>) => {
    setChannels(channels.map(ch => ch.id === id ? { ...ch, ...updates } : ch));
  };

  return (
    <div className="h-full bg-card border border-border rounded-lg flex flex-col shadow-lg overflow-hidden">
      {/* Header */}
      <div className="h-10 border-b border-border bg-muted/30 flex items-center justify-between px-4">
        <span className="font-bold text-sm text-muted-foreground">MIXER</span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="h-6 text-xs">Reset</Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs">Presets</Button>
        </div>
      </div>

      {/* Channels Container */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-2 h-full min-w-max">
          {channels.map((channel) => (
            <ChannelStrip 
              key={channel.id} 
              channel={channel} 
              onChange={(updates) => updateChannel(channel.id, updates)}
              isMaster={channel.name === 'Master'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ChannelStripProps {
  channel: Channel;
  onChange: (updates: Partial<Channel>) => void;
  isMaster?: boolean;
}

function ChannelStrip({ channel, onChange, isMaster }: ChannelStripProps) {
  return (
    <div className={cn(
      "w-24 bg-background border border-border rounded-md flex flex-col p-2 relative group transition-all",
      isMaster ? "border-primary/50 bg-primary/5 w-28" : "hover:border-primary/30"
    )}>
      {/* Top Controls */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex justify-between items-center">
          <div 
            className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]"
            style={{ color: channel.color, backgroundColor: channel.color }}
          />
          <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground">
            <MoreVertical className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Pan Knob (Simulated) */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full border-2 border-muted flex items-center justify-center relative cursor-pointer hover:border-primary transition-colors">
            <div 
              className="w-1 h-4 bg-primary rounded-full absolute top-1"
              style={{ transform: `rotate(${channel.pan * 1.8}deg)`, transformOrigin: 'bottom center' }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            {channel.pan === 0 ? 'C' : channel.pan > 0 ? `R${channel.pan}` : `L${Math.abs(channel.pan)}`}
          </span>
        </div>
      </div>

      {/* Fader Area */}
      <div className="flex-1 flex justify-center gap-3 relative py-2 bg-muted/10 rounded-sm border border-border/30">
        {/* Meter */}
        <div className="w-2 h-full bg-muted/30 rounded-full overflow-hidden flex flex-col justify-end relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between py-1 opacity-20 pointer-events-none">
            {[...Array(10)].map((_, i) => <div key={i} className="w-full h-px bg-white" />)}
          </div>
          
          {/* Level */}
          <div 
            className="w-full transition-all duration-100 ease-out"
            style={{ 
              height: `${channel.meterLevel}%`,
              backgroundColor: channel.meterLevel > 90 ? '#ef4444' : channel.color 
            }}
          />
        </div>

        {/* Fader */}
        <div className="h-full py-2">
          <Slider
            orientation="vertical"
            value={[channel.volume]}
            max={100}
            step={1}
            onValueChange={([v]) => onChange({ volume: v })}
            className="h-full"
          />
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="mt-4 flex flex-col gap-2">
        <div className="flex gap-1 justify-center">
          <Button 
            size="sm" 
            variant={channel.muted ? "destructive" : "secondary"}
            className={cn("h-6 w-8 text-[10px] p-0", channel.muted && "glow-secondary")}
            onClick={() => onChange({ muted: !channel.muted })}
          >
            M
          </Button>
          <Button 
            size="sm" 
            variant={channel.soloed ? "default" : "secondary"}
            className={cn("h-6 w-8 text-[10px] p-0 bg-yellow-500 hover:bg-yellow-600 text-black", !channel.soloed && "bg-muted text-muted-foreground")}
            onClick={() => onChange({ soloed: !channel.soloed })}
          >
            S
          </Button>
        </div>

        <div className="bg-black/40 rounded px-1 py-0.5 text-center border border-border/50">
          <span className="text-xs font-mono text-primary font-bold">
            {channel.volume === 0 ? '-inf' : `${(channel.volume - 80).toFixed(1)}`}
          </span>
        </div>

        <div className="text-center truncate px-1">
          <span className={cn("text-xs font-medium", isMaster && "text-primary")}>
            {channel.name}
          </span>
        </div>
      </div>
    </div>
  );
}
