import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call the onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for debugging
    console.error("Error Boundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="w-full max-w-2xl mx-auto mt-8">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <div>
                <CardTitle className="text-red-900">Something went wrong</CardTitle>
                <CardDescription>
                  A component error occurred and has been safely contained
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">Error Details:</h4>
              <p className="text-sm text-red-700 font-mono">
                {this.state.error?.message || "Unknown error occurred"}
              </p>
            </div>

            {process.env.NODE_ENV === "development" && this.state.errorInfo && (
              <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <summary className="font-medium text-gray-900 cursor-pointer mb-2">
                  Stack Trace (Development)
                </summary>
                <pre className="text-xs text-gray-600 overflow-auto max-h-40">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex space-x-3">
              <Button onClick={this.handleRetry} className="flex items-center space-x-2">
                <RefreshCw size={16} />
                <span>Try Again</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex items-center space-x-2"
              >
                <RefreshCw size={16} />
                <span>Reload Page</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function ErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

// Hook for error reporting
export function useErrorHandler() {
  return (error: Error, errorInfo?: any) => {
    console.error("Manual error reported:", error, errorInfo);
    // Here you could send to error reporting service
    // Example: Sentry.captureException(error, { contexts: { errorInfo } });
  };
}