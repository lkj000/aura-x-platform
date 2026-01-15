import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Download, Loader2, Info } from 'lucide-react';
import { audioExporter, AudioClip, ExportOptions } from '@/services/AudioExporter';
import { exportTemplates, type ExportTemplate } from '@/data/exportTemplates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clips: AudioClip[];
  projectName?: string;
}

export function ExportDialog({ open, onOpenChange, clips, projectName = 'Untitled' }: ExportDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null);
  const [format, setFormat] = useState<'wav' | 'mp3'>('wav');
  const [bitrate, setBitrate] = useState('192');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);
  const [useTemplate, setUseTemplate] = useState(true);

  const handleExport = async () => {
    if (clips.length === 0) {
      alert('No clips to export. Please add audio clips to the timeline first.');
      return;
    }

    setExporting(true);
    setProgress(0);
    setExportedUrl(null);

    try {
      // Set progress callback
      audioExporter.setProgressCallback((p) => {
        setProgress(Math.round(p * 100));
      });

      // Export options
      // Map template format to supported export formats (flac/aac -> wav for now)
      const templateFormat = selectedTemplate?.settings.format;
      const exportFormat = (templateFormat === 'flac' || templateFormat === 'aac') ? 'wav' : templateFormat;
      
      const options: ExportOptions = useTemplate && selectedTemplate ? {
        format: exportFormat || 'wav',
        bitrate: selectedTemplate.settings.bitrate,
        sampleRate: selectedTemplate.settings.sampleRate,
      } : {
        format,
        bitrate: format === 'mp3' ? parseInt(bitrate) : undefined,
        sampleRate: 44100,
      };

      // Export timeline
      const blob = await audioExporter.exportTimeline(clips, options);

      // Upload to S3
      const filename = `${projectName}_${Date.now()}.${format}`;
      const file = new File([blob], filename, { type: blob.type });
      
      // Note: storagePut is a server-side function, we need to use tRPC to upload
      // For now, create a download link
      const url = URL.createObjectURL(blob);
      setExportedUrl(url);

      setProgress(100);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = () => {
    if (!exportedUrl) return;

    const link = document.createElement('a');
    link.href = exportedUrl;
    link.download = `${projectName}_${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    if (exportedUrl) {
      URL.revokeObjectURL(exportedUrl);
      setExportedUrl(null);
    }
    setProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Audio</DialogTitle>
          <DialogDescription>
            Export your timeline with platform-optimized settings or custom configuration.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={useTemplate ? 'templates' : 'custom'} onValueChange={(v) => setUseTemplate(v === 'templates')} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Platform Templates</TabsTrigger>
            <TabsTrigger value="custom">Custom Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
              {exportTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`p-4 cursor-pointer transition-all hover:border-primary ${
                    selectedTemplate?.id === template.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{template.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm">{template.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{template.settings.format.toUpperCase()}</span>
                        <span>•</span>
                        <span>{template.settings.targetLUFS} LUFS</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {selectedTemplate && (
              <Card className="p-4 bg-muted/30">
                <div className="flex items-start gap-2 mb-3">
                  <Info className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Recommendations</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {selectedTemplate.recommendations.map((rec, i) => (
                        <li key={i}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-6 mt-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'wav' | 'mp3')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="wav" id="wav" />
                <Label htmlFor="wav" className="font-normal cursor-pointer">
                  WAV (Uncompressed, highest quality)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mp3" id="mp3" />
                <Label htmlFor="mp3" className="font-normal cursor-pointer">
                  MP3 (Compressed, smaller file size)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* MP3 Bitrate Selection */}
          {format === 'mp3' && (
            <div className="space-y-3">
              <Label htmlFor="bitrate">MP3 Bitrate</Label>
              <Select value={bitrate} onValueChange={setBitrate}>
                <SelectTrigger id="bitrate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="128">128 kbps (Good)</SelectItem>
                  <SelectItem value="192">192 kbps (Better)</SelectItem>
                  <SelectItem value="256">256 kbps (Best)</SelectItem>
                  <SelectItem value="320">320 kbps (Maximum)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Progress Bar */}
          {exporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Exporting...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Success Message */}
          {exportedUrl && !exporting && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                ✓ Export completed successfully!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Download" to save the file to your computer.
              </p>
            </div>
          )}

          {/* Clip Info */}
          <div className="text-sm text-muted-foreground">
            <p>{clips.length} clip{clips.length !== 1 ? 's' : ''} will be exported</p>
          </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={exporting}>
            Cancel
          </Button>
          {exportedUrl ? (
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          ) : (
            <Button onClick={handleExport} disabled={exporting || clips.length === 0}>
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
