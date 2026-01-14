import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  File, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Music2,
  FolderOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

interface UploadedFile {
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  metadata?: {
    duration: number;
    bpm?: number;
    key?: string;
    sampleRate: number;
  };
  error?: string;
}

export default function SampleUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [packName, setPackName] = useState('');
  const [packDescription, setPackDescription] = useState('');

  // TODO: Implement samples router in server/routers.ts
  // const createSamplePack = trpc.samples.createPack.useMutation();
  // const uploadSample = trpc.samples.upload.useMutation();

  // Extract audio metadata using Web Audio API
  const extractMetadata = async (file: File): Promise<UploadedFile['metadata']> => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          // Basic metadata
          const metadata = {
            duration: audioBuffer.duration,
            sampleRate: audioBuffer.sampleRate,
          };

          resolve(metadata);
        } catch (error) {
          reject(error);
        } finally {
          audioContext.close();
        }
      };

      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const processFile = async (file: File, index: number) => {
    try {
      // Update status to processing
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'processing' as const, progress: 10 } : f
      ));

      // Extract metadata
      const metadata = await extractMetadata(file);
      
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, metadata, progress: 50 } : f
      ));

      // Convert file to base64 for upload
      const reader = new FileReader();
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, progress: 75 } : f
      ));

      // Upload to server (this will handle S3 upload)
      // TODO: Implement actual upload mutation
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload

      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'completed' as const, progress: 100 } : f
      ));

      toast.success(`${file.name} uploaded successfully`);
    } catch (error) {
      console.error('Error processing file:', error);
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'error' as const, 
          error: error instanceof Error ? error.message : 'Unknown error'
        } : f
      ));
      toast.error(`Failed to upload ${file.name}`);
    }
  };

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;

    const validFiles: UploadedFile[] = [];
    const supportedFormats = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'];

    Array.from(fileList).forEach(file => {
      if (supportedFormats.includes(file.type) || file.name.match(/\.(wav|mp3|ogg)$/i)) {
        validFiles.push({
          file,
          status: 'pending',
          progress: 0,
        });
      } else {
        toast.error(`${file.name} is not a supported audio format`);
      }
    });

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      
      // Process each file
      validFiles.forEach((_, index) => {
        processFile(validFiles[index].file, files.length + index);
      });
    }
  }, [files.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sample Pack Information</CardTitle>
          <CardDescription>
            Create a new sample pack or add to an existing one
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pack-name">Pack Name</Label>
            <Input
              id="pack-name"
              placeholder="e.g., Private School Essentials Vol. 1"
              value={packName}
              onChange={(e) => setPackName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pack-description">Description</Label>
            <Input
              id="pack-description"
              placeholder="Describe your sample pack..."
              value={packDescription}
              onChange={(e) => setPackDescription(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Samples</CardTitle>
          <CardDescription>
            Drag and drop audio files or click to browse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative border-2 border-dashed rounded-lg p-12 text-center transition-colors
              ${isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50 hover:bg-accent/50'
              }
            `}
          >
            <input
              type="file"
              multiple
              accept="audio/*"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="flex flex-col items-center gap-4">
              {isDragging ? (
                <FolderOpen className="h-12 w-12 text-primary animate-bounce" />
              ) : (
                <Upload className="h-12 w-12 text-muted-foreground" />
              )}
              
              <div>
                <p className="text-lg font-medium">
                  {isDragging ? 'Drop files here' : 'Drop audio files here'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse • WAV, MP3, OGG supported
                </p>
              </div>

              <Button variant="outline" className="mt-2">
                <Music2 className="mr-2 h-4 w-4" />
                Browse Files
              </Button>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Uploaded Files ({files.length})</h4>
                <Badge variant="outline">
                  {files.filter(f => f.status === 'completed').length} / {files.length} completed
                </Badge>
              </div>

              <div className="space-y-2">
                {files.map((fileItem, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    {getStatusIcon(fileItem.status)}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fileItem.file.name}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{(fileItem.file.size / 1024 / 1024).toFixed(2)} MB</span>
                        {fileItem.metadata && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(fileItem.metadata.duration)}</span>
                            <span>•</span>
                            <span>{fileItem.metadata.sampleRate / 1000} kHz</span>
                          </>
                        )}
                      </div>
                      
                      {fileItem.status === 'processing' && (
                        <Progress value={fileItem.progress} className="h-1 mt-2" />
                      )}
                      
                      {fileItem.status === 'error' && fileItem.error && (
                        <p className="text-xs text-destructive mt-1">{fileItem.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
