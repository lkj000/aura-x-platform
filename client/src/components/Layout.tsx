import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Music, 
  Mic2, 
  Settings, 
  LayoutGrid, 
  Disc, 
  Activity,
  Menu,
  Bell,
  User,
  History,
  ShoppingBag,
  Library as LibraryIcon,
  Sparkles,
  ListOrdered,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const navItems = [
    { icon: LayoutGrid, label: 'Home', path: '/' },
    { icon: Sparkles, label: 'AI Studio', path: '/ai-studio' },
    { icon: Mic2, label: 'Instruments', path: '/instruments' },
    { icon: ShoppingBag, label: 'Sample Packs', path: '/my-packs' },
    { icon: Activity, label: 'Patterns', path: '/patterns' },
    { icon: Music, label: 'Chord Library', path: '/chords' },
    { icon: Disc, label: 'DAW Studio', path: '/studio' },
    { icon: LibraryIcon, label: 'Community', path: '/community' },
    { icon: History, label: 'Analytics', path: '/mlops' },
    { icon: ListOrdered, label: 'History', path: '/history' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "flex flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out z-20",
          isSidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center px-4 border-b border-border">
          <div className="flex items-center gap-3 text-primary">
            <Music className="h-8 w-8" />
            {isSidebarOpen && (
              <span className="font-bold text-xl tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                AURA-X
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-2 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all group",
                    isActive 
                      ? "bg-primary/10 text-primary glow-primary" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                  {isSidebarOpen && (
                    <span className="font-medium">{item.label}</span>
                  )}
                  
                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Profile (Bottom) */}
        <div className="p-4 border-t border-border">
          <div className={cn("flex items-center gap-3", !isSidebarOpen && "justify-center")}>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold text-xs">
              AX
            </div>
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">Producer</p>
                <p className="text-xs text-muted-foreground truncate">Pro Plan</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            {/* Breadcrumbs / Page Title could go here */}
            <h1 className="text-lg font-medium">
              {navItems.find(i => i.path === location)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Status Indicators */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/50 border border-border text-xs font-mono text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              SYSTEM ONLINE
            </div>

            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 relative">
          {/* Background Ambient Effect */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[100px]" />
          </div>
          
          {children}
        </main>
      </div>
    </div>
  );
}
