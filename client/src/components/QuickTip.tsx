import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Lightbulb, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Tip {
  id: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  placement?: 'top' | 'bottom' | 'left' | 'right';
  targetSelector?: string; // CSS selector for the element to highlight
}

interface QuickTipProps {
  tips: Tip[];
  storageKey: string; // LocalStorage key for tracking dismissed tips
  autoShow?: boolean; // Show automatically on first visit
  sequence?: boolean; // Show tips in sequence (one at a time)
}

export default function QuickTip({
  tips,
  storageKey,
  autoShow = true,
  sequence = true
}: QuickTipProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Check if tips have been dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (dismissed === 'true') {
      setIsDismissed(true);
    } else if (autoShow && tips.length > 0) {
      // Show after a short delay for better UX
      setTimeout(() => setIsVisible(true), 500);
    }
  }, [storageKey, autoShow, tips.length]);

  const currentTip = tips[currentTipIndex];

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(storageKey, 'true');
    setIsDismissed(true);
  };

  const handleNext = () => {
    if (currentTipIndex < tips.length - 1) {
      setCurrentTipIndex(currentTipIndex + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrevious = () => {
    if (currentTipIndex > 0) {
      setCurrentTipIndex(currentTipIndex - 1);
    }
  };

  const handleSkipAll = () => {
    handleDismiss();
  };

  if (isDismissed || !isVisible || !currentTip) {
    return null;
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-300" />

      {/* Tip card */}
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <Card className="w-[400px] max-w-[calc(100vw-2rem)] bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 shadow-xl">
          <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{currentTip.title}</h3>
                  {sequence && tips.length > 1 && (
                    <p className="text-xs text-muted-foreground">
                      Tip {currentTipIndex + 1} of {tips.length}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-1 -mr-1"
                onClick={handleSkipAll}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentTip.description}
            </p>

            {/* Action button (optional) */}
            {currentTip.action && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  currentTip.action!.onClick();
                  handleNext();
                }}
              >
                {currentTip.action.label}
              </Button>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-1">
                {tips.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      index === currentTipIndex
                        ? 'w-6 bg-purple-500'
                        : 'w-1.5 bg-muted'
                    )}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1">
                {sequence && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrevious}
                      disabled={currentTipIndex === 0}
                      className="h-8 px-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNext}
                      className="h-8 px-3"
                    >
                      {currentTipIndex === tips.length - 1 ? 'Got it!' : 'Next'}
                      {currentTipIndex < tips.length - 1 && (
                        <ChevronRight className="h-4 w-4 ml-1" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

// Hook for managing tips programmatically
export function useQuickTips(storageKey: string) {
  const [showTips, setShowTips] = useState(false);

  const resetTips = () => {
    localStorage.removeItem(storageKey);
    setShowTips(true);
  };

  const haveTipsBeenShown = () => {
    return localStorage.getItem(storageKey) === 'true';
  };

  return {
    showTips,
    setShowTips,
    resetTips,
    haveTipsBeenShown
  };
}
