import React from 'react';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Undo2, Redo2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function HistoryPanel() {
  const { canUndo, canRedo, undo, redo, clear, getHistory } = useUndoRedo();
  const history = getHistory();

  const handleJumpTo = async (targetIndex: number, isUndo: boolean) => {
    if (isUndo) {
      // Jump to a point in undo history
      const currentIndex = history.undo.length - 1;
      const steps = currentIndex - targetIndex;
      
      for (let i = 0; i < steps; i++) {
        await undo();
      }
    } else {
      // Jump to a point in redo history
      const steps = history.redo.length - targetIndex;
      
      for (let i = 0; i < steps; i++) {
        await redo();
      }
    }
  };

  const currentPosition = history.undo.length;

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-sm">History</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!canUndo}
            onClick={undo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!canRedo}
            onClick={redo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={history.undo.length === 0}
            onClick={clear}
            title="Clear history"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* History List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {history.undo.length === 0 && history.redo.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              No history yet
            </div>
          ) : (
            <>
              {/* Undo stack (most recent first) */}
              {[...history.undo].reverse().map((command, reverseIndex) => {
                const index = history.undo.length - 1 - reverseIndex;
                const isCurrent = index === currentPosition - 1;
                
                return (
                  <button
                    key={`undo-${index}-${command.timestamp}`}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isCurrent && "bg-primary/10 border border-primary/20"
                    )}
                    onClick={() => handleJumpTo(index, true)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {command.description}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(command.timestamp, { addSuffix: true })}
                        </div>
                      </div>
                      {isCurrent && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Redo stack */}
              {history.redo.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs text-muted-foreground font-medium">
                    Undone Actions
                  </div>
                  {[...history.redo].reverse().map((command, reverseIndex) => {
                    const index = history.redo.length - 1 - reverseIndex;
                    
                    return (
                      <button
                        key={`redo-${index}-${command.timestamp}`}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          "opacity-50"
                        )}
                        onClick={() => handleJumpTo(index, false)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {command.description}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(command.timestamp, { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      <div className="p-3 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>{history.undo.length} actions</span>
          {history.redo.length > 0 && (
            <span>{history.redo.length} undone</span>
          )}
        </div>
      </div>
    </div>
  );
}
