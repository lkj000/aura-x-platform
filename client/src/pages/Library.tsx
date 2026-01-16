import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Package, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';

const MAX_DOWNLOADS_PER_PURCHASE = 5;

export default function Library() {
  const { user, isAuthenticated } = useAuth();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const { data: purchases = [], refetch } = trpc.marketplace.getUserPurchases.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const createDownloadMutation = trpc.marketplace.createDownload.useMutation({
    onSuccess: async (data) => {
      if (data.downloadUrl) {
        // Trigger download
        window.open(data.downloadUrl, '_blank');
        toast.success('Download started!');
        await refetch();
      }
    },
    onError: (error) => {
      toast.error(`Download failed: ${error.message}`);
    },
    onSettled: () => {
      setDownloadingId(null);
    },
  });

  const handleDownload = async (purchaseId: number, packId: number, downloadCount: number) => {
    if (downloadCount >= MAX_DOWNLOADS_PER_PURCHASE) {
      toast.error(`Download limit reached (${MAX_DOWNLOADS_PER_PURCHASE} downloads per purchase)`);
      return;
    }

    setDownloadingId(purchaseId);
    createDownloadMutation.mutate({ purchaseId, packId });
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto py-16 px-4 text-center">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-3xl font-bold mb-4">Your Library</h1>
          <p className="text-muted-foreground mb-8">
            Please login to view your purchased sample packs
          </p>
          <Button onClick={() => window.location.href = getLoginUrl()}>
            Login to Continue
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Your Library</h1>
          <p className="text-muted-foreground">
            Access and download your purchased sample packs
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Purchases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{purchases.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Samples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {purchases.reduce((sum, p) => sum + (p.pack?.sampleCount || 0), 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${purchases.reduce((sum, p) => sum + Number(p.amount || 0), 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Purchased Packs */}
        {purchases.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No purchases yet</h3>
              <p className="text-muted-foreground mb-6">
                Browse the marketplace to find amazing Amapiano sample packs
              </p>
              <Button onClick={() => window.location.href = '/marketplace'}>
                Browse Marketplace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => {
              const pack = purchase.pack;
              if (!pack) return null;

              const downloadCount = purchase.downloadCount || 0;
              const canDownload = downloadCount < MAX_DOWNLOADS_PER_PURCHASE;
              const isDownloading = downloadingId === purchase.id;

              return (
                <Card key={purchase.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Pack Image */}
                      <div className="w-full md:w-48 h-48 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {pack.coverImage ? (
                          <img
                            src={pack.coverImage}
                            alt={pack.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-16 w-16 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Pack Info */}
                      <div className="flex-1 space-y-4">
                        <div>
                          <h3 className="text-2xl font-bold mb-2">{pack.title}</h3>
                          <p className="text-muted-foreground line-clamp-2">
                            {pack.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            {pack.sampleCount || 0} samples
                          </Badge>
                          <Badge variant="secondary" className="capitalize">
                            {pack.category.replace('_', ' ')}
                          </Badge>
                          {pack.tags && pack.tags.slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Purchased {new Date(purchase.purchasedAt!).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            <span>
                              {downloadCount} / {MAX_DOWNLOADS_PER_PURCHASE} downloads
                            </span>
                          </div>
                        </div>

                        {/* Download Button */}
                        <div className="flex items-center gap-4">
                          <Button
                            onClick={() => handleDownload(purchase.id, pack.id, downloadCount)}
                            disabled={!canDownload || isDownloading}
                            className="flex-shrink-0"
                          >
                            {isDownloading ? (
                              <>
                                <Download className="mr-2 h-4 w-4 animate-pulse" />
                                Preparing...
                              </>
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" />
                                Download Pack
                              </>
                            )}
                          </Button>

                          {!canDownload && (
                            <div className="flex items-center gap-2 text-sm text-destructive">
                              <AlertCircle className="h-4 w-4" />
                              <span>Download limit reached</span>
                            </div>
                          )}

                          {canDownload && downloadCount > 0 && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span>{MAX_DOWNLOADS_PER_PURCHASE - downloadCount} downloads remaining</span>
                            </div>
                          )}
                        </div>

                        {/* Download History */}
                        {purchase.downloads && purchase.downloads.length > 0 && (
                          <div className="pt-4 border-t">
                            <h4 className="text-sm font-semibold mb-2">Download History</h4>
                            <div className="space-y-1">
                              {purchase.downloads.slice(0, 3).map((download: any) => (
                                <div
                                  key={download.id}
                                  className="text-xs text-muted-foreground flex items-center gap-2"
                                >
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  <span>
                                    Downloaded {new Date(download.downloadedAt).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
