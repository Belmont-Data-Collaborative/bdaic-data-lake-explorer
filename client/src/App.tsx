import { useState, useEffect, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/main-layout";
import { ErrorBoundaryWrapper } from "@/components/error-boundary-wrapper";
import { 
  HomePage, 
  LoginPage, 
  AwsConfigPage, 
  ApiDocsPage, 
  NotFoundPage,
  PageLoadingFallback 
} from "@/pages/lazy-pages";

function Router() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated from localStorage
    const authStatus = localStorage.getItem('authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('authenticated', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('authenticated');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <LoginPage onLogin={handleLogin} />
      </Suspense>
    );
  }

  return (
    <MainLayout onLogout={handleLogout}>
      <Suspense fallback={<PageLoadingFallback />}>
        <Switch>
          <Route path="/" component={() => <HomePage />} />
          <Route path="/aws-config" component={() => <AwsConfigPage />} />
          <Route path="/api-docs" component={() => <ApiDocsPage />} />
          <Route component={() => <NotFoundPage />} />
        </Switch>
      </Suspense>
    </MainLayout>
  );
}

function App() {
  return (
    <ErrorBoundaryWrapper level="page" componentName="DataLakeExplorerApp">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundaryWrapper>
  );
}

export default App;
