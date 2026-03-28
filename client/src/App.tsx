import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Methodology from "./pages/Methodology";
import Framework from "./pages/Framework";
import Calculator from "./pages/Calculator";
import Screener from "./pages/Screener";
import Dashboard from "./pages/Dashboard";
import SubscriptionGate from "./components/SubscriptionGate";

function Router() {
  return (
    <Layout>
      <Switch>
        {/* Public routes */}
        <Route path={"/"} component={Landing} />
        <Route path={"/pricing"} component={Pricing} />

        {/* Protected routes — require subscription */}
        <Route path={"/methodology"}>
          <SubscriptionGate featureName="Methodology">
            <Methodology />
          </SubscriptionGate>
        </Route>
        <Route path={"/framework"}>
          <SubscriptionGate featureName="7-Step Framework">
            <Framework />
          </SubscriptionGate>
        </Route>
        <Route path={"/calculator"}>
          <SubscriptionGate featureName="RCT Calculator">
            <Calculator />
          </SubscriptionGate>
        </Route>
        <Route path={"/screener"}>
          <SubscriptionGate featureName="Stock Screener">
            <Screener />
          </SubscriptionGate>
        </Route>
        <Route path={"/dashboard"}>
          <SubscriptionGate featureName="Live Picks Dashboard">
            <Dashboard />
          </SubscriptionGate>
        </Route>

        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
