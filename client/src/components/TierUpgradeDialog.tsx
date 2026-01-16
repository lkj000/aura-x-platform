import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TierUpgradeDialogProps {
  currentTier: 'free' | 'pro' | 'enterprise';
  trigger?: React.ReactNode;
}

const TIER_INFO = {
  pro: {
    name: 'Pro',
    price: '$29',
    interval: 'month',
    icon: Zap,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    features: [
      '3 concurrent AI generations',
      'Priority queue processing',
      'Advanced cultural analysis',
      'Stem separation included',
      'Commercial license',
      'Priority support',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: '$99',
    interval: 'month',
    icon: Crown,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    features: [
      '10 concurrent AI generations',
      'Highest priority queue',
      'Advanced cultural analysis',
      'Unlimited stem separation',
      'Commercial license',
      'Dedicated support',
      'API access',
      'Custom model training',
    ],
  },
};

export default function TierUpgradeDialog({ currentTier, trigger }: TierUpgradeDialogProps) {
  const [open, setOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const createCheckoutMutation = trpc.admin.createTierUpgradeCheckout.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        toast.info('Redirecting to Stripe checkout...');
        window.open(data.checkoutUrl, '_blank');
        setOpen(false);
      }
    },
    onError: (error) => {
      toast.error(`Failed to create checkout: ${error.message}`);
    },
    onSettled: () => {
      setUpgrading(false);
    },
  });

  const handleUpgrade = (tier: 'pro' | 'enterprise') => {
    setUpgrading(true);
    createCheckoutMutation.mutate({ tier });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default" className="gap-2">
            <Crown className="h-4 w-4" />
            Upgrade Plan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            Choose a plan that fits your music production needs
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Pro Tier */}
          <Card className={currentTier === 'pro' ? 'border-blue-500' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-500" />
                  <CardTitle>Pro</CardTitle>
                </div>
                {currentTier === 'pro' && (
                  <Badge variant="default">Current Plan</Badge>
                )}
              </div>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">$29</span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {TIER_INFO.pro.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={currentTier === 'pro' ? 'outline' : 'default'}
                disabled={currentTier !== 'free' || upgrading}
                onClick={() => handleUpgrade('pro')}
              >
                {upgrading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : currentTier === 'pro' ? (
                  'Current Plan'
                ) : currentTier === 'enterprise' ? (
                  'Downgrade to Pro'
                ) : (
                  'Upgrade to Pro'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Enterprise Tier */}
          <Card className={currentTier === 'enterprise' ? 'border-purple-500' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-purple-500" />
                  <CardTitle>Enterprise</CardTitle>
                </div>
                {currentTier === 'enterprise' && (
                  <Badge variant="default">Current Plan</Badge>
                )}
              </div>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">$99</span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {TIER_INFO.enterprise.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={currentTier === 'enterprise' ? 'outline' : 'default'}
                disabled={currentTier === 'enterprise' || upgrading}
                onClick={() => handleUpgrade('enterprise')}
              >
                {upgrading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : currentTier === 'enterprise' ? (
                  'Current Plan'
                ) : (
                  'Upgrade to Enterprise'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          <p className="font-medium mb-2">What happens next?</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>You'll be redirected to Stripe's secure checkout page</li>
            <li>Your tier will be automatically upgraded after payment</li>
            <li>New limits will apply immediately to your queue</li>
            <li>You can cancel or change your subscription anytime</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
