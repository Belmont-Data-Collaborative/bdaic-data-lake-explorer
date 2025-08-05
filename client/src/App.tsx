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

  // Verify JWT token on app start (but not during active login)
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
    enabled: !!localStorage.getItem('authToken') && !isLoading,
    retry: false,
    staleTime: 0, // Always check for fresh data
    gcTime: 0, // Don't cache verification results
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
    console.log(`🔐 STEP 11: JWT verification useEffect triggered`);
    console.log(`🔐 STEP 11a: verificationData:`, verificationData);
    console.log(`🔐 STEP 11b: currentUser:`, currentUser);
    
    if (verificationData?.user) {
      console.log(`🔐 STEP 12: Processing verified user data`);
      console.log(`🔐 STEP 12a: Verified user: ${verificationData.user.username} (ID: ${verificationData.user.id}, Role: ${verificationData.user.role})`);
      
      // Check for token/user mismatch - but only clear data, don't force reload
      const storedUser = localStorage.getItem('currentUser');
      console.log(`🔐 STEP 12b: Current stored user in localStorage:`, storedUser);
      
      if (storedUser) {
        try {
          const previousUser = JSON.parse(storedUser);
          console.log(`🔐 STEP 12c: Parsed stored user: ${previousUser.username} (ID: ${previousUser.id})`);
          
          if (previousUser.id !== verificationData.user.id) {
            console.log(`🔐 STEP 13: TOKEN/USER MISMATCH DETECTED!`);
            console.log(`🔐 STEP 13a: Stored user: ${previousUser.username} (ID: ${previousUser.id})`);
            console.log(`🔐 STEP 13b: JWT verified user: ${verificationData.user.username} (ID: ${verificationData.user.id})`);
            console.log(`🔐 STEP 13c: This means the token belongs to a different user than what's stored!`);

            // Just clear cache and update user - no page reload
            queryClient.clear();
            localStorage.setItem('currentUser', JSON.stringify(verificationData.user));
          } else {
            console.log(`🔐 STEP 12d: User matches - no mismatch detected`);
          }
        } catch (e) {
          console.log(`🔐 STEP 12e: Error parsing stored user during verification check:`, e);
          localStorage.setItem('currentUser', JSON.stringify(verificationData.user));
        }
      }

      // Normal verification flow
      if (!currentUser || currentUser.id !== verificationData.user.id || currentUser.role !== verificationData.user.role) {
        console.log(`🔐 STEP 14: Updating currentUser state to verified user`);
        queryClient.clear();
        console.log(`Frontend: Cleared caches for new/changed user: ${verificationData.user.username} (${verificationData.user.role})`);
      }

      setCurrentUser(verificationData.user);
      setIsAuthenticated(true);
      localStorage.setItem('currentUser', JSON.stringify(verificationData.user));
      console.log(`🔐 STEP 15: Final user state set to: ${verificationData.user.username} (ID: ${verificationData.user.id})`);
    } else if (verificationData === null || (verificationData && !verificationData.user)) {
      // Token is invalid or expired
      console.log('🔐 STEP 16: Token verification failed, clearing authentication and ALL caches');

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
    console.log(`🔐 STEP 6: handleLogin callback triggered in App.tsx`);
    console.log(`🔐 STEP 6a: userData received:`, userData);
    
    // Check what's currently in localStorage before clearing
    const oldToken = localStorage.getItem('authToken');
    const oldUser = localStorage.getItem('currentUser');
    console.log(`🔐 STEP 6b: BEFORE clearing - Old token (first 50 chars):`, oldToken?.substring(0, 50) || 'none');
    console.log(`🔐 STEP 6c: BEFORE clearing - Old user:`, oldUser || 'none');
    
    console.log(`🔐 STEP 7: Clearing ALL existing authentication data to prevent conflicts`);
    
    // CRITICAL: Clear ALL existing authentication data FIRST to prevent conflicts
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authenticated');
    sessionStorage.clear();
    
    // Clear all queries and caches
    queryClient.clear();
    queryClient.invalidateQueries();
    queryClient.removeQueries();
    
    // Reset authentication state
    setIsAuthenticated(false);
    setCurrentUser(null);
    
    console.log(`🔐 STEP 8: All data cleared, now setting new authentication`);

    // Now set the new authentication data
    setIsAuthenticated(true);
    if (userData) {
      console.log(`🔐 STEP 9: Setting JWT-based authentication`);
      console.log(`🔐 STEP 9a: User to set: ${userData.user.username} (ID: ${userData.user.id}, Role: ${userData.user.role})`);
      console.log(`🔐 STEP 9b: Token to set (first 50 chars):`, userData.token.substring(0, 50));
      
      // JWT-based login
      localStorage.setItem('authToken', userData.token);
      localStorage.setItem('currentUser', JSON.stringify(userData.user));
      setCurrentUser(userData.user);
      
      // Verify what was actually stored
      const newToken = localStorage.getItem('authToken');
      const newUser = localStorage.getItem('currentUser');
      console.log(`🔐 STEP 9c: AFTER setting - New token in localStorage (first 50 chars):`, newToken?.substring(0, 50));
      console.log(`🔐 STEP 9d: AFTER setting - New user in localStorage:`, newUser);
      console.log(`🔐 STEP 9e: React state set to: ${userData.user.username} (ID: ${userData.user.id})`);
      
      console.log(`Frontend: Set new user authentication: ${userData.user.username} (${userData.user.role})`);
    } else {
      // Legacy login fallback
      localStorage.setItem('authenticated', 'true');
      console.log(`Frontend: Set legacy authentication`);
    }
  };

  const handleLogout = () => {
    // Add a visible alert to confirm the function is called
    alert('🔐 LOGOUT BUTTON CLICKED - Check console for detailed logs');
    console.log(`🔐 LOGOUT: Starting complete authentication cleanup`);

    // Log what tokens we're about to delete
    const tokenToDelete = localStorage.getItem('authToken');
    const userToDelete = localStorage.getItem('currentUser');
    console.log(`🔐 LOGOUT: Deleting JWT token (first 50 chars):`, tokenToDelete?.substring(0, 50) || 'none');
    console.log(`🔐 LOGOUT: Deleting user data:`, userToDelete || 'none');

    // CRITICAL: Immediately delete ALL authentication tokens and data
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authenticated');
    
    // Clear all browser storage completely
    sessionStorage.clear();
    
    // Verify tokens are completely removed
    const remainingToken = localStorage.getItem('authToken');
    const remainingUser = localStorage.getItem('currentUser');
    console.log(`🔐 LOGOUT: Verification - Remaining token:`, remainingToken || 'NONE (success)');
    console.log(`🔐 LOGOUT: Verification - Remaining user:`, remainingUser || 'NONE (success)');

    // CRITICAL: Clear all queries and caches to prevent data bleeding
    queryClient.clear();
    queryClient.invalidateQueries();
    queryClient.removeQueries();
    
    // Specifically remove the JWT verification query to prevent stale authentication
    queryClient.removeQueries({ queryKey: ['/api/auth/verify'] });
    
    // Reset React authentication state
    setIsAuthenticated(false);
    setCurrentUser(null);
    
    console.log(`🔐 LOGOUT: Complete - All authentication data deleted and state reset`);
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