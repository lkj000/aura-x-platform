/**
 * Keyboard Shortcuts Service
 * Provides industry-standard DAW keyboard shortcuts
 */

export interface KeyboardShortcut {
  id: string;
  keys: string[]; // e.g., ['Control', 'S'] or ['Space']
  description: string;
  category: 'playback' | 'editing' | 'navigation' | 'file' | 'view';
  handler: () => void;
  enabled: boolean;
}

type ShortcutHandler = () => void;

class KeyboardShortcutsService {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private pressedKeys: Set<string> = new Set();
  private enabled: boolean = true;

  /**
   * Initialize keyboard shortcuts
   */
  initialize() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    console.log('Keyboard Shortcuts Service initialized');
  }

  /**
   * Handle key down event
   */
  private handleKeyDown(event: KeyboardEvent) {
    if (!this.enabled) return;

    // Ignore shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    this.pressedKeys.add(event.key);

    // Check for matching shortcuts
    this.shortcuts.forEach((shortcut) => {
      if (!shortcut.enabled) return;

      const keysMatch = shortcut.keys.every((key) => {
        // Normalize key names
        const normalizedKey = this.normalizeKey(key);
        return this.pressedKeys.has(normalizedKey) || this.isModifierPressed(normalizedKey, event);
      });

      if (keysMatch && shortcut.keys.length === this.getActiveKeyCount(event)) {
        event.preventDefault();
        shortcut.handler();
      }
    });
  }

  /**
   * Handle key up event
   */
  private handleKeyUp(event: KeyboardEvent) {
    this.pressedKeys.delete(event.key);
  }

  /**
   * Normalize key name
   */
  private normalizeKey(key: string): string {
    const keyMap: Record<string, string> = {
      'Control': 'Control',
      'Ctrl': 'Control',
      'Cmd': 'Meta',
      'Command': 'Meta',
      'Alt': 'Alt',
      'Option': 'Alt',
      'Shift': 'Shift',
      'Space': ' ',
    };
    return keyMap[key] || key;
  }

  /**
   * Check if modifier is pressed
   */
  private isModifierPressed(key: string, event: KeyboardEvent): boolean {
    switch (key) {
      case 'Control':
        return event.ctrlKey || event.metaKey; // Support both Ctrl and Cmd
      case 'Meta':
        return event.metaKey;
      case 'Alt':
        return event.altKey;
      case 'Shift':
        return event.shiftKey;
      default:
        return false;
    }
  }

  /**
   * Get count of active keys (excluding modifiers)
   */
  private getActiveKeyCount(event: KeyboardEvent): number {
    let count = 0;
    if (event.ctrlKey || event.metaKey) count++;
    if (event.altKey) count++;
    if (event.shiftKey) count++;
    if (!['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) count++;
    return count;
  }

  /**
   * Register a keyboard shortcut
   */
  register(shortcut: Omit<KeyboardShortcut, 'enabled'>): string {
    const id = shortcut.id || `shortcut-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullShortcut: KeyboardShortcut = { ...shortcut, id, enabled: true };
    this.shortcuts.set(id, fullShortcut);
    return id;
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(id: string): boolean {
    return this.shortcuts.delete(id);
  }

  /**
   * Enable/disable a shortcut
   */
  setEnabled(id: string, enabled: boolean) {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.enabled = enabled;
    }
  }

  /**
   * Enable/disable all shortcuts
   */
  setGlobalEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getShortcutsByCategory(category: KeyboardShortcut['category']): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter((s) => s.category === category);
  }

  /**
   * Format shortcut keys for display
   */
  formatKeys(keys: string[]): string {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    return keys
      .map((key) => {
        if (key === 'Control') return isMac ? '⌘' : 'Ctrl';
        if (key === 'Meta') return '⌘';
        if (key === 'Alt') return isMac ? '⌥' : 'Alt';
        if (key === 'Shift') return '⇧';
        if (key === ' ') return 'Space';
        return key;
      })
      .join(isMac ? '' : '+');
  }

  /**
   * Clear all pressed keys (useful for cleanup)
   */
  clearPressedKeys() {
    this.pressedKeys.clear();
  }

  /**
   * Destroy the service
   */
  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    this.shortcuts.clear();
    this.pressedKeys.clear();
  }
}

// Export singleton instance
export const keyboardShortcuts = new KeyboardShortcutsService();

// Default DAW shortcuts
export const defaultShortcuts = {
  // Playback
  playPause: { keys: [' '], description: 'Play/Pause', category: 'playback' as const },
  stop: { keys: ['Escape'], description: 'Stop playback', category: 'playback' as const },
  record: { keys: ['Control', 'R'], description: 'Start/Stop recording', category: 'playback' as const },
  loop: { keys: ['Control', 'L'], description: 'Toggle loop', category: 'playback' as const },
  
  // File
  save: { keys: ['Control', 'S'], description: 'Save project', category: 'file' as const },
  export: { keys: ['Control', 'E'], description: 'Export audio', category: 'file' as const },
  newProject: { keys: ['Control', 'N'], description: 'New project', category: 'file' as const },
  
  // Editing
  undo: { keys: ['Control', 'Z'], description: 'Undo', category: 'editing' as const },
  redo: { keys: ['Control', 'Shift', 'Z'], description: 'Redo', category: 'editing' as const },
  cut: { keys: ['Control', 'X'], description: 'Cut', category: 'editing' as const },
  copy: { keys: ['Control', 'C'], description: 'Copy', category: 'editing' as const },
  paste: { keys: ['Control', 'V'], description: 'Paste', category: 'editing' as const },
  delete: { keys: ['Delete'], description: 'Delete selection', category: 'editing' as const },
  duplicate: { keys: ['Control', 'D'], description: 'Duplicate', category: 'editing' as const },
  selectAll: { keys: ['Control', 'A'], description: 'Select all', category: 'editing' as const },
  
  // Navigation
  zoomIn: { keys: ['Control', '='], description: 'Zoom in', category: 'navigation' as const },
  zoomOut: { keys: ['Control', '-'], description: 'Zoom out', category: 'navigation' as const },
  zoomFit: { keys: ['Control', '0'], description: 'Fit to window', category: 'navigation' as const },
  
  // View
  toggleMixer: { keys: ['Control', 'M'], description: 'Toggle mixer', category: 'view' as const },
  togglePianoRoll: { keys: ['Control', 'P'], description: 'Toggle piano roll', category: 'view' as const },
  toggleInstruments: { keys: ['Control', 'I'], description: 'Toggle instruments', category: 'view' as const },
};
