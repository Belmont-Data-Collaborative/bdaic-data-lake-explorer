import React from 'react';
import { ErrorBoundaryEnhanced } from './error-boundary-enhanced';

interface ErrorBoundaryWrapperProps {
  children: React.ReactNode;
  level: 'page' | 'component' | 'feature';
  componentName: string;
  fallback?: React.ReactNode;
}

/**
 * Convenient wrapper component for ErrorBoundaryEnhanced with preset configurations
 */
export function ErrorBoundaryWrapper({ 
  children, 
  level, 
  componentName, 
  fallback 
}: ErrorBoundaryWrapperProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error in ${componentName} (${level} level)`);
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // In production, you would send this to your error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error monitoring service
      // errorMonitoringService.captureException(error, {
      //   tags: { component: componentName, level },
      //   extra: { componentStack: errorInfo.componentStack }
      // });
    }
  };

  return (
    <ErrorBoundaryEnhanced
      level={level}
      componentName={componentName}
      onError={handleError}
      fallback={fallback}
      resetOnPropsChange={true}
    >
      {children}
    </ErrorBoundaryEnhanced>
  );
}

/**
 * HOC for wrapping components with error boundaries at different levels
 */
export function withPageErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryWrapper 
      level="page" 
      componentName={componentName || Component.displayName || Component.name || 'UnknownComponent'}
    >
      <Component {...props} />
    </ErrorBoundaryWrapper>
  );
  
  WrappedComponent.displayName = `withPageErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

export function withComponentErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryWrapper 
      level="component" 
      componentName={componentName || Component.displayName || Component.name || 'UnknownComponent'}
    >
      <Component {...props} />
    </ErrorBoundaryWrapper>
  );
  
  WrappedComponent.displayName = `withComponentErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

export function withFeatureErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryWrapper 
      level="feature" 
      componentName={componentName || Component.displayName || Component.name || 'UnknownComponent'}
    >
      <Component {...props} />
    </ErrorBoundaryWrapper>
  );
  
  WrappedComponent.displayName = `withFeatureErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}