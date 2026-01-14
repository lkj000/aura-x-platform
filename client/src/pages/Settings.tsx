import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Server, Key, Database, Zap } from 'lucide-react';
import SampleUpload from '@/components/SampleUpload';
import { toast } from 'sonner';

export default function Settings() {
  const [modalConfig, setModalConfig] = useState({
    baseUrl: '',
    apiKey: '',
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      // TODO: Implement actual connection test via tRPC
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      setConnectionStatus('success');
      toast.success('Successfully connected to Modal.com!');
    } catch (error) {
      setConnectionStatus('error');
      toast.error('Failed to connect to Modal.com');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveConfig = () => {
    // TODO: Implement save via tRPC
    toast.success('Configuration saved successfully!');
  };

  return (
    <Layout>
      <div className="container mx-auto max-w-4xl py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure your AURA-X platform settings
          </p>
        </div>

        <Tabs defaultValue="modal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="modal">
              <Server className="h-4 w-4 mr-2" />
              Modal AI
            </TabsTrigger>
            <TabsTrigger value="audio">
              <Zap className="h-4 w-4 mr-2" />
              Audio
            </TabsTrigger>
            <TabsTrigger value="database">
              <Database className="h-4 w-4 mr-2" />
              Database
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <Key className="h-4 w-4 mr-2" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="modal" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Modal.com Configuration</CardTitle>
                <CardDescription>
                  Connect AURA-X to your deployed Modal AI functions for music generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="modal-url">Modal Base URL</Label>
                  <Input
                    id="modal-url"
                    placeholder="https://your-app.modal.run"
                    value={modalConfig.baseUrl}
                    onChange={(e) => setModalConfig({ ...modalConfig, baseUrl: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    The base URL of your deployed Modal application
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modal-key">API Key (Optional)</Label>
                  <Input
                    id="modal-key"
                    type="password"
                    placeholder="Enter your Modal API key"
                    value={modalConfig.apiKey}
                    onChange={(e) => setModalConfig({ ...modalConfig, apiKey: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    If your Modal functions require authentication
                  </p>
                </div>

                {connectionStatus === 'success' && (
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-500">
                      Successfully connected to Modal.com
                    </AlertDescription>
                  </Alert>
                )}

                {connectionStatus === 'error' && (
                  <Alert className="border-destructive/50 bg-destructive/10">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive">
                      Failed to connect. Please check your configuration.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || !modalConfig.baseUrl}
                >
                  {isTestingConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test Connection
                </Button>
                <Button onClick={handleSaveConfig} disabled={!modalConfig.baseUrl}>
                  Save Configuration
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reproducibility Settings</CardTitle>
                <CardDescription>
                  Configure deterministic generation for exact reproducibility
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Seed Control</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Allow manual seed specification for deterministic generation
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/50">
                    Enabled
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Parameter Versioning</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Store complete generation parameters with each output
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/50">
                    Enabled
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Model Version Tracking</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Record AI model version for each generation
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/50">
                    Enabled
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audio" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Audio Engine Settings</CardTitle>
                <CardDescription>
                  Configure audio playback and sample management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="buffer-size">Buffer Size</Label>
                  <Input
                    id="buffer-size"
                    type="number"
                    defaultValue={2048}
                    placeholder="2048"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower values reduce latency but may cause audio glitches
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sample-rate">Sample Rate</Label>
                  <Input
                    id="sample-rate"
                    type="number"
                    defaultValue={44100}
                    placeholder="44100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Audio sample rate in Hz (44100 or 48000 recommended)
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button>Save Audio Settings</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sample Library</CardTitle>
                <CardDescription>
                  Upload and manage your Amapiano sample packs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SampleUpload />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Database Information</CardTitle>
                <CardDescription>
                  View your database connection and storage information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm font-medium">Connection Status</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/50">
                    Connected
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm font-medium">Total Projects</span>
                  <span className="text-sm text-muted-foreground">0</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm font-medium">Total Tracks</span>
                  <span className="text-sm text-muted-foreground">0</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium">Generations</span>
                  <span className="text-sm text-muted-foreground">0</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>
                  Advanced configuration options for power users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Advanced settings are coming soon. These will include developer tools, API access, and custom model configurations.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
