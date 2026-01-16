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
import { useAuth } from '@/_core/hooks/useAuth';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedPacks, setSelectedPacks] = useState<number[]>([]);
  const [bundleDiscount, setBundleDiscount] = useState(20);
  const [bundleFormData, setBundleFormData] = useState({
    title: '',
    description: '',
    coverImage: '',
  });

  // Fetch seller analytics
  const { data: analytics } = trpc.marketplace.getSellerAnalytics.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Fetch seller's packs for bundle creation
  const { data: sellerPacks } = trpc.marketplace.listPacks.useQuery(
    { sellerId: user?.id, limit: 100 },
    { enabled: !!user }
  );

  // Bundle creation mutation
  const createBundleMutation = trpc.bundles.createBundle.useMutation({
    onSuccess: () => {
      toast.success('Bundle created successfully!');
      setBundleFormData({ title: '', description: '', coverImage: '' });
      setSelectedPacks([]);
      setBundleDiscount(20);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create bundle');
    },
  });
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${analytics?.totalRevenue?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics?.totalSales || 0} sales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Packs</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.activePacks || 0}</div>
              <p className="text-xs text-muted-foreground">
                {analytics?.totalDownloads || 0} downloads
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics?.averageRating?.toFixed(1) || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics?.totalReviews || 0} reviews
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Top Pack</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold truncate">
                {analytics?.topPack?.title || 'None yet'}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics?.topPack?.sales || 0} sales
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Upload and Analytics */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload Pack</TabsTrigger>
            <TabsTrigger value="bundles">Create Bundle</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
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
          </TabsContent>

          <TabsContent value="bundles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Sample Pack Bundle</CardTitle>
                <CardDescription>Combine multiple packs into a discounted bundle deal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bundle Title */}
                <div className="space-y-2">
                  <Label htmlFor="bundleTitle">Bundle Title</Label>
                  <Input
                    id="bundleTitle"
                    placeholder="e.g., Complete Amapiano Starter Kit"
                    value={bundleFormData.title}
                    onChange={(e) => setBundleFormData({ ...bundleFormData, title: e.target.value })}
                  />
                </div>

                {/* Bundle Description */}
                <div className="space-y-2">
                  <Label htmlFor="bundleDescription">Description</Label>
                  <Textarea
                    id="bundleDescription"
                    placeholder="Describe what's included in this bundle..."
                    value={bundleFormData.description}
                    onChange={(e) => setBundleFormData({ ...bundleFormData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Pack Selector */}
                <div className="space-y-2">
                  <Label>Select Packs (minimum 2)</Label>
                  <div className="border rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                    {sellerPacks && sellerPacks.length > 0 ? (
                      sellerPacks.map((pack: any) => (
                        <label
                          key={pack.id}
                          className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPacks.includes(pack.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPacks([...selectedPacks, pack.id]);
                              } else {
                                setSelectedPacks(selectedPacks.filter(id => id !== pack.id));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{pack.title}</div>
                            <div className="text-sm text-muted-foreground">
                              ${Number(pack.price).toFixed(2)} • {pack.sampleCount} samples
                            </div>
                          </div>
                        </label>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No packs available. Upload packs first to create bundles.
                      </div>
                    )}
                  </div>
                </div>

                {/* Discount Slider */}
                <div className="space-y-2">
                  <Label>Discount Percentage: {bundleDiscount}%</Label>
                  <input
                    type="range"
                    min="1"
                    max="99"
                    value={bundleDiscount}
                    onChange={(e) => setBundleDiscount(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>1%</span>
                    <span>99%</span>
                  </div>
                </div>

                {/* Price Preview */}
                {selectedPacks.length >= 2 && (
                  <div className="bg-accent/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Original Price:</span>
                      <span className="font-medium line-through">
                        ${sellerPacks
                          ?.filter((p: any) => selectedPacks.includes(p.id))
                          .reduce((sum: number, p: any) => sum + Number(p.price), 0)
                          .toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Bundle Price:</span>
                      <span className="text-2xl font-bold text-primary">
                        ${(
                          (sellerPacks || [])
                            .filter((p: any) => selectedPacks.includes(p.id))
                            .reduce((sum: number, p: any) => sum + Number(p.price), 0) *
                          (1 - bundleDiscount / 100)
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-green-600">
                      <span className="text-sm">You Save:</span>
                      <span className="font-semibold">
                        ${(
                          (sellerPacks || [])
                            .filter((p: any) => selectedPacks.includes(p.id))
                            .reduce((sum: number, p: any) => sum + Number(p.price), 0) *
                          (bundleDiscount / 100)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  onClick={async () => {
                    if (!bundleFormData.title) {
                      toast.error('Please enter a bundle title');
                      return;
                    }
                    if (selectedPacks.length < 2) {
                      toast.error('Please select at least 2 packs');
                      return;
                    }

                    createBundleMutation.mutate({
                      title: bundleFormData.title,
                      description: bundleFormData.description,
                      packIds: selectedPacks,
                      discountPercent: bundleDiscount,
                    });
                  }}
                  disabled={!bundleFormData.title || selectedPacks.length < 2}
                  className="w-full"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Create Bundle
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend (Last 30 Days)</CardTitle>
                <CardDescription>Daily sales and revenue performance</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.revenueChart && analytics.revenueChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.revenueChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue ($)" />
                      <Line yAxisId="right" type="monotone" dataKey="sales" stroke="#82ca9d" name="Sales" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    No sales data yet. Start selling to see your revenue trend!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pack Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Pack Performance</CardTitle>
                <CardDescription>Sales and ratings for each pack</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.packPerformance && analytics.packPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.packPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="title" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="sales" fill="#8884d8" name="Sales" />
                      <Bar dataKey="downloads" fill="#82ca9d" name="Downloads" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    No pack data yet. Upload your first pack to see performance metrics!
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
