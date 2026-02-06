import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage";
import Projects from "./pages/Projects";
import Settings from "./pages/Settings";
import Instruments from "./pages/Instruments";
import Analysis from "./pages/Analysis";
import GenerationHistory from "./pages/GenerationHistory";
import Marketplace from "./pages/Marketplace";
import SellerDashboard from "./pages/SellerDashboard";
import PackDetail from './pages/PackDetail';
import Library from './pages/Library';
import AIStudio from './pages/AIStudio';
import QueueDashboard from './pages/QueueDashboard';
import AdminUsers from './pages/AdminUsers';
import CommunityHub from './pages/CommunityHub';
import MLOpsDashboard from './pages/MLOpsDashboard';
import PatternLibrary from './pages/PatternLibrary';

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={LandingPage} />
      <Route path="/studio" component={Home} />
      <Route path="/projects" component={Projects} />
      <Route path="/instruments" component={Instruments} />
      <Route path="/analysis" component={Analysis} />
      <Route path="/history" component={GenerationHistory} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/marketplace/:id" component={PackDetail} />
      <Route path="/seller/dashboard" component={SellerDashboard} />
      <Route path="/library" component={Library} />
      <Route path="/ai-studio" component={AIStudio} />
      <Route path="/queue" component={QueueDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/community" component={CommunityHub} />
      <Route path="/mlops" component={MLOpsDashboard} />
      <Route path="/patterns" component={PatternLibrary} />
      <Route path="/settings" component={Settings} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
