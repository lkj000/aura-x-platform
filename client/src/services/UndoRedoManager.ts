/**
 * Undo/Redo Manager
 * Implements command pattern for all DAW operations
 */

export interface Command {
  execute(): Promise<void> | void;
  undo(): Promise<void> | void;
  description: string;
  timestamp: number;
}

export class UndoRedoManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistorySize: number = 100;
  private listeners: Set<() => void> = new Set();

  /**
   * Execute a command and add it to history
   */
  async executeCommand(command: Command): Promise<void> {
    await command.execute();
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo stack when new command is executed
    
    // Limit history size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    
    this.notifyListeners();
  }

  /**
   * Undo the last command
   */
  async undo(): Promise<boolean> {
    if (!this.canUndo()) return false;

    const command = this.undoStack.pop()!;
    await command.undo();
    this.redoStack.push(command);
    
    this.notifyListeners();
    return true;
  }

  /**
   * Redo the last undone command
   */
  async redo(): Promise<boolean> {
    if (!this.canRedo()) return false;

    const command = this.redoStack.pop()!;
    await command.execute();
    this.undoStack.push(command);
    
    this.notifyListeners();
    return true;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get undo stack description
   */
  getUndoDescription(): string | null {
    if (!this.canUndo()) return null;
    return this.undoStack[this.undoStack.length - 1].description;
  }

  /**
   * Get redo stack description
   */
  getRedoDescription(): string | null {
    if (!this.canRedo()) return null;
    return this.redoStack[this.redoStack.length - 1].description;
  }

  /**
   * Get undo history
   */
  getUndoHistory(): Command[] {
    return [...this.undoStack];
  }

  /**
   * Get redo history
   */
  getRedoHistory(): Command[] {
    return [...this.redoStack];
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyListeners();
  }

  /**
   * Add listener for history changes
   */
  addListener(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Get history size
   */
  getHistorySize(): number {
    return this.undoStack.length + this.redoStack.length;
  }

  /**
   * Set max history size
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    
    // Trim if necessary
    while (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }
}

// Export singleton instance
export const undoRedoManager = new UndoRedoManager();

/**
 * DAW Command Implementations
 */

// Add Audio Clip Command
export class AddAudioClipCommand implements Command {
  description: string;
  timestamp: number;
  private clipData: any;
  private clipId: number | null = null;
  private createClip: (data: any) => Promise<number>;
  private deleteClip: (id: number) => Promise<void>;

  constructor(
    clipData: any,
    createClip: (data: any) => Promise<number>,
    deleteClip: (id: number) => Promise<void>
  ) {
    this.clipData = clipData;
    this.createClip = createClip;
    this.deleteClip = deleteClip;
    this.description = `Add clip: ${clipData.name || 'Untitled'}`;
    this.timestamp = Date.now();
  }

  async execute(): Promise<void> {
    this.clipId = await this.createClip(this.clipData);
  }

  async undo(): Promise<void> {
    if (this.clipId !== null) {
      await this.deleteClip(this.clipId);
    }
  }
}

// Delete Audio Clip Command
export class DeleteAudioClipCommand implements Command {
  description: string;
  timestamp: number;
  private clipId: number;
  private clipData: any;
  private createClip: (data: any) => Promise<number>;
  private deleteClip: (id: number) => Promise<void>;
  private getClip: (id: number) => Promise<any>;

  constructor(
    clipId: number,
    createClip: (data: any) => Promise<number>,
    deleteClip: (id: number) => Promise<void>,
    getClip: (id: number) => Promise<any>
  ) {
    this.clipId = clipId;
    this.createClip = createClip;
    this.deleteClip = deleteClip;
    this.getClip = getClip;
    this.description = `Delete clip`;
    this.timestamp = Date.now();
  }

  async execute(): Promise<void> {
    // Store clip data before deleting
    this.clipData = await this.getClip(this.clipId);
    await this.deleteClip(this.clipId);
  }

  async undo(): Promise<void> {
    // Recreate the clip
    this.clipId = await this.createClip(this.clipData);
  }
}

// Update Clip Position Command
export class UpdateClipPositionCommand implements Command {
  description: string;
  timestamp: number;
  private clipId: number;
  private oldPosition: number;
  private newPosition: number;
  private updateClip: (id: number, position: number) => Promise<void>;

  constructor(
    clipId: number,
    oldPosition: number,
    newPosition: number,
    updateClip: (id: number, position: number) => Promise<void>
  ) {
    this.clipId = clipId;
    this.oldPosition = oldPosition;
    this.newPosition = newPosition;
    this.updateClip = updateClip;
    this.description = `Move clip`;
    this.timestamp = Date.now();
  }

  async execute(): Promise<void> {
    await this.updateClip(this.clipId, this.newPosition);
  }

  async undo(): Promise<void> {
    await this.updateClip(this.clipId, this.oldPosition);
  }
}

// Update Effect Parameter Command
export class UpdateEffectParameterCommand implements Command {
  description: string;
  timestamp: number;
  private effectId: string;
  private parameterName: string;
  private oldValue: any;
  private newValue: any;
  private updateParameter: (effectId: string, param: string, value: any) => void;

  constructor(
    effectId: string,
    parameterName: string,
    oldValue: any,
    newValue: any,
    updateParameter: (effectId: string, param: string, value: any) => void
  ) {
    this.effectId = effectId;
    this.parameterName = parameterName;
    this.oldValue = oldValue;
    this.newValue = newValue;
    this.updateParameter = updateParameter;
    this.description = `Update ${parameterName}`;
    this.timestamp = Date.now();
  }

  execute(): void {
    this.updateParameter(this.effectId, this.parameterName, this.newValue);
  }

  undo(): void {
    this.updateParameter(this.effectId, this.parameterName, this.oldValue);
  }
}

// Batch Command (for grouping multiple commands)
export class BatchCommand implements Command {
  description: string;
  timestamp: number;
  private commands: Command[];

  constructor(commands: Command[], description: string) {
    this.commands = commands;
    this.description = description;
    this.timestamp = Date.now();
  }

  async execute(): Promise<void> {
    for (const command of this.commands) {
      await command.execute();
    }
  }

  async undo(): Promise<void> {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      await this.commands[i].undo();
    }
  }
}
