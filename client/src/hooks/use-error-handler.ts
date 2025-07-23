import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ErrorHandlerOptions {
  title?: string;
  fallbackMessage?: string;
  onError?: (error: Error) => void;
}

export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const { toast } = useToast();

  const handleError = useCallback((error: unknown, context?: string) => {
    const errorMessage = error instanceof Error 
      ? error.message 
      : options.fallbackMessage || 'An unexpected error occurred';

    const title = options.title || (context ? `Error in ${context}` : 'Error');

    toast({
      title,
      description: errorMessage,
      variant: 'destructive',
    });

    if (options.onError && error instanceof Error) {
      options.onError(error);
    }

    // Log error for debugging in development
    if (import.meta.env.DEV) {
      console.error(`[Error Handler] ${title}:`, error);
    }
  }, [toast, options]);

  const wrapAsync = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context?: string
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error, context);
        return undefined;
      }
    };
  }, [handleError]);

  return {
    handleError,
    wrapAsync,
  };
}