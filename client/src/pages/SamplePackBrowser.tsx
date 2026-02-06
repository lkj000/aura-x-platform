import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Folder, 
  File, 
  Play, 
  Pause, 
  Download, 
  Plus,
  ChevronRight,
  ChevronDown,
  Upload as UploadIcon,
  Trash2
} from 'lucide-react';
import FolderUpload from '@/components/FolderUpload';
import { useToast } from '@/hooks/use-toast';

export default function SamplePackBrowser() {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [playingSampleId, setPlayingSampleId] = useState<number | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const { toast } = useToast();
  const { data: packs, refetch: refetchPacks } = trpc.samplePacks.getMyPacks.useQuery();
  const { data: packDetails } = trpc.samplePacks.getPackDetails.useQuery(
    { packId: selectedPackId! },
    { enabled: !!selectedPackId }
  );
  const deletePackMutation = trpc.samplePacks.deletePack.useMutation();

  const toggleFolder = (folderId: number) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handlePlaySample = async (sampleUrl: string, sampleId: number) => {
    if (playingSampleId === sampleId) {
      // Pause current
      audioElement?.pause();
      setPlayingSampleId(null);
    } else {
      // Stop previous
      audioElement?.pause();
      
      // Play new
      const audio = new Audio(sampleUrl);
      audio.onended = () => setPlayingSampleId(null);
      audio.play();
      setAudioElement(audio);
      setPlayingSampleId(sampleId);
    }
  };

  const handleDeletePack = async (packId: number) => {
    if (!confirm('Are you sure you want to delete this pack? This cannot be undone.')) {
      return;
    }

    try {
      await deletePackMutation.mutateAsync({ packId });
      toast({
        title: 'Pack Deleted',
        description: 'Sample pack has been successfully deleted',
      });
      refetchPacks();
      if (selectedPackId === packId) {
        setSelectedPackId(null);
      }
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete pack',
        variant: 'destructive',
      });
    }
  };

  const renderFolderTree = (folder: any, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const indent = level * 20;

    return (
      <div key={folder.id}>
        <div
          className="flex items-center gap-2 py-2 px-2 hover:bg-muted/50 rounded cursor-pointer"
          style={{ paddingLeft: indent + 8 }}
          onClick={() => toggleFolder(folder.id)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Folder className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{folder.name}</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {folder.samples?.length || 0} samples
          </span>
        </div>

        {isExpanded && folder.samples && folder.samples.length > 0 && (
          <div className="ml-4">
            {folder.samples.map((sample: any) => (
              <div
                key={sample.id}
                className="flex items-center gap-2 py-2 px-2 hover:bg-muted/50 rounded"
                style={{ paddingLeft: indent + 28 }}
              >
                <File className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm flex-1">{sample.name}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handlePlaySample(sample.url, sample.id)}
                  >
                    {playingSampleId === sample.id ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      // TODO: Implement add to DAW timeline
                      toast({
                        title: 'Add to Timeline',
                        description: 'DAW integration coming soon',
                      });
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isExpanded && folder.children && folder.children.length > 0 && (
          <div>
            {folder.children.map((child: any) => renderFolderTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (showUpload) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Upload Sample Pack</h1>
          <FolderUpload
            onUploadComplete={(packId) => {
              setShowUpload(false);
              refetchPacks();
              setSelectedPackId(packId);
              toast({
                title: 'Upload Complete',
                description: 'Your sample pack has been uploaded successfully',
              });
            }}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Sample Packs</h1>
        <Button onClick={() => setShowUpload(true)}>
          <UploadIcon className="h-4 w-4 mr-2" />
          Upload Pack
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Pack List */}
        <div className="col-span-4">
          <Card className="p-4">
            <h2 className="font-semibold mb-4">Packs</h2>
            <div className="space-y-2">
              {packs?.map((pack) => (
                <div
                  key={pack.id}
                  className={`
                    p-3 rounded-lg cursor-pointer transition-colors
                    ${selectedPackId === pack.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
                  `}
                  onClick={() => setSelectedPackId(pack.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{pack.name}</h3>
                      <p className="text-xs opacity-80">{pack.totalSamples} samples</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePack(pack.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {(!packs || packs.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No packs yet</p>
                  <Button
                    variant="link"
                    onClick={() => setShowUpload(true)}
                    className="mt-2"
                  >
                    Upload your first pack
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Pack Details */}
        <div className="col-span-8">
          {selectedPackId && packDetails ? (
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">{packDetails.pack.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {packDetails.pack.description}
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm">
                  <span className="text-muted-foreground">
                    Version: <strong>{packDetails.pack.version}</strong>
                  </span>
                  <span className="text-muted-foreground">
                    Author: <strong>{packDetails.pack.author}</strong>
                  </span>
                  <span className="text-muted-foreground">
                    Genre: <strong className="capitalize">{packDetails.pack.genre}</strong>
                  </span>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Folder Structure</h3>
                <div className="max-h-[600px] overflow-y-auto">
                  {packDetails.folders.map((folder) => renderFolderTree(folder))}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <Folder className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Pack Selected</h3>
              <p className="text-sm text-muted-foreground">
                Select a pack from the list to view its contents
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
