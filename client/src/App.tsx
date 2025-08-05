import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import LandingPage from "@/pages/landing";
import NotFound from "@/pages/not-found";
import UserPanel from "@/pages/user-panel";
import AdminPanel from "@/pages/admin-panel";
import AwsConfiguration from "@/pages/aws-configuration";
import { MainLayout } from "@/components/main-layout";
import { ErrorBoundaryWrapper } from "@/components/error-boundary-wrapper";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

function Router() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // JWT verification for token-based authentication
  const { data: verificationData, isLoading: isVerifying, refetch: refetchVerification } = useQuery({
    queryKey: ['/api/auth/verify'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');

      console.log(`Frontend: Verifying JWT token: ${token.substring(0, 50)}...`);
      const res = await apiRequest('GET', '/api/auth/verify', null, {
        'Authorization': `Bearer ${token}`
      });
      const data = await res.json();
      console.log(`Frontend: JWT verification result:`, data);
      return data;
    },
    enabled: !!localStorage.getItem('authToken'), // Only run if we have a token
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  // Combined useEffect: Handle both JWT and legacy authentication
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const legacyAuth = localStorage.getItem('authenticated');

    if (isVerifying) {
      // Still loading JWT verification
      return;
    }

    if (token && verificationData?.user) {
      // JWT verification succeeded - this is our source of truth for JWT users
      console.log(`Frontend: JWT verification returned user: ${verificationData.user.username} (${verificationData.user.role})`);

      // Clear cache if user changed to ensure fresh data for new user
      if (currentUser?.id !== verificationData.user.id) {
        console.log(`Frontend: User changed from ${currentUser?.username || 'none'} to ${verificationData.user.username} - clearing cache for fresh data`);
        queryClient.clear();
      }

      // Update state AND localStorage to stay in sync
      setCurrentUser(verificationData.user);
      setIsAuthenticated(true);
      localStorage.setItem('currentUser', JSON.stringify(verificationData.user));
    } else {
      // No valid JWT token or verification failed - clear everything
      console.log('JWT verification failed or no token - clearing authentication');
      queryClient.clear();
      queryClient.invalidateQueries();
      setIsAuthenticated(false);
      setCurrentUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authenticated'); // Clean up legacy auth
    }

    setIsLoading(false);
  }, [verificationData, isVerifying]); // REMOVED currentUser?.id to prevent loops

  const handleLogin = (userData: { token: string; user: User }) => {
    console.log(`Frontend: App.tsx handleLogin for ${userData.user.username} (${userData.user.role})`);

    // CRITICAL: Clear ALL state and caches before setting new authentication
    queryClient.cancelQueries();
    queryClient.clear();
    queryClient.invalidateQueries();

    // Clear any existing authentication state first
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authenticated');

    // Store new authentication data
    localStorage.setItem('authToken', userData.token);
    localStorage.setItem('currentUser', JSON.stringify(userData.user));

    console.log(`Frontend: Stored token and user for: ${userData.user.username} (${userData.user.role})`);
    
    // Set state immediately to avoid delays
    setCurrentUser(userData.user);
    setIsAuthenticated(true);

    // Also trigger verification to ensure consistency
    refetchVerification();
  };

  const handleLogout = () => {
    console.log(`Frontend: Logout - clearing ALL data and caches`);

    // Clear everything atomically
    queryClient.cancelQueries();
    queryClient.clear();
    queryClient.invalidateQueries();
    queryClient.removeQueries();

    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('authenticated');
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');

    sessionStorage.clear();

    console.log(`Frontend: Logout complete`);
  };

  if (isLoading) {
    // Only show loading if we're actually waiting for JWT verification
    const hasToken = !!localStorage.getItem('authToken');

    // Show loading if we have a token and are verifying, or if we have no token
    if ((hasToken && isVerifying) || !hasToken) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">
              {isVerifying ? 'Verifying authentication...' : 'Loading...'}
            </p>
          </div>
        </div>
      );
    }
  }

  if (!isAuthenticated) {
    return <LandingPage onLogin={handleLogin} />;
  }

  return (
    <MainLayout onLogout={handleLogout} currentUser={currentUser}>
      <Switch>
        <Route path="/" component={() => <Home />} />
        <Route path="/user-panel" component={() => <UserPanel currentUser={currentUser} />} />
        <Route path="/aws-config" component={() => {
          if (currentUser?.role !== 'admin') {
            return (
              <div className="container mx-auto py-8">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
                  <p className="text-muted-foreground">You need admin privileges to access AWS configuration.</p>
                </div>
              </div>
            );
          }
          return <AwsConfiguration />;
        }} />
        <Route path="/admin" component={() => {
          if (currentUser?.role !== 'admin') {
            return (
              <div className="container mx-auto py-8">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
                  <p className="text-muted-foreground">You need admin privileges to access this page.</p>
                </div>
              </div>
            );
          }
          return <AdminPanel currentUser={currentUser} />;
        }} />
        <Route component={NotFound} />
      </Switch>
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