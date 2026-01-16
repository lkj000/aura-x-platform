import React, { useState, useRef, useEffect } from 'react';
import { useRoute } from 'wouter';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Play, 
  Pause, 
  ShoppingCart, 
  Download, 
  Star, 
  User,
  Package,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';

export default function PackDetail() {
  const [, params] = useRoute('/marketplace/:id');
  const packId = params?.id ? parseInt(params.id) : null;
  
  const { user, isAuthenticated } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  const { data: pack, isLoading } = trpc.marketplace.getPack.useQuery(
    { id: packId! },
    { enabled: !!packId }
  );

  const { data: reviews = [] } = trpc.marketplace.getPackReviews.useQuery(
    { packId: packId! },
    { enabled: !!packId }
  );

  const createCheckoutMutation = trpc.marketplace.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.success('Redirecting to checkout...');
        window.open(data.url, '_blank');
      }
    },
    onError: (error) => {
      toast.error(`Checkout failed: ${error.message}`);
    },
  });

  const addReviewMutation = trpc.marketplace.addReview.useMutation({
    onSuccess: () => {
      toast.success('Review submitted successfully!');
      setReviewComment('');
      setReviewRating(5);
    },
    onError: (error) => {
      toast.error(`Failed to submit review: ${error.message}`);
    },
  });

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handlePurchase = () => {
    if (!isAuthenticated) {
      toast.error('Please login to purchase');
      window.location.href = getLoginUrl();
      return;
    }

    if (!packId) return;

    createCheckoutMutation.mutate({ packId });
  };

  const handleSubmitReview = () => {
    if (!isAuthenticated) {
      toast.error('Please login to submit a review');
      return;
    }

    if (!packId) return;

    addReviewMutation.mutate({
      packId,
      rating: reviewRating,
      comment: reviewComment || undefined,
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <div className="text-center">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!pack) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Pack Not Found</h1>
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pack Header */}
            <div>
              <h1 className="text-4xl font-bold mb-2">{pack.title}</h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span>{pack.rating ? Number(pack.rating).toFixed(1) : 'New'}</span>
                  <span>({pack.reviewCount || 0} reviews)</span>
                </div>
                <span>•</span>
                <span>{pack.downloads || 0} downloads</span>
              </div>
            </div>

            {/* Cover Image */}
            {pack.coverImage && (
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={pack.coverImage}
                  alt={pack.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Audio Preview */}
            {pack.previewAudio && (
              <Card>
                <CardHeader>
                  <CardTitle>Audio Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handlePlayPause}
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <audio
                        ref={audioRef}
                        src={pack.previewAudio}
                        onEnded={() => setIsPlaying(false)}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                      />
                      <div className="h-2 bg-muted rounded-full">
                        <div className="h-full bg-primary rounded-full w-0" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{pack.description}</p>
              </CardContent>
            </Card>

            {/* Pack Details */}
            <Card>
              <CardHeader>
                <CardTitle>Pack Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Category</div>
                    <div className="font-medium capitalize">{pack.category.replace('_', ' ')}</div>
                  </div>
                  {pack.sampleCount && (
                    <div>
                      <div className="text-sm text-muted-foreground">Samples</div>
                      <div className="font-medium">{pack.sampleCount}</div>
                    </div>
                  )}
                  {pack.fileSize && (
                    <div>
                      <div className="text-sm text-muted-foreground">File Size</div>
                      <div className="font-medium">
                        {(Number(pack.fileSize) / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-muted-foreground">Format</div>
                    <div className="font-medium">ZIP Archive</div>
                  </div>
                </div>
                
                {pack.tags && pack.tags.length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {pack.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>Reviews ({reviews.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add Review Form */}
                {isAuthenticated && (
                  <div className="border-b pb-6">
                    <h3 className="font-semibold mb-4">Write a Review</h3>
                    <div className="space-y-4">
                      <div>
                        <Label>Rating</Label>
                        <div className="flex gap-1 mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="focus:outline-none"
                            >
                              <Star
                                className={`h-6 w-6 ${
                                  star <= reviewRating
                                    ? 'fill-yellow-500 text-yellow-500'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="review">Comment (Optional)</Label>
                        <Textarea
                          id="review"
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Share your thoughts about this pack..."
                          rows={3}
                        />
                      </div>
                      <Button
                        onClick={handleSubmitReview}
                        disabled={addReviewMutation.isPending}
                      >
                        Submit Review
                      </Button>
                    </div>
                  </div>
                )}

                {/* Reviews List */}
                {reviews.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No reviews yet. Be the first to review this pack!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review: any) => (
                      <div key={review.id} className="border-b pb-4 last:border-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">User #{review.userId}</span>
                          </div>
                          <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < review.rating
                                    ? 'fill-yellow-500 text-yellow-500'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Purchase Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl font-bold">
                  ${Number(pack.price).toFixed(2)}
                </CardTitle>
                <CardDescription>One-time purchase</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePurchase}
                  disabled={createCheckoutMutation.isPending}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {createCheckoutMutation.isPending ? 'Processing...' : 'Purchase Now'}
                </Button>
                
                <div className="text-sm text-muted-foreground space-y-2">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <span>Instant download after purchase</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>Royalty-free samples</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Secure payment via Stripe</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seller Info */}
            <Card>
              <CardHeader>
                <CardTitle>Seller Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold">
                    S
                  </div>
                  <div>
                    <div className="font-medium">Seller #{pack.sellerId}</div>
                    <div className="text-sm text-muted-foreground">Producer</div>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  View More Packs
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
