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
  const [isLoggingIn, setIsLoggingIn] = useState(false); // Prevent race conditions during login

  // Verify JWT token on app start - DISABLED during login to prevent race conditions  
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
    enabled: !!localStorage.getItem('authToken') && !isLoggingIn, // Disable during login
    retry: false,
    staleTime: 0, // Always fetch fresh data to prevent stale user cache
    gcTime: 0, // Don't cache verification data between sessions
  });

  useEffect(() => {
    // Skip localStorage loading during login to prevent interference
    if (isLoggingIn) {
      return;
    }

    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('currentUser');

    // Don't process authentication if we're still verifying the token
    if (isVerifying) {
      return;
    }

    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        // Clear cache when stored user data is invalid
        queryClient.clear();
      }
    } else if (!token) {
      // Check legacy authentication for backwards compatibility
      const legacyAuth = localStorage.getItem('authenticated');
      if (legacyAuth === 'true') {
        setIsAuthenticated(true);
      }
    }

    setIsLoading(false);
  }, [isVerifying, isLoggingIn]);

  // Handle JWT verification result - but NOT during login
  useEffect(() => {
    // Skip JWT verification effects during login to prevent race conditions
    if (isLoggingIn) {
      console.log('Frontend: Skipping JWT verification effect during login');
      return;
    }

    if (verificationData?.user) {
      // JWT is the source of truth - always update to match JWT user
      console.log(`Frontend: JWT verification returned user: ${verificationData.user.username} (${verificationData.user.role})`);
      
      // Clear cache if user changed to ensure fresh data for new user
      if (currentUser?.id !== verificationData.user.id) {
        console.log(`Frontend: User changed from ${currentUser?.username || 'none'} to ${verificationData.user.username} - clearing cache for fresh data`);
        queryClient.clear();
      }
      
      // Update state and localStorage to match JWT verification
      setCurrentUser(verificationData.user);
      setIsAuthenticated(true);
      localStorage.setItem('currentUser', JSON.stringify(verificationData.user));
    } else if (verificationData === null || (verificationData && !verificationData.user)) {
      // Token is invalid or expired
      console.log('Token verification failed, clearing authentication and ALL caches');
      queryClient.clear();
      queryClient.invalidateQueries();
      setIsAuthenticated(false);
      setCurrentUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authenticated');
    }
  }, [verificationData, isLoggingIn, currentUser?.id]); // Only depend on user ID to prevent loops but detect changes

  const handleLogin = (userData?: { token: string; user: User }) => {
    console.log(`Frontend: Login initiated for ${userData?.user.username || 'legacy'}`);
    setIsLoggingIn(true); // Prevent JWT verification during login
    
    // CRITICAL: Clear ALL state and caches before setting new authentication
    queryClient.cancelQueries(); // Cancel any pending queries
    queryClient.clear();
    queryClient.invalidateQueries();
    queryClient.removeQueries({ queryKey: ['/api/auth/verify'] }); // Remove old verification
    
    if (userData) {
      // JWT-based login - Set everything atomically
      console.log(`Frontend: Setting new user atomically: ${userData.user.username} (${userData.user.role})`);
      
      // Update localStorage and React state atomically
      localStorage.setItem('authToken', userData.token);
      localStorage.setItem('currentUser', JSON.stringify(userData.user));
      setCurrentUser(userData.user);
      setIsAuthenticated(true);
      
      // Re-enable JWT verification with a delay to ensure new token is used
      setTimeout(() => {
        console.log(`Frontend: Login complete for ${userData.user.username} - re-enabling JWT verification`);
        setIsLoggingIn(false);
        // Force immediate refetch with new token to ensure role-based data is loaded
        refetchVerification();
      }, 150);
    } else {
      // Legacy login fallback
      localStorage.setItem('authenticated', 'true');
      setIsAuthenticated(true);
      setIsLoggingIn(false);
      console.log(`Frontend: Legacy authentication complete`);
    }
  };

  const handleLogout = () => {
    console.log(`Frontend: Logout - clearing ALL data and caches to prevent session bleeding`);
    setIsLoggingIn(true); // Prevent JWT verification during logout
    
    // CRITICAL: Clear everything before logout to prevent data bleeding
    queryClient.cancelQueries(); // Cancel all pending queries
    queryClient.clear();
    queryClient.invalidateQueries();
    queryClient.removeQueries();
    
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('authenticated');
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Clear any other potential browser storage
    sessionStorage.clear();
    
    // Reset login flag after logout is complete
    setTimeout(() => {
      setIsLoggingIn(false);
      console.log(`Frontend: Logout complete`);
    }, 100);
  };

  if (isLoading || isVerifying) {
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

  if (!isAuthenticated) {
    return <LandingPage onLogin={handleLogin} />;
  }

  return (
    <MainLayout onLogout={handleLogout} currentUser={currentUser}>
      <Switch>
        <Route path="/" component={() => <Home />} />
        <Route path="/user-panel" component={() => <UserPanel currentUser={currentUser} />} />
        <Route path="/aws-config" component={() => {
          // Role-based access control for AWS configuration
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
          // Role-based access control for admin panel
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