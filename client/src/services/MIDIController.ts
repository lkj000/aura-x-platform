/**
 * MIDI Controller Service
 * Provides Web MIDI API integration for hardware controller support
 */

export interface MIDIDevice {
  id: string;
  name: string;
  manufacturer: string;
  state: 'connected' | 'disconnected';
  type: 'input' | 'output';
}

export interface MIDIMessage {
  command: number;
  channel: number;
  note?: number;
  velocity?: number;
  controller?: number;
  value?: number;
  timestamp: number;
}

export interface MIDIMapping {
  id: string;
  deviceId: string;
  controller: number;
  parameter: string;
  min: number;
  max: number;
  curve: 'linear' | 'exponential' | 'logarithmic';
}

type MIDIMessageCallback = (message: MIDIMessage) => void;
type MIDIDeviceCallback = (device: MIDIDevice) => void;

type SaveCallback = (deviceId: string, mappings: MIDIMapping[]) => void;

class MIDIControllerService {
  private midiAccess: MIDIAccess | null = null;
  private inputs: Map<string, MIDIInput> = new Map();
  private outputs: Map<string, MIDIOutput> = new Map();
  private messageCallbacks: Set<MIDIMessageCallback> = new Set();
  private deviceCallbacks: Set<MIDIDeviceCallback> = new Set();
  private mappings: Map<string, MIDIMapping> = new Map();
  private learnMode: boolean = false;
  private learnCallback: ((controller: number) => void) | null = null;
  /** Debounced persist callback — set by useMIDIPersistence hook */
  private saveCallback: SaveCallback | null = null;
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Initialize Web MIDI API
   */
  async initialize(): Promise<boolean> {
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI API not supported in this browser');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      
      // Setup device listeners
      this.midiAccess.onstatechange = this.handleStateChange.bind(this);
      
      // Enumerate existing devices
      this.enumerateDevices();
      
      console.log('MIDI Controller Service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize MIDI:', error);
      return false;
    }
  }

  /**
   * Enumerate all connected MIDI devices
   */
  private enumerateDevices() {
    if (!this.midiAccess) return;

    // Clear existing
    this.inputs.clear();
    this.outputs.clear();

    // Enumerate inputs
    this.midiAccess.inputs.forEach((input) => {
      this.inputs.set(input.id, input);
      input.onmidimessage = this.handleMIDIMessage.bind(this);
      
      this.notifyDeviceChange({
        id: input.id,
        name: input.name || 'Unknown Input',
        manufacturer: input.manufacturer || 'Unknown',
        state: input.state as 'connected' | 'disconnected',
        type: 'input',
      });
    });

    // Enumerate outputs
    this.midiAccess.outputs.forEach((output) => {
      this.outputs.set(output.id, output);
      
      this.notifyDeviceChange({
        id: output.id,
        name: output.name || 'Unknown Output',
        manufacturer: output.manufacturer || 'Unknown',
        state: output.state as 'connected' | 'disconnected',
        type: 'output',
      });
    });
  }

  /**
   * Handle MIDI device state changes
   */
  private handleStateChange(event: MIDIConnectionEvent) {
    const port = event.port;
    if (!port) return;
    
    if (port.type === 'input') {
      if (port.state === 'connected') {
        this.inputs.set(port.id, port as MIDIInput);
        (port as MIDIInput).onmidimessage = this.handleMIDIMessage.bind(this);
      } else {
        this.inputs.delete(port.id);
      }
    } else {
      if (port.state === 'connected') {
        this.outputs.set(port.id, port as MIDIOutput);
      } else {
        this.outputs.delete(port.id);
      }
    }

    this.notifyDeviceChange({
      id: port.id,
      name: port.name || 'Unknown',
      manufacturer: port.manufacturer || 'Unknown',
      state: port.state as 'connected' | 'disconnected',
      type: port.type as 'input' | 'output',
    });
  }

  /**
   * Handle incoming MIDI messages
   */
  private handleMIDIMessage(event: MIDIMessageEvent) {
    if (!event.data || event.data.length < 3) return;
    const status = event.data[0];
    const data1 = event.data[1];
    const data2 = event.data[2];
    const command = status >> 4;
    const channel = status & 0x0F;

    const message: MIDIMessage = {
      command,
      channel,
      timestamp: event.timeStamp,
    };

    // Parse message type
    switch (command) {
      case 0x08: // Note Off
      case 0x09: // Note On
        message.note = data1;
        message.velocity = data2;
        break;
      case 0x0B: // Control Change
        message.controller = data1;
        message.value = data2;
        
        // Handle learn mode
        if (this.learnMode && this.learnCallback) {
          this.learnCallback(data1);
          this.learnMode = false;
          this.learnCallback = null;
        }
        
        // Check for mappings
        this.handleMappedController(data1, data2);
        break;
      case 0x0E: // Pitch Bend
        message.value = (data2 << 7) | data1;
        break;
    }

    // Notify all callbacks
    this.messageCallbacks.forEach(callback => callback(message));
  }

  /**
   * Handle mapped controller values
   */
  private handleMappedController(controller: number, value: number) {
    this.mappings.forEach((mapping) => {
      if (mapping.controller === controller) {
        // Normalize value (0-127 -> min-max)
        let normalized = value / 127;
        
        // Apply curve
        switch (mapping.curve) {
          case 'exponential':
            normalized = Math.pow(normalized, 2);
            break;
          case 'logarithmic':
            normalized = Math.log(normalized + 1) / Math.log(2);
            break;
        }
        
        const scaledValue = mapping.min + (normalized * (mapping.max - mapping.min));
        
        // Trigger parameter change event
        window.dispatchEvent(new CustomEvent('midi-parameter-change', {
          detail: {
            parameter: mapping.parameter,
            value: scaledValue,
            mappingId: mapping.id,
          },
        }));
      }
    });
  }

  /**
   * Subscribe to MIDI messages
   */
  onMessage(callback: MIDIMessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  /**
   * Subscribe to device changes
   */
  onDeviceChange(callback: MIDIDeviceCallback): () => void {
    this.deviceCallbacks.add(callback);
    return () => this.deviceCallbacks.delete(callback);
  }

  /**
   * Notify device change callbacks
   */
  private notifyDeviceChange(device: MIDIDevice) {
    this.deviceCallbacks.forEach(callback => callback(device));
  }

  /**
   * Get all connected devices
   */
  getDevices(): MIDIDevice[] {
    const devices: MIDIDevice[] = [];
    
    this.inputs.forEach((input) => {
      devices.push({
        id: input.id,
        name: input.name || 'Unknown Input',
        manufacturer: input.manufacturer || 'Unknown',
        state: input.state as 'connected' | 'disconnected',
        type: 'input',
      });
    });
    
    this.outputs.forEach((output) => {
      devices.push({
        id: output.id,
        name: output.name || 'Unknown Output',
        manufacturer: output.manufacturer || 'Unknown',
        state: output.state as 'connected' | 'disconnected',
        type: 'output',
      });
    });
    
    return devices;
  }

  /**
   * Register a debounced persist callback (set by useMIDIPersistence hook).
   * Pass null to clear.
   */
  setSaveCallback(cb: SaveCallback | null) {
    this.saveCallback = cb;
  }

  /**
   * Restore mappings from DB (called on page load by useMIDIPersistence hook).
   * Replaces any in-memory state — does NOT trigger a save back to DB.
   */
  loadMappings(mappings: MIDIMapping[]) {
    this.mappings.clear();
    for (const m of mappings) {
      this.mappings.set(m.id, m);
    }
  }

  /**
   * Add a controller mapping
   */
  addMapping(mapping: Omit<MIDIMapping, 'id'>): string {
    const id = `mapping-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullMapping: MIDIMapping = { ...mapping, id };
    this.mappings.set(id, fullMapping);
    this.triggerDebouncedSave(mapping.deviceId);
    return id;
  }

  /**
   * Remove a controller mapping
   */
  removeMapping(id: string): boolean {
    const mapping = this.mappings.get(id);
    const deleted = this.mappings.delete(id);
    if (deleted && mapping) {
      this.triggerDebouncedSave(mapping.deviceId);
    }
    return deleted;
  }

  /**
   * Debounce DB persist — coalesces rapid add/remove calls during MIDI learn
   * into a single write 500 ms after the last change.
   */
  private triggerDebouncedSave(deviceId: string) {
    if (!this.saveCallback) return;
    if (this.saveDebounceTimer !== null) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      this.saveDebounceTimer = null;
      if (this.saveCallback) {
        const deviceMappings = Array.from(this.mappings.values()).filter(
          m => m.deviceId === deviceId
        );
        this.saveCallback(deviceId, deviceMappings);
      }
    }, 500);
  }

  /**
   * Get all mappings
   */
  getMappings(): MIDIMapping[] {
    return Array.from(this.mappings.values());
  }

  /**
   * Clear all mappings
   */
  clearMappings() {
    this.mappings.clear();
  }

  /**
   * Enter MIDI learn mode
   */
  enterLearnMode(): Promise<number> {
    return new Promise((resolve) => {
      this.learnMode = true;
      this.learnCallback = (controller) => {
        resolve(controller);
      };
    });
  }

  /**
   * Exit MIDI learn mode
   */
  exitLearnMode() {
    this.learnMode = false;
    this.learnCallback = null;
  }

  /**
   * Send MIDI message to output device
   */
  sendMessage(deviceId: string, data: number[]) {
    const output = this.outputs.get(deviceId);
    if (output) {
      output.send(data);
    }
  }

  /**
   * Send note on message
   */
  sendNoteOn(deviceId: string, note: number, velocity: number, channel: number = 0) {
    this.sendMessage(deviceId, [0x90 | channel, note, velocity]);
  }

  /**
   * Send note off message
   */
  sendNoteOff(deviceId: string, note: number, channel: number = 0) {
    this.sendMessage(deviceId, [0x80 | channel, note, 0]);
  }

  /**
   * Send control change message
   */
  sendControlChange(deviceId: string, controller: number, value: number, channel: number = 0) {
    this.sendMessage(deviceId, [0xB0 | channel, controller, value]);
  }
}

// Export singleton instance
export const midiController = new MIDIControllerService();
