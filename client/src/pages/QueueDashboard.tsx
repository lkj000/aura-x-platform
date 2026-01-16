import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Users, Clock, Activity, Crown, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import TierUpgradeDialog from '@/components/TierUpgradeDialog';

/**
 * Cancel Button Component
 */
function CancelButton({ queueId, onSuccess }: { queueId: number; onSuccess: () => void }) {
  const cancelMutation = trpc.queue.cancelQueuedGeneration.useMutation({
    onSuccess: () => {
      toast.success('Generation cancelled');
      onSuccess();
    },
    onError: () => {
      toast.error('Failed to cancel generation');
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => cancelMutation.mutate({ queueId })}
      disabled={cancelMutation.isPending}
    >
      Cancel
    </Button>
  );
}

/**
 * Queue Dashboard - Admin view for monitoring generation queue
 * Level 5 Autonomous Agent Architecture
 */
export default function QueueDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { user } = useAuth();
  
  // Fetch queue analytics
  const { data: analytics, refetch: refetchAnalytics, isLoading } = trpc.queue.getAnalytics.useQuery(undefined, {
    refetchInterval: autoRefresh ? 5000 : false, // Auto-refresh every 5 seconds
  });

  // Fetch user stats
  const { data: userStats, refetch: refetchUserStats } = trpc.queue.getUserStats.useQuery();

  // Fetch user queue items
  const { data: queueItems, refetch: refetchQueue } = trpc.queue.getUserQueue.useQuery();

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchAnalytics(), refetchUserStats(), refetchQueue()]);
      toast.success('Queue data refreshed');
    } catch (error) {
      toast.error('Failed to refresh queue data');
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Generation Queue Dashboard</h1>
          <p className="text-muted-foreground">Monitor AI generation queue and rate limiting</p>
        </div>
        <div className="flex items-center gap-2">
          <TierUpgradeDialog currentTier={user?.tier || 'free'} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queued Jobs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.queuedCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Waiting in queue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.processingCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Wait Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.avgWaitTime ? `${Math.round(analytics.avgWaitTime)}s` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Average queue time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Queue Stats</CardTitle>
              <CardDescription>Your current rate limiting status</CardDescription>
            </div>
            <Badge variant={user?.tier === 'enterprise' ? 'default' : user?.tier === 'pro' ? 'secondary' : 'outline'} className="gap-1">
              {user?.tier === 'enterprise' && <Crown className="h-3 w-3" />}
              {user?.tier === 'pro' && <Zap className="h-3 w-3" />}
              {user?.tier?.toUpperCase() || 'FREE'} Tier
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Concurrent Jobs</div>
              <div className="text-2xl font-bold">
                {userStats?.concurrentJobs || 0} / {userStats?.maxConcurrentJobs || 3}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Total Queued</div>
              <div className="text-2xl font-bold">{userStats?.totalJobsQueued || 0}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Completed</div>
              <div className="text-2xl font-bold text-green-600">{userStats?.totalJobsCompleted || 0}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Failed</div>
              <div className="text-2xl font-bold text-red-600">{userStats?.totalJobsFailed || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Items */}
      <Card>
        <CardHeader>
          <CardTitle>Your Queue</CardTitle>
          <CardDescription>Recent generation jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {queueItems && queueItems.length > 0 ? (
            <div className="space-y-4">
              {queueItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Generation #{item.generationId}</span>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          item.status === 'queued'
                            ? 'bg-yellow-100 text-yellow-800'
                            : item.status === 'processing'
                            ? 'bg-blue-100 text-blue-800'
                            : item.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.queuePosition && (
                        <span className="text-xs text-muted-foreground">
                          Position: #{item.queuePosition}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Created: {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-sm">
                      <div className="font-medium">Priority: {item.priority}</div>
                      <div className="text-muted-foreground">
                        Retries: {item.retryCount}/{item.maxRetries}
                      </div>
                    </div>
                    {item.status === 'queued' && (
                      <CancelButton queueId={item.id} onSuccess={refetchQueue} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No queued generations
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
