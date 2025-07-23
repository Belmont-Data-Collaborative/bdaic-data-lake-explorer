import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  level?: 'page' | 'component' | 'feature';
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
}

/**
 * Enhanced Error Boundary with comprehensive error handling, reporting, and recovery options
 * Supports different error levels and provides detailed error information in development
 */
export class ErrorBoundaryEnhanced extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const eventId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      error,
      errorInfo,
      eventId,
    });

    // Log error details
    console.error('Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // In production, you could send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo, eventId);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys = [], resetOnPropsChange = false } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
        this.resetError();
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetError();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo, eventId: string) => {
    // Here you would send error to your error reporting service
    // Example: Sentry, LogRocket, Bugsnag, etc.
    const errorReport = {
      eventId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      componentName: this.props.componentName,
      level: this.props.level,
    };

    console.log('Error Report:', errorReport);
    // In a real app: errorReportingService.send(errorReport);
  };

  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    });
  };

  private handleRetry = () => {
    this.resetError();
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private renderErrorDetails = () => {
    const { error, errorInfo } = this.state;
    
    if (process.env.NODE_ENV !== 'development') {
      return null;
    }

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bug size={16} />
            Error Details (Development Only)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-red-600 mb-2">Error Message:</h4>
            <pre className="text-xs bg-red-50 p-3 rounded border overflow-auto max-h-32">
              {error?.message}
            </pre>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-red-600 mb-2">Error Stack:</h4>
            <pre className="text-xs bg-red-50 p-3 rounded border overflow-auto max-h-40">
              {error?.stack}
            </pre>
          </div>

          <div>
            <h4 className="text-sm font-medium text-red-600 mb-2">Component Stack:</h4>
            <pre className="text-xs bg-red-50 p-3 rounded border overflow-auto max-h-32">
              {errorInfo?.componentStack}
            </pre>
          </div>
        </CardContent>
      </Card>
    );
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'component', componentName } = this.props;
      const isPageLevel = level === 'page';

      return (
        <div className="p-6 max-w-2xl mx-auto">
          <Card className="border-red-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-red-700">
                {isPageLevel ? 'Page Error' : 'Component Error'}
              </CardTitle>
              <p className="text-muted-foreground">
                {componentName 
                  ? `An error occurred in the ${componentName} component.`
                  : 'Something went wrong. The component crashed unexpectedly.'
                }
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {this.state.error?.message || 'An unexpected error occurred'}
                  {this.state.eventId && (
                    <span className="block text-xs text-muted-foreground mt-1">
                      Error ID: {this.state.eventId}
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2"
                  variant="default"
                >
                  <RefreshCw size={16} />
                  Try Again
                </Button>

                {isPageLevel && (
                  <>
                    <Button
                      onClick={this.handleReload}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw size={16} />
                      Reload Page
                    </Button>

                    <Button
                      onClick={this.handleGoHome}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Home size={16} />
                      Go Home
                    </Button>
                  </>
                )}
              </div>

              {this.renderErrorDetails()}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryEnhanced {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundaryEnhanced>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Hook for manual error reporting
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: { componentStack?: string }) => {
    console.error('Manual error report:', error);
    if (errorInfo) {
      console.error('Error context:', errorInfo);
    }
    
    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // errorReportingService.send({ error, errorInfo });
    }
  };
}