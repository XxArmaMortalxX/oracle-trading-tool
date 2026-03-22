import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Methodology from "./pages/Methodology";
import Framework from "./pages/Framework";
import Calculator from "./pages/Calculator";
import Screener from "./pages/Screener";
import Dashboard from "./pages/Dashboard";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/methodology"} component={Methodology} />
        <Route path={"/framework"} component={Framework} />
        <Route path={"/calculator"} component={Calculator} />
        <Route path={"/screener"} component={Screener} />
        <Route path={"/dashboard"} component={Dashboard} />
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
