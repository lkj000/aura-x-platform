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
import { Download, Loader2 } from 'lucide-react';
import { audioExporter, AudioClip, ExportOptions } from '@/services/AudioExporter';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clips: AudioClip[];
  projectName?: string;
}

export function ExportDialog({ open, onOpenChange, clips, projectName = 'Untitled' }: ExportDialogProps) {
  const [format, setFormat] = useState<'wav' | 'mp3'>('wav');
  const [bitrate, setBitrate] = useState('192');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);

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
      const options: ExportOptions = {
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
            Export your timeline to an audio file. Choose format and quality settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
        </div>

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
