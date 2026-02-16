import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
}

interface DJTrackUploaderProps {
  onUploadComplete?: (trackIds: number[]) => void;
}

export default function DJTrackUploader({ onUploadComplete }: DJTrackUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED_FORMATS = [".mp3", ".mp4", ".wav"];
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  const validateFile = (file: File): string | null => {
    // Check file extension
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_FORMATS.includes(extension)) {
      return `Invalid file format. Only ${ACCEPTED_FORMATS.join(", ")} are supported.`;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`;
    }

    return null;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate all files first
    Array.from(files).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    // Show validation errors
    if (errors.length > 0) {
      errors.forEach((error) => toast.error(error));
    }

    if (validFiles.length === 0) return;

    // Initialize uploading state for valid files
    const newUploadingFiles: UploadingFile[] = validFiles.map((file) => ({
      file,
      progress: 0,
      status: "uploading",
    }));

    setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

    // Upload files (placeholder - will connect to tRPC in Phase 4)
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        // Simulate upload progress
        await simulateUpload(i, newUploadingFiles.length);
        
        // Update status to completed
        setUploadingFiles((prev) =>
          prev.map((uf) =>
            uf.file === file ? { ...uf, progress: 100, status: "completed" } : uf
          )
        );

        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        // Update status to error
        setUploadingFiles((prev) =>
          prev.map((uf) =>
            uf.file === file
              ? { ...uf, status: "error", error: "Upload failed" }
              : uf
          )
        );

        toast.error(`Failed to upload ${file.name}`);
      }
    }

    // Notify parent component
    if (onUploadComplete) {
      // Placeholder track IDs - will be real IDs from backend
      const trackIds = validFiles.map((_, i) => i + 1);
      onUploadComplete(trackIds);
    }
  };

  // Simulate upload progress (will be replaced with real upload in Phase 4)
  const simulateUpload = (index: number, total: number): Promise<void> => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadingFiles((prev) =>
          prev.map((uf, i) =>
            i === prev.length - total + index
              ? { ...uf, progress: Math.min(progress, 100) }
              : uf
          )
        );

        if (progress >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, 200);
    });
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    handleFiles(files);

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Upload Drop Zone */}
      <Card
        className={`p-8 border-2 border-dashed transition-all ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div
            className={`h-16 w-16 rounded-full flex items-center justify-center transition-colors ${
              isDragging ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
            }`}
          >
            <Upload className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {isDragging ? "Drop files here" : "Upload Tracks"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Drag and drop your MP3, MP4, or WAV files here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Maximum file size: 100MB
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleBrowseClick}>
            <Upload className="h-4 w-4" />
            Browse Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_FORMATS.join(",")}
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      </Card>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploading {uploadingFiles.length} file(s)</h4>
          {uploadingFiles.map((uploadingFile, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center gap-3">
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {uploadingFile.status === "uploading" && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  {uploadingFile.status === "completed" && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {uploadingFile.status === "error" && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {uploadingFile.file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          uploadingFile.status === "error"
                            ? "bg-red-500"
                            : uploadingFile.status === "completed"
                            ? "bg-green-500"
                            : "bg-primary"
                        }`}
                        style={{ width: `${uploadingFile.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {uploadingFile.progress}%
                    </span>
                  </div>
                  {uploadingFile.error && (
                    <p className="text-xs text-red-500 mt-1">{uploadingFile.error}</p>
                  )}
                </div>

                {/* Remove Button */}
                {uploadingFile.status !== "uploading" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
