import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  Brain, 
  Sparkles, 
  Zap, 
  Music, 
  Activity, 
  Mic, 
  Layers, 
  TrendingUp,
  Globe,
  Users,
  Star,
  Play,
  ArrowRight
} from "lucide-react";

export default function LandingPage() {
  const templates = [
    {
      name: "Classic Amapiano",
      description: "Log drums, deep bass, piano stabs",
      bpm: 115,
      icon: Music,
      color: "from-orange-500 to-amber-600"
    },
    {
      name: "Private School",
      description: "Groovy, melodic, vocal-driven",
      bpm: 118,
      icon: Sparkles,
      color: "from-purple-500 to-pink-600"
    },
    {
      name: "Deep Amapiano",
      description: "Atmospheric, minimal, hypnotic",
      bpm: 112,
      icon: Layers,
      color: "from-blue-500 to-cyan-600"
    },
    {
      name: "Vocal Amapiano",
      description: "Vocal chops, soulful melodies",
      bpm: 115,
      icon: Mic,
      color: "from-green-500 to-emerald-600"
    }
  ];

  const features = [
    {
      title: "Synthetic Intelligence",
      description: "Neural-powered audio generation with quantum processing",
      icon: Brain,
      badge: "AI-Powered"
    },
    {
      title: "Cultural Authenticity",
      description: "11 South African languages with regional swing variations",
      icon: Globe,
      badge: "Unique"
    },
    {
      title: "Stem Separation",
      description: "Extract vocals, drums, bass from any track",
      icon: Activity,
      badge: "Pro"
    },
    {
      title: "Amapianorize",
      description: "Convert any song to authentic Amapiano",
      icon: Zap,
      badge: "Magic"
    },
    {
      title: "Pro Mixing",
      description: "32-channel mixer with studio-grade effects",
      icon: Layers,
      badge: "Studio"
    },
    {
      title: "AI Mastering",
      description: "One-click mastering optimized for streaming",
      icon: TrendingUp,
      badge: "Auto"
    }
  ];

  const stats = [
    { value: "12+", label: "SI Neural Models" },
    { value: "500+", label: "Amapiano Presets" },
    { value: "100+", label: "Built-in Effects" },
    { value: "5000+", label: "Sample Library" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge className="text-lg px-4 py-2 bg-primary/20 border-primary/30">
              <Sparkles className="w-4 h-4 mr-2 inline" />
              Powered by Synthetic Intelligence
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              AmaPiano AI
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              The world's most advanced AI-powered music production platform, featuring{" "}
              <span className="text-primary font-semibold">Synthetic Intelligence</span>{" "}
              for unprecedented creative possibilities in Amapiano and South African house music.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/ai-studio">
                <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                  <Play className="w-5 h-5 mr-2" />
                  Generate Instantly
                </Button>
              </Link>
              <Link href="/studio">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  Open Studio
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center">
              <CardContent className="pt-6">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Professional Production Tools
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to create, mix, and master hit tracks
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <Badge variant="secondary">{feature.badge}</Badge>
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Templates Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Quick Start Templates
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Jump-start your production with professionally crafted templates
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {templates.map((template, index) => {
            const Icon = template.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader>
                  <div className={`w-full h-32 rounded-lg bg-gradient-to-br ${template.color} mb-4 flex items-center justify-center group-hover:scale-105 transition-transform`}>
                    <Icon className="w-12 h-12 text-white" />
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>
                    {template.description}
                  </CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{template.bpm} BPM</Badge>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-primary/20">
          <CardContent className="py-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Create Magic?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of producers creating authentic Amapiano music with the power of Synthetic Intelligence
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/ai-studio">
                <Button size="lg" className="text-lg px-8 py-6">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Creating
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  <Users className="w-5 h-5 mr-2" />
                  Explore Community
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="container mx-auto px-4 py-8 border-t border-border">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Music className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">AURA-X</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Built for South African music creators</span>
            <Badge variant="outline">
              <Star className="w-3 h-3 mr-1" />
              Secure & Private
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
