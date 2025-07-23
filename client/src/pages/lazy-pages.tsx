import { lazy } from 'react';

// Lazy load all pages for code splitting and better performance
export const HomePage = lazy(() => import('./home-optimized'));
export const LoginPage = lazy(() => import('./login'));
export const AwsConfigPage = lazy(() => import('./aws-config'));
export const ApiDocsPage = lazy(() => import('./api-docs'));
export const NotFoundPage = lazy(() => import('./not-found'));

// Loading fallback component
export const PageLoadingFallback = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-2 text-muted-foreground">Loading...</p>
    </div>
  </div>
);