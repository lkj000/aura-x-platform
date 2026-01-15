import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Keyboard, RotateCcw } from 'lucide-react';
import { keyboardShortcuts, type KeyboardShortcut } from '@/services/KeyboardShortcuts';

export default function KeyboardShortcutsPanel() {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);

  useEffect(() => {
    setShortcuts(keyboardShortcuts.getShortcuts());
  }, []);

  const categories = [
    { id: 'playback', label: 'Playback' },
    { id: 'file', label: 'File' },
    { id: 'editing', label: 'Editing' },
    { id: 'navigation', label: 'Navigation' },
    { id: 'view', label: 'View' },
  ] as const;

  const getShortcutsByCategory = (category: KeyboardShortcut['category']) => {
    return shortcuts.filter(s => s.category === category);
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          Keyboard Shortcuts
        </h3>
        <p className="text-sm text-muted-foreground">
          Industry-standard DAW keyboard shortcuts for faster workflow
        </p>
      </div>

      <Tabs defaultValue="playback" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {categories.map(cat => (
            <TabsTrigger key={cat.id} value={cat.id}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(cat => (
          <TabsContent key={cat.id} value={cat.id} className="space-y-2 mt-4">
            {getShortcutsByCategory(cat.id).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No shortcuts in this category
              </div>
            ) : (
              getShortcutsByCategory(cat.id).map(shortcut => (
                <div
                  key={shortcut.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{shortcut.description}</div>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {keyboardShortcuts.formatKeys(shortcut.keys)}
                  </Badge>
                </div>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          Shortcuts work when not typing in text fields
        </p>
        <Button variant="outline" size="sm" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>
    </Card>
  );
}
