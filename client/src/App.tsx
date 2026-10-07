import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import { ON_DASHBOARD_HOST } from "./dashboard/base";

// The Leads page loads on its own, so visitors never download it.
const Admin = lazy(() => import("./pages/Admin"));
// The manager dashboard is its own bundle too.
const Dashboard = lazy(() => import("./dashboard/DashboardApp"));

function Router() {
  return (
    <Switch>
      {/* On dashboard.cohost.site every address is the dashboard; on cohost.site, every /dashboard address (and /demo, the example with made-up data). It reads the rest of the address itself. */}
      <Route path={ON_DASHBOARD_HOST ? /.*/ : /^\/(dashboard|demo)(\/.*)?$/}>
        <Suspense fallback={<div style={{ minHeight: "100svh", background: "#17161b" }} />}>
          <Dashboard />
        </Suspense>
      </Route>
      <Route path={"/"} component={Home} />
      <Route path={"/admin"}>
        <Suspense fallback={<div style={{ minHeight: "100svh", background: "var(--ink-0)" }} />}>
          <Admin />
        </Suspense>
      </Route>
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
        defaultTheme="dark"
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
