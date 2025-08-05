import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
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
  // Navigation handled via Link components and useLocation

  // Verify JWT token on app start
  const { data: verificationData, isLoading: isVerifying } = useQuery({
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
    enabled: !!localStorage.getItem('authToken'),
    retry: false,
  });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('currentUser');

    console.log(`Frontend: Auth state check - Token exists: ${!!token}, Stored user: ${storedUser}, Verifying: ${isVerifying}`);

    // Don't process authentication if we're still verifying the token
    if (isVerifying) {
      return;
    }

    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        console.log(`Frontend: Setting user from localStorage: ${user.username} (ID: ${user.id}, Role: ${user.role})`);
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
  }, [isVerifying]);

  // Handle JWT verification result
  useEffect(() => {
    if (verificationData?.user) {
      // Check for token/user mismatch - but only clear data, don't force reload
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          const previousUser = JSON.parse(storedUser);
          if (previousUser.id !== verificationData.user.id) {
            console.log(`Frontend: Token/User mismatch detected - updating to correct user`);
            console.log(`Frontend: Stored user: ${previousUser.username} (ID: ${previousUser.id})`);
            console.log(`Frontend: JWT verified user: ${verificationData.user.username} (ID: ${verificationData.user.id})`);

            // Just clear cache and update user - no page reload
            queryClient.clear();
            localStorage.setItem('currentUser', JSON.stringify(verificationData.user));
          }
        } catch (e) {
          console.log('Frontend: Error parsing stored user during verification check');
          localStorage.setItem('currentUser', JSON.stringify(verificationData.user));
        }
      }

      // Normal verification flow
      if (!currentUser || currentUser.id !== verificationData.user.id || currentUser.role !== verificationData.user.role) {
        queryClient.clear();
        console.log(`Frontend: Cleared caches for new/changed user: ${verificationData.user.username} (${verificationData.user.role})`);
      }

      setCurrentUser(verificationData.user);
      setIsAuthenticated(true);
      localStorage.setItem('currentUser', JSON.stringify(verificationData.user));
    } else if (verificationData === null || (verificationData && !verificationData.user)) {
      // Token is invalid or expired
      console.log('Token verification failed, clearing authentication and ALL caches');

      // Clear everything to prevent any residual authentication state
      localStorage.clear();
      sessionStorage.clear();
      queryClient.clear();
      queryClient.invalidateQueries();

      setIsAuthenticated(false);
      setCurrentUser(null);

      console.log('Authentication cleared due to token verification failure');
    }
  }, [verificationData, currentUser]);

  const handleLogin = (userData?: { token: string; user: User }) => {
    // CRITICAL: Clear ALL caches before setting new authentication to prevent data bleeding
    queryClient.clear();
    queryClient.invalidateQueries();

    setIsAuthenticated(true);
    if (userData) {
      // JWT-based login
      localStorage.setItem('authToken', userData.token);
      localStorage.setItem('currentUser', JSON.stringify(userData.user));
      setCurrentUser(userData.user);
      console.log(`Frontend: Cleared all caches for new user login: ${userData.user.username} (${userData.user.role})`);
    } else {
      // Legacy login fallback
      localStorage.setItem('authenticated', 'true');
      console.log(`Frontend: Cleared all caches for legacy authentication`);
    }
  };

  const handleLogout = () => {
    console.log(`Frontend: Logout - clearing ALL data and caches to prevent session bleeding`);

    // CRITICAL: Clear everything before logout to prevent data bleeding
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