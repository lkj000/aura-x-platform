import { useState, useEffect } from 'react';
import { undoRedoManager, type Command } from '@/services/UndoRedoManager';

export function useUndoRedo() {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [undoDescription, setUndoDescription] = useState<string | null>(null);
  const [redoDescription, setRedoDescription] = useState<string | null>(null);

  useEffect(() => {
    const updateState = () => {
      setCanUndo(undoRedoManager.canUndo());
      setCanRedo(undoRedoManager.canRedo());
      setUndoDescription(undoRedoManager.getUndoDescription());
      setRedoDescription(undoRedoManager.getRedoDescription());
    };

    // Initial state
    updateState();

    // Listen for changes
    const unsubscribe = undoRedoManager.addListener(updateState);

    return unsubscribe;
  }, []);

  const executeCommand = async (command: Command) => {
    await undoRedoManager.executeCommand(command);
  };

  const undo = async () => {
    await undoRedoManager.undo();
  };

  const redo = async () => {
    await undoRedoManager.redo();
  };

  const clear = () => {
    undoRedoManager.clear();
  };

  const getHistory = () => {
    return {
      undo: undoRedoManager.getUndoHistory(),
      redo: undoRedoManager.getRedoHistory(),
    };
  };

  return {
    canUndo,
    canRedo,
    undoDescription,
    redoDescription,
    executeCommand,
    undo,
    redo,
    clear,
    getHistory,
  };
}
