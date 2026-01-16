import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, Package, DollarSign, TrendingUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

const CATEGORIES = [
  { value: 'log_drums', label: 'Log Drums' },
  { value: 'piano_chords', label: 'Piano Chords' },
  { value: 'bass', label: 'Bass' },
  { value: 'vocals', label: 'Vocals' },
  { value: 'fx', label: 'FX & Atmospheres' },
  { value: 'full_kits', label: 'Full Kits' },
  { value: 'percussion', label: 'Percussion' },
  { value: 'synths', label: 'Synths' },
];

export default function SellerDashboard() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    tags: [] as string[],
    tagInput: '',
    sampleCount: '',
    coverImage: '',
    previewAudio: '',
  });

  const createPackMutation = trpc.marketplace.createPack.useMutation({
    onSuccess: () => {
      toast.success('Sample pack created successfully!');
      // Reset form
      setFormData({
        title: '',
        description: '',
        price: '',
        category: '',
        tags: [],
        tagInput: '',
        sampleCount: '',
        coverImage: '',
        previewAudio: '',
      });
      setUploadFile(null);
    },
    onError: (error) => {
      toast.error(`Failed to create pack: ${error.message}`);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.zip')) {
        toast.error('Please upload a ZIP file');
        return;
      }
      
      // Validate file size (max 500MB)
      const maxSize = 500 * 1024 * 1024; // 500MB in bytes
      if (file.size > maxSize) {
        toast.error('File size must be less than 500MB');
        return;
      }
      
      setUploadFile(file);
      toast.success(`Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  const handleAddTag = () => {
    const tag = formData.tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag],
        tagInput: '',
      });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);

    try {
      // Step 1: Upload file to S3
      const fileReader = new FileReader();
      fileReader.onload = async () => {
        try {
          const base64Data = (fileReader.result as string).split(',')[1];
          
          // Upload to S3 via tRPC (we'll need to add this endpoint)
          const uploadResponse = await fetch('/api/upload-pack', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename: uploadFile.name,
              data: base64Data,
              contentType: 'application/zip',
            }),
          });

          if (!uploadResponse.ok) {
            throw new Error('File upload failed');
          }

          const { url } = await uploadResponse.json();

          // Step 2: Create pack in database
          await createPackMutation.mutateAsync({
            title: formData.title,
            description: formData.description,
            price: parseFloat(formData.price),
            category: formData.category,
            tags: formData.tags,
            fileUrl: url,
            sampleCount: formData.sampleCount ? parseInt(formData.sampleCount) : undefined,
            coverImage: formData.coverImage || undefined,
            previewAudio: formData.previewAudio || undefined,
          });

          setIsUploading(false);
        } catch (error: any) {
          console.error('Upload error:', error);
          toast.error(`Upload failed: ${error.message}`);
          setIsUploading(false);
        }
      };

      fileReader.readAsDataURL(uploadFile);
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(`Failed to create pack: ${error.message}`);
      setIsUploading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Seller Dashboard</h1>
          <p className="text-muted-foreground">
            Upload and manage your sample packs on the AURA-X marketplace
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground">No sales yet</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Packs</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Upload your first pack</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Start selling to grow</p>
            </CardContent>
          </Card>
        </div>

        {/* Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle>Upload New Sample Pack</CardTitle>
            <CardDescription>
              Share your sounds with the Amapiano producer community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file">Sample Pack File (ZIP)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="file"
                    type="file"
                    accept=".zip"
                    onChange={handleFileSelect}
                    className="flex-1"
                  />
                  {uploadFile && (
                    <Badge variant="secondary">
                      {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Maximum file size: 500MB. Must be a ZIP file containing your samples.
                </p>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Pack Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Amapiano Log Drums Vol. 1"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your sample pack, what's included, and how producers can use it..."
                  rows={4}
                  required
                />
              </div>

              {/* Category and Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0.50"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="29.99"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum: $0.50 (Stripe requirement)
                  </p>
                </div>
              </div>

              {/* Sample Count */}
              <div className="space-y-2">
                <Label htmlFor="sampleCount">Number of Samples (Optional)</Label>
                <Input
                  id="sampleCount"
                  type="number"
                  min="1"
                  value={formData.sampleCount}
                  onChange={(e) => setFormData({ ...formData, sampleCount: e.target.value })}
                  placeholder="50"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    value={formData.tagInput}
                    onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="amapiano, log drums, percussion"
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleRemoveTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Cover Image URL (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="coverImage">Cover Image URL (Optional)</Label>
                <Input
                  id="coverImage"
                  type="url"
                  value={formData.coverImage}
                  onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                  placeholder="https://example.com/cover.jpg"
                />
              </div>

              {/* Preview Audio URL (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="previewAudio">Preview Audio URL (Optional)</Label>
                <Input
                  id="previewAudio"
                  type="url"
                  value={formData.previewAudio}
                  onChange={(e) => setFormData({ ...formData, previewAudio: e.target.value })}
                  placeholder="https://example.com/preview.mp3"
                />
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  title: '',
                  description: '',
                  price: '',
                  category: '',
                  tags: [],
                  tagInput: '',
                  sampleCount: '',
                  coverImage: '',
                  previewAudio: '',
                });
                setUploadFile(null);
              }}
            >
              Clear Form
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isUploading || !uploadFile}
            >
              {isUploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Pack
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}
