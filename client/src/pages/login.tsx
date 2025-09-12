import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Lock, Database, Eye, EyeOff } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const { toast } = useToast();

  // Check if password is already set
  const { data: authStatus } = useQuery({
    queryKey: ['/api/auth/status'],
  });

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest('POST', '/api/auth/login', { password });
      return res.json();
    },
    onSuccess: () => {
      // Clear all cached data to ensure fresh data for the logged-in user
      queryClient.clear();
      toast({
        title: "Login successful",
        description: "Welcome to the Data Lake Explorer!",
      });
      onLogin();
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid password",
        variant: "destructive",
      });
    },
  });

  const setPasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest('POST', '/api/auth/set-password', { currentPassword, newPassword });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password updated successfully",
        description: "You can now login with your new password",
      });
      setIsSettingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to set password",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSettingPassword) {
      if (!currentPassword.trim()) {
        toast({
          title: "Current password required",
          description: "Please enter your current password",
          variant: "destructive",
        });
        return;
      }
      
      if (!newPassword.trim()) {
        toast({
          title: "New password required",
          description: "Please enter a new password",
          variant: "destructive",
        });
        return;
      }
      
      if (newPassword.length < 6) {
        toast({
          title: "Password too short",
          description: "New password must be at least 6 characters long",
          variant: "destructive",
        });
        return;
      }
      
      setPasswordMutation.mutate({ currentPassword, newPassword });
    } else {
      if (!password.trim()) {
        toast({
          title: "Password required",
          description: "Please enter a password",
          variant: "destructive",
        });
        return;
      }
      
      loginMutation.mutate(password);
    }
  };

  const hasPassword = (authStatus as any)?.hasPassword;
  const showSetPassword = isSettingPassword; // Always show login unless explicitly setting password

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <Database className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Data Lake Explorer</CardTitle>
          <CardDescription>
            {showSetPassword 
              ? "Enter your current password and set a new password" 
              : "Enter your password to access the data lake"
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {showSetPassword ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="currentPassword"
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="pl-9 pr-9"
                      disabled={setPasswordMutation.isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                      className="pl-9"
                      disabled={setPasswordMutation.isPending}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters long
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-9 pr-9"
                    disabled={loginMutation.isPending}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={loginMutation.isPending || setPasswordMutation.isPending}
            >
              {loginMutation.isPending || setPasswordMutation.isPending ? (
                "Please wait..."
              ) : showSetPassword ? (
                "Update Password"
              ) : (
                "Login"
              )}
            </Button>

            {hasPassword && !isSettingPassword && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setIsSettingPassword(true)}
              >
                Change Password
              </Button>
            )}

            {isSettingPassword && hasPassword && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setIsSettingPassword(false);
                  setCurrentPassword("");
                  setNewPassword("");
                }}
              >
                Cancel
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}