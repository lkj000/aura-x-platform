import React, { useState, useCallback } from 'react';
import { Upload, Folder, File, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  file?: File;
  children?: FileNode[];
  size?: number;
}

interface FolderUploadProps {
  onUploadComplete: (packId: number) => void;
  onCancel: () => void;
}

export default function FolderUpload({ onUploadComplete, onCancel }: FolderUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [packName, setPackName] = useState('');

  // Parse folder structure from FileList
  const parseFolder = useCallback(async (items: DataTransferItemList) => {
    const root: FileNode = {
      name: 'root',
      path: '',
      type: 'folder',
      children: [],
    };

    const processEntry = async (entry: FileSystemEntry, parentNode: FileNode, basePath: string = '') => {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        return new Promise<void>((resolve) => {
          fileEntry.file((file) => {
            // Only accept audio files
            const audioFormats = ['.wav', '.mp3', '.aiff', '.flac', '.ogg', '.m4a'];
            const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
            
            if (audioFormats.includes(ext)) {
              const fileNode: FileNode = {
                name: file.name,
                path: basePath + '/' + file.name,
                type: 'file',
                file,
                size: file.size,
              };
              parentNode.children = parentNode.children || [];
              parentNode.children.push(fileNode);
            }
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const folderNode: FileNode = {
          name: entry.name,
          path: basePath + '/' + entry.name,
          type: 'folder',
          children: [],
        };
        
        parentNode.children = parentNode.children || [];
        parentNode.children.push(folderNode);

        const reader = dirEntry.createReader();
        const entries = await new Promise<FileSystemEntry[]>((resolve) => {
          reader.readEntries((entries) => resolve(entries));
        });

        for (const childEntry of entries) {
          await processEntry(childEntry, folderNode, basePath + '/' + entry.name);
        }
      }
    };

    // Process all dropped items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          await processEntry(entry, root, '');
        }
      }
    }

    // Set pack name from first folder
    if (root.children && root.children.length > 0 && root.children[0].type === 'folder') {
      setPackName(root.children[0].name);
      return root.children[0]; // Return first folder as root
    }

    return root;
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (!items) return;

    const tree = await parseFolder(items);
    setFileTree(tree);
  }, [parseFolder]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Count total files in tree
  const countFiles = (node: FileNode): number => {
    if (node.type === 'file') return 1;
    if (!node.children) return 0;
    return node.children.reduce((sum, child) => sum + countFiles(child), 0);
  };

  // Calculate total size
  const calculateSize = (node: FileNode): number => {
    if (node.type === 'file') return node.size || 0;
    if (!node.children) return 0;
    return node.children.reduce((sum, child) => sum + calculateSize(child), 0);
  };

  // Render file tree
  const renderTree = (node: FileNode, level: number = 0): React.ReactNode => {
    if (!node) return null;

    const indent = level * 20;

    if (node.type === 'file') {
      return (
        <div key={node.path} className="flex items-center gap-2 py-1" style={{ paddingLeft: indent }}>
          <File className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{node.name}</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {((node.size || 0) / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>
      );
    }

    return (
      <div key={node.path}>
        <div className="flex items-center gap-2 py-1 font-medium" style={{ paddingLeft: indent }}>
          <Folder className="h-4 w-4 text-primary" />
          <span className="text-sm">{node.name}</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {node.children?.length || 0} items
          </span>
        </div>
        {node.children?.map(child => renderTree(child, level + 1))}
      </div>
    );
  };

  const { toast } = useToast();
  const createPackMutation = trpc.samplePacks.createPack.useMutation();
  const uploadSampleMutation = trpc.samplePacks.uploadSample.useMutation();
  const createFolderMutation = trpc.samplePacks.createFolder.useMutation();

  const handleUpload = async () => {
    if (!fileTree || !packName) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Create pack
      const { packId } = await createPackMutation.mutateAsync({
        name: packName,
        description: `Uploaded from folder: ${fileTree.name}`,
        version: '1.0',
        genre: 'amapiano',
      });

      const totalFiles = countFiles(fileTree);
      let uploadedFiles = 0;

      // Step 2: Recursively upload folders and files
      const uploadNode = async (node: FileNode, parentFolderId?: number) => {
        if (node.type === 'folder') {
          // Create folder in database
          const { folderId } = await createFolderMutation.mutateAsync({
            packId,
            name: node.name,
            parentFolderId,
            path: node.path,
          });

          // Upload children
          if (node.children) {
            for (const child of node.children) {
              await uploadNode(child, folderId);
            }
          }
        } else if (node.type === 'file' && node.file) {
          // Convert file to base64
          const fileBuffer = await node.file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(fileBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ''
            )
          );

          // Detect category from folder path
          const detectCategory = (path: string): string => {
            const lowerPath = path.toLowerCase();
            if (lowerPath.includes('fx')) return 'fx';
            if (lowerPath.includes('loop')) return 'loop';
            if (lowerPath.includes('one') && lowerPath.includes('shot')) return 'one-shot';
            if (lowerPath.includes('bass')) return 'bass';
            if (lowerPath.includes('chord')) return 'chord';
            if (lowerPath.includes('vocal')) return 'vocal';
            if (lowerPath.includes('percussion')) return 'percussion';
            if (lowerPath.includes('log') && lowerPath.includes('drum')) return 'log-drum';
            if (lowerPath.includes('shaker')) return 'shaker';
            if (lowerPath.includes('sax')) return 'saxophone';
            return 'one-shot'; // default
          };

          // Upload sample to S3 via tRPC
          await uploadSampleMutation.mutateAsync({
            packId,
            name: node.file.name.replace(/\.[^/.]+$/, ''), // Remove extension
            filename: node.file.name,
            fileData: base64,
            category: detectCategory(node.path) as any,
            folderId: parentFolderId,
            metadata: {
              fileSize: node.file.size,
            },
          });

          uploadedFiles++;
          setUploadProgress((uploadedFiles / totalFiles) * 100);
        }
      };

      await uploadNode(fileTree);

      toast({
        title: 'Upload Complete',
        description: `Successfully uploaded ${totalFiles} samples to "${packName}"`,
      });

      onUploadComplete(packId);
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'An error occurred during upload',
        variant: 'destructive',
      });
      setIsUploading(false);
    }
  };

  if (!fileTree) {
    return (
      <Card className="p-8">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}
          `}
        >
          <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Drop Sample Pack Folder Here</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop an entire folder containing your samples
          </p>
          <p className="text-xs text-muted-foreground">
            Supported formats: WAV, MP3, AIFF, FLAC, OGG, M4A
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Pack Name</label>
          <input
            type="text"
            value={packName}
            onChange={(e) => setPackName(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-md"
            placeholder="Enter pack name..."
          />
        </div>

        <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
          <h4 className="font-semibold mb-2">Folder Structure Preview</h4>
          {renderTree(fileTree)}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Total Files: <strong>{countFiles(fileTree)}</strong>
          </span>
          <span className="text-muted-foreground">
            Total Size: <strong>{(calculateSize(fileTree) / 1024 / 1024).toFixed(2)} MB</strong>
          </span>
        </div>

        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress.toFixed(0)}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={isUploading || !packName}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Pack
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}
