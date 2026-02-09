import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Server, Key, Database, Zap, Music, Bell, Palette, Save } from 'lucide-react';
import SampleUpload from '@/components/SampleUpload';
import ModalConfiguration from '@/components/ModalConfiguration';
import MIDIMappingPanel from '@/components/MIDIMapping';
import KeyboardShortcutsPanel from '@/components/KeyboardShortcutsPanel';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

export default function Settings() {
  const preferencesQuery = trpc.preferences.get.useQuery();
  const updatePreferencesMutation = trpc.preferences.update.useMutation();
  const utils = trpc.useUtils();

  const [notificationSound, setNotificationSound] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [defaultTempo, setDefaultTempo] = useState(112);
  const [defaultKey, setDefaultKey] = useState('F min');
  const [defaultDuration, setDefaultDuration] = useState(30);

  const [modalConfig, setModalConfig] = useState({
    baseUrl: '',
    apiKey: '',
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load preferences when data is available
  useEffect(() => {
    if (preferencesQuery.data) {
      setNotificationSound(preferencesQuery.data.notificationSoundEnabled);
      setEmailNotifications(preferencesQuery.data.emailNotifications || false);
      setTheme((preferencesQuery.data.theme as 'light' | 'dark' | 'system') || 'dark');
      setDefaultTempo(preferencesQuery.data.defaultTempo || 112);
      setDefaultKey(preferencesQuery.data.defaultKey || 'F min');
      setDefaultDuration(preferencesQuery.data.defaultDuration || 30);
    }
  }, [preferencesQuery.data]);

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

  const handleSavePreferences = async () => {
    try {
      await updatePreferencesMutation.mutateAsync({
        notificationSoundEnabled: notificationSound,
        emailNotifications,
        theme,
        defaultTempo,
        defaultKey,
        defaultDuration,
      });

      toast.success('Preferences saved successfully!');
      utils.preferences.get.invalidate();
    } catch (error) {
      toast.error('Failed to save preferences');
    }
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
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="preferences">
              <Key className="h-4 w-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="modal">
              <Server className="h-4 w-4 mr-2" />
              Modal AI
            </TabsTrigger>
            <TabsTrigger value="audio">
              <Zap className="h-4 w-4 mr-2" />
              Audio
            </TabsTrigger>
            <TabsTrigger value="midi">
              <Music className="h-4 w-4 mr-2" />
              MIDI
            </TabsTrigger>
            <TabsTrigger value="database">
              <Database className="h-4 w-4 mr-2" />
              Database
            </TabsTrigger>
            <TabsTrigger value="shortcuts">
              <Key className="h-4 w-4 mr-2" />
              Shortcuts
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <Key className="h-4 w-4 mr-2" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preferences" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  <CardTitle>Notifications</CardTitle>
                </div>
                <CardDescription>
                  Configure how you receive notifications about generation progress
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notification-sound">Notification Sound</Label>
                    <p className="text-sm text-muted-foreground">
                      Play a sound when generation completes
                    </p>
                  </div>
                  <Switch
                    id="notification-sound"
                    checked={notificationSound}
                    onCheckedChange={setNotificationSound}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates for completed generations
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  <CardTitle>Appearance</CardTitle>
                </div>
                <CardDescription>
                  Customize the look and feel of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select value={theme} onValueChange={(value: any) => setTheme(value)}>
                    <SelectTrigger id="theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  <CardTitle>Default Generation Parameters</CardTitle>
                </div>
                <CardDescription>
                  Set default values for music generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="default-tempo">Tempo (BPM)</Label>
                    <span className="text-sm text-muted-foreground">{defaultTempo}</span>
                  </div>
                  <Slider
                    id="default-tempo"
                    min={80}
                    max={140}
                    step={1}
                    value={[defaultTempo]}
                    onValueChange={([value]) => setDefaultTempo(value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default-key">Key</Label>
                  <Select value={defaultKey} onValueChange={setDefaultKey}>
                    <SelectTrigger id="default-key">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C min">C minor</SelectItem>
                      <SelectItem value="D min">D minor</SelectItem>
                      <SelectItem value="E min">E minor</SelectItem>
                      <SelectItem value="F min">F minor</SelectItem>
                      <SelectItem value="G min">G minor</SelectItem>
                      <SelectItem value="A min">A minor</SelectItem>
                      <SelectItem value="B min">B minor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="default-duration">Duration (seconds)</Label>
                    <span className="text-sm text-muted-foreground">{defaultDuration}s</span>
                  </div>
                  <Slider
                    id="default-duration"
                    min={10}
                    max={60}
                    step={5}
                    value={[defaultDuration]}
                    onValueChange={([value]) => setDefaultDuration(value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleSavePreferences}
                  disabled={updatePreferencesMutation.isPending}
                  className="gap-2"
                >
                  {updatePreferencesMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="modal" className="space-y-4 mt-6">
            <ModalConfiguration />

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

          <TabsContent value="midi" className="space-y-4 mt-6">
            <MIDIMappingPanel />
          </TabsContent>

          <TabsContent value="shortcuts" className="space-y-4 mt-6">
            <KeyboardShortcutsPanel />
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
