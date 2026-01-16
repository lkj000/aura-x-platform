import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, ShoppingCart, Play, Star, TrendingUp, Clock } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [cart, setCart] = useState<number[]>([]);

  // Query sample packs
  const packsQuery = trpc.marketplace.listPacks.useQuery({
    search: searchQuery,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    sortBy: sortBy as 'popular' | 'recent' | 'price_low' | 'price_high',
  });

  const packs = packsQuery.data || [];

  const handleAddToCart = (packId: number) => {
    if (!cart.includes(packId)) {
      setCart([...cart, packId]);
    }
  };

  const handleRemoveFromCart = (packId: number) => {
    setCart(cart.filter(id => id !== packId));
  };

  return (
    <Layout>
      <div className="flex flex-col h-full gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sample Pack Marketplace</h1>
            <p className="text-muted-foreground">
              Discover premium Amapiano samples from top producers
            </p>
          </div>
          <Button className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Cart ({cart.length})
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sample packs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="log_drums">Log Drums</SelectItem>
              <SelectItem value="piano_chords">Piano Chords</SelectItem>
              <SelectItem value="vocals">Vocals</SelectItem>
              <SelectItem value="bass">Bass</SelectItem>
              <SelectItem value="fx">FX & Transitions</SelectItem>
              <SelectItem value="full_kits">Full Kits</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="recent">Recently Added</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sample Packs Grid */}
        <div className="flex-1 overflow-y-auto">
          {packsQuery.isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading sample packs...</div>
            </div>
          ) : packs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="text-muted-foreground">No sample packs found</div>
              <Button variant="outline" onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
              }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {packs.map((pack) => (
                <Card key={pack.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    {pack.coverImage && (
                      <div className="w-full h-48 bg-muted rounded-md mb-3 overflow-hidden">
                        <img
                          src={pack.coverImage}
                          alt={pack.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardTitle className="text-lg">{pack.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {pack.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-3">
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="secondary">{pack.category}</Badge>
                      {pack.sampleCount && (
                        <Badge variant="outline">{pack.sampleCount} samples</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      <span>{pack.rating ? Number(pack.rating).toFixed(1) : 'New'}</span>
                      <span>•</span>
                      <span>{pack.purchaseCount || 0} sales</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between pt-3 border-t">
                    <div className="text-2xl font-bold">
                      ${Number(pack.price).toFixed(2)}
                    </div>
                    <div className="flex gap-2">
                      {pack.previewAudio && (
                        <Button variant="outline" size="icon">
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      {cart.includes(pack.id) ? (
                        <Button
                          variant="secondary"
                          onClick={() => handleRemoveFromCart(pack.id)}
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button onClick={() => handleAddToCart(pack.id)}>
                          Add to Cart
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Featured Categories */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex items-center gap-4 p-4">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <div className="font-semibold">Trending Packs</div>
                <div className="text-sm text-muted-foreground">Hot this week</div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex items-center gap-4 p-4">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <div className="font-semibold">New Arrivals</div>
                <div className="text-sm text-muted-foreground">Fresh sounds</div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex items-center gap-4 p-4">
              <Star className="h-8 w-8 text-primary" />
              <div>
                <div className="font-semibold">Top Rated</div>
                <div className="text-sm text-muted-foreground">Community favorites</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
