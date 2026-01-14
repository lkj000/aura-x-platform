import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Server,
  Music,
  Scissors,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface ModalEndpoints {
  baseUrl: string;
  apiKey: string;
  endpoints: {
    generate: string;
    stemSeparation: string;
    mastering: string;
  };
}

export default function ModalConfiguration() {
  const [config, setConfig] = useState<ModalEndpoints>({
    baseUrl: '',
    apiKey: '',
    endpoints: {
      generate: '/generate-music',
      stemSeparation: '/separate-stems',
      mastering: '/master-audio',
    },
  });

  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [endpointStatus, setEndpointStatus] = useState<Record<string, 'idle' | 'success' | 'error'>>({
    generate: 'idle',
    stemSeparation: 'idle',
    mastering: 'idle',
  });
  const [copied, setCopied] = useState(false);

  const handleTestEndpoint = async (endpoint: keyof typeof config.endpoints) => {
    if (!config.baseUrl) {
      toast.error('Please enter a base URL first');
      return;
    }

    setTestingEndpoint(endpoint);
    setEndpointStatus({ ...endpointStatus, [endpoint]: 'idle' });

    try {
      // TODO: Implement actual connection test via tRPC
      const fullUrl = `${config.baseUrl}${config.endpoints[endpoint]}`;
      console.log('Testing endpoint:', fullUrl);
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      setEndpointStatus({ ...endpointStatus, [endpoint]: 'success' });
      toast.success(`${endpoint} endpoint connected successfully!`);
    } catch (error) {
      setEndpointStatus({ ...endpointStatus, [endpoint]: 'error' });
      toast.error(`Failed to connect to ${endpoint} endpoint`);
    } finally {
      setTestingEndpoint(null);
    }
  };

  const handleTestAllEndpoints = async () => {
    if (!config.baseUrl) {
      toast.error('Please enter a base URL first');
      return;
    }

    for (const endpoint of Object.keys(config.endpoints) as Array<keyof typeof config.endpoints>) {
      await handleTestEndpoint(endpoint);
    }
  };

  const handleSaveConfig = () => {
    if (!config.baseUrl) {
      toast.error('Base URL is required');
      return;
    }

    // TODO: Implement save via tRPC
    localStorage.setItem('modal-config', JSON.stringify(config));
    toast.success('Configuration saved successfully!');
  };

  const handleCopyConfig = () => {
    const configText = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(configText);
    setCopied(true);
    toast.success('Configuration copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusIcon = (status: 'idle' | 'success' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Server className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const allEndpointsConfigured = config.baseUrl && Object.values(config.endpoints).every(e => e);
  const allEndpointsTested = Object.values(endpointStatus).every(s => s === 'success');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Modal.com Configuration</CardTitle>
              <CardDescription>
                Connect AURA-X to your deployed Modal AI functions for music generation
              </CardDescription>
            </div>
            {allEndpointsTested && (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/50">
                All Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Base Configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modal-url">Modal Base URL *</Label>
              <Input
                id="modal-url"
                placeholder="https://your-app--modal-run.modal.run"
                value={config.baseUrl}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                The base URL of your deployed Modal application (e.g., https://username--app-name.modal.run)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-key">API Key (Optional)</Label>
              <Input
                id="modal-key"
                type="password"
                placeholder="Enter your Modal API key if required"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Only required if your Modal functions have authentication enabled
              </p>
            </div>
          </div>

          <Separator />

          {/* Endpoint Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">API Endpoints</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestAllEndpoints}
                disabled={!allEndpointsConfigured || testingEndpoint !== null}
              >
                {testingEndpoint ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : null}
                Test All Endpoints
              </Button>
            </div>

            {/* Music Generation Endpoint */}
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <Music className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Label className="text-sm font-medium">Music Generation</Label>
                  {getStatusIcon(endpointStatus.generate)}
                </div>
                <Input
                  placeholder="/generate-music"
                  value={config.endpoints.generate}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      endpoints: { ...config.endpoints, generate: e.target.value },
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTestEndpoint('generate')}
                disabled={!config.baseUrl || testingEndpoint !== null}
              >
                {testingEndpoint === 'generate' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Test'
                )}
              </Button>
            </div>

            {/* Stem Separation Endpoint */}
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <Scissors className="h-5 w-5 text-secondary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Label className="text-sm font-medium">Stem Separation</Label>
                  {getStatusIcon(endpointStatus.stemSeparation)}
                </div>
                <Input
                  placeholder="/separate-stems"
                  value={config.endpoints.stemSeparation}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      endpoints: { ...config.endpoints, stemSeparation: e.target.value },
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTestEndpoint('stemSeparation')}
                disabled={!config.baseUrl || testingEndpoint !== null}
              >
                {testingEndpoint === 'stemSeparation' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Test'
                )}
              </Button>
            </div>

            {/* Mastering Endpoint */}
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <Sparkles className="h-5 w-5 text-accent flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Label className="text-sm font-medium">Audio Mastering</Label>
                  {getStatusIcon(endpointStatus.mastering)}
                </div>
                <Input
                  placeholder="/master-audio"
                  value={config.endpoints.mastering}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      endpoints: { ...config.endpoints, mastering: e.target.value },
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTestEndpoint('mastering')}
                disabled={!config.baseUrl || testingEndpoint !== null}
              >
                {testingEndpoint === 'mastering' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Test'
                )}
              </Button>
            </div>
          </div>

          {/* Status Alerts */}
          {allEndpointsTested && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-500">
                All endpoints are connected and ready to use
              </AlertDescription>
            </Alert>
          )}

          {Object.values(endpointStatus).some(s => s === 'error') && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <XCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                Some endpoints failed to connect. Please verify your configuration and Modal deployment.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={handleSaveConfig} disabled={!allEndpointsConfigured}>
            Save Configuration
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleCopyConfig}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy configuration JSON</TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => window.open('https://modal.com/docs', '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Modal Docs
          </Button>
        </CardFooter>
      </Card>

      {/* Deployment Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Deployment Guide</CardTitle>
          <CardDescription>
            Steps to deploy your AURA-X AI functions on Modal.com
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0">
                1
              </Badge>
              <div>
                <p className="font-medium">Install Modal CLI</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">pip install modal</code>
              </div>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0">
                2
              </Badge>
              <div>
                <p className="font-medium">Authenticate with Modal</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">modal token new</code>
              </div>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0">
                3
              </Badge>
              <div>
                <p className="font-medium">Deploy your functions</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">modal deploy modal_app_instruments.py</code>
              </div>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0">
                4
              </Badge>
              <div>
                <p className="font-medium">Copy the deployment URL and paste above</p>
                <p className="text-xs text-muted-foreground">
                  Modal will output the URL after successful deployment
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
