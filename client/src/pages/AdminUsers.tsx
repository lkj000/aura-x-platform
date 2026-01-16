import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Crown, Zap, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Admin Users Page - Manage user tiers
 * Level 5 Autonomous Agent Architecture
 */
export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');

  // Fetch all users
  const { data: users, refetch, isLoading } = trpc.admin.getAllUsers.useQuery();

  // Update user tier mutation
  const updateTierMutation = trpc.admin.updateUserTier.useMutation({
    onSuccess: () => {
      toast.success('User tier updated successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update tier: ${error.message}`);
    },
  });

  // Filter users based on search and tier filter
  const filteredUsers = users?.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTier = tierFilter === 'all' || user.tier === tierFilter;
    
    return matchesSearch && matchesTier;
  });

  const handleTierChange = (userId: number, newTier: 'free' | 'pro' | 'enterprise') => {
    updateTierMutation.mutate({ userId, tier: newTier });
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return 'default';
      case 'pro':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return <Crown className="h-3 w-3" />;
      case 'pro':
        return <Zap className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user tiers and permissions</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers?.length || 0})</CardTitle>
          <CardDescription>Manage user tiers and view statistics</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Current Tier</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Sign In</TableHead>
                    <TableHead>Change Tier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || 'Unknown'}</TableCell>
                      <TableCell>{user.email || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={getTierBadgeVariant(user.tier)} className="gap-1">
                          {getTierIcon(user.tier)}
                          {user.tier.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                          {user.role.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.lastSignedIn).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.tier}
                          onValueChange={(value) => handleTierChange(user.id, value as 'free' | 'pro' | 'enterprise')}
                          disabled={updateTierMutation.isPending}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your filters
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tier Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Free Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {users?.filter(u => u.tier === 'free').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pro Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {users?.filter(u => u.tier === 'pro').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enterprise Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {users?.filter(u => u.tier === 'enterprise').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
