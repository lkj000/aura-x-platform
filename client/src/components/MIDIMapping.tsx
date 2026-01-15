import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Radio } from 'lucide-react';
import { midiController, type MIDIDevice, type MIDIMapping, type MIDIMessage } from '@/services/MIDIController';
import { toast } from 'sonner';

export default function MIDIMappingPanel() {
  const [devices, setDevices] = useState<MIDIDevice[]>([]);
  const [mappings, setMappings] = useState<MIDIMapping[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [learning, setLearning] = useState(false);
  const [lastMessage, setLastMessage] = useState<MIDIMessage | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize MIDI
    midiController.initialize().then((success) => {
      if (success) {
        setInitialized(true);
        setDevices(midiController.getDevices());
        setMappings(midiController.getMappings());
        toast.success('MIDI Controller initialized');
      } else {
        toast.error('MIDI not supported in this browser');
      }
    });

    // Subscribe to device changes
    const unsubDevice = midiController.onDeviceChange((device) => {
      setDevices(midiController.getDevices());
      toast.info(`MIDI device ${device.state}: ${device.name}`);
    });

    // Subscribe to MIDI messages
    const unsubMessage = midiController.onMessage((message) => {
      setLastMessage(message);
    });

    return () => {
      unsubDevice();
      unsubMessage();
    };
  }, []);

  const handleLearnMapping = async (parameter: string) => {
    setLearning(true);
    toast.info('Move a controller on your MIDI device...');

    try {
      const controller = await midiController.enterLearnMode();
      
      // Add mapping
      const id = midiController.addMapping({
        deviceId: selectedDevice,
        controller,
        parameter,
        min: 0,
        max: 1,
        curve: 'linear',
      });

      setMappings(midiController.getMappings());
      toast.success(`Mapped CC${controller} to ${parameter}`);
    } catch (error) {
      toast.error('MIDI learn cancelled');
    } finally {
      setLearning(false);
    }
  };

  const handleRemoveMapping = (id: string) => {
    midiController.removeMapping(id);
    setMappings(midiController.getMappings());
    toast.success('Mapping removed');
  };

  const handleClearMappings = () => {
    midiController.clearMappings();
    setMappings([]);
    toast.success('All mappings cleared');
  };

  const inputDevices = devices.filter(d => d.type === 'input' && d.state === 'connected');

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">MIDI Controller</h3>
        <p className="text-sm text-muted-foreground">
          Connect hardware MIDI controllers to control DAW parameters
        </p>
      </div>

      {!initialized ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Initializing MIDI...</p>
        </div>
      ) : inputDevices.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No MIDI devices connected</p>
          <p className="text-xs mt-2">Connect a MIDI controller and refresh the page</p>
        </div>
      ) : (
        <>
          {/* Device Selection */}
          <div className="space-y-2">
            <Label>MIDI Input Device</Label>
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger>
                <SelectValue placeholder="Select a device" />
              </SelectTrigger>
              <SelectContent>
                {inputDevices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name} ({device.manufacturer})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Last Message */}
          {lastMessage && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last MIDI Message:</span>
                <div className="flex items-center gap-2">
                  {lastMessage.controller !== undefined && (
                    <Badge variant="outline">CC{lastMessage.controller}</Badge>
                  )}
                  {lastMessage.note !== undefined && (
                    <Badge variant="outline">Note {lastMessage.note}</Badge>
                  )}
                  {lastMessage.value !== undefined && (
                    <Badge variant="outline">Value {lastMessage.value}</Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick Map Buttons */}
          <div className="space-y-2">
            <Label>Quick Map Parameters</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Master Volume', param: 'master.volume' },
                { label: 'Track 1 Volume', param: 'track1.volume' },
                { label: 'Track 2 Volume', param: 'track2.volume' },
                { label: 'Tempo', param: 'tempo' },
                { label: 'EQ Low', param: 'eq.low' },
                { label: 'EQ Mid', param: 'eq.mid' },
                { label: 'EQ High', param: 'eq.high' },
                { label: 'Reverb Mix', param: 'reverb.mix' },
              ].map(({ label, param }) => (
                <Button
                  key={param}
                  variant="outline"
                  size="sm"
                  onClick={() => handleLearnMapping(param)}
                  disabled={!selectedDevice || learning}
                  className="justify-start"
                >
                  {learning ? (
                    <>
                      <Radio className="w-3 h-3 mr-2 animate-pulse" />
                      Learning...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3 mr-2" />
                      {label}
                    </>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Mappings List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Active Mappings ({mappings.length})</Label>
              {mappings.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearMappings}
                  className="h-8 text-xs"
                >
                  Clear All
                </Button>
              )}
            </div>

            {mappings.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No mappings yet. Click a parameter above to start mapping.
              </div>
            ) : (
              <div className="space-y-2">
                {mappings.map((mapping) => (
                  <div
                    key={mapping.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">CC{mapping.controller}</Badge>
                        <span className="text-sm font-medium">{mapping.parameter}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Range: {mapping.min} - {mapping.max} | Curve: {mapping.curve}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleRemoveMapping(mapping.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
